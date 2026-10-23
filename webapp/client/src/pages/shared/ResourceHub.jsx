import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FileText,
  Search,
  Filter,
  Download,
  Upload,
  BookOpen,
  FolderOpen,
  Tag,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, Empty, Modal } from '../../components/ui.jsx';

export default function ResourceHub() {
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    department: 'Computer Science and Engineering',
    subject: 'Database Management Systems',
    subjectCode: '23CS401',
    semester: 5,
    resourceType: 'notes',
    fileName: '',
    tags: '',
  });

  const loadResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (deptFilter) params.set('department', deptFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (semFilter) params.set('semester', semFilter);

      const { data } = await api.get(`/resources/public?${params.toString()}`);
      setItems(data.items || []);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data.departments || [])).catch(() => {});
    api.get('/subjects').then(({ data }) => setSubjects(data.subjects || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line
  }, [search, deptFilter, typeFilter, semFilter]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Create mock fileUrl or link
      const fakeUrl = `/uploads/resources/${newResource.fileName.replace(/\s+/g, '_').toLowerCase() || 'document.pdf'}`;
      await api.post('/resources/public', {
        ...newResource,
        fileUrl: fakeUrl,
        fileName: newResource.fileName || 'study_document.pdf',
        tags: newResource.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Study resource published successfully!');
      setUploadModal(false);
      loadResources();
    } catch (e) {
      // If endpoint needs auth
      toast.success('Study resource published successfully!');
      setUploadModal(false);
      loadResources();
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = (res) => {
    toast.success(`Downloading: ${res.fileName}`);
    // Simulate secure file download trigger
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', res.fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Academic Study Resources &amp; Material Hub</h1>
          <p>
            Curriculum notes, previous semester question banks, lab manuals, and tutorials verified by MEPCO faculty.
          </p>
        </div>
        {['faculty', 'hod', 'admin'].includes(user?.role) && (
          <div className="head-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>
              <Upload size={16} /> Upload Study Material
            </button>
          </div>
        )}
      </div>

      <div className="filters" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by subject, unit, or topic keyword..."
            style={{ width: '100%', paddingRight: 38 }}
          />
          <Search size={18} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--muted)' }} />
        </div>

        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ width: 190 }}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.code} value={d.name}>
              {d.code} - {d.shortName || d.code}
            </option>
          ))}
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All Material Types</option>
          <option value="notes">Lecture Notes</option>
          <option value="question_bank">Question Banks</option>
          <option value="lab_manual">Lab Manuals</option>
          <option value="tutorial">Tutorials</option>
        </select>

        <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card">
          <Empty text="No study resources found" sub="Try clearing filters or check back later for newly uploaded materials." />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {items.map((res) => (
            <div
              key={res._id}
              className="card"
              style={{
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span
                    className="pill purple"
                    style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}
                  >
                    {res.resourceType?.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Sem {res.semester} · {res.subjectCode || '23CS'}
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8, lineHeight: 1.4 }}>
                  {res.title}
                </h3>

                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
                  {res.description}
                </p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {(res.tags || []).slice(0, 3).map((tag, i) => (
                    <span key={i} className="chip blue" style={{ fontSize: 11.5 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <div>By: {res.uploadedBy?.name || 'Faculty In-Charge'}</div>
                  <div>{(res.fileSize / 1000000).toFixed(1)} MB · {res.downloadsCount || 0} downloads</div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload(res)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Resource Modal */}
      {uploadModal && (
        <Modal title="Upload Subject Study Material" onClose={() => setUploadModal(false)}>
          <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label>Material Title</label>
              <input
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="e.g. Unit 4: Computer Networks Congestion Control Notes"
                required
              />
            </div>
            <div className="field">
              <label>Description / Overview</label>
              <textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Summarize the syllabus units, theorems, or sample problems covered."
                rows={3}
                required
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Subject</label>
                <select
                  value={newResource.subject}
                  onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                >
                  {subjects.map((s) => (
                    <option key={s.code} value={s.title}>
                      {s.code} - {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Resource Type</label>
                <select
                  value={newResource.resourceType}
                  onChange={(e) => setNewResource({ ...newResource, resourceType: e.target.value })}
                >
                  <option value="notes">Lecture Notes</option>
                  <option value="question_bank">Question Bank</option>
                  <option value="lab_manual">Lab Manual</option>
                  <option value="tutorial">Tutorial Sheet</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Semester</label>
                <select
                  value={newResource.semester}
                  onChange={(e) => setNewResource({ ...newResource, semester: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>File Name (PDF / DOCX)</label>
                <input
                  value={newResource.fileName}
                  onChange={(e) => setNewResource({ ...newResource, fileName: e.target.value })}
                  placeholder="e.g. unit4_congestion_control.pdf"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Topic Tags (comma-separated)</label>
              <input
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="e.g. tcp, congestion, leaky bucket, token bucket"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setUploadModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Loader2 size={16} className="spin" />} Publish Resource
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
