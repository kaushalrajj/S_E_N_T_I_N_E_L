import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../api/apiClient";
import { useRealtime } from "../context/RealtimeContext";
import {
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle,
  Users,
  GraduationCap,
  Filter,
  UserPlus,
  RefreshCw,
  AlertCircle,
  X,
  FileText,
  Calendar,
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STREAMS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Mathematics",
  "Physics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Data Science",
  "Electronics & Communication",
];

function formatHour(h) {
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export const AdminDashboard = () => {
  const { lastEvent } = useRealtime();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStream, setFilterStream] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Assign Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Time slot & stream filter for teacher availability
  const [assignDay, setAssignDay] = useState("Monday");
  const [assignHour, setAssignHour] = useState("9");
  const [assignStream, setAssignStream] = useState("");
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [statsRes, complaintsRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getComplaints(filterStatus, filterStream),
      ]);
      setStats(statsRes);
      setComplaints(complaintsRes);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterStream]);

  // Auto-refresh on realtime complaint events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.table === "complaints") {
      loadData();
    }
  }, [lastEvent]);

  // Load teachers filtered by availability when modal opens or time/stream changes
  const loadAvailableTeachers = useCallback(async () => {
    setLoadingAvail(true);
    try {
      if (assignDay && assignHour !== "") {
        const res = await api.admin.getTeachersAvailable(
          assignDay,
          assignHour,
          assignStream,
        );
        setAvailableTeachers(res);
      } else {
        const res = await api.admin.getTeachers(assignStream);
        setAvailableTeachers(res);
      }
    } catch (err) {
      setError(err.message || "Failed to load teachers");
    } finally {
      setLoadingAvail(false);
    }
  }, [assignDay, assignHour, assignStream]);

  useEffect(() => {
    if (showAssignModal) {
      loadAvailableTeachers();
    }
  }, [
    showAssignModal,
    assignDay,
    assignHour,
    assignStream,
    loadAvailableTeachers,
  ]);

  const openAssignModal = (c) => {
    setSelectedComplaint(c);
    setSelectedTeacherId(c.assigned_teacher_id || "");
    setAssignDay("Monday");
    setAssignHour("9");
    setAssignStream(c.student?.stream || "");
    setShowAssignModal(true);
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;

    try {
      setActionLoading(true);
      await api.admin.assignComplaint(selectedComplaint.id, selectedTeacherId);
      setShowAssignModal(false);
      setSelectedComplaint(null);
      setSelectedTeacherId("");
      setSuccessMsg("Complaint assigned to faculty member successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to assign complaint");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (complaintId, status) => {
    try {
      setActionLoading(true);
      await api.admin.updateComplaintStatus(complaintId, status);
      setSuccessMsg(`Complaint status updated to "${status.toUpperCase()}"`);
      setTimeout(() => setSuccessMsg(""), 4000);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main
        className="dashboard-main admin-dashboard"
        style={{
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* Header */}
        <div className="page-header">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginBottom: "0.25rem",
              }}
            >
              <span className="role-tag admin">
                <ShieldAlert size={14} /> Admin Portal
              </span>
            </div>
            <h1 className="page-title">Complaints & Operations Oversight</h1>
            <p className="page-subtitle">
              Review grievances, assign academic personnel, and resolve campus
              escalations.
            </p>
          </div>

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div
            style={{
              background: "rgba(87, 74, 36, 0.10)",
              border: "1px solid rgba(87, 74, 36, 0.28)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
              color: "#3E341A",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "rgba(203, 189, 147, 0.25)",
              border: "1px solid rgba(203, 189, 147, 0.55)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
              color: "#3E341A",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KPI Metrics */}
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-icon purple">
              <FileText size={22} />
            </div>
            <div>
              <div className="stat-value">{stats?.totalComplaints ?? "--"}</div>
              <div className="stat-label">Total Complaints</div>
            </div>
          </div>

          <div className="stat-card amber">
            <div className="stat-icon amber">
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-value">
                {stats?.pendingComplaints ?? "--"}
              </div>
              <div className="stat-label">Pending Resolution</div>
            </div>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon blue">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="stat-value">
                {stats?.assignedComplaints ?? "--"}
              </div>
              <div className="stat-label">Assigned to Faculty</div>
            </div>
          </div>

          <div className="stat-card emerald">
            <div className="stat-icon emerald">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="stat-value">
                {stats?.resolvedComplaints ?? "--"}
              </div>
              <div className="stat-label">Resolved & Closed</div>
            </div>
          </div>
        </div>

        {/* Complaints Section */}
        <div className="glass-card admin-grievance-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>
              Grievance Records
            </h2>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Stream Filter */}
              <select
                value={filterStream}
                onChange={(e) => setFilterStream(e.target.value)}
                className="form-select"
                style={{
                  width: "190px",
                  fontSize: "0.84rem",
                  padding: "0.45rem 0.75rem",
                }}
              >
                <option value="">All Streams</option>
                {STREAMS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Filter Tabs */}
              <div className="tabs-nav" style={{ margin: 0 }}>
                <button
                  className={`tab-btn ${filterStatus === "all" ? "active admin" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  All ({stats?.totalComplaints ?? 0})
                </button>
                <button
                  className={`tab-btn ${filterStatus === "pending" ? "active admin" : ""}`}
                  onClick={() => setFilterStatus("pending")}
                >
                  Pending ({stats?.pendingComplaints ?? 0})
                </button>
                <button
                  className={`tab-btn ${filterStatus === "assigned" ? "active admin" : ""}`}
                  onClick={() => setFilterStatus("assigned")}
                >
                  Assigned ({stats?.assignedComplaints ?? 0})
                </button>
                <button
                  className={`tab-btn ${filterStatus === "resolved" ? "active admin" : ""}`}
                  onClick={() => setFilterStatus("resolved")}
                >
                  Resolved ({stats?.resolvedComplaints ?? 0})
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading grievance registry...
            </div>
          ) : complaints.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
                background: "rgba(203, 189, 147, 0.10)",
                borderRadius: "8px",
              }}
            >
              No complaints found matching the status filter: "{filterStatus}"
            </div>
          ) : (
            <div className="table-container admin-grievance-table-wrap">
              <table className="custom-table admin-grievance-table">
                <thead>
                  <tr>
                    <th>Grievance / Subject</th>
                    <th>Student Details</th>
                    <th>Status</th>
                    <th>Assigned Faculty</th>
                    <th>Filing Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td
                        data-label="Grievance / Subject"
                        style={{ maxWidth: "280px" }}
                      >
                        <div
                          className="complaint-title"
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          {c.title}
                        </div>
                        <div
                          className="complaint-description"
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {c.description}
                        </div>
                      </td>
                      <td data-label="Student Details">
                        <div
                          className="complaint-student"
                          style={{
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {c.student?.name || "Student"}
                        </div>
                        <div
                          className="complaint-meta"
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {c.student?.department || "Department N/A"}
                        </div>
                        <div
                          className="complaint-meta"
                          style={{ fontSize: "0.72rem", color: "#80775C" }}
                        >
                          {c.student?.email}
                        </div>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge ${c.status}`}>
                          {c.status}
                        </span>
                      </td>
                      <td data-label="Assigned Faculty">
                        {c.teacher ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <GraduationCap size={15} color="#80775C" />
                            <div>
                              <div
                                className="complaint-faculty"
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#574A24",
                                  fontWeight: 600,
                                }}
                              >
                                {c.teacher.name}
                              </div>
                              <div
                                className="complaint-meta"
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {c.teacher.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span
                            className="complaint-unassigned"
                            style={{
                              fontSize: "0.8rem",
                              color: "#80775C",
                              fontStyle: "italic",
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td
                        data-label="Filing Date"
                        className="complaint-date"
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td
                        data-label="Actions"
                        className="admin-grievance-action-cell"
                        style={{ textAlign: "right", whiteSpace: "nowrap" }}
                      >
                        <div
                          className="admin-grievance-actions"
                          style={{ display: "inline-flex", gap: "0.5rem" }}
                        >
                          <button
                            onClick={() => openAssignModal(c)}
                            className="btn btn-secondary btn-sm"
                            title="Assign to teacher"
                          >
                            <UserPlus size={14} />
                            <span>Assign</span>
                          </button>

                          {/* Quick Status Toggle */}
                          <select
                            value={c.status}
                            onChange={(e) =>
                              handleUpdateStatus(c.id, e.target.value)
                            }
                            disabled={actionLoading}
                            style={{
                              padding: "0.35rem 0.6rem",
                              background: "rgba(250, 232, 180, 0.60)",
                              color: "#3E341A",
                              border: "1px solid rgba(203, 189, 147, 0.50)",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="assigned">Assigned</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ASSIGN FACULTY MODAL */}
      {showAssignModal && selectedComplaint && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <UserPlus size={20} color="#574A24" />
                <h3
                  style={{ color: "var(--text-primary)", fontSize: "1.15rem" }}
                >
                  Assign Faculty to Grievance
                </h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher}>
              <div className="modal-body">
                {/* Complaint Summary */}
                <div
                  style={{
                    background: "rgba(203, 189, 147, 0.18)",
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.25rem",
                    border: "1px solid rgba(203, 189, 147, 0.40)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#80775C",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Complaint Subject
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {selectedComplaint.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      marginTop: "0.4rem",
                    }}
                  >
                    {selectedComplaint.description}
                  </div>
                </div>

                {/* Time Slot & Stream Filter */}
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#3E341A",
                      marginBottom: "0.6rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Calendar size={15} color="#574A24" />
                    Teacher Availability & Stream Filter
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.6rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.76rem",
                          color: "#80775C",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: "0.3rem",
                        }}
                      >
                        Day
                      </label>
                      <select
                        value={assignDay}
                        onChange={(e) => {
                          setAssignDay(e.target.value);
                          setSelectedTeacherId("");
                        }}
                        className="form-select"
                        style={{
                          fontSize: "0.82rem",
                          padding: "0.5rem 0.6rem",
                        }}
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.76rem",
                          color: "#80775C",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: "0.3rem",
                        }}
                      >
                        Hour
                      </label>
                      <select
                        value={assignHour}
                        onChange={(e) => {
                          setAssignHour(e.target.value);
                          setSelectedTeacherId("");
                        }}
                        className="form-select"
                        style={{
                          fontSize: "0.82rem",
                          padding: "0.5rem 0.6rem",
                        }}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)} – {formatHour(h + 1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.76rem",
                          color: "#80775C",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: "0.3rem",
                        }}
                      >
                        Stream
                      </label>
                      <select
                        value={assignStream}
                        onChange={(e) => {
                          setAssignStream(e.target.value);
                          setSelectedTeacherId("");
                        }}
                        className="form-select"
                        style={{
                          fontSize: "0.82rem",
                          padding: "0.5rem 0.6rem",
                        }}
                      >
                        <option value="">All Streams</option>
                        {STREAMS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {assignDay && assignHour !== "" && (
                    <p
                      style={{
                        fontSize: "0.74rem",
                        color: "#574A24",
                        fontWeight: 600,
                        marginTop: "0.4rem",
                      }}
                    >
                      Showing only teachers free on {assignDay}{" "}
                      {formatHour(Number(assignHour))}–
                      {formatHour(Number(assignHour) + 1)}
                      {assignStream ? ` (${assignStream})` : ""}
                    </p>
                  )}
                </div>

                {/* Teacher Select */}
                <div className="form-group">
                  <label className="form-label">
                    Select Faculty / Teacher
                    {loadingAvail && (
                      <span
                        style={{
                          color: "#80775C",
                          fontWeight: 400,
                          marginLeft: "0.4rem",
                        }}
                      >
                        Loading...
                      </span>
                    )}
                  </label>
                  <select
                    className="form-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    required
                  >
                    <option value="">
                      {availableTeachers.length === 0
                        ? loadingAvail
                          ? "Loading..."
                          : "-- No teachers available at selected time --"
                        : "-- Choose Faculty Member --"}
                    </option>
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.stream || t.department || "Faculty"}) -{" "}
                        {t.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || !selectedTeacherId}
                  style={{
                    background:
                      "linear-gradient(135deg, #574A24 0%, #80775C 100%)",
                    boxShadow: "0 3px 12px rgba(87, 74, 36, 0.28)",
                  }}
                >
                  {actionLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
