import React, { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import {
  Award, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Plus,
  ShieldCheck, Users, X, Download, Settings, Edit, Trash2, Camera, Megaphone, Gift, BarChart3,
  Search, Printer, Pin, Eye, EyeOff
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// ==========================================
// CONSTANTS: DOMAINS & SUB-DOMAINS (from the policy PDF)
// ==========================================
const CYCLE = '2026-2027';
const WORK_SHARE = 0.5; // when a sub-domain has BOTH a rating and work records: 50% work + 50% rating
const MAX_SUBJECTS = 8;

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
    ['AL4', 'Academic Leadership & Institutional Initiatives', 2], ['AL5', 'Special Academic Contribution', 2]] }
];
const domains = RAW_DOMAINS.map(d => ({ ...d, subs: d.subs.map(([code, name, weight]) => ({ code, name, weight, domain: d.code, color: d.color })) }));
const SUBS = domains.flatMap(d => d.subs);
const SUB = Object.fromEntries(SUBS.map(s => [s.code, s]));
const RATING_LABEL = { 5: 'Exceptional', 4: 'Strong', 3: 'Expected', 2: 'Developing', 1: 'Unsatisfactory', 0: 'Not applicable' };

// the three kinds of work stored in `work_items`
const KINDS = {
  cce: { label: 'CCE Works', one: 'CCE', def: 'T5' },
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
  { id: 'bonus', label: 'Bonus Points', icon: Gift, roles: ALL },
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

// ------------------------------------------------------------------
// WORK -> per sub-domain {assigned, earned}
// A work item counts only when it is Completed OR its due date has passed.
// (Work that is not yet due and not done is NOT counted against the staff member.)
// ------------------------------------------------------------------
function workMap(items, today = todayStr()) {
  const m = {};
  items.forEach(i => {
    if (!i.sub_code) return;
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

// ------------------------------------------------------------------
// SCORING (same function everywhere)
// ratings[sub] : 1..5 rating, 0 = N/A, undefined = not rated
// work[sub]    : {assigned, earned}
// Per sub-domain:  rating% = rating/5 ; work% = earned/assigned
//   both present -> WORK_SHARE*work% + (1-WORK_SHARE)*rating% ; one present -> that one ; none -> N/A (excluded)
// Per domain: sum of applicable sub-domain marks, re-scaled to the domain weight (N/A sub-domains do not reduce marks)
// Total: applicable domains re-scaled to 100 (a domain that does not apply to the staff member does not reduce marks)
// ------------------------------------------------------------------
function computeScores(ratings, work) {
  const subs = {}; const per = {}; let sum = 0, w = 0;
  domains.forEach(d => {
    let dEarn = 0, dW = 0;
    d.subs.forEach(s => {
      const r = ratings[s.code]; const wk = work[s.code];
      const rp = r >= 1 ? r / 5 : null;
      const wp = wk && wk.assigned > 0 ? wk.earned / wk.assigned : null;
      let pct = null;
      if (rp !== null && wp !== null) pct = WORK_SHARE * wp + (1 - WORK_SHARE) * rp;
      else if (wp !== null) pct = wp; else if (rp !== null) pct = rp;
      if (pct === null) subs[s.code] = { na: true, score: 0, rp, wp };
      else { subs[s.code] = { na: false, score: pct * s.weight, pct, rp, wp }; dEarn += pct * s.weight; dW += s.weight; }
    });
    if (!dW) per[d.code] = { na: true, score: 0 };
    else { const sc = (dEarn / dW) * d.weight; per[d.code] = { na: false, score: sc }; sum += sc; w += d.weight; }
  });
  return { subs, per, total: w ? Math.min(100, (sum / w) * 100) : 0 };
}

const S = {
  card: { background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' },
  input: { padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14 },
  th: { padding: 12, textAlign: 'left', fontSize: 13, color: '#475569' },
  td: { padding: 12, fontSize: 14, verticalAlign: 'middle' },
  btn: (bg, extra = {}) => ({ background: bg, color: '#fff', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, ...extra }),
  sm: (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }),
  icon: (c = '#475569') => ({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6, cursor: 'pointer', color: c, display: 'inline-flex' }),
  row: { borderBottom: '1px solid #f1f5f9' }
};

const TONES = { green: ['#dcfce7', '#166534'], amber: ['#fef3c7', '#92400e'], red: ['#fee2e2', '#991b1b'], blue: ['#e0e7ff', '#3730a3'], purple: ['#fae8ff', '#86198f'], gray: ['#f1f5f9', '#475569'] };
const STATUS_TONE = {
  Pending: 'amber', Submitted: 'blue', Completed: 'green', Approved: 'green', Rejected: 'red', Returned: 'red',
  Draft: 'gray', Coordinator_Reviewed: 'purple', Active: 'green', Inactive: 'red', Overdue: 'red'
};

// ==========================================
// SHARED UI
// ==========================================
const UIContext = createContext(null);
const useUI = () => useContext(UIContext);

function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 26, borderRadius: 16, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
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
          {profile && page === 'bonus' && <BonusPointsPage userRole={userRole} profile={profile} />}
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
  const overdue = n(d.work, x => x.status !== 'Completed' && x.due_date && x.due_date < today);
  const awaiting = n(d.work, x => x.status === 'Submitted');
  const pending = n(d.work, x => x.status === 'Pending');
  const cceMonth = d.work.filter(x => x.kind === 'cce' && x.month === month);
  const cceDone = n(cceMonth, x => x.status === 'Completed');

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
        {(overdue > 0 || mine?.status === 'Returned') && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 10, fontWeight: 600 }}>
            ⚠ Action needed: {overdue > 0 && `${overdue} work item(s) overdue. `}{mine?.status === 'Returned' && 'Your appraisal was returned for edits.'}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
          <StatCard label="My Pending Work" value={pending} color="#d97706" onClick={() => goto('work')} sub={overdue ? `${overdue} overdue` : undefined} />
          <StatCard label="Waiting for Approval" value={awaiting} color="#7c3aed" onClick={() => goto('work')} />
          <StatCard label="Completed Work" value={`${n(d.work, x => x.status === 'Completed')}/${d.work.length}`} color="#16a34a" onClick={() => goto('work')} />
          <StatCard label={`CCE – ${monthLabel(month)}`} value={`${cceDone}/${cceMonth.length}`} color="#0d9488" onClick={() => goto('work')} sub="done this month" />
          <StatCard label="My Appraisal" value={mine ? mine.status.replaceAll('_', ' ') : 'Not started'} color="#2563eb" sub={mine ? `Score ${Number(mine.final_score || 0).toFixed(1)}` : undefined} onClick={() => goto('appraisal')} />
        </div>
        {announcements}
      </div>
    );
  }

  const toReview = userRole === 'coordinator' ? n(d.ap, a => a.status === 'Submitted')
    : userRole === 'appraisal_authority' ? n(d.ap, a => a.status === 'Coordinator_Reviewed')
    : n(d.ap, a => a.status === 'Submitted' || a.status === 'Coordinator_Reviewed');

  const actions = [
    { n: awaiting, text: 'work items submitted and waiting for approval', page: 'work' },
    { n: toReview, text: 'appraisals waiting for your review', page: 'appraisal' },
    { n: overdue, text: 'work items are overdue', page: 'work' },
    { n: canManage && cceMonth.length === 0 && d.staff.length ? 1 : 0, text: `CCE works for ${monthLabel(month)} are not generated yet`, page: 'work' }
  ].filter(a => a.n > 0);

  const statusCounts = ['Draft', 'Submitted', 'Coordinator_Reviewed', 'Returned', 'Approved'].map(s => ({ label: s.replaceAll('_', ' '), value: n(d.ap, a => a.status === s), max: d.staff.length, color: s === 'Approved' ? '#16a34a' : s === 'Returned' ? '#ef4444' : '#2563eb' }));
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
        <StatCard label="Appraisals To Review" value={toReview} color="#2563eb" onClick={() => goto('appraisal')} />
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
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');

  useEffect(() => {
    (async () => {
      const { data: staff } = await supabase.from('profiles').select('id, full_name, department, avatar_url').eq('active', true);
      const { data: appr } = await supabase.from('appraisals').select('staff_id, final_score').eq('status', 'Approved').eq('cycle', CYCLE);
      const { data: points } = await supabase.from('special_point_entries').select('staff_id, points_approved').eq('status', 'Approved');
      const scores = (staff || []).map(s => {
        const base = appr?.find(a => a.staff_id === s.id)?.final_score || 0;
        const officialScore = Math.min(100, Number(base));
        const bonus = points?.filter(p => p.staff_id === s.id).reduce((sum, c) => sum + Number(c.points_approved || 0), 0) || 0;
        return { ...s, officialScore, bonus, totalEarned: officialScore + bonus };
      });
      scores.sort((a, b) => b.totalEarned - a.totalEarned);
      scores.forEach((s, i) => { s.rank = i + 1; });
      setData(scores); setLoading(false);
    })();
  }, []);

  const depts = [...new Set(data.map(s => s.department).filter(Boolean))].sort();
  const filtered = data.filter(s => (dept === 'all' || s.department === dept) && s.full_name.toLowerCase().includes(q.toLowerCase()));
  const filtering = q || dept !== 'all';
  const top3 = filtering ? [] : filtered.slice(0, 3);
  const rest = filtering ? filtered : filtered.slice(3);

  const exportCSV = () => data.length && downloadCSV(`Staff_Leaderboard_${CYCLE}.csv`, ['Rank', 'Staff Name', 'Department', 'Official Appraisal (Max 100)', 'Bonus Points'], filtered.map(r => [r.rank, r.full_name, r.department || '-', r.officialScore.toFixed(2), r.bonus]));

  if (loading) return <Empty text="Loading scores..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: 28, color: '#1e293b' }}>🏆 Performance Leaderboard</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Official Appraisal Scores (Max 100) and separate Bonus Points. Only final-approved appraisals count.</p>
        </div>
        <button onClick={exportCSV} style={S.btn('#16a34a')}><Download size={18} /> Export CSV</button>
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
                {r.bonus > 0 && <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 'bold' }}>+{r.bonus} Bonus</div>}
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Rank #{r.rank}</div>
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

      {loading ? <Empty text="Loading..." /> : filtered.length === 0 ? <Empty text="No staff match these filters." /> : (
        <Table heads={['Photo', 'Name & Email', 'Role', 'Department', 'Status', 'Actions']} min={800}>
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
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button title="View profile" onClick={() => setView(s)} style={S.icon()}><Eye size={14} /></button>
                  {isAdmin && <button title="Edit" onClick={() => setEdit(s)} style={S.icon()}><Edit size={14} /></button>}
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
  const line = (kind) => { const a = d.wk.filter(x => x.kind === kind); const done = a.filter(x => x.status === 'Completed').length; const od = a.filter(x => x.status !== 'Completed' && x.due_date && x.due_date < todayStr()).length; return `${done}/${a.length} completed${od ? ` • ${od} overdue` : ''}`; };
  const rows = d ? [
    ['Appraisal', d.ap ? `${d.ap.status.replaceAll('_', ' ')} (${Number(d.ap.final_score || 0).toFixed(1)})` : 'Not started'],
    ['Bonus points', d.bonus],
    ['Subjects', d.subs.length ? d.subs.map(x => x.name).join(', ') : '-'],
    ['CCE works', line('cce')], ['Weekly duties', line('duty')], ['Special tasks', line('task')]
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
// WORK: CCE + WEEKLY DUTIES + SPECIAL TASKS + SUBJECTS
// Every work item belongs to a sub-domain (and so to a domain) and feeds the appraisal marks.
// ==========================================
function WorkPage({ userRole, profile }) {
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const [tab, setTab] = useState('cce');
  const { list: staffList } = useStaff();
  const tabs = [['cce', 'CCE Works'], ['duty', 'Weekly Duties'], ['task', 'Special Tasks'], ...(canManage ? [['subjects', 'Subjects']] : [])];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'subjects'
        ? <SubjectsTab staffList={staffList} />
        : <WorkTable key={tab} kind={tab} userRole={userRole} profile={profile} staffList={staffList} />}
    </div>
  );
}

function SubjectsTab({ staffList }) {
  const { toast, confirm } = useUI();
  const [subs, setSubs] = useState([]);
  const [draft, setDraft] = useState({});
  const [q, setQ] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('staff_subjects').select('*').order('name');
    if (error) toast(error.message, 'error');
    setSubs(data || []);
  };
  useEffect(() => { load(); }, []);

  async function add(staffId) {
    const name = (draft[staffId] || '').trim();
    if (!name) return;
    if (subs.filter(x => x.staff_id === staffId).length >= MAX_SUBJECTS) return toast(`A staff member can have at most ${MAX_SUBJECTS} subjects.`, 'error');
    const { error } = await supabase.from('staff_subjects').insert({ staff_id: staffId, name });
    if (error) return toast(error.code === '23505' ? 'This subject is already added.' : error.message, 'error');
    setDraft(p => ({ ...p, [staffId]: '' })); load();
  }
  async function remove(sub) {
    if (!(await confirm(`Remove "${sub.name}"? Existing CCE records are kept.`))) return;
    const { error } = await supabase.from('staff_subjects').delete().eq('id', sub.id);
    if (error) toast(error.message, 'error'); else load();
  }

  const shown = staffList.filter(s => s.full_name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={S.card}>
      <h3 style={{ marginTop: 0 }}>Subjects of each staff member</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>Add up to {MAX_SUBJECTS} subjects per staff member. Each month, one CCE work is generated for every subject.</p>
      <div style={{ display: 'flex', marginBottom: 12 }}><SearchBox value={q} onChange={setQ} placeholder="Search staff..." /></div>
      <Table heads={['Staff', 'Subjects', 'Add subject']} min={720}>
        {shown.map(s => {
          const mine = subs.filter(x => x.staff_id === s.id);
          return (
            <tr key={s.id} style={S.row}>
              <td style={{ ...S.td, fontWeight: 500 }}>{s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{s.department}</div></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {mine.map(m => <span key={m.id} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{m.name} <span onClick={() => remove(m)} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>)}
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{mine.length}/{MAX_SUBJECTS}</span>
                </div>
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={draft[s.id] || ''} onChange={e => setDraft(p => ({ ...p, [s.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add(s.id)} placeholder="e.g. Fiqh" style={{ ...S.input, padding: 6, width: 140 }} />
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

function WorkTable({ kind, userRole, profile, staffList }) {
  const K = KINDS[kind];
  const isTeacher = userRole === 'teacher';
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const { toast, confirm, ask } = useUI();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [sf, setSf] = useState('all'); const [mon, setMon] = useState('');
  const [assign, setAssign] = useState(false); const [cce, setCce] = useState(false); const [edit, setEdit] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);
  const today = todayStr();

  const load = async () => {
    let query = supabase.from('work_items').select('*, profiles(full_name)').eq('cycle', CYCLE).eq('kind', kind).order('due_date', { ascending: false }).order('created_at', { ascending: false });
    if (isTeacher) query = query.eq('staff_id', profile.id);
    const { data, error } = await query;
    if (error) toast(error.message, 'error');
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (kind === 'cce') supabase.from('staff_subjects').select('name').eq('staff_id', profile.id).then(({ data }) => setMySubjects((data || []).map(x => x.name)));
  }, []);

  async function setStatus(r, status, extra = {}) {
    const { error } = await supabase.from('work_items').update({ status, ...extra }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    load();
  }
  async function submit(r) {
    const note = await ask('Note or evidence link (optional)');
    if (note === null) return;
    setStatus(r, 'Submitted', { submission_note: note.trim() || null });
  }
  async function approve(r) {
    const v = await ask(`Points awarded (maximum ${r.marks})`, String(r.awarded ?? r.marks));
    if (v === null) return;
    const pts = Number(v);
    if (v.trim() === '' || !(pts >= 0 && pts <= Number(r.marks))) return toast(`Enter a number between 0 and ${r.marks}.`, 'error');
    setStatus(r, 'Completed', { awarded: pts, review_remarks: null });
  }
  async function returnBack(r) {
    const remarks = await ask('Remarks for returning this to the staff member');
    if (!remarks || !remarks.trim()) return;
    setStatus(r, 'Pending', { review_remarks: remarks.trim() });
  }
  async function remove(r) {
    if (!(await confirm(`Delete "${r.title}"?`))) return;
    const { error } = await supabase.from('work_items').delete().eq('id', r.id);
    if (error) return toast(error.message, 'error');
    load();
  }
  async function saveEdit(e) {
    e.preventDefault();
    const marks = Number(edit.marks);
    if (!(marks > 0)) return toast('Points must be greater than 0.', 'error');
    const { error } = await supabase.from('work_items').update({ title: edit.title.trim(), description: edit.description || null, sub_code: edit.sub_code, domain_code: SUB[edit.sub_code].domain, marks, due_date: edit.due_date || null }).eq('id', edit.id);
    if (error) return toast(error.message, 'error');
    toast('Updated'); setEdit(null); load();
  }

  const isOverdue = (r) => r.status !== 'Completed' && r.due_date && r.due_date < today;
  const shown = rows.filter(r => (st === 'all' || (st === 'Overdue' ? isOverdue(r) : r.status === st)) && (sf === 'all' || r.staff_id === sf) && (!mon || r.month === mon)
    && `${r.title} ${r.subject_name || ''} ${r.profiles?.full_name || ''}`.toLowerCase().includes(q.toLowerCase()));
  const cnt = (f) => rows.filter(f).length;

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>{K.label} ({shown.length})</h3>
        {canManage && (kind === 'cce'
          ? <button onClick={() => setCce(true)} style={S.btn('#2563eb')}><Plus size={16} /> Generate CCE for a Month</button>
          : <button onClick={() => setAssign(true)} style={S.btn('#2563eb')}><Plus size={16} /> {kind === 'duty' ? 'Assign Weekly Duty' : 'Assign Task'}</button>)}
      </div>

      {kind === 'cce' && (mySubjects.length > 0 || isTeacher) && (
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
          My subjects: {mySubjects.length ? mySubjects.map(m => <span key={m} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 12, padding: '2px 10px', marginRight: 6, fontWeight: 600 }}>{m}</span>) : <i>none assigned yet — ask the coordinator.</i>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {['Pending', 'Submitted', 'Completed'].map(s => <div key={s} style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text={s} /> <b style={{ marginLeft: 6 }}>{cnt(x => x.status === s)}</b></div>)}
        <div style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text="Overdue" /> <b style={{ marginLeft: 6 }}>{cnt(isOverdue)}</b></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search title, subject or staff..." />
        <select value={st} onChange={e => setSt(e.target.value)} style={S.input}><option value="all">All status</option><option>Pending</option><option>Submitted</option><option>Completed</option><option>Overdue</option></select>
        {kind === 'cce' && <input type="month" value={mon} onChange={e => setMon(e.target.value)} style={S.input} title="Filter by month" />}
        {!isTeacher && <select value={sf} onChange={e => setSf(e.target.value)} style={S.input}><option value="all">All staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
      </div>

      {cce && <CceModal staffList={staffList} profile={profile} onClose={() => setCce(false)} onDone={() => { setCce(false); load(); }} />}
      {assign && <AssignModal kind={kind} staffList={staffList} profile={profile} onClose={() => setAssign(false)} onDone={() => { setAssign(false); load(); }} />}
      {edit && (
        <Modal title={`Edit ${K.one}`} onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} style={S.input} />
            <textarea placeholder="Description (optional)" value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} style={{ ...S.input, minHeight: 60 }} />
            <SubSelect value={edit.sub_code} onChange={v => setEdit({ ...edit, sub_code: v })} />
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, fontSize: 13 }}>Points<input type="number" step="0.5" min="0.5" value={edit.marks} onChange={e => setEdit({ ...edit, marks: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
              <label style={{ flex: 1, fontSize: 13 }}>Due date<input type="date" value={edit.due_date || ''} onChange={e => setEdit({ ...edit, due_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
            </div>
            <button type="submit" style={S.btn('#16a34a', { justifyContent: 'center' })}>Save</button>
          </form>
        </Modal>
      )}

      {loading ? <Empty text="Loading..." /> : shown.length === 0 ? <Empty text={`No ${K.label.toLowerCase()} found.`} /> : (
        <Table heads={[...(!isTeacher ? ['Staff'] : []), 'Work', 'Sub-domain', 'Due', 'Points', 'Status', 'Action']} min={900}>
          {shown.map(r => {
            const mine = r.staff_id === profile.id;
            const canSubmit = mine && r.status === 'Pending';
            const canReview = canManage && (!mine || userRole === 'admin');
            return (
              <tr key={r.id} style={S.row}>
                {!isTeacher && <td style={S.td}>{r.profiles?.full_name}</td>}
                <td style={S.td}>
                  {r.title}
                  {r.description && <div style={{ fontSize: 12, color: '#64748b' }}>{r.description}</div>}
                  {r.submission_note && <div style={{ fontSize: 12, color: '#3730a3' }}>Note: {r.submission_note}</div>}
                  {r.review_remarks && r.status === 'Pending' && <div style={{ fontSize: 11, color: '#ef4444' }}>Returned: {r.review_remarks}</div>}
                </td>
                <td style={S.td}><span style={{ background: SUB[r.sub_code]?.color || '#64748b', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{r.sub_code}</span></td>
                <td style={S.td}>{r.due_date ? fmtDate(r.due_date) : '-'}{isOverdue(r) && <div><Badge text="Overdue" /></div>}</td>
                <td style={S.td}>{r.status === 'Completed' ? `${Number(r.awarded ?? r.marks)} / ${r.marks}` : r.marks}</td>
                <td style={S.td}><Badge text={r.status} /></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {canSubmit && <button onClick={() => submit(r)} style={S.sm('#2563eb')}>Submit as Done</button>}
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

// ---- Monthly CCE generation: one CCE per staff per subject ----
function CceModal({ staffList, profile, onClose, onDone }) {
  const { toast } = useUI();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [due, setDue] = useState(lastDayOf(todayStr().slice(0, 7)));
  const [marks, setMarks] = useState(1);
  const [sub, setSub] = useState('T5');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setPlan(null);
      const [{ data: subs }, { data: ex }] = await Promise.all([
        supabase.from('staff_subjects').select('staff_id, name'),
        supabase.from('work_items').select('staff_id, subject_name').eq('kind', 'cce').eq('month', month)
      ]);
      const active = new Set(staffList.map(s => s.id));
      const have = new Set((ex || []).map(x => `${x.staff_id}|${x.subject_name}`));
      const all = (subs || []).filter(s => active.has(s.staff_id));
      const withSubjects = new Set(all.map(s => s.staff_id));
      setPlan({ todo: all.filter(s => !have.has(`${s.staff_id}|${s.name}`)), total: all.length, noSubjects: staffList.filter(s => !withSubjects.has(s.id)).length });
    })();
  }, [month, staffList]);

  async function generate() {
    if (!plan?.todo.length) return toast('Nothing new to generate.', 'error');
    const m = Number(marks);
    if (!(m > 0)) return toast('Points must be greater than 0.', 'error');
    const rows = plan.todo.map(s => ({ cycle: CYCLE, kind: 'cce', staff_id: s.staff_id, subject_name: s.name, month, title: `CCE – ${s.name} – ${monthLabel(month)}`, domain_code: SUB[sub].domain, sub_code: sub, marks: m, due_date: due || null, status: 'Pending', created_by: profile.id }));
    setBusy(true);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('work_items').insert(rows.slice(i, i + 200));
      if (error) { setBusy(false); return toast(error.message, 'error'); }
    }
    setBusy(false);
    toast(`${rows.length} CCE work(s) generated for ${monthLabel(month)}`); onDone();
  }

  return (
    <Modal title="Generate monthly CCE works" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, fontSize: 13 }}>Month<input type="month" value={month} onChange={e => { setMonth(e.target.value); setDue(lastDayOf(e.target.value)); }} style={{ ...S.input, width: '100%' }} /></label>
          <label style={{ flex: 1, fontSize: 13 }}>Due date<input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...S.input, width: '100%' }} /></label>
        </div>
        <label style={{ fontSize: 13 }}>Counts towards sub-domain<SubSelect value={sub} onChange={setSub} style={{ ...S.input, width: '100%' }} /></label>
        <label style={{ fontSize: 13 }}>Points per CCE work<input type="number" min="0.5" step="0.5" value={marks} onChange={e => setMarks(e.target.value)} style={{ ...S.input, width: '100%' }} /></label>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13, color: '#334155' }}>
          {!plan ? 'Checking...' : <>
            <div>Subjects found: <b>{plan.total}</b> • Already generated: <b>{plan.total - plan.todo.length}</b> • <b style={{ color: '#2563eb' }}>To create: {plan.todo.length}</b></div>
            {plan.noSubjects > 0 && <div style={{ color: '#92400e', marginTop: 4 }}>{plan.noSubjects} active staff have no subjects yet (Subjects tab) and will get no CCE.</div>}
          </>}
        </div>
        <button onClick={generate} disabled={busy || !plan || plan.todo.length === 0} style={S.btn('#2563eb', { justifyContent: 'center' })}>{busy ? 'Generating...' : 'Generate for all staff'}</button>
      </div>
    </Modal>
  );
}

// ---- Bulk assignment (weekly duties and special tasks) ----
function AssignModal({ kind, staffList, profile, onClose, onDone }) {
  const { toast } = useUI();
  const K = KINDS[kind];
  const [f, setF] = useState({ title: '', description: '', sub_code: K.def, marks: 1, due_date: '', start: todayStr(), weeks: 1 });
  const [sel, setSel] = useState({});
  const [q, setQ] = useState(''); const [dept, setDept] = useState('all');
  const [busy, setBusy] = useState(false);

  const depts = [...new Set(staffList.map(s => s.department).filter(Boolean))].sort();
  const list = staffList.filter(s => (dept === 'all' || s.department === dept) && s.full_name.toLowerCase().includes(q.toLowerCase()));
  const ids = Object.keys(sel).filter(k => sel[k]);
  const allOn = list.length > 0 && list.every(s => sel[s.id]);
  const toggleAll = () => setSel(p => { const n = { ...p }; list.forEach(s => { n[s.id] = !allOn; }); return n; });

  async function save(e) {
    e.preventDefault();
    if (!ids.length) return toast('Select at least one staff member.', 'error');
    const marks = Number(f.marks);
    if (!(marks > 0)) return toast('Points must be greater than 0.', 'error');
    const weeks = kind === 'duty' ? Math.max(1, Math.min(12, Number(f.weeks) || 1)) : 1;
    const rows = [];
    ids.forEach(id => {
      for (let w = 0; w < weeks; w++) {
        const ws = addDays(f.start, 7 * w);
        rows.push({ cycle: CYCLE, kind, staff_id: id, title: kind === 'duty' ? `${f.title.trim()} (week of ${fmtDate(ws)})` : f.title.trim(), description: f.description || null, domain_code: SUB[f.sub_code].domain, sub_code: f.sub_code, marks, due_date: kind === 'duty' ? addDays(ws, 6) : (f.due_date || null), status: 'Pending', created_by: profile.id });
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
            <label style={{ flex: '1 1 140px', fontSize: 13 }}>Due date<input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
          )}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Search staff..." />
            <select value={dept} onChange={e => setDept(e.target.value)} style={S.input}><option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /> Select all shown ({list.length}) — selected in total: {ids.length}</label>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 4 }}>
            {list.map(s => <label key={s.id} style={{ fontSize: 13 }}><input type="checkbox" checked={!!sel[s.id]} onChange={e => setSel(p => ({ ...p, [s.id]: e.target.checked }))} /> {s.full_name}</label>)}
          </div>
        </div>
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
    const base = { title: form.title.trim(), reason: form.reason };
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
        <div style={{ color: '#64748b', fontSize: 14, maxWidth: 520 }}>Bonus points are separate from the official appraisal (max 100) and appear next to the score on the leaderboard once approved.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={S.input}><option value="all">All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          <button onClick={() => { setMode('request'); setForm({ title: '', reason: '', points: '', staff_id: '' }); }} style={S.btn('#2563eb')}><Plus size={16} /> Request Points</button>
          {reviewer && <button onClick={() => { setMode('award'); setForm({ title: '', reason: '', points: '', staff_id: '' }); }} style={S.btn('#16a34a')}><Gift size={16} /> Award Points</button>}
        </div>
      </div>

      {form && (
        <Modal title={mode === 'award' ? 'Award Bonus Points' : 'Request Bonus Points'} onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'award' && <select required value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} style={S.input}><option value="">Select Staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
            <input required placeholder="Achievement / title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
            <input required type="number" min="0" step="0.5" placeholder="Points" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} style={S.input} />
            <textarea placeholder="Details / justification" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ ...S.input, minHeight: 70 }} />
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>{mode === 'award' ? 'Award' : 'Submit request'}</button>
          </form>
        </Modal>
      )}

      <div style={S.card}>
        {shown.length === 0 ? <Empty text="No bonus entries." /> : (
          <Table heads={['Staff', 'Title', 'Requested', 'Approved', 'Status', 'Action']} min={760}>
            {shown.map(r => (
              <tr key={r.id} style={S.row}>
                <td style={S.td}>{map[r.staff_id]?.full_name || '-'}</td>
                <td style={S.td}>{r.title || '-'}{r.reason && <div style={{ fontSize: 12, color: '#64748b' }}>{r.reason}</div>}</td>
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
// APPRAISAL WORKFLOW  (Staff -> Coordinator -> Appraisal Authority)
// Domain-wise, sub-domain-wise form exactly like the policy scorecards.
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
  const [selfR, setSelfR] = useState({}); const [selfC, setSelfC] = useState({});
  const [offR, setOffR] = useState({}); const [offC, setOffC] = useState({});
  const [items, setItems] = useState([]);
  const [coordRemarks, setCoordRemarks] = useState(''); const [authRemarks, setAuthRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState([]);
  const [open, setOpen] = useState({ D1: true });

  const staffList = isTeacher ? [{ id: profile.id, full_name: profile.full_name }] : staffAll;
  const isSelf = selected === profile.id;
  const canEditOwn = isSelf && ['Draft', 'Returned'].includes(status);
  const canCoord = status === 'Submitted' && ((userRole === 'coordinator' && !isSelf) || userRole === 'admin');
  const canAuth = status === 'Coordinator_Reviewed' && ((userRole === 'appraisal_authority' && !isSelf) || userRole === 'admin');
  const reviewing = canCoord || canAuth;
  const readOnly = !(canEditOwn || reviewing);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: a }, { data: w }] = await Promise.all([
        supabase.from('appraisals').select('*, appraisal_sub_ratings(*)').eq('staff_id', selected).eq('cycle', CYCLE).maybeSingle(),
        supabase.from('work_items').select('*').eq('staff_id', selected).eq('cycle', CYCLE)
      ]);
      setItems(w || []);
      const sR = {}, sC = {}, oR = {}, oC = {};
      (a?.appraisal_sub_ratings || []).forEach(r => {
        if (r.self_rating !== null) sR[r.sub_code] = r.self_rating;
        if (r.rating !== null) oR[r.sub_code] = r.rating;
        sC[r.sub_code] = r.self_comment || ''; oC[r.sub_code] = r.reviewer_comment || '';
      });
      setAppr(a || null); setStatus(a?.status || 'Draft');
      setSelfR(sR); setSelfC(sC); setOffR(oR); setOffC(oC);
      setCoordRemarks(a?.coordinator_remarks || ''); setAuthRemarks(a?.authority_remarks || '');
    })();
  }, [selected]);

  useEffect(() => {
    if (tab !== 'overview') return;
    supabase.from('appraisals').select('staff_id, status, final_score').eq('cycle', CYCLE).then(({ data }) => setOverview(data || []));
  }, [tab]);

  // effective rating: official once a reviewer is involved, otherwise the staff member's own rating
  const useOfficial = reviewing || ['Coordinator_Reviewed', 'Approved'].includes(status);
  const eff = useMemo(() => {
    const m = {};
    SUBS.forEach(s => { const v = useOfficial && offR[s.code] !== undefined ? offR[s.code] : selfR[s.code]; if (v !== undefined) m[s.code] = v; });
    return m;
  }, [selfR, offR, useOfficial]);
  const wm = useMemo(() => workMap(items), [items]);
  const computed = useMemo(() => computeScores(eff, wm), [eff, wm]);
  const staffName = staffList.find(s => s.id === selected)?.full_name || '';
  const shownTotal = status === 'Approved' && appr ? Number(appr.final_score) : computed.total;

  async function persist(newStatus, msg) {
    if (!selected) return toast('Select staff first', 'error');
    setSaving(true);
    try {
      const payload = {
        staff_id: selected, cycle: CYCLE, status: newStatus, final_score: Number(computed.total.toFixed(2)),
        coordinator_remarks: canCoord ? coordRemarks : (appr?.coordinator_remarks || null),
        authority_remarks: canAuth ? authRemarks : (appr?.authority_remarks || null)
      };
      const { data: a, error } = await supabase.from('appraisals').upsert(payload, { onConflict: 'staff_id,cycle' }).select().single();
      if (error) throw error;
      const rows = SUBS.map(s => ({
        appraisal_id: a.id, domain_code: s.domain, sub_code: s.code,
        self_rating: selfR[s.code] ?? null,
        rating: canEditOwn ? null : (reviewing ? (eff[s.code] ?? null) : (offR[s.code] ?? null)),
        self_comment: selfC[s.code] || '', reviewer_comment: offC[s.code] || ''
      }));
      const { error: e2 } = await supabase.from('appraisal_sub_ratings').upsert(rows, { onConflict: 'appraisal_id,sub_code' });
      if (e2) throw e2;
      if (canEditOwn) setOffR({});
      setStatus(newStatus); setAppr(a); toast('✅ ' + msg);
    } catch (err) { toast('Error: ' + err.message, 'error'); } finally { setSaving(false); }
  }

  async function submitForReview() {
    const missing = SUBS.find(s => selfR[s.code] === undefined);
    if (missing) { setOpen(o => ({ ...o, [missing.domain]: true })); return toast(`Please rate ${missing.code} (choose a rating or N/A) before submitting.`, 'error'); }
    const naNoReason = SUBS.find(s => selfR[s.code] === 0 && !(selfC[s.code] || '').trim());
    if (naNoReason) { setOpen(o => ({ ...o, [naNoReason.domain]: true })); return toast(`${naNoReason.code}: N/A needs a short justification in the comment.`, 'error'); }
    if (!(await confirm('Submit to the coordinator? You cannot edit it until it is returned.'))) return;
    persist('Submitted', 'Submitted to coordinator');
  }
  function returnWith(toStatus, who) {
    if (!(who === 'coordinator' ? coordRemarks : authRemarks).trim()) return toast('Please write remarks before returning.', 'error');
    persist(toStatus, 'Returned');
  }
  async function reopen() {
    if (!(await confirm('Reopen this approved appraisal and return it to the staff member?'))) return;
    persist('Returned', 'Appraisal reopened');
  }
  function printForm() {
    const all = {}; domains.forEach(d => { all[d.code] = true; });
    setOpen(all); setTimeout(() => window.print(), 300);
  }

  const statusColor = { Draft: ['#f1f5f9', '#475569'], Submitted: ['#e0e7ff', '#3730a3'], Coordinator_Reviewed: ['#fae8ff', '#86198f'], Returned: ['#fee2e2', '#991b1b'], Approved: ['#dcfce7', '#166534'] }[status] || ['#f1f5f9', '#475569'];
  const btnBase = { padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#fff' };
  const rtxt = (v) => v === undefined ? '-' : v === 0 ? 'N/A' : v;

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
                  <td style={S.td}>{a ? <Badge text={a.status} /> : <span style={{ color: '#94a3b8' }}>Not started</span>}</td>
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
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: statusColor[0], color: statusColor[1] }}>{status.replaceAll('_', ' ')}</span>
            </div>
            <select className="no-print" value={selected} onChange={e => setSelected(e.target.value)} disabled={isTeacher} style={{ ...S.input, minWidth: 220 }}>
              <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            {selected && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Cycle {CYCLE} • {staffName}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {selected && <button className="no-print" onClick={printForm} style={S.btn('#475569')}><Printer size={16} /> Print</button>}
            <div style={{ textAlign: 'right', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Official Appraisal Score (Max 100){status === 'Approved' ? ' • locked' : ''}</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{shownTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {!selected && <div style={S.card}><Empty text="Select a staff member to open their appraisal." /></div>}

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div className="no-print" style={{ ...S.card, background: '#f8fafc', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              <b>How marks are calculated.</b> Each sub-domain gets a <b>rating %</b> (rating ÷ 5) and a <b>work %</b> (points earned ÷ points assigned and due, from CCE works, weekly duties and tasks).
              If both exist they are averaged ({Math.round(WORK_SHARE * 100)}% work / {Math.round((1 - WORK_SHARE) * 100)}% rating); if only one exists, that one is used.
              A sub-domain or domain with neither (or rated N/A) is <b>excluded</b> and the total is re-scaled to 100, so staff are never penalised for areas that do not apply to them.
              {isSelf && canEditOwn && <> Staff: rate every sub-domain (1–5 or N/A with a reason), then submit.</>}
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
                      {pd.na ? 'N/A (excluded)' : `${pd.score.toFixed(1)} / ${d.weight}`}
                    </div>
                  </div>

                  {isOpen && d.subs.map(s => {
                    const x = computed.subs[s.code]; const w = wm[s.code];
                    return (
                      <div key={s.code} style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9', marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 260px' }}>
                            <b style={{ color: d.color }}>{s.code}</b> <b>{s.name}</b> <span style={{ color: '#64748b', fontSize: 12 }}>({s.weight} marks)</span>
                            {w && <div style={{ fontSize: 12, color: '#0d9488', marginTop: 3 }}>Work: {w.earned.toFixed(1)}/{w.assigned.toFixed(1)} pts • {w.done}/{w.n} completed</div>}
                          </div>
                          <div style={{ fontSize: 13, textAlign: 'right', minWidth: 90 }}>
                            <div style={{ color: '#64748b' }}>Score</div>
                            <b style={{ fontSize: 16 }}>{x.na ? 'N/A' : `${x.score.toFixed(2)}`}</b>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                          {canEditOwn
                            ? <RatingButtons value={selfR[s.code]} onChange={v => setSelfR(p => ({ ...p, [s.code]: v }))} color={d.color} />
                            : reviewing
                              ? <>
                                  <span style={{ fontSize: 12, color: '#64748b' }}>Self: <b>{rtxt(selfR[s.code])}</b></span>
                                  <RatingButtons value={eff[s.code]} onChange={v => setOffR(p => ({ ...p, [s.code]: v }))} color={d.color} />
                                </>
                              : <RatingButtons value={eff[s.code]} disabled color={d.color} />}
                          {eff[s.code] !== undefined && eff[s.code] >= 1 && <span style={{ fontSize: 12, color: '#64748b' }}>{RATING_LABEL[eff[s.code]]}</span>}
                        </div>

                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {canEditOwn ? (
                            <input placeholder="Evidence / reflection (required for N/A)" value={selfC[s.code] || ''} onChange={e => setSelfC(p => ({ ...p, [s.code]: e.target.value }))} style={{ ...S.input, width: '100%', padding: 8 }} />
                          ) : <>
                            {selfC[s.code] && <div style={{ fontSize: 12, color: '#475569' }}><b>Staff:</b> {selfC[s.code]}</div>}
                            {reviewing
                              ? <input placeholder="Reviewer comment" value={offC[s.code] || ''} onChange={e => setOffC(p => ({ ...p, [s.code]: e.target.value }))} style={{ ...S.input, width: '100%', padding: 8 }} />
                              : offC[s.code] && <div style={{ fontSize: 12, color: '#86198f' }}><b>Reviewer:</b> {offC[s.code]}</div>}
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {appr?.coordinator_remarks && !canCoord && <div style={{ background: '#fdf4ff', padding: 15, borderRadius: 8, border: '1px solid #fae8ff' }}><strong style={{ color: '#86198f' }}>Coordinator Remarks:</strong> {appr.coordinator_remarks}</div>}
            {appr?.authority_remarks && !canAuth && <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8, border: '1px solid #bfdbfe' }}><strong style={{ color: '#1d4ed8' }}>Authority Remarks:</strong> {appr.authority_remarks}</div>}

            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 40 }}>
              {canEditOwn && <>
                <button onClick={() => persist('Draft', 'Draft saved')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#64748b' }}>Save Draft</button>
                <button onClick={submitForReview} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#2563eb' }}>Submit to Coordinator</button>
              </>}

              {canCoord && <>
                <div style={{ width: '100%' }}><textarea placeholder="Coordinator remarks / recommendations (required to return)..." value={coordRemarks} onChange={e => setCoordRemarks(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 60 }} /></div>
                <button onClick={() => returnWith('Returned', 'coordinator')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#ef4444' }}>Return to Staff</button>
                <button onClick={() => persist('Coordinator_Reviewed', 'Forwarded to authority')} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#8b5cf6' }}>Forward to Authority</button>
              </>}

              {canAuth && <>
                <div style={{ width: '100%' }}><textarea placeholder="Authority final remarks (required to return)..." value={authRemarks} onChange={e => setAuthRemarks(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 60 }} /></div>
                <button onClick={() => returnWith('Submitted', 'authority')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#ef4444' }}>Return to Coordinator</button>
                <button onClick={async () => { if (await confirm('Final approve and lock this appraisal? The score will be locked.')) persist('Approved', 'Appraisal approved'); }} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#16a34a' }}>Final Approve & Lock</button>
              </>}

              {status === 'Approved' && (
                <div style={{ width: '100%', padding: 16, background: '#dcfce7', color: '#166534', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>
                  ✅ This appraisal has been Final Approved.
                  {userRole === 'admin' && <button onClick={reopen} style={{ ...S.sm('#ef4444'), marginLeft: 12 }}>Reopen</button>}
                </div>
              )}
              {readOnly && status !== 'Approved' && <div style={{ width: '100%', color: '#64748b', fontSize: 14 }}>This appraisal is currently with: <b>{status === 'Submitted' ? 'Coordinator' : status === 'Coordinator_Reviewed' ? 'Appraisal Authority' : 'Staff member'}</b>. You can view it but not edit it.</div>}
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

  useEffect(() => {
    (async () => {
      const [ap, wk] = await Promise.all([
        supabase.from('appraisals').select('staff_id, status, final_score, appraisal_sub_ratings(sub_code, rating, self_rating)').eq('cycle', CYCLE),
        supabase.from('work_items').select('staff_id, kind, status, due_date, month, sub_code, marks, awarded').eq('cycle', CYCLE)
      ]);
      setRaw({ ap: ap.data || [], wk: wk.data || [] });
    })();
  }, []);

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const matrix = useMemo(() => {
    if (!raw) return [];
    return staff.filter(s => dept === 'all' || s.department === dept).map(s => {
      const a = raw.ap.find(x => x.staff_id === s.id) || null;
      const rm = {};
      (a?.appraisal_sub_ratings || []).forEach(r => { const v = r.rating ?? r.self_rating; if (v !== null && v !== undefined) rm[r.sub_code] = v; });
      return { s, a, ...computeScores(rm, workMap(raw.wk.filter(x => x.staff_id === s.id))) };
    });
  }, [raw, staff, dept]);

  const cceRows = useMemo(() => !raw ? [] : staff.filter(s => dept === 'all' || s.department === dept).map(s => {
    const mine = raw.wk.filter(x => x.staff_id === s.id && x.kind === 'cce' && x.month === month);
    const c = (st) => mine.filter(x => x.status === st).length;
    return { s, total: mine.length, done: c('Completed'), sub: c('Submitted'), pend: c('Pending') };
  }).filter(r => r.total > 0), [raw, staff, dept, month]);

  const cell = (r, d) => r.per[d.code].na ? 'N/A' : r.per[d.code].score.toFixed(1);
  const exportMatrix = () => downloadCSV(`Score_Matrix_${CYCLE}.csv`, ['Staff', 'Department', ...domains.map(d => d.code), 'Total', 'Status'],
    matrix.map(r => [r.s.full_name, r.s.department, ...domains.map(d => cell(r, d)), r.total.toFixed(1), r.a ? r.a.status : 'Not started']));
  const exportCce = () => downloadCSV(`CCE_${month}.csv`, ['Staff', 'Department', 'Total', 'Completed', 'Submitted', 'Pending'], cceRows.map(r => [r.s.full_name, r.s.department, r.total, r.done, r.sub, r.pend]));

  async function exportWork() {
    const { data, error } = await supabase.from('work_items').select('*, profiles(full_name)').eq('cycle', CYCLE);
    if (error) return toast(error.message, 'error');
    downloadCSV(`Work_${todayStr()}.csv`, ['Staff', 'Type', 'Title', 'Subject', 'Month', 'Sub-domain', 'Points', 'Awarded', 'Due', 'Status'],
      (data || []).map(r => [r.profiles?.full_name, r.kind, r.title, r.subject_name, r.month, r.sub_code, r.marks, r.awarded, r.due_date, r.status]));
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
                <td style={S.td}>{r.a ? <Badge text={r.a.status} /> : <span style={{ color: '#94a3b8' }}>Not started</span>}</td>
              </tr>
            ))}
          </Table>
        )}
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Live calculation from ratings and approved work. N/A = domain not applicable (excluded, total re-scaled to 100). Final locked scores are on the leaderboard.</div>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>CCE Tracker</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={S.input} />
            <button onClick={exportCce} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
          </div>
        </div>
        {!raw ? <Empty text="Loading..." /> : cceRows.length === 0 ? <Empty text={`No CCE works for ${monthLabel(month)}.`} /> : (
          <Table heads={['Staff', 'Total', 'Completed', 'Submitted', 'Pending', 'Progress']} min={640}>
            {cceRows.map(r => (
              <tr key={r.s.id} style={S.row}>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.s.department}</div></td>
                <td style={S.td}>{r.total}</td><td style={S.td}>{r.done}</td><td style={S.td}>{r.sub}</td>
                <td style={{ ...S.td, color: r.pend ? '#d97706' : 'inherit', fontWeight: r.pend ? 700 : 400 }}>{r.pend}</td>
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