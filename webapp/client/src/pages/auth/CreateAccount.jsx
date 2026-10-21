import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CreateAccount() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', rollNumber: '',
    department: 'Computer Science & Engineering', year: 3, semester: 5, section: 'A', phone: '',
  });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ ...form, role: 'student', year: Number(form.year), semester: Number(form.semester) });
      nav('/student', { replace: true });
    } catch { /* handled */ } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <div className="b-logo">◈</div>
        <h1>Join the Academic<br />Helpdesk</h1>
        <p className="b-lead">
          Create your student account to ask questions, search the knowledge base and track your
          tickets. Your academic details help us route queries to the right faculty automatically.
        </p>
        <div className="b-points">
          <div className="b-point"><span className="tick">✓</span> Free knowledge base access</div>
          <div className="b-point"><span className="tick">✓</span> Track every ticket in real time</div>
          <div className="b-point"><span className="tick">✓</span> Get notified on faculty replies</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <div className="eyebrow">Student Registration</div>
          <h2>Create your account</h2>
          <p className="sub">Only students may self-register. Faculty and HOD accounts are provisioned by the administrator.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Dhanush Selvaraj" required />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Institutional Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@mepcoeng.ac.in" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="min 6 characters" minLength={6} required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Roll Number</label>
                <input value={form.rollNumber} onChange={set('rollNumber')} placeholder="e.g. 22CSR001" />
              </div>
              <div className="field">
                <label>Department</label>
                <select value={form.department} onChange={set('department')}>
                  <option>Computer Science & Engineering</option>
                  <option>Electronics & Communication Engineering</option>
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="field">
                <label>Year</label>
                <select value={form.year} onChange={set('year')}>
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                </select>
              </div>
              <div className="field">
                <label>Semester</label>
                <select value={form.semester} onChange={set('semester')}>
                  {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Section</label>
                <input value={form.section} onChange={set('section')} placeholder="A" />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy && <Loader2 size={17} className="spin" />} Create Account
            </button>
          </form>

          <div className="auth-switch">Already registered? <Link to="/login">Sign in</Link></div>
        </div>
      </section>
    </div>
  );
}
