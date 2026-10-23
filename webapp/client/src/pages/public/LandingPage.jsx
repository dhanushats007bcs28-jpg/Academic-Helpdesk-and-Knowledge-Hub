import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Users,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Award,
} from 'lucide-react';
import api from '../../api/client.js';

export default function LandingPage() {
  const nav = useNavigate();
  const [stats, setStats] = useState({
    departments: 6,
    subjects: 18,
    faculty: 37,
    articles: 5,
    resources: 4,
    projects: 1,
    resolvedTickets: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroSlides = [
    {
      title: 'MEPCO Schlenk Engineering College',
      subtitle: 'Autonomous Institution Affiliated to Anna University · Accredited by NAAC with "A" Grade & NBA',
      tagline: 'A Smart, Connected Academic Ecosystem for Student–Faculty Mentorship and Knowledge Discovery',
      accent: '#2563eb',
    },
    {
      title: 'NLP-Powered Academic Knowledge Hub',
      subtitle: 'Instant TF-IDF and Cosine Query Resolution with Transparent Relevance Explanations',
      tagline: 'Find verified solutions to recurring curriculum questions before raising a faculty ticket',
      accent: '#0891b2',
    },
    {
      title: 'Transparent 24-Working-Hour SLA Ladder',
      subtitle: 'Multi-Tiered Routing: Junior Faculty → Senior Faculty → Head of Department',
      tagline: 'Guaranteed support window (06:00 AM – 12:00 AM) respecting academic schedules',
      accent: '#7c3aed',
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, heroSlides.length]);

  useEffect(() => {
    api.get('/stats/public').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/departments').then(({ data }) => setDepartments(data.departments || [])).catch(() => {});
    api.get('/announcements/public').then(({ data }) => setAnnouncements(data.announcements || [])).catch(() => {});
    api.get('/resources/public').then(({ data }) => setResources(data.items?.slice(0, 4) || [])).catch(() => {});
    api.get('/projects/public').then(({ data }) => setProjects(data.projects?.slice(0, 3) || [])).catch(() => {});
    api.get('/kb').then(({ data }) => setKbArticles(data.items?.slice(0, 4) || [])).catch(() => {});
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      nav(`/login?tab=student&q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      nav('/login');
    }
  };

  return (
    <div className="landing-page" style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      {/* ----------------- TOP INSTITUTIONAL BAR ----------------- */}
      <header
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          fontSize: '12.5px',
          padding: '8px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>MEPCO SCHLENK ENGINEERING COLLEGE (AUTONOMOUS)</span>
            <span>·</span>
            <span>Sivakasi, Tamil Nadu 626005</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Estd. 1984</span>
            <span>·</span>
            <span>AICTE Approved</span>
            <span>·</span>
            <span>Anna University Affiliated</span>
          </div>
        </div>
      </header>

      {/* ----------------- MAIN NAVIGATION BAR ----------------- */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#ffffff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: 0.5,
              }}
            >
              M
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16.5, color: '#0f172a', letterSpacing: '-0.01em' }}>
                MEPCO Academic Helpdesk
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                Knowledge Hub &amp; Academic Ecosystem
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#about" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}>
              About
            </a>
            <a href="#departments" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}>
              Departments
            </a>
            <a href="#knowledge" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}>
              Knowledge Hub
            </a>
            <a href="#resources" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}>
              Study Resources
            </a>
            <a href="#announcements" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}>
              Notices
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
                Student Registration
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ----------------- HERO SLIDESHOW SECTION ----------------- */}
      <section
        style={{
          background: 'radial-gradient(ellipse at top, #1e293b, #0f172a)',
          color: '#ffffff',
          padding: '68px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: heroSlides[currentSlide].accent,
            opacity: 0.12,
            filter: 'blur(120px)',
            borderRadius: '50%',
            transition: 'background 1s ease',
          }}
        />

        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 20, fontSize: 13, border: '1px solid rgba(255,255,255,0.12)' }}>
            <Sparkles size={15} style={{ color: '#38bdf8' }} />
            <span>CSE Department · Batch 2024–2028 · Semester 5 Allowlist Active</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: 900,
              marginBottom: 16,
              letterSpacing: '-0.02em',
              transition: 'all 0.5s ease',
            }}
          >
            {heroSlides[currentSlide].title}
          </h1>

          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: 820, marginBottom: 12, lineHeight: 1.5 }}>
            {heroSlides[currentSlide].subtitle}
          </p>

          <p style={{ fontSize: '15px', color: '#38bdf8', maxWidth: 760, marginBottom: 36, fontWeight: 500 }}>
            {heroSlides[currentSlide].tagline}
          </p>

          {/* Quick Search in Hero */}
          <form
            onSubmit={handleHeroSearch}
            style={{
              maxWidth: 680,
              display: 'flex',
              background: '#ffffff',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              marginBottom: 36,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: '#64748b' }}>
              <Search size={20} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search normalization in DBMS, TCP handshake, AVL trees, or ask a doubt..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: '#0f172a',
                padding: '8px 0',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px', borderRadius: 8 }}>
              Search Hub
            </button>
          </form>

          {/* Slide Indicator Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: currentSlide === idx ? 28 : 10,
                  height: 8,
                  borderRadius: 4,
                  background: currentSlide === idx ? '#38bdf8' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
            <button
              onClick={() => setIsPaused((p) => !p)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
                marginLeft: 12,
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        </div>
      </section>

      {/* ----------------- SYSTEM STATS METRICS ----------------- */}
      <section style={{ maxWidth: 1240, margin: '-28px auto 60px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px 32px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{stats.departments}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Engineering Depts</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0891b2' }}>{stats.faculty}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>CSE Faculty &amp; HOD</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{stats.subjects}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Curriculum Courses</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{stats.articles}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Verified Solutions</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ea580c' }}>{stats.resources}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Study Notes &amp; Guides</div>
          </div>
        </div>
      </section>

      {/* ----------------- CORE ARCHITECTURAL PILLARS ----------------- */}
      <section id="about" style={{ maxWidth: 1240, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ color: '#2563eb', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Transforming Academic Assistance
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            Connected Ecosystem Built for Real Academic Workflows
          </h2>
          <p style={{ color: '#64748b', maxWidth: 650, margin: '10px auto 0', fontSize: 15.5 }}>
            Moving far beyond generic chatbots and sample static cards into a verified, role-governed platform.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div className="card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              Explainable NLP Retrieval
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              TF-IDF and cosine similarity engine matches student doubts against faculty-approved answers instantly, explaining exact technical overlapping terms and syllabus alignment.
            </p>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <Clock size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              Bottom-Up SLA Routing
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Queries not in the Knowledge Hub route from Junior Faculty (L1) to Senior Faculty (L2) and HOD (L3) with 24-working-hour deadlines within the 06:00 AM – 12:00 AM academic window.
            </p>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#faf5ff', color: '#7c3aed', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              Allowlist-Backed Identity
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Registration is verified against pre-authorized student roll numbers (24BCS064–24BCS100), ensuring zero account spoofing and preserving official institutional integrity.
            </p>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              Project Pulse Workspace
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Collaborative workspace for student project teams with milestone delivery tracking, task boards, and continuous mentor feedback from assigned course faculty.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------- DEPARTMENT EXPLORER ----------------- */}
      <section id="departments" style={{ background: '#f1f5f9', padding: '60px 24px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ color: '#2563eb', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Academic Divisions
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                Department Directory &amp; Faculty Leadership
              </h2>
            </div>
            <Link to="/login?tab=faculty" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              Faculty Portal <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {departments.map((dept) => (
              <div key={dept.code} style={{ background: '#ffffff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                      {dept.code}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Estd. {dept.establishedYear}</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{dept.name}</h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
                    {dept.description || 'Specialized engineering curriculum and state-of-the-art laboratory research.'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>HOD: </span>
                    <strong style={{ color: '#1e293b' }}>
                      {dept.code === 'CSE' ? 'Dr. J. Raja Sekar' : dept.hod?.name || 'Department Head'}
                    </strong>
                  </div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Ext: {dept.phoneExtension || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- KNOWLEDGE HUB PREVIEW ----------------- */}
      <section id="knowledge" style={{ maxWidth: 1240, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ color: '#2563eb', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Knowledge Hub
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              Verified Academic Answers &amp; Topic Guides
            </h2>
          </div>
          <Link to="/login" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            Browse Full Knowledge Base <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {kbArticles.map((art) => (
            <div
              key={art._id}
              onClick={() => nav('/login')}
              style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: 22,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#faf5ff', padding: '3px 8px', borderRadius: 6 }}>
                  {art.category}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{art.views || 0} views</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 10, lineHeight: 1.4 }}>
                {art.title}
              </h3>
              <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                {art.answer}
              </p>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#2563eb', fontWeight: 600 }}>
                Read full explanation <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------- ANNOUNCEMENTS & STUDY MATERIALS ----------------- */}
      <section id="resources" style={{ background: '#f8fafc', padding: '40px 24px 80px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 36 }}>
          {/* Study Resources */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Latest Study Resources</h2>
              <Link to="/login" style={{ fontSize: 13, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {resources.map((res) => (
                <div key={res._id} style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {res.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                      {res.subject} · {res.resourceType?.toUpperCase()} · {res.downloadsCount || 0} downloads
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Notices */}
          <div id="announcements">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Official Academic Notices</h2>
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, background: '#f0fdf4', padding: '3px 8px', borderRadius: 6 }}>
                Active Broadcasts
              </span>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {announcements.map((ann) => (
                <div key={ann._id} style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: ann.priority === 'urgent' ? '#dc2626' : '#2563eb', textTransform: 'uppercase' }}>
                      {ann.category}
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(ann.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a', marginBottom: 4 }}>
                    {ann.title}
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- CALL TO ACTION ----------------- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          color: '#ffffff',
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
            Ready to Connect with Your Faculty?
          </h2>
          <p style={{ fontSize: 16, color: '#bfdbfe', marginBottom: 28, lineHeight: 1.5 }}>
            Access verified academic materials, get instant NLP answers, and submit questions with 24-working-hour SLA response guarantees.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/register" className="btn" style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 700, padding: '12px 24px' }}>
              Student Allowlist Registration
            </Link>
            <Link to="/login" className="btn btn-ghost" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontWeight: 600, padding: '12px 24px' }}>
              Institutional Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------- FOOTER ----------------- */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '48px 24px 32px', fontSize: 13.5 }}>
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 36,
            marginBottom: 40,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#ffffff', marginBottom: 12 }}>
              MEPCO Schlenk Engineering College
            </div>
            <p style={{ lineHeight: 1.6, color: '#64748b' }}>
              An Autonomous Institution affiliated to Anna University, Chennai. Accredited by NAAC with &apos;A&apos; Grade and NBA.
            </p>
            <div style={{ marginTop: 12, color: '#38bdf8', fontWeight: 500 }}>
              Mepco Engineering College Post, Sivakasi, Tamil Nadu 626005
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>Academic Support</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Knowledge Base</Link>
              <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Ask Faculty a Query</Link>
              <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>SLA Escalation Policy</Link>
              <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Study Materials Repository</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>Key Portals</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link to="/login?tab=student" style={{ color: '#94a3b8', textDecoration: 'none' }}>Student Portal</Link>
              <Link to="/login?tab=faculty" style={{ color: '#94a3b8', textDecoration: 'none' }}>Faculty Portal</Link>
              <Link to="/login?tab=hod" style={{ color: '#94a3b8', textDecoration: 'none' }}>HOD Department Oversight</Link>
              <Link to="/login?tab=admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>Administrator Control</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>Governance &amp; Trust</div>
            <p style={{ lineHeight: 1.6, color: '#64748b' }}>
              All queries and answers are role-governed. Support window configured for 06:00 AM – 12:00 AM working schedules.
            </p>
            <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a' }}>
              ● Operational · Local MongoDB Connected
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
          &copy; {new Date().getFullYear()} MEPCO Schlenk Engineering College. Academic Helpdesk &amp; Knowledge Hub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
