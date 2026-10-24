import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../layouts/Layout.jsx';
import { useShellData } from '../App.jsx';
import { Spinner } from '../components/ui.jsx';
import { UserRound, Mail, Phone, Building2, IdCard, BookOpen, GraduationCap, ShieldCheck, Power, Camera, Save, LockKeyhole, BriefcaseBusiness, MapPin, Linkedin, BookMarked, CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';

const ROLE = {
  student: { label: 'Student', icon: GraduationCap, intro: 'Keep your academic identity and contact details up to date.', color: '#2563eb' },
  faculty: { label: 'Faculty', icon: BookOpen, intro: 'Manage your professional information and teaching profile.', color: '#0d9488' },
  hod: { label: 'Head of Department', icon: Building2, intro: 'Maintain your leadership profile and department information.', color: '#7c3aed' },
  admin: { label: 'System Administrator', icon: ShieldCheck, intro: 'Manage your administrator profile and account security.', color: '#d97706' },
};
const inputStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box' };

export default function Profile() {
  const { user, setUser } = useAuth();
  const { unread, badges } = useShellData();
  const fileRef = useRef(null);
  const [academics, setAcademics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '', phone: user.phone || '', profileImage: user.profileImage || '', bio: user.bio || '',
      officeLocation: user.officeLocation || '', linkedin: user.linkedin || '', semester: user.semester ?? '',
      section: user.section || '', designation: user.designation || '', qualification: user.qualification || '',
      teachingExperienceYears: user.teachingExperienceYears ?? 0,
      subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '', hodOf: user.hodOf || '',
    });
  }, [user?._id]);

  useEffect(() => {
    if (user?.role === 'student') api.get('/students/me/academics').then(({ data }) => setAcademics(data)).catch(() => {});
  }, [user?._id, user?.role]);

  const role = ROLE[user?.role] || ROLE.student;
  const RoleIcon = role.icon;
  const initials = useMemo(() => (user?.name || 'User').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(), [user?.name]);
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file.');
    if (file.size > 8 * 1024 * 1024) return toast.error('Choose an image smaller than 8 MB.');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(reader.result); reader.readAsDataURL(file);
      });
      const img = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = dataUrl; });
      const scale = Math.min(1, 640 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.78);
      if (compressed.length > 1400000) return toast.error('This image could not be compressed enough. Try another photo.');
      set('profileImage', compressed); toast.success('Photo ready. Save your profile to apply it.');
    } catch { toast.error('Could not read that image. Please try another.'); }
  };

  const save = async (event) => {
    event?.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter your full name.');
    if (form.linkedin && !/^https:\/\/(www\.)?linkedin\.com\//i.test(form.linkedin.trim())) return toast.error('Enter a valid LinkedIn profile URL.');
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone, profileImage: form.profileImage, bio: form.bio, officeLocation: form.officeLocation, linkedin: form.linkedin };
      if (user.role === 'student') Object.assign(payload, { semester: form.semester === '' ? undefined : Number(form.semester), section: form.section });
      if (['faculty', 'hod'].includes(user.role)) Object.assign(payload, { designation: form.designation, qualification: form.qualification, teachingExperienceYears: Number(form.teachingExperienceYears) || 0, subjects: form.subjects });
      if (user.role === 'hod') payload.hodOf = form.hodOf;
      const { data } = await api.patch('/auth/me', payload);
      setUser(data.user); localStorage.setItem('ah_user', JSON.stringify(data.user));
      setForm(old => ({ ...old, ...data.user, subjects: Array.isArray(data.user.subjects) ? data.user.subjects.join(', ') : old.subjects }));
      toast.success('Your profile has been updated.');
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const changePw = async (event) => {
    event.preventDefault();
    if (pw.newPassword.length < 8) return toast.error('Use at least 8 characters for your new password.');
    if (pw.newPassword !== pw.confirmPassword) return toast.error('The new passwords do not match.');
    setPwBusy(true);
    try { await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); setPw({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password changed successfully.'); }
    catch (e) { toast.error(errText(e)); } finally { setPwBusy(false); }
  };

  const toggleAvailability = async () => {
    try { const { data } = await api.patch('/faculty/availability', { isAvailable: !user.isAvailable }); const updated = { ...user, isAvailable: data.isAvailable }; setUser(updated); localStorage.setItem('ah_user', JSON.stringify(updated)); toast.success(data.isAvailable ? 'You are now available for assignments.' : 'You are now unavailable.'); }
    catch (e) { toast.error(errText(e)); }
  };

  if (!user) return <Spinner />;
  const field = (label, key, options = {}) => <div className="field" key={key} style={{ marginBottom: 15 }}><label htmlFor={`profile-${key}`}>{label}{options.required ? ' *' : ''}</label>{options.textarea ? <textarea id={`profile-${key}`} value={form[key] ?? ''} onChange={e => set(key, e.target.value)} rows={4} maxLength={700} placeholder={options.placeholder || ''} style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }} /> : <input id={`profile-${key}`} type={options.type || 'text'} value={form[key] ?? ''} onChange={e => set(key, e.target.value)} placeholder={options.placeholder || ''} min={options.min} max={options.max} maxLength={options.maxLength} required={options.required} style={inputStyle} />}</div>;
  const readOnly = (label, value, icon) => <div key={label} style={{ padding: '12px 14px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, minWidth: 0 }}><div className="k" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{icon}{label}</div><div className="v" style={{ fontSize: 14, marginTop: 6, overflowWrap: 'anywhere' }}>{value || 'Not provided'}</div></div>;

  return <Layout unread={unread} extraBadges={badges}>
    <div className="page-head" style={{ marginBottom: 22 }}><div><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: role.color, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}><Sparkles size={15} /> Personal workspace</div><h1>My Profile</h1><p>{role.intro}</p></div></div>

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.6fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <section className="card" style={{ overflow: 'hidden' }}>
          <div style={{ height: 92, background: `linear-gradient(120deg, ${role.color}, #102f50)` }} />
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, marginTop: -43, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                {form.profileImage ? <img src={form.profileImage} alt="Profile" style={{ width: 92, height: 92, borderRadius: 24, objectFit: 'cover', border: '4px solid var(--card, #fff)', background: '#fff' }} /> : <div className="avatar" style={{ width: 92, height: 92, borderRadius: 24, fontSize: 28, background: user.avatarColor || role.color, border: '4px solid var(--card, #fff)', boxSizing: 'border-box' }}>{initials}</div>}
                <button type="button" title="Upload profile photo" onClick={() => fileRef.current?.click()} className="btn btn-primary btn-sm" style={{ position: 'absolute', right: -8, bottom: -6, width: 34, height: 34, padding: 0, borderRadius: 12, display: 'grid', placeItems: 'center' }}><Camera size={16} /></button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { uploadPhoto(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
              <span className="pill info" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><RoleIcon size={13} /> {role.label}</span>
            </div>
            <h2 style={{ margin: '16px 0 4px', overflowWrap: 'anywhere' }}>{user.name}</h2>
            <div style={{ color: 'var(--muted)', fontSize: 13, overflowWrap: 'anywhere' }}>{user.email}</div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12, marginBottom: 0 }}>JPG, PNG, WEBP or GIF · Maximum 8 MB. Photo is resized before saving.</p>
            {form.profileImage && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => set('profileImage', '')}><RotateCcw size={14} /> Remove photo</button>}
          </div>
        </section>

        <section className="card"><div className="card-head"><h3><UserRound size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Account overview</h3></div><div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
          {readOnly('Institution email', user.email, <Mail size={13} />)}
          {readOnly(user.role === 'student' ? 'Register / roll number' : user.role === 'admin' ? 'Account type' : 'Employee ID', user.rollNumber || user.employeeId || role.label, <IdCard size={13} />)}
          {readOnly('Department', user.hodOf || user.department, <Building2 size={13} />)}
          {readOnly('Account status', user.isActive === false ? 'Inactive' : 'Active', <CheckCircle2 size={13} />)}
        </div></section>

        {user.role === 'student' && academics && <section className="card"><div className="card-head"><h3><GraduationCap size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Academic snapshot</h3></div><div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}><div><div className="k">CGPA</div><div className="v" style={{ fontSize: 24, color: 'var(--green)' }}>{academics.student?.cgpa ?? '—'}</div></div><div><div className="k">Attendance</div><div className="v" style={{ fontSize: 24, color: 'var(--blue)' }}>{academics.student?.attendance ?? '—'}{academics.student?.attendance != null ? '%' : ''}</div></div><div><div className="k">Queries raised</div><div className="v" style={{ fontSize: 24 }}>{academics.ticketCount ?? '—'}</div></div></div></section>}

        {['faculty', 'hod'].includes(user.role) && <section className="card"><div className="card-head"><h3><BriefcaseBusiness size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Work preferences</h3></div><div className="card-body"><p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>Control whether the assignment engine can assign new queries to you.</p><button type="button" className={`btn ${user.isAvailable ? 'btn-success' : 'btn-ghost'}`} onClick={toggleAvailability}><Power size={15} /> {user.isAvailable ? 'Available for assignments' : 'Unavailable for assignments'}</button>{user.role === 'faculty' && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0, marginTop: 12 }}>Current workload: {user.currentLoad ?? 0} / {user.maxOpenTickets ?? 6} open tickets</p>}</div></section>}
      </div>

      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <section className="card"><div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><h3><UserRound size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Personal information</h3><span style={{ color: 'var(--muted)', fontSize: 12 }}>Editable fields marked below</span></div><div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 16px' }}>{field('Full name', 'name', { required: true, placeholder: 'Your full name', maxLength: 100 })}{field('Phone number', 'phone', { placeholder: '+91 98765 43210', maxLength: 20 })}</div>
          {field('Short bio / About me', 'bio', { textarea: true, placeholder: user.role === 'student' ? 'Your interests, goals, or areas you are learning…' : 'A short professional introduction, interests, and areas of expertise…' })}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 16px' }}>{field('Office / room location', 'officeLocation', { placeholder: 'Building, block, room (optional)' })}{field('LinkedIn profile', 'linkedin', { placeholder: 'https://www.linkedin.com/in/your-profile', maxLength: 200 })}</div>
        </div></section>

        {user.role === 'student' && <section className="card"><div className="card-head"><h3><GraduationCap size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Academic details</h3></div><div className="card-body"><p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>Your roll number, department, year, and CGPA are maintained by your institution.</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px' }}><div className="field"><label>Semester</label><select value={form.semester} onChange={e => set('semester', e.target.value)} style={inputStyle}><option value="">Not set</option>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}</select></div>{field('Section', 'section', { placeholder: 'e.g. A', maxLength: 10 })}</div>{readOnly('Faculty advisor', academics?.advisor?.name ? `${academics.advisor.name}${academics.advisor.designation ? ` · ${academics.advisor.designation}` : ''}` : 'Contact your department for advisor details', <UserRound size={13} />)}</div></section>}

        {['faculty', 'hod'].includes(user.role) && <section className="card"><div className="card-head"><h3><BriefcaseBusiness size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Professional details</h3></div><div className="card-body"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0 16px' }}>{field('Designation', 'designation', { placeholder: 'Assistant Professor, Associate Professor…', maxLength: 100 })}{field('Highest qualification', 'qualification', { placeholder: 'M.E., M.Tech., Ph.D.…', maxLength: 100 })}{field('Teaching experience (years)', 'teachingExperienceYears', { type: 'number', min: 0, max: 60 })}{user.role === 'hod' && field('Department headed', 'hodOf', { placeholder: 'Department name', maxLength: 100 })}</div>{field('Subjects / areas of expertise', 'subjects', { textarea: true, placeholder: 'Enter subjects separated by commas, e.g. Computer Networks, DBMS, Operating Systems' })}<p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>Separate subjects with commas. Your employee ID, role, department assignment, and escalation level are institution-managed.</p></div></section>}

        {user.role === 'admin' && <section className="card"><div className="card-head"><h3><ShieldCheck size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Administrator details</h3></div><div className="card-body"><p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>Your administrator role and permissions are managed by the system. Use this section to keep your contact and office details current.</p>{readOnly('Access level', 'System Administrator', <ShieldCheck size={13} />)}</div></section>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}><button type="button" className="btn btn-ghost" onClick={() => setForm({ name: user.name || '', phone: user.phone || '', profileImage: user.profileImage || '', bio: user.bio || '', officeLocation: user.officeLocation || '', linkedin: user.linkedin || '', semester: user.semester ?? '', section: user.section || '', designation: user.designation || '', qualification: user.qualification || '', teachingExperienceYears: user.teachingExperienceYears ?? 0, subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '', hodOf: user.hodOf || '' })}><RotateCcw size={15} /> Reset changes</button><button type="button" onClick={() => save()} className="btn btn-primary" disabled={busy} style={{ minWidth: 150, justifyContent: 'center' }}>{busy ? <><span className="spinner" /> Saving…</> : <><Save size={16} /> Save profile</>}</button></div>

        <section className="card"><div className="card-head"><h3><LockKeyhole size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Account security</h3></div><form className="card-body" onSubmit={changePw}><p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>Use a unique password with at least 8 characters. Your password is never shown in your profile.</p><div className="field" style={{ marginBottom: 15 }}><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} minLength={8} required style={inputStyle} /></div><div className="field" style={{ marginBottom: 18 }}><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={e => setPw({ ...pw, confirmPassword: e.target.value })} minLength={8} required style={inputStyle} /></div><div className="field" style={{ marginBottom: 15 }}><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required style={inputStyle} /></div><button type="submit" className="btn btn-dark" disabled={pwBusy || !pw.currentPassword || pw.newPassword.length < 8 || pw.newPassword !== pw.confirmPassword}>{pwBusy ? 'Updating…' : <><LockKeyhole size={15} /> Update password</>}</button></form></section>
      </div>
    </div>
  </Layout>;
}
