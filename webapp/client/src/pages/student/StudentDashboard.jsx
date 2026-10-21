import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { Ticket, Clock, CheckCircle2, Library, MessageSquarePlus, Search, ArrowRight, TrendingUp } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [stats, setStats] = useState(null);
  const [kb, setKb] = useState([]);

  useEffect(() => {
    api.get('/tickets/stats/summary').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/kb').then(({ data }) => setKb(data.items.slice(0, 5))).catch(() => {});
  }, []);

  if (!stats) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}!</h1>
          <p>Here's an overview of your academic support activity.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => nav('/student/ask')}><MessageSquarePlus size={17} /> Ask a Query</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Ticket} value={stats.total} label="Total Tickets" tone="blue" />
        <StatCard icon={Clock} value={stats.open} label="Open Tickets" tone="orange" />
        <StatCard icon={CheckCircle2} value={stats.resolved} label="Resolved" tone="green" />
        <StatCard icon={Library} value={kb.length ? '24+' : '24+'} label="Knowledge Articles" tone="purple" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <h3>Recent Tickets</h3>
            <button className="link-btn" onClick={() => nav('/student/tickets')}>View all <ArrowRight size={15} /></button>
          </div>
          {stats.recent.length === 0 ? <Empty text="No tickets yet" sub="Ask your first query to get started." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Subject</th><th>Status</th><th>Priority</th><th>SLA</th></tr></thead>
                <tbody>
                  {stats.recent.map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td className="t-strong">{t.subject.length > 46 ? t.subject.slice(0, 46) + '…' : t.subject}</td>
                      <td><StatusPill status={t.status} /></td>
                      <td><PriorityPill priority={t.priority} /></td>
                      <td><SlaChip dueAt={t.slaDueAt} status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head"><h3>Quick Actions</h3></div>
            <div className="card-body" style={{ display: 'grid', gap: 12 }}>
              {[
                { icon: MessageSquarePlus, text: 'Ask a new query', sub: 'Get an instant KB answer or faculty help', to: '/student/ask', tone: 'var(--blue-soft)', fg: 'var(--blue)' },
                { icon: Search, text: 'Search knowledge base', sub: 'Find answers to common questions', to: '/student/knowledge', tone: 'var(--green-soft)', fg: 'var(--green)' },
                { icon: Ticket, text: 'Track my tickets', sub: 'View status and faculty replies', to: '/student/tickets', tone: 'var(--orange-soft)', fg: 'var(--orange)' },
              ].map((a) => (
                <button key={a.to} onClick={() => nav(a.to)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: '#fff', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: a.tone, color: a.fg, display: 'grid', placeItems: 'center' }}><a.icon size={21} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{a.text}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.sub}</div></div>
                  <ArrowRight size={18} style={{ color: 'var(--muted)' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Popular Knowledge</h3><button className="link-btn" onClick={() => nav('/student/knowledge')}>Browse</button></div>
            <div className="card-body" style={{ padding: 0 }}>
              {kb.map((a, i) => (
                <div key={a._id} onClick={() => nav('/student/knowledge')} style={{ padding: '14px 22px', borderTop: i ? '1px solid var(--line)' : 0, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: '#1a3450' }}>{a.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--purple)', marginTop: 4 }}>{a.category} · {a.views} views</div>
                </div>
              ))}
              {kb.length === 0 && <Empty text="No articles yet" />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
