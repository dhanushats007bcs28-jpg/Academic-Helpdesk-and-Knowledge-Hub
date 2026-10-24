
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  Building2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = [
  { key: 'student', label: 'Student', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', icon: Users },
  { key: 'hod', label: 'HOD', icon: Building2 },
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
];

export default function Login() {
  const { login, homeFor } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      const user = await login(email, password);
      nav(homeFor(user.role), { replace: true });
    } catch {
      // Error notification is already shown by AuthContext.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <div className="b-logo">◈</div>
        <h1>
          Academic Helpdesk
          <br />
          &amp; Knowledge Hub
        </h1>

        <p className="b-lead">
          An intelligent academic support platform that answers student
          queries instantly from a knowledge base, routes the rest to
          faculty through a transparent, SLA-backed escalation ladder,
          and gives every department a complete picture.
        </p>

        <div className="b-points">
          <div className="b-point">
            <span className="tick">✓</span>
            Instant answers with text-analytics matching
          </div>
          <div className="b-point">
            <span className="tick">✓</span>
            Bottom-up assignment: junior → senior → HOD
          </div>
          <div className="b-point">
            <span className="tick">✓</span>
            24-working-hour SLA with automatic escalation
          </div>
          <div className="b-point">
            <span className="tick">✓</span>
            Admin oversight of students, faculty &amp; HODs
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <div className="eyebrow">
            Mepco Schlenk Engineering College
          </div>

          <h2>Sign in to your portal</h2>

          <p className="sub">
            Select your role and enter your institutional credentials.
          </p>

          <div className="role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-tab ${tab === r.key ? 'active' : ''}`}
                onClick={() => setTab(r.key)}
              >
                <r.icon size={19} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="login-email">Institutional Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mepcoeng.ac.in"
                autoComplete="username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              type="submit"
              disabled={busy}
            >
              {busy && <Loader2 size={17} className="spin" />}
              Sign In
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
