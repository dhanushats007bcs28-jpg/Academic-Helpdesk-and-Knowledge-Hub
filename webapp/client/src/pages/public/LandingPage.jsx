import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileText,
  Layers,
  ChevronRight,
} from 'lucide-react';
import api from '../../api/client.js';

// Automatically load images from src/pages/public/images.
// Supports PNG, JPG, JPEG, and WEBP images.
const heroImages = Object.entries(
  import.meta.glob('./images/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
    eager: true,
    query: '?url',
    import: 'default',
  })
)
  .sort(([pathA], [pathB]) => {
    const getNumber = (path) => {
      const match = path.match(/image(\d+)\./i);
      return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    return getNumber(pathA) - getNumber(pathB);
  })
  .map(([, imageUrl]) => imageUrl);

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

  // Slide 0 is the introduction.
  // Slides 1 onward display the campus images.
  const totalSlides = heroImages.length + 1;

  // Automatically change slides every five seconds.
  useEffect(() => {
  if (isPaused || totalSlides <= 1) return;

  const timer = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, 5000);

  return () => clearInterval(timer);
}, [isPaused, totalSlides]);

  // Load public landing-page information.
  useEffect(() => {
    api
      .get('/stats/public')
      .then(({ data }) => setStats(data))
      .catch(() => {});

    api
      .get('/departments')
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {});

    api
      .get('/announcements/public')
      .then(({ data }) => setAnnouncements(data.announcements || []))
      .catch(() => {});

    api
      .get('/resources/public')
      .then(({ data }) => setResources(data.items?.slice(0, 4) || []))
      .catch(() => {});

    api
      .get('/projects/public')
      .then(({ data }) => setProjects(data.projects?.slice(0, 3) || []))
      .catch(() => {});

    api
      .get('/kb')
      .then(({ data }) => setKbArticles(data.items?.slice(0, 4) || []))
      .catch(() => {});
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
    <div
      className="landing-page"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#1e293b',
      }}
    >
      {/* TOP INSTITUTIONAL BAR */}
      <header
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          fontSize: 12.5,
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
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              MEPCO SCHLENK ENGINEERING COLLEGE (AUTONOMOUS)
            </span>
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

      {/* MAIN NAVIGATION BAR */}
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
            flexWrap: 'wrap',
            gap: 16,
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
                flexShrink: 0,
              }}
            >
              M
            </div>

            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16.5,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                MEPCO Academic Helpdesk
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                Knowledge Hub &amp; Academic Ecosystem
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <a href="#about" style={navLinkStyle}>
              About
            </a>
            <a href="#departments" style={navLinkStyle}>
              Departments
            </a>
            <a href="#knowledge" style={navLinkStyle}>
              Knowledge Hub
            </a>
            <a href="#resources" style={navLinkStyle}>
              Study Resources
            </a>
            <a href="#announcements" style={navLinkStyle}>
              Notices
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                to="/login"
                className="btn btn-ghost btn-sm"
                style={{ fontWeight: 600 }}
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 600 }}
              >
                Student Registration
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* COMBINED HERO: INTRODUCTION + 14 CAMPUS IMAGES */}
      <section
        id="home"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          position: 'relative',
          isolation: 'isolate',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 110px)',
          display: 'flex',
          alignItems: 'center',
          padding: '70px 24px',
          background: '#0f172a',
        }}

      >
        {/* Image slides: slide 0 is the introduction */}
        {heroImages.map((image, index) => (
          <img
            key={image}
            src={image}
            alt={`Academic campus slideshow ${index + 1}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              console.error(`Unable to load slideshow image: ${image}`);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: currentSlide === index + 1 ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
              zIndex: 0,
            }}
          />
        ))}

        {/* Dark overlay improves text visibility on image slides */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              currentSlide === 0
                ? 'linear-gradient(135deg, #0f172a, #1e3a8a)'
                : 'linear-gradient(90deg, rgba(2,6,23,0.82), rgba(15,23,42,0.35))',
            transition: 'background 0.8s ease',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Introduction content: displayed on slide 1 only */}
        <div
          style={{
            maxWidth: 1240,
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {currentSlide === 0 ? (
            <>
              <div
                style={{
                  color: '#7dd3fc',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: 20,
                }}
              >
                ✦ Academic Support · Knowledge Sharing · Project Collaboration
              </div>

              <h1
                style={{
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  maxWidth: 900,
                  marginBottom: 24,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Your Academic Journey, Connected.
              </h1>

              <p
                style={{
                  fontSize: 'clamp(17px, 2vw, 21px)',
                  color: '#e2e8f0',
                  maxWidth: 820,
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}
              >
                One platform for academic queries, trusted learning resources,
                faculty guidance, and collaborative student projects.
              </p>

              <p
                style={{
                  fontSize: 16,
                  color: '#bae6fd',
                  maxWidth: 760,
                  marginBottom: 32,
                  lineHeight: 1.7,
                }}
              >
                Find helpful answers, explore study materials, and connect with
                the right academic support.
              </p>

              {/* Original academic search form */}
              <form
                onSubmit={handleHeroSearch}
                style={{
                  maxWidth: 680,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    color: '#64748b',
                  }}
                >
                  <Search size={20} />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search study topics or enter your academic question..."
                  aria-label="Search academic resources"
                  style={{
                    flex: '1 1 220px',
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    fontSize: 15,
                    color: '#0f172a',
                    padding: '12px 0',
                  }}
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '12px 22px',
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                >
                  Search Hub
                </button>
              </form>

              <div
                style={{
                  marginTop: 28,
                  fontSize: 13,
                  color: '#cbd5e1',
                }}
              >
                Explore academic resources, faculty guidance, and student
                projects
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#7dd3fc',
                  letterSpacing: '0.08em',
                  marginBottom: 14,
                }}
              >
                CAMPUS &amp; ACADEMIC LIFE
              </div>

              <h2
                style={{
                  fontSize: 'clamp(28px, 4vw, 46px)',
                  fontWeight: 800,
                  maxWidth: 760,
                  lineHeight: 1.2,
                  marginBottom: 16,
                }}
              >
                Explore Our Academic Journey
              </h2>

              <p
                style={{
                  maxWidth: 650,
                  color: '#e2e8f0',
                  lineHeight: 1.7,
                  fontSize: 16,
                  marginBottom: 28,
                }}
              >
                Discover the campus, learning environment, and experiences that
                bring our academic community together.
              </p>

              <a
                href="#about"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 18px',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: 8,
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Discover Our Platform <ArrowRight size={16} />
              </a>
            </>
          )}
        </div>

        {/* Slideshow dots and pause/resume controls */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 54,
            zIndex: 3,
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {Array.from({ length: totalSlides }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={
                  index === 0
                    ? 'Show introduction slide'
                    : `Show campus image ${index}`
                }
                aria-pressed={currentSlide === index}
                style={{
                  width: currentSlide === index ? 26 : 10,
                  height: 10,
                  padding: 0,
                  borderRadius: 10,
                  background:
                    currentSlide === index
                      ? '#38bdf8'
                      : 'rgba(255,255,255,0.75)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
          </div>
        </div>

        {/* Display a helpful message if no campus images are found */}
        {heroImages.length === 0 && currentSlide !== 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 24,
              zIndex: 3,
              color: '#fecaca',
              fontSize: 13,
            }}
          >
            No slideshow images found. Check the images folder and filenames.
          </div>
        )}
      </section>

      {/* SYSTEM STATS METRICS */}
      <section
        style={{
          maxWidth: 1240,
          margin: '-28px auto 60px',
          padding: '0 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
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
            <div
              style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}
            >
              {stats.departments}
            </div>
            <div
              style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            >
              Engineering Departments
            </div>
          </div>

          <div>
            <div
              style={{ fontSize: 28, fontWeight: 800, color: '#0891b2' }}
            >
              {stats.faculty}
            </div>
            <div
              style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            >
              Faculty &amp; HODs
            </div>
          </div>

          <div>
            <div
              style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}
            >
              {stats.subjects}
            </div>
            <div
              style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            >
              Curriculum Courses
            </div>
          </div>

          <div>
            <div
              style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}
            >
              {stats.articles}
            </div>
            <div
              style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            >
              Knowledge Articles
            </div>
          </div>

          <div>
            <div
              style={{ fontSize: 28, fontWeight: 800, color: '#ea580c' }}
            >
              {stats.resources}
            </div>
            <div
              style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            >
              Study Notes &amp; Guides
            </div>
          </div>
        </div>
      </section>

      {/* CORE ARCHITECTURAL PILLARS */}
      <section
        id="about"
        style={{
          maxWidth: 1240,
          margin: '0 auto 80px',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              color: '#2563eb',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Transforming Academic Assistance
          </div>

          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#0f172a',
              marginTop: 6,
            }}
          >
            Connected Ecosystem Built for Real Academic Workflows
          </h2>

          <p
            style={{
              color: '#64748b',
              maxWidth: 650,
              margin: '10px auto 0',
              fontSize: 15.5,
            }}
          >
            A centralized platform for academic support, knowledge sharing,
            and collaborative project work.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          <FeatureCard
            icon={<BookOpen size={24} />}
            title="Explainable NLP Retrieval"
            color="#2563eb"
            background="#eff6ff"
          >
            The knowledge retrieval engine matches student questions against
            available academic answers and helps students discover relevant
            information before submitting a faculty ticket.
          </FeatureCard>

          <FeatureCard
            icon={<Clock size={24} />}
            title="Bottom-Up SLA Routing"
            color="#16a34a"
            background="#f0fdf4"
          >
            Academic queries can be routed through faculty and departmental
            leadership, with service-level deadlines helping monitor timely
            responses.
          </FeatureCard>

          <FeatureCard
            icon={<ShieldCheck size={24} />}
            title="Secure Account Access"
            color="#7c3aed"
            background="#faf5ff"
          >
            Role-based access and institutional registration rules help protect
            accounts and provide an appropriate experience for students,
            faculty members, HODs, and administrators.
          </FeatureCard>

          <FeatureCard
            icon={<Layers size={24} />}
            title="Project Pulse Workspace"
            color="#ea580c"
            background="#fff7ed"
          >
            A collaborative workspace for student projects, supporting
            milestone tracking, task coordination, and mentor feedback.
          </FeatureCard>
        </div>
      </section>

      {/* DEPARTMENT EXPLORER */}
      <section
        id="departments"
        style={{
          background: '#f1f5f9',
          padding: '60px 24px',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={eyebrowStyle}>Academic Divisions</div>
              <h2 style={sectionHeadingStyle}>
                Department Directory &amp; Faculty Leadership
              </h2>
            </div>

            <Link
              to="/login?tab=faculty"
              style={{
                textDecoration: 'none',
                color: '#2563eb',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Faculty Portal <ArrowRight size={16} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {departments.map((dept) => (
              <div
                key={dept.code}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: 22,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        color: '#2563eb',
                        background: '#eff6ff',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      {dept.code}
                    </span>

                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Estd. {dept.establishedYear}
                    </span>
                  </div>

                  <h3 style={cardHeadingStyle}>{dept.name}</h3>

                  <p style={bodyTextStyle}>
                    {dept.description ||
                      'Specialized engineering curriculum and laboratory research.'}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>HOD: </span>
                    <strong style={{ color: '#1e293b' }}>
                      {dept.hod?.name || 'Department Head'}
                    </strong>
                  </div>

                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    Ext: {dept.phoneExtension || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KNOWLEDGE HUB PREVIEW */}
      <section
        id="knowledge"
        style={{
          maxWidth: 1240,
          margin: '80px auto',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 36,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={eyebrowStyle}>Knowledge Hub</div>
            <h2 style={sectionHeadingStyle}>
              Academic Answers &amp; Topic Guides
            </h2>
          </div>

          <Link
            to="/login"
            style={{
              textDecoration: 'none',
              color: '#2563eb',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Browse Full Knowledge Base <ArrowRight size={16} />
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {kbArticles.map((art) => (
            <div
              key={art._id}
              onClick={() => nav('/login')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') nav('/login');
              }}
              style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: 22,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#7c3aed',
                    background: '#faf5ff',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}
                >
                  {art.category}
                </span>

                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {art.views || 0} views
                </span>
              </div>

              <h3 style={cardHeadingStyle}>{art.title}</h3>

              <p
                style={{
                  ...bodyTextStyle,
                  maxHeight: 60,
                  overflow: 'hidden',
                }}
              >
                {art.answer}
              </p>

              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  color: '#2563eb',
                  fontWeight: 600,
                }}
              >
                Read full explanation <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STUDY RESOURCES AND NOTICES */}
      <section
        id="resources"
        style={{
          background: '#f8fafc',
          padding: '40px 24px 80px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 36,
          }}
        >
          {/* Study resources */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={sectionHeadingStyle}>Latest Study Resources</h2>

              <Link
                to="/login"
                style={{
                  fontSize: 13,
                  color: '#2563eb',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View All
              </Link>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {resources.map((res) => (
                <div
                  key={res._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14.5,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {res.title}
                    </div>

                    <div
                      style={{
                        fontSize: 12.5,
                        color: '#64748b',
                        marginTop: 2,
                      }}
                    >
                      {res.subject} · {res.resourceType?.toUpperCase()} ·{' '}
                      {res.downloadsCount || 0} downloads
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official notices */}
          <div id="announcements">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={sectionHeadingStyle}>Official Academic Notices</h2>

              <span
                style={{
                  fontSize: 12,
                  color: '#16a34a',
                  fontWeight: 600,
                  background: '#f0fdf4',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                Active Broadcasts
              </span>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {announcements.map((ann) => (
                <div
                  key={ann._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color:
                          ann.priority === 'urgent' ? '#dc2626' : '#2563eb',
                        textTransform: 'uppercase',
                      }}
                    >
                      {ann.category}
                    </span>

                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {ann.publishedAt
                        ? new Date(ann.publishedAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: '#0f172a',
                      marginBottom: 4,
                    }}
                  >
                    {ann.title}
                  </div>

                  <p style={bodyTextStyle}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          color: '#ffffff',
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            Ready to Connect with Your Faculty?
          </h2>

          <p
            style={{
              fontSize: 16,
              color: '#bfdbfe',
              marginBottom: 28,
              lineHeight: 1.5,
            }}
          >
            Access academic materials, discover relevant answers, and submit
            questions through a centralized academic support platform.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/register"
              className="btn"
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                fontWeight: 700,
                padding: '12px 24px',
              }}
            >
              Student Registration
            </Link>

            <Link
              to="/login"
              className="btn btn-ghost"
              style={{
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#ffffff',
                fontWeight: 600,
                padding: '12px 24px',
              }}
            >
              Institutional Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          background: '#0f172a',
          color: '#94a3b8',
          padding: '48px 24px 32px',
          fontSize: 13.5,
        }}
      >
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
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: '#ffffff',
                marginBottom: 12,
              }}
            >
              MEPCO Schlenk Engineering College
            </div>

            <p style={{ lineHeight: 1.6, color: '#94a3b8' }}>
              An Autonomous Institution affiliated to Anna University, Chennai.
              Accredited by NAAC with &apos;A&apos; Grade and NBA.
            </p>

            <div
              style={{
                marginTop: 12,
                color: '#38bdf8',
                fontWeight: 500,
              }}
            >
              Mepco Engineering College Post, Sivakasi, Tamil Nadu 626005
            </div>
          </div>

          <div>
            <div style={footerHeadingStyle}>Academic Support</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <FooterLink to="/login">Knowledge Base</FooterLink>
              <FooterLink to="/login">Ask Faculty a Query</FooterLink>
              <FooterLink to="/login">SLA Escalation Policy</FooterLink>
              <FooterLink to="/login">Study Materials Repository</FooterLink>
            </div>
          </div>

          <div>
            <div style={footerHeadingStyle}>Key Portals</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <FooterLink to="/login?tab=student">Student Portal</FooterLink>
              <FooterLink to="/login?tab=faculty">Faculty Portal</FooterLink>
              <FooterLink to="/login?tab=hod">HOD Department Oversight</FooterLink>
              <FooterLink to="/login?tab=admin">Administrator Control</FooterLink>
            </div>
          </div>

          <div>
            <div style={footerHeadingStyle}>Governance &amp; Trust</div>
            <p style={{ lineHeight: 1.6, color: '#94a3b8' }}>
              Role-based access supports appropriate handling of academic
              queries, learning resources, and institutional information.
            </p>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#16a34a',
              }}
            >
              ● Academic support platform
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 24,
            textAlign: 'center',
            color: '#64748b',
            fontSize: 12.5,
          }}
        >
          &copy; {new Date().getFullYear()} MEPCO Schlenk Engineering College.
          Academic Helpdesk &amp; Knowledge Hub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const navLinkStyle = {
  textDecoration: 'none',
  color: '#475569',
  fontSize: 14,
  fontWeight: 500,
};

const eyebrowStyle = {
  color: '#2563eb',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const sectionHeadingStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#0f172a',
  marginTop: 4,
};

const cardHeadingStyle = {
  fontSize: 17,
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: 8,
};

const bodyTextStyle = {
  fontSize: 13.5,
  color: '#64748b',
  lineHeight: 1.6,
  marginBottom: 16,
};

const footerHeadingStyle = {
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: 12,
};

function FeatureCard({ icon, title, color, background, children }) {
  return (
    <div className="card" style={{ padding: 24, borderRadius: 14 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background,
          color,
          display: 'grid',
          placeItems: 'center',
          marginBottom: 16,
        }}
      >
        {icon}
      </div>

      <h3 style={cardHeadingStyle}>{title}</h3>
      <p style={bodyTextStyle}>{children}</p>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{ color: '#94a3b8', textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}