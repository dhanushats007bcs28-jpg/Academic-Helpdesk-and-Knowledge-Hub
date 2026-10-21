import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';

export default function HodTickets({ escalationsOnly }) {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(escalationsOnly ? 'escalated' : '');

  const load = () => api.get('/faculty/department/overview').then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  let tickets = data.tickets;
  if (status) tickets = tickets.filter((t) => t.status === status);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>{escalationsOnly ? 'Escalated to HOD' : 'Department Tickets'}</h1>
          <p>{tickets.length} ticket(s) in {data.department}.</p></div>
        <div className="head-actions">
          <select className="input" style={{ width: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option><option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option><option value="waiting_student">Waiting on Student</option>
            <option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="card">
        {tickets.length === 0 ? <Empty text="No tickets match" /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Ticket</th><th>Student</th><th>Subject</th><th>Handler</th><th>Level</th><th>Status</th><th>Priority</th><th>SLA</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                    <td><span className="t-id">{t.ticketCode}</span></td>
                    <td>{t.student?.name}</td>
                    <td className="t-strong">{t.subject.length > 34 ? t.subject.slice(0, 34) + '…' : t.subject}</td>
                    <td>{t.assignedTo?.name || '—'}</td>
                    <td><span className="pill purple">L{t.assignmentLevel}</span></td>
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
    </Layout>
  );
}
