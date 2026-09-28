import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Building2, GraduationCap, BookOpen, ShieldAlert,
  Users, ClipboardList, CheckCircle2, FileText,
  Zap, Globe, Lock, ArrowRight, ChevronRight,
  Activity, MessageSquare, Star, TrendingUp, Bell
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────── */
const formatEventLabel = (event) => {
  if (!event) return '';
  const tableMap = {
    complaints: '📋 Complaint',
    messages:   '💬 Message',
    assignments:'📚 Assignment',
    marks:      '⭐ Grade',
    groups:     '👥 Group',
  };
  const eventMap = {
    INSERT: 'created',
    UPDATE: 'updated',
    DELETE: 'removed',
  };
  return `${tableMap[event.table] || event.table} ${eventMap[event.eventType] || event.eventType}`;
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

/* ─────────────────────────────────────────────────────────────────
   ANIMATED COUNTER HOOK
───────────────────────────────────────────────────────────────── */
const useCountUp = (target, duration = 1500) => {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prevTarget.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
};

/* ─────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, pulse }) => {
  const animated = useCountUp(Number(value) || 0);
  return (
    <div className="lp-stat-card" style={{ '--accent': color }}>
      <div className="lp-stat-icon" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div className="lp-stat-body">
        <div className="lp-stat-value">
          {animated}
          {pulse && <span className="lp-pulse-dot" style={{ background: color }} />}
        </div>
        <div className="lp-stat-label">{label}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   FEATURE TABS
───────────────────────────────────────────────────────────────── */
const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldAlert,
    color: '#3E341A',
    accentColor: '#CBBD93',
    gradient: 'linear-gradient(135deg, rgba(62, 52, 26, 0.12) 0%, rgba(203, 189, 147, 0.20) 100%)',
    tagline: 'Total Platform Oversight',
    features: [
      { icon: ClipboardList, text: 'View & filter all student complaints (pending / assigned / resolved) and by stream' },
      { icon: Users, text: 'Assign grievances to free faculty members filtered by availability' },
      { icon: CheckCircle2, text: 'Resolve and close complaints with status audit trail' },
      { icon: TrendingUp, text: 'Live dashboard statistics & platform health metrics' },
    ],
    demo: { email: 'admin@admin.org', password: 'password123' }
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: GraduationCap,
    color: '#574A24',
    accentColor: '#80775C',
    gradient: 'linear-gradient(135deg, rgba(87, 74, 36, 0.12) 0%, rgba(203, 189, 147, 0.20) 100%)',
    tagline: 'Cohort & Coursework Management',
    features: [
      { icon: Users, text: 'Filter & browse students by academic stream or name search' },
      { icon: BookOpen, text: 'Create study groups and enroll/remove students dynamically' },
      { icon: FileText, text: 'Publish assignments with file attachments (PDF, docs)' },
      { icon: Star, text: 'Record and update student scores per subject in real time' },
    ],
    demo: { email: 'alan.turing@heritageit.edu.in', password: 'password123' }
  },
  {
    id: 'student',
    label: 'Student',
    icon: BookOpen,
    color: '#80775C',
    accentColor: '#9A8F70',
    gradient: 'linear-gradient(135deg, rgba(128, 119, 92, 0.12) 0%, rgba(250, 232, 180, 0.25) 100%)',
    tagline: 'Academic Journey Portal',
    features: [
      { icon: ClipboardList, text: 'File and track campus grievances with live status updates' },
      { icon: FileText, text: 'Access all published coursework and downloadable handouts' },
      { icon: Star, text: 'View subject-wise marks and grade card from instructors' },
      { icon: MessageSquare, text: 'Send direct inquiries to faculty searchable by stream' },
    ],
    demo: { email: 'alex.johnson@gmail.com', password: 'password123' }
  }
];

/* ─────────────────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────────────────── */
export const LandingPage = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const { connectionStatus, liveStats, eventLog, isSupabaseConfigured } = useRealtime();

  const [activeRole, setActiveRole]     = useState('admin');
  const [demoLoading, setDemoLoading]   = useState(null);
  const [particles, setParticles]       = useState([]);

  // Generate background particles with curated warm sand palette
  useEffect(() => {
    const palette = ['#CBBD93', '#FAE8B4', '#80775C', '#574A24', '#3E341A'];
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      color: palette[i % palette.length],
      opacity: Math.random() * 0.35 + 0.05,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 5,
    })));
  }, []);

  const handleDemoLogin = useCallback(async (role) => {
    setDemoLoading(role);
    try {
      await demoLogin(role);
      navigate(`/${role}/dashboard`);
    } catch (err) {
      console.error(err);
    } finally {
      setDemoLoading(null);
    }
  }, [demoLogin, navigate]);

  const activeRoleData = ROLES.find(r => r.id === activeRole);

  return (
    <div className="lp-root">
      {/* ── Animated background particles ── */}
      <div className="lp-particles" aria-hidden="true">
        {particles.map(p => (
          <div key={p.id} className="lp-particle" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `-${p.delay}s`,
          }} />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <div className="lp-brand-icon"><Building2 size={18} color="#fff" /></div>
            <span><strong>Sentinel</strong></span>
          </div>
          <div className="lp-nav-actions">
            <button id="lp-login-btn" className="lp-btn lp-btn-ghost" onClick={() => navigate('/login')}>Login</button>
            <button id="lp-signup-btn" className="lp-btn lp-btn-primary" onClick={() => navigate('/signup')}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <Zap size={14} color="#FF541E" />
            <span>Real-time Supabase · Domain-Based RBAC · Zero Config</span>
          </div>

          <h1 className="lp-hero-title">
            The Academic Platform<br />
            <span className="lp-hero-gradient">That Knows Your Role</span>
          </h1>

          <p className="lp-hero-subtitle">
            Register with your institution email. Sentinel auto-detects your role —
            Admin, Teacher, or Student — and gives you exactly the dashboard you need.
            Every action syncs live to Supabase in real time.
          </p>

          <div className="lp-hero-cta">
            <button id="lp-get-started-btn" className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/signup')}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button id="lp-explore-btn" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => document.getElementById('lp-roles').scrollIntoView({ behavior: 'smooth' })}>
              Explore Portals <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick demo logins */}
          <div className="lp-hero-demo-row">
            <span className="lp-demo-label">⚡ 1-Click Demo:</span>
            {ROLES.map(r => (
              <button
                key={r.id}
                id={`lp-demo-${r.id}`}
                className="lp-demo-btn"
                style={{ '--role-color': r.color }}
                onClick={() => handleDemoLogin(r.id)}
                disabled={demoLoading === r.id}
              >
                <r.icon size={14} color={r.color} />
                {demoLoading === r.id ? 'Logging in…' : `${r.label} Demo`}
              </button>
            ))}
          </div>
        </div>

        {/* Glowing atmospheric orbs */}
        <div className="lp-hero-orb lp-orb-abyssal" />
        <div className="lp-hero-orb lp-orb-blue" />
        <div className="lp-hero-orb lp-orb-palladian" />
        <div className="lp-hero-orb lp-orb-flame" />
      </section>

      {/* ── ROLE SHOWCASE ── */}
      <section id="lp-roles" className="lp-roles-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">Role-Based Access Control</div>
          <h2 className="lp-section-title">One Platform. Three Portals.</h2>
          <p className="lp-section-subtitle">
            Your email domain determines your role instantly — no manual selection required.
          </p>

          <div className="lp-role-tabs">
            {ROLES.map(r => (
              <button
                key={r.id}
                id={`lp-tab-${r.id}`}
                className={`lp-role-tab ${activeRole === r.id ? 'active' : ''}`}
                style={{ '--tc': r.color }}
                onClick={() => setActiveRole(r.id)}
              >
                <r.icon size={16} />
                {r.label}
              </button>
            ))}
          </div>

          {activeRoleData && (
            <div className="lp-role-panel" style={{ background: activeRoleData.gradient, '--tc': activeRoleData.color }}>
              <div className="lp-role-panel-left">
                <div className="lp-role-icon-wrap" style={{ color: activeRoleData.color }}>
                  <activeRoleData.icon size={32} />
                </div>
                <div className="lp-role-tagline" style={{ color: activeRoleData.color }}>
                  {activeRoleData.tagline}
                </div>
                <div className="lp-role-domain">
                  Domain: <code>*@{activeRoleData.id}.org</code>
                </div>
                <ul className="lp-role-features">
                  {activeRoleData.features.map((f, i) => (
                    <li key={i}>
                      <f.icon size={15} color={activeRoleData.color} />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lp-role-panel-right">
                <div className="lp-mock-dashboard" style={{ borderColor: `${activeRoleData.color}44` }}>
                  <div className="lp-mock-header" style={{ background: `${activeRoleData.color}18` }}>
                    <div className="lp-mock-dot" style={{ background: activeRoleData.color }} />
                    <span style={{ color: activeRoleData.color, fontSize: '0.8rem', fontWeight: 600 }}>
                      {activeRoleData.label} Dashboard
                    </span>
                  </div>
                  <div className="lp-mock-body">
                    {activeRoleData.features.map((f, i) => (
                      <div key={i} className="lp-mock-row" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="lp-mock-row-dot" style={{ background: activeRoleData.color }} />
                        <div className="lp-mock-row-text">{f.text.slice(0, 48)}…</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  id={`lp-try-${activeRoleData.id}`}
                  className="lp-btn lp-btn-primary lp-role-cta"
                  style={{ '--tc': activeRoleData.color, background: activeRoleData.color }}
                  onClick={() => handleDemoLogin(activeRoleData.id)}
                  disabled={demoLoading === activeRoleData.id}
                >
                  {demoLoading === activeRoleData.id
                    ? 'Launching…'
                    : `Try ${activeRoleData.label} Portal →`}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── LIVE ACTIVITY FEED ── */}
      <section className="lp-activity-section">
        <div className="lp-section-inner lp-activity-inner">
          <div className="lp-activity-left">
            <div className="lp-section-label">Live Event Stream</div>
            <h2 className="lp-section-title" style={{ fontSize: '1.9rem' }}>
              Every Action. Instantly Synced.
            </h2>
            <p className="lp-section-subtitle" style={{ textAlign: 'left' }}>
              Sentinel uses Supabase Postgres Realtime under the hood.
              Every mutation — filing a complaint, publishing an assignment,
              updating a grade — broadcasts to all connected clients in
              milliseconds via WebSocket channels.
            </p>
            <div className="lp-tech-pills">
              <span className="lp-tech-pill"><Globe size={13} /> Supabase Realtime</span>
              <span className="lp-tech-pill"><Zap size={13} /> SSE Fallback</span>
              <span className="lp-tech-pill"><Lock size={13} /> JWT RBAC</span>
              <span className="lp-tech-pill"><Activity size={13} /> Live Stats API</span>
            </div>
          </div>

          <div className="lp-activity-feed">
            <div className="lp-feed-header">
              <span className="lp-live-badge live" style={{ fontSize: '0.7rem' }}>
                <span className="lp-live-dot" />
                Live Feed
              </span>
              <span style={{ fontSize: '0.75rem', color: '#80775C' }}>
                {eventLog.length} events
              </span>
            </div>
            <div className="lp-feed-list">
              {eventLog.length === 0 ? (
                <div className="lp-feed-empty">
                  <Activity size={20} color="#574A24" />
                  <span>Waiting for platform activity…</span>
                  <small>Try a 1-click demo login to generate events!</small>
                </div>
              ) : (
                eventLog.slice(0, 8).map(ev => (
                  <div key={ev.id} className="lp-feed-item">
                    <div className="lp-feed-item-dot" />
                    <div className="lp-feed-item-body">
                      <span className="lp-feed-item-label">{formatEventLabel(ev)}</span>
                      <span className="lp-feed-item-time">{timeAgo(ev.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE SHOWCASE ── */}
      <section className="lp-arch-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">Technical Architecture</div>
          <h2 className="lp-section-title">Built for Scale. Ready Today.</h2>

          <div className="lp-arch-grid">
            {[
              { icon: Globe, title: 'Supabase PostgreSQL', desc: 'Cloud-native relational DB with RLS, FK constraints, and real-time publication on every table.', color: '#574A24' },
              { icon: Zap, title: 'Server-Sent Events', desc: 'Zero-dependency SSE fallback ensures live updates work even without Supabase credentials configured.', color: '#80775C' },
              { icon: Lock, title: 'Domain-Based RBAC', desc: 'JWT tokens with role claims. Email domain auto-assigns role at signup — no manual configuration needed.', color: '#3E341A' },
              { icon: ShieldAlert, title: 'Bcrypt Password Security', desc: 'All passwords are hashed with bcrypt (saltRounds=10). Plaintext is never stored or logged.', color: '#574A24' },
              { icon: Activity, title: 'Live Stats API', desc: 'Dedicated /api/realtime/stats endpoint aggregates live counts from the database for landing page metrics.', color: '#80775C' },
              { icon: FileText, title: 'Multer File Uploads', desc: 'Assignment PDFs and documents are stored locally and served as static assets, with Supabase Storage ready for production.', color: '#3E341A' },
            ].map((item, i) => (
              <div key={i} className="lp-arch-card">
                <div className="lp-arch-icon" style={{ color: item.color, background: 'rgba(203, 189, 147, 0.25)' }}>
                  <item.icon size={20} />
                </div>
                <h3 className="lp-arch-title">{item.title}</h3>
                <p className="lp-arch-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Building2 size={16} color="#574A24" />
            <span>Sentinel</span>
          </div>
          <div className="lp-footer-info">
            <span>React 19 + Vite · Express · Supabase · Node.js</span>
            <span className="lp-footer-sep">·</span>
            <span>Database: {liveStats?.isSupabaseConfigured ? '🟢 Supabase Cloud' : '🟡 Local In-Memory'}</span>
            <span className="lp-footer-sep">·</span>
            <span>API: <a href="http://localhost:5000/api/health" target="_blank" rel="noreferrer">Health Check</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
