import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { Ticket, Clock, AlertTriangle, CheckCircle2, Power, ArrowRight, Timer } from 'lucide-react';

export default function FacultyDashboard() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);

  const load = () => api.get('/faculty/workload').then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async () => {
    const { data: r } = await api.patch('/faculty/availability', { isAvailable: !user.isAvailable });
    const updated = { ...user, isAvailable: r.isAvailable };
    setUser(updated); localStorage.setItem('ah_user', JSON.stringify(updated));
  };

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const { me, stats, queue } = data;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Good day, {user.name.split(' ').slice(-1)[0]}!</h1>
          <p>Level {me.level} {me.level === 1 ? '(Junior)' : me.level === 2 ? '(Senior)' : '(HOD)'} · {me.designation}</p>
        </div>
        <div className="head-actions">
          <button className={`btn btn-sm ${me.isAvailable ? 'btn-success' : 'btn-ghost'}`} onClick={toggle}><Power size={15} /> {me.isAvailable ? 'Available' : 'Unavailable'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/faculty/tickets')}><Ticket size={16} /> My Queue</button>
        </div>
      </div>

      {stats.overdue > 0 && (
        <div className="alert danger"><AlertTriangle size={20} /><div><b>{stats.overdue} ticket(s) past SLA</b>These have breached the 24-working-hour window and are being escalated automatically.</div></div>
      )}

      <div className="stats-grid">
        <StatCard icon={Ticket} value={stats.open} label="Open Tickets" tone="blue" />
        <StatCard icon={Clock} value={stats.highPriority} label="High Priority" tone="orange" />
        <StatCard icon={AlertTriangle} value={stats.overdue} label="SLA Breached" tone="red" />
        <StatCard icon={CheckCircle2} value={`${me.currentLoad}/${me.maxOpenTickets}`} label="Workload Capacity" tone="purple" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Priority Queue (SLA sorted)</h3><button className="link-btn" onClick={() => nav('/faculty/tickets')}>View all <ArrowRight size={15} /></button></div>
          {queue.length === 0 ? <Empty text="No open tickets" sub="You're all caught up." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Student</th><th>Subject</th><th>Priority</th><th>SLA</th></tr></thead>
                <tbody>
                  {queue.slice(0, 7).map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td>{t.student?.name}</td>
                      <td className="t-strong">{t.subject.length > 34 ? t.subject.slice(0, 34) + '…' : t.subject}</td>
                      <td><PriorityPill priority={t.priority} /></td>
                      <td><SlaChip dueAt={t.slaDueAt} status={t.status} remainingHours={t.hoursToDue} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>My Subjects & Routing</h3></div>
          <div className="card-body">
            <div className="k" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>TEACHING SUBJECTS</div>
            <div className="chip-row" style={{ marginBottom: 20 }}>
              {(me.subjects || []).map((s, i) => <span key={i} className="chip blue">{s}</span>)}
              {(!me.subjects || !me.subjects.length) && <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>No subjects configured.</span>}
            </div>
            <div className="alert info"><Timer size={19} /><div><b>Assignment rule</b>New tickets are routed to the most junior available faculty whose subjects match, then escalate upward on SLA breach.</div></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
