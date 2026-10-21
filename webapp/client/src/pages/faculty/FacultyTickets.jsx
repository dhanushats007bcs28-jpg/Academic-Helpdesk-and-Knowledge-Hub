import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { Ticket } from 'lucide-react';

export default function FacultyTickets() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [params] = useSearchParams();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '', q: params.get('q') || '' });

  const load = async (p = page) => {
    const qs = new URLSearchParams({ page: p, limit: 12 });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const { data } = await api.get(`/tickets?${qs}`);
    setItems(data.items); setTotal(data.total); setPages(data.pages); setPage(data.page);
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [filters]);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>Assigned Tickets</h1><p>{total} ticket(s) assigned to you or escalated from your queue.</p></div></div>

      <div className="filters">
        <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search tickets…" style={{ flex: 1, minWidth: 240 }} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="assigned">Assigned</option><option value="in_progress">In Progress</option>
          <option value="waiting_student">Waiting on Student</option><option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          <option value="critical">Critical</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No tickets found" sub="Adjust your filters." /></div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Student</th><th>Subject</th><th>Level</th><th>Status</th><th>Priority</th><th>SLA</th></tr></thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td>{t.student?.name}</td>
                      <td className="t-strong">{t.subject.length > 38 ? t.subject.slice(0, 38) + '…' : t.subject}</td>
                      <td><span className="pill purple">L{t.assignmentLevel}</span></td>
                      <td><StatusPill status={t.status} /></td>
                      <td><PriorityPill priority={t.priority} /></td>
                      <td><SlaChip dueAt={t.slaDueAt} status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {pages > 1 && (
            <div className="pager">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
              Page {page} of {pages}
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
