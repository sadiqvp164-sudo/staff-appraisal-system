import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, 
  FileCheck2, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, 
  Search, ShieldCheck, Users, X, Upload, Check, Download, Target, Settings, Key, AlertTriangle, Edit, Trash2, Camera, Send, ThumbsUp
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const domains = [
  { code: 'D1', name: 'Teaching, Learning & Learner Achievement', weight: 25, color: '#2563eb' },
  { code: 'D2', name: 'Student Mentoring & Wellbeing', weight: 15, color: '#7c3aed' },
  { code: 'D3', name: 'Campus Engagement & Responsibilities', weight: 15, color: '#d97706' },
  { code: 'D4', name: 'Collaboration & Communication', weight: 10, color: '#0d9488' },
  { code: 'D5', name: 'Professional Development & TPD', weight: 10, color: '#db2777' },
  { code: 'D6', name: 'Professionalism & Reliability', weight: 15, color: '#16a34a' },
  { code: 'D7', name: 'Academic Leadership & Governance', weight: 10, color: '#4f46e5' }
];

// Unwanted tabs & Special Points removed
const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'scores', label: 'Staff Leaderboard', icon: Award, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'staff', label: 'Staff Directory', icon: Users, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'duties', label: 'Duty & Monitoring', icon: CalendarDays, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'tasks', label: 'Special Task & Proposals', icon: ClipboardList, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'appraisal', label: 'Seven-Domain Appraisal', icon: GraduationCap, roles: ['admin', 'teacher', 'appraisal_authority', 'coordinator'] },
  { id: 'settings', label: 'My Account', icon: Settings, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] }
];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');
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
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, department, email, avatar_url').eq('id', userId).maybeSingle();
    if (!error) setProfile(data);
  }

  async function signIn(e) {
    e.preventDefault();
    if (!supabase) return;
    setAuthError('');
    const finalEmail = email.includes('@') ? email : `${email}@staff.local`;
    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
    if (error) setAuthError(error.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (isSupabaseConfigured && authLoading) return <div style={{padding: 50, textAlign: 'center'}}>Loading...</div>;
  if (isSupabaseConfigured && !session) return <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSubmit={signIn} error={authError} />;

  const userRole = profile?.role || 'teacher';
  const allowedNav = nav.filter(item => item.roles.includes(userRole));

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
      `}</style>

      <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        {mobileNav && <div className="mobile-overlay" onClick={() => setMobileNav(false)} />}
        
        <aside className={`sidebar ${mobileNav ? 'open' : ''}`} style={{ background: '#fff', borderRight: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
            <div style={{ background: '#1e293b', color: '#fff', padding: 8, borderRadius: 8 }}><ShieldCheck size={20} /></div>
            <div><strong style={{ display: 'block', fontSize: 16 }}>Staff Appraisal</strong><span style={{ fontSize: 10, color: '#64748b' }}>PERFORMANCE SYSTEM</span></div>
            <button className="mobile-menu-btn" onClick={() => setMobileNav(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X size={20} /></button>
          </div>
          
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
            {allowedNav.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setMobileNav(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: 'none', background: isActive ? '#eff6ff' : 'transparent', color: isActive ? '#2563eb' : '#475569', fontWeight: isActive ? 600 : 'normal', cursor: 'pointer', textAlign: 'left' }}>
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: '#cbd5e1', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}}/> : profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name || 'User'}</div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{userRole.replaceAll('_', ' ')}</div>
              </div>
              <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><LogOut size={18} /></button>
            </div>
          </div>
        </aside>

        <main className="main-content" style={{ flex: 1, padding: 30, overflowY: 'auto', height: '100vh', width: '100%' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <button onClick={() => setMobileNav(true)} className="mobile-menu-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Menu size={24} /></button>
              <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>{nav.find(n => n.id === active)?.label}</h2>
            </div>
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '8px 16px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 14 }}>
              <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></span> Cycle: 2026–2027
            </div>
          </header>

          {active === 'dashboard' && <DashboardPage />}
          {active === 'scores' && <AllStaffScoresPage />}
          {active === 'staff' && <StaffDirectoryPage currentUserRole={userRole} />}
          {active === 'duties' && <DutyMonitoringPage userRole={userRole} profile={profile} />}
          {active === 'tasks' && <SpecialTaskPage userRole={userRole} profile={profile} />}
          {active === 'appraisal' && <SevenDomainAppraisalPage userRole={userRole} profile={profile} />}
          {active === 'settings' && <AccountSettingsPage profile={profile} />}
        </main>
      </div>
    </>
  );
}

// ==========================================
// 1. LOGIN
// ==========================================
function Login({ email, setEmail, password, setPassword, onSubmit, error }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
    <div style={{ background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
        <ShieldCheck size={28} color="#2563eb" />
        <h2 style={{ margin: 0 }}>Sign In</h2>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>User ID or Email
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="e.g. sadiq or admin@email.com" />
        </label>
        <label style={{ fontSize: 14, fontWeight: 500 }}>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
        </label>
        {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
        <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
      </form>
    </div>
  </div>;
}

// ==========================================
// 2. DASHBOARD
// ==========================================
function DashboardPage() {
  const [stats, setStats] = useState({ staff: 0, duties: 0, tasks: 0, appraisals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { count: staffCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('active', true);
      const { count: dutyCount } = await supabase.from('duty_records').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      const { count: taskCount } = await supabase.from('special_tasks').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      const { count: apprCount } = await supabase.from('appraisals').select('*', { count: 'exact', head: true }).eq('status', 'Approved');

      setStats({ staff: staffCount || 0, duties: dutyCount || 0, tasks: taskCount || 0, appraisals: apprCount || 0 });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ color: '#64748b', fontSize: 14 }}>Total Active Staff</h3>
        <h1 style={{ color: '#2563eb', fontSize: 36, margin: '10px 0' }}>{stats.staff}</h1>
      </div>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ color: '#64748b', fontSize: 14 }}>Pending Duties</h3>
        <h1 style={{ color: '#d97706', fontSize: 36, margin: '10px 0' }}>{stats.duties}</h1>
      </div>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ color: '#64748b', fontSize: 14 }}>Pending Tasks</h3>
        <h1 style={{ color: '#db2777', fontSize: 36, margin: '10px 0' }}>{stats.tasks}</h1>
      </div>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ color: '#64748b', fontSize: 14 }}>Appraisals Approved</h3>
        <h1 style={{ color: '#16a34a', fontSize: 36, margin: '10px 0' }}>{stats.appraisals}</h1>
      </div>
    </div>
  );
}

// ==========================================
// 3. STAFF LEADERBOARD
// ==========================================
function AllStaffScoresPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      const { data: staff } = await supabase.from('profiles').select('id, full_name, department, avatar_url').eq('active', true);
      const { data: appr } = await supabase.from('appraisals').select('staff_id, final_score').eq('status', 'Approved');
      const { data: points } = await supabase.from('special_point_entries').select('staff_id, points_approved').eq('status', 'Approved');

      const scores = (staff || []).map(s => {
        const base = appr?.find(a => a.staff_id === s.id)?.final_score || 0;
        const sp = points?.filter(p => p.staff_id === s.id).reduce((sum, curr) => sum + curr.points_approved, 0) || 0;
        const combined = base + sp;
        return {
          ...s,
          baseScore: base,
          sp,
          finalScore: Math.min(100, combined),
          extra: Math.max(0, combined - 100)
        };
      });
      
      scores.sort((a, b) => (b.finalScore + b.extra) - (a.finalScore + a.extra));
      setData(scores);
      setLoading(false);
    }
    fetchScores();
  }, []);

  function downloadCSV() {
    if (data.length === 0) return alert("No data to export");
    const headers = ['Staff Name', 'Department', 'Appraisal Base', 'Special Points', 'Final Score (Max 100)', 'Extra Points'];
    const rows = data.map(r => [r.full_name, r.department || '-', r.baseScore.toFixed(2), r.sp, r.finalScore.toFixed(2), r.extra]);
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Staff_Leaderboard_2026-2027.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  if (loading) return <div>Loading Scores...</div>;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: 28, color: '#1e293b' }}>🏆 Performance Leaderboard</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Top performing staff members based on Appraisal + Special Points.</p>
        </div>
        <button onClick={downloadCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}><Download size={18} /> Export CSV</button>
      </div>

      <div className="podium-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
        {top3[1] && (
          <div className="podium-2nd" style={{ background: '#fff', padding: 20, borderRadius: 16, border: '2px solid #cbd5e1', width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 15px', borderRadius: '50%', border: '4px solid #cbd5e1', overflow: 'hidden', background: '#f1f5f9' }}>
              {top3[1].avatar_url ? <img src={top3[1].avatar_url} alt="2nd" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{fontSize: 32, paddingTop: 15}}>{top3[1].full_name.charAt(0)}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 5 }}>2nd Place 🥈</div>
            <div style={{ fontWeight: 'bold', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top3[1].full_name}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[1].finalScore.toFixed(1)}</div>
            {top3[1].extra > 0 && <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 'bold' }}>+{top3[1].extra} Extra</div>}
          </div>
        )}

        {top3[0] && (
          <div className="podium-1st" style={{ background: '#fffbeb', padding: 30, borderRadius: 16, border: '3px solid #f59e0b', width: 260, textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)', transform: 'translateY(-20px)' }}>
            <div style={{ width: 110, height: 110, margin: '0 auto 15px', borderRadius: '50%', border: '5px solid #f59e0b', overflow: 'hidden', background: '#fef3c7' }}>
              {top3[0].avatar_url ? <img src={top3[0].avatar_url} alt="1st" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{fontSize: 40, paddingTop: 25}}>{top3[0].full_name.charAt(0)}</div>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#d97706', marginBottom: 5 }}>1st Place 🥇</div>
            <div style={{ fontWeight: 'bold', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top3[0].full_name}</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[0].finalScore.toFixed(1)}</div>
            {top3[0].extra > 0 && <div style={{ fontSize: 14, color: '#ea580c', fontWeight: 'bold' }}>+{top3[0].extra} Extra</div>}
          </div>
        )}

        {top3[2] && (
          <div className="podium-3rd" style={{ background: '#fff', padding: 20, borderRadius: 16, border: '2px solid #b45309', width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 15px', borderRadius: '50%', border: '4px solid #b45309', overflow: 'hidden', background: '#f1f5f9' }}>
              {top3[2].avatar_url ? <img src={top3[2].avatar_url} alt="3rd" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{fontSize: 32, paddingTop: 15}}>{top3[2].full_name.charAt(0)}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#b45309', marginBottom: 5 }}>3rd Place 🥉</div>
            <div style={{ fontWeight: 'bold', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top3[2].full_name}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[2].finalScore.toFixed(1)}</div>
            {top3[2].extra > 0 && <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 'bold' }}>+{top3[2].extra} Extra</div>}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Other Staff Members</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
          {rest.map((r, idx) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 15, border: '1px solid #f1f5f9', borderRadius: 12, background: '#f8fafc' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', background: '#cbd5e1', flexShrink: 0 }}>
                {r.avatar_url ? <img src={r.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 20, paddingTop: 12, textAlign: 'center' }}>{r.full_name.charAt(0)}</div>}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.department || 'No Dept'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: 18 }}>{r.finalScore.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Rank #{idx + 4}</div>
              </div>
            </div>
          ))}
          {rest.length === 0 && <p style={{ color: '#64748b', gridColumn: '1 / -1' }}>No other staff members found.</p>}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. STAFF DIRECTORY
// ==========================================
function StaffDirectoryPage({ currentUserRole }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingFor, setUploadingFor] = useState(null);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setStaff(data || []);
    setLoading(false);
  }

  async function updateRole(id, newRole) {
    if (currentUserRole !== 'admin') return alert('Only admins can change roles.');
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) alert(error.message); else fetchStaff();
  }

  async function handleAddStaff() {
    const full_name = prompt("Enter staff full name:"); if (!full_name?.trim()) return;
    let email = prompt("Enter staff User ID or Email:"); if (!email?.trim()) return;
    if (!email.includes('@')) email = `${email.trim()}@staff.local`;
    const staff_code = prompt("Enter staff code:"); if (!staff_code?.trim()) return;
    const department = prompt("Enter department:"); if (!department?.trim()) return;
    const designation = prompt("Enter designation:"); if (!designation?.trim()) return;

    setIsAdding(true);
    const { data, error } = await supabase.functions.invoke("create-staff", {
      body: { full_name: full_name.trim(), email: email, staff_code: staff_code.trim(), department: department.trim(), designation: designation.trim() }
    });
    setIsAdding(false);

    if (error) {
      let details = "";
      try { if (error.context) details = await error.context.text(); } catch { details = "Could not read response"; }
      alert("Error: " + error.message + "\nDetails: " + details);
      return;
    }
    alert("✅ Staff account created successfully!"); fetchStaff();
  }

  async function handleUpdateCredentials(userId, currentEmail) {
    let newEmail = prompt(`Enter new User ID (or Email) for this staff:\n(Current: ${currentEmail || 'N/A'})\nLeave blank to keep unchanged.`);
    if (newEmail === null) return;
    const newPassword = prompt(`Enter new Password for this staff:\nLeave blank to keep unchanged.`);
    if (newPassword === null) return;

    if (!newEmail && !newPassword) return alert("No changes made.");

    let finalEmail = newEmail.trim();
    if (finalEmail && !finalEmail.includes('@')) finalEmail = `${finalEmail}@staff.local`;

    const bodyData = { target_user_id: userId };
    if (finalEmail) bodyData.email = finalEmail;
    if (newPassword.trim()) bodyData.password = newPassword.trim();

    const { data, error } = await supabase.functions.invoke("admin-update-user", { body: bodyData });

    if (error) {
      let details = "";
      try { if (error.context) details = await error.context.text(); } catch { details = "Could not read response"; }
      alert("Error: " + error.message + "\nDetails: " + details);
    } else {
      alert("✅ Credentials updated successfully!\nUser ID/Email: " + (finalEmail || "Unchanged") + "\nPassword: " + (newPassword ? "Changed" : "Unchanged"));
      fetchStaff();
    }
  }

  async function deleteStaff(id, name) {
    if (currentUserRole !== 'admin') return alert('Only admins can remove staff.');
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert("Error deleting staff: " + error.message);
    else { alert("✅ Staff profile removed."); fetchStaff(); }
  }

  async function handlePhotoUpload(e, staffId) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFor(staffId);
    
    const filePath = `public/${staffId}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    
    if (uploadError) {
      alert("Upload Error: " + uploadError.message);
      setUploadingFor(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', staffId);

    setUploadingFor(null);
    if (dbError) alert("DB Error: " + dbError.message);
    else { alert('✅ Photo updated!'); fetchStaff(); }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, uploadingFor)} accept="image/*" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Staff Members</h3>
        {currentUserRole === 'admin' && (
          <button onClick={handleAddStaff} disabled={isAdding} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={16} /> {isAdding ? 'Creating...' : 'Add New Staff'}
          </button>
        )}
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Photo</th><th style={{ padding: 12 }}>Name & Email</th><th style={{ padding: 12 }}>Role</th><th style={{ padding: 12 }}>Department</th>{currentUserRole === 'admin' && <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>}</tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ position: 'relative', width: 45, height: 45 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold', color: '#64748b' }}>
                        {s.avatar_url ? <img src={s.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.full_name.charAt(0)}
                      </div>
                      {currentUserRole === 'admin' && (
                        <button onClick={() => { setUploadingFor(s.id); fileInputRef.current.click(); }} style={{ position: 'absolute', bottom: -5, right: -5, background: '#2563eb', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', color: '#fff', display: 'flex' }}>
                          <Camera size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 12, fontWeight: 500 }}>{s.full_name} <br/><span style={{fontSize: 12, color: '#64748b'}}>{s.email || s.staff_code}</span></td>
                  <td style={{ padding: 12 }}>
                    {currentUserRole === 'admin' ? (
                      <select value={s.role} onChange={(e) => updateRole(s.id, e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                        <option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option><option value="admin">Admin</option>
                      </select>
                    ) : (<span style={{ textTransform: 'capitalize' }}>{s.role.replaceAll('_', ' ')}</span>)}
                  </td>
                  <td style={{ padding: 12 }}>{s.department || '-'}</td>
                  {currentUserRole === 'admin' && (
                    <td style={{ padding: 12, display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleUpdateCredentials(s.id, s.email)} style={{ padding: '6px 12px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Key size={14} /> Edit Login
                      </button>
                      <button onClick={() => deleteStaff(s.id, s.full_name)} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. DUTIES & MONITORING (Recurring & Delete Added)
// ==========================================
function DutyMonitoringPage({ userRole, profile }) {
  const [duties, setDuties] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ title: '', staff_id: '', deadline: '', domain_code: 'D3', marks: 5, is_recurring: false });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchDuties();
    if (userRole !== 'teacher') supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || []));
  }, [userRole]);

  async function fetchDuties() {
    let query = supabase.from('duty_records').select('*, profiles(full_name)');
    if (userRole === 'teacher') query = query.eq('staff_id', profile?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setDuties(data || []);
  }

    async function handleAssign(e) {
    e.preventDefault();
    if (!form.title || !form.staff_id) return alert('Please fill all fields');
    
    const { error } = await supabase.from('duty_records').insert({ 
      title: form.title, 
      staff_id: form.staff_id, 
      deadline: form.deadline || null, 
      status: 'Pending',
      domain_code: form.domain_code,
      marks: Number(form.marks),
      is_recurring: form.is_recurring
    });
    
    if (error) {
      alert("Error assigning duty: " + error.message); // ഇത് എറർ കാണിക്കും
      return;
    }

    alert('✅ Duty Assigned!'); 
    setForm({ title: '', staff_id: '', deadline: '', domain_code: 'D3', marks: 5, is_recurring: false }); 
    setShowForm(false); 
    fetchDuties();
  }

  async function markDone(duty) {
    // Mark as completed
    await supabase.from('duty_records').update({ status: 'Completed' }).eq('id', duty.id);

    // If it is a recurring duty, auto-generate next week's duty
    if (duty.is_recurring) {
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      
      await supabase.from('duty_records').insert({
        title: duty.title,
        staff_id: duty.staff_id,
        domain_code: duty.domain_code,
        marks: duty.marks,
        is_recurring: true,
        status: 'Pending',
        deadline: nextWeekDate.toISOString().split('T')[0]
      });
      alert('✅ Duty Completed! Next week\'s recurring duty automatically generated.');
    } else {
      alert('✅ Duty Completed!');
    }
    fetchDuties();
  }

  async function deleteDuty(id) {
    if (userRole !== 'admin') return alert('Only admins can delete duties.');
    if (!window.confirm("Are you sure you want to delete this duty record?")) return;
    await supabase.from('duty_records').delete().eq('id', id);
    fetchDuties();
  }
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(userRole === 'admin' || userRole === 'coordinator') && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: showForm ? 20 : 0 }}>
            <Plus size={18} /> {showForm ? 'Cancel' : 'Assign New Duty'}
          </button>
          
          {showForm && (
            <form onSubmit={handleAssign} style={{ display: 'flex', flexWrap: 'wrap', gap: 15, alignItems: 'flex-end', background: '#f8fafc', padding: 15, borderRadius: 8 }}>
              <label style={{ flex: '1 1 200px' }}>Duty Title:<br/>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Weekly Cleaning" style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
              </label>
              
              <label style={{ flex: '1 1 150px' }}>Assign To Staff:<br/>
                <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                  <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>

              <label style={{ flex: '1 1 200px' }}>Link to Domain:<br/>
                <select value={form.domain_code} onChange={e => setForm({...form, domain_code: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                  {domains.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
                </select>
              </label>
              
              <label style={{ flex: '0 1 100px' }}>Marks:<br/>
                <input type="number" min="1" max="25" value={form.marks} onChange={e => setForm({...form, marks: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
              </label>
              
              <label style={{ flex: '1 1 150px' }}>Deadline:<br/>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, flex: '0 0 auto', background: '#f1f5f9', padding: '0 15px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} />
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#475569' }}>Recurring Weekly</span>
              </label>
              
              <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', height: 42, flex: '0 0 auto' }}>Save</button>
            </form>
          )}
        </div>
      )}
      
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
        <h3>Duty Records</h3>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 15, minWidth: 600 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Staff</th><th style={{ padding: 12 }}>Duty & Domain</th><th style={{ padding: 12 }}>Deadline</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Action</th></tr></thead>
            <tbody>
              {duties.map(d => {
                const isOverdue = d.deadline && d.deadline < today && d.status !== 'Completed';
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: 12 }}>{d.profiles?.full_name}</td>
                    <td style={{ padding: 12 }}>
                      <b>{d.title}</b> {d.is_recurring && <span style={{fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: 10, marginLeft: 5}}>Recurring</span>}<br/>
                      <span style={{fontSize: 11, color: '#64748b'}}>{d.domain_code || 'No Domain'} (+{d.marks || 0} Marks)</span>
                    </td>
                    <td style={{ padding: 12, color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                      {d.deadline || '-'} {isOverdue && <AlertTriangle size={14} style={{ display: 'inline', marginLeft: 5 }} />}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 12, background: d.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: d.status === 'Completed' ? '#166534' : '#92400e', fontSize: 12 }}>{d.status}</span>
                    </td>
                    <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                      {d.status !== 'Completed' && (
                        <button onClick={() => markDone(d)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Check size={14} /> Mark Done
                        </button>
                      )}
                      {d.status === 'Completed' && (
                        <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={16} /> Completed
                        </span>
                      )}
                      {userRole === 'admin' && (
                        <button onClick={() => deleteDuty(d.id)} style={{ padding: '6px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer' }} title="Delete Duty">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. SPECIAL TASKS & PROPOSALS
// ==========================================
function SpecialTaskPage({ userRole, profile }) {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ title: '', staff_id: '', deadline: '', domain_code: 'D7', marks: 5 });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (userRole !== 'teacher') supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || []));
  }, [userRole]);

  async function fetchTasks() {
    let query = supabase.from('special_tasks').select('*, profiles(full_name)');
    if (userRole === 'teacher') query = query.eq('staff_id', profile?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setTasks(data || []);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.staff_id) return alert('Fill all fields');
    await supabase.from('special_tasks').insert({ 
      title: form.title, staff_id: form.staff_id, deadline: form.deadline || null, 
      status: 'Pending', domain_code: form.domain_code, marks: Number(form.marks)
    });
    alert('✅ Task Created!'); setForm({ title: '', staff_id: '', deadline: '', domain_code: 'D7', marks: 5 }); setShowForm(false); fetchTasks();
  }

  async function handlePropose(e) {
    e.preventDefault();
    if (!form.title) return alert('Enter activity title');
    await supabase.from('special_tasks').insert({ 
      title: form.title, staff_id: profile.id, status: 'Proposed'
    });
    alert('✅ Proposal Submitted for Approval!'); setForm({ title: '', staff_id: '', deadline: '', domain_code: 'D7', marks: 5 }); setShowForm(false); fetchTasks();
  }

  async function approveProposal(task) {
    const domain = prompt("Enter Domain Code (D1 to D7):", "D7");
    if (!domain) return;
    const marks = prompt("Enter Marks to award for this activity:", "5");
    if (!marks) return;

    const { error } = await supabase.from('special_tasks').update({ 
      domain_code: domain, marks: Number(marks), status: 'Completed' 
    }).eq('id', task.id);
    
    if (error) alert(error.message);
    else { alert('✅ Approved & Marks Added!'); fetchTasks(); }
  }

  async function markDone(id) { await supabase.from('special_tasks').update({ status: 'Completed' }).eq('id', id); fetchTasks(); }
  
  const isAdmin = userRole === 'admin' || userRole === 'coordinator' || userRole === 'appraisal_authority';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: isAdmin ? '#2563eb' : '#8b5cf6', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin ? <Plus size={18} /> : <Send size={18} />} {showForm ? 'Cancel' : (isAdmin ? 'Create Special Task' : 'Propose New Activity')}
        </button>
        
        {showForm && (
          <form onSubmit={isAdmin ? handleCreate : handlePropose} style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginTop: 20, alignItems: 'flex-end', background: '#f8fafc', padding: 15, borderRadius: 8 }}>
            <label style={{ flex: '1 1 200px' }}>Activity Title:<br/>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Describe what you did..." style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
            </label>

            {isAdmin && (
              <>
                <label style={{ flex: '1 1 150px' }}>Assign To:<br/>
                  <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                    <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </label>
                <label style={{ flex: '1 1 200px' }}>Link to Domain:<br/>
                  <select value={form.domain_code} onChange={e => setForm({...form, domain_code: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                    {domains.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
                  </select>
                </label>
                <label style={{ flex: '0 1 100px' }}>Marks:<br/>
                  <input type="number" min="1" max="10" value={form.marks} onChange={e => setForm({...form, marks: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
                </label>
                <label style={{ flex: '1 1 150px' }}>Deadline:<br/>
                  <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} />
                </label>
              </>
            )}
            <button type="submit" style={{ background: isAdmin ? '#16a34a' : '#8b5cf6', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', height: 42, flex: '0 0 auto' }}>{isAdmin ? 'Save' : 'Submit for Approval'}</button>
          </form>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
        <h3>Special Tasks & Proposals</h3>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 15, minWidth: 700 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Staff</th><th style={{ padding: 12 }}>Activity & Domain</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Action</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: t.status === 'Proposed' ? '#fdf4ff' : 'transparent' }}>
                  <td style={{ padding: 12 }}>{t.profiles?.full_name}</td>
                  <td style={{ padding: 12 }}>
                    <b>{t.title}</b><br/>
                    {t.domain_code && <span style={{fontSize: 11, color: '#64748b'}}>{t.domain_code} (+{t.marks || 0} Marks)</span>}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 'bold',
                      background: t.status === 'Completed' ? '#dcfce7' : t.status === 'Proposed' ? '#fae8ff' : '#fef3c7', 
                      color: t.status === 'Completed' ? '#166534' : t.status === 'Proposed' ? '#86198f' : '#92400e' 
                    }}>{t.status}</span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {t.status === 'Proposed' && isAdmin && (
                      <button onClick={() => approveProposal(t)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ThumbsUp size={14} /> Approve & Assign
                      </button>
                    )}
                    {t.status === 'Pending' && (
                      <button onClick={() => markDone(t.id)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={14} /> Mark Done
                      </button>
                    )}
                    {t.status === 'Completed' && (
                      <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle2 size={16} /> Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center' }}>No tasks or proposals found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. SEVEN DOMAIN APPRAISAL
// ==========================================
function SevenDomainAppraisalPage({ userRole, profile }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [status, setStatus] = useState('Draft');
  const [saving, setSaving] = useState(false);
  const [penalty, setPenalty] = useState({ count: 0, marks: 0 });
  const [autoMarks, setAutoMarks] = useState({}); 

  const isTeacher = userRole === 'teacher';
  const isReviewer = userRole === 'admin' || userRole === 'appraisal_authority' || userRole === 'coordinator';

  useEffect(() => {
    if (isTeacher) { setSelectedStaff(profile?.id); setStaffList([{id: profile?.id, full_name: profile?.full_name}]); } 
    else { supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || [])); }
  }, [userRole, profile]);

  useEffect(() => {
    if (!selectedStaff) return;
    
    supabase.from('appraisals').select('id, status, appraisal_ratings(domain_code, rating, comments)').eq('staff_id', selectedStaff).eq('cycle', '2026-2027').maybeSingle().then(({ data }) => {
      if (data) {
        setStatus(data.status || 'Draft');
        if (data.appraisal_ratings) {
          const rMap = {}, cMap = {};
          data.appraisal_ratings.forEach(r => { rMap[r.domain_code] = r.rating; cMap[r.domain_code] = r.comments; });
          setRatings(rMap); setComments(cMap);
        }
      } else { setStatus('Draft'); setRatings({}); setComments({}); }
    });

    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      supabase.from('duty_records').select('id').eq('staff_id', selectedStaff).neq('status', 'Completed').lt('deadline', today),
      supabase.from('special_tasks').select('id').eq('staff_id', selectedStaff).neq('status', 'Completed').neq('status', 'Proposed').lt('deadline', today)
    ]).then(([dutiesRes, tasksRes]) => {
      const overdueCount = (dutiesRes.data?.length || 0) + (tasksRes.data?.length || 0);
      setPenalty({ count: overdueCount, marks: overdueCount * 2 });
    });

    Promise.all([
      supabase.from('duty_records').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed'),
      supabase.from('special_tasks').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed')
    ]).then(([duties, tasks]) => {
      const marksMap = {};
      [...(duties.data || []), ...(tasks.data || [])].forEach(item => {
        if (item.domain_code && item.marks) {
          marksMap[item.domain_code] = (marksMap[item.domain_code] || 0) + Number(item.marks);
        }
      });
      setAutoMarks(marksMap);
    });

  }, [selectedStaff]);

  const calculateDomainTotal = (domainCode, weight) => {
    const manualScore = ((ratings[domainCode] || 0) / 5) * weight;
    const autoScore = autoMarks[domainCode] || 0;
    return Math.min(weight, manualScore + autoScore); 
  };

  const grandTotal = domains.reduce((sum, d) => sum + calculateDomainTotal(d.code, d.weight), 0);
  const totalScore = Math.max(0, grandTotal - penalty.marks);

  async function handleAction(actionType) {
    if (!selectedStaff) return alert('Select staff first');
    setSaving(true);
    let newStatus = status;
    if (actionType === 'submit') newStatus = 'Submitted';
    if (actionType === 'approve') newStatus = 'Approved';
    if (actionType === 'return') newStatus = 'Returned';
    if (actionType === 'draft') newStatus = isTeacher ? 'Draft' : status;

    try {
      const { data: appr, error: apprErr } = await supabase.from('appraisals').upsert({ 
        staff_id: selectedStaff, cycle: '2026-2027', final_score: totalScore, status: newStatus,
        submitted_at: newStatus === 'Submitted' ? new Date().toISOString() : undefined,
        approved_at: newStatus === 'Approved' ? new Date().toISOString() : undefined
      }, { onConflict: 'staff_id,cycle' }).select().single();
      if (apprErr) throw apprErr;

      const ratingRows = domains.map(d => ({ appraisal_id: appr.id, domain_code: d.code, rating: ratings[d.code] || 3, comments: comments[d.code] || '' }));
      const { error: rateErr } = await supabase.from('appraisal_ratings').upsert(ratingRows, { onConflict: 'appraisal_id,domain_code' });
      if (rateErr) throw rateErr;
      setStatus(newStatus);
    } catch (err) { alert('Error: ' + err.message); } finally { setSaving(false); }
  }

  const isReadOnly = status === 'Approved' || (isTeacher && status === 'Submitted');
  const statusColor = { 'Draft': { bg: '#f1f5f9', text: '#475569' }, 'Submitted': { bg: '#e0e7ff', text: '#3730a3' }, 'Returned': { bg: '#fee2e2', text: '#991b1b' }, 'Approved': { bg: '#dcfce7', text: '#166534' } }[status] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Evaluate Staff</h3>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: statusColor.bg, color: statusColor.text }}>Status: {status}</span>
          </div>
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} disabled={isTeacher} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 200 }}>
            <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        
        <div style={{ textAlign: 'right', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>Overall Total Score</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{totalScore.toFixed(2)} <span style={{fontSize: 14, color: '#94a3b8'}}>/ 100</span></div>
          {penalty.count > 0 && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold', marginTop: 4 }}>Penalty Applied: -{penalty.marks} Marks</div>}
        </div>
      </div>

      {selectedStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {penalty.count > 0 && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 15, borderRadius: 8, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={20} /> Warning: This staff has {penalty.count} overdue incomplete tasks. Penalty applied.
            </div>
          )}

          {domains.map(d => {
            const autoMark = autoMarks[d.code] || 0;
            const manualMark = ((ratings[d.code] || 0) / 5) * d.weight;
            const domainTotal = calculateDomainTotal(d.code, d.weight);
            
            return (
              <div key={d.code} style={{ background: isReadOnly ? '#f8fafc' : '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ background: d.color, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>{d.code}</span><b style={{ fontSize: 16 }}>{d.name}</b></div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 5 }}>Max Weight: {d.weight} Marks</div>
                  </div>
                  
                  <div style={{ textAlign: 'right', minWidth: 120, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                      <span>Manual:</span> <span>{manualMark.toFixed(1)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: autoMark > 0 ? '#16a34a' : '#94a3b8', fontWeight: 'bold', marginBottom: 4 }}>
                      <span>Auto (Duties):</span> <span>+{autoMark}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold', color: d.color, borderTop: '1px solid #cbd5e1', paddingTop: 4 }}>
                      <span>Total:</span> <span>{domainTotal.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button key={val} disabled={isReadOnly} onClick={() => setRatings(prev => ({...prev, [d.code]: val}))} style={{ flex: '1 1 100px', padding: 10, borderRadius: 8, border: ratings[d.code] === val ? `2px solid ${d.color}` : '1px solid #cbd5e1', background: ratings[d.code] === val ? `${d.color}15` : '#fff', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: 600, color: ratings[d.code] === val ? d.color : '#475569' }}>
                      {val} - {val === 5 ? 'Exceptional' : val === 4 ? 'Strong' : val === 3 ? 'Expected' : val === 2 ? 'Developing' : 'Unsatisfactory'}
                    </button>
                  ))}
                </div>
                <textarea readOnly={isReadOnly} placeholder="Comments..." value={comments[d.code] || ''} onChange={e => setComments(prev => ({...prev, [d.code]: e.target.value}))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 60, fontFamily: 'inherit', background: isReadOnly ? '#f1f5f9' : '#fff', boxSizing: 'border-box' }} />
              </div>
            );
          })}
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 40 }}>
            {isTeacher && (status === 'Draft' || status === 'Returned') && (
              <>
                <button onClick={() => handleAction('draft')} disabled={saving} style={{ flex: '1 1 150px', background: '#64748b', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>Save as Draft</button>
                <button onClick={() => handleAction('submit')} disabled={saving} style={{ flex: '2 1 250px', background: '#2563eb', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>Submit Self-Appraisal</button>
              </>
            )}
            {isReviewer && status === 'Submitted' && (
              <>
                <button onClick={() => handleAction('return')} disabled={saving} style={{ flex: '1 1 150px', background: '#ef4444', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>Return</button>
                <button onClick={() => handleAction('draft')} disabled={saving} style={{ flex: '1 1 150px', background: '#64748b', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
                <button onClick={() => handleAction('approve')} disabled={saving} style={{ flex: '2 1 250px', background: '#16a34a', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>Approve & Finalize</button>
              </>
            )}
            {status === 'Approved' && (<div style={{ width: '100%', padding: 16, background: '#dcfce7', color: '#166534', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>✅ This appraisal has been Approved and Finalized.</div>)}
            {isTeacher && status === 'Submitted' && (<div style={{ width: '100%', padding: 16, background: '#e0e7ff', color: '#3730a3', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>⏳ Waiting for review.</div>)}
            {isReviewer && (status === 'Draft' || status === 'Returned') && (<div style={{ width: '100%', padding: 16, background: '#fef3c7', color: '#92400e', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>⏳ Waiting for Staff to submit.</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. ACCOUNT SETTINGS
// ==========================================
function AccountSettingsPage({ profile }) {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function handleEmailUpdate(e) {
    e.preventDefault();
    if (!newEmail) return;
    setEmailLoading(true);
    setMessage({ type: '', text: '' });
    
    const finalEmail = newEmail.includes('@') ? newEmail : `${newEmail}@staff.local`;
    const { error } = await supabase.auth.updateUser({ email: finalEmail });
    setEmailLoading(false);
    
    if (error) setMessage({ type: 'error', text: error.message });
    else setMessage({ type: 'success', text: '✅ Confirmation link sent to your new email. Please check your inbox.' });
    setNewEmail('');
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords do not match!' });
    if (newPassword.length < 6) return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    
    setPassLoading(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);

    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: '✅ Password updated successfully!' });
      setNewPassword(''); setConfirmPassword('');
    }
  }

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {message.text && (
        <div style={{ padding: 15, borderRadius: 8, background: message.type === 'error' ? '#fee2e2' : '#dcfce7', color: message.type === 'error' ? '#991b1b' : '#166534', fontWeight: 'bold' }}>
          {message.text}
        </div>
      )}

      <div style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0 }}>User Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div><strong>Name:</strong> {profile?.full_name}</div>
          <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{profile?.role.replaceAll('_', ' ')}</span></div>
          <div><strong>Email:</strong> {profile?.email || 'Hidden (Check Supabase)'}</div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0 }}>Change My Email (User ID)</h3>
        <form onSubmit={handleEmailUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
          <label style={{ fontSize: 14 }}>New Email Address or User ID
            <input type="text" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="Enter new email or user ID" style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </label>
          <button type="submit" disabled={emailLoading} style={{ background: '#2563eb', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {emailLoading ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0 }}>Change My Password</h3>
        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
          <label style={{ fontSize: 14 }}>New Password
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password" style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 14 }}>Confirm New Password
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </label>
          <button type="submit" disabled={passLoading} style={{ background: '#16a34a', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;