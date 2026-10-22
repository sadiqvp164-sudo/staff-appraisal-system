import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, 
  FileCheck2, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, 
  Search, ShieldCheck, Users, X, Upload, Check, Download, Target, Settings, Key, AlertTriangle, Edit, Trash2, Camera, Send, ThumbsUp, Eye
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

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'scores', label: 'Staff Leaderboard', icon: Award, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'staff', label: 'Staff Directory', icon: Users, roles: ['admin', 'coordinator', 'appraisal_authority'] },
  { id: 'duties', label: 'Duty & Tasks', icon: CalendarDays, roles: ['admin', 'coordinator', 'teacher'] },
  { id: 'evidence', label: 'Evidence Portfolio', icon: FileCheck2, roles: ['admin', 'coordinator', 'teacher', 'appraisal_authority'] },
  { id: 'appraisal', label: 'Appraisal Workflow', icon: GraduationCap, roles: ['admin', 'teacher', 'appraisal_authority', 'coordinator'] },
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
          {active === 'duties' && <DutyAndTasksPage userRole={userRole} profile={profile} />}
          {active === 'evidence' && <EvidencePortfolioPage userRole={userRole} profile={profile} />}
          {active === 'appraisal' && <AppraisalWorkflowPage userRole={userRole} profile={profile} />}
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
// 3. STAFF LEADERBOARD (Fixed Score Separation)
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
        // Official Appraisal is capped at 100
        const base = appr?.find(a => a.staff_id === s.id)?.final_score || 0;
        const officialScore = Math.min(100, base);
        
        // Bonus Points are separate
        const bonus = points?.filter(p => p.staff_id === s.id).reduce((sum, curr) => sum + curr.points_approved, 0) || 0;
        
        return {
          ...s,
          officialScore,
          bonus,
          totalEarned: officialScore + bonus // Used just for sorting
        };
      });
      
      scores.sort((a, b) => b.totalEarned - a.totalEarned);
      setData(scores);
      setLoading(false);
    }
    fetchScores();
  }, []);

  function downloadCSV() {
    if (data.length === 0) return alert("No data to export");
    const headers = ['Staff Name', 'Department', 'Official Appraisal (Max 100)', 'Bonus Points'];
    const rows = data.map(r => [r.full_name, r.department || '-', r.officialScore.toFixed(2), r.bonus]);
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
          <p style={{ color: '#64748b', margin: 0 }}>Official Appraisal Scores (Max 100) and separate Bonus Points.</p>
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
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[1].officialScore.toFixed(1)}</div>
            {top3[1].bonus > 0 && <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 'bold' }}>+{top3[1].bonus} Bonus</div>}
          </div>
        )}

        {top3[0] && (
          <div className="podium-1st" style={{ background: '#fffbeb', padding: 30, borderRadius: 16, border: '3px solid #f59e0b', width: 260, textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)', transform: 'translateY(-20px)' }}>
            <div style={{ width: 110, height: 110, margin: '0 auto 15px', borderRadius: '50%', border: '5px solid #f59e0b', overflow: 'hidden', background: '#fef3c7' }}>
              {top3[0].avatar_url ? <img src={top3[0].avatar_url} alt="1st" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{fontSize: 40, paddingTop: 25}}>{top3[0].full_name.charAt(0)}</div>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#d97706', marginBottom: 5 }}>1st Place 🥇</div>
            <div style={{ fontWeight: 'bold', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top3[0].full_name}</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[0].officialScore.toFixed(1)}</div>
            {top3[0].bonus > 0 && <div style={{ fontSize: 14, color: '#ea580c', fontWeight: 'bold' }}>+{top3[0].bonus} Bonus</div>}
          </div>
        )}

        {top3[2] && (
          <div className="podium-3rd" style={{ background: '#fff', padding: 20, borderRadius: 16, border: '2px solid #b45309', width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 15px', borderRadius: '50%', border: '4px solid #b45309', overflow: 'hidden', background: '#f1f5f9' }}>
              {top3[2].avatar_url ? <img src={top3[2].avatar_url} alt="3rd" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{fontSize: 32, paddingTop: 15}}>{top3[2].full_name.charAt(0)}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#b45309', marginBottom: 5 }}>3rd Place 🥉</div>
            <div style={{ fontWeight: 'bold', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top3[2].full_name}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 10 }}>{top3[2].officialScore.toFixed(1)}</div>
            {top3[2].bonus > 0 && <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 'bold' }}>+{top3[2].bonus} Bonus</div>}
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
                <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: 18 }}>{r.officialScore.toFixed(1)}</div>
                {r.bonus > 0 && <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 'bold' }}>+{r.bonus} Bonus</div>}
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
// 4. STAFF DIRECTORY (Modal form, no prompts)
// ==========================================
function StaffDirectoryPage({ currentUserRole }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', staff_code: '', department: '', designation: '', role: 'teacher' });
  const fileInputRef = useRef(null);
  const [uploadingFor, setUploadingFor] = useState(null);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setStaff(data || []);
    setLoading(false);
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    let finalEmail = formData.email;
    if (!finalEmail.includes('@')) finalEmail = `${finalEmail.trim()}@staff.local`;

    const { data, error } = await supabase.functions.invoke("create-staff", {
      body: { 
        full_name: formData.full_name.trim(), 
        email: finalEmail, 
        staff_code: formData.staff_code.trim(), 
        department: formData.department.trim(), 
        designation: formData.designation.trim(),
        role: formData.role
      }
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✅ Staff created!");
      setShowModal(false);
      setFormData({ full_name: '', email: '', staff_code: '', department: '', designation: '', role: 'teacher' });
      fetchStaff();
    }
  }

  async function updateRole(id, newRole) {
    if (currentUserRole !== 'admin') return alert('Only admins can change roles.');
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) alert(error.message); else fetchStaff();
  }

  async function handlePhotoUpload(e, staffId) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFor(staffId);
    
    const filePath = `public/${staffId}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploadingFor(null); return; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', staffId);
    setUploadingFor(null); fetchStaff();
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, uploadingFor)} accept="image/*" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Staff Members</h3>
        {currentUserRole === 'admin' && (
          <button onClick={() => setShowModal(true)} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={16} /> Add New Staff
          </button>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0 }}>Add New Staff</h2>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <input placeholder="User ID or Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <input placeholder="Staff Code" value={formData.staff_code} onChange={e => setFormData({...formData, staff_code: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <input placeholder="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <input placeholder="Designation" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value="teacher">Teacher</option><option value="coordinator">Coordinator</option><option value="appraisal_authority">Appraisal Authority</option>
              </select>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12 }}>Photo</th><th style={{ padding: 12 }}>Name & Email</th><th style={{ padding: 12 }}>Role</th><th style={{ padding: 12 }}>Department</th></tr></thead>
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
function DutyAndTasksPage({ userRole, profile }) {
  const [activeTab, setActiveTab] = useState('duties');
  const [duties, setDuties] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [showDutyForm, setShowDutyForm] = useState(false);
  const [dutyForm, setDutyForm] = useState({ title: '', staff_id: '', end_date: '', domain_code: 'D3', marks: 5 });
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', staff_id: '', domain_code: 'D7', marks: 5 });

  const isAdmin = userRole === 'admin' || userRole === 'coordinator';

  useEffect(() => {
    fetchData();
    if (isAdmin) supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || []));
  }, [isAdmin]);

  async function fetchData() {
    let dQuery = supabase.from('duty_records').select('*, profiles(full_name)');
    if (userRole === 'teacher') dQuery = dQuery.eq('staff_id', profile?.id);
    const { data: dData } = await dQuery.order('created_at', { ascending: false });
    setDuties(dData || []);

    let tQuery = supabase.from('special_tasks').select('*, profiles(full_name)');
    if (userRole === 'teacher') tQuery = tQuery.eq('staff_id', profile?.id);
    const { data: tData } = await tQuery.order('created_at', { ascending: false });
    setTasks(tData || []);
  }

  async function assignDuty(e) {
    e.preventDefault();
    await supabase.from('duty_records').insert({ ...dutyForm, status: 'Pending' });
    alert('Duty Assigned!'); setShowDutyForm(false); setDutyForm({ title: '', staff_id: '', end_date: '', domain_code: 'D3', marks: 5 }); fetchData();
  }

  async function createTask(e) {
    e.preventDefault();
    await supabase.from('special_tasks').insert({ ...taskForm, status: 'Pending' });
    alert('Task Created!'); setShowTaskForm(false); setTaskForm({ title: '', staff_id: '', domain_code: 'D7', marks: 5 }); fetchData();
  }

  async function markDone(type, id) {
    const table = type === 'duty' ? 'duty_records' : 'special_tasks';
    await supabase.from(table).update({ status: 'Completed' }).eq('id', id);
    fetchData();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        <button onClick={() => setActiveTab('duties')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: activeTab === 'duties' ? '#2563eb' : '#fff', color: activeTab === 'duties' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Duties & Monitoring</button>
        <button onClick={() => setActiveTab('tasks')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: activeTab === 'tasks' ? '#2563eb' : '#fff', color: activeTab === 'tasks' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Special Tasks</button>
      </div>

      {activeTab === 'duties' && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Duty Records</h3>
            {isAdmin && <button onClick={() => setShowDutyForm(!showDutyForm)} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}><Plus size={16}/> Assign Duty</button>}
          </div>
          
          {showDutyForm && (
            <form onSubmit={assignDuty} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <input placeholder="Duty Title" value={dutyForm.title} onChange={e => setDutyForm({...dutyForm, title: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', flex: 1 }} />
              <select value={dutyForm.staff_id} onChange={e => setDutyForm({...dutyForm, staff_id: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value="">Select Staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <select value={dutyForm.domain_code} onChange={e => setDutyForm({...dutyForm, domain_code: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                {domains.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
              </select>
              <input type="number" placeholder="Marks" value={dutyForm.marks} onChange={e => setDutyForm({...dutyForm, marks: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', width: 80 }} />
              <input type="date" value={dutyForm.end_date} onChange={e => setDutyForm({...dutyForm, end_date: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Save</button>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12, textAlign: 'left' }}>Staff</th><th style={{ padding: 12, textAlign: 'left' }}>Title</th><th style={{ padding: 12, textAlign: 'left' }}>Domain</th><th style={{ padding: 12, textAlign: 'left' }}>Status</th><th style={{ padding: 12, textAlign: 'left' }}>Action</th></tr></thead>
            <tbody>
              {duties.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{d.profiles?.full_name}</td>
                  <td style={{ padding: 12 }}>{d.title}</td>
                  <td style={{ padding: 12 }}>{d.domain_code} (+{d.marks})</td>
                  <td style={{ padding: 12 }}><span style={{ padding: '4px 8px', background: d.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: d.status === 'Completed' ? '#166534' : '#92400e', borderRadius: 12, fontSize: 12 }}>{d.status}</span></td>
                  <td style={{ padding: 12 }}>{d.status !== 'Completed' && <button onClick={() => markDone('duty', d.id)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Mark Done</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Special Tasks</h3>
            {isAdmin && <button onClick={() => setShowTaskForm(!showTaskForm)} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}><Plus size={16}/> Create Task</button>}
          </div>

          {showTaskForm && (
            <form onSubmit={createTask} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <input placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', flex: 1 }} />
              <select value={taskForm.staff_id} onChange={e => setTaskForm({...taskForm, staff_id: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value="">Select Staff</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <select value={taskForm.domain_code} onChange={e => setTaskForm({...taskForm, domain_code: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                {domains.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
              </select>
              <input type="number" placeholder="Marks" value={taskForm.marks} onChange={e => setTaskForm({...taskForm, marks: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', width: 80 }} />
              <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Save</button>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12, textAlign: 'left' }}>Staff</th><th style={{ padding: 12, textAlign: 'left' }}>Title</th><th style={{ padding: 12, textAlign: 'left' }}>Domain</th><th style={{ padding: 12, textAlign: 'left' }}>Status</th><th style={{ padding: 12, textAlign: 'left' }}>Action</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{t.profiles?.full_name}</td>
                  <td style={{ padding: 12 }}>{t.title}</td>
                  <td style={{ padding: 12 }}>{t.domain_code} (+{t.marks})</td>
                  <td style={{ padding: 12 }}><span style={{ padding: '4px 8px', background: t.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: t.status === 'Completed' ? '#166534' : '#92400e', borderRadius: 12, fontSize: 12 }}>{t.status}</span></td>
                  <td style={{ padding: 12 }}>{t.status !== 'Completed' && <button onClick={() => markDone('task', t.id)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Mark Done</button>}</td>
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
// 6. EVIDENCE PORTFOLIO (New Page)
// ==========================================
function EvidencePortfolioPage({ userRole, profile }) {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', domain_code: 'D1' });
  const fileRef = useRef(null);

  const isReviewer = userRole === 'admin' || userRole === 'coordinator' || userRole === 'appraisal_authority';

  useEffect(() => { fetchEvidence(); }, []);

  async function fetchEvidence() {
    let query = supabase.from('evidence_files').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (!isReviewer) query = query.eq('staff_id', profile?.id);
    const { data } = await query;
    setEvidence(data || []);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !form.title) return alert("Fill all fields");
    setUploading(true);

    const filePath = `${profile.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('evidence').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(filePath);
    
    const { error: dbError } = await supabase.from('evidence_files').insert({
      staff_id: profile.id,
      domain_code: form.domain_code,
      title: form.title,
      file_url: urlData.publicUrl,
      status: 'Pending'
    });

    setUploading(false);
    if (dbError) alert(dbError.message);
    else { alert('✅ Evidence Uploaded! Waiting for review.'); setForm({ title: '', domain_code: 'D1' }); setFile(null); if(fileRef.current) fileRef.current.value = ''; fetchEvidence(); }
  }

  async function handleReview(id, newStatus) {
    const remarks = prompt("Enter remarks (optional):");
    await supabase.from('evidence_files').update({ status: newStatus, reviewer_remarks: remarks }).eq('id', id);
    fetchEvidence();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!isReviewer && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h3>Upload New Evidence</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap', marginTop: 15 }}>
            <input placeholder="Evidence Title (e.g., Lesson Plan)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', flex: '1 1 200px' }} />
            <select value={form.domain_code} onChange={e => setForm({...form, domain_code: e.target.value})} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              {domains.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
            </select>
            <input type="file" ref={fileRef} onChange={e => setFile(e.target.files[0])} required style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            <button type="submit" disabled={uploading} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Evidence Records</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: 12, textAlign: 'left' }}>Staff</th><th style={{ padding: 12, textAlign: 'left' }}>Title</th><th style={{ padding: 12, textAlign: 'left' }}>Domain</th><th style={{ padding: 12, textAlign: 'left' }}>Status</th><th style={{ padding: 12, textAlign: 'left' }}>Action</th></tr></thead>
          <tbody>
            {evidence.map(ev => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12 }}>{ev.profiles?.full_name}</td>
                <td style={{ padding: 12 }}><a href={ev.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{ev.title}</a></td>
                <td style={{ padding: 12 }}>{ev.domain_code}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: '4px 8px', background: ev.status === 'Verified' ? '#dcfce7' : ev.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: ev.status === 'Verified' ? '#166534' : ev.status === 'Rejected' ? '#991b1b' : '#92400e', borderRadius: 12, fontSize: 12 }}>{ev.status}</span>
                  {ev.reviewer_remarks && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Remarks: {ev.reviewer_remarks}</div>}
                </td>
                <td style={{ padding: 12 }}>
                  {isReviewer && ev.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => handleReview(ev.id, 'Verified')} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Verify</button>
                      <button onClick={() => handleReview(ev.id, 'Rejected')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 7. APPRAISAL WORKFLOW (Teacher -> Coord -> Authority)
// ==========================================
function AppraisalWorkflowPage({ userRole, profile }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [appraisalData, setAppraisalData] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [status, setStatus] = useState('Draft');
  const [saving, setSaving] = useState(false);
  const [coordinatorRemarks, setCoordinatorRemarks] = useState('');
  const [authorityRemarks, setAuthorityRemarks] = useState('');

  const isTeacher = userRole === 'teacher';
  const isCoordinator = userRole === 'coordinator' || userRole === 'admin';
  const isAuthority = userRole === 'appraisal_authority' || userRole === 'admin';

  useEffect(() => {
    if (isTeacher) { setSelectedStaff(profile?.id); setStaffList([{id: profile?.id, full_name: profile?.full_name}]); } 
    else { supabase.from('profiles').select('id, full_name').eq('active', true).then(({ data }) => setStaffList(data || [])); }
  }, [userRole, profile]);

  useEffect(() => {
    if (!selectedStaff) return;
    
    supabase.from('appraisals').select('*, appraisal_ratings(domain_code, rating, comments)').eq('staff_id', selectedStaff).eq('cycle', '2026-2027').maybeSingle().then(({ data }) => {
      if (data) {
        setAppraisalData(data);
        setStatus(data.status || 'Draft');
        setCoordinatorRemarks(data.coordinator_remarks || '');
        setAuthorityRemarks(data.authority_remarks || '');
        if (data.appraisal_ratings) {
          const rMap = {}, cMap = {};
          data.appraisal_ratings.forEach(r => { rMap[r.domain_code] = r.rating; cMap[r.domain_code] = r.comments; });
          setRatings(rMap); setComments(cMap);
        }
      } else { 
        setAppraisalData(null); setStatus('Draft'); setRatings({}); setComments({}); setCoordinatorRemarks(''); setAuthorityRemarks('');
      }
    });
  }, [selectedStaff]);

  // Calculate Auto Marks (Only from Verified Evidence & Completed Tasks)
  const [autoMarks, setAutoMarks] = useState({});
  useEffect(() => {
    if (!selectedStaff) return;
    Promise.all([
      supabase.from('evidence_files').select('domain_code').eq('staff_id', selectedStaff).eq('status', 'Verified'),
      supabase.from('duty_records').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed'),
      supabase.from('special_tasks').select('domain_code, marks').eq('staff_id', selectedStaff).eq('status', 'Completed')
    ]).then(([evRes, dutyRes, taskRes]) => {
      const marksMap = {};
      // Evidence gives 2 marks per verified item
      (evRes.data || []).forEach(item => { if(item.domain_code) marksMap[item.domain_code] = (marksMap[item.domain_code] || 0) + 2; });
      // Duties & Tasks give their assigned marks
      [...(dutyRes.data || []), ...(taskRes.data || [])].forEach(item => {
        if (item.domain_code && item.marks) marksMap[item.domain_code] = (marksMap[item.domain_code] || 0) + Number(item.marks);
      });
      setAutoMarks(marksMap);
    });
  }, [selectedStaff, status]);

  const getDomainTotal = (domainCode, weight) => {
    const manualScore = ((ratings[domainCode] || 0) / 5) * weight;
    const autoScore = autoMarks[domainCode] || 0;
    return Math.min(weight, manualScore + autoScore); // Max weight limit
  };

  const totalScore = domains.reduce((sum, d) => sum + getDomainTotal(d.code, d.weight), 0);

  async function saveProgress(newStatus, remarksToSave = null) {
    if (!selectedStaff) return alert('Select staff first');
    setSaving(true);

    const payload = { 
      staff_id: selectedStaff, 
      cycle: '2026-2027', 
      final_score: totalScore, 
      status: newStatus,
      coordinator_remarks: isCoordinator ? coordinatorRemarks : (appraisalData?.coordinator_remarks || null),
      authority_remarks: isAuthority ? authorityRemarks : (appraisalData?.authority_remarks || null)
    };

    try {
      const { data: appr, error: apprErr } = await supabase.from('appraisals').upsert(payload, { onConflict: 'staff_id,cycle' }).select().single();
      if (apprErr) throw apprErr;

      const ratingRows = domains.map(d => ({ appraisal_id: appr.id, domain_code: d.code, rating: ratings[d.code] || 3, comments: comments[d.code] || '' }));
      await supabase.from('appraisal_ratings').upsert(ratingRows, { onConflict: 'appraisal_id,domain_code' });
      
      setStatus(newStatus);
      alert('✅ Saved Successfully!');
    } catch (err) { alert('Error: ' + err.message); } finally { setSaving(false); }
  }

  const isReadOnly = 
    status === 'Approved' || 
    (isTeacher && status !== 'Draft' && status !== 'Returned') ||
    (isCoordinator && !isAuthority && status !== 'Submitted' && status !== 'Coordinator_Reviewed');

  const statusColor = { 
    'Draft': { bg: '#f1f5f9', text: '#475569' }, 
    'Submitted': { bg: '#e0e7ff', text: '#3730a3' }, 
    'Coordinator_Reviewed': { bg: '#fae8ff', text: '#86198f' },
    'Returned': { bg: '#fee2e2', text: '#991b1b' }, 
    'Approved': { bg: '#dcfce7', text: '#166534' } 
  }[status] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Appraisal Status</h3>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', background: statusColor.bg, color: statusColor.text }}>{status}</span>
          </div>
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} disabled={isTeacher} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 200 }}>
            <option value="">-- Select Staff --</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        
        <div style={{ textAlign: 'right', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>Official Appraisal Score (Max 100)</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginTop: 5 }}>{totalScore.toFixed(2)}</div>
        </div>
      </div>

      {selectedStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {domains.map(d => {
            const autoMark = autoMarks[d.code] || 0;
            const manualMark = ((ratings[d.code] || 0) / 5) * d.weight;
            const domainTotal = getDomainTotal(d.code, d.weight);
            
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
                      <span>Auto (Evidence/Tasks):</span> <span>+{autoMark}</span>
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
                  <button disabled={isReadOnly} onClick={() => setRatings(prev => ({...prev, [d.code]: null}))} style={{ flex: '0 0 60px', padding: 10, borderRadius: 8, border: ratings[d.code] === null ? `2px solid #64748b` : '1px solid #cbd5e1', background: ratings[d.code] === null ? '#f1f5f9' : '#fff', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#475569' }}>N/A</button>
                </div>
                <textarea readOnly={isReadOnly} placeholder="Comments/Reflections..." value={comments[d.code] || ''} onChange={e => setComments(prev => ({...prev, [d.code]: e.target.value}))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 60, fontFamily: 'inherit', background: isReadOnly ? '#f1f5f9' : '#fff', boxSizing: 'border-box' }} />
              </div>
            );
          })}

          {/* Remarks Sections */}
          {appraisalData?.coordinator_remarks && (
            <div style={{ background: '#fdf4ff', padding: 15, borderRadius: 8, border: '1px solid #fae8ff' }}>
              <strong style={{ color: '#86198f' }}>Coordinator Remarks:</strong> {appraisalData.coordinator_remarks}
            </div>
          )}
          {appraisalData?.authority_remarks && (
            <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <strong style={{ color: '#1d4ed8' }}>Authority Remarks:</strong> {appraisalData.authority_remarks}
            </div>
          )}

          {/* Action Buttons by Role */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 40 }}>
            
            {isTeacher && (status === 'Draft' || status === 'Returned') && (
              <>
                <button onClick={() => saveProgress('Draft')} disabled={saving} style={{ flex: '1 1 150px', background: '#64748b', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Save Draft</button>
                <button onClick={() => saveProgress('Submitted')} disabled={saving} style={{ flex: '2 1 250px', background: '#2563eb', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Submit to Coordinator</button>
              </>
            )}

            {isCoordinator && status === 'Submitted' && (
              <>
                <div style={{ width: '100%', marginBottom: 10 }}>
                  <textarea placeholder="Enter Coordinator Remarks / Recommendations..." value={coordinatorRemarks} onChange={e => setCoordinatorRemarks(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 60 }} />
                </div>
                <button onClick={() => saveProgress('Returned')} disabled={saving} style={{ flex: '1 1 150px', background: '#ef4444', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Return for Edit</button>
                <button onClick={() => saveProgress('Coordinator_Reviewed')} disabled={saving} style={{ flex: '2 1 250px', background: '#8b5cf6', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Forward to Authority</button>
              </>
            )}

            {isAuthority && status === 'Coordinator_Reviewed' && (
              <>
                <div style={{ width: '100%', marginBottom: 10 }}>
                  <textarea placeholder="Enter Authority Final Remarks..." value={authorityRemarks} onChange={e => setAuthorityRemarks(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 60 }} />
                </div>
                <button onClick={() => saveProgress('Returned')} disabled={saving} style={{ flex: '1 1 150px', background: '#ef4444', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Return to Coordinator</button>
                <button onClick={() => saveProgress('Approved')} disabled={saving} style={{ flex: '2 1 250px', background: '#16a34a', color: '#fff', padding: 16, borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Final Approve & Lock</button>
              </>
            )}

            {status === 'Approved' && (
              <div style={{ width: '100%', padding: 16, background: '#dcfce7', color: '#166534', borderRadius: 8, textAlign: 'center', fontWeight: 'bold' }}>
                ✅ This appraisal has been Final Approved.
              </div>
            )}
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