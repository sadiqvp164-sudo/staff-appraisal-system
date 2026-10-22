import React, { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import {
  Award, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Plus,
  ShieldCheck, Users, X, Download, Settings, Edit, Trash2, Camera, Megaphone, Gift, BarChart3,
  Search, Printer, Pin, Eye, EyeOff, KeyRound
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// ==========================================
// CONSTANTS: DOMAINS & SUB-DOMAINS (from the policy PDF)
// ==========================================
const CYCLE = '2026-2027';
const WORK_SHARE = 0.5; // when a sub-domain has BOTH a rating and work records: 50% work + 50% rating
const MAX_SUBJECTS = 10;
const BONUS_SUB = 'AL6'; // default bonus sub-domain
const BONUS_CAP = 10;    // approved bonus points needed for FULL marks in the selected sub-domain

const RAW_DOMAINS = [
  { code: 'D1', name: 'Teaching, Learning & Learner Achievement', weight: 25, color: '#2563eb', subs: [
    ['T1', 'Curriculum & Lesson Planning', 4], ['T2', 'Subject Knowledge & Academic Preparation', 4], ['T3', 'Pedagogical Practice & Classroom Teaching', 5],
    ['T4', 'Learner Engagement & Classroom Environment', 4], ['T5', 'Assessment, Feedback & Remediation (CCE)', 4], ['T6', 'Learner Progress & Achievement', 4]] },
  { code: 'D2', name: 'Student Mentoring, Wellbeing & Holistic Development', weight: 15, color: '#7c3aed', subs: [
    ['M1', 'Knowing & Understanding Students', 3], ['M2', 'Mentor–Student Relationship & Engagement', 3], ['M3', 'Holistic Student Development', 3],
    ['M4', 'Wellbeing, Care & Early Identification', 2], ['M5', 'Guidance, Intervention & Follow-up', 2], ['M6', 'Documentation, Reflection & Impact', 2]] },
  { code: 'D3', name: 'Campus Engagement & Institutional Responsibilities', weight: 15, color: '#d97706', subs: [
    ['C1', 'Weekly Duties', 3], ['C2', 'Preparation / Dars Monitoring', 3], ['C3', 'Special Task / In-Charge Responsibility', 3],
    ['C4', 'Programmes & Institutional Activities', 2], ['C5', 'Coordination & Collective Responsibility', 2], ['C6', 'Initiative & Improvement', 2]] },
  { code: 'D4', name: 'Collaboration, Communication & Campus Community', weight: 10, color: '#0d9488', subs: [
    ['CO1', 'Collegial Collaboration & Teamwork', 2], ['CO2', 'Communication & Information Sharing', 2], ['CO3', 'Professional Relationships & Campus Conduct', 2],
    ['CO4', 'Conflict Management & Constructive Interaction', 2], ['CO5', 'Institutional Community & Collective Culture', 2]] },
  { code: 'D5', name: 'Personal & Professional Development, TPD & Research', weight: 10, color: '#db2777', subs: [
    ['PD1', 'Participation & Engagement in DH TPD', 2], ['PD2', 'Response to TPD & Application of Learning', 2], ['PD3', 'Continuous Personal & Professional Learning', 2],
    ['PD4', 'Research, Writing & Knowledge Contribution', 2], ['PD5', 'Reflection, Innovation & Professional Growth', 2]] },
  { code: 'D6', name: 'Professionalism, Reliability & Institutional Responsibility', weight: 15, color: '#16a34a', subs: [
    ['PR1', 'Attendance, Presence & Time Management', 3], ['PR2', 'Punctuality & Timeliness of Duties', 3], ['PR3', 'Dress Code & Institutional Standards', 2],
    ['PR4', 'Code of Conduct & Professional Ethics', 3], ['PR5', 'HR & Institutional Procedure Compliance', 2], ['PR6', 'Reliability, Accountability & Responsibility', 2]] },
  { code: 'D7', name: 'Academic Leadership, Governance & Institutional Contribution', weight: 10, color: '#4f46e5', subs: [
    ['AL1', 'Academic Committee & Governance Participation', 2], ['AL2', 'Curriculum Development & Academic Planning', 2], ['AL3', 'Academic Decision-Making & Policy Contribution', 2],
    ['AL4', 'Academic Leadership & Institutional Initiatives', 2], ['AL5', 'Special Academic Contribution', 2], ['AL6', 'Bonus Points & Special Achievements', 2]] }
];
const domains = RAW_DOMAINS.map(d => ({ ...d, subs: d.subs.map(([code, name, weight]) => ({ code, name, weight, domain: d.code, color: d.color })) }));
const SUBS = domains.flatMap(d => d.subs);
const SUB = Object.fromEntries(SUBS.map(s => [s.code, s]));
const RATING_LABEL = { 5: 'Exceptional', 4: 'Strong', 3: 'Expected', 2: 'Developing', 1: 'Unsatisfactory', 0: 'Not applicable' };

const KINDS = {
  cce: { label: 'CCE Works', one: 'CCE', def: 'T5' },
  midterm: { label: 'Midterm Exams', one: 'Midterm', def: 'T5' },
  lesson: { label: 'Monthly Lesson Plans', one: 'Lesson Plan', def: 'T1' },
  duty: { label: 'Weekly Duties', one: 'Duty', def: 'C1' },
  task: { label: 'Special Tasks', one: 'Task', def: 'AL4' }
};

const ALL = ['admin', 'coordinator', 'teacher', 'appraisal_authority'];
const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ALL },
  { id: 'scores', label: 'Staff Leaderboard', icon: Award, roles: ALL },
  { id: 'staff', label: 'Staff Directory', icon: Users, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'work', label: 'Work & CCE', icon: ClipboardList, roles: ALL },
  { id: 'appraisal', label: 'Appraisal Workflow', icon: GraduationCap, roles: ALL },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'settings', label: 'My Account', icon: Settings, roles: ALL }
];

// ==========================================
// HELPERS
// ==========================================
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => ymd();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const lastDayOf = (month) => { const [y, m] = month.split('-').map(Number); return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const monthLabel = (m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

function downloadCSV(filename, headers, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function workMap(items, today = todayStr()) {
  const m = {};
  items.forEach(i => {
    if (!i.sub_code || i.status === 'Submitted') return;
    const done = i.status === 'Completed';
    const pastDue = i.due_date && i.due_date < today;
    if (!done && !pastDue) return;
    const e = (m[i.sub_code] = m[i.sub_code] || { assigned: 0, earned: 0, n: 0, done: 0 });
    const max = Number(i.marks) || 0;
    e.assigned += max; e.n++;
    if (done) { e.earned += Math.min(max, Number(i.awarded ?? i.marks) || 0); e.done++; }
  });
  return m;
}

function withBonus(wm, entries) {
  const newWm = { ...wm };
  (entries || []).filter(e => e.status === 'Approved').forEach(e => {
    const sub = e.sub_code || BONUS_SUB;
    const pts = Number(e.points_approved) || 0;
    if (pts <= 0) return;

    if (!newWm[sub]) newWm[sub] = { assigned: BONUS_CAP, earned: 0, n: 0, done: 0, bonus: 0 };

    newWm[sub].assigned = Math.max(newWm[sub].assigned, BONUS_CAP);
    newWm[sub].earned = Math.min(newWm[sub].assigned, newWm[sub].earned + pts);
    newWm[sub].bonus = (newWm[sub].bonus || 0) + pts;
    newWm[sub].n += 1;
    newWm[sub].done += 1;
  });
  return newWm;
}

// Marks are taken straight from the sub-domain WEIGHT (out of 100 in total).
//  - sub-domain mark = % x weight   (% = work %, rating %, or 50/50 if both exist)
//  - sub-domain with no rating and no work = 0 marks (it is NOT removed)
//  - only a sub-domain rated "N/A" by the Principal (and with no work) is excluded
//    and its weight is taken out of the maximum
//  - a domain can never exceed its own weight (so bonus in D7 cannot push it above 10)
function computeScores(ratings, work) {
  const subs = {}; const per = {}; let sum = 0, max = 0;
  domains.forEach(d => {
    let dEarn = 0, dExcluded = 0;
    d.subs.forEach(s => {
      const r = ratings[s.code]; const wk = work[s.code];
      const rp = r >= 1 ? r / 5 : null;
      const wp = wk && wk.assigned > 0 ? wk.earned / wk.assigned : null;
      if (r === 0 && wp === null) {
        subs[s.code] = { na: true, score: 0, rp, wp };
        dExcluded += s.weight;
        return;
      }
      let pct = 0;
      if (rp !== null && wp !== null) pct = WORK_SHARE * wp + (1 - WORK_SHARE) * rp;
      else if (wp !== null) pct = wp;
      else if (rp !== null) pct = rp;
      subs[s.code] = { na: false, score: pct * s.weight, pct, rp, wp };
      dEarn += pct * s.weight;
    });
    const dMax = Math.max(0, d.weight - dExcluded);
    if (!dMax) per[d.code] = { na: true, score: 0, max: 0 };
    else {
      const sc = Math.min(dMax, dEarn);
      per[d.code] = { na: false, score: sc, max: dMax };
      sum += sc; max += dMax;
    }
  });
  return { subs, per, total: max ? Math.min(100, (sum / max) * 100) : 0 };
}

// ==========================================
// UI CORE: context, styles, modal
// ==========================================
const UIContext = createContext(null);
const useUI = () => useContext(UIContext);

const TONES = {
  gray: ['#f1f5f9', '#475569'], green: ['#dcfce7', '#166534'], amber: ['#fef3c7', '#92400e'],
  red: ['#fee2e2', '#991b1b'], blue: ['#dbeafe', '#1e40af'], purple: ['#ede9fe', '#5b21b6']
};
const STATUS_TONE = {
  Pending: 'amber', Submitted: 'purple', Completed: 'green', Approved: 'green', Draft: 'blue',
  Rejected: 'red', Returned: 'red', Overdue: 'red', Late: 'amber', Active: 'green', Inactive: 'gray'
};

const S = {
  card: { background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  input: { padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '12px', fontSize: 14, verticalAlign: 'top' },
  row: { borderBottom: '1px solid #f1f5f9' },
  btn: (bg, extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', ...extra }),
  sm: (bg) => ({ padding: '6px 12px', borderRadius: 6, border: 'none', background: bg, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }),
  icon: (c = '#475569') => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 7, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: c, cursor: 'pointer' })
};

function Modal({ title, onClose, width = 520, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const [text, setText] = useState('');

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const confirm = useCallback((message) => new Promise(resolve => setDlg({ kind: 'confirm', message, resolve })), []);
  const ask = useCallback((message, defaultValue = '') => new Promise(resolve => { setText(defaultValue); setDlg({ kind: 'prompt', message, resolve }); }), []);
  const value = useMemo(() => ({ toast, confirm, ask }), [toast, confirm, ask]);
  const close = (val) => { dlg.resolve(val); setDlg(null); };

  return (
    <UIContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '12px 16px', borderRadius: 8, background: t.type === 'error' ? '#fee2e2' : '#dcfce7', color: t.type === 'error' ? '#991b1b' : '#166534', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxWidth: 340 }}>{t.message}</div>
        ))}
      </div>
      {dlg && (
        <div style={{ position: 'relative', zIndex: 3000 }}>
          <Modal title={dlg.kind === 'confirm' ? 'Please confirm' : dlg.message} onClose={() => close(dlg.kind === 'confirm' ? false : null)} width={420}>
            {dlg.kind === 'confirm'
              ? <p style={{ margin: '0 0 20px', color: '#334155' }}>{dlg.message}</p>
              : <textarea autoFocus value={text} onChange={e => setText(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 80, marginBottom: 20 }} />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => close(dlg.kind === 'confirm' ? false : null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => close(dlg.kind === 'confirm' ? true : text)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>OK</button>
            </div>
          </Modal>
        </div>
      )}
    </UIContext.Provider>
  );
}

function Badge({ text }) {
  const [bg, fg] = TONES[STATUS_TONE[text] || 'gray'];
  return <span style={{ padding: '4px 10px', background: bg, color: fg, borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{String(text).replaceAll('_', ' ')}</span>;
}

function Avatar({ url, name = '?', size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569', fontSize: size * 0.4, flexShrink: 0 }}>
      {url ? <img src={url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').charAt(0)}
    </div>
  );
}

function Table({ heads, children, min = 640 }) {
  return (
    <div className="table-responsive">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
        <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>{heads.map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 200px' }}>
      <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...S.input, width: '100%', paddingLeft: 32 }} />
    </div>
  );
}

function StatCard({ label, value, color = '#2563eb', sub, onClick }) {
  return (
    <div onClick={onClick} style={{ ...S.card, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700, margin: '8px 0 2px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

function Bars({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(it => (
        <div key={it.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>{it.label}</span><b>{it.display ?? it.value}</b></div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4 }}>
            <div style={{ height: 8, borderRadius: 4, width: `${it.max ? Math.min(100, (it.value / it.max) * 100) : 0}%`, background: it.color || '#2563eb' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const Empty = ({ text = 'Nothing here yet.' }) => <p style={{ color: '#64748b', textAlign: 'center', padding: 20, margin: 0 }}>{text}</p>;

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: value === id ? '#2563eb' : '#fff', color: value === id ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>
      ))}
    </div>
  );
}

function SubSelect({ value, onChange, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={style || S.input}>
      {domains.map(d => (
        <optgroup key={d.code} label={`${d.code} – ${d.name}`}>
          {d.subs.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function useStaff(activeOnly = true) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let q = supabase.from('profiles').select('id, full_name, department, avatar_url, role, active').order('full_name');
    if (activeOnly) q = q.eq('active', true);
    q.then(({ data }) => setList(data || []));
  }, [activeOnly]);
  const map = useMemo(() => Object.fromEntries(list.map(s => [s.id, s])), [list]);
  return { list, map };
}

// ==========================================
// APP SHELL
// ==========================================
export default function Root() {
  return <UIProvider><App /></UIProvider>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) await loadProfile(nextSession.user.id);
      else setProfile(null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId) {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, department, designation, email, avatar_url, active').eq('id', userId).maybeSingle();
    if (!error) setProfile(data);
  }

  async function signIn(e) {
    e.preventDefault();
    if (!supabase) return;
    setAuthError(''); setSigningIn(true);
    const finalEmail = email.includes('@') ? email.trim() : `${email.trim()}@staff.local`;
    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
    setSigningIn(false);
    if (error) setAuthError(error.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  if (!isSupabaseConfigured) return <div style={{ padding: 50, textAlign: 'center' }}>Supabase is not configured. Check ./lib/supabase.</div>;
  if (authLoading) return <div style={{ padding: 50, textAlign: 'center' }}>Loading...</div>;
  if (!session) return <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSubmit={signIn} error={authError} loading={signingIn} />;
  if (profile && profile.active === false) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <h3>Account deactivated</h3>
        <p style={{ color: '#64748b' }}>Contact the administrator to reactivate your account.</p>
        <button onClick={signOut} style={S.btn('#ef4444')}>Sign out</button>
      </div>
    );
  }

  const userRole = profile?.role || 'teacher';
  const allowedNav = nav.filter(item => item.roles.includes(userRole));
  const page = allowedNav.some(n => n.id === active) ? active : 'dashboard';

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sidebar { position: fixed !important; transform: translateX(-100%); transition: transform 0.3s; width: 260px; height: 100vh; z-index: 100; }
          .sidebar.open { transform: translateX(0); }
          .main-content { padding: 15px !important; }
          .table-responsive { overflow-x: auto; width: 100%; }
          .desktop-only { display: none !important; }
          .mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
          .podium-container { flex-direction: column !important; align-items: center !important; gap: 10px !important; }
          .podium-1st { transform: translateY(0) !important; order: -1; width: 100% !important; max-width: 280px; }
          .podium-2nd, .podium-3rd { width: 100% !important; max-width: 280px; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .sidebar { transform: translateX(0) !important; position: relative !important; }
          .mobile-overlay { display: none !important; }
        }
        .table-responsive { overflow-x: auto; }
        @media print {
          .sidebar, .no-print, .mobile-menu-btn { display: none !important; }
          .main-content { height: auto !important; overflow: visible !important; padding: 0 !important; }
          .app-shell { display: block !important; }
        }
      `}</style>

      <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        {mobileNav && <div className="mobile-overlay" onClick={() => setMobileNav(false)} />}

        <aside className={`sidebar ${mobileNav ? 'open' : ''}`} style={{ background: '#fff', borderRight: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column', minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
            <div style={{ background: '#1e293b', color: '#fff', padding: 8, borderRadius: 8 }}><ShieldCheck size={20} /></div>
            <div><strong style={{ display: 'block', fontSize: 16 }}>Staff Appraisal</strong><span style={{ fontSize: 10, color: '#64748b' }}>PERFORMANCE SYSTEM</span></div>
            <button className="mobile-menu-btn" onClick={() => setMobileNav(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X size={20} /></button>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            {allowedNav.map(item => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setMobileNav(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 8, border: 'none', background: isActive ? '#eff6ff' : 'transparent', color: isActive ? '#2563eb' : '#475569', fontWeight: isActive ? 600 : 'normal', cursor: 'pointer', textAlign: 'left' }}>
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar url={profile?.avatar_url} name={profile?.full_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'User'}</div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{userRole.replaceAll('_', ' ')}</div>
              </div>
              <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><LogOut size={18} /></button>
            </div>
          </div>
        </aside>

        <main className="main-content" style={{ flex: 1, padding: 30, overflowY: 'auto', height: '100vh', width: '100%', boxSizing: 'border-box' }}>
          <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <button onClick={() => setMobileNav(true)} className="mobile-menu-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Menu size={24} /></button>
              <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>{nav.find(n => n.id === page)?.label}</h2>
            </div>
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '8px 16px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 14 }}>
              <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></span> Cycle: {CYCLE.replace('-', '–')}
            </div>
          </header>

          {!profile && <Empty text="Loading profile..." />}
          {profile && page === 'dashboard' && <DashboardPage userRole={userRole} profile={profile} goto={setActive} />}
          {profile && page === 'announcements' && <AnnouncementsPage userRole={userRole} profile={profile} />}
          {profile && page === 'scores' && <LeaderboardPage profile={profile} />}
          {profile && page === 'staff' && <StaffDirectoryPage currentUserRole={userRole} profile={profile} />}
          {profile && page === 'work' && <WorkPage userRole={userRole} profile={profile} />}
          {profile && page === 'appraisal' && <AppraisalPage userRole={userRole} profile={profile} />}
          {profile && page === 'reports' && <ReportsPage />}
          {profile && page === 'settings' && <AccountSettingsPage profile={profile} reloadProfile={() => loadProfile(profile.id)} />}
        </main>
      </div>
    </>
  );
}

// ==========================================
// LOGIN
// ==========================================
function Login({ email, setEmail, password, setPassword, onSubmit, error, loading }) {
  const [show, setShow] = useState(false);
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
    <div style={{ background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
        <ShieldCheck size={28} color="#2563eb" />
        <h2 style={{ margin: 0 }}>Sign In</h2>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>User ID or Email
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} required style={{ ...S.input, width: '100%', marginTop: 5 }} placeholder="e.g. sadiq or admin@email.com" />
        </label>
        <label style={{ fontSize: 14, fontWeight: 500 }}>Password
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{ ...S.input, width: '100%', marginTop: 5, paddingRight: 40 }} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </label>
        {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  </div>;
}

// ==========================================
// DASHBOARD
// ==========================================
function DashboardPage({ userRole, profile, goto }) {
  const isReviewer = userRole !== 'teacher';
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const own = (q) => isReviewer ? q : q.eq('staff_id', profile.id);
      const [staff, work, ap, ann] = await Promise.all([
        supabase.from('profiles').select('id, department').eq('active', true),
        own(supabase.from('work_items').select('staff_id, kind, status, due_date, month').eq('cycle', CYCLE)),
        own(supabase.from('appraisals').select('staff_id, status, final_score').eq('cycle', CYCLE)),
        supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      ]);
      setD({ staff: staff.data || [], work: work.data || [], ap: ap.data || [], ann: ann.data || [] });
    })();
  }, [profile.id, userRole]);

  if (!d) return <Empty text="Loading dashboard..." />;

  const today = todayStr(); const month = today.slice(0, 7);
  const n = (arr, fn) => arr.filter(fn).length;
  const overdue = n(d.work, x => x.status === 'Pending' && x.due_date && x.due_date < today);
  const awaiting = n(d.work, x => x.status === 'Submitted');
  const pending = n(d.work, x => x.status === 'Pending');
  const cceMonth = d.work.filter(x => x.kind === 'cce' && x.month === month);
  const cceDone = n(cceMonth, x => x.status === 'Completed');
  const lessonMonth = d.work.filter(x => x.kind === 'lesson' && x.month === month);

  const announcements = (
    <div style={S.card}>
      <h3 style={{ marginTop: 0 }}>Latest Announcements</h3>
      {d.ann.length === 0 ? <Empty text="No announcements." /> : d.ann.map(a => (
        <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <b>{a.pinned ? '📌 ' : ''}{a.title}</b>
          <div style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap' }}>{a.body}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.author_name} • {fmtDate(a.created_at)}</div>
        </div>
      ))}
      <button onClick={() => goto('announcements')} style={{ ...S.sm('#2563eb'), marginTop: 12 }}>View all</button>
    </div>
  );

  if (!isReviewer) {
    const mine = d.ap[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {overdue > 0 && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 10, fontWeight: 600 }}>
            ⚠ Action needed: {overdue} work item(s) are past their deadline (late work earns reduced points).
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
          <StatCard label="My Pending Work" value={pending} color="#d97706" onClick={() => goto('work')} sub={overdue ? `${overdue} overdue` : undefined} />
          <StatCard label="Waiting for Approval" value={awaiting} color="#7c3aed" onClick={() => goto('work')} />
          <StatCard label="Completed Work" value={`${n(d.work, x => x.status === 'Completed')}/${d.work.length}`} color="#16a34a" onClick={() => goto('work')} />
          <StatCard label={`CCE – ${monthLabel(month)}`} value={`${cceDone}/${cceMonth.length}`} color="#0d9488" onClick={() => goto('work')} sub="done this month" />
          <StatCard label={`Lesson Plan – ${monthLabel(month)}`} value={lessonMonth[0] ? lessonMonth[0].status : 'Not issued'} color="#db2777" onClick={() => goto('work')} />
          <StatCard label="My Appraisal" value={mine?.status === 'Approved' ? 'Finalised' : 'Under evaluation'} color="#2563eb" sub={mine?.status === 'Approved' ? `Score ${Number(mine.final_score || 0).toFixed(1)}` : undefined} onClick={() => goto('appraisal')} />
        </div>
        {announcements}
      </div>
    );
  }

  const canRate = userRole === 'admin' || userRole === 'appraisal_authority';
  const toReview = Math.max(0, d.staff.length - n(d.ap, a => a.status === 'Approved'));

  const actions = [
    { n: awaiting, text: 'work items submitted and waiting for approval', page: 'work' },
    { n: canRate ? toReview : 0, text: 'appraisals not finalised yet', page: 'appraisal' },
    { n: overdue, text: 'work items are overdue', page: 'work' },
    { n: canManage && cceMonth.length === 0 && d.staff.length ? 1 : 0, text: `CCE works for ${monthLabel(month)} are not generated yet`, page: 'work' },
    { n: canManage && lessonMonth.length === 0 && d.staff.length ? 1 : 0, text: `Lesson plans for ${monthLabel(month)} are not issued yet`, page: 'work' }
  ].filter(a => a.n > 0);

  const statusCounts = ['Draft', 'Approved'].map(s => ({ label: s.replaceAll('_', ' '), value: n(d.ap, a => a.status === s), max: d.staff.length, color: s === 'Approved' ? '#16a34a' : s === 'Returned' ? '#ef4444' : '#2563eb' }));
  statusCounts.unshift({ label: 'Not started', value: Math.max(0, d.staff.length - d.ap.length), max: d.staff.length, color: '#94a3b8' });

  const deptMap = Object.fromEntries(d.staff.map(s => [s.id, s.department || 'No Dept']));
  const deptAgg = {};
  d.ap.filter(a => a.status === 'Approved').forEach(a => { const k = deptMap[a.staff_id] || 'No Dept'; (deptAgg[k] = deptAgg[k] || []).push(Number(a.final_score) || 0); });
  const deptBars = Object.entries(deptAgg).map(([k, v]) => { const avg = v.reduce((a, b) => a + b, 0) / v.length; return { label: k, value: avg, max: 100, display: avg.toFixed(1), color: '#7c3aed' }; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
        <StatCard label="Total Active Staff" value={d.staff.length} onClick={() => goto('staff')} />
        <StatCard label="Pending Work" value={pending} color="#d97706" onClick={() => goto('work')} sub={overdue ? `${overdue} overdue` : undefined} />
        <StatCard label="Awaiting Approval" value={awaiting} color="#7c3aed" onClick={() => goto('work')} />
        <StatCard label={`CCE – ${monthLabel(month)}`} value={`${cceDone}/${cceMonth.length}`} color="#0d9488" onClick={() => goto('work')} sub="completed" />
        <StatCard label="Appraisals Not Finalised" value={toReview} color="#2563eb" onClick={() => goto('appraisal')} />
        <StatCard label="Appraisals Approved" value={n(d.ap, a => a.status === 'Approved')} color="#16a34a" onClick={() => goto('appraisal')} />
      </div>

      <div style={S.card}>
        <h3 style={{ marginTop: 0 }}>Action Required</h3>
        {actions.length === 0 ? <Empty text="✅ All caught up." /> : actions.map(a => (
          <div key={a.text} onClick={() => goto(a.page)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>{a.n}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={S.card}><h3 style={{ marginTop: 0 }}>Appraisal Progress</h3><Bars items={statusCounts} /></div>
        <div style={S.card}><h3 style={{ marginTop: 0 }}>Department Average (Approved)</h3>{deptBars.length ? <Bars items={deptBars} /> : <Empty text="No approved appraisals yet." />}</div>
      </div>
      {announcements}
    </div>
  );
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================
function AnnouncementsPage({ userRole, profile }) {
  const canPost = userRole !== 'teacher';
  const { toast, confirm } = useUI();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);

  const load = async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) toast(error.message, 'error');
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert({ title: form.title.trim(), body: form.body.trim(), pinned: !!form.pinned, author_id: profile.id, author_name: profile.full_name });
    if (error) return toast(error.message, 'error');
    toast('Announcement posted'); setForm(null); load();
  };
  const togglePin = async (a) => { const { error } = await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id); if (error) toast(error.message, 'error'); else load(); };
  const remove = async (a) => {
    if (!(await confirm(`Delete "${a.title}"?`))) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) return toast(error.message, 'error');
    toast('Deleted'); load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canPost && <div><button onClick={() => setForm({ title: '', body: '', pinned: false })} style={S.btn('#2563eb')}><Plus size={16} /> New Announcement</button></div>}
      {form && (
        <Modal title="New Announcement" onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
            <textarea placeholder="Message" required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} style={{ ...S.input, minHeight: 120 }} />
            <label style={{ fontSize: 14 }}><input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} /> Pin to top</label>
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>Post</button>
          </form>
        </Modal>
      )}
      {items.length === 0 && <div style={S.card}><Empty text="No announcements yet." /></div>}
      {items.map(a => (
        <div key={a.id} style={{ ...S.card, borderLeft: a.pinned ? '4px solid #f59e0b' : '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{a.pinned ? '📌 ' : ''}{a.title}</h3>
            {canPost && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button title="Pin / Unpin" onClick={() => togglePin(a)} style={S.icon(a.pinned ? '#f59e0b' : '#475569')}><Pin size={14} /></button>
                {(userRole === 'admin' || a.author_id === profile.id) && <button title="Delete" onClick={() => remove(a)} style={S.icon('#ef4444')}><Trash2 size={14} /></button>}
              </div>
            )}
          </div>
          <p style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{a.body}</p>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.author_name} • {new Date(a.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// LEADERBOARD
// ==========================================
function PodiumCard({ p, place }) {
  const c = {
    1: { cls: 'podium-1st', bg: '#fffbeb', bd: '#f59e0b', pad: 30, w: 260, img: 110, medal: '🥇', label: '1st Place', name: 18, score: 32, tr: 'translateY(-20px)', tc: '#d97706', bw: 3 },
    2: { cls: 'podium-2nd', bg: '#fff', bd: '#cbd5e1', pad: 20, w: 220, img: 80, medal: '🥈', label: '2nd Place', name: 16, score: 24, tr: 'none', tc: '#64748b', bw: 2 },
    3: { cls: 'podium-3rd', bg: '#fff', bd: '#b45309', pad: 20, w: 220, img: 80, medal: '🥉', label: '3rd Place', name: 16, score: 24, tr: 'none', tc: '#b45309', bw: 2 }
  }[place];
  return (
    <div className={c.cls} style={{ background: c.bg, padding: c.pad, borderRadius: 16, border: `${c.bw}px solid ${c.bd}`, width: c.w, textAlign: 'center', transform: c.tr, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)' }}>
      <div style={{ width: c.img, height: c.img, margin: '0 auto 15px', borderRadius: '50%', border: `4px solid ${c.bd}`, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: c.img * 0.4 }}>
        {p.avatar_url ? <img src={p.avatar_url} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.full_name.charAt(0)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 'bold', color: c.tc, marginBottom: 5 }}>{c.label} {c.medal}</div>
      <div style={{ fontWeight: 'bold', fontSize: c.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</div>
      <div style={{ fontSize: c.score, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{p.officialScore.toFixed(1)}</div>
      {p.bonus > 0 && <div style={{ fontSize: 13, color: '#ea580c', fontWeight: 'bold' }}>+{p.bonus} Bonus</div>}
    </div>
  );
}

function LeaderboardPage({ profile }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsSql, setNeedsSql] = useState(false);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const rater = profile.role === 'admin' || profile.role === 'appraisal_authority';

  const load = useCallback(async () => {
    let apprQ = supabase.from('appraisals').select('staff_id, status, final_score, appraisal_sub_ratings(sub_code, rating)').eq('cycle', CYCLE);
    if (!rater) apprQ = apprQ.eq('status', 'Approved'); // draft ratings stay private
    const [{ data: staff }, { data: appr }, lw, lb] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department, avatar_url').eq('active', true),
      apprQ,
      supabase.rpc('leaderboard_work', { p_cycle: CYCLE }),
      supabase.rpc('leaderboard_bonus')
    ]);
    setNeedsSql(!!(lw.error || lb.error));

    const wmBy = {};
    (lw.data || []).forEach(r => {
      (wmBy[r.staff_id] = wmBy[r.staff_id] || {})[r.sub_code] = { assigned: Number(r.assigned), earned: Number(r.earned), n: Number(r.n), done: Number(r.done) };
    });
    const bonusBy = {};
    (lb.data || []).forEach(r => { (bonusBy[r.staff_id] = bonusBy[r.staff_id] || []).push({ status: 'Approved', points_approved: Number(r.pts), sub_code: r.sub_code }); });

    const scores = (staff || []).map(s => {
      const a = (appr || []).find(x => x.staff_id === s.id);
      const rm = {}; let hasRatings = false;
      (a?.appraisal_sub_ratings || []).forEach(r => { if (r.rating !== null && r.rating !== undefined) { rm[r.sub_code] = r.rating; hasRatings = true; } });
      const wm = withBonus(wmBy[s.id] || {}, bonusBy[s.id] || []);
      let officialScore = 0;
      if (a?.status === 'Approved' && !hasRatings) officialScore = Number(a.final_score) || 0; // ratings not readable -> use locked score
      else if (hasRatings || Object.keys(wm).length) officialScore = computeScores(rm, wm).total;
      officialScore = Math.min(100, officialScore);
      return { ...s, officialScore, bonus: 0, totalEarned: officialScore, finalised: a?.status === 'Approved' };
    });
    scores.sort((a, b) => b.totalEarned - a.totalEarned);
    scores.forEach((s, i) => { s.rank = i + 1; });
    setData(scores); setLoading(false);
  }, [rater]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const depts = [...new Set(data.map(s => s.department).filter(Boolean))].sort();
  const filtered = data.filter(s => (dept === 'all' || s.department === dept) && s.full_name.toLowerCase().includes(q.toLowerCase()));
  const filtering = q || dept !== 'all';
  const top3 = filtering ? [] : filtered.slice(0, 3);
  const rest = filtering ? filtered : filtered.slice(3);

  const exportCSV = () => data.length && downloadCSV(`Staff_Leaderboard_${CYCLE}.csv`, ['Rank', 'Staff Name', 'Department', 'Score (Max 100)'], filtered.map(r => [r.rank, r.full_name, r.department || '-', r.officialScore.toFixed(2)]));

  if (loading) return <Empty text="Loading scores..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {needsSql && <div style={{ background: '#fef3c7', color: '#92400e', padding: 14, borderRadius: 10, fontSize: 14 }}>Live scores need the database functions. Run <b>setup_live_leaderboard.sql</b> once in Supabase → SQL Editor.</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: 28, color: '#1e293b' }}>🏆 Performance Leaderboard</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Live scores (Max 100): approved work and bonus points are added as soon as they are approved. Refreshes every minute.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={S.btn('#475569')}>Refresh</button>
          <button onClick={exportCSV} style={S.btn('#16a34a')}><Download size={18} /> Export CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search staff..." />
        <select value={dept} onChange={e => setDept(e.target.value)} style={S.input}>
          <option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}
        </select>
      </div>

      {top3.length > 0 && (
        <div className="podium-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
          {top3[1] && <PodiumCard p={top3[1]} place={2} />}
          {top3[0] && <PodiumCard p={top3[0]} place={1} />}
          {top3[2] && <PodiumCard p={top3[2]} place={3} />}
        </div>
      )}

      <div style={{ ...S.card, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>{filtering ? 'Results' : 'Other Staff Members'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
          {rest.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 15, border: r.id === profile.id ? '2px solid #2563eb' : '1px solid #f1f5f9', borderRadius: 12, background: '#f8fafc' }}>
              <Avatar url={r.avatar_url} name={r.full_name} size={50} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name}{r.id === profile.id && ' (You)'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.department || 'No Dept'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: 18 }}>{r.officialScore.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Rank #{r.rank}{r.finalised ? ' • final' : ''}</div>
              </div>
            </div>
          ))}
          {rest.length === 0 && <p style={{ color: '#64748b', gridColumn: '1 / -1' }}>No staff members found.</p>}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STAFF DIRECTORY
// ==========================================
function StaffDirectoryPage({ currentUserRole, profile }) {
  const { toast, confirm } = useUI();
  const isAdmin = currentUserRole === 'admin';
  const emptyForm = { full_name: '', email: '', staff_code: '', department: '', designation: '', role: 'teacher' };
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(''); const [roleF, setRoleF] = useState('all'); const [deptF, setDeptF] = useState('all'); const [statusF, setStatusF] = useState('active');
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const [pwFor, setPwFor] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTarget = useRef(null);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setStaff(data || []); setLoading(false);
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    let finalEmail = formData.email.trim();
    if (!finalEmail.includes('@')) finalEmail = `${finalEmail}@staff.local`;
    const { error } = await supabase.functions.invoke('create-staff', {
      body: { full_name: formData.full_name.trim(), email: finalEmail, staff_code: formData.staff_code.trim(), department: formData.department.trim(), designation: formData.designation.trim(), role: formData.role }
    });
    if (error) return toast('Error: ' + error.message, 'error');
    toast('✅ Staff created!');
    setAddOpen(false); setFormData(emptyForm); fetchStaff();
  }

  async function saveEdit(e) {
    e.preventDefault();
    const payload = { full_name: edit.full_name.trim(), staff_code: edit.staff_code || null, department: edit.department || null, designation: edit.designation || null };
    if (isAdmin) payload.role = edit.role;
    const { error } = await supabase.from('profiles').update(payload).eq('id', edit.id);
    if (error) return toast(error.message, 'error');
    toast('Staff updated'); setEdit(null); fetchStaff();
  }

  async function updateRole(s, newRole) {
    if (!isAdmin) return toast('Only admins can change roles.', 'error');
    if (s.id === profile.id && newRole !== 'admin' && !(await confirm('You are removing your own admin access. Continue?'))) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', s.id);
    if (error) toast(error.message, 'error'); else fetchStaff();
  }

  async function toggleActive(s) {
    if (s.id === profile.id) return toast("You can't deactivate your own account.", 'error');
    const next = s.active === false;
    if (!(await confirm(`${next ? 'Activate' : 'Deactivate'} ${s.full_name}?`))) return;
    const { error } = await supabase.from('profiles').update({ active: next }).eq('id', s.id);
    if (error) return toast(error.message, 'error');
    fetchStaff();
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pwFor.value.length < 6) return toast('Password must be at least 6 characters.', 'error');
    setPwFor(p => ({ ...p, busy: true }));
    const { data, error } = await supabase.functions.invoke('set-staff-password', { body: { user_id: pwFor.s.id, password: pwFor.value } });
    if (error || data?.error) { setPwFor(p => ({ ...p, busy: false })); return toast('Error: ' + (data?.error || error.message), 'error'); }
    toast(`Password updated for ${pwFor.s.full_name}`); setPwFor(null);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]; const staffId = uploadTarget.current;
    if (!file || !staffId) return;
    const filePath = `public/${staffId}_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file);
    if (upErr) return toast(upErr.message, 'error');
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', staffId);
    e.target.value = ''; toast('Photo updated'); fetchStaff();
  }

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const filtered = staff.filter(s =>
    (statusF === 'all' || (statusF === 'active' ? s.active !== false : s.active === false)) &&
    (roleF === 'all' || s.role === roleF) && (deptF === 'all' || s.department === deptF) &&
    `${s.full_name} ${s.email || ''} ${s.staff_code || ''}`.toLowerCase().includes(q.toLowerCase()));

  const exportStaff = () => downloadCSV('Staff_Directory.csv', ['Name', 'Email/ID', 'Staff Code', 'Department', 'Designation', 'Role', 'Active'],
    filtered.map(s => [s.full_name, s.email, s.staff_code, s.department, s.designation, s.role, s.active === false ? 'No' : 'Yes']));

  const inp = (k, ph, obj, set, req = true) => <input placeholder={ph} value={obj[k] || ''} onChange={e => set({ ...obj, [k]: e.target.value })} required={req} style={S.input} />;
  const roleOptions = (withAdmin) => <><option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option>{withAdmin && <option value="admin">Admin</option>}</>;

  return (
    <div style={S.card}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Staff Members ({filtered.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportStaff} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
          {isAdmin && <button onClick={() => setAddOpen(true)} style={S.btn('#2563eb')}><Plus size={16} /> Add New Staff</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, ID, code..." />
        <select value={roleF} onChange={e => setRoleF(e.target.value)} style={S.input}><option value="all">All roles</option>{roleOptions(true)}</select>
        <select value={deptF} onChange={e => setDeptF(e.target.value)} style={S.input}><option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}</select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={S.input}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option></select>
      </div>

      {addOpen && (
        <Modal title="Add New Staff" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inp('full_name', 'Full Name', formData, setFormData)}
            {inp('email', 'User ID or Email', formData, setFormData)}
            {inp('staff_code', 'Staff Code', formData, setFormData)}
            {inp('department', 'Department', formData, setFormData)}
            {inp('designation', 'Designation', formData, setFormData)}
            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={S.input}>{roleOptions(false)}</select>
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>Create Account</button>
          </form>
        </Modal>
      )}

      {edit && (
        <Modal title={`Edit ${edit.full_name}`} onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inp('full_name', 'Full Name', edit, setEdit)}
            {inp('staff_code', 'Staff Code', edit, setEdit, false)}
            {inp('department', 'Department', edit, setEdit, false)}
            {inp('designation', 'Designation', edit, setEdit, false)}
            {isAdmin && <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })} style={S.input}>{roleOptions(true)}</select>}
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>Save changes</button>
          </form>
        </Modal>
      )}

      {view && <StaffProfileModal s={view} onClose={() => setView(null)} />}

      {pwFor && (
        <Modal title={`Set password – ${pwFor.s.full_name}`} onClose={() => setPwFor(null)} width={420}>
          <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Login ID: <b>{pwFor.s.email || pwFor.s.staff_code}</b>. Tell the staff member the new password; they can change it later in My Account.</div>
            <input type="text" required minLength={6} autoFocus placeholder="New password (min 6 characters)" value={pwFor.value} onChange={e => setPwFor({ ...pwFor, value: e.target.value })} style={S.input} />
            <button type="submit" disabled={pwFor.busy} style={S.btn('#2563eb', { justifyContent: 'center' })}>{pwFor.busy ? 'Saving...' : 'Set password'}</button>
          </form>
        </Modal>
      )}

      {loading ? <Empty text="Loading..." /> : filtered.length === 0 ? <Empty text="No staff match these filters." /> : (
        <Table heads={['Photo', 'Name & Email', 'Role', 'Department', 'Status', 'Actions']} min={850}>
          {filtered.map(s => (
            <tr key={s.id} style={{ ...S.row, opacity: s.active === false ? 0.6 : 1 }}>
              <td style={S.td}>
                <div style={{ position: 'relative', width: 45, height: 45 }}>
                  <Avatar url={s.avatar_url} name={s.full_name} size={45} />
                  {isAdmin && (
                    <button onClick={() => { uploadTarget.current = s.id; fileInputRef.current.click(); }} style={{ position: 'absolute', bottom: -5, right: -5, background: '#2563eb', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', color: '#fff', display: 'flex' }}><Camera size={12} /></button>
                  )}
                </div>
              </td>
              <td style={{ ...S.td, fontWeight: 500 }}>
                <span onClick={() => setView(s)} style={{ cursor: 'pointer', color: '#2563eb' }}>{s.full_name}</span><br />
                <span style={{ fontSize: 12, color: '#64748b' }}>{s.email || s.staff_code}{s.designation ? ` • ${s.designation}` : ''}</span>
              </td>
              <td style={S.td}>
                {isAdmin ? (
                  <select value={s.role} onChange={e => updateRole(s, e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>{roleOptions(true)}</select>
                ) : <span style={{ textTransform: 'capitalize' }}>{s.role.replaceAll('_', ' ')}</span>}
              </td>
              <td style={S.td}>{s.department || '-'}</td>
              <td style={S.td}><Badge text={s.active === false ? 'Inactive' : 'Active'} /></td>
              <td style={{ ...S.td, minWidth: 280 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button title="View profile" onClick={() => setView(s)} style={S.icon()}><Eye size={14} /></button>
                  {isAdmin && <button title="Edit" onClick={() => setEdit(s)} style={S.icon()}><Edit size={14} /></button>}
                  {isAdmin && <button title="Set password" onClick={() => setPwFor({ s, value: '', busy: false })} style={{ ...S.sm('#f59e0b'), display: 'inline-flex', alignItems: 'center', gap: 4 }}><KeyRound size={14} /> Password</button>}
                  {isAdmin && <button onClick={() => toggleActive(s)} style={S.sm(s.active === false ? '#16a34a' : '#ef4444')}>{s.active === false ? 'Activate' : 'Deactivate'}</button>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function StaffProfileModal({ s, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const id = s.id;
      const [ap, pts, wk, sb] = await Promise.all([
        supabase.from('appraisals').select('status, final_score').eq('staff_id', id).eq('cycle', CYCLE).maybeSingle(),
        supabase.from('special_point_entries').select('points_approved').eq('staff_id', id).eq('status', 'Approved'),
        supabase.from('work_items').select('kind, status, due_date').eq('staff_id', id).eq('cycle', CYCLE),
        supabase.from('staff_subjects').select('name').eq('staff_id', id)
      ]);
      setD({ ap: ap.data, bonus: (pts.data || []).reduce((a, b) => a + Number(b.points_approved || 0), 0), wk: wk.data || [], subs: sb.data || [] });
    })();
  }, [s.id]);
  const line = (kind) => { const a = d.wk.filter(x => x.kind === kind); const done = a.filter(x => x.status === 'Completed').length; const od = a.filter(x => x.status === 'Pending' && x.due_date && x.due_date < todayStr()).length; return `${done}/${a.length} completed${od ? ` • ${od} overdue` : ''}`; };
  const rows = d ? [
    ['Appraisal', d.ap ? `${d.ap.status.replaceAll('_', ' ')} (${Number(d.ap.final_score || 0).toFixed(1)})` : 'Not started'],
    ['Bonus points', d.bonus],
    ['Subjects', d.subs.length ? d.subs.map(x => x.name).join(', ') : '-'],
    ['CCE works', line('cce')], ['Midterm exams', line('midterm')], ['Lesson plans', line('lesson')], ['Weekly duties', line('duty')], ['Special tasks', line('task')]
  ] : [];
  return (
    <Modal title="Staff Profile" onClose={onClose} width={520}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <Avatar url={s.avatar_url} name={s.full_name} size={64} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{s.full_name}</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>{s.designation || '-'} • {s.department || 'No Dept'}</div>
          <div style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>{s.role.replaceAll('_', ' ')} • {s.staff_code || '-'}</div>
        </div>
      </div>
      {!d ? <Empty text="Loading..." /> : rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
          <span style={{ color: '#64748b' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b>
        </div>
      ))}
    </Modal>
  );
}

// ==========================================
// WORK: CCE, MIDTERM EXAMS, LESSON PLANS, WEEKLY DUTIES, SPECIAL TASKS, SUBJECTS
// ==========================================
const roundTo = (n) => Math.round(n * 100) / 100;
const doneOn = (r) => r.submitted_on || todayStr();
const isLate = (r) => !!(r.due_date && doneOn(r) > r.due_date);
const defaultPoints = (r) => roundTo(isLate(r) ? Number(r.marks) * Number(r.late_pct ?? 50) / 100 : Number(r.marks));

function LateField({ value, onChange }) {
  return (
    <label style={{ fontSize: 13 }}>After the deadline, work earns this % of its points
      <input type="number" min="0" max="100" value={value} onChange={e => onChange(e.target.value)} style={{ ...S.input, width: '100%' }} />
    </label>
  );
}

function StaffPicker({ staffList, sel, setSel }) {
  const [q, setQ] = useState(''); const [dept, setDept] = useState('all');
  const depts = [...new Set(staffList.map(s => s.department).filter(Boolean))].sort();
  const list = staffList.filter(s => (dept === 'all' || s.department === dept) && s.full_name.toLowerCase().includes(q.toLowerCase()));
  const count = Object.values(sel).filter(Boolean).length;
  const allOn = list.length > 0 && list.every(s => sel[s.id]);
  const toggleAll = () => setSel(p => { const n = { ...p }; list.forEach(s => { n[s.id] = !allOn; }); return n; });
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search staff..." />
        <select value={dept} onChange={e => setDept(e.target.value)} style={S.input}><option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}</select>
      </div>
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /> Select all shown ({list.length}) — selected in total: {count}</label>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 4 }}>
        {list.map(s => <label key={s.id} style={{ fontSize: 13 }}><input type="checkbox" checked={!!sel[s.id]} onChange={e => setSel(p => ({ ...p, [s.id]: e.target.checked }))} /> {s.full_name}</label>)}
      </div>
    </div>
  );
}

function WorkPage({ userRole, profile }) {
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const [tab, setTab] = useState('cce');
  const { list: staffList } = useStaff();
  const tabs = [['cce', 'CCE Works'], ['midterm', 'Midterm Exams'], ['lesson', 'Lesson Plans'], ['duty', 'Weekly Duties'], ['task', 'Special Tasks'], ['bonus', 'Bonus Points'], ...(canManage ? [['subjects', 'Subjects']] : [])];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'subjects'
        ? <SubjectsTab staffList={staffList} />
        : tab === 'bonus'
        ? <BonusPointsPage userRole={userRole} profile={profile} />
        : <WorkTable key={tab} kind={tab} userRole={userRole} profile={profile} staffList={staffList} />}
    </div>
  );
}

const flagBtn = (on, c) => ({ border: 'none', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginLeft: 4, background: on ? c : '#e2e8f0', color: on ? '#fff' : '#64748b' });

function SubjectsTab({ staffList }) {
  const { toast, confirm } = useUI();
  const [subs, setSubs] = useState([]);
  const [draft, setDraft] = useState({});
  const [q, setQ] = useState('');
  const [bulk, setBulk] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('staff_subjects').select('*').order('name');
    if (error) toast(error.message, 'error');
    setSubs(data || []);
  };
  useEffect(() => { load(); }, []);

  const dv = (id) => draft[id] || { name: '', cce: true, mid: false };
  const setDv = (id, patch) => setDraft(p => ({ ...p, [id]: { ...dv(id), ...patch } }));

  async function add(staffId) {
    const d = dv(staffId); const name = d.name.trim();
    if (!name) return;
    if (subs.filter(x => x.staff_id === staffId).length >= MAX_SUBJECTS) return toast(`A staff member can have at most ${MAX_SUBJECTS} subjects.`, 'error');
    const { error } = await supabase.from('staff_subjects').insert({ staff_id: staffId, name, has_cce: d.cce, has_midterm: d.mid });
    if (error) return toast(error.code === '23505' ? 'This subject is already added.' : error.message, 'error');
    setDv(staffId, { name: '' }); load();
  }
  async function toggle(sub, key) {
    const { error } = await supabase.from('staff_subjects').update({ [key]: !sub[key] }).eq('id', sub.id);
    if (error) toast(error.message, 'error'); else load();
  }
  async function remove(sub) {
    if (!(await confirm(`Remove "${sub.name}"? Existing records are kept.`))) return;
    const { error } = await supabase.from('staff_subjects').delete().eq('id', sub.id);
    if (error) toast(error.message, 'error'); else load();
  }

  const shown = staffList.filter(s => s.full_name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Subjects of each staff member</h3>
        <button onClick={() => setBulk(true)} style={S.btn('#2563eb')}><Plus size={16} /> Add a subject to many staff</button>
      </div>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Up to {MAX_SUBJECTS} subjects per staff member. Mark each subject as <b>CCE</b> (gets monthly CCE works) and/or <b>Mid</b> (has a midterm exam). Click the small CCE / Mid tags on a subject to switch them on or off.
      </p>
      {bulk && <BulkSubjectModal staffList={staffList} subs={subs} onClose={() => setBulk(false)} onDone={() => { setBulk(false); load(); }} />}
      <div style={{ display: 'flex', marginBottom: 12 }}><SearchBox value={q} onChange={setQ} placeholder="Search staff..." /></div>
      <Table heads={['Staff', 'Subjects', 'Add subject']} min={820}>
        {shown.map(s => {
          const mine = subs.filter(x => x.staff_id === s.id);
          const d = dv(s.id);
          return (
            <tr key={s.id} style={S.row}>
              <td style={{ ...S.td, fontWeight: 500 }}>{s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{s.department}</div></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {mine.map(m => (
                    <span key={m.id} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 12, padding: '3px 8px 3px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                      {m.name}
                      <button title="Has CCE" onClick={() => toggle(m, 'has_cce')} style={flagBtn(m.has_cce, '#0d9488')}>CCE</button>
                      <button title="Has midterm exam" onClick={() => toggle(m, 'has_midterm')} style={flagBtn(m.has_midterm, '#d97706')}>Mid</button>
                      <span onClick={() => remove(m)} style={{ cursor: 'pointer', marginLeft: 6 }}>×</span>
                    </span>
                  ))}
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{mine.length}/{MAX_SUBJECTS}</span>
                </div>
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={d.name} onChange={e => setDv(s.id, { name: e.target.value })} onKeyDown={e => e.key === 'Enter' && add(s.id)} placeholder="e.g. Fiqh" style={{ ...S.input, padding: 6, width: 130 }} />
                  <label style={{ fontSize: 12 }}><input type="checkbox" checked={d.cce} onChange={e => setDv(s.id, { cce: e.target.checked })} /> CCE</label>
                  <label style={{ fontSize: 12 }}><input type="checkbox" checked={d.mid} onChange={e => setDv(s.id, { mid: e.target.checked })} /> Mid</label>
                  <button onClick={() => add(s.id)} style={S.sm('#2563eb')}>Add</button>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function BulkSubjectModal({ staffList, subs, onClose, onDone }) {
  const { toast } = useUI();
  const [name, setName] = useState('');
  const [cce, setCce] = useState(true); const [mid, setMid] = useState(false);
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    const ids = Object.keys(sel).filter(k => sel[k]);
    if (!ids.length) return toast('Select at least one staff member.', 'error');
    const nm = name.trim();
    const rows = []; let skipped = 0;
    ids.forEach(id => {
      const mine = subs.filter(x => x.staff_id === id);
      if (mine.length >= MAX_SUBJECTS && !mine.some(x => x.name === nm)) { skipped++; return; }
      rows.push({ staff_id: id, name: nm, has_cce: cce, has_midterm: mid });
    });
    if (!rows.length) return toast('Everyone selected already has the maximum number of subjects.', 'error');
    setBusy(true);
    const { error } = await supabase.from('staff_subjects').upsert(rows, { onConflict: 'staff_id,name' });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast(`"${nm}" added to ${rows.length} staff${skipped ? ` (${skipped} skipped: already ${MAX_SUBJECTS} subjects)` : ''}`); onDone();
  }

  return (
    <Modal title="Add a subject to many staff" onClose={onClose} width={620}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input required placeholder="Subject name" value={name} onChange={e => setName(e.target.value)} style={S.input} />
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <label><input type="checkbox" checked={cce} onChange={e => setCce(e.target.checked)} /> This subject has CCE</label>
          <label><input type="checkbox" checked={mid} onChange={e => setMid(e.target.checked)} /> This subject has a midterm exam</label>
        </div>
        <StaffPicker staffList={staffList} sel={sel} setSel={setSel} />
        <button type="submit" disabled={busy} style={S.btn('#16a34a', { justifyContent: 'center' })}>{busy ? 'Saving...' : 'Add to selected staff'}</button>
      </form>
    </Modal>
  );
}

function WorkTable({ kind, userRole, profile, staffList }) {
  const K = KINDS[kind];
  const isTeacher = userRole === 'teacher';
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const generated = kind === 'cce' || kind === 'midterm' || kind === 'lesson';
  const { toast, confirm, ask } = useUI();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [sf, setSf] = useState('all'); const [mon, setMon] = useState('');
  const [assign, setAssign] = useState(false); const [gen, setGen] = useState(false); const [edit, setEdit] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);
  const fileRef = useRef(null); const uploadFor = useRef(null);
  const today = todayStr();

  const load = async () => {
    let query = supabase.from('work_items').select('*, profiles!staff_id(full_name)').eq('cycle', CYCLE).eq('kind', kind).order('due_date', { ascending: false }).order('created_at', { ascending: false });
    if (isTeacher) query = query.eq('staff_id', profile.id);
    const { data, error } = await query;
    if (error) toast(error.message, 'error');
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (kind === 'cce' || kind === 'midterm') supabase.from('staff_subjects').select('name, has_cce, has_midterm').eq('staff_id', profile.id).then(({ data }) => setMySubjects((data || []).filter(x => kind === 'cce' ? x.has_cce : x.has_midterm).map(x => x.name)));
  }, []);

  async function setStatus(r, status, extra = {}) {
    const { error } = await supabase.from('work_items').update({ status, ...extra }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    load();
  }
  async function submit(r) {
    if (kind === 'lesson') { uploadFor.current = r; fileRef.current.click(); return; }
    const note = await ask('Note or evidence link (optional)');
    if (note === null) return;
    setStatus(r, 'Submitted', { submission_note: note.trim() || null, submitted_on: today });
  }
  async function onFile(e) {
    const file = e.target.files[0]; const r = uploadFor.current; e.target.value = '';
    if (!file || !r) return;
    if (file.size > 20 * 1024 * 1024) return toast('File is larger than 20 MB.', 'error');
    const path = `${r.staff_id}/${r.month || 'misc'}_${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('lesson-plans').upload(path, file);
    if (upErr) return toast(upErr.message, 'error');
    await setStatus(r, 'Submitted', { file_path: path, file_name: file.name, submitted_on: today });
    toast('Lesson plan uploaded');
  }
  async function openFile(r) {
    const { data, error } = await supabase.storage.from('lesson-plans').createSignedUrl(r.file_path, 300);
    if (error) return toast(error.message, 'error');
    window.open(data.signedUrl, '_blank');
  }
  async function approve(r) {
    const def = defaultPoints(r); const late = isLate(r);
    const v = await ask(`Points awarded (max ${r.marks})${late ? ` — finished after the deadline, so ${r.late_pct ?? 50}% = ${def}` : ''}`, String(def));
    if (v === null) return;
    const pts = Number(v);
    if (v.trim() === '' || !(pts >= 0 && pts <= Number(r.marks))) return toast(`Enter a number between 0 and ${r.marks}.`, 'error');
    setStatus(r, 'Completed', { awarded: pts, review_remarks: null, submitted_on: r.submitted_on || today });
  }
  async function returnBack(r) {
    const remarks = await ask('Remarks for returning this to the staff member');
    if (!remarks || !remarks.trim()) return;
    setStatus(r, 'Pending', { review_remarks: remarks.trim(), submitted_on: null });
  }
  async function remove(r) {
    if (!(await confirm(`Delete "${r.title}"?`))) return;
    const { error } = await supabase.from('work_items').delete().eq('id', r.id);
    if (error) return toast(error.message, 'error');
    load();
  }
  async function saveEdit(e) {
    e.preventDefault();
    const marks = Number(edit.marks); const lp = Number(edit.late_pct);
    if (!(marks > 0)) return toast('Points must be greater than 0.', 'error');
    if (!(lp >= 0 && lp <= 100)) return toast('Late percentage must be 0–100.', 'error');
    const { error } = await supabase.from('work_items').update({ title: edit.title.trim(), description: edit.description || null, sub_code: edit.sub_code, domain_code: SUB[edit.sub_code].domain, marks, late_pct: lp, due_date: edit.due_date || null }).eq('id', edit.id);
    if (error) return toast(error.message, 'error');
    toast('Updated'); setEdit(null); load();
  }

  const isOverdue = (r) => r.status === 'Pending' && r.due_date && r.due_date < today;
  const shown = rows.filter(r => (st === 'all' || (st === 'Overdue' ? isOverdue(r) : r.status === st)) && (sf === 'all' || r.staff_id === sf) && (!mon || r.month === mon)
    && `${r.title} ${r.subject_name || ''} ${r.profiles?.full_name || ''}`.toLowerCase().includes(q.toLowerCase()));
  const cnt = (f) => rows.filter(f).length;
  const genLabel = { cce: 'Generate CCE for a Month', midterm: 'Assign Midterm Exam', lesson: 'Issue Monthly Lesson Plan' }[kind];

  return (
    <div style={S.card}>
      <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={onFile} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>{K.label} ({shown.length})</h3>
        {canManage && (generated
          ? <button onClick={() => setGen(true)} style={S.btn('#2563eb')}><Plus size={16} /> {genLabel}</button>
          : <button onClick={() => setAssign(true)} style={S.btn('#2563eb')}><Plus size={16} /> {kind === 'duty' ? 'Assign Weekly Duty' : 'Assign Task'}</button>)}
      </div>

      {(kind === 'cce' || kind === 'midterm') && (mySubjects.length > 0 || isTeacher) && (
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
          My {kind === 'cce' ? 'CCE' : 'midterm'} subjects: {mySubjects.length ? mySubjects.map(m => <span key={m} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 12, padding: '2px 10px', marginRight: 6, fontWeight: 600 }}>{m}</span>) : <i>none assigned yet — ask the coordinator.</i>}
        </div>
      )}
      {kind === 'lesson' && isTeacher && <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>Upload your lesson plan for the month with <b>Upload & Submit</b>. It is checked and approved by the coordinator/admin.</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {['Pending', 'Submitted', 'Completed'].map(s => <div key={s} style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text={s} /> <b style={{ marginLeft: 6 }}>{cnt(x => x.status === s)}</b></div>)}
        <div style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text="Overdue" /> <b style={{ marginLeft: 6 }}>{cnt(isOverdue)}</b></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search title, subject or staff..." />
        <select value={st} onChange={e => setSt(e.target.value)} style={S.input}><option value="all">All status</option><option>Pending</option><option>Submitted</option><option>Completed</option><option>Overdue</option></select>
        {(kind === 'cce' || kind === 'lesson') && <input type="month" value={mon} onChange={e => setMon(e.target.value)} style={S.input} title="Filter by month" />}
        {!isTeacher && <select value={sf} onChange={e => setSf(e.target.value)} style={S.input}><option value="all">All staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
      </div>

      {gen && <GenerateModal kind={kind} staffList={staffList} profile={profile} onClose={() => setGen(false)} onDone={() => { setGen(false); load(); }} />}
      {assign && <AssignModal kind={kind} staffList={staffList} profile={profile} onClose={() => setAssign(false)} onDone={() => { setAssign(false); load(); }} />}
      {edit && (
        <Modal title={`Edit ${K.one}`} onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} style={S.input} />
            <textarea placeholder="Description (optional)" value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} style={{ ...S.input, minHeight: 60 }} />
            <SubSelect value={edit.sub_code} onChange={v => setEdit({ ...edit, sub_code: v })} />
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, fontSize: 13 }}>Points<input type="number" step="0.5" min="0.5" value={edit.marks} onChange={e => setEdit({ ...edit, marks: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
              <label style={{ flex: 1, fontSize: 13 }}>Deadline<input type="date" value={edit.due_date || ''} onChange={e => setEdit({ ...edit, due_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
            </div>
            <LateField value={edit.late_pct ?? 50} onChange={v => setEdit({ ...edit, late_pct: v })} />
            <button type="submit" style={S.btn('#16a34a', { justifyContent: 'center' })}>Save</button>
          </form>
        </Modal>
      )}

      {loading ? <Empty text="Loading..." /> : shown.length === 0 ? <Empty text={`No ${K.label.toLowerCase()} found.`} /> : (
        <Table heads={[...(!isTeacher ? ['Staff'] : []), 'Work', 'Sub-domain', 'Deadline', 'Points', 'Status', 'Action']} min={940}>
          {shown.map(r => {
            const mine = r.staff_id === profile.id;
            const canSubmit = mine && r.status === 'Pending';
            const canReview = canManage && (!mine || userRole === 'admin');
            const wasLate = r.status !== 'Pending' && r.due_date && r.submitted_on && r.submitted_on > r.due_date;
            return (
              <tr key={r.id} style={S.row}>
                {!isTeacher && <td style={S.td}>{r.profiles?.full_name}</td>}
                <td style={S.td}>
                  {r.title}
                  {r.description && <div style={{ fontSize: 12, color: '#64748b' }}>{r.description}</div>}
                  {r.file_path && <div><span onClick={() => openFile(r)} style={{ fontSize: 12, color: '#2563eb', cursor: 'pointer' }}>📎 {r.file_name || 'View file'}</span></div>}
                  {r.submission_note && <div style={{ fontSize: 12, color: '#3730a3' }}>Note: {r.submission_note}</div>}
                  {r.review_remarks && r.status === 'Pending' && <div style={{ fontSize: 11, color: '#ef4444' }}>Returned: {r.review_remarks}</div>}
                </td>
                <td style={S.td}><span style={{ background: SUB[r.sub_code]?.color || '#64748b', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{r.sub_code}</span></td>
                <td style={S.td}>
                  {r.due_date ? fmtDate(r.due_date) : '-'}
                  {isOverdue(r) && <div><Badge text="Overdue" /></div>}
                  {wasLate && <div><Badge text="Late" /></div>}
                  {r.due_date && <div style={{ fontSize: 11, color: '#94a3b8' }}>after deadline: {r.late_pct ?? 50}%</div>}
                </td>
                <td style={S.td}>{r.status === 'Completed' ? `${Number(r.awarded ?? r.marks)} / ${r.marks}` : r.marks}</td>
                <td style={S.td}><Badge text={r.status} /></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {canSubmit && <button onClick={() => submit(r)} style={S.sm('#2563eb')}>{kind === 'lesson' ? 'Upload & Submit' : 'Submit as Done'}</button>}
                    {canReview && r.status === 'Pending' && !canSubmit && <button onClick={() => approve(r)} style={S.sm('#2563eb')}>Mark Done</button>}
                    {canReview && r.status === 'Submitted' && <>
                      <button onClick={() => approve(r)} style={S.sm('#16a34a')}>Approve</button>
                      <button onClick={() => returnBack(r)} style={S.sm('#ef4444')}>Return</button>
                    </>}
                    {canManage && <button title="Edit" onClick={() => setEdit({ ...r })} style={S.icon()}><Edit size={14} /></button>}
                    {canManage && <button title="Delete" onClick={() => remove(r)} style={S.icon('#ef4444')}><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

function GenerateModal({ kind, staffList, profile, onClose, onDone }) {
  const { toast } = useUI();
  const K = KINDS[kind];
  const thisMonth = todayStr().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [exam, setExam] = useState('Midterm Exam');
  const [due, setDue] = useState(kind === 'midterm' ? addDays(todayStr(), 14) : lastDayOf(thisMonth));
  const [marks, setMarks] = useState({ cce: 1, midterm: 2, lesson: 2 }[kind]);
  const [sub, setSub] = useState(K.def);
  const [late, setLate] = useState(50);
  const [plan, setPlan] = useState(null);
  const [skip, setSkip] = useState({});
  const [sel, setSel] = useState({});
  const [lessonHave, setLessonHave] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const nameOf = useMemo(() => Object.fromEntries(staffList.map(s => [s.id, s])), [staffList]);

  useEffect(() => {
    if (kind === 'lesson') setSel(Object.fromEntries(staffList.filter(s => s.role === 'teacher').map(s => [s.id, true])));
  }, [staffList]);

  useEffect(() => {
    (async () => {
      setPlan(null); setSkip({});
      if (kind === 'lesson') {
        const { data } = await supabase.from('work_items').select('staff_id').eq('kind', 'lesson').eq('month', month);
        setLessonHave(new Set((data || []).map(x => x.staff_id))); setPlan([]); return;
      }
      const flag = kind === 'cce' ? 'has_cce' : 'has_midterm';
      const exQuery = kind === 'cce'
        ? supabase.from('work_items').select('staff_id, subject_name').eq('kind', 'cce').eq('month', month)
        : supabase.from('work_items').select('staff_id, subject_name').eq('kind', 'midterm').eq('exam_name', exam.trim());
      const [{ data: subs }, { data: ex }] = await Promise.all([
        supabase.from('staff_subjects').select('staff_id, name, has_cce, has_midterm').order('name'),
        exQuery
      ]);
      const active = new Set(staffList.map(s => s.id));
      const have = new Set((ex || []).map(x => `${x.staff_id}|${x.subject_name}`));
      setPlan((subs || []).filter(s => active.has(s.staff_id) && s[flag]).map(s => ({ key: `${s.staff_id}|${s.name}`, staff_id: s.staff_id, name: s.name, have: have.has(`${s.staff_id}|${s.name}`) })));
    })();
  }, [month, kind === 'midterm' ? exam : '', staffList]);

  const todo = (plan || []).filter(i => !i.have && !skip[i.key]);
  const lessonTodo = Object.keys(sel).filter(id => sel[id] && !lessonHave.has(id));
  const count = kind === 'lesson' ? lessonTodo.length : todo.length;
  const groups = {}; (plan || []).forEach(i => { (groups[i.staff_id] = groups[i.staff_id] || []).push(i); });

  async function generate() {
    if (!due) return toast('Please set a deadline.', 'error');
    const m = Number(marks); const lp = Number(late);
    if (!(m > 0)) return toast('Points must be greater than 0.', 'error');
    if (!(lp >= 0 && lp <= 100)) return toast('Late percentage must be 0–100.', 'error');
    if (kind === 'midterm' && !exam.trim()) return toast('Enter the exam name.', 'error');
    if (!count) return toast('Nothing new to generate.', 'error');
    const base = { cycle: CYCLE, kind, marks: m, late_pct: lp, due_date: due, sub_code: sub, domain_code: SUB[sub].domain, status: 'Pending', created_by: profile.id };
    const rows = kind === 'lesson'
      ? lessonTodo.map(id => ({ ...base, staff_id: id, month, title: `Lesson Plan – ${monthLabel(month)}` }))
      : todo.map(i => ({ ...base, staff_id: i.staff_id, subject_name: i.name, ...(kind === 'cce' ? { month, title: `CCE – ${i.name} – ${monthLabel(month)}` } : { exam_name: exam.trim(), title: `${exam.trim()} – ${i.name}` }) }));
    setBusy(true);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('work_items').insert(rows.slice(i, i + 200));
      if (error) { setBusy(false); return toast(error.message, 'error'); }
    }
    setBusy(false);
    toast(`${rows.length} ${K.one} work(s) created`); onDone();
  }

  const title = { cce: 'Generate monthly CCE works', midterm: 'Assign midterm exam work', lesson: 'Issue monthly lesson plan' }[kind];
  return (
    <Modal title={title} onClose={onClose} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {kind === 'midterm'
            ? <label style={{ flex: '1 1 180px', fontSize: 13 }}>Exam name<input value={exam} onChange={e => setExam(e.target.value)} placeholder="e.g. Midterm 1" style={{ ...S.input, width: '100%' }} /></label>
            : <label style={{ flex: '1 1 140px', fontSize: 13 }}>Month<input type="month" value={month} onChange={e => { setMonth(e.target.value); setDue(lastDayOf(e.target.value)); }} style={{ ...S.input, width: '100%' }} /></label>}
          <label style={{ flex: '1 1 140px', fontSize: 13 }}><b>Deadline</b> (required)<input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...S.input, width: '100%' }} /></label>
          <label style={{ flex: '1 1 100px', fontSize: 13 }}>Points<input type="number" min="0.5" step="0.5" value={marks} onChange={e => setMarks(e.target.value)} style={{ ...S.input, width: '100%' }} /></label>
        </div>
        <LateField value={late} onChange={setLate} />
        <label style={{ fontSize: 13 }}>Counts towards sub-domain (marks go under this domain)<SubSelect value={sub} onChange={setSub} style={{ ...S.input, width: '100%' }} /></label>

        {kind === 'lesson' ? <>
          <div style={{ fontSize: 13, color: '#475569' }}>Every selected teacher must upload one lesson plan for {monthLabel(month)}.</div>
          <StaffPicker staffList={staffList} sel={sel} setSel={setSel} />
          {lessonHave.size > 0 && <div style={{ fontSize: 12, color: '#92400e' }}>{[...lessonHave].filter(id => sel[id]).length} selected teacher(s) already have a lesson plan for this month and will be skipped.</div>}
        </> : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <b style={{ fontSize: 13 }}>Teachers and their {kind === 'cce' ? 'CCE' : 'midterm'} subjects</b>
              <span style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setSkip({})} style={S.sm('#64748b')}>Tick all</button>
                <button type="button" onClick={() => setSkip(Object.fromEntries((plan || []).map(i => [i.key, true])))} style={S.sm('#64748b')}>Untick all</button>
              </span>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {!plan ? <Empty text="Checking..." /> : plan.length === 0
                ? <Empty text={`No subject is marked for ${kind === 'cce' ? 'CCE' : 'a midterm exam'} yet. Add subjects in the Subjects tab.`} />
                : Object.entries(groups).map(([id, items]) => (
                  <div key={id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <b style={{ fontSize: 13 }}>{nameOf[id]?.full_name}</b>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
                      {items.map(i => (
                        <label key={i.key} style={{ fontSize: 13, color: i.have ? '#94a3b8' : 'inherit' }}>
                          <input type="checkbox" disabled={i.have} checked={!i.have && !skip[i.key]} onChange={e => setSkip(p => ({ ...p, [i.key]: !e.target.checked }))} /> {i.name}{i.have && ' (already assigned)'}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        <button onClick={generate} disabled={busy || count === 0} style={S.btn('#2563eb', { justifyContent: 'center' })}>{busy ? 'Creating...' : `Create ${count} work item(s)`}</button>
      </div>
    </Modal>
  );
}

function AssignModal({ kind, staffList, profile, onClose, onDone }) {
  const { toast } = useUI();
  const K = KINDS[kind];
  const [f, setF] = useState({ title: '', description: '', sub_code: K.def, marks: 1, due_date: '', start: todayStr(), weeks: 1, late: 50 });
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState(false);
  const ids = Object.keys(sel).filter(k => sel[k]);

  async function save(e) {
    e.preventDefault();
    if (!ids.length) return toast('Select at least one staff member.', 'error');
    const marks = Number(f.marks); const lp = Number(f.late);
    if (!(marks > 0)) return toast('Points must be greater than 0.', 'error');
    if (!(lp >= 0 && lp <= 100)) return toast('Late percentage must be 0–100.', 'error');
    const weeks = kind === 'duty' ? Math.max(1, Math.min(12, Number(f.weeks) || 1)) : 1;
    const rows = [];
    ids.forEach(id => {
      for (let w = 0; w < weeks; w++) {
        const ws = addDays(f.start, 7 * w);
        rows.push({ cycle: CYCLE, kind, staff_id: id, title: kind === 'duty' ? `${f.title.trim()} (week of ${fmtDate(ws)})` : f.title.trim(), description: f.description || null, domain_code: SUB[f.sub_code].domain, sub_code: f.sub_code, marks, late_pct: lp, due_date: kind === 'duty' ? addDays(ws, 6) : (f.due_date || null), status: 'Pending', created_by: profile.id });
      }
    });
    setBusy(true);
    const { error } = await supabase.from('work_items').insert(rows);
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast(`${rows.length} ${K.one.toLowerCase()}(s) assigned to ${ids.length} staff`); onDone();
  }

  return (
    <Modal title={kind === 'duty' ? 'Assign Weekly Duty (bulk)' : 'Assign Special Task (bulk)'} onClose={onClose} width={620}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input required placeholder={kind === 'duty' ? 'Duty title (e.g. Hostel supervision)' : 'Task title'} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} style={S.input} />
        <textarea placeholder="Description (optional)" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} style={{ ...S.input, minHeight: 50 }} />
        <label style={{ fontSize: 13 }}>Counts towards sub-domain<SubSelect value={f.sub_code} onChange={v => setF({ ...f, sub_code: v })} style={{ ...S.input, width: '100%' }} /></label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 100px', fontSize: 13 }}>Points<input type="number" min="0.5" step="0.5" value={f.marks} onChange={e => setF({ ...f, marks: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
          {kind === 'duty' ? <>
            <label style={{ flex: '1 1 140px', fontSize: 13 }}>First week starts<input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
            <label style={{ flex: '1 1 100px', fontSize: 13 }}>Repeat (weeks)<input type="number" min="1" max="12" value={f.weeks} onChange={e => setF({ ...f, weeks: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
          </> : (
            <label style={{ flex: '1 1 140px', fontSize: 13 }}>Deadline<input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
          )}
        </div>
        <LateField value={f.late} onChange={v => setF({ ...f, late: v })} />
        <StaffPicker staffList={staffList} sel={sel} setSel={setSel} />
        <button type="submit" disabled={busy} style={S.btn('#16a34a', { justifyContent: 'center' })}>{busy ? 'Assigning...' : `Assign to ${ids.length} staff`}</button>
      </form>
    </Modal>
  );
}

// ==========================================
// BONUS POINTS
// ==========================================
function BonusPointsPage({ userRole, profile }) {
  const reviewer = userRole !== 'teacher';
  const { toast, confirm, ask } = useUI();
  const { list: staffList, map } = useStaff(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [mode, setMode] = useState('request');
  const [statusF, setStatusF] = useState(reviewer ? 'Pending' : 'all');

  const load = async () => {
    let q = supabase.from('special_point_entries').select('*').order('created_at', { ascending: false });
    if (!reviewer) q = q.eq('staff_id', profile.id);
    const { data, error } = await q;
    if (error) toast(error.message, 'error');
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const pts = Number(form.points);
    if (!(pts > 0)) return toast('Enter points greater than 0.', 'error');
    const base = { title: form.title.trim(), reason: form.reason, sub_code: form.sub_code, domain_code: SUB[form.sub_code].domain };
    const payload = mode === 'award'
      ? { ...base, staff_id: form.staff_id, points_requested: pts, points_approved: pts, status: 'Approved' }
      : { ...base, staff_id: profile.id, points_requested: pts, points_approved: 0, status: 'Pending' };
    const { error } = await supabase.from('special_point_entries').insert(payload);
    if (error) return toast(error.message, 'error');
    toast(mode === 'award' ? 'Bonus points awarded' : 'Request submitted'); setForm(null); load();
  }
  async function approve(r) {
    const v = await ask(`Points to award (requested: ${r.points_requested || 0})`, String(r.points_requested || ''));
    if (v === null) return;
    const pts = Number(v);
    if (!(pts >= 0)) return toast('Invalid points.', 'error');
    const { error } = await supabase.from('special_point_entries').update({ status: 'Approved', points_approved: pts }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    load();
  }
  async function reject(r) {
    const remarks = await ask('Reason for rejection');
    if (!remarks) return;
    const { error } = await supabase.from('special_point_entries').update({ status: 'Rejected', points_approved: 0, reviewer_remarks: remarks }).eq('id', r.id);
    if (error) toast(error.message, 'error'); else load();
  }
  async function remove(r) {
    if (!(await confirm('Delete this entry?'))) return;
    const { error } = await supabase.from('special_point_entries').delete().eq('id', r.id);
    if (error) toast(error.message, 'error'); else load();
  }

  const shown = rows.filter(r => statusF === 'all' || r.status === statusF);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: '#64748b', fontSize: 14, maxWidth: 520 }}>Approved bonus points count towards the selected sub-domain. {BONUS_CAP} approved points = full marks for that sub-domain.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={S.input}><option value="all">All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          <button onClick={() => { setMode('request'); setForm({ title: '', reason: '', points: '', staff_id: '', sub_code: BONUS_SUB }); }} style={S.btn('#2563eb')}><Plus size={16} /> Request Points</button>
          {reviewer && <button onClick={() => { setMode('award'); setForm({ title: '', reason: '', points: '', staff_id: '', sub_code: BONUS_SUB }); }} style={S.btn('#16a34a')}><Gift size={16} /> Award Points</button>}
        </div>
      </div>

      {form && (
        <Modal title={mode === 'award' ? 'Award Bonus Points' : 'Request Bonus Points'} onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'award' && <select required value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} style={S.input}><option value="">Select Staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
            <input required placeholder="Achievement / title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
            <label style={{ fontSize: 14 }}>Counts towards sub-domain
              <SubSelect value={form.sub_code} onChange={v => setForm({ ...form, sub_code: v })} style={{ ...S.input, width: '100%', marginTop: 5 }} />
            </label>
            <input required type="number" min="0" step="0.5" placeholder="Points" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} style={S.input} />
            <textarea placeholder="Details / justification" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ ...S.input, minHeight: 70 }} />
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>{mode === 'award' ? 'Award' : 'Submit request'}</button>
          </form>
        </Modal>
      )}

      <div style={S.card}>
        {shown.length === 0 ? <Empty text="No bonus entries." /> : (
          <Table heads={['Staff', 'Title', 'Sub-domain', 'Requested', 'Approved', 'Status', 'Action']} min={760}>
            {shown.map(r => (
              <tr key={r.id} style={S.row}>
                <td style={S.td}>{map[r.staff_id]?.full_name || '-'}</td>
                <td style={S.td}>{r.title || '-'}{r.reason && <div style={{ fontSize: 12, color: '#64748b' }}>{r.reason}</div>}</td>
                <td style={S.td}><span style={{ background: SUB[r.sub_code]?.color || '#64748b', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{r.sub_code || BONUS_SUB}</span></td>
                <td style={S.td}>{r.points_requested ?? '-'}</td>
                <td style={{ ...S.td, fontWeight: 700, color: '#ea580c' }}>{r.status === 'Approved' ? `+${r.points_approved}` : '-'}</td>
                <td style={S.td}><Badge text={r.status} />{r.reviewer_remarks && <div style={{ fontSize: 11, color: '#ef4444' }}>{r.reviewer_remarks}</div>}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {reviewer && r.status === 'Pending' && (r.staff_id !== profile.id || userRole === 'admin') && <>
                      <button onClick={() => approve(r)} style={S.sm('#16a34a')}>Approve</button>
                      <button onClick={() => reject(r)} style={S.sm('#ef4444')}>Reject</button>
                    </>}
                    {(userRole === 'admin' || (r.staff_id === profile.id && r.status === 'Pending')) && <button title="Delete" onClick={() => remove(r)} style={S.icon('#ef4444')}><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// APPRAISAL WORKFLOW
// ==========================================
function RatingButtons({ value, onChange, disabled, color }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5, 0].map(v => {
        const on = value === v;
        return <button key={v} type="button" disabled={disabled} title={RATING_LABEL[v]} onClick={() => onChange(v)}
          style={{ minWidth: v === 0 ? 46 : 34, padding: '6px 8px', borderRadius: 6, border: on ? `2px solid ${color}` : '1px solid #cbd5e1', background: on ? `${color}18` : '#fff', color: on ? color : '#475569', fontWeight: 600, fontSize: 13, cursor: disabled ? 'default' : 'pointer' }}>{v === 0 ? 'N/A' : v}</button>;
      })}
    </div>
  );
}

function AppraisalPage({ userRole, profile }) {
  const { toast, confirm } = useUI();
  const { list: staffAll } = useStaff();
  const isTeacher = userRole === 'teacher';
  const [tab, setTab] = useState('form');
  const [selected, setSelected] = useState(isTeacher ? profile.id : '');
  const [appr, setAppr] = useState(null);
  const [status, setStatus] = useState('Draft');
  const [ratings, setRatings] = useState({}); const [comments, setComments] = useState({});
  const [items, setItems] = useState([]);
  const [bonusRows, setBonusRows] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState([]);
  const [open, setOpen] = useState({ D1: true });

  const staffList = isTeacher ? [{ id: profile.id, full_name: profile.full_name }] : staffAll;
  const isSelf = selected === profile.id;
  const isRater = userRole === 'admin' || (userRole === 'appraisal_authority' && !isSelf);
  const locked = status === 'Approved';
  const canRate = isRater && !locked;
  const hideDraft = !isRater && !locked;

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: a }, { data: w }, { data: b }] = await Promise.all([
        supabase.from('appraisals').select('*, appraisal_sub_ratings(*)').eq('staff_id', selected).eq('cycle', CYCLE).maybeSingle(),
        supabase.from('work_items').select('*').eq('staff_id', selected).eq('cycle', CYCLE),
        supabase.from('special_point_entries').select('status, points_approved, sub_code').eq('staff_id', selected)
      ]);
      setItems(w || []); setBonusRows(b || []);
      const R = {}, C = {};
      (a?.appraisal_sub_ratings || []).forEach(r => { if (r.rating !== null) R[r.sub_code] = r.rating; C[r.sub_code] = r.reviewer_comment || ''; });
      setAppr(a || null); setStatus(a?.status === 'Approved' ? 'Approved' : 'Draft');
      setRatings(R); setComments(C); setRemarks(a?.authority_remarks || '');
    })();
  }, [selected]);

  useEffect(() => {
    if (tab !== 'overview') return;
    supabase.from('appraisals').select('staff_id, status, final_score').eq('cycle', CYCLE).then(({ data }) => setOverview(data || []));
  }, [tab]);

  const shownRatings = hideDraft ? {} : ratings;
  const wm = useMemo(() => withBonus(workMap(items), bonusRows), [items, bonusRows]);
  const computed = useMemo(() => computeScores(shownRatings, wm), [shownRatings, wm]);
  const staffName = staffList.find(s => s.id === selected)?.full_name || '';
  const shownTotal = locked && appr ? Number(appr.final_score) : computed.total;

  async function persist(newStatus, msg) {
    if (!selected) return toast('Select staff first', 'error');
    setSaving(true);
    try {
      const payload = { staff_id: selected, cycle: CYCLE, status: newStatus, final_score: Number(computed.total.toFixed(2)), authority_remarks: remarks || null };
      const { data: a, error } = await supabase.from('appraisals').upsert(payload, { onConflict: 'staff_id,cycle' }).select().single();
      if (error) throw error;
      const rows = SUBS.map(s => ({ appraisal_id: a.id, domain_code: s.domain, sub_code: s.code, rating: ratings[s.code] ?? null, reviewer_comment: comments[s.code] || '' }));
      const { error: e2 } = await supabase.from('appraisal_sub_ratings').upsert(rows, { onConflict: 'appraisal_id,sub_code' });
      if (e2) throw e2;
      setStatus(newStatus); setAppr(a); toast('✅ ' + msg);
    } catch (err) { toast('Error: ' + err.message, 'error'); } finally { setSaving(false); }
  }

  async function finalize() {
    const empty = SUBS.filter(s => ratings[s.code] === undefined && !wm[s.code]).length;
    if (!(await confirm(`Finalise and lock this appraisal? ${empty ? `${empty} sub-domain(s) have no rating and no work, so they score 0. ` : ''}The score will be locked.`))) return;
    persist('Approved', 'Appraisal finalised');
  }
  async function reopen() {
    if (!(await confirm('Reopen this finalised appraisal for editing?'))) return;
    persist('Draft', 'Appraisal reopened');
  }
  function printForm() {
    const all = {}; domains.forEach(d => { all[d.code] = true; });
    setOpen(all); setTimeout(() => window.print(), 300);
  }

  const badgeText = isTeacher && !locked ? 'Under evaluation' : (locked ? 'Finalised' : 'Draft');
  const badgeCol = locked ? ['#dcfce7', '#166534'] : ['#fef3c7', '#92400e'];
  const btnBase = { padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#fff' };
  const provisional = !locked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!isTeacher && <Tabs tabs={[['form', 'Appraisal Form'], ['overview', 'All Staff Overview']]} value={tab} onChange={setTab} />}

      {tab === 'overview' && (
        <div style={S.card}>
          <Table heads={['Staff', 'Status', 'Score', 'Action']} min={520}>
            {staffAll.map(s => {
              const a = overview.find(x => x.staff_id === s.id);
              return (
                <tr key={s.id} style={S.row}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{s.full_name}</td>
                  <td style={S.td}>{a ? <Badge text={a.status === 'Approved' ? 'Approved' : 'Draft'} /> : <span style={{ color: '#94a3b8' }}>Not started</span>}</td>
                  <td style={S.td}>{a ? Number(a.final_score || 0).toFixed(1) : '-'}</td>
                  <td style={S.td}><button onClick={() => { setSelected(s.id); setTab('form'); }} style={S.sm('#2563eb')}>Open</button></td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      {tab === 'form' && <>
        <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Appraisal Status</h3>
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: badgeCol[0], color: badgeCol[1] }}>{badgeText}</span>
            </div>
            <select className="no-print" value={selected} onChange={e => setSelected(e.target.value)} disabled={isTeacher} style={{ ...S.input, minWidth: 220 }}>
              <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            {selected && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Cycle {CYCLE} • {staffName}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {selected && <button className="no-print" onClick={printForm} style={S.btn('#475569')}><Printer size={16} /> Print</button>}
            <div style={{ textAlign: 'right', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>{provisional ? (isRater ? 'Score so far (Max 100)' : 'Work-based progress (provisional)') : 'Official Appraisal Score (Max 100) • locked'}</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{shownTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {selected && locked && appr && isRater && Math.abs(computed.total - Number(appr.final_score)) > 0.05 && (
          <div className="no-print" style={{ background: '#fef3c7', color: '#92400e', padding: 14, borderRadius: 10, fontSize: 14 }}>
            Work or bonus points changed after this appraisal was finalised. Live score: <b>{computed.total.toFixed(2)}</b>, locked score: <b>{Number(appr.final_score).toFixed(2)}</b>. {userRole === 'admin' ? 'Reopen and finalise again to update the locked score.' : 'Ask the Admin to reopen it to update the locked score.'}
          </div>
        )}

        {!selected && <div style={S.card}><Empty text="Select a staff member to open their appraisal." /></div>}

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div className="no-print" style={{ ...S.card, background: '#f8fafc', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              {isRater
                ? <><b>How marks are calculated.</b> The Principal/Admin gives a rating (1–5, or N/A) to each sub-domain. Work done by the staff member (CCE, midterm, lesson plans, duties, tasks, bonus) is added automatically.
                    If a sub-domain has both, they are averaged ({Math.round(WORK_SHARE * 100)}% work / {Math.round((1 - WORK_SHARE) * 100)}% rating); if only one exists, that one is used.
                    A sub-domain with neither rating nor work scores <b>0</b>. Only a sub-domain rated <b>N/A</b> is excluded (its weight is removed from the 100).</>
                : <>Your appraisal is evaluated by the Principal/Admin. Work you complete (CCE, midterm, lesson plans, duties, tasks, bonus) is counted automatically. Ratings and remarks appear here once the appraisal is finalised.</>}
            </div>

            {domains.map(d => {
              const pd = computed.per[d.code];
              const isOpen = !!open[d.code];
              return (
                <div key={d.code} style={S.card}>
                  <div onClick={() => setOpen(o => ({ ...o, [d.code]: !o[d.code] }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ background: d.color, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>{d.code}</span><b style={{ fontSize: 16 }}>{d.name}</b></div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 5 }}>Max Weight: {d.weight} Marks • {d.subs.length} sub-domains {isOpen ? '▲' : '▼'}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 18, color: pd.na ? '#94a3b8' : d.color }}>
                      {pd.na ? 'N/A (excluded)' : `${pd.score.toFixed(1)} / ${pd.max}`}
                    </div>
                  </div>

                  {isOpen && d.subs.map(s => {
                    const x = computed.subs[s.code]; const w = wm[s.code]; const r = shownRatings[s.code];
                    return (
                      <div key={s.code} style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9', marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 260px' }}>
                            <b style={{ color: d.color }}>{s.code}</b> <b>{s.name}</b> <span style={{ color: '#64748b', fontSize: 12 }}>({s.weight} marks)</span>
                            {w && (w.bonus
                              ? <div style={{ fontSize: 12, color: '#ea580c', marginTop: 3 }}>Bonus: {w.bonus} approved point(s) • full marks at {BONUS_CAP}</div>
                              : <div style={{ fontSize: 12, color: '#0d9488', marginTop: 3 }}>Work: {w.earned.toFixed(1)}/{w.assigned.toFixed(1)} pts • {w.done}/{w.n} completed</div>)}
                          </div>
                          <div style={{ fontSize: 13, textAlign: 'right', minWidth: 90 }}>
                            <div style={{ color: '#64748b' }}>Score</div>
                            <b style={{ fontSize: 16 }}>{x.na ? 'N/A' : x.score.toFixed(2)}</b>
                          </div>
                        </div>

                        {(canRate || !hideDraft) && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                            <RatingButtons value={r} disabled={!canRate} color={d.color} onChange={v => setRatings(p => ({ ...p, [s.code]: v }))} />
                            {r !== undefined && r >= 1 && <span style={{ fontSize: 12, color: '#64748b' }}>{RATING_LABEL[r]}</span>}
                          </div>
                        )}
                        {canRate
                          ? <input placeholder="Evidence / comment (optional)" value={comments[s.code] || ''} onChange={e => setComments(p => ({ ...p, [s.code]: e.target.value }))} style={{ ...S.input, width: '100%', padding: 8, marginTop: 8 }} />
                          : (!hideDraft && comments[s.code]) ? <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}><b>Comment:</b> {comments[s.code]}</div> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {canRate && (
              <div className="no-print" style={S.card}>
                <b style={{ fontSize: 14 }}>Overall remarks (shown to the staff member after finalising)</b>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Key strengths, areas for development, support recommended..." style={{ ...S.input, width: '100%', minHeight: 70, marginTop: 8 }} />
              </div>
            )}
            {!canRate && (locked || !isTeacher) && appr?.authority_remarks && (
              <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8, border: '1px solid #bfdbfe' }}><strong style={{ color: '#1d4ed8' }}>Principal's Remarks:</strong> {appr.authority_remarks}</div>
            )}

            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 40 }}>
              {canRate && <>
                <button onClick={() => persist('Draft', 'Draft saved')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#64748b' }}>Save Draft</button>
                <button onClick={finalize} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#16a34a' }}>Finalise & Lock</button>
              </>}
              {locked && (
                <div style={{ width: '100%', padding: 16, background: '#dcfce7', color: '#166534', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>
                  ✅ This appraisal has been finalised.
                  {userRole === 'admin' && <button onClick={reopen} style={{ ...S.sm('#ef4444'), marginLeft: 12 }}>Reopen</button>}
                </div>
              )}
              {!isRater && !locked && <div style={{ width: '100%', color: '#64748b', fontSize: 14 }}>This appraisal is being prepared by the Principal/Admin. You can view it once it is finalised.</div>}
              {userRole === 'appraisal_authority' && isSelf && <div style={{ width: '100%', color: '#64748b', fontSize: 14 }}>Your own appraisal is rated by the Admin.</div>}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

// ==========================================
// REPORTS
// ==========================================
function ReportsPage() {
  const { toast } = useUI();
  const { list: staff } = useStaff();
  const [raw, setRaw] = useState(null);
  const [dept, setDept] = useState('all');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [tkind, setTkind] = useState('cce');

  useEffect(() => {
    (async () => {
      const [ap, wk, bp] = await Promise.all([
        supabase.from('appraisals').select('staff_id, status, final_score, appraisal_sub_ratings(sub_code, rating)').eq('cycle', CYCLE),
        supabase.from('work_items').select('staff_id, kind, status, due_date, month, sub_code, marks, awarded, submitted_on').eq('cycle', CYCLE),
        supabase.from('special_point_entries').select('staff_id, status, points_approved, sub_code')
      ]);
      setRaw({ ap: ap.data || [], wk: wk.data || [], bp: bp.data || [] });
    })();
  }, []);

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const matrix = useMemo(() => {
    if (!raw) return [];
    return staff.filter(s => dept === 'all' || s.department === dept).map(s => {
      const a = raw.ap.find(x => x.staff_id === s.id) || null;
      const rm = {};
      (a?.appraisal_sub_ratings || []).forEach(r => { if (r.rating !== null && r.rating !== undefined) rm[r.sub_code] = r.rating; });
      return { s, a, ...computeScores(rm, withBonus(workMap(raw.wk.filter(x => x.staff_id === s.id)), raw.bp.filter(x => x.staff_id === s.id))) };
    });
  }, [raw, staff, dept]);

  const today = todayStr();
  const trackRows = useMemo(() => !raw ? [] : staff.filter(s => dept === 'all' || s.department === dept).map(s => {
    const mine = raw.wk.filter(x => x.staff_id === s.id && x.kind === tkind && (tkind === 'midterm' || tkind === 'duty' || tkind === 'task' || x.month === month));
    const c = (st) => mine.filter(x => x.status === st).length;
    const late = mine.filter(x => x.status !== 'Pending' && x.due_date && x.submitted_on && x.submitted_on > x.due_date).length;
    const overdue = mine.filter(x => x.status === 'Pending' && x.due_date && x.due_date < today).length;
    return { s, total: mine.length, done: c('Completed'), sub: c('Submitted'), pend: c('Pending'), late, overdue };
  }).filter(r => r.total > 0), [raw, staff, dept, month, tkind]);

  const cell = (r, d) => r.per[d.code].na ? 'N/A' : r.per[d.code].score.toFixed(1);
  const exportMatrix = () => downloadCSV(`Score_Matrix_${CYCLE}.csv`, ['Staff', 'Department', ...domains.map(d => d.code), 'Total', 'Status'],
    matrix.map(r => [r.s.full_name, r.s.department, ...domains.map(d => cell(r, d)), r.total.toFixed(1), r.a ? (r.a.status === 'Approved' ? 'Finalised' : 'Draft') : 'Not started']));
  const exportTrack = () => downloadCSV(`${tkind}_tracker.csv`, ['Staff', 'Department', 'Total', 'Completed', 'Submitted', 'Pending', 'Overdue', 'Finished late'], trackRows.map(r => [r.s.full_name, r.s.department, r.total, r.done, r.sub, r.pend, r.overdue, r.late]));

  async function exportWork() {
    const { data, error } = await supabase.from('work_items').select('*, profiles!staff_id(full_name)').eq('cycle', CYCLE);
    if (error) return toast(error.message, 'error');
    downloadCSV(`Work_${todayStr()}.csv`, ['Staff', 'Type', 'Title', 'Subject', 'Month', 'Exam', 'Sub-domain', 'Points', 'Awarded', 'Deadline', 'Submitted on', 'Status'],
      (data || []).map(r => [r.profiles?.full_name, r.kind, r.title, r.subject_name, r.month, r.exam_name, r.sub_code, r.marks, r.awarded, r.due_date, r.submitted_on, r.status]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...S.card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={dept} onChange={e => setDept(e.target.value)} style={S.input}><option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}</select>
        <button onClick={exportWork} style={S.btn('#16a34a')}><Download size={16} /> All work records (CSV)</button>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Domain-wise Score Matrix ({CYCLE})</h3>
          <button onClick={exportMatrix} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
        </div>
        {!raw ? <Empty text="Loading..." /> : (
          <Table heads={['Staff', ...domains.map(d => `${d.code} (${d.weight})`), 'Total /100', 'Status']} min={900}>
            {matrix.map(r => (
              <tr key={r.s.id} style={S.row}>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.s.department}</div></td>
                {domains.map(d => <td key={d.code} style={{ ...S.td, color: r.per[d.code].na ? '#94a3b8' : 'inherit' }}>{cell(r, d)}</td>)}
                <td style={{ ...S.td, fontWeight: 700, color: '#2563eb' }}>{r.total.toFixed(1)}</td>
                <td style={S.td}>{r.a ? <Badge text={r.a.status === 'Approved' ? 'Approved' : 'Draft'} /> : <span style={{ color: '#94a3b8' }}>Not started</span>}</td>
              </tr>
            ))}
          </Table>
        )}
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Live calculation from the Principal's ratings and approved work. N/A = every sub-domain in that domain was rated N/A (excluded from the 100). Final locked scores are on the leaderboard.</div>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Work Tracker</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={tkind} onChange={e => setTkind(e.target.value)} style={S.input}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            {(tkind === 'cce' || tkind === 'lesson') && <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={S.input} />}
            <button onClick={exportTrack} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
          </div>
        </div>
        {!raw ? <Empty text="Loading..." /> : trackRows.length === 0 ? <Empty text="No records for this selection." /> : (
          <Table heads={['Staff', 'Total', 'Completed', 'Submitted', 'Pending', 'Overdue', 'Late', 'Progress']} min={760}>
            {trackRows.map(r => (
              <tr key={r.s.id} style={S.row}>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.s.department}</div></td>
                <td style={S.td}>{r.total}</td><td style={S.td}>{r.done}</td><td style={S.td}>{r.sub}</td><td style={S.td}>{r.pend}</td>
                <td style={{ ...S.td, color: r.overdue ? '#ef4444' : 'inherit', fontWeight: r.overdue ? 700 : 400 }}>{r.overdue}</td>
                <td style={S.td}>{r.late}</td>
                <td style={{ ...S.td, fontWeight: 700, color: r.done === r.total ? '#16a34a' : '#475569' }}>{Math.round((r.done / r.total) * 100)}%</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ACCOUNT SETTINGS
// ==========================================
function AccountSettingsPage({ profile, reloadProfile }) {
  const { toast } = useUI();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const photoRef = useRef(null);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const path = `public/${profile.id}_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file);
    if (upErr) return toast(upErr.message, 'error');
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    if (error) return toast(error.message, 'error');
    toast('Photo updated'); reloadProfile();
  }

  async function handleEmailUpdate(e) {
    e.preventDefault();
    if (!newEmail) return;
    setEmailLoading(true);
    const finalEmail = newEmail.includes('@') ? newEmail.trim() : `${newEmail.trim()}@staff.local`;
    const { error } = await supabase.auth.updateUser({ email: finalEmail });
    setEmailLoading(false);
    if (error) toast(error.message, 'error'); else toast('✅ Confirmation link sent to your new email. Please check your inbox.');
    setNewEmail('');
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast('Passwords do not match!', 'error');
    if (newPassword.length < 6) return toast('Password must be at least 6 characters.', 'error');
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    if (error) toast(error.message, 'error');
    else { toast('✅ Password updated successfully!'); setNewPassword(''); setConfirmPassword(''); }
  }

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...S.card, padding: 30 }}>
        <h3 style={{ marginTop: 0 }}>User Profile</h3>
        <input type="file" ref={photoRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Avatar url={profile.avatar_url} name={profile.full_name} size={72} />
          <button onClick={() => photoRef.current.click()} style={S.btn('#2563eb')}><Camera size={16} /> Change photo</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><strong>Name:</strong> {profile.full_name}</div>
          <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{profile.role.replaceAll('_', ' ')}</span></div>
          <div><strong>Department:</strong> {profile.department || '-'}</div>
          <div><strong>Designation:</strong> {profile.designation || '-'}</div>
        </div>
      </div>

      <div style={{ ...S.card, padding: 30 }}>
        <h3 style={{ marginTop: 0 }}>Change My Email (User ID)</h3>
        <form onSubmit={handleEmailUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
          <label style={{ fontSize: 14 }}>New Email Address or User ID
            <input type="text" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="Enter new email or user ID" style={{ ...S.input, width: '100%', marginTop: 5 }} />
          </label>
          <button type="submit" disabled={emailLoading} style={S.btn('#2563eb', { justifyContent: 'center', padding: 12 })}>{emailLoading ? 'Updating...' : 'Update Email'}</button>
        </form>
      </div>

      <div style={{ ...S.card, padding: 30 }}>
        <h3 style={{ marginTop: 0 }}>Change My Password</h3>
        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
          <label style={{ fontSize: 14 }}>New Password
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password" style={{ ...S.input, width: '100%', marginTop: 5 }} />
          </label>
          <label style={{ fontSize: 14 }}>Confirm New Password
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" style={{ ...S.input, width: '100%', marginTop: 5 }} />
          </label>
          <button type="submit" disabled={passLoading} style={S.btn('#16a34a', { justifyContent: 'center', padding: 12 })}>{passLoading ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}