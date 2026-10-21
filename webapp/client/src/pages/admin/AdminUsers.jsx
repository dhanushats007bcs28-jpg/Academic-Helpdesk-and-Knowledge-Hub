import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Modal, Spinner, Empty, StatCard } from '../../components/ui.jsx';
import { Plus, Search, Pencil, Trash2, KeyRound, Power, Users as UsersIcon, Mail, Phone } from 'lucide-react';

const BLANK = {
  student: { name: '', email: '', password: '', rollNumber: '', department: 'Computer Science & Engineering', year: 1, semester: 1, section: 'A', cgpa: '', attendance: '', phone: '' },
  faculty: { name: '', email: '', password: '', employeeId: '', department: 'Computer Science & Engineering', designation: 'Assistant Professor', level: 1, subjects: '', phone: '', maxOpenTickets: 6 },
  hod: { name: '', email: '', password: '', employeeId: '', department: 'Computer Science & Engineering', hodOf: 'Computer Science & Engineering', designation: 'Professor & Head of Department', subjects: '', phone: '', level: 3 },
};

export default function AdminUsers({ role, title }) {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', data}
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/admin/users?role=${role}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    setItems(data.items);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const openCreate = () => setModal({ mode: 'create', data: { ...BLANK[role] } });
  const openEdit = (u) => setModal({
    mode: 'edit',
    id: u._id,
    data: { ...u, subjects: Array.isArray(u.subjects) ? u.subjects.join(', ') : (u.subjects || '') },
  });

  const save = async () => {
    const { data: d, mode, id } = modal;
    setBusy(true);
    try {
      const payload = { ...d };
      if (payload.subjects && typeof payload.subjects === 'string') {
        payload.subjects = payload.subjects.split(',').map((s) => s.trim()).filter(Boolean);
      }
      ['year', 'semester', 'level', 'maxOpenTickets'].forEach((k) => { if (payload[k] !== '' && payload[k] != null) payload[k] = Number(payload[k]); });
      if (mode === 'create') { if (!payload.password) payload.password = 'welcome123'; await api.post('/admin/users', { ...payload, role }); toast.success('User created'); }
      else { delete payload.password; await api.patch(`/admin/users/${id}`, payload); toast.success('User updated'); }
      setModal(null); await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/admin/users/${u._id}/toggle-active`); await load(); toast.success(u.isActive ? 'Deactivated' : 'Activated'); }
    catch (e) { toast.error(errText(e)); }
  };

  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${u._id}`); await load(); toast.success('Deleted'); }
    catch (e) { toast.error(errText(e)); }
  };

  const resetPw = async () => {
    setBusy(true);
    try { await api.post(`/admin/users/${pwModal._id}/reset-password`, { newPassword: newPw }); toast.success('Password reset'); setPwModal(null); setNewPw(''); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const counts = items ? {
    total: items.length,
    active: items.filter((i) => i.isActive).length,
    dept: new Set(items.map((i) => i.department)).size,
  } : {};

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>{title}</h1><p>Create, edit, deactivate and manage {role} accounts across the institution.</p></div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={17} /> Add {role === 'hod' ? 'HOD' : role.charAt(0).toUpperCase() + role.slice(1)}</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 800 }}>
        <StatCard icon={UsersIcon} value={counts.total} label={`Total ${title}`} tone="blue" />
        <StatCard icon={Power} value={counts.active} label="Active Accounts" tone="green" />
        <StatCard icon={UsersIcon} value={counts.dept} label="Departments" tone="purple" />
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()} by name, email or ID…`} style={{ width: '100%', paddingRight: 44 }} />
          <Search size={18} style={{ position: 'absolute', right: 14, top: 12, color: 'var(--muted)' }} />
        </div>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text={`No ${title.toLowerCase()} found`} sub="Add one to get started." /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th><th>{role === 'student' ? 'Roll No.' : 'Employee ID'}</th><th>Department</th>
                  {role === 'faculty' && <th>Level</th>}
                  {role === 'student' && <><th>Year</th><th>CGPA</th></>}
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, background: u.avatarColor || '#2563eb' }}>
                          {u.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="t-strong">{u.name}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}><Mail size={11} style={{ verticalAlign: -2 }} /> {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.rollNumber || u.employeeId || '—'}</td>
                    <td>{u.hodOf || u.department || '—'}</td>
                    {role === 'faculty' && <td><span className="pill purple">L{u.level}</span></td>}
                    {role === 'student' && <><td>Y{u.year} · S{u.semester}</td><td><strong>{u.cgpa ?? '—'}</strong></td></>}
                    <td><span className={`pill ${u.isActive ? 'resolved' : 'muted'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEdit(u)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-xs" title="Reset password" onClick={() => setPwModal(u)}><KeyRound size={14} /></button>
                        <button className="btn btn-ghost btn-xs" title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}><Power size={14} /></button>
                        <button className="btn btn-ghost btn-xs" title="Delete" onClick={() => remove(u)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={`${modal.mode === 'create' ? 'Add' : 'Edit'} ${role === 'hod' ? 'HOD' : role}`} wide onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{modal.mode === 'create' ? 'Create' : 'Save Changes'}</button></>}>
          <div className="form-row">
            <div className="field"><label>Full Name</label><input value={modal.data.name || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} /></div>
            <div className="field"><label>Email</label><input value={modal.data.email || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, email: e.target.value } })} /></div>
          </div>
          {modal.mode === 'create' && (
            <div className="field"><label>Initial Password</label><input value={modal.data.password || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, password: e.target.value } })} placeholder="defaults to welcome123" /></div>
          )}
          <div className="form-row">
            <div className="field"><label>{role === 'student' ? 'Roll Number' : 'Employee ID'}</label>
              <input value={(role === 'student' ? modal.data.rollNumber : modal.data.employeeId) || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, [role === 'student' ? 'rollNumber' : 'employeeId']: e.target.value } })} /></div>
            <div className="field"><label>{role === 'hod' ? 'Department Heading' : 'Department'}</label>
              <input value={(role === 'hod' ? modal.data.hodOf : modal.data.department) || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, [role === 'hod' ? 'hodOf' : 'department']: e.target.value, ...(role === 'hod' ? { department: e.target.value } : {}) } })} /></div>
          </div>
          {role === 'student' && (
  <>
    <div className="form-row-3">
      <div className="field">
        <label>Year</label>
        <input
          type="number"
          min="1"
          max="4"
          value={modal.data.year || ''}
          onChange={(e) =>
            setModal({
              ...modal,
              data: { ...modal.data, year: e.target.value }
            })
          }
        />
      </div>

      <div className="field">
        <label>Semester</label>
        <input
          type="number"
          min="1"
          max="8"
          value={modal.data.semester || ''}
          onChange={(e) =>
            setModal({
              ...modal,
              data: { ...modal.data, semester: e.target.value }
            })
          }
        />
      </div>

      <div className="field">
        <label>Section</label>
        <input
          value={modal.data.section || ''}
          onChange={(e) =>
            setModal({
              ...modal,
              data: { ...modal.data, section: e.target.value }
            })
          }
        />
      </div>
    </div>

    <div className="form-row">
      <div className="field">
        <label>CGPA</label>
        <input
          type="number"
          min="0"
          max="10"
          step="0.01"
          value={modal.data.cgpa ?? ''}
          onChange={(e) =>
            setModal({
              ...modal,
              data: { ...modal.data, cgpa: e.target.value }
            })
          }
          placeholder="e.g. 8.74"
        />
      </div>

      <div className="field">
        <label>Attendance (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={modal.data.attendance ?? ''}
          onChange={(e) =>
            setModal({
              ...modal,
              data: { ...modal.data, attendance: e.target.value }
            })
          }
          placeholder="e.g. 86.50"
        />
      </div>
    </div>
  </>
)}
          {(role === 'faculty' || role === 'hod') && (
            <>
              <div className="form-row">
                <div className="field"><label>Designation</label><input value={modal.data.designation || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, designation: e.target.value } })} /></div>
                <div className="field"><label>Escalation Level</label>
                  <select value={modal.data.level || 1} onChange={(e) => setModal({ ...modal, data: { ...modal.data, level: e.target.value } })}>
                    <option value={1}>Level 1 — Junior Faculty</option>
                    <option value={2}>Level 2 — Senior Faculty</option>
                    <option value={3}>Level 3 — HOD</option>
                  </select></div>
              </div>
              <div className="field"><label>Subjects (comma separated)</label><input value={modal.data.subjects || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, subjects: e.target.value } })} placeholder="Database Systems, Operating Systems" /></div>
            </>
          )}
          <div className="form-row">
            <div className="field"><label>Phone</label><input value={modal.data.phone || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, phone: e.target.value } })} /></div>
            {role === 'faculty' && <div className="field"><label>Max Open Tickets</label><input type="number" value={modal.data.maxOpenTickets || 6} onChange={(e) => setModal({ ...modal, data: { ...modal.data, maxOpenTickets: e.target.value } })} /></div>}
          </div>
        </Modal>
      )}

      {pwModal && (
        <Modal title={`Reset password for ${pwModal.name}`} onClose={() => setPwModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setPwModal(null)}>Cancel</button>
            <button className="btn btn-danger" disabled={busy || newPw.length < 6} onClick={resetPw}>Reset Password</button></>}>
          <div className="field"><label>New Password</label><input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="min 6 characters" /></div>
        </Modal>
      )}
    </Layout>
  );
}
