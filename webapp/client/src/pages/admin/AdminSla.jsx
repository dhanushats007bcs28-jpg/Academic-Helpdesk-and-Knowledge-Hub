import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, Spinner, Empty } from '../../components/ui.jsx';
import { Timer, AlertTriangle, RefreshCw, Play, ArrowUpCircle, Clock } from 'lucide-react';

export default function AdminSla() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/sla').then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const runSweep = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.post('/admin/sla/run');
      toast.success(`Sweep done · ${r.warned} warned, ${r.escalated} escalated`);
      await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;
  const { summary, tickets } = data;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>SLA Monitor</h1><p>Live 24-<em>working</em>-hour SLA compliance (Mon–Fri, 09:00–17:00). Auto-escalates on breach.</p></div>
        <div className="head-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={runSweep}><Play size={15} /> Run SLA Sweep</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Timer} value={summary.total} label="Active Tickets" tone="blue" />
        <StatCard icon={AlertTriangle} value={summary.overdue} label="SLA Breached" tone="red" />
        <StatCard icon={Clock} value={summary.atRisk} label="At Risk (≤6h left)" tone="orange" />
        <StatCard icon={ArrowUpCircle} value={summary.escalated} label="Currently Escalated" tone="purple" />
      </div>

      <div className="alert info">
        <Timer size={19} />
        <div><b>How the 24-working-hour SLA works</b>The timer counts only working hours. A ticket raised Friday 4 PM breaches Monday afternoon, not over the weekend. At 80% a warning notification fires; at 100% the ticket auto-escalates one rung up the bottom-up ladder.</div>
      </div>

      <div className="card">
        <div className="card-head"><h3>SLA Board (sorted by urgency)</h3></div>
        {tickets.length === 0 ? <Empty text="No active tickets" sub="Everything is within SLA." /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Ticket</th><th>Handler</th><th>Lvl</th><th>Worked (hrs)</th><th>Remaining (hrs)</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                    <td><span className="t-id">{t.ticketCode}</span><div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.subject.slice(0, 30)}…</div></td>
                    <td>{t.assignedTo?.name || '—'}</td>
                    <td><span className="pill purple">L{t.level}</span></td>
                    <td><strong>{t.workedHours}h</strong></td>
                    <td>
                      <span className={`pill ${t.overdue ? 'critical' : t.remainingHours <= 6 ? 'high' : 'resolved'}`}>
                        {t.overdue ? 'BREACHED' : `${t.remainingHours}h`}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{t.slaDueAt ? new Date(t.slaDueAt).toLocaleString() : '—'}</td>
                    <td><span className={`pill ${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
