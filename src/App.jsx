import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, 
  FileCheck2, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, 
  Search, ShieldCheck, Users, X, Upload, Check, Download, Target, Settings, Key, AlertTriangle, Edit, Trash2, Camera, Medal
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const domains = [
  { code: 'D1', name: 'Teaching, Learning & Learner Achievement', weight: 25, color: '#2563eb' },
  { code: 'D2', name: 'Student Mentoring, Wellbeing & Holistic Development', weight: 15, color: '#7c3aed' },
  { code: 'D3', name: 'Campus Engagement & Institutional Responsibilities', weight: 15, color: '#d97706' },
  { code: 'D4', name: 'Collaboration, Communication & Campus Community', weight: 10, color: '#0d9488' },
  { code: 'D5', name: 'Personal & Professional Development, TPD & Research', weight: 10, color: '#db2777' },
  { code: 'D6', name: 'Professionalism, Reliability & Institutional Responsibility', weight: 15, color: '#16a34a' },
  { code: 'D7', name: 'Academic Leadership, Governance & Institutional Contribution', weight: 10, color: '#4f46e5' }
];

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'scores', label: 'Staff Leaderboard', icon: Award, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'staff', label: 'Staff Directory', icon: Users, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'duties', label: 'Duty & Monitoring', icon: CalendarDays, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'tasks', label: 'Special Task Register', icon: ClipboardList, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'evidence', label: 'Evidence Portfolio', icon: FileCheck2, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'appraisal', label: 'Seven-Domain Appraisal', icon: GraduationCap, roles: ['admin', 'teacher', 'appraisal_authority', 'coordinator'] },
  { id: 'points', label: 'Special Points', icon: Award, roles: ['admin', 'appraisal_authority'] },
  { id: 'development', label: 'Development Plan', icon: Target, roles: ['admin', 'teacher', 'appraisal_authority'] },
  { id: 'reports', label: 'Reports & Development', icon: FileText, roles: ['admin', 'appraisal_authority'] },
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
          {active === 'evidence' && <EvidencePortfolioPage userRole={userRole} profile={profile} />}
          {active === 'appraisal' && <SevenDomainAppraisalPage userRole={userRole} profile={profile} />}
          {active === 'points' && <SpecialPointsPage />}
          {active === 'development' && <DevelopmentPlanPage userRole={userRole} profile={profile} />}
          {active === 'reports' && <ReportsPage />}
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
// 3. STAFF LEADERBOARD (WITH PHOTOS & PODIUM)
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

  if (loading) return <div>Loading Scores...</div>;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: 28, color: '#1e293b' }}>🏆 Performance Leaderboard</h2>
        <p style={{ color: '#64748b', margin: 0 }}>Top performing staff members based on Appraisal + Special Points.</p>
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
// 4. STAFF DIRECTORY (With Photo Upload)
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
// 5. DUTIES & TASKS
// ==========================================
function DutyMonitoringPage({ userRole, profile }) {
  const [duties, setDuties] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ title: '', staff_id: '', deadline: '' });
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
    if (!form.title || !form.staff_id) return alert('Fill all fields');
    await supabase.from('duty_records').insert({ title: form.title, staff_id: form.staff_id, deadline: form.deadline || null, status: 'Pending' });
    alert('✅ Duty Assigned!'); setForm({ title: '', staff_id: '', deadline: '' }); setShowForm(false); fetchDuties();
  }

  async function markDone(id) { await supabase.from('duty_records').update({ status: 'Completed' }).eq('id', id); fetchDuties(); }
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(userRole === 'admin' || userRole === 'coordinator') && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> {showForm ? 'Cancel' : 'Assign New Duty'}
          </button>
          {showForm && (
            <form onSubmit={handleAssign} style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginTop: 20, alignItems: 'flex-end' }}>
              <label style={{ flex: '1 1 200px' }}>Duty Title:<br/>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
              </label>
              <label style={{ flex: '1 1 200px' }}>Assign To:<br/>
                <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                  <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>
              <label style={{ flex: '1 1 150px' }}>Deadline:<br/>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} />
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
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Staff</th><th style={{ padding: 12 }}>Duty</th><th style={{ padding: 12 }}>Deadline</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Action</th></tr></thead>
            <tbody>
              {duties.map(d => {
                const isOverdue = d.deadline && d.deadline < today && d.status !== 'Completed';
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: 12 }}>{d.profiles?.full_name}</td>
                    <td style={{ padding: 12 }}>{d.title}</td>
                    <td style={{ padding: 12, color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                      {d.deadline || '-'} {isOverdue && <AlertTriangle size={14} style={{ display: 'inline', marginLeft: 5 }} />}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 12, background: d.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: d.status === 'Completed' ? '#166534' : '#92400e', fontSize: 12 }}>{d.status}</span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {d.status !== 'Completed' && (
                        <button onClick={() => markDone(d.id)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Check size={14} /> Mark Done
                        </button>
                      )}
                      {d.status === 'Completed' && (
                        <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={16} /> Completed
                        </span>
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

function SpecialTaskPage({ userRole, profile }) {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ title: '', staff_id: '', deadline: '' });
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
    await supabase.from('special_tasks').insert({ title: form.title, staff_id: form.staff_id, deadline: form.deadline || null, status: 'Pending' });
    alert('✅ Task Created!'); setForm({ title: '', staff_id: '', deadline: '' }); setShowForm(false); fetchTasks();
  }

  async function markDone(id) { await supabase.from('special_tasks').update({ status: 'Completed' }).eq('id', id); fetchTasks(); }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(userRole === 'admin' || userRole === 'coordinator') && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> {showForm ? 'Cancel' : 'Create Special Task'}
          </button>
          {showForm && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginTop: 20, alignItems: 'flex-end' }}>
              <label style={{ flex: '1 1 200px' }}>Task Title:<br/>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required />
              </label>
              <label style={{ flex: '1 1 200px' }}>Assign To:<br/>
                <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required>
                  <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>
              <label style={{ flex: '1 1 150px' }}>Deadline:<br/>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} />
              </label>
              <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', height: 42, flex: '0 0 auto' }}>Save</button>
            </form>
          )}
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
        <h3>Special Tasks</h3>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 15, minWidth: 600 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Staff</th><th style={{ padding: 12 }}>Task</th><th style={{ padding: 12 }}>Deadline</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Action</th></tr></thead>
            <tbody>
              {tasks.map(t => {
                const isOverdue = t.deadline && t.deadline < today && t.status !== 'Completed';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: 12 }}>{t.profiles?.full_name}</td>
                    <td style={{ padding: 12 }}>{t.title}</td>
                    <td style={{ padding: 12, color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                      {t.deadline || '-'} {isOverdue && <AlertTriangle size={14} style={{ display: 'inline', marginLeft: 5 }} />}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 12, background: t.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: t.status === 'Completed' ? '#166534' : '#92400e', fontSize: 12 }}>{t.status}</span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {t.status !== 'Completed' && (
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
// 6. EVIDENCE PORTFOLIO
// ==========================================
function EvidencePortfolioPage({ userRole, profile }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    const { data } = await supabase.from('evidence_files').select('*, profiles(full_name)').order('uploaded_at', { ascending: false });
    setFiles(data || []);
  }

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current.files[0];
    if (!file) return alert('Select a file first');
    setUploading(true);
    const filePath = `${profile?.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('evidence').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('evidence_files').insert({ staff_id: profile?.id, file_name: file.name, file_path: filePath, file_url: urlData.publicUrl, category: 'General' });
    setUploading(false);
    if (dbError) alert(dbError.message); else { alert('✅ File uploaded!'); fetchFiles(); fileRef.current.value = ''; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(userRole === 'teacher' || userRole === 'admin' || userRole === 'coordinator') && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h3>Upload New Evidence</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 15, flexWrap: 'wrap' }}>
            <input type="file" ref={fileRef} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, flex: '1 1 200px', width: '100%' }} />
            <button type="submit" disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', flex: '0 0 auto' }}><Upload size={18} /> {uploading ? 'Uploading...' : 'Upload'}</button>
          </form>
        </div>
      )}
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Uploaded Documents</h3>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15, minWidth: 500 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12, textAlign: 'left' }}>Staff</th><th style={{ padding: 12, textAlign: 'left' }}>File Name</th><th style={{ padding: 12, textAlign: 'left' }}>Date</th><th style={{ padding: 12, textAlign: 'left' }}>Action</th></tr></thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{f.profiles?.full_name}</td><td style={{ padding: 12 }}>{f.file_name}</td><td style={{ padding: 12 }}>{new Date(f.uploaded_at).toLocaleDateString()}</td><td style={{ padding: 12 }}><a href={f.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>View File</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. SEVEN DOMAIN APPRAISAL (With Penalty)
// ==========================================
function SevenDomainAppraisalPage({ userRole, profile }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [status, setStatus] = useState('Draft');
  const [saving, setSaving] = useState(false);
  const [penalty, setPenalty] = useState({ count: 0, marks: 0 });

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
      supabase.from('special_tasks').select('id').eq('staff_id', selectedStaff).neq('status', 'Completed').lt('deadline', today)
    ]).then(([dutiesRes, tasksRes]) => {
      const overdueCount = (dutiesRes.data?.length || 0) + (tasksRes.data?.length || 0);
      setPenalty({ count: overdueCount, marks: overdueCount * 2 });
    });

  }, [selectedStaff]);

  const baseScore = domains.reduce((sum, d) => sum + ((ratings[d.code] || 0) / 5) * d.weight, 0);
  const totalScore = Math.max(0, baseScore - penalty.marks);

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
          <div style={{ fontSize: 13, color: '#64748b' }}>Base Score: {baseScore.toFixed(2)}</div>
          {penalty.count > 0 && <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 'bold' }}>Missed Deadlines: {penalty.count} (-{penalty.marks} marks)</div>}
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{totalScore.toFixed(2)} <span style={{fontSize: 14, color: '#94a3b8'}}>/ 100</span></div>
        </div>
      </div>

      {selectedStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {penalty.count > 0 && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 15, borderRadius: 8, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={20} /> Warning: This staff has {penalty.count} overdue incomplete tasks. Penalty applied.
            </div>
          )}

          {domains.map(d => (
            <div key={d.code} style={{ background: isReadOnly ? '#f8fafc' : '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ background: d.color, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>{d.code}</span><b style={{ fontSize: 16 }}>{d.name}</b></div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 5 }}>Weight: {d.weight} Marks</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: d.color }}>{(((ratings[d.code] || 0) / 5) * d.weight).toFixed(1)} / {d.weight}</div>
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
          ))}
          
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
// 8. SPECIAL POINTS (Edit & Delete)
// ==========================================
function SpecialPointsPage() {
  const [staffList, setStaffList] = useState([]);
  const [pointsList, setPointsList] = useState([]);
  const [form, setForm] = useState({ staff_id: '', points: '', reason: '' });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || []));
    supabase.from('special_point_entries').select('*, profiles(full_name)').order('created_at', { ascending: false }).then(({ data }) => setPointsList(data || []));
  }, [refresh]);

  async function submit(e) {
    e.preventDefault();
    if (!form.staff_id || !form.points) return;
    await supabase.from('special_point_entries').insert({ staff_id: form.staff_id, points_proposed: form.points, reason: form.reason, status: 'Approved', points_approved: form.points });
    alert('Points Added!'); setForm({ staff_id: '', points: '', reason: '' }); setRefresh(prev => prev + 1);
  }

  async function deletePoint(id) {
    if (!window.confirm("Are you sure you want to delete this point record?")) return;
    const { error } = await supabase.from('special_point_entries').delete().eq('id', id);
    if (error) alert(error.message);
    else setRefresh(prev => prev + 1);
  }

  async function editPoint(p) {
    const newPoints = prompt("Enter new points:", p.points_approved);
    if (newPoints === null) return;
    const newReason = prompt("Enter new reason:", p.reason);
    if (newReason === null) return;
    
    const { error } = await supabase.from('special_point_entries')
      .update({ points_approved: parseInt(newPoints), points_proposed: parseInt(newPoints), reason: newReason })
      .eq('id', p.id);
      
    if (error) alert(error.message);
    else setRefresh(prev => prev + 1);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Award Points</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} required><option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
          <input type="number" placeholder="Points" value={form.points} onChange={e => setForm({...form, points: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} required />
          <textarea placeholder="Reason" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', minHeight: 80 }} required />
          <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Add Points</button>
        </form>
      </div>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Recent Points</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {pointsList.map(p => (
            <li key={p.id} style={{ padding: 15, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <b>{p.profiles?.full_name}</b> <span style={{ color: 'green', fontWeight: 'bold', marginLeft: 5 }}>+{p.points_approved}</span>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 5 }}>{p.reason}</div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => editPoint(p)} style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer' }} title="Edit"><Edit size={14} /></button>
                <button onClick={() => deletePoint(p.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer' }} title="Delete"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ==========================================
// 9. DEVELOPMENT PLAN
// ==========================================
function DevelopmentPlanPage({ userRole, profile }) {
  const [staffList, setStaffList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(userRole === 'teacher' ? profile?.id : '');
  const [form, setForm] = useState({ priority: '', action: '', support: '', target_date: '' });
  const [showForm, setShowForm] = useState(false);

  const isReviewer = userRole === 'admin' || userRole === 'appraisal_authority';

  useEffect(() => {
    if (isReviewer) supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || []));
  }, [isReviewer]);

  useEffect(() => {
    if (!selectedStaff) return;
    supabase.from('development_plans').select('*').eq('staff_id', selectedStaff).order('created_at', { ascending: false }).then(({ data }) => setPlans(data || []));
  }, [selectedStaff]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.priority || !form.action) return alert('Fill priority and action');
    const { error } = await supabase.from('development_plans').insert({ staff_id: selectedStaff, priority: form.priority, action: form.action, support: form.support, target_date: form.target_date || null });
    if (error) alert(error.message);
    else {
      alert('✅ Development Plan added!'); setForm({ priority: '', action: '', support: '', target_date: '' }); setShowForm(false);
      supabase.from('development_plans').select('*').eq('staff_id', selectedStaff).order('created_at', { ascending: false }).then(({ data }) => setPlans(data || []));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Development Plan</h3>
        <div style={{ marginTop: 15 }}>
          <label><b>Select Staff:</b> </label>
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} disabled={userRole === 'teacher'} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 200, marginLeft: 10, boxSizing: 'border-box' }}>
            <option value="">-- Select Staff --</option>
            {isReviewer ? staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>) : <option value={profile?.id}>{profile?.full_name}</option>}
          </select>
        </div>
      </div>

      {selectedStaff && (
        <>
          {isReviewer && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> {showForm ? 'Cancel' : 'Add New Goal'}</button>
              {showForm && (
                <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginTop: 20 }}>
                  <label>Priority:<br/><input value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} placeholder="e.g. High" style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required /></label>
                  <label>Target Date:<br/><input type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} /></label>
                  <label style={{ gridColumn: '1 / -1' }}>Action Plan:<br/><input value={form.action} onChange={e => setForm({...form, action: e.target.value})} placeholder="What needs to be done?" style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} required /></label>
                  <label style={{ gridColumn: '1 / -1' }}>Support Required:<br/><input value={form.support} onChange={e => setForm({...form, support: e.target.value})} placeholder="Training, resources, etc." style={{ width: '100%', padding: 10, marginTop: 5, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} /></label>
                  <button type="submit" style={{ gridColumn: '1 / -1', background: '#16a34a', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Goal</button>
                </form>
              )}
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3>Active Goals</h3>
            {plans.length === 0 ? <p style={{ color: '#64748b' }}>No development plans found.</p> : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 15, minWidth: 500 }}>
                  <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Priority</th><th style={{ padding: 12 }}>Action</th><th style={{ padding: 12 }}>Support</th><th style={{ padding: 12 }}>Target Date</th></tr></thead>
                  <tbody>{plans.map(p => (<tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: 12, fontWeight: 'bold', color: p.priority === 'High' ? '#ef4444' : '#2563eb' }}>{p.priority}</td><td style={{ padding: 12 }}>{p.action}</td><td style={{ padding: 12 }}>{p.support || '-'}</td><td style={{ padding: 12 }}>{p.target_date || 'TBD'}</td></tr>))}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// 10. REPORTS
// ==========================================
function ReportsPage() {
  const [report, setReport] = useState([]);
  useEffect(() => {
    async function generate() {
      const { data: staff } = await supabase.from('profiles').select('id, full_name').eq('active', true);
      const { data: appr } = await supabase.from('appraisals').select('staff_id, final_score').eq('status', 'Approved');
      const { data: points } = await supabase.from('special_point_entries').select('staff_id, points_approved').eq('status', 'Approved');
      const final = (staff || []).map(s => {
        const baseScore = appr?.find(a => a.staff_id === s.id)?.final_score || 0;
        const sp = points?.filter(p => p.staff_id === s.id).reduce((sum, curr) => sum + curr.points_approved, 0) || 0;
        const combined = baseScore + sp;
        return { ...s, baseScore: baseScore.toFixed(2), sp, finalScore: Math.min(100, combined).toFixed(2), extra: Math.max(0, combined - 100) };
      });
      setReport(final);
    }
    generate();
  }, []);

  function downloadCSV() {
    if (report.length === 0) return alert("No data to export");
    const headers = ['Staff Name', 'Appraisal Base', 'Special Points', 'Final Score (Max 100)', 'Extra Points'];
    const rows = report.map(r => [r.full_name, r.baseScore, r.sp, r.finalScore, r.extra]);
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Staff_Appraisal_Report_2026-2027.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  return (
    <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Final Appraisal Summary</h3>
        <button onClick={downloadCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}><Download size={18} /> Export CSV</button>
      </div>
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, minWidth: 600 }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12, textAlign: 'left' }}>Staff</th><th style={{ padding: 12, textAlign: 'center' }}>Appraisal Base</th><th style={{ padding: 12, textAlign: 'center' }}>Special Points</th><th style={{ padding: 12, textAlign: 'center' }}>Final (100)</th><th style={{ padding: 12, textAlign: 'center' }}>Extra</th></tr></thead>
          <tbody>{report.map(r => (<tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: 12, fontWeight: 500 }}>{r.full_name}</td><td style={{ padding: 12, textAlign: 'center' }}>{r.baseScore}</td><td style={{ padding: 12, textAlign: 'center', color: '#2563eb' }}>+{r.sp}</td><td style={{ padding: 12, textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>{r.finalScore}</td><td style={{ padding: 12, textAlign: 'center', fontWeight: 'bold', color: r.extra > 0 ? '#ea580c' : '#94a3b8' }}>{r.extra > 0 ? `+${r.extra} Extra` : '-'}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 11. ACCOUNT SETTINGS
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