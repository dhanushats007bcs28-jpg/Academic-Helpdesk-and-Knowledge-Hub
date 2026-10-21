import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Building2, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = [
  { key: 'student', label: 'Student', icon: GraduationCap, email: 'student@mepcoeng.ac.in', pw: 'student123' },
  { key: 'faculty', label: 'Faculty', icon: Users, email: 'selvam.m@mepcoeng.ac.in', pw: 'faculty123' },
  { key: 'hod', label: 'HOD', icon: Building2, email: 'hod.cse@mepcoeng.ac.in', pw: 'hod123' },
  { key: 'admin', label: 'Admin', icon: ShieldCheck, email: 'admin@mepcoeng.ac.in', pw: 'admin123' },
];

export default function Login() {
  const { login, homeFor } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('student');
  const [email, setEmail] = useState('student@mepcoeng.ac.in');
  const [password, setPassword] = useState('student123');
  const [busy, setBusy] = useState(false);

  const pickRole = (r) => {
    setTab(r.key);
    setEmail(r.email);
    setPassword(r.pw);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      nav(homeFor(user.role), { replace: true });
    } catch { /* toast already shown */ } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <div className="b-logo">◈</div>
        <h1>Academic Helpdesk<br />&amp; Knowledge Hub</h1>
        <p className="b-lead">
          An intelligent academic support platform that answers student queries instantly from a
          knowledge base, routes the rest to faculty through a transparent, SLA-backed escalation
          ladder — and gives every department a complete picture.
        </p>
        <div className="b-points">
          <div className="b-point"><span className="tick">✓</span> Instant answers with text-analytics matching</div>
          <div className="b-point"><span className="tick">✓</span> Bottom-up assignment: junior → senior → HOD</div>
          <div className="b-point"><span className="tick">✓</span> 24-working-hour SLA with automatic escalation</div>
          <div className="b-point"><span className="tick">✓</span> Admin oversight of students, faculty &amp; HODs</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <div className="eyebrow">Mepco Schlenk Engineering College</div>
          <h2>Sign in to your portal</h2>
          <p className="sub">Choose your role to auto-fill demo credentials, or enter your institutional email.</p>

          <div className="role-tabs">
            {ROLES.map((r) => (
              <button key={r.key} type="button" className={`role-tab ${tab === r.key ? 'active' : ''}`} onClick={() => pickRole(r)}>
                <r.icon size={19} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label>Institutional Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mepcoeng.ac.in" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy && <Loader2 size={17} className="spin" />} Sign In
            </button>
          </form>

          <div className="auth-switch">
            New student? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
