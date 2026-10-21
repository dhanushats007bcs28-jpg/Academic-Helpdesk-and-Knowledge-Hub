import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, Spinner, Empty } from '../../components/ui.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Ticket, TrendingUp, Star, Layers, Users, Sparkles } from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0d9488', '#0891b2', '#db2777'];

export default function AdminAnalytics() {
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/admin/analytics/overview').then(({ data }) => setData(data)).catch(() => {}); }, []);
  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;
  const t = data.totals;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>System Analytics</h1><p>Cross-departmental insight into query patterns, resolution performance and faculty load.</p></div></div>

      <div className="stats-grid">
        <StatCard icon={TrendingUp} value={`${data.resolutionRate}%`} label="Resolution Rate" tone="green" />
        <StatCard icon={Star} value={data.avgRating ?? '—'} label={`Avg Rating (${data.ratingCount} reviews)`} tone="orange" />
        <StatCard icon={Sparkles} value={t.kbAuto} label="Answered from KB" tone="purple" />
        <StatCard icon={Layers} value={t.escalated} label="Escalations" tone="red" />
      </div>

      <div className="grid-2-even" style={{ alignItems: 'start', marginBottom: 22 }}>
        <div className="card">
          <div className="card-head"><h3>Queries by Category</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {data.byCategory.length === 0 ? <Empty text="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory.map((c) => ({ name: c._id, value: c.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Escalation Levels Distribution</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byLevel.map((l) => ({ name: l._id === 0 ? 'Unassigned' : `Level ${l._id}`, value: l.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={3}>
                  {data.byLevel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Faculty Load Ranking</h3></div>
          {data.topFaculty.length === 0 ? <Empty text="No faculty" /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Role</th><th>Level</th><th>Department</th><th>Open Load</th></tr></thead>
                <tbody>
                  {data.topFaculty.map((f) => (
                    <tr key={f._id}>
                      <td className="t-strong">{f.name}</td>
                      <td><span className={`pill ${f.role === 'hod' ? 'purple' : 'info'}`}>{f.role}</span></td>
                      <td><span className="pill purple">L{f.level}</span></td>
                      <td style={{ fontSize: 13 }}>{f.department}</td>
                      <td><strong>{f.currentLoad}</strong> / {f.maxOpenTickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Department Workload</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {data.deptLoad.length === 0 ? <Empty text="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.deptLoad.map((d) => ({ name: (d._id || '—').split(' ')[0], load: d.load }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="load" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
