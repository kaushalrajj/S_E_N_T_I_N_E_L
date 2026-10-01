import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/apiClient.js";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Building2,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  Users,
  ClipboardList,
  CheckCircle2,
  FileText,
  Zap,
  ArrowRight,
  ChevronRight,
  Activity,
  MessageSquare,
  TrendingUp,
  Bell,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────── */
const formatEventLabel = (event) => {
  if (!event) return "";
  const tableMap = {
    complaints: "Complaint update",
    messages: "New message",
    assignments: "Assignment update",
    marks: "Grade update",
    groups: "Group update",
  };
  const eventMap = {
    INSERT: "created",
    UPDATE: "updated",
    DELETE: "removed",
  };
  return `${tableMap[event.table] || "Campus update"} ${eventMap[event.eventType] || "changed"}`;
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
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
    <div className="lp-stat-card" style={{ "--accent": color }}>
      <div className="lp-stat-icon" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div className="lp-stat-body">
        <div className="lp-stat-value">
          {animated}
          {pulse && (
            <span className="lp-pulse-dot" style={{ background: color }} />
          )}
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
    id: "admin",
    label: "Admin",
    icon: ShieldAlert,
    color: "#3E341A",
    accentColor: "#CBBD93",
    gradient:
      "linear-gradient(135deg, rgba(62, 52, 26, 0.12) 0%, rgba(203, 189, 147, 0.20) 100%)",
    tagline: "Complaint oversight & faculty scheduling",
    features: [
      {
        icon: ClipboardList,
        text: "See complaint volume and progress grouped by status and stream",
      },
      {
        icon: Users,
        text: "Assign each complaint to available faculty based on their schedules",
      },
      {
        icon: CheckCircle2,
        text: "Follow each concern from submission through resolution",
      },
      {
        icon: TrendingUp,
        text: "Spot trends and outstanding concerns with live dashboard metrics",
      },
    ],
    demo: { email: "admin@admin.org", password: "password123" },
  },
  {
    id: "teacher",
    label: "Teacher",
    icon: GraduationCap,
    color: "#574A24",
    accentColor: "#80775C",
    gradient:
      "linear-gradient(135deg, rgba(87, 74, 36, 0.12) 0%, rgba(203, 189, 147, 0.20) 100%)",
    tagline: "Student groups & direct communication",
    features: [
      {
        icon: Users,
        text: "Create student groups for a class, project, or support need",
      },
      {
        icon: MessageSquare,
        text: "Chat directly with students and keep conversations in context",
      },
      { icon: Bell, text: "Share timely announcements with groups" },
      {
        icon: FileText,
        text: "Post assignments and keep learning resources together",
      },
    ],
    demo: { email: "alan.turing@heritageit.edu.in", password: "password123" },
  },
  {
    id: "student",
    label: "Student",
    icon: BookOpen,
    color: "#80775C",
    accentColor: "#9A8F70",
    gradient:
      "linear-gradient(135deg, rgba(128, 119, 92, 0.12) 0%, rgba(250, 232, 180, 0.25) 100%)",
    tagline: "Support, updates & learning in one place",
    features: [
      {
        icon: ClipboardList,
        text: "Raise a concern and follow its progress as it happens",
      },
      {
        icon: MessageSquare,
        text: "Chat directly with a teacher when you need support",
      },
      { icon: Bell, text: "See timely announcements and group updates" },
      { icon: BookOpen, text: "Keep up with assignments and faculty feedback" },
    ],
    demo: { email: "alex.johnson@gmail.com", password: "password123" },
  },
];

/* ─────────────────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────────────────── */
export const LandingPage = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const { eventLog } = useRealtime();

  const [activeRole, setActiveRole] = useState("admin");
  const [demoLoading, setDemoLoading] = useState(null);
  const [particles, setParticles] = useState([]);

  // Generate background particles with curated warm sand palette
  useEffect(() => {
    const palette = ["#CBBD93", "#FAE8B4", "#80775C", "#574A24", "#3E341A"];
    setParticles(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        color: palette[i % palette.length],
        opacity: Math.random() * 0.35 + 0.05,
        duration: Math.random() * 12 + 8,
        delay: Math.random() * 5,
      })),
    );
  }, []);

  const handleDemoLogin = useCallback(
    async (role) => {
      setDemoLoading(role);
      try {
        await demoLogin(role);
        navigate(`/${role}/dashboard`);
      } catch (err) {
        console.error(err);
      } finally {
        setDemoLoading(null);
      }
    },
    [demoLogin, navigate],
  );

  const activeRoleData = ROLES.find((r) => r.id === activeRole);

  return (
    <div className="lp-root">
      {/* ── Animated background particles ── */}
      <div className="lp-particles" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="lp-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `-${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <div className="lp-brand-icon">
              <Building2 size={18} color="#fff" />
            </div>
            <span>
              <strong>Sentinel</strong>
            </span>
          </div>
          <div className="lp-nav-actions">
            <button
              id="lp-login-btn"
              className="lp-btn lp-btn-ghost"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
            <button
              id="lp-signup-btn"
              className="lp-btn lp-btn-primary"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <Zap size={14} color="#FF541E" />
            <span>Campus concerns, followed through</span>
          </div>

          <h1 className="lp-hero-title">
            A better way to raise
            <br />
            <span className="lp-hero-gradient">
              and resolve campus concerns
            </span>
          </h1>

          <p className="lp-hero-subtitle">
            From a student raising an issue to an administrator assigning it to
            the right faculty member, Sentinel keeps everyone informed and helps
            move each concern forward.
          </p>

          <div className="lp-hero-cta">
            <button
              id="lp-get-started-btn"
              className="lp-btn lp-btn-primary lp-btn-lg"
              onClick={() => navigate("/signup")}
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              id="lp-explore-btn"
              className="lp-btn lp-btn-ghost lp-btn-lg"
              onClick={() =>
                document
                  .getElementById("lp-roles")
                  .scrollIntoView({ behavior: "smooth" })
              }
            >
              See how it works <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick demo logins */}
          <div className="lp-hero-demo-row">
            <span className="lp-demo-label">⚡ 1-Click Demo:</span>
            {ROLES.map((r) => (
              <button
                key={r.id}
                id={`lp-demo-${r.id}`}
                className="lp-demo-btn"
                style={{ "--role-color": r.color }}
                onClick={() => handleDemoLogin(r.id)}
                disabled={demoLoading === r.id}
              >
                <r.icon size={14} color={r.color} />
                {demoLoading === r.id ? "Logging in…" : `${r.label} Demo`}
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
          <div className="lp-section-label">Made for campus teams</div>
          <h2 className="lp-section-title">Useful tools for every role.</h2>
          <p className="lp-section-subtitle">
            Clear complaint follow-up, timely communication, and the right view
            for each person.
          </p>

          <div className="lp-role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.id}
                id={`lp-tab-${r.id}`}
                className={`lp-role-tab ${activeRole === r.id ? "active" : ""}`}
                style={{ "--tc": r.color }}
                onClick={() => setActiveRole(r.id)}
              >
                <r.icon size={16} />
                {r.label}
              </button>
            ))}
          </div>

          {activeRoleData && (
            <div
              className="lp-role-panel"
              style={{
                background: activeRoleData.gradient,
                "--tc": activeRoleData.color,
              }}
            >
              <div className="lp-role-panel-left">
                <div
                  className="lp-role-icon-wrap"
                  style={{ color: activeRoleData.color }}
                >
                  <activeRoleData.icon size={32} />
                </div>
                <div
                  className="lp-role-tagline"
                  style={{ color: activeRoleData.color }}
                >
                  {activeRoleData.tagline}
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
                <div
                  className="lp-mock-dashboard"
                  style={{ borderColor: `${activeRoleData.color}44` }}
                >
                  <div
                    className="lp-mock-header"
                    style={{ background: `${activeRoleData.color}18` }}
                  >
                    <div
                      className="lp-mock-dot"
                      style={{ background: activeRoleData.color }}
                    />
                    <span
                      style={{
                        color: activeRoleData.color,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {activeRoleData.label} Dashboard
                    </span>
                  </div>
                  <div className="lp-mock-body">
                    {activeRoleData.features.map((f, i) => (
                      <div
                        key={i}
                        className="lp-mock-row"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div
                          className="lp-mock-row-dot"
                          style={{ background: activeRoleData.color }}
                        />
                        <div className="lp-mock-row-text">
                          {f.text.slice(0, 48)}…
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  id={`lp-try-${activeRoleData.id}`}
                  className="lp-btn lp-btn-primary lp-role-cta"
                  style={{
                    "--tc": activeRoleData.color,
                    background: activeRoleData.color,
                  }}
                  onClick={() => handleDemoLogin(activeRoleData.id)}
                  disabled={demoLoading === activeRoleData.id}
                >
                  {demoLoading === activeRoleData.id
                    ? "Launching…"
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
            <div className="lp-section-label">Campus updates</div>
            <h2 className="lp-section-title" style={{ fontSize: "1.9rem" }}>
              Everyone stays in the loop.
            </h2>
            <p className="lp-section-subtitle" style={{ textAlign: "left" }}>
              Complaint progress, new messages, group announcements, and
              learning updates appear as they happen, so students and faculty
              can respond without waiting for a manual check-in.
            </p>
          </div>

          <div className="lp-activity-feed">
            <div className="lp-feed-header">
              <span
                className="lp-live-badge live"
                style={{ fontSize: "0.7rem" }}
              >
                <span className="lp-live-dot" />
                Live Feed
              </span>
              <span style={{ fontSize: "0.75rem", color: "#80775C" }}>
                {eventLog.length} events
              </span>
            </div>
            <div className="lp-feed-list">
              {eventLog.length === 0 ? (
                <div className="lp-feed-empty">
                  <Activity size={20} color="#574A24" />
                  <span>Waiting for campus updates…</span>
                  <small>Try a demo to preview recent activity.</small>
                </div>
              ) : (
                eventLog.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="lp-feed-item">
                    <div className="lp-feed-item-dot" />
                    <div className="lp-feed-item-body">
                      <span className="lp-feed-item-label">
                        {formatEventLabel(ev)}
                      </span>
                      <span className="lp-feed-item-time">
                        {timeAgo(ev.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
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
            <span>Helping campus concerns reach the right people.</span>
            <span className="lp-footer-sep">·</span>
            <span>
              <a
                href={`${API_BASE_URL}/health`}
                target="_blank"
                rel="noreferrer"
              >
                Platform status
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
