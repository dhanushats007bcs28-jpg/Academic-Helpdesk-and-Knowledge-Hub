import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty, StatCard } from '../../components/ui.jsx';
import { Users, GraduationCap } from 'lucide-react';

export default function FacultyStudents() {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get('/tickets/mine/history').catch(() => {}); }, []);
  useEffect(() => {
    // Students visible to a faculty member via their ticket history.
    api.get('/tickets?limit=100').then(async ({ data }) => {
      const map = new Map();
      data.items.forEach((t) => { if (t.student) map.set(t.student._id, t.student); });
      setItems([...map.values()]);
    }).catch(() => setItems([]));
  }, []);

  if (!items) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>My Students</h1><p>Students who have raised tickets you handle.</p></div></div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 620 }}>
        <StatCard icon={Users} value={items.length} label="Students Interacted With" tone="blue" />
        <StatCard icon={GraduationCap} value={new Set(items.map((s) => s.department)).size} label="Departments" tone="purple" />
      </div>

      <div className="card">
        {items.length === 0 ? <Empty text="No students yet" sub="Students appear here once they raise tickets you handle." /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Name</th><th>Roll Number</th><th>Department</th><th>Email</th></tr></thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s._id}>
                    <td className="t-strong">{s.name}</td>
                    <td>{s.rollNumber || '—'}</td>
                    <td>{s.department || '—'}</td>
                    <td style={{ fontSize: 13 }}>{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
