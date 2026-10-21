import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, StatCard } from '../../components/ui.jsx';
import { Power, Plus, X, Timer, BookOpen } from 'lucide-react';

export default function FacultyAvailability() {
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);
  const [newSub, setNewSub] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/faculty/workload').then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async () => {
    try { await api.patch('/faculty/availability', { isAvailable: !data.me.isAvailable }); await load(); toast.success('Availability updated'); }
    catch (e) { toast.error(errText(e)); }
  };

  const addSubject = async () => {
    if (!newSub.trim()) return;
    setBusy(true);
    try {
      const subjects = [...(data.me.subjects || []), newSub.trim()];
      await api.patch('/faculty/subjects', { subjects });
      setNewSub(''); await load(); toast.success('Subject added');
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const removeSubject = async (s) => {
    try {
      await api.patch('/faculty/subjects', { subjects: (data.me.subjects || []).filter((x) => x !== s) });
      await load(); toast.success('Subject removed');
    } catch (e) { toast.error(errText(e)); }
  };

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;
  const { me } = data;
  const pct = Math.min(100, Math.round((me.currentLoad / me.maxOpenTickets) * 100));

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Availability &amp; Load</h1><p>Control when you receive new tickets and manage your teaching subjects.</p></div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Timer} value={me.currentLoad} label="Current Open Tickets" tone="blue" />
        <StatCard icon={BookOpen} value={me.maxOpenTickets} label="Maximum Capacity" tone="purple" />
        <StatCard icon={Power} value={me.isAvailable ? 'Available' : 'Unavailable'} label="Assignment Status" tone={me.isAvailable ? 'green' : 'red'} />
        <StatCard icon={BookOpen} value={(me.subjects || []).length} label="Subjects Configured" tone="teal" />
      </div>

      <div className="grid-2-even" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Assignment Availability</h3></div>
          <div className="card-body">
            <div className={`alert ${me.isAvailable ? 'success' : 'warn'}`}>
              <Power size={20} />
              <div><b>{me.isAvailable ? 'You are receiving assignments' : 'You are withheld from new assignments'}</b>
                {me.isAvailable ? 'New and escalated tickets matching your subjects can be routed to you.' : 'Existing tickets stay with you, but no new ones will be assigned.'}</div>
            </div>
            <button className={`btn ${me.isAvailable ? 'btn-ghost' : 'btn-success'}`} onClick={toggle}>
              <Power size={16} /> {me.isAvailable ? 'Set Unavailable' : 'Set Available'}
            </button>

            <div style={{ marginTop: 26 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                <span>Workload utilisation</span><span>{me.currentLoad} / {me.maxOpenTickets}</span>
              </div>
              <div className="conf-bar" style={{ height: 12 }}>
                <span style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--green)' }} />
              </div>
              <p style={{ fontSize: 13, marginTop: 10 }}>{pct >= 90 ? 'At capacity — new tickets will route to other faculty.' : 'You have capacity for more tickets.'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Teaching Subjects</h3></div>
          <div className="card-body">
            <p style={{ fontSize: 14, marginBottom: 16 }}>Subject affinity improves how tickets are matched and routed to you.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="e.g. Database Systems" onKeyDown={(e) => e.key === 'Enter' && addSubject()} />
              <button className="btn btn-primary" disabled={busy || !newSub.trim()} onClick={addSubject}><Plus size={17} /></button>
            </div>
            <div className="chip-row">
              {(me.subjects || []).map((s, i) => (
                <span key={i} className="chip blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                  {s}
                  <button onClick={() => removeSubject(s)} style={{ background: 'none', border: 0, color: '#1d4ed8', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
                </span>
              ))}
              {(!me.subjects || !me.subjects.length) && <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>No subjects yet — add one to improve routing.</span>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
