import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty, ConfidenceBar } from '../../components/ui.jsx';
import { Search, BookOpen, Eye, Tag } from 'lucide-react';

export default function KnowledgeBase() {
  const { unread, badges } = useShellData();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (category) qs.set('category', category);
      const { data } = await api.get(`/kb?${qs}`);
      setItems(data.items || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { api.get('/kb/categories').then(({ data }) => setCats(data.categories)); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, category]);

  const open = async (a) => {
    setActive(a);
    try { await api.get(`/kb/${a._id}`); } catch { /* ignore */ }
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Knowledge Base</h1><p>Search {cats.reduce((s, c) => s + c.count, 0) || ''} verified answers — powered by text-analytics relevance ranking.</p></div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything — e.g. 'how is attendance calculated?'" style={{ width: '100%', paddingRight: 44 }} />
          <Search size={18} style={{ position: 'absolute', right: 14, top: 12, color: 'var(--muted)' }} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No articles found" sub="Try different keywords or browse by category." /></div>
      ) : (
        <div className="grid-3">
          {items.map((a) => (
            <div key={a._id} className="card" style={{ cursor: 'pointer', transition: 'transform .15s' }} onClick={() => open(a)}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                  <span className="pill purple"><BookOpen size={12} /> {a.category}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {a.views}</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, lineHeight: 1.35 }}>{a.title}</h3>
                <p style={{ fontSize: 13.5, color: '#4a6480' }}>{String(a.answer).slice(0, 120)}…</p>
                {typeof a.score === 'number' && (
                  <div style={{ marginTop: 14 }}><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>Relevance</div><ConfidenceBar score={a.score} /></div>
                )}
                {a.tags?.length > 0 && (
                  <div className="chip-row" style={{ marginTop: 14 }}>
                    {a.tags.slice(0, 4).map((t, i) => <span key={i} className="chip">{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && setActive(null)}>
          <div className="modal modal-lg">
            <div className="modal-head"><h3>{active.title}</h3><button className="close-x" onClick={() => setActive(null)}>×</button></div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                <span className="pill purple">{active.category}</span>
                {active.subject && <span className="pill info">{active.subject}</span>}
                <span className="pill muted"><Eye size={12} /> {active.views} views</span>
              </div>
              <div className="alert info" style={{ marginBottom: 18 }}><Tag size={18} /><div><b>Question</b>{active.question}</div></div>
              <p style={{ color: '#2b455f', fontSize: 15, lineHeight: 1.75 }}>{active.answer}</p>
              {active.tags?.length > 0 && (
                <div style={{ marginTop: 20 }}><div className="k" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>TAGS</div>
                  <div className="chip-row">{active.tags.map((t, i) => <span key={i} className="chip blue">{t}</span>)}</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
