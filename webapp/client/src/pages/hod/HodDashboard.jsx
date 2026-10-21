import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, StatusPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Ticket, Users, AlertTriangle, Layers, ArrowRight, GraduationCap } from 'lucide-react';

export default function HodDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/faculty/department/overview').then(({ data }) => setData(data)).catch(() => {}); }, []);
  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const open = data.tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
  const overdue = data.tickets.filter((t) => t.overdue && !['resolved', 'closed'].includes(t.status));
  const escalated = data.tickets.filter((t) => t.status === 'escalated');
  const subjectData = Object.entries(data.bySubject).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>{data.department}</h1><p>Departmental oversight · {user.designation}</p></div>
        <div className="head-actions"><button className="btn btn-primary btn-sm" onClick={() => nav('/hod/escalations')}><Layers size={16} /> Escalations</button></div>
      </div>

      {overdue.length > 0 && (
        <div className="alert danger"><AlertTriangle size={20} /><div><b>{overdue.length} ticket(s) past SLA</b>These have breached the 24-working-hour window and require departmental attention.</div></div>
      )}

      <div className="stats-grid">
        <StatCard icon={Ticket} value={data.tickets.length} label="Total Department Tickets" tone="blue" />
        <StatCard icon={Layers} value={open.length} label="Open / In Progress" tone="orange" />
        <StatCard icon={AlertTriangle} value={escalated.length} label="Escalated" tone="red" />
        <StatCard icon={GraduationCap} value={data.studentCount} label="Students Served" tone="purple" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Department Tickets</h3><button className="link-btn" onClick={() => nav('/hod/tickets')}>View all <ArrowRight size={15} /></button></div>
          {data.tickets.length === 0 ? <Empty text="No department tickets yet" /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Student</th><th>Handler</th><th>Status</th><th>SLA</th></tr></thead>
                <tbody>
                  {data.tickets.slice(0, 7).map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td>{t.student?.name}</td>
                      <td>{t.assignedTo?.name || '—'}<span className="pill purple" style={{ marginLeft: 8 }}>L{t.assignmentLevel}</span></td>
                      <td><StatusPill status={t.status} /></td>
                      <td><SlaChip dueAt={t.slaDueAt} status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Query Distribution by Category</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {subjectData.length === 0 ? <p>No data.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
