import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatusPill, PriorityPill, Spinner, Empty, SlaChip } from '../../components/ui.jsx';
import { Search } from 'lucide-react';

export default function AdminQueries() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [params] = useSearchParams();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', level: '', q: params.get('q') || '' });

  const load = async (p = page) => {
    const qs = new URLSearchParams({ page: p, limit: 15 });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const { data } = await api.get(`/admin/queries?${qs}`);
    setItems(data.items); setTotal(data.total); setPages(data.pages); setPage(data.page);
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [filters]);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>All Queries</h1><p>{total} query(s) raised across every department — resolved, in progress and escalated.</p></div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search subject, description or ticket code…" style={{ width: '100%', paddingRight: 44 }} />
          <Search size={18} style={{ position: 'absolute', right: 14, top: 12, color: 'var(--muted)' }} />
        </div>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="open">Open</option><option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option><option value="waiting_student">Waiting on Student</option>
          <option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          <option value="critical">Critical</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
          <option value="">All levels</option>
          <option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3 (HOD)</option>
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No queries match your filters" /></div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Ticket</th><th>Student</th><th>Subject</th><th>Category</th><th>Handler</th><th>Lvl</th><th>Status</th><th>Priority</th><th>SLA</th></tr></thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/faculty/tickets/${t._id}`)}>
                      <td><span className="t-id">{t.ticketCode}</span></td>
                      <td>{t.student?.name}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.student?.rollNumber}</div></td>
                      <td className="t-strong">{t.subject.length > 40 ? t.subject.slice(0, 40) + '…' : t.subject}</td>
                      <td>{t.category}</td>
                      <td>{t.assignedTo?.name || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
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
