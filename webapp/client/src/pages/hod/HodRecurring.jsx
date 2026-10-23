import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileClock,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Plus,
  CheckCircle2,
  Sparkles,
  Search,
} from 'lucide-react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty, StatCard, Modal } from '../../components/ui.jsx';

export default function HodRecurring() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);
  const [draftModal, setDraftModal] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAnswer, setDraftAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/faculty/department/recurring')
      .then(({ data }) => setData(data))
      .catch(() => setData({ recurring: [], knowledgeGaps: [], totalQueriesAnalyzed: 0, totalGapsDetected: 0 }));
  }, []);

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const { recurring = [], knowledgeGaps = [], totalQueriesAnalyzed = 0, totalGapsDetected = 0 } = data;

  const openDraftModal = (item) => {
    setDraftModal(item);
    setDraftTitle(item.sample || `Guide on ${item.category}`);
    setDraftAnswer('');
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftAnswer.trim()) return;
    setBusy(true);
    try {
      await api.post('/admin/kb', {
        title: draftTitle,
        question: draftModal.sample || draftTitle,
        answer: draftAnswer,
        category: draftModal.category || 'General',
        tags: draftModal.keywords || [],
      });
      toast.success('Knowledge Base guide published successfully!');
      setDraftModal(null);
      // Reload
      const res = await api.get('/faculty/department/recurring');
      setData(res.data);
    } catch (e) {
      toast.error('Failed to create article');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Academic Pulse — Knowledge Gap Detection</h1>
          <p>
            NLP-driven intelligence identifying high-frequency student doubts and syllabus topics lacking verified Knowledge Hub articles.
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 840 }}>
        <StatCard icon={Search} value={totalQueriesAnalyzed} label="Total Queries Analyzed" tone="blue" />
        <StatCard icon={AlertTriangle} value={totalGapsDetected} label="Knowledge Gaps Detected" tone="red" />
        <StatCard icon={CheckCircle2} value={recurring.filter((r) => r.hasKbArticle).length} label="Topics With Verified Guides" tone="green" />
      </div>

      {knowledgeGaps.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} style={{ color: '#dc2626' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', margin: 0 }}>
              Priority Knowledge Gaps Requiring Faculty Guides ({knowledgeGaps.length})
            </h2>
          </div>

          <div className="grid-3">
            {knowledgeGaps.map((gap, i) => (
              <div key={i} className="card" style={{ border: '1.5px solid #fecaca', background: '#fff5f5' }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="pill red">
                      <AlertTriangle size={11} /> Unanswered Gap
                    </span>
                    <span className="pill high">{gap.count} Students Asked</span>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                    &ldquo;{gap.sample}&rdquo;
                  </h3>

                  <div className="chip-row" style={{ marginBottom: 12 }}>
                    {gap.keywords?.map((k, j) => (
                      <span key={j} className="chip blue" style={{ fontSize: 11 }}>
                        {k}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: 12.5, color: '#b91c1c', marginBottom: 14 }}>
                    {gap.recommendation}
                  </p>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openDraftModal(gap)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={15} /> Draft &amp; Publish Guide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
          All Recurring Query Clusters
        </h2>
        {recurring.length === 0 ? (
          <div className="card">
            <Empty text="No recurring patterns detected yet" sub="As students raise doubts, NLP will identify clusters here." />
          </div>
        ) : (
          <div className="grid-3">
            {recurring.map((c, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="pill purple">
                      <FileClock size={12} /> {c.category || 'General'}
                    </span>
                    <span className="pill high">
                      <TrendingUp size={12} /> {c.count}×
                    </span>
                  </div>
                  <div className="chip-row" style={{ marginBottom: 12 }}>
                    {c.keywords.filter(Boolean).map((k, j) => (
                      <span key={j} className="chip blue">
                        {k}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 13.5, color: '#4a6480', marginBottom: 12 }}>
                    Sample: &ldquo;{c.sample}&rdquo;
                  </p>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      background: c.hasKbArticle ? '#f0fdf4' : '#fff7ed',
                      color: c.hasKbArticle ? '#166534' : '#9a3412',
                      border: `1px solid ${c.hasKbArticle ? '#bbf7d0' : '#fed7aa'}`,
                    }}
                  >
                    {c.hasKbArticle ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} /> {c.recommendation}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} /> Knowledge Gap: No guide published
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draftModal && (
        <Modal title="Create Knowledge Base Guide for Detected Gap" onClose={() => setDraftModal(null)}>
          <form onSubmit={handleSaveArticle} style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label>Guide Title</label>
              <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label>Target Category</label>
              <input value={draftModal.category || 'General'} readOnly />
            </div>
            <div className="field">
              <label>Explanation / Answer Body</label>
              <textarea
                value={draftAnswer}
                onChange={(e) => setDraftAnswer(e.target.value)}
                placeholder="Write the verified faculty explanation..."
                rows={6}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDraftModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !draftAnswer.trim()}>
                Publish Guide
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
