import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Search,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, Spinner, Empty, Modal } from '../../components/ui.jsx';

export default function AdminAllowlist() {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({ total: 0, claimed: 0, unclaimed: 0 });
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    rollNumber: '',
    department: 'Computer Science and Engineering',
    batch: '2024-2028',
    semester: 5,
    section: 'A',
  });
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusFilter !== '') params.set('isClaimed', statusFilter);
      const { data } = await api.get(`/admin/allowlist?${params.toString()}`);
      setItems(data.items || []);
      setCounts(data.counts || { total: 0, claimed: 0, unclaimed: 0 });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [q, statusFilter]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/allowlist', newStudent);
      toast.success('Student added to registration allowlist');
      setAddModal(false);
      setNewStudent({
        name: '',
        email: '',
        rollNumber: '',
        department: 'Computer Science and Engineering',
        batch: '2024-2028',
        semester: 5,
        section: 'A',
      });
      loadData();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportPreview = async () => {
    if (!importText.trim()) {
      toast.error('Please paste CSV or JSON data');
      return;
    }
    setBusy(true);
    try {
      let rows = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        rows = JSON.parse(trimmed);
        if (!Array.isArray(rows)) rows = [rows];
      } else {
        // parse CSV lines
        const lines = trimmed.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
          });
          rows.push(obj);
        }
      }

      const { data } = await api.post('/admin/import-data', {
        type: 'students',
        rows,
        commit: false,
      });
      setImportPreview(data);
      toast.success(`Preview ready: ${data.validRows} valid rows, ${data.invalidRows} errors`);
    } catch (e) {
      toast.error('Invalid format: Ensure valid CSV or JSON array');
    } finally {
      setBusy(false);
    }
  };

  const handleImportCommit = async () => {
    if (!importPreview) return;
    setBusy(true);
    try {
      // Re-run with commit: true
      let rows = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[')) rows = JSON.parse(trimmed);
      else {
        const lines = trimmed.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
          });
          rows.push(obj);
        }
      }

      await api.post('/admin/import-data', {
        type: 'students',
        rows,
        commit: true,
      });
      toast.success('Successfully committed records to allowlist!');
      setImportModal(false);
      setImportPreview(null);
      setImportText('');
      loadData();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Student Registration Allowlist</h1>
          <p>
            Admin-controlled registration eligibility list. Only verified student records can register on the portal.
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setImportModal(true)}>
            <Upload size={16} /> Batch Ingestion
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>
            <Plus size={16} /> Add Student Entry
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 840 }}>
        <StatCard icon={ShieldCheck} value={counts.total} label="Total Authorized Students" tone="blue" />
        <StatCard icon={CheckCircle2} value={counts.claimed} label="Accounts Claimed" tone="green" />
        <StatCard icon={RefreshCw} value={counts.unclaimed} label="Unclaimed Allocations" tone="orange" />
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by student name, register number (e.g. 24BCS064) or email..."
            style={{ width: '100%', paddingRight: 40 }}
          />
          <Search size={18} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--muted)' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All Statuses</option>
          <option value="true">Claimed / Active</option>
          <option value="false">Unclaimed Slots</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : !items || items.length === 0 ? (
        <div className="card">
          <Empty text="No allowlist records found" sub="Use Add Student or Batch Ingestion to add pre-authorized students." />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Reg. Number</th>
                  <th>Student Name</th>
                  <th>Institutional Email</th>
                  <th>Dept &amp; Batch</th>
                  <th>Registration Status</th>
                  <th>Validation Flags</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong style={{ color: 'var(--blue)', fontFamily: 'monospace', fontSize: 13.5 }}>
                        {row.rollNumber}
                      </strong>
                    </td>
                    <td className="t-strong">{row.name}</td>
                    <td style={{ color: '#475569', fontSize: 13 }}>{row.email}</td>
                    <td>
                      <span style={{ fontSize: 12.5 }}>
                        {row.departmentCode || 'CSE'} · {row.batch} (Sem {row.semester})
                      </span>
                    </td>
                    <td>
                      {row.isClaimed ? (
                        <span className="pill green">
                          <CheckCircle2 size={12} /> Claimed ({new Date(row.claimedAt).toLocaleDateString()})
                        </span>
                      ) : (
                        <span className="pill orange">
                          <RefreshCw size={12} /> Unclaimed Slot
                        </span>
                      )}
                    </td>
                    <td>
                      {(row.validationFlags || []).length > 0 ? (
                        row.validationFlags.map((flag, idx) => (
                          <span key={idx} className="pill red" style={{ fontSize: 11, marginRight: 4 }}>
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Verified OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {addModal && (
        <Modal title="Add Pre-Authorized Student" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label>Student Full Name</label>
              <input
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="e.g. Nirupa K V"
                required
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Institutional Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="e.g. kulandai.kvn_bcs28@mepcoeng.ac.in"
                  required
                />
              </div>
              <div className="field">
                <label>Register Number</label>
                <input
                  value={newStudent.rollNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  placeholder="e.g. 24BCS064"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Department</label>
                <input
                  value={newStudent.department}
                  onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Batch</label>
                <input
                  value={newStudent.batch}
                  onChange={(e) => setNewStudent({ ...newStudent, batch: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Loader2 size={16} className="spin" />} Add to Allowlist
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Import Modal */}
      {importModal && (
        <Modal title="Batch Data Ingestion &amp; Validation Hub" onClose={() => setImportModal(false)}>
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
              Paste CSV or JSON formatted student records. The system will perform a dry-run validation check, detect duplicate emails/roll numbers, and report errors before committing.
            </p>

            <div className="field">
              <label>CSV or JSON Data</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="name,email,rollNumber,department,batch,semester
John Doe,john@mepcoeng.ac.in,24BCS101,Computer Science and Engineering,2024-2028,5"
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: 12.5 }}
              />
            </div>

            {importPreview && (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontWeight: 600 }}>
                  <span style={{ color: '#16a34a' }}>✓ Valid: {importPreview.validRows}</span>
                  <span style={{ color: '#dc2626' }}>✕ Errors: {importPreview.invalidRows}</span>
                  <span>Total: {importPreview.totalRows}</span>
                </div>

                {importPreview.errors?.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#dc2626' }}>
                    {importPreview.errors.map((err, i) => (
                      <div key={i}>Row {err.row}: {err.errors.join(', ')}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setImportModal(false)}>
                Cancel
              </button>
              {!importPreview ? (
                <button type="button" className="btn btn-primary" onClick={handleImportPreview} disabled={busy || !importText.trim()}>
                  {busy && <Loader2 size={16} className="spin" />} Run Validation Preview
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleImportCommit}
                  disabled={busy || importPreview.validRows === 0}
                >
                  {busy && <Loader2 size={16} className="spin" />} Confirm &amp; Commit {importPreview.validRows} Records
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
