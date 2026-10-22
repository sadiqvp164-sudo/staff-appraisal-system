import React, { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import {
  Award, CalendarDays, CalendarCheck, FileCheck2, GraduationCap, LayoutDashboard, LogOut, Menu, Plus,
  ShieldCheck, Users, X, Download, Settings, Edit, Trash2, Camera, Megaphone, Gift, BarChart3,
  History, Clock, Search, Printer, Pin, Eye, EyeOff
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const CYCLE = '2026-2027';
const LATE_AFTER = '09:15'; // check-in after this time is marked "Late"

const domains = [
  { code: 'D1', name: 'Teaching, Learning & Learner Achievement', weight: 25, color: '#2563eb' },
  { code: 'D2', name: 'Student Mentoring & Wellbeing', weight: 15, color: '#7c3aed' },
  { code: 'D3', name: 'Campus Engagement & Responsibilities', weight: 15, color: '#d97706' },
  { code: 'D4', name: 'Collaboration & Communication', weight: 10, color: '#0d9488' },
  { code: 'D5', name: 'Professional Development & TPD', weight: 10, color: '#db2777' },
  { code: 'D6', name: 'Professionalism & Reliability', weight: 15, color: '#16a34a' },
  { code: 'D7', name: 'Academic Leadership & Governance', weight: 10, color: '#4f46e5' }
];

const ALL = ['admin', 'coordinator', 'teacher', 'appraisal_authority'];
const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ALL },
  { id: 'scores', label: 'Staff Leaderboard', icon: Award, roles: ALL },
  { id: 'staff', label: 'Staff Directory', icon: Users, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL },
  { id: 'leave', label: 'Leave Requests', icon: Clock, roles: ALL },
  { id: 'duties', label: 'Duty & Tasks', icon: CalendarDays, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'evidence', label: 'Evidence Portfolio', icon: FileCheck2, roles: ALL },
  { id: 'bonus', label: 'Bonus Points', icon: Gift, roles: ALL },
  { id: 'appraisal', label: 'Appraisal Workflow', icon: GraduationCap, roles: ALL },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'activity', label: 'Activity Log', icon: History, roles: ['admin'] },
  { id: 'settings', label: 'My Account', icon: Settings, roles: ALL }
];

const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => ymd();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const lastDayOf = (month) => { const [y, m] = month.split('-').map(Number); return String(new Date(y, m, 0).getDate()).padStart(2, '0'); };
const dateRange = (from, to) => {
  const out = []; const d = new Date(from + 'T00:00:00'); const end = new Date(to + 'T00:00:00');
  while (d <= end && out.length < 62) { if (d.getDay() !== 0) out.push(ymd(d)); d.setDate(d.getDate() + 1); }
  return out;
};

function downloadCSV(filename, headers, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function logActivity(profile, action, details = '') {
  try { await supabase.from('activity_log').insert({ actor_id: profile?.id, actor_name: profile?.full_name, action, details }); } catch (e) { /* ignore */ }
}

// Same formula everywhere: manual (rating/5 x weight) + auto marks, capped at weight.
// N/A domains (rating === null) are excluded and the total is scaled to 100.
function computeScores(ratings, auto) {
  const per = {}; let sum = 0, w = 0;
  domains.forEach(d => {
    const r = ratings[d.code] === undefined ? 3 : ratings[d.code];
    if (r === null) { per[d.code] = { na: true, manual: 0, auto: 0, total: 0 }; return; }
    const manual = (r / 5) * d.weight;
    const a = auto[d.code] || 0;
    const total = Math.min(d.weight, manual + a);
    per[d.code] = { na: false, manual, auto: a, total };
    sum += total; w += d.weight;
  });
  return { per, total: w ? Math.min(100, (sum / w) * 100) : 0 };
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
  Pending: 'amber', Submitted: 'blue', Completed: 'green', Verified: 'green', Approved: 'green', Rejected: 'red', Returned: 'red',
  Draft: 'gray', Coordinator_Reviewed: 'purple', Present: 'green', Absent: 'red', Late: 'amber', 'Half Day': 'purple', Leave: 'blue',
  Active: 'green', Inactive: 'red', Overdue: 'red'
};

// ==========================================
// SHARED UI (toasts, confirm/prompt dialogs, small components)
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
        <Modal title={dlg.kind === 'confirm' ? 'Please confirm' : dlg.message} onClose={() => close(dlg.kind === 'confirm' ? false : null)} width={420}>
          {dlg.kind === 'confirm'
            ? <p style={{ margin: '0 0 20px', color: '#334155' }}>{dlg.message}</p>
            : <textarea autoFocus value={text} onChange={e => setText(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 80, marginBottom: 20 }} />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => close(dlg.kind === 'confirm' ? false : null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => close(dlg.kind === 'confirm' ? true : text)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>OK</button>
          </div>
        </Modal>
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
          {profile && page === 'scores' && <AllStaffScoresPage profile={profile} />}
          {profile && page === 'staff' && <StaffDirectoryPage currentUserRole={userRole} profile={profile} />}
          {profile && page === 'attendance' && <AttendancePage userRole={userRole} profile={profile} />}
          {profile && page === 'leave' && <LeavePage userRole={userRole} profile={profile} />}
          {profile && page === 'duties' && <DutyAndTasksPage userRole={userRole} profile={profile} />}
          {profile && page === 'evidence' && <EvidencePortfolioPage userRole={userRole} profile={profile} />}
          {profile && page === 'bonus' && <BonusPointsPage userRole={userRole} profile={profile} />}
          {profile && page === 'appraisal' && <AppraisalWorkflowPage userRole={userRole} profile={profile} />}
          {profile && page === 'reports' && <ReportsPage />}
          {profile && page === 'activity' && <ActivityLogPage />}
          {profile && page === 'settings' && <AccountSettingsPage profile={profile} reloadProfile={() => loadProfile(profile.id)} />}
        </main>
      </div>
    </>
  );
}

// ==========================================
// 1. LOGIN
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
// 2. DASHBOARD (role based)
// ==========================================
function DashboardPage({ userRole, profile, goto }) {
  const isReviewer = userRole !== 'teacher';
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const today = todayStr(); const monthStart = today.slice(0, 8) + '01'; const id = profile.id;
      const own = (q) => isReviewer ? q : q.eq('staff_id', id);
      const [staff, duty, task, ev, ap, leave, att, ann, act] = await Promise.all([
        supabase.from('profiles').select('id, department').eq('active', true),
        own(supabase.from('duty_records').select('status, end_date')),
        own(supabase.from('special_tasks').select('status')),
        own(supabase.from('evidence_files').select('status')),
        own(supabase.from('appraisals').select('staff_id, status, final_score').eq('cycle', CYCLE)),
        own(supabase.from('leave_requests').select('status')),
        own(supabase.from('attendance').select('staff_id, status, date').gte('date', monthStart)),
        supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
        userRole === 'admin' ? supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(6) : Promise.resolve({ data: [] })
      ]);
      setD({ staff: staff.data || [], duty: duty.data || [], task: task.data || [], ev: ev.data || [], ap: ap.data || [], leave: leave.data || [], att: att.data || [], ann: ann.data || [], act: act.data || [] });
    })();
  }, [profile.id, userRole]);

  if (!d) return <Empty text="Loading dashboard..." />;

  const today = todayStr();
  const n = (arr, fn) => arr.filter(fn).length;
  const overdue = n(d.duty, x => x.status !== 'Completed' && x.end_date && x.end_date < today);
  const awaiting = n(d.duty, x => x.status === 'Submitted') + n(d.task, x => x.status === 'Submitted');

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

  // ---------- TEACHER VIEW ----------
  if (!isReviewer) {
    const mine = d.ap[0];
    const present = n(d.att, x => x.status === 'Present' || x.status === 'Late');
    const rejected = n(d.ev, x => x.status === 'Rejected');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {(rejected > 0 || mine?.status === 'Returned') && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 10, fontWeight: 600 }}>
            ⚠ Action needed: {rejected > 0 && `${rejected} evidence file(s) rejected. `}{mine?.status === 'Returned' && 'Your appraisal was returned for edits.'}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
          <StatCard label="My Pending Duties" value={n(d.duty, x => x.status === 'Pending')} color="#d97706" onClick={() => goto('duties')} sub={overdue ? `${overdue} overdue` : undefined} />
          <StatCard label="My Pending Tasks" value={n(d.task, x => x.status === 'Pending')} color="#db2777" onClick={() => goto('duties')} />
          <StatCard label="Evidence Verified" value={`${n(d.ev, x => x.status === 'Verified')}/${d.ev.length}`} color="#16a34a" onClick={() => goto('evidence')} />
          <StatCard label="My Appraisal" value={mine ? mine.status.replaceAll('_', ' ') : 'Not started'} color="#2563eb" sub={mine ? `Score ${Number(mine.final_score || 0).toFixed(1)}` : undefined} onClick={() => goto('appraisal')} />
          <StatCard label="Present Days (This Month)" value={present} color="#0d9488" onClick={() => goto('attendance')} />
          <StatCard label="Pending Leave Requests" value={n(d.leave, x => x.status === 'Pending')} color="#7c3aed" onClick={() => goto('leave')} />
        </div>
        {announcements}
      </div>
    );
  }

  // ---------- REVIEWER VIEW ----------
  const toReview = userRole === 'coordinator' ? n(d.ap, a => a.status === 'Submitted')
    : userRole === 'appraisal_authority' ? n(d.ap, a => a.status === 'Coordinator_Reviewed')
    : n(d.ap, a => a.status === 'Submitted' || a.status === 'Coordinator_Reviewed');
  const evPending = n(d.ev, x => x.status === 'Pending');
  const leavePending = n(d.leave, x => x.status === 'Pending');
  const presentToday = n(d.att, a => a.date === today && (a.status === 'Present' || a.status === 'Late'));
  const markedToday = n(d.att, a => a.date === today);

  const actions = [
    { n: evPending, text: 'evidence files waiting for verification', page: 'evidence' },
    { n: toReview, text: 'appraisals waiting for your review', page: 'appraisal' },
    { n: awaiting, text: 'duties/tasks submitted for approval', page: 'duties' },
    { n: leavePending, text: 'leave requests pending', page: 'leave' },
    { n: overdue, text: 'duties are overdue', page: 'duties' },
    { n: n(d.ev, x => x.status === 'Pending') === 0 && markedToday === 0 && d.staff.length ? 1 : 0, text: "today's attendance is not marked yet", page: 'attendance' }
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
        <StatCard label="Present Today" value={`${presentToday}/${d.staff.length}`} color="#0d9488" onClick={() => goto('attendance')} sub={`${markedToday} marked`} />
        <StatCard label="Pending Duties" value={n(d.duty, x => x.status === 'Pending')} color="#d97706" onClick={() => goto('duties')} sub={overdue ? `${overdue} overdue` : undefined} />
        <StatCard label="Pending Tasks" value={n(d.task, x => x.status === 'Pending')} color="#db2777" onClick={() => goto('duties')} />
        <StatCard label="Awaiting Approval" value={awaiting} color="#7c3aed" onClick={() => goto('duties')} sub="duties + tasks" />
        <StatCard label="Evidence To Review" value={evPending} color="#ea580c" onClick={() => goto('evidence')} />
        <StatCard label="Appraisals To Review" value={toReview} color="#2563eb" onClick={() => goto('appraisal')} />
        <StatCard label="Appraisals Approved" value={n(d.ap, a => a.status === 'Approved')} color="#16a34a" onClick={() => goto('appraisal')} />
        <StatCard label="Leave Requests" value={leavePending} color="#4f46e5" onClick={() => goto('leave')} sub="pending" />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {announcements}
        {userRole === 'admin' && (
          <div style={S.card}>
            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
            {d.act.length === 0 ? <Empty text="No activity logged." /> : d.act.map(a => (
              <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <b>{a.actor_name}</b> — {a.action} <span style={{ color: '#64748b' }}>{a.details}</span>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
            <button onClick={() => goto('activity')} style={{ ...S.sm('#2563eb'), marginTop: 12 }}>Full log</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. ANNOUNCEMENTS
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
    toast('Announcement posted'); logActivity(profile, 'Posted announcement', form.title); setForm(null); load();
  };
  const togglePin = async (a) => { const { error } = await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id); if (error) toast(error.message, 'error'); else load(); };
  const remove = async (a) => {
    if (!(await confirm(`Delete "${a.title}"?`))) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) return toast(error.message, 'error');
    toast('Deleted'); logActivity(profile, 'Deleted announcement', a.title); load();
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
// 4. STAFF LEADERBOARD
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

function AllStaffScoresPage({ profile }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');

  useEffect(() => {
    async function fetchScores() {
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
    }
    fetchScores();
  }, []);

  const depts = [...new Set(data.map(s => s.department).filter(Boolean))].sort();
  const filtered = data.filter(s => (dept === 'all' || s.department === dept) && s.full_name.toLowerCase().includes(q.toLowerCase()));
  const filtering = q || dept !== 'all';
  const top3 = filtering ? [] : filtered.slice(0, 3);
  const rest = filtering ? filtered : filtered.slice(3);

  function exportCSV() {
    if (!data.length) return;
    downloadCSV(`Staff_Leaderboard_${CYCLE}.csv`, ['Rank', 'Staff Name', 'Department', 'Official Appraisal (Max 100)', 'Bonus Points'], filtered.map(r => [r.rank, r.full_name, r.department || '-', r.officialScore.toFixed(2), r.bonus]));
  }

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
// 5. STAFF DIRECTORY
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
    toast('✅ Staff created!'); logActivity(profile, 'Created staff', formData.full_name);
    setAddOpen(false); setFormData(emptyForm); fetchStaff();
  }

  async function saveEdit(e) {
    e.preventDefault();
    const payload = { full_name: edit.full_name.trim(), staff_code: edit.staff_code || null, department: edit.department || null, designation: edit.designation || null };
    if (isAdmin) payload.role = edit.role;
    const { error } = await supabase.from('profiles').update(payload).eq('id', edit.id);
    if (error) return toast(error.message, 'error');
    toast('Staff updated'); logActivity(profile, 'Edited staff', edit.full_name); setEdit(null); fetchStaff();
  }

  async function updateRole(s, newRole) {
    if (!isAdmin) return toast('Only admins can change roles.', 'error');
    if (s.id === profile.id && newRole !== 'admin' && !(await confirm('You are removing your own admin access. Continue?'))) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', s.id);
    if (error) toast(error.message, 'error'); else { logActivity(profile, 'Changed role', `${s.full_name} → ${newRole}`); fetchStaff(); }
  }

  async function toggleActive(s) {
    if (s.id === profile.id) return toast("You can't deactivate your own account.", 'error');
    const next = s.active === false;
    if (!(await confirm(`${next ? 'Activate' : 'Deactivate'} ${s.full_name}?`))) return;
    const { error } = await supabase.from('profiles').update({ active: next }).eq('id', s.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, next ? 'Activated staff' : 'Deactivated staff', s.full_name); fetchStaff();
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
        <select value={roleF} onChange={e => setRoleF(e.target.value)} style={S.input}>
          <option value="all">All roles</option><option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option><option value="admin">Admin</option>
        </select>
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
            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={S.input}>
              <option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option>
            </select>
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
            {isAdmin && (
              <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })} style={S.input}>
                <option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option><option value="admin">Admin</option>
              </select>
            )}
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
                  <select value={s.role} onChange={e => updateRole(s, e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                    <option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option><option value="admin">Admin</option>
                  </select>
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
      const monthStart = todayStr().slice(0, 8) + '01';
      const id = s.id;
      const [ap, pts, ev, du, ta, att, lv] = await Promise.all([
        supabase.from('appraisals').select('status, final_score').eq('staff_id', id).eq('cycle', CYCLE).maybeSingle(),
        supabase.from('special_point_entries').select('points_approved').eq('staff_id', id).eq('status', 'Approved'),
        supabase.from('evidence_files').select('status').eq('staff_id', id),
        supabase.from('duty_records').select('status').eq('staff_id', id),
        supabase.from('special_tasks').select('status').eq('staff_id', id),
        supabase.from('attendance').select('status').eq('staff_id', id).gte('date', monthStart),
        supabase.from('leave_requests').select('status').eq('staff_id', id)
      ]);
      setD({ ap: ap.data, bonus: (pts.data || []).reduce((a, b) => a + Number(b.points_approved || 0), 0), ev: ev.data || [], du: du.data || [], ta: ta.data || [], att: att.data || [], lv: lv.data || [] });
    })();
  }, [s.id]);
  const n = (a, st) => a.filter(x => x.status === st).length;
  const rows = d ? [
    ['Appraisal', d.ap ? `${d.ap.status.replaceAll('_', ' ')} (${Number(d.ap.final_score || 0).toFixed(1)})` : 'Not started'],
    ['Bonus points', d.bonus],
    ['Evidence', `${n(d.ev, 'Verified')} verified / ${n(d.ev, 'Pending')} pending / ${n(d.ev, 'Rejected')} rejected`],
    ['Duties', `${n(d.du, 'Completed')} completed / ${d.du.length - n(d.du, 'Completed')} open`],
    ['Special tasks', `${n(d.ta, 'Completed')} completed / ${d.ta.length - n(d.ta, 'Completed')} open`],
    ['Attendance (this month)', `${n(d.att, 'Present')} present, ${n(d.att, 'Late')} late, ${n(d.att, 'Absent')} absent, ${n(d.att, 'Leave')} leave`],
    ['Leave requests', `${n(d.lv, 'Approved')} approved / ${n(d.lv, 'Pending')} pending`]
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
// 6. ATTENDANCE
// ==========================================
const ATT = ['Present', 'Absent', 'Late', 'Half Day', 'Leave'];

function AttendancePage({ userRole, profile }) {
  const canMark = userRole === 'admin' || userRole === 'coordinator';
  const isTeacher = userRole === 'teacher';
  const [tab, setTab] = useState(isTeacher ? 'my' : 'daily');
  const tabs = [['my', 'My Attendance'], ...(!isTeacher ? [['daily', 'Daily Register'], ['summary', 'Monthly Summary']] : [])];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: tab === id ? '#2563eb' : '#fff', color: tab === id ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>)}
      </div>
      {tab === 'my' && <MyAttendance profile={profile} />}
      {tab === 'daily' && <AttendanceDaily canMark={canMark} profile={profile} />}
      {tab === 'summary' && <AttendanceSummary />}
    </div>
  );
}

function MyAttendance({ profile }) {
  const { toast } = useUI();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [rows, setRows] = useState([]);
  const load = async () => {
    const { data } = await supabase.from('attendance').select('*').eq('staff_id', profile.id).gte('date', `${month}-01`).lte('date', `${month}-${lastDayOf(month)}`).order('date', { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, [month]);

  const isCurrent = month === todayStr().slice(0, 7);
  const today = rows.find(r => r.date === todayStr());
  const count = (s) => rows.filter(r => r.status === s).length;

  async function checkIn() {
    const now = new Date(); const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { error } = await supabase.from('attendance').insert({ staff_id: profile.id, date: todayStr(), status: t > LATE_AFTER ? 'Late' : 'Present', check_in: t, marked_by: profile.id });
    if (error) return toast(error.message, 'error');
    toast(`Checked in at ${t}`); load();
  }

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Today: {fmtDate(todayStr())}</h3>
          {isCurrent && (today ? <div style={{ marginTop: 8 }}><Badge text={today.status} /> {today.check_in && <span style={{ fontSize: 13, color: '#64748b' }}>at {today.check_in}</span>}</div>
            : <button onClick={checkIn} style={{ ...S.btn('#16a34a'), marginTop: 8 }}><CalendarCheck size={16} /> Check In Now</button>)}
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={S.input} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {ATT.map(s => <div key={s} style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text={s} /> <b style={{ marginLeft: 6 }}>{count(s)}</b></div>)}
      </div>
      {rows.length === 0 ? <Empty text="No attendance records this month." /> : (
        <Table heads={['Date', 'Status', 'Check-in', 'Remarks']} min={400}>
          {rows.map(r => <tr key={r.id} style={S.row}><td style={S.td}>{fmtDate(r.date)}</td><td style={S.td}><Badge text={r.status} /></td><td style={S.td}>{r.check_in || '-'}</td><td style={S.td}>{r.remarks || '-'}</td></tr>)}
        </Table>
      )}
    </div>
  );
}

function AttendanceDaily({ canMark, profile }) {
  const { toast } = useUI();
  const [date, setDate] = useState(todayStr());
  const [staff, setStaff] = useState([]);
  const [recs, setRecs] = useState({});
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: st }, { data: at }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department, avatar_url').eq('active', true).order('full_name'),
      supabase.from('attendance').select('*').eq('date', date)
    ]);
    setStaff(st || []);
    setRecs(Object.fromEntries((at || []).map(a => [a.staff_id, { status: a.status, remarks: a.remarks || '' }])));
    setDirty({});
  };
  useEffect(() => { load(); }, [date]);

  const setRec = (id, patch) => { setRecs(p => ({ ...p, [id]: { ...p[id], ...patch } })); setDirty(p => ({ ...p, [id]: true })); };
  const markAllPresent = () => staff.forEach(s => { if (!recs[s.id]?.status) setRec(s.id, { status: 'Present' }); });

  async function save() {
    const rows = Object.keys(dirty).filter(id => recs[id]?.status).map(id => ({ staff_id: id, date, status: recs[id].status, remarks: recs[id].remarks || null, marked_by: profile.id }));
    if (!rows.length) return toast('Nothing to save', 'error');
    setSaving(true);
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'staff_id,date' });
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast(`Saved ${rows.length} record(s)`); logActivity(profile, 'Marked attendance', `${date} (${rows.length})`); load();
  }

  const count = (s) => staff.filter(x => recs[x.id]?.status === s).length;

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} style={S.input} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ATT.map(s => <span key={s} style={{ fontSize: 13 }}><Badge text={s} /> <b>{count(s)}</b></span>)}
          <span style={{ fontSize: 13, color: '#64748b' }}>Unmarked <b>{staff.length - staff.filter(x => recs[x.id]?.status).length}</b></span>
        </div>
        {canMark && <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={markAllPresent} style={S.btn('#64748b')}>Mark unmarked as Present</button>
          <button onClick={save} disabled={saving} style={S.btn('#16a34a')}>{saving ? 'Saving...' : 'Save'}</button>
        </div>}
      </div>
      <Table heads={['Staff', 'Status', 'Remarks']} min={640}>
        {staff.map(s => {
          const r = recs[s.id] || {};
          return (
            <tr key={s.id} style={S.row}>
              <td style={S.td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar url={s.avatar_url} name={s.full_name} size={32} /><div><div style={{ fontWeight: 500 }}>{s.full_name}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{s.department || ''}</div></div></div></td>
              <td style={S.td}>
                {canMark ? (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ATT.map(a => { const on = r.status === a; const [bg, fg] = TONES[STATUS_TONE[a]]; return <button key={a} onClick={() => setRec(s.id, { status: a })} style={{ padding: '5px 9px', borderRadius: 6, border: on ? `2px solid ${fg}` : '1px solid #cbd5e1', background: on ? bg : '#fff', color: on ? fg : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{a}</button>; })}
                  </div>
                ) : (r.status ? <Badge text={r.status} /> : <span style={{ color: '#94a3b8' }}>Not marked</span>)}
              </td>
              <td style={S.td}>{canMark ? <input value={r.remarks || ''} onChange={e => setRec(s.id, { remarks: e.target.value })} placeholder="Remarks" style={{ ...S.input, width: '100%', padding: 6 }} /> : (r.remarks || '-')}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function AttendanceSummary() {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [staff, setStaff] = useState([]);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const [{ data: st }, { data: at }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, department').eq('active', true).order('full_name'),
        supabase.from('attendance').select('staff_id, status').gte('date', `${month}-01`).lte('date', `${month}-${lastDayOf(month)}`)
      ]);
      setStaff(st || []); setRows(at || []);
    })();
  }, [month]);

  const data = staff.map(s => {
    const mine = rows.filter(r => r.staff_id === s.id);
    const c = (st) => mine.filter(r => r.status === st).length;
    const denom = mine.length - c('Leave');
    const pct = denom > 0 ? ((c('Present') + c('Late') + c('Half Day') * 0.5) / denom) * 100 : null;
    return { ...s, present: c('Present'), late: c('Late'), half: c('Half Day'), leave: c('Leave'), absent: c('Absent'), pct };
  });
  const exportIt = () => downloadCSV(`Attendance_${month}.csv`, ['Staff', 'Department', 'Present', 'Late', 'Half Day', 'Leave', 'Absent', 'Attendance %'], data.map(r => [r.full_name, r.department, r.present, r.late, r.half, r.leave, r.absent, r.pct === null ? '' : r.pct.toFixed(1)]));

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={S.input} />
        <button onClick={exportIt} style={S.btn('#16a34a')}><Download size={16} /> Export CSV</button>
      </div>
      <Table heads={['Staff', 'Present', 'Late', 'Half Day', 'Leave', 'Absent', 'Attendance %']} min={700}>
        {data.map(r => (
          <tr key={r.id} style={S.row}>
            <td style={{ ...S.td, fontWeight: 500 }}>{r.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</div></td>
            <td style={S.td}>{r.present}</td><td style={S.td}>{r.late}</td><td style={S.td}>{r.half}</td><td style={S.td}>{r.leave}</td>
            <td style={{ ...S.td, color: r.absent > 0 ? '#ef4444' : 'inherit', fontWeight: r.absent > 0 ? 700 : 400 }}>{r.absent}</td>
            <td style={{ ...S.td, fontWeight: 700, color: r.pct === null ? '#94a3b8' : r.pct < 75 ? '#ef4444' : '#16a34a' }}>{r.pct === null ? '-' : `${r.pct.toFixed(1)}%`}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

// ==========================================
// 7. LEAVE REQUESTS
// ==========================================
function LeavePage({ userRole, profile }) {
  const reviewer = ['admin', 'coordinator', 'appraisal_authority'].includes(userRole);
  const { toast, confirm, ask } = useUI();
  const { map } = useStaff(false);
  const [tab, setTab] = useState('mine');
  const [rows, setRows] = useState([]);
  const [statusF, setStatusF] = useState('Pending');
  const [form, setForm] = useState(null);

  const load = async () => {
    let q = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (tab === 'mine') q = q.eq('staff_id', profile.id);
    const { data, error } = await q;
    if (error) toast(error.message, 'error');
    setRows(data || []);
  };
  useEffect(() => { load(); }, [tab]);

  async function submit(e) {
    e.preventDefault();
    if (form.to_date < form.from_date) return toast('End date is before start date.', 'error');
    const { error } = await supabase.from('leave_requests').insert({ staff_id: profile.id, leave_type: form.leave_type, from_date: form.from_date, to_date: form.to_date, reason: form.reason, status: 'Pending' });
    if (error) return toast(error.message, 'error');
    toast('Leave request submitted'); logActivity(profile, 'Applied leave', `${form.from_date} → ${form.to_date}`); setForm(null); load();
  }

  async function cancel(r) {
    if (!(await confirm('Cancel this leave request?'))) return;
    const { error } = await supabase.from('leave_requests').delete().eq('id', r.id);
    if (error) toast(error.message, 'error'); else { toast('Cancelled'); load(); }
  }

  async function decide(r, status) {
    let remarks = null;
    if (status === 'Rejected') { remarks = await ask('Reason for rejection'); if (!remarks) return; }
    else if (!(await confirm('Approve this leave? Attendance will be marked as "Leave" for these days (Sundays skipped).'))) return;
    const { error } = await supabase.from('leave_requests').update({ status, reviewer_remarks: remarks, reviewed_by: profile.id }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    if (status === 'Approved') {
      const att = dateRange(r.from_date, r.to_date).map(date => ({ staff_id: r.staff_id, date, status: 'Leave', remarks: `${r.leave_type} leave`, marked_by: profile.id }));
      if (att.length) await supabase.from('attendance').upsert(att, { onConflict: 'staff_id,date' });
    }
    toast(`Leave ${status.toLowerCase()}`); logActivity(profile, `Leave ${status.toLowerCase()}`, `${map[r.staff_id]?.full_name || ''} ${r.from_date} → ${r.to_date}`); load();
  }

  const shown = rows.filter(r => tab === 'mine' || statusF === 'all' || r.status === statusF);
  const days = (r) => dateRange(r.from_date, r.to_date).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setTab('mine')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: tab === 'mine' ? '#2563eb' : '#fff', color: tab === 'mine' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>My Leave</button>
        {reviewer && <button onClick={() => setTab('review')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: tab === 'review' ? '#2563eb' : '#fff', color: tab === 'review' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Review Requests</button>}
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'review' && <select value={statusF} onChange={e => setStatusF(e.target.value)} style={S.input}><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="all">All</option></select>}
          {tab === 'mine' && <button onClick={() => setForm({ leave_type: 'Casual', from_date: todayStr(), to_date: todayStr(), reason: '' })} style={S.btn('#2563eb')}><Plus size={16} /> Apply for Leave</button>}
        </div>
      </div>

      {form && (
        <Modal title="Apply for Leave" onClose={() => setForm(null)}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} style={S.input}>
              {['Casual', 'Sick', 'Earned', 'Duty', 'Other'].map(t => <option key={t}>{t}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, fontSize: 13 }}>From<input type="date" required value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
              <label style={{ flex: 1, fontSize: 13 }}>To<input type="date" required value={form.to_date} min={form.from_date} onChange={e => setForm({ ...form, to_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
            </div>
            <textarea required placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ ...S.input, minHeight: 80 }} />
            <button type="submit" style={S.btn('#2563eb', { justifyContent: 'center' })}>Submit request</button>
          </form>
        </Modal>
      )}

      <div style={S.card}>
        {shown.length === 0 ? <Empty text="No leave requests." /> : (
          <Table heads={[...(tab === 'review' ? ['Staff'] : []), 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Action']} min={760}>
            {shown.map(r => (
              <tr key={r.id} style={S.row}>
                {tab === 'review' && <td style={{ ...S.td, fontWeight: 500 }}>{map[r.staff_id]?.full_name || '-'}</td>}
                <td style={S.td}>{r.leave_type}</td>
                <td style={S.td}>{fmtDate(r.from_date)} – {fmtDate(r.to_date)}</td>
                <td style={S.td}>{days(r)}</td>
                <td style={{ ...S.td, maxWidth: 220 }}>{r.reason}</td>
                <td style={S.td}><Badge text={r.status} />{r.reviewer_remarks && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{r.reviewer_remarks}</div>}</td>
                <td style={S.td}>
                  {tab === 'mine' && r.status === 'Pending' && <button onClick={() => cancel(r)} style={S.sm('#ef4444')}>Cancel</button>}
                  {tab === 'review' && r.status === 'Pending' && r.staff_id !== profile.id && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => decide(r, 'Approved')} style={S.sm('#16a34a')}>Approve</button>
                      <button onClick={() => decide(r, 'Rejected')} style={S.sm('#ef4444')}>Reject</button>
                    </div>
                  )}
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
// 8. DUTIES & TASKS
// ==========================================
function DutyAndTasksPage({ userRole, profile }) {
  const [tab, setTab] = useState('duty');
  const { list: staffList } = useStaff();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        {[['duty', 'Duties & Monitoring'], ['task', 'Special Tasks']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: tab === id ? '#2563eb' : '#fff', color: tab === id ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>
        ))}
      </div>
      <WorkTable key={tab} kind={tab} userRole={userRole} profile={profile} staffList={staffList} />
    </div>
  );
}

function WorkTable({ kind, userRole, profile, staffList }) {
  const table = kind === 'duty' ? 'duty_records' : 'special_tasks';
  const label = kind === 'duty' ? 'Duty' : 'Task';
  const canManage = userRole === 'admin' || userRole === 'coordinator';
  const { toast, confirm, ask } = useUI();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [sf, setSf] = useState('all');
  const [form, setForm] = useState(null);
  const today = todayStr();

  const load = async () => {
    let query = supabase.from(table).select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (userRole === 'teacher') query = query.eq('staff_id', profile.id);
    const { data, error } = await query;
    if (error) toast(error.message, 'error');
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const dom = domains.find(d => d.code === form.domain_code);
    const marks = Number(form.marks);
    if (marks < 0 || marks > dom.weight) return toast(`Marks must be between 0 and ${dom.weight} for ${dom.code}.`, 'error');
    const payload = { title: form.title.trim(), staff_id: form.staff_id, domain_code: form.domain_code, marks };
    if (form.end_date) payload.end_date = form.end_date;
    if (form.description) payload.description = form.description;
    const res = form.id ? await supabase.from(table).update(payload).eq('id', form.id) : await supabase.from(table).insert({ ...payload, status: 'Pending' });
    if (res.error) return toast(res.error.message, 'error');
    toast(`${label} ${form.id ? 'updated' : 'assigned'}`); logActivity(profile, `${form.id ? 'Edited' : 'Assigned'} ${label.toLowerCase()}`, form.title);
    setForm(null); load();
  }

  async function setStatus(r, status, extra = {}) {
    const { error } = await supabase.from(table).update({ status, ...extra }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, `${label} ${status}`, r.title); load();
  }
  async function returnBack(r) {
    const remarks = await ask('Remarks for returning this to the staff member');
    if (!remarks) return;
    setStatus(r, 'Pending', { review_remarks: remarks });
  }
  async function remove(r) {
    if (!(await confirm(`Delete "${r.title}"?`))) return;
    const { error } = await supabase.from(table).delete().eq('id', r.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, `Deleted ${label.toLowerCase()}`, r.title); load();
  }

  const isOverdue = (r) => r.status !== 'Completed' && r.end_date && r.end_date < today;
  const shown = rows.filter(r => (st === 'all' || r.status === st) && (sf === 'all' || r.staff_id === sf) && `${r.title} ${r.profiles?.full_name || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>{label === 'Duty' ? 'Duty Records' : 'Special Tasks'} ({shown.length})</h3>
        {canManage && <button onClick={() => setForm({ title: '', staff_id: '', end_date: '', domain_code: kind === 'duty' ? 'D3' : 'D7', marks: 5, description: '' })} style={S.btn('#2563eb')}><Plus size={16} /> {kind === 'duty' ? 'Assign Duty' : 'Create Task'}</button>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search title or staff..." />
        <select value={st} onChange={e => setSt(e.target.value)} style={S.input}><option value="all">All status</option><option>Pending</option><option>Submitted</option><option>Completed</option></select>
        {canManage && <select value={sf} onChange={e => setSf(e.target.value)} style={S.input}><option value="all">All staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
      </div>

      {form && (
        <Modal title={`${form.id ? 'Edit' : 'New'} ${label}`} onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder={`${label} title`} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={S.input} />
            <textarea placeholder="Description (optional)" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...S.input, minHeight: 60 }} />
            <select value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} required style={S.input}>
              <option value="">Select Staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <select value={form.domain_code} onChange={e => setForm({ ...form, domain_code: e.target.value })} style={{ ...S.input, flex: 1 }}>{domains.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>
              <input type="number" step="0.5" min="0" placeholder="Marks" value={form.marks} onChange={e => setForm({ ...form, marks: e.target.value })} required style={{ ...S.input, width: 90 }} />
            </div>
            <label style={{ fontSize: 13 }}>Due date (optional)<input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} style={{ ...S.input, width: '100%' }} /></label>
            <button type="submit" style={S.btn('#16a34a', { justifyContent: 'center' })}>Save</button>
          </form>
        </Modal>
      )}

      {loading ? <Empty text="Loading..." /> : shown.length === 0 ? <Empty text={`No ${label.toLowerCase()}s found.`} /> : (
        <Table heads={['Staff', 'Title', 'Domain', 'Due', 'Status', 'Action']} min={820}>
          {shown.map(r => (
            <tr key={r.id} style={S.row}>
              <td style={S.td}>{r.profiles?.full_name}</td>
              <td style={S.td}>{r.title}{r.description && <div style={{ fontSize: 12, color: '#64748b' }}>{r.description}</div>}{r.review_remarks && r.status === 'Pending' && <div style={{ fontSize: 11, color: '#ef4444' }}>Returned: {r.review_remarks}</div>}</td>
              <td style={S.td}>{r.domain_code} (+{r.marks})</td>
              <td style={S.td}>{r.end_date ? fmtDate(r.end_date) : '-'}{isOverdue(r) && <div><Badge text="Overdue" /></div>}</td>
              <td style={S.td}><Badge text={r.status} /></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {r.status === 'Pending' && !canManage && r.staff_id === profile.id && <button onClick={() => setStatus(r, 'Submitted')} style={S.sm('#2563eb')}>Submit as Done</button>}
                  {canManage && r.status === 'Pending' && <button onClick={() => setStatus(r, 'Completed')} style={S.sm('#2563eb')}>Mark Done</button>}
                  {canManage && r.status === 'Submitted' && <>
                    <button onClick={() => setStatus(r, 'Completed', { review_remarks: null })} style={S.sm('#16a34a')}>Approve</button>
                    <button onClick={() => returnBack(r)} style={S.sm('#ef4444')}>Return</button>
                  </>}
                  {canManage && <button title="Edit" onClick={() => setForm({ ...r, end_date: r.end_date || '' })} style={S.icon()}><Edit size={14} /></button>}
                  {canManage && <button title="Delete" onClick={() => remove(r)} style={S.icon('#ef4444')}><Trash2 size={14} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// ==========================================
// 9. EVIDENCE PORTFOLIO
// ==========================================
function EvidencePortfolioPage({ userRole, profile }) {
  const { toast, confirm, ask } = useUI();
  const { list: staffList } = useStaff();
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', domain_code: 'D1' });
  const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [dom, setDom] = useState('all'); const [sf, setSf] = useState('all');
  const fileRef = useRef(null);
  const isReviewer = userRole === 'admin' || userRole === 'coordinator' || userRole === 'appraisal_authority';

  useEffect(() => { fetchEvidence(); }, []);

  async function fetchEvidence() {
    let query = supabase.from('evidence_files').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (!isReviewer) query = query.eq('staff_id', profile.id);
    const { data, error } = await query;
    if (error) toast(error.message, 'error');
    setEvidence(data || []);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !form.title) return toast('Fill all fields', 'error');
    if (file.size > 10 * 1024 * 1024) return toast('File is larger than 10 MB.', 'error');
    setUploading(true);
    const filePath = `${profile.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('evidence').upload(filePath, file);
    if (upErr) { toast(upErr.message, 'error'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(filePath);
    const { error: dbErr } = await supabase.from('evidence_files').insert({ staff_id: profile.id, domain_code: form.domain_code, title: form.title.trim(), file_url: urlData.publicUrl, status: 'Pending' });
    setUploading(false);
    if (dbErr) return toast(dbErr.message, 'error');
    toast('✅ Evidence uploaded! Waiting for review.'); logActivity(profile, 'Uploaded evidence', form.title);
    setForm({ title: '', domain_code: 'D1' }); setFile(null); if (fileRef.current) fileRef.current.value = ''; fetchEvidence();
  }

  async function handleReview(ev, newStatus) {
    const remarks = await ask(newStatus === 'Rejected' ? 'Reason for rejection (required)' : 'Remarks (optional)');
    if (remarks === null) return;
    if (newStatus === 'Rejected' && !remarks.trim()) return toast('Please give a reason.', 'error');
    const { error } = await supabase.from('evidence_files').update({ status: newStatus, reviewer_remarks: remarks.trim() || null }).eq('id', ev.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, `Evidence ${newStatus}`, `${ev.profiles?.full_name}: ${ev.title}`); fetchEvidence();
  }

  async function handleDelete(ev) {
    if (!(await confirm(`Delete "${ev.title}"?`))) return;
    const path = ev.file_url?.split('/evidence/')[1];
    if (path) await supabase.storage.from('evidence').remove([decodeURIComponent(path)]);
    const { error } = await supabase.from('evidence_files').delete().eq('id', ev.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, 'Deleted evidence', ev.title); fetchEvidence();
  }

  const shown = evidence.filter(ev => (st === 'all' || ev.status === st) && (dom === 'all' || ev.domain_code === dom) && (sf === 'all' || ev.staff_id === sf) && `${ev.title} ${ev.profiles?.full_name || ''}`.toLowerCase().includes(q.toLowerCase()));
  const cnt = (s) => evidence.filter(e => e.status === s).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={S.card}>
        <h3 style={{ marginTop: 0 }}>Upload New Evidence</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap', marginTop: 15 }}>
          <input placeholder="Evidence Title (e.g., Lesson Plan)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ ...S.input, flex: '1 1 200px' }} />
          <select value={form.domain_code} onChange={e => setForm({ ...form, domain_code: e.target.value })} style={S.input}>{domains.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>
          <input type="file" ref={fileRef} onChange={e => setFile(e.target.files[0])} required style={{ ...S.input, padding: 8 }} />
          <button type="submit" disabled={uploading} style={S.btn('#2563eb', { padding: '10px 20px' })}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </form>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Each verified item adds 2 marks to its domain (capped at the domain weight). Max file size 10 MB.</div>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {['Pending', 'Verified', 'Rejected'].map(s => <div key={s} style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}><Badge text={s} /> <b style={{ marginLeft: 6 }}>{cnt(s)}</b></div>)}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search title or staff..." />
          <select value={st} onChange={e => setSt(e.target.value)} style={S.input}><option value="all">All status</option><option>Pending</option><option>Verified</option><option>Rejected</option></select>
          <select value={dom} onChange={e => setDom(e.target.value)} style={S.input}><option value="all">All domains</option>{domains.map(d => <option key={d.code}>{d.code}</option>)}</select>
          {isReviewer && <select value={sf} onChange={e => setSf(e.target.value)} style={S.input}><option value="all">All staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
        </div>

        {shown.length === 0 ? <Empty text="No evidence found." /> : (
          <Table heads={['Staff', 'Title', 'Domain', 'Uploaded', 'Status', 'Action']} min={780}>
            {shown.map(ev => {
              const mine = ev.staff_id === profile.id;
              const canReview = isReviewer && (!mine || userRole === 'admin');
              const canDelete = userRole === 'admin' || (mine && ev.status !== 'Verified');
              return (
                <tr key={ev.id} style={S.row}>
                  <td style={S.td}>{ev.profiles?.full_name}</td>
                  <td style={S.td}><a href={ev.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{ev.title}</a></td>
                  <td style={S.td}>{ev.domain_code}</td>
                  <td style={S.td}>{fmtDate(ev.created_at)}</td>
                  <td style={S.td}><Badge text={ev.status} />{ev.reviewer_remarks && <div style={{ fontSize: 11, color: ev.status === 'Rejected' ? '#ef4444' : '#64748b', marginTop: 4 }}>Remarks: {ev.reviewer_remarks}</div>}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {canReview && ev.status === 'Pending' && <>
                        <button onClick={() => handleReview(ev, 'Verified')} style={S.sm('#16a34a')}>Verify</button>
                        <button onClick={() => handleReview(ev, 'Rejected')} style={S.sm('#ef4444')}>Reject</button>
                      </>}
                      {canDelete && <button title="Delete" onClick={() => handleDelete(ev)} style={S.icon('#ef4444')}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 10. BONUS POINTS
// ==========================================
function BonusPointsPage({ userRole, profile }) {
  const reviewer = userRole !== 'teacher';
  const { toast, confirm, ask } = useUI();
  const { list: staffList, map } = useStaff(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [mode, setMode] = useState('request'); // request | award
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
    toast(mode === 'award' ? 'Bonus points awarded' : 'Request submitted');
    logActivity(profile, mode === 'award' ? 'Awarded bonus' : 'Requested bonus', `${form.title} (${pts})`); setForm(null); load();
  }

  async function approve(r) {
    const v = await ask(`Points to award (requested: ${r.points_requested || 0})`, String(r.points_requested || ''));
    if (v === null) return;
    const pts = Number(v);
    if (!(pts >= 0)) return toast('Invalid points.', 'error');
    const { error } = await supabase.from('special_point_entries').update({ status: 'Approved', points_approved: pts }).eq('id', r.id);
    if (error) return toast(error.message, 'error');
    logActivity(profile, 'Approved bonus', `${map[r.staff_id]?.full_name}: ${pts}`); load();
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
// 11. APPRAISAL WORKFLOW (Teacher -> Coordinator -> Authority)
// ==========================================
function AppraisalWorkflowPage({ userRole, profile }) {
  const { toast, ask, confirm } = useUI();
  const { list: staffAll } = useStaff();
  const isTeacher = userRole === 'teacher';
  const [tab, setTab] = useState('form');
  const [selectedStaff, setSelectedStaff] = useState(isTeacher ? profile?.id : '');
  const [appraisalData, setAppraisalData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [status, setStatus] = useState('Draft');
  const [saving, setSaving] = useState(false);
  const [coordinatorRemarks, setCoordinatorRemarks] = useState('');
  const [authorityRemarks, setAuthorityRemarks] = useState('');
  const [autoMarks, setAutoMarks] = useState({});
  const [overview, setOverview] = useState([]);

  const staffList = isTeacher ? [{ id: profile.id, full_name: profile.full_name }] : staffAll;
  const isSelf = selectedStaff === profile.id;

  // Who can do what (nobody reviews their own appraisal, except admin)
  const canEditOwn = isSelf && ['Draft', 'Returned'].includes(status);
  const canCoord = status === 'Submitted' && ((userRole === 'coordinator' && !isSelf) || userRole === 'admin');
  const canAuth = status === 'Coordinator_Reviewed' && ((userRole === 'appraisal_authority' && !isSelf) || userRole === 'admin');
  const isReadOnly = !(canEditOwn || canCoord || canAuth);

  useEffect(() => {
    if (!selectedStaff) return;
    supabase.from('appraisals').select('*, appraisal_ratings(domain_code, rating, comments)').eq('staff_id', selectedStaff).eq('cycle', CYCLE).maybeSingle().then(({ data }) => {
      if (data) {
        setAppraisalData(data); setStatus(data.status || 'Draft');
        setCoordinatorRemarks(data.coordinator_remarks || ''); setAuthorityRemarks(data.authority_remarks || '');
        const rMap = {}, cMap = {};
        (data.appraisal_ratings || []).forEach(r => { rMap[r.domain_code] = r.rating; cMap[r.domain_code] = r.comments; });
        setRatings(rMap); setComments(cMap);
      } else {
        setAppraisalData(null); setStatus('Draft'); setRatings({}); setComments({}); setCoordinatorRemarks(''); setAuthorityRemarks('');
      }
    });
  }, [selectedStaff]);

  useEffect(() => {
    if (!selectedStaff) return;
    Promise.all([
      supabase.from('evidence_files').select('domain_code').eq('staff_id', selectedStaff).eq('status', 'Verified'),
      supabase.from('duty_records').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed'),
      supabase.from('special_tasks').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed')
    ]).then(([evRes, dutyRes, taskRes]) => {
      const m = {};
      (evRes.data || []).forEach(i => { if (i.domain_code) m[i.domain_code] = (m[i.domain_code] || 0) + 2; });
      [...(dutyRes.data || []), ...(taskRes.data || [])].forEach(i => { if (i.domain_code && i.marks) m[i.domain_code] = (m[i.domain_code] || 0) + Number(i.marks); });
      setAutoMarks(m);
    });
  }, [selectedStaff, status]);

  useEffect(() => {
    if (tab !== 'overview') return;
    supabase.from('appraisals').select('staff_id, status, final_score').eq('cycle', CYCLE).then(({ data }) => setOverview(data || []));
  }, [tab]);

  const { per, total: totalScore } = computeScores(ratings, autoMarks);
  const ratingOf = (code) => ratings[code] === undefined ? 3 : ratings[code];
  const staffName = staffList.find(s => s.id === selectedStaff)?.full_name || '';

  async function saveProgress(newStatus, successMsg = 'Saved successfully') {
    if (!selectedStaff) return toast('Select staff first', 'error');
    setSaving(true);
    try {
      const payload = {
        staff_id: selectedStaff, cycle: CYCLE, final_score: Number(totalScore.toFixed(2)), status: newStatus,
        coordinator_remarks: canCoord ? coordinatorRemarks : (appraisalData?.coordinator_remarks || null),
        authority_remarks: canAuth ? authorityRemarks : (appraisalData?.authority_remarks || null)
      };
      const { data: appr, error: apprErr } = await supabase.from('appraisals').upsert(payload, { onConflict: 'staff_id,cycle' }).select().single();
      if (apprErr) throw apprErr;
      const rows = domains.map(d => ({ appraisal_id: appr.id, domain_code: d.code, rating: ratingOf(d.code), comments: comments[d.code] || '' }));
      const { error: rErr } = await supabase.from('appraisal_ratings').upsert(rows, { onConflict: 'appraisal_id,domain_code' });
      if (rErr) throw rErr;
      setStatus(newStatus); setAppraisalData(appr);
      toast('✅ ' + successMsg); logActivity(profile, `Appraisal → ${newStatus.replaceAll('_', ' ')}`, staffName);
    } catch (err) { toast('Error: ' + err.message, 'error'); } finally { setSaving(false); }
  }

  async function submitForReview() {
    if (!(await confirm('Submit to the coordinator? You cannot edit it until it is returned.'))) return;
    saveProgress('Submitted', 'Submitted to coordinator');
  }
  async function returnWithRemarks(toStatus, who) {
    const currentRemarks = who === 'coordinator' ? coordinatorRemarks : authorityRemarks;
    if (!currentRemarks.trim()) return toast('Please write remarks before returning.', 'error');
    saveProgress(toStatus, 'Returned');
  }
  async function reopen() {
    if (!(await confirm('Reopen this approved appraisal and return it to the staff member?'))) return;
    saveProgress('Returned', 'Appraisal reopened');
  }

  const statusColor = { Draft: ['#f1f5f9', '#475569'], Submitted: ['#e0e7ff', '#3730a3'], Coordinator_Reviewed: ['#fae8ff', '#86198f'], Returned: ['#fee2e2', '#991b1b'], Approved: ['#dcfce7', '#166534'] }[status] || ['#f1f5f9', '#475569'];
  const btnBase = { padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#fff' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!isTeacher && (
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          {[['form', 'Appraisal Form'], ['overview', 'All Staff Overview']].map(([id, l]) => <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: tab === id ? '#2563eb' : '#fff', color: tab === id ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>{l}</button>)}
        </div>
      )}

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
                  <td style={S.td}><button onClick={() => { setSelectedStaff(s.id); setTab('form'); }} style={S.sm('#2563eb')}>Open</button></td>
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
            <select className="no-print" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} disabled={isTeacher} style={{ ...S.input, minWidth: 220 }}>
              <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            {selectedStaff && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Cycle {CYCLE} • {staffName}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {selectedStaff && <button className="no-print" onClick={() => window.print()} style={S.btn('#475569')}><Printer size={16} /> Print</button>}
            <div style={{ textAlign: 'right', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Official Appraisal Score (Max 100)</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{totalScore.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {!selectedStaff && <div style={S.card}><Empty text="Select a staff member to open their appraisal." /></div>}

        {selectedStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>Untouched domains default to 3 (Expected). Choose N/A to exclude a domain — the total is then scaled to 100.</div>
            {domains.map(d => {
              const p = per[d.code];
              const r = ratingOf(d.code);
              return (
                <div key={d.code} style={{ ...S.card, background: isReadOnly ? '#f8fafc' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ background: d.color, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>{d.code}</span><b style={{ fontSize: 16 }}>{d.name}</b></div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 5 }}>Max Weight: {d.weight} Marks</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 170, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}><span>Manual:</span> <span>{p.manual.toFixed(1)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: p.auto > 0 ? '#16a34a' : '#94a3b8', fontWeight: 'bold', marginBottom: 4, gap: 12 }}><span>Auto (Evidence/Tasks):</span> <span>+{p.na ? 0 : p.auto}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold', color: d.color, borderTop: '1px solid #cbd5e1', paddingTop: 4 }}><span>Total:</span> <span>{p.na ? 'N/A' : p.total.toFixed(1)}</span></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                    {[1, 2, 3, 4, 5].map(val => (
                      <button key={val} disabled={isReadOnly} onClick={() => setRatings(prev => ({ ...prev, [d.code]: val }))} style={{ flex: '1 1 100px', padding: 10, borderRadius: 8, border: r === val ? `2px solid ${d.color}` : '1px solid #cbd5e1', background: r === val ? `${d.color}15` : '#fff', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: 600, color: r === val ? d.color : '#475569' }}>
                        {val} - {val === 5 ? 'Exceptional' : val === 4 ? 'Strong' : val === 3 ? 'Expected' : val === 2 ? 'Developing' : 'Unsatisfactory'}
                      </button>
                    ))}
                    <button disabled={isReadOnly} onClick={() => setRatings(prev => ({ ...prev, [d.code]: null }))} style={{ flex: '0 0 60px', padding: 10, borderRadius: 8, border: r === null ? '2px solid #64748b' : '1px solid #cbd5e1', background: r === null ? '#f1f5f9' : '#fff', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#475569' }}>N/A</button>
                  </div>
                  <textarea readOnly={isReadOnly} placeholder="Comments/Reflections..." value={comments[d.code] || ''} onChange={e => setComments(prev => ({ ...prev, [d.code]: e.target.value }))} style={{ ...S.input, width: '100%', minHeight: 60, background: isReadOnly ? '#f1f5f9' : '#fff' }} />
                </div>
              );
            })}

            {appraisalData?.coordinator_remarks && !canCoord && (
              <div style={{ background: '#fdf4ff', padding: 15, borderRadius: 8, border: '1px solid #fae8ff' }}><strong style={{ color: '#86198f' }}>Coordinator Remarks:</strong> {appraisalData.coordinator_remarks}</div>
            )}
            {appraisalData?.authority_remarks && !canAuth && (
              <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8, border: '1px solid #bfdbfe' }}><strong style={{ color: '#1d4ed8' }}>Authority Remarks:</strong> {appraisalData.authority_remarks}</div>
            )}

            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 40 }}>
              {canEditOwn && <>
                <button onClick={() => saveProgress('Draft', 'Draft saved')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#64748b' }}>Save Draft</button>
                <button onClick={submitForReview} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#2563eb' }}>Submit to Coordinator</button>
              </>}

              {canCoord && <>
                <div style={{ width: '100%' }}><textarea placeholder="Coordinator remarks / recommendations (required to return)..." value={coordinatorRemarks} onChange={e => setCoordinatorRemarks(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 60 }} /></div>
                <button onClick={() => returnWithRemarks('Returned', 'coordinator')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#ef4444' }}>Return to Staff</button>
                <button onClick={() => saveProgress('Coordinator_Reviewed', 'Forwarded to authority')} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#8b5cf6' }}>Forward to Authority</button>
              </>}

              {canAuth && <>
                <div style={{ width: '100%' }}><textarea placeholder="Authority final remarks (required to return)..." value={authorityRemarks} onChange={e => setAuthorityRemarks(e.target.value)} style={{ ...S.input, width: '100%', minHeight: 60 }} /></div>
                <button onClick={() => returnWithRemarks('Submitted', 'authority')} disabled={saving} style={{ ...btnBase, flex: '1 1 150px', background: '#ef4444' }}>Return to Coordinator</button>
                <button onClick={async () => { if (await confirm('Final approve and lock this appraisal?')) saveProgress('Approved', 'Appraisal approved'); }} disabled={saving} style={{ ...btnBase, flex: '2 1 250px', background: '#16a34a' }}>Final Approve & Lock</button>
              </>}

              {status === 'Approved' && (
                <div style={{ width: '100%', padding: 16, background: '#dcfce7', color: '#166534', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>
                  ✅ This appraisal has been Final Approved.
                  {userRole === 'admin' && <button onClick={reopen} style={{ ...S.sm('#ef4444'), marginLeft: 12 }}>Reopen</button>}
                </div>
              )}
              {isReadOnly && status !== 'Approved' && <div style={{ width: '100%', color: '#64748b', fontSize: 14 }}>This appraisal is currently with: <b>{status === 'Submitted' ? 'Coordinator' : status === 'Coordinator_Reviewed' ? 'Appraisal Authority' : 'Staff member'}</b>. You can view it but not edit it.</div>}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

// ==========================================
// 12. REPORTS
// ==========================================
function ReportsPage() {
  const { toast } = useUI();
  const { list: staff } = useStaff();
  const [raw, setRaw] = useState(null);
  const [dept, setDept] = useState('all');

  useEffect(() => {
    (async () => {
      const [ap, ev, du, ta] = await Promise.all([
        supabase.from('appraisals').select('staff_id, status, final_score, appraisal_ratings(domain_code, rating)').eq('cycle', CYCLE),
        supabase.from('evidence_files').select('staff_id, domain_code').eq('status', 'Verified'),
        supabase.from('duty_records').select('staff_id, domain_code, marks').eq('status', 'Completed'),
        supabase.from('special_tasks').select('staff_id, domain_code, marks').eq('status', 'Completed')
      ]);
      setRaw({ ap: ap.data || [], ev: ev.data || [], du: du.data || [], ta: ta.data || [] });
    })();
  }, []);

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const matrix = useMemo(() => {
    if (!raw) return [];
    return staff.filter(s => dept === 'all' || s.department === dept).map(s => {
      const a = raw.ap.find(x => x.staff_id === s.id);
      if (!a) return { s, a: null };
      const auto = {};
      raw.ev.filter(e => e.staff_id === s.id).forEach(e => { if (e.domain_code) auto[e.domain_code] = (auto[e.domain_code] || 0) + 2; });
      [...raw.du, ...raw.ta].filter(x => x.staff_id === s.id).forEach(x => { if (x.domain_code && x.marks) auto[x.domain_code] = (auto[x.domain_code] || 0) + Number(x.marks); });
      const rm = {}; (a.appraisal_ratings || []).forEach(r => { rm[r.domain_code] = r.rating; });
      return { s, a, ...computeScores(rm, auto) };
    });
  }, [raw, staff, dept]);

  const exportMatrix = () => downloadCSV(`Score_Matrix_${CYCLE}.csv`, ['Staff', 'Department', ...domains.map(d => d.code), 'Total', 'Status'],
    matrix.map(r => [r.s.full_name, r.s.department, ...domains.map(d => r.a ? (r.per[d.code].na ? 'N/A' : r.per[d.code].total.toFixed(1)) : ''), r.a ? r.total.toFixed(1) : '', r.a ? r.a.status : 'Not started']));

  async function quickExport(kind) {
    const cfg = {
      evidence: ['evidence_files', '*, profiles(full_name)', ['Staff', 'Title', 'Domain', 'Status', 'Remarks', 'Uploaded', 'File'], r => [r.profiles?.full_name, r.title, r.domain_code, r.status, r.reviewer_remarks, fmtDate(r.created_at), r.file_url]],
      duties: ['duty_records', '*, profiles(full_name)', ['Staff', 'Title', 'Domain', 'Marks', 'Due', 'Status'], r => [r.profiles?.full_name, r.title, r.domain_code, r.marks, r.end_date, r.status]],
      tasks: ['special_tasks', '*, profiles(full_name)', ['Staff', 'Title', 'Domain', 'Marks', 'Status'], r => [r.profiles?.full_name, r.title, r.domain_code, r.marks, r.status]],
      leave: ['leave_requests', '*', ['Staff', 'Type', 'From', 'To', 'Reason', 'Status'], r => [staff.find(s => s.id === r.staff_id)?.full_name, r.leave_type, r.from_date, r.to_date, r.reason, r.status]]
    }[kind];
    const { data, error } = await supabase.from(cfg[0]).select(cfg[1]);
    if (error) return toast(error.message, 'error');
    downloadCSV(`${kind}_${todayStr()}.csv`, cfg[2], (data || []).map(cfg[3]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={S.card}>
        <h3 style={{ marginTop: 0 }}>Quick Exports (CSV)</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['evidence', 'Evidence'], ['duties', 'Duties'], ['tasks', 'Special Tasks'], ['leave', 'Leave Requests']].map(([k, l]) => <button key={k} onClick={() => quickExport(k)} style={S.btn('#16a34a')}><Download size={16} /> {l}</button>)}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Domain-wise Score Matrix ({CYCLE})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={dept} onChange={e => setDept(e.target.value)} style={S.input}><option value="all">All departments</option>{depts.map(x => <option key={x}>{x}</option>)}</select>
            <button onClick={exportMatrix} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
          </div>
        </div>
        {!raw ? <Empty text="Loading..." /> : (
          <Table heads={['Staff', ...domains.map(d => d.code), 'Total', 'Status']} min={900}>
            {matrix.map(r => (
              <tr key={r.s.id} style={S.row}>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.s.full_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.s.department}</div></td>
                {domains.map(d => <td key={d.code} style={S.td}>{r.a ? (r.per[d.code].na ? 'N/A' : r.per[d.code].total.toFixed(1)) : '-'}</td>)}
                <td style={{ ...S.td, fontWeight: 700, color: '#2563eb' }}>{r.a ? r.total.toFixed(1) : '-'}</td>
                <td style={S.td}>{r.a ? <Badge text={r.a.status} /> : <span style={{ color: '#94a3b8' }}>Not started</span>}</td>
              </tr>
            ))}
          </Table>
        )}
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Domain scores include auto marks from verified evidence and completed duties/tasks, capped at the domain weight.</div>
      </div>
    </div>
  );
}

// ==========================================
// 13. ACTIVITY LOG (admin)
// ==========================================
function ActivityLogPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => { supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(300).then(({ data }) => setRows(data || [])); }, []);
  const shown = rows.filter(r => `${r.actor_name} ${r.action} ${r.details}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search activity..." />
        <button onClick={() => downloadCSV('Activity_Log.csv', ['Time', 'User', 'Action', 'Details'], shown.map(r => [new Date(r.created_at).toLocaleString(), r.actor_name, r.action, r.details]))} style={S.btn('#16a34a')}><Download size={16} /> CSV</button>
      </div>
      {shown.length === 0 ? <Empty text="No activity yet." /> : (
        <Table heads={['Time', 'User', 'Action', 'Details']} min={640}>
          {shown.map(r => <tr key={r.id} style={S.row}><td style={{ ...S.td, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td><td style={S.td}>{r.actor_name}</td><td style={S.td}>{r.action}</td><td style={{ ...S.td, color: '#64748b' }}>{r.details}</td></tr>)}
        </Table>
      )}
    </div>
  );
}

// ==========================================
// 14. ACCOUNT SETTINGS
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