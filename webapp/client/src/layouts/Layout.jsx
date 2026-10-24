import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, MessageSquarePlus, Library, Ticket, Bell, User, Settings, LogOut,
  Users, ClipboardList, BarChart3, GraduationCap, Building2, ShieldCheck, Activity,
  Timer, BookOpen, Menu, X, FileClock, UserCog, Layers, Network, FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'U';

const NAV = {
  student: [
    { label: 'Helpdesk & Doubt Resolution', items: [
      { to: '/student', icon: LayoutDashboard, text: 'Dashboard', end: true },
      { to: '/student/ask', icon: MessageSquarePlus, text: 'Ask a Query' },
      { to: '/student/tickets', icon: Ticket, text: 'My Tickets' },
      { to: '/student/knowledge', icon: Library, text: 'Knowledge Hub' },
    ]},
    { label: 'Academic & Projects', items: [
      { to: '/student/resources', icon: FolderOpen, text: 'Study Materials' },
      { to: '/student/graph', icon: Network, text: 'Knowledge Graph' },
      { to: '/student/projects', icon: Layers, text: 'Project Pulse' },
      { to: '/student/academics', icon: GraduationCap, text: 'Academic Profile' },
      { to: '/student/notifications', icon: Bell, text: 'Notifications', badge: 'unread' },
    ]},
  ],
  faculty: [
    { label: 'Workspace', items: [
      { to: '/faculty', icon: LayoutDashboard, text: 'Dashboard', end: true },
      { to: '/faculty/tickets', icon: Ticket, text: 'Assigned Tickets', badge: 'queue' },
      { to: '/faculty/knowledge', icon: Library, text: 'Knowledge Hub' },
      { to: '/faculty/resources', icon: FolderOpen, text: 'Study Resources' },
      { to: '/faculty/graph', icon: Network, text: 'Knowledge Graph' },
      { to: '/faculty/projects', icon: Layers, text: 'Project Mentoring' },
      { to: '/faculty/availability', icon: Timer, text: 'Availability & Load' },
    ]},
    { label: 'Insights', items: [
      { to: '/faculty/reports', icon: BarChart3, text: 'My Reports' },
      { to: '/faculty/students', icon: Users, text: 'My Students' },
      { to: '/faculty/notifications', icon: Bell, text: 'Notifications', badge: 'unread' },
      { to: '/faculty/profile', icon: User, text: 'Profile' },
    ]},
  ],
  hod: [
    { label: 'Department Leadership', items: [
      { to: '/hod', icon: LayoutDashboard, text: 'Department Dashboard', end: true },
      { to: '/hod/tickets', icon: Ticket, text: 'Department Tickets', badge: 'dept' },
      { to: '/hod/escalations', icon: Layers, text: 'Escalations' },
      { to: '/hod/recurring', icon: FileClock, text: 'Academic Pulse' },
      { to: '/hod/faculty', icon: UserCog, text: 'Faculty Workload' },
      { to: '/hod/projects', icon: Layers, text: 'Department Projects' },
      { to: '/hod/graph', icon: Network, text: 'Knowledge Graph' },
      { to: '/hod/resources', icon: FolderOpen, text: 'Study Resources' },
      { to: '/hod/notifications', icon: Bell, text: 'Notifications', badge: 'unread' },
      { to: '/hod/profile', icon: User, text: 'Profile' },
    ]},
  ],
  admin: [
    { label: 'Oversight', items: [
      { to: '/admin', icon: LayoutDashboard, text: 'Dashboard', end: true },
      { to: '/admin/queries', icon: ClipboardList, text: 'All Queries' },
      { to: '/admin/sla', icon: Timer, text: 'SLA Monitor', badge: 'sla' },
      { to: '/admin/analytics', icon: BarChart3, text: 'Analytics' },
    ]},
    { label: 'Manage Identity', items: [
      { to: '/admin/allowlist', icon: ShieldCheck, text: 'Student Allowlist' },
      { to: '/admin/students', icon: GraduationCap, text: 'Students' },
      { to: '/admin/faculty', icon: Users, text: 'Faculty' },
      { to: '/admin/hods', icon: Building2, text: 'HODs' },
    ]},
    { label: 'System & Knowledge', items: [
      { to: '/admin/knowledge', icon: BookOpen, text: 'Knowledge Base' },
      { to: '/admin/resources', icon: FolderOpen, text: 'Study Resources' },
      { to: '/admin/graph', icon: Network, text: 'Knowledge Graph' },
      { to: '/admin/activity', icon: Activity, text: 'Activity Log' },
      { to: '/admin/notifications', icon: Bell, text: 'Notifications', badge: 'unread' },
      { to: '/admin/profile', icon: Settings, text: 'Settings' },
    ]},
  ],
};

export default function Layout({ children, unread = 0, extraBadges = {} }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const groups = NAV[user?.role] || [];

  const badgeVal = (key) => {
    if (key === 'unread') return unread;
    return extraBadges[key] || 0;
  };

  const isActive = (to, end) => (end ? loc.pathname === to : loc.pathname.startsWith(to));

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="topbar-brand">
          <div className="brand-logo">AH</div>
          <div className="brand-text">
            <strong>Academic Helpdesk</strong>
            <span>Knowledge Hub · Intelligent Support</span>
          </div>
        </div>

        <div className="topbar-search">
          <input
            placeholder="Search tickets, knowledge base, students…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                const base = user.role === 'student' ? '/student/tickets' : user.role === 'admin' ? '/admin/queries' : '/faculty/tickets';
                nav(`${base}?q=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
        </div>

        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => nav(`/${user.role}/notifications`)} aria-label="Notifications">
            <Bell size={21} />
            {unread > 0 && <span className="icon-badge">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <div className="user-chip" onClick={() => nav(`/${user.role}/profile`)}>
            {user?.profileImage ? <img className="avatar" src={user.profileImage} alt="Profile" style={{ objectFit: 'cover' }} /> : <div className="avatar" style={{ background: user?.avatarColor || '#2563eb' }}>{initials(user?.name)}</div>}
            <div>
              <div className="u-name">{user?.name}</div>
              <div className="u-role">{user?.designation || user?.role?.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {groups.map((g) => (
          <div key={g.label}>
            <div className="nav-label">{g.label}</div>
            {g.items.map((it) => {
              const b = it.badge ? badgeVal(it.badge) : 0;
              return (
                <button
                  key={it.to}
                  className={`nav-item ${isActive(it.to, it.end) ? 'active' : ''}`}
                  onClick={() => { nav(it.to); setOpen(false); }}
                >
                  <it.icon size={19} />
                  <span>{it.text}</span>
                  {b > 0 && <span className="nav-count">{b}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => { logout(); nav('/login'); }}>
            <LogOut size={19} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
