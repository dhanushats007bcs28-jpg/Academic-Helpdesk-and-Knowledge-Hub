import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty } from '../../components/ui.jsx';
import { FileClock, TrendingUp } from 'lucide-react';

export default function HodRecurring() {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get('/faculty/department/recurring').then(({ data }) => setItems(data.recurring)).catch(() => setItems([])); }, []);
  if (!items) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Recurring Queries</h1><p>Clusters of similar questions detected through NLP keyword grouping — candidates for the knowledge base.</p></div>
      </div>

      {items.length === 0 ? <div className="card"><Empty text="No recurring patterns detected yet" /></div> : (
        <div className="grid-3">
          {items.map((c, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="pill purple"><FileClock size={12} /> {c.category || 'General'}</span>
                  <span className="pill high"><TrendingUp size={12} /> {c.count}×</span>
                </div>
                <div className="chip-row" style={{ marginBottom: 12 }}>
                  {c.keywords.filter(Boolean).map((k, j) => <span key={j} className="chip blue">{k}</span>)}
                </div>
                <p style={{ fontSize: 13.5, color: '#4a6480' }}>Sample: “{c.sample}”</p>
                <div className="alert info" style={{ marginTop: 14, marginBottom: 0 }}>
                  <div style={{ fontSize: 13 }}>Recurring {c.count} times — consider adding or promoting a knowledge base article.</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
