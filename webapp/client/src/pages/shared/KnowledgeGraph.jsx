import { useEffect, useState } from 'react';
import {
  Network,
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  FileText,
  Search,
  ChevronRight,
  Layers,
  ArrowRight,
} from 'lucide-react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../../components/ui.jsx';

export default function KnowledgeGraph() {
  const { unread, badges } = useShellData();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [articles, setArticles] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/knowledge-graph/subjects'),
      api.get('/faculty/directory/public', { params: { department: user?.role === 'hod' ? (user.hodOf || user.department) : user?.department } }),
      api.get('/kb'),
      api.get('/resources/public'),
    ])
      .then(([subs, facs, arts, res]) => {
        const subList = subs.data.subjects || [];
        setSubjects(subList);
        setFaculty(facs.data.faculty || []);
        setArticles(arts.data.items || []);
        setResources(res.data.items || []);
        if (subList.length > 0) setSelectedSubject(subList[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.role, user?.department, user?.semester, user?.hodOf]);

  if (loading) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  // Find relationships for selected subject
  const currentSubjectTitle = selectedSubject?.title || '';
  const connectedFaculty = faculty.filter((f) =>
    (f.subjects || []).some((s) => s.toLowerCase().includes(currentSubjectTitle.toLowerCase()) || currentSubjectTitle.toLowerCase().includes(s.toLowerCase()))
  );
  const connectedArticles = articles.filter((a) =>
    (a.subject || '').toLowerCase().includes(currentSubjectTitle.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(currentSubjectTitle.toLowerCase())
  );
  const connectedResources = resources.filter((r) =>
    (r.subject || '').toLowerCase().includes(currentSubjectTitle.toLowerCase())
  );

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Connected Academic Knowledge Graph</h1>
          <p>
            Relational exploration mapping Curriculum Courses ↔ Verified Solution Guides ↔ Study Notes ↔ Faculty Subject Specialists.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '320px 1fr' }}>
        {/* Subject Node Selector */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Your Accessible Subjects ({subjects.length})
          </div>
          {subjects.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>No subjects are assigned to your account yet. Ask your department administrator to verify your department, semester, or subject assignments.</p>
          )}

          <div style={{ display: 'grid', gap: 6, maxHeight: 600, overflowY: 'auto' }}>
            {subjects.map((sub) => {
              const isSelected = selectedSubject?.code === sub.code;
              return (
                <div
                  key={sub.code}
                  onClick={() => setSelectedSubject(sub)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--blue-soft)' : '#ffffff',
                    border: isSelected ? '1px solid var(--blue)' : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--blue)', fontFamily: 'monospace' }}>
                      {sub.code}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Sem {sub.semester}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>{sub.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Relational Graph Visualization Card */}
        {selectedSubject && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Center Node: Subject */}
            <div
              className="card"
              style={{
                padding: 24,
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                color: '#ffffff',
                borderRadius: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    COURSE NODE: {selectedSubject.code}
                  </span>
                  <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 10, marginBottom: 4 }}>
                    {selectedSubject.title}
                  </h2>
                  <div style={{ fontSize: 13, color: '#bfdbfe' }}>
                    {selectedSubject.department} · {selectedSubject.credits} Credits · {selectedSubject.type?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Graph Hubs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {/* Faculty Specialists */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  <Users size={18} style={{ color: '#2563eb' }} />
                  <span>Subject Faculty Specialists ({connectedFaculty.length})</span>
                </div>
                {connectedFaculty.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Assigned to departmental general pool.</span>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {connectedFaculty.map((f, i) => (
                      <div key={i} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {f.designation} ({f.teachingExperienceYears} yrs exp)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Solution Guides */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  <BookOpen size={18} style={{ color: '#7c3aed' }} />
                  <span>Verified Solution Guides ({connectedArticles.length})</span>
                </div>
                {connectedArticles.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>No articles published yet for this topic.</span>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {connectedArticles.map((a) => (
                      <div key={a._id} style={{ background: '#faf5ff', padding: 10, borderRadius: 8, border: '1px solid #e9d5ff' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#581c87' }}>{a.title}</div>
                        <div style={{ fontSize: 11.5, color: '#7e22ce', marginTop: 2 }}>{a.views || 0} views</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Study Resources */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  <FileText size={18} style={{ color: '#16a34a' }} />
                  <span>Curriculum Study Notes ({connectedResources.length})</span>
                </div>
                {connectedResources.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>No study materials uploaded yet.</span>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {connectedResources.map((r) => (
                      <div key={r._id} style={{ background: '#f0fdf4', padding: 10, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>{r.title}</div>
                        <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 2 }}>{r.resourceType?.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
