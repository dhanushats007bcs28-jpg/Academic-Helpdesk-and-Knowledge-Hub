import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Layout from '../layouts/Layout.jsx';
import { useShellData } from '../App.jsx';
import { Spinner, Empty, ConfidenceBar } from '../components/ui.jsx';
import { Search, BookOpen, Eye, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/** Shared KB browser for faculty / HOD (read-only, with richer detail). */
export function KnowledgeBasePage() {
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const [q, setQ] = useState('');
  const [cats, setCats] = useState([]);
  const [category, setCategory] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (category) qs.set('category', category);
      const { data } = await api.get(`/kb?${qs}`);
      setItems(data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { api.get('/kb/categories').then(({ data }) => setCats(data.categories)); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, category]);

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Knowledge Base</h1><p>Search verified answers used by the NLP matcher to auto-resolve student queries.</p></div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge base…" style={{ width: '100%', paddingRight: 44 }} />
          <Search size={18} style={{ position: 'absolute', right: 14, top: 12, color: 'var(--muted)' }} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No articles found" /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Title</th><th>Category</th><th>Subject</th><th>Views</th>{q && <th>Relevance</th>}</tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id} style={{ cursor: 'pointer' }} onClick={() => setActive(a)}>
                    <td className="t-strong">{a.title}</td>
                    <td><span className="pill purple">{a.category}</span></td>
                    <td>{a.subject || '—'}</td>
                    <td>{a.views}</td>
                    {q && <td style={{ minWidth: 160 }}>{typeof a.score === 'number' && <ConfidenceBar score={a.score} />}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active && (
        <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && setActive(null)}>
          <div className="modal modal-lg">
            <div className="modal-head"><h3>{active.title}</h3><button className="close-x" onClick={() => setActive(null)}>×</button></div>
            <div className="modal-body">
              <span className="pill purple" style={{ marginBottom: 16, display: 'inline-flex' }}><BookOpen size={13} /> {active.category}</span>
              <div className="alert info" style={{ marginBottom: 18 }}><div><b>Question</b>{active.question}</div></div>
              <p style={{ color: '#2b455f', fontSize: 15, lineHeight: 1.75 }}>{active.answer}</p>
              {active.lemmas?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>NLP INDEX TERMS (lemmatized)</div>
                  <div className="chip-row">{active.lemmas.slice(0, 20).map((t, i) => <span key={i} className="chip">{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default KnowledgeBasePage;
