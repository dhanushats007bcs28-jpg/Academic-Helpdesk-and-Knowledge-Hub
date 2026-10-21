import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../layouts/Layout.jsx';
import { useShellData } from '../App.jsx';
import { Spinner, StatCard } from '../components/ui.jsx';
import { Mail, Phone, Building2, IdCard, BookOpen, GraduationCap, ShieldCheck, Power } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { unread, badges } = useShellData();
  const [academics, setAcademics] = useState(null);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/students/me/academics').then(({ data }) => setAcademics(data)).catch(() => {});
    }
  }, [user]);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch('/auth/me', form);
      setUser(data.user); localStorage.setItem('ah_user', JSON.stringify(data.user));
      toast.success('Profile updated');
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const changePw = async () => {
    setBusy(true);
    try {
      await api.post('/auth/change-password', pw);
      setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed');
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await api.patch('/faculty/availability', { isAvailable: !user.isAvailable });
      const updated = { ...user, isAvailable: data.isAvailable };
      setUser(updated); localStorage.setItem('ah_user', JSON.stringify(updated));
      toast.success(data.isAvailable ? 'You are now available for assignments' : 'You are now unavailable');
    } catch (e) { toast.error(errText(e)); }
  };

  if (!user) return <Spinner />;

  const roleIcon = { student: GraduationCap, faculty: BookOpen, hod: Building2, admin: ShieldCheck }[user.role];
  const RoleIcon = roleIcon || GraduationCap;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>My Profile</h1><p>Manage your account details and credentials.</p></div></div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div className="avatar" style={{ width: 82, height: 82, fontSize: 30, background: user.avatarColor }}>{user.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</div>
              <div>
                <h2 style={{ marginBottom: 4 }}>{user.name}</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="pill info"><RoleIcon size={13} /> {user.role.toUpperCase()}</span>
                  {user.designation && <span style={{ color: 'var(--muted)', fontSize: 14 }}>{user.designation}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Account Information</h3></div>
            <div className="card-body">
              <div className="kv">
                <div><div className="k"><Mail size={12} style={{ verticalAlign: -2 }} /> Email</div><div className="v" style={{ fontSize: 14 }}>{user.email}</div></div>
                <div><div className="k"><Phone size={12} style={{ verticalAlign: -2 }} /> Phone</div><div className="v" style={{ fontSize: 14 }}>{user.phone || '—'}</div></div>
                <div><div className="k"><Building2 size={12} style={{ verticalAlign: -2 }} /> Department</div><div className="v" style={{ fontSize: 14 }}>{user.hodOf || user.department || '—'}</div></div>
                <div><div className="k"><IdCard size={12} style={{ verticalAlign: -2 }} /> {user.role === 'student' ? 'Roll Number' : 'Employee ID'}</div><div className="v" style={{ fontSize: 14 }}>{user.rollNumber || user.employeeId || '—'}</div></div>
                {user.role === 'faculty' && <div><div className="k">Escalation Level</div><div className="v" style={{ fontSize: 14 }}>Level {user.level} {user.level === 1 ? '(Junior)' : user.level === 2 ? '(Senior)' : '(HOD)'}</div></div>}
                {user.role === 'faculty' && <div><div className="k">Open Tickets</div><div className="v" style={{ fontSize: 14 }}>{user.currentLoad} / {user.maxOpenTickets}</div></div>}
              </div>
              {user.role === 'faculty' && (
                <button className={`btn btn-sm ${user.isAvailable ? 'btn-success' : 'btn-ghost'}`} style={{ marginTop: 20 }} onClick={toggleAvailability}>
                  <Power size={15} /> {user.isAvailable ? 'Available for Assignments' : 'Currently Unavailable'}
                </button>
              )}
            </div>
          </div>

          {academics && (
            <div className="card">
              <div className="card-head"><h3>Academic Snapshot</h3></div>
              <div className="card-body">
                <div className="grid-3" style={{ gap: 14 }}>
                  <div><div className="k">CGPA</div><div className="v" style={{ fontSize: 22, color: 'var(--green)' }}>{academics.student.cgpa}</div></div>
                  <div><div className="k">Attendance</div><div className="v" style={{ fontSize: 22, color: 'var(--blue)' }}>{academics.student.attendance}%</div></div>
                  <div><div className="k">Tickets Raised</div><div className="v" style={{ fontSize: 22 }}>{academics.ticketCount}</div></div>
                </div>
                {academics.advisor && <div style={{ marginTop: 18 }}><div className="k">Faculty Advisor</div><div className="v" style={{ fontSize: 14 }}>{academics.advisor.name} · {academics.advisor.designation}</div></div>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head"><h3>Edit Details</h3></div>
            <div className="card-body">
              <div className="field"><label>Full Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" /></div>
              <button className="btn btn-primary" disabled={busy} onClick={save}>Save Changes</button>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Change Password</h3></div>
            <div className="card-body">
              <div className="field"><label>Current Password</label><input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
              <div className="field"><label>New Password</label><input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="min 6 characters" /></div>
              <button className="btn btn-dark" disabled={busy || !pw.currentPassword || pw.newPassword.length < 6} onClick={changePw}>Update Password</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
