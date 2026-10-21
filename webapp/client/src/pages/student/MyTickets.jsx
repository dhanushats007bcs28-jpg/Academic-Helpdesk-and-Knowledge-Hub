import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { Ticket, Search } from 'lucide-react';

export default function MyTickets() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [params] = useSearchParams();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', category: '', q: params.get('q') || '' });

  const load = async (p = page) => {
    const qs = new URLSearchParams({ page: p, limit: 12 });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const { data } = await api.get(`/tickets?${qs}`);
    setItems(data.items); setTotal(data.total); setPages(data.pages); setPage(data.page);
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [filters]);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>My Tickets</h1><p>{total} ticket(s) · track status, faculty replies and resolutions.</p></div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search by subject or ticket code…" style={{ width: '100%' }} />
        </div>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="open">Open</option><option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option><option value="waiting_student">Waiting on Student</option>
          <option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {['General','Database','Programming','Subject','Assignment','Examination','Technical','Administrative'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No tickets match your filters" sub="Try changing the filters or ask a new query." /></div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Subject</th><th>Category</th><th>Assigned To</th><th>Status</th><th>Priority</th><th>SLA</th><th>Created</th></tr></thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td className="t-strong">{t.subject.length > 42 ? t.subject.slice(0, 42) + '…' : t.subject}</td>
                      <td>{t.category}</td>
                      <td>{t.assignedTo?.name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>}</td>
                      <td><StatusPill status={t.status} /></td>
                      <td><PriorityPill priority={t.priority} /></td>
                      <td><SlaChip dueAt={t.slaDueAt} status={t.status} /></td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
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
