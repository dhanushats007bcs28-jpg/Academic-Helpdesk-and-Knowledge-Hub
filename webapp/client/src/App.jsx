import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import api from './api/client.js';

import Login from './pages/auth/Login.jsx';
import CreateAccount from './pages/auth/CreateAccount.jsx';
import LandingPage from './pages/public/LandingPage.jsx';

import StudentDashboard from './pages/student/StudentDashboard.jsx';
import AskQuery from './pages/student/AskQuery.jsx';
import KnowledgeBase from './pages/student/KnowledgeBase.jsx';
import MyTickets from './pages/student/MyTickets.jsx';
import TicketDetail from './pages/TicketDetail.jsx';
import AcademicInfo from './pages/student/AcademicInfo.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';

import ResourceHub from './pages/shared/ResourceHub.jsx';
import ProjectWorkspace from './pages/shared/ProjectWorkspace.jsx';
import KnowledgeGraph from './pages/shared/KnowledgeGraph.jsx';

import FacultyDashboard from './pages/faculty/FacultyDashboard.jsx';
import FacultyTickets from './pages/faculty/FacultyTickets.jsx';
import FacultyAvailability from './pages/faculty/FacultyAvailability.jsx';
import FacultyReports from './pages/faculty/FacultyReports.jsx';
import FacultyStudents from './pages/faculty/FacultyStudents.jsx';

import HodDashboard from './pages/hod/HodDashboard.jsx';
import HodTickets from './pages/hod/HodTickets.jsx';
import HodFaculty from './pages/hod/HodFaculty.jsx';
import HodRecurring from './pages/hod/HodRecurring.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminQueries from './pages/admin/AdminQueries.jsx';
import AdminSla from './pages/admin/AdminSla.jsx';
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx';
import AdminActivity from './pages/admin/AdminActivity.jsx';
import AdminKnowledge from './pages/admin/AdminKnowledge.jsx';
import AdminAllowlist from './pages/admin/AdminAllowlist.jsx';

import { KnowledgeBasePage } from './pages/KnowledgeShared.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

/** Shared data hook for the shell: unread notifications + role badges. */
export function useShellData() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [badges, setBadges] = useState({});
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (alive) setUnread(data.unread || 0);
        if (user.role === 'faculty') {
          const w = await api.get('/faculty/workload');
          if (alive) setBadges({ queue: w.data.stats.open });
        } else if (user.role === 'hod') {
          const d = await api.get('/faculty/department/overview');
          if (alive) setBadges({ dept: d.data.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length });
        } else if (user.role === 'admin') {
          const s = await api.get('/admin/sla');
          if (alive) setBadges({ sla: s.data.summary.overdue });
        }
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [user]);
  return { unread, badges, refresh: () => {} };
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={`/${user.role}`} replace /> : <CreateAccount />} />

      {/* Student */}
      <Route path="/student" element={<Protected roles={['student']}><StudentDashboard /></Protected>} />
      <Route path="/student/ask" element={<Protected roles={['student']}><AskQuery /></Protected>} />
      <Route path="/student/knowledge" element={<Protected roles={['student']}><KnowledgeBase /></Protected>} />
      <Route path="/student/tickets" element={<Protected roles={['student']}><MyTickets /></Protected>} />
      <Route path="/student/resources" element={<Protected roles={['student']}><ResourceHub /></Protected>} />
      <Route path="/student/projects" element={<Protected roles={['student']}><ProjectWorkspace /></Protected>} />
      <Route path="/student/graph" element={<Protected roles={['student']}><KnowledgeGraph /></Protected>} />
      <Route path="/student/academics" element={<Protected roles={['student']}><AcademicInfo /></Protected>} />

      {/* Shared (any authenticated role) */}
      <Route path="/tickets/:id" element={<Protected><TicketDetail /></Protected>} />
      <Route path="/:role/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/:role/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/faculty/knowledge" element={<Protected roles={['faculty']}><KnowledgeBasePage /></Protected>} />
      <Route path="/hod/knowledge" element={<Protected roles={['hod']}><KnowledgeBasePage /></Protected>} />
      <Route path="/faculty/resources" element={<Protected roles={['faculty']}><ResourceHub /></Protected>} />
      <Route path="/hod/resources" element={<Protected roles={['hod']}><ResourceHub /></Protected>} />
      <Route path="/faculty/projects" element={<Protected roles={['faculty']}><ProjectWorkspace /></Protected>} />
      <Route path="/hod/projects" element={<Protected roles={['hod']}><ProjectWorkspace /></Protected>} />
      <Route path="/faculty/graph" element={<Protected roles={['faculty']}><KnowledgeGraph /></Protected>} />
      <Route path="/hod/graph" element={<Protected roles={['hod']}><KnowledgeGraph /></Protected>} />

      {/* Faculty */}
      <Route path="/faculty" element={<Protected roles={['faculty']}><FacultyDashboard /></Protected>} />
      <Route path="/faculty/tickets" element={<Protected roles={['faculty']}><FacultyTickets /></Protected>} />
      <Route path="/faculty/tickets/:id" element={<Protected roles={['faculty', 'hod', 'admin']}><TicketDetail /></Protected>} />
      <Route path="/faculty/availability" element={<Protected roles={['faculty']}><FacultyAvailability /></Protected>} />
      <Route path="/faculty/reports" element={<Protected roles={['faculty']}><FacultyReports /></Protected>} />
      <Route path="/faculty/students" element={<Protected roles={['faculty']}><FacultyStudents /></Protected>} />

      {/* HOD */}
      <Route path="/hod" element={<Protected roles={['hod']}><HodDashboard /></Protected>} />
      <Route path="/hod/tickets" element={<Protected roles={['hod']}><HodTickets /></Protected>} />
      <Route path="/hod/escalations" element={<Protected roles={['hod']}><HodTickets escalationsOnly /></Protected>} />
      <Route path="/hod/faculty" element={<Protected roles={['hod']}><HodFaculty /></Protected>} />
      <Route path="/hod/recurring" element={<Protected roles={['hod']}><HodRecurring /></Protected>} />

      {/* Admin */}
      <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
      <Route path="/admin/queries" element={<Protected roles={['admin']}><AdminQueries /></Protected>} />
      <Route path="/admin/sla" element={<Protected roles={['admin']}><AdminSla /></Protected>} />
      <Route path="/admin/analytics" element={<Protected roles={['admin']}><AdminAnalytics /></Protected>} />
      <Route path="/admin/allowlist" element={<Protected roles={['admin']}><AdminAllowlist /></Protected>} />
      <Route path="/admin/resources" element={<Protected roles={['admin']}><ResourceHub /></Protected>} />
      <Route path="/admin/graph" element={<Protected roles={['admin']}><KnowledgeGraph /></Protected>} />
      <Route path="/admin/students" element={<Protected roles={['admin']}><AdminUsers role="student" title="Students" /></Protected>} />
      <Route path="/admin/faculty" element={<Protected roles={['admin']}><AdminUsers role="faculty" title="Faculty" /></Protected>} />
      <Route path="/admin/hods" element={<Protected roles={['admin']}><AdminUsers role="hod" title="Heads of Department" /></Protected>} />
      <Route path="/admin/knowledge" element={<Protected roles={['admin']}><AdminKnowledge /></Protected>} />
      <Route path="/admin/activity" element={<Protected roles={['admin']}><AdminActivity /></Protected>} />

      <Route path="*" element={<Navigate to={user ? `/${user.role}` : '/'} replace />} />
    </Routes>
  );
}
