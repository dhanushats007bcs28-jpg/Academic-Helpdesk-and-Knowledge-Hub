import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty, StatCard } from '../../components/ui.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, Ticket, CheckCircle2, Activity } from 'lucide-react';

export default function HodFaculty() {
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/faculty/department/overview').then(({ data }) => setData(data)).catch(() => {}); }, []);
  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const load = data.workloadDistribution.map((f) => ({ name: f.name.split(' ').slice(-1)[0], load: f.load }));

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>Faculty Workload</h1><p>Current load across {data.faculty.length} faculty members in {data.department}.</p></div></div>

      <div className="grid-2-even" style={{ alignItems: 'start', marginBottom: 22 }}>
        <div className="card">
          <div className="card-head"><h3>Load Distribution</h3></div>
          <div className="card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={load}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="load" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Team Summary</h3></div>
          <div className="card-body">
            <div className="kv">
              <div><div className="k">Total Faculty</div><div className="v">{data.faculty.length}</div></div>
              <div><div className="k">Combined Open Load</div><div className="v">{data.faculty.reduce((s, f) => s + (f.currentLoad || 0), 0)}</div></div>
              <div><div className="k">Available Now</div><div className="v">{data.faculty.filter((f) => f.isAvailable).length}</div></div>
              <div><div className="k">Students Served</div><div className="v">{data.studentCount}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Faculty Directory</h3></div>
        {data.faculty.length === 0 ? <Empty text="No faculty in this department" /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Name</th><th>Designation</th><th>Level</th><th>Subjects</th><th>Open</th><th>Resolved</th><th>Status</th></tr></thead>
              <tbody>
                {data.faculty.map((f) => (
                  <tr key={f._id}>
                    <td className="t-strong">{f.name}</td>
                    <td>{f.designation}</td>
                    <td><span className="pill purple">L{f.level}</span></td>
                    <td style={{ fontSize: 13 }}>{(f.subjects || []).slice(0, 3).join(', ') || '—'}</td>
                    <td><strong>{f.openTickets}</strong> / {f.maxOpenTickets}</td>
                    <td>{f.resolvedTickets}</td>
                    <td><span className={`pill ${f.isAvailable ? 'resolved' : 'muted'}`}>{f.isAvailable ? 'Available' : 'Unavailable'}</span></td>
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
