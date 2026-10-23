import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CreateAccount() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibleData, setEligibleData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const checkEligibility = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your institutional email');
      return;
    }
    setChecking(true);
    setErrorMsg('');
    setEligibleData(null);
    try {
      const { data } = await api.post('/auth/check-eligibility', { email: email.trim() });
      if (data.eligible) {
        setEligibleData(data.student);
        toast.success(`Verified: ${data.student.name} (${data.student.rollNumber})`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || errText(err);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (!eligibleData) {
      toast.error('Please verify your email eligibility first');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        email: email.trim(),
        password,
        phone,
      });
      toast.success('Registration successful! Signing you in...');
      await login(email.trim(), password);
      nav('/student', { replace: true });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <div className="b-logo">◈</div>
        <h1>
          MEPCO Schlenk<br />Engineering College
        </h1>
        <p className="b-lead">
          Official Student Registration Portal. Access verified learning resources, raise doubts to course faculty, and collaborate on department innovation projects.
        </p>
        <div className="b-points">
          <div className="b-point">
            <span className="tick">✓</span> Admin-verified student allowlist access
          </div>
          <div className="b-point">
            <span className="tick">✓</span> Bound to verified roll number &amp; batch
          </div>
          <div className="b-point">
            <span className="tick">✓</span> 24-working-hour SLA for faculty responses
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <div className="eyebrow">Student Registration</div>
          <h2>Activate your account</h2>
          <p className="sub">
            Self-registration requires an approved student record in the college allowlist (CSE Batch 2024–2028).
          </p>

          {!eligibleData ? (
            <form onSubmit={checkEligibility} style={{ display: 'grid', gap: 16 }}>
              <div className="field">
                <label>Institutional Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. kulandai.kvn_bcs28@mepcoeng.ac.in"
                  required
                />
                <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Enter your registered institutional or approved batch email.
                </span>
              </div>

              {errorMsg && (
                <div className="alert danger" style={{ fontSize: 13.5, padding: 12 }}>
                  <AlertCircle size={18} />
                  <div>{errorMsg}</div>
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={checking} style={{ width: '100%' }}>
                {checking ? <Loader2 size={17} className="spin" /> : <ShieldCheck size={17} />} Verify Eligibility
              </button>
            </form>
          ) : (
            <form onSubmit={submitRegistration} style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  <span>Verified Allowlist Record Found</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13, marginTop: 4 }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Student Name:</span>
                    <div style={{ fontWeight: 600, color: '#1a3450' }}>{eligibleData.name}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Register Number:</span>
                    <div style={{ fontWeight: 600, color: 'var(--blue)' }}>{eligibleData.rollNumber}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Department:</span>
                    <div style={{ fontWeight: 600 }}>{eligibleData.department}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Batch &amp; Semester:</span>
                    <div style={{ fontWeight: 600 }}>
                      {eligibleData.batch} · Sem {eligibleData.semester}
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Set Account Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div className="field">
                <label>Contact Phone (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? <Loader2 size={17} className="spin" /> : <ArrowRight size={17} />} Complete Registration &amp; Sign In
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEligibleData(null)}
                style={{ width: '100%', fontSize: 13 }}
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="auth-switch">
            Already registered? <Link to="/login">Sign in to your portal</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
