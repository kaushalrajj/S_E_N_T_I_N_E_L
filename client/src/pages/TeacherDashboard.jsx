<<<<<<< HEAD
import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../api/apiClient";
import { useRealtime } from "../context/RealtimeContext";
=======
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { api } from '../api/apiClient';
import { useRealtime } from '../context/RealtimeContext';
import { TeacherAssignmentSubmissions } from '../components/TeacherAssignmentSubmissions';
>>>>>>> origin/feature/assignment-submission
import {
  GraduationCap,
  Users,
  FolderPlus,
  FileUp,
  Award,
  MessageSquare,
  Search,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X,
  Send,
  UserPlus,
  Download,
  BookOpen,
  ClipboardList,
  Clock,
  Calendar,
  Bell,
  Check,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Megaphone,
  User,
} from "lucide-react";

export const TeacherDashboard = () => {
  const { lastEvent } = useRealtime();
  const groupsRefreshTimerRef = useRef(null);
  // Tabs: 'students' | 'groups' | 'assignments' | 'marks' | 'messages' | 'tasks'
  const [activeTab, setActiveTab] = useState("groups");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Current logged in user
  const currentUser = JSON.parse(localStorage.getItem("campus_user") || "{}");

  // 1. Student State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDept, setStudentDept] = useState("");

  // 2. Groups State
  const [groups, setGroups] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroupDetail, setActiveGroupDetail] = useState(null); // Selected group for detailed drilldown
  const [groupSubTab, setGroupSubTab] = useState("members"); // 'members' | 'assignments' | 'announcements'
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [groupAnnouncements, setGroupAnnouncements] = useState([]);

  // Add Member Modal State (with search & department filtering)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [targetGroupForMember, setTargetGroupForMember] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberDeptFilter, setMemberDeptFilter] = useState("");
  const [isAddingAllMembers, setIsAddingAllMembers] = useState(false);

  // Post Group Assignment Modal
  const [showGroupAssignmentModal, setShowGroupAssignmentModal] =
    useState(false);
  const [groupAssignTitle, setGroupAssignTitle] = useState("");
  const [groupAssignDesc, setGroupAssignDesc] = useState("");
  const [groupAssignDueDate, setGroupAssignDueDate] = useState("");
  const [groupAssignFile, setGroupAssignFile] = useState(null);
  const [groupAssignFileUrl, setGroupAssignFileUrl] = useState("");

  // Post Group Announcement Modal
  const [showGroupAnnouncementModal, setShowGroupAnnouncementModal] =
    useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  // 3. Assignments Overview State
  const [assignments, setAssignments] = useState([]);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] =
    useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDesc, setAssignmentDesc] = useState("");
  const [assignmentFileUrl, setAssignmentFileUrl] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentGroupId, setAssignmentGroupId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");

  // 4. Marks State
  const [marksList, setMarksList] = useState([]);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [marksStudentId, setMarksStudentId] = useState("");
  const [marksSubject, setMarksSubject] = useState("");
  const [marksScore, setMarksScore] = useState("");

  // 5. Messages / Bidirectional Chat State
  const [messages, setMessages] = useState([]);
  const [selectedChatStudent, setSelectedChatStudent] = useState(null);
  const [chatThread, setChatThread] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // 6. Admin Tasks State
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState("all"); // 'all' | 'assigned' | 'resolved'
  const [togglingTaskId, setTogglingTaskId] = useState(null);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getStudents(studentDept, studentSearch);
      setStudents(res);
    } catch (err) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getGroups();
      setGroups(res);
      // If a group was actively selected, refresh its object
      setActiveGroupDetail((prev) => {
        if (!prev) return prev;
        return res.find((g) => g.id === prev.id) || prev;
      });
      // Also refresh the target group for the add-member modal if open
      setTargetGroupForMember((prev) => {
        if (!prev) return prev;
        return res.find((g) => g.id === prev.id) || prev;
      });
    } catch (err) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Group Detail Content (assignments + announcements)
  const fetchGroupDetails = async (groupId) => {
    try {
      const [assigns, annos] = await Promise.all([
        api.teacher.getGroupAssignments(groupId),
        api.teacher.getGroupAnnouncements(groupId),
      ]);
      setGroupAssignments(assigns);
      setGroupAnnouncements(annos);
    } catch (err) {
      console.error("Error fetching group data:", err);
    }
  };

  // Fetch Assignments
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getAssignments();
      setAssignments(res);
    } catch (err) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Marks
  const fetchMarks = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getMarks();
      setMarksList(res);
    } catch (err) {
      setError(err.message || "Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Messages & Conversation
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getMessages();
      setMessages(res);

      // If a student was selected for chat, refresh thread
      if (selectedChatStudent) {
        const thread = await api.teacher.getConversation(
          selectedChatStudent.id,
        );
        setChatThread(thread);
      }
    } catch (err) {
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // Select student to chat with
  const handleSelectChatStudent = async (st) => {
    setSelectedChatStudent(st);
    try {
      const thread = await api.teacher.getConversation(st.id);
      setChatThread(thread);
    } catch (err) {
      setError("Failed to load chat history");
    }
  };

  // Send reply to student
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedChatStudent || !replyText.trim()) return;

    try {
      setSendingReply(true);
      await api.teacher.sendMessage({
        student_id: selectedChatStudent.id,
        message: replyText.trim(),
      });
      setReplyText("");
      const updatedThread = await api.teacher.getConversation(
        selectedChatStudent.id,
      );
      setChatThread(updatedThread);
      notify("Reply dispatched to student!");
    } catch (err) {
      setError(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  // Fetch Admin Tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.teacher.getTasks();
      setTasks(res);
    } catch (err) {
      setError(err.message || "Failed to load admin tasks");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Task Status (Assigned <-> Resolved)
  const handleToggleTask = async (taskId) => {
    try {
      setTogglingTaskId(taskId);
      const res = await api.teacher.toggleTask(taskId);
      notify(`Task status toggled to: ${res.task.status.toUpperCase()}`);
      fetchTasks();
    } catch (err) {
      setError(err.message || "Failed to toggle task status");
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Tab switcher effect
  useEffect(() => {
    setError("");
    if (activeTab === "students") fetchStudents();
    if (activeTab === "groups") {
      fetchGroups();
      fetchStudents();
    }
    if (activeTab === "assignments") {
      fetchAssignments();
      fetchGroups();
    }
    if (activeTab === "marks") {
      fetchMarks();
      fetchStudents();
    }
    if (activeTab === "messages") {
      fetchMessages();
      fetchStudents();
    }
    if (activeTab === "tasks") {
      fetchTasks();
    }
  }, [activeTab]);

  // When activeGroupDetail changes, load assignments and announcements
  useEffect(() => {
    if (activeGroupDetail) {
      fetchGroupDetails(activeGroupDetail.id);
    }
  }, [activeGroupDetail]);

  // Auto-refresh on realtime events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.table === "complaints" && activeTab === "tasks") fetchTasks();
    if (lastEvent.table === "messages" && activeTab === "messages") {
      fetchMessages();
      if (selectedChatStudent) {
        api.teacher
          .getConversation(selectedChatStudent.id)
          .then(setChatThread)
          .catch(() => {});
      }
    }
    if (lastEvent.table === "assignments") {
      if (activeTab === "assignments") fetchAssignments();
      if (activeGroupDetail) fetchGroupDetails(activeGroupDetail.id);
    }
    if (lastEvent.table === "announcements" && activeGroupDetail) {
      fetchGroupDetails(activeGroupDetail.id);
    }
    if (lastEvent.table === "marks" && activeTab === "marks") fetchMarks();
    if (
      (lastEvent.table === "groups" || lastEvent.table === "group_members") &&
      activeTab === "groups"
    ) {
      clearTimeout(groupsRefreshTimerRef.current);
      groupsRefreshTimerRef.current = setTimeout(() => {
        fetchGroups();
        groupsRefreshTimerRef.current = null;
      }, 150);
    }
  }, [lastEvent]);

  useEffect(() => () => clearTimeout(groupsRefreshTimerRef.current), []);

  // Group Handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await api.teacher.createGroup(newGroupName.trim());
      setNewGroupName("");
      setShowCreateGroupModal(false);
      notify("Group cohort established successfully!");
      fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to create group");
    }
  };

  const handleOpenAddMemberModal = (group) => {
    if (!students || students.length === 0) {
      fetchStudents();
    }
    setTargetGroupForMember(group);
    setMemberSearchQuery("");
    setMemberDeptFilter("");
    setShowAddMemberModal(true);
  };

  const handleAddMemberToGroup = async (
    studentId,
    { notifyOnSuccess = true, refreshGroups = true } = {},
  ) => {
    if (!targetGroupForMember) return false;
    const targetGroupId = targetGroupForMember.id;
    try {
      await api.teacher.addGroupMember(targetGroupId, studentId);
      if (notifyOnSuccess) notify("Student enrolled into cohort!");

      // Optimistically update states immediately so UI reflects change with zero lag
      const studentObj = students.find((s) => s.id === studentId);
      if (studentObj) {
        setTargetGroupForMember((prev) => {
          if (!prev || prev.id !== targetGroupId) return prev;
          const currentMembers = prev.members || [];
          if (currentMembers.some((m) => m.id === studentId)) return prev;
          return { ...prev, members: [...currentMembers, studentObj] };
        });
        setActiveGroupDetail((prev) => {
          if (!prev || prev.id !== targetGroupId) return prev;
          const currentMembers = prev.members || [];
          if (currentMembers.some((m) => m.id === studentId)) return prev;
          return { ...prev, members: [...currentMembers, studentObj] };
        });
        setGroups((prevGroups) =>
          prevGroups.map((g) => {
            if (g.id === targetGroupId) {
              const currentMembers = g.members || [];
              if (!currentMembers.some((m) => m.id === studentId)) {
                return { ...g, members: [...currentMembers, studentObj] };
              }
            }
            return g;
          }),
        );
      }

      if (refreshGroups) await fetchGroups();
      return true;
    } catch (err) {
      setError(err.message || "Failed to add student to group");
      return false;
    }
  };

  const handleAddAllFilteredStudents = async () => {
    if (!targetGroupForMember || isAddingAllMembers) return;
    const studentsToAdd = [...filteredStudentsForModal];
    if (studentsToAdd.length === 0) return;

    setIsAddingAllMembers(true);
    const targetGroupId = targetGroupForMember.id;
    try {
      const result = await api.teacher.addGroupMembers(
        targetGroupId,
        studentsToAdd.map((student) => student.id),
      );
      const addedStudentIds = new Set(
        (result.members || []).map((member) => member.student_id),
      );
      const addedStudents = studentsToAdd.filter((student) =>
        addedStudentIds.has(student.id),
      );
      const appendMembers = (group) => {
        if (
          !group ||
          group.id !== targetGroupId ||
          addedStudents.length === 0
        ) {
          return group;
        }
        const currentMembers = group.members || [];
        const currentIds = new Set(currentMembers.map((member) => member.id));
        const newMembers = addedStudents.filter(
          (student) => !currentIds.has(student.id),
        );
        return newMembers.length > 0
          ? { ...group, members: [...currentMembers, ...newMembers] }
          : group;
      };

      setTargetGroupForMember(appendMembers);
      setActiveGroupDetail(appendMembers);
      setGroups((currentGroups) => currentGroups.map(appendMembers));

      const addedCount = addedStudents.length;
      if (addedCount > 0) {
        notify(
          `${addedCount} student${addedCount === 1 ? "" : "s"} enrolled into cohort!`,
        );
      }
    } catch (err) {
      setError(err.message || "Failed to add students to group");
    } finally {
      setIsAddingAllMembers(false);
    }
  };

  const handleRemoveMember = async (groupId, studentId) => {
    try {
      await api.teacher.removeGroupMember(groupId, studentId);
      notify("Student removed from group");

      // Optimistic removal
      setTargetGroupForMember((prev) => {
        if (!prev || prev.id !== groupId) return prev;
        return {
          ...prev,
          members: (prev.members || []).filter((m) => m.id !== studentId),
        };
      });
      setActiveGroupDetail((prev) => {
        if (!prev || prev.id !== groupId) return prev;
        return {
          ...prev,
          members: (prev.members || []).filter((m) => m.id !== studentId),
        };
      });
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              members: (g.members || []).filter((m) => m.id !== studentId),
            };
          }
          return g;
        }),
      );

      await fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to remove member");
    }
  };

  // Group-Scoped Assignment Creation
  const handleCreateGroupAssignment = async (e) => {
    e.preventDefault();
    if (!activeGroupDetail || !groupAssignTitle || !groupAssignDesc) return;

    try {
      if (groupAssignFile) {
        const formData = new FormData();
<<<<<<< HEAD
        formData.append("title", groupAssignTitle);
        formData.append("description", groupAssignDesc);
        formData.append("due_date", groupAssignDueDate);
        formData.append("file", groupAssignFile);
=======
        formData.append('title', groupAssignTitle);
        formData.append('description', groupAssignDesc);
        formData.append('due_date', groupAssignDueDate ? new Date(groupAssignDueDate).toISOString() : '');
        formData.append('file', groupAssignFile);
>>>>>>> origin/feature/assignment-submission
        await api.teacher.createGroupAssignment(activeGroupDetail.id, formData);
      } else {
        await api.teacher.createGroupAssignment(activeGroupDetail.id, {
          title: groupAssignTitle,
          description: groupAssignDesc,
<<<<<<< HEAD
          due_date: groupAssignDueDate || null,
          file_url: groupAssignFileUrl || null,
=======
          due_date: groupAssignDueDate ? new Date(groupAssignDueDate).toISOString() : null,
          file_url: groupAssignFileUrl || null
>>>>>>> origin/feature/assignment-submission
        });
      }

      setGroupAssignTitle("");
      setGroupAssignDesc("");
      setGroupAssignDueDate("");
      setGroupAssignFile(null);
      setGroupAssignFileUrl("");
      setShowGroupAssignmentModal(false);
      notify(
        `Assignment published strictly to ${activeGroupDetail.group_name}!`,
      );
      fetchGroupDetails(activeGroupDetail.id);
    } catch (err) {
      setError(err.message || "Failed to create group assignment");
    }
  };

  // Group Announcement Creation
  const handleCreateGroupAnnouncement = async (e) => {
    e.preventDefault();
    if (!activeGroupDetail || !announcementTitle || !announcementMessage)
      return;

    try {
      await api.teacher.createGroupAnnouncement(activeGroupDetail.id, {
        title: announcementTitle,
        message: announcementMessage,
      });
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setShowGroupAnnouncementModal(false);
      notify(`Announcement broadcast to ${activeGroupDetail.group_name}!`);
      fetchGroupDetails(activeGroupDetail.id);
    } catch (err) {
      setError(err.message || "Failed to post announcement");
    }
  };

  // General Assignment Creation
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentTitle || !assignmentDesc) return;

    try {
      if (assignmentFile) {
        const formData = new FormData();
<<<<<<< HEAD
        formData.append("title", assignmentTitle);
        formData.append("description", assignmentDesc);
        formData.append("group_id", assignmentGroupId);
        formData.append("due_date", assignmentDueDate);
        formData.append("file", assignmentFile);
=======
        formData.append('title', assignmentTitle);
        formData.append('description', assignmentDesc);
        formData.append('group_id', assignmentGroupId);
        formData.append('due_date', assignmentDueDate ? new Date(assignmentDueDate).toISOString() : '');
        formData.append('file', assignmentFile);
>>>>>>> origin/feature/assignment-submission
        await api.teacher.createAssignment(formData);
      } else {
        await api.teacher.createAssignment({
          title: assignmentTitle,
          description: assignmentDesc,
          group_id: assignmentGroupId || null,
<<<<<<< HEAD
          due_date: assignmentDueDate || null,
          file_url:
            assignmentFileUrl ||
            "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
=======
          due_date: assignmentDueDate ? new Date(assignmentDueDate).toISOString() : null,
          file_url: assignmentFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
>>>>>>> origin/feature/assignment-submission
        });
      }

      setAssignmentTitle("");
      setAssignmentDesc("");
      setAssignmentFileUrl("");
      setAssignmentFile(null);
      setAssignmentGroupId("");
      setAssignmentDueDate("");
      setShowCreateAssignmentModal(false);
      notify("Assignment published successfully!");
      fetchAssignments();
    } catch (err) {
      setError(err.message || "Failed to create assignment");
    }
  };

  // Marks Handler
  const handleSaveMarks = async (e) => {
    e.preventDefault();
    if (!marksStudentId || !marksSubject || marksScore === "") return;

    try {
      await api.teacher.saveMarks({
        student_id: marksStudentId,
        subject: marksSubject,
        marks: parseFloat(marksScore),
      });
      setShowMarksModal(false);
      setMarksSubject("");
      setMarksScore("");
      notify("Student marks recorded successfully!");
      fetchMarks();
    } catch (err) {
      setError(err.message || "Failed to save marks");
    }
  };

  // Filtered students for add member modal — exclude already-enrolled students
  const filteredStudentsForModal = students.filter((s) => {
    const matchesSearch =
      !memberSearchQuery ||
      s.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(memberSearchQuery.toLowerCase());
    const matchesDept = !memberDeptFilter || s.department === memberDeptFilter;
    // Hide students that are already members of the target group
    const isAlreadyMember = targetGroupForMember?.members?.some(
      (m) => m.id === s.id,
    );
    return matchesSearch && matchesDept && !isAlreadyMember;
  });

  // Filtered admin tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "all") return true;
    return t.status === taskFilter;
  });

  const pendingTasksCount = tasks.filter((t) => t.status === "assigned").length;

  return (
    <div className="app-container">
      <Navbar />

      <main
        className="dashboard-main teacher-dashboard"
        style={{
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* Header */}
        <div className="page-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginBottom: "0.25rem",
              }}
            >
              <span className="role-tag teacher">
                <GraduationCap size={14} /> Faculty Workspace
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {currentUser.name} •{" "}
                {currentUser.department || "Academic Faculty"}
              </span>
            </div>
            <h1 className="page-title">Cohort & Academic Operations</h1>
            <p className="page-subtitle">
              Manage student groups, publish cohort-exclusive assignments with
              deadlines, resolve admin tasks, and coordinate with students.
            </p>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
              color: "#b42318",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={18} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                color: "#b42318",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
              color: "#047857",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle size={18} />
            <span style={{ flex: 1 }}>{success}</span>
            <button
              onClick={() => setSuccess("")}
              style={{
                background: "none",
                border: "none",
                color: "#047857",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 6 Feature Navigation Tabs */}
        <div
          className="tabs-nav"
          style={{ flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}
        >
          <button
            className={`tab-btn ${activeTab === "groups" ? "active teacher" : ""}`}
            onClick={() => {
              setActiveTab("groups");
              setActiveGroupDetail(null);
            }}
          >
            <FolderPlus size={16} />
            <span>Groups & Cohorts ({groups.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "tasks" ? "active teacher" : ""}`}
            onClick={() => setActiveTab("tasks")}
            style={{ position: "relative" }}
          >
            <ClipboardList size={16} />
            <span>Admin Tasks</span>
            {pendingTasksCount > 0 && (
              <span
                style={{
                  background: "#f59e0b",
                  color: "#0f172a",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.45rem",
                  borderRadius: "999px",
                  marginLeft: "0.35rem",
                }}
              >
                {pendingTasksCount} Action
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === "assignments" ? "active teacher" : ""}`}
            onClick={() => setActiveTab("assignments")}
          >
            <FileUp size={16} />
            <span>Assignments ({assignments.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "students" ? "active teacher" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            <Users size={16} />
            <span>Student Directory</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "marks" ? "active teacher" : ""}`}
            onClick={() => setActiveTab("marks")}
          >
            <Award size={16} />
            <span>Marks & Grading</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "messages" ? "active teacher" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            <MessageSquare size={16} />
            <span>Chat & Inquiries</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GROUPS & COHORTS (Primary Hub with Detailed Drilldown)            */}
        {/* ========================================================================= */}
        {activeTab === "groups" && (
          <div>
            {!activeGroupDetail ? (
              // All Groups Overview
              <div>
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
                  <div>
                    <h2
                      style={{
                        fontSize: "1.3rem",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      Academic Groups & Cohorts
                    </h2>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Organize students into private cohorts. Assignments and
                      announcements published here are restricted solely to
                      enrolled members.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="btn btn-teacher"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Plus size={16} />
                    <span>Create New Group</span>
                  </button>
                </div>

                {loading ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Loading cohorts...
                  </div>
                ) : groups.length === 0 ? (
                  <div
                    style={{
                      padding: "3.5rem 2rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      background: "#fffdf8",
                      borderRadius: "12px",
                      border: "1px dashed rgba(87, 74, 36, 0.12)",
                    }}
                  >
                    <FolderPlus
                      size={44}
                      style={{
                        color: "#047857",
                        margin: "0 auto 1rem auto",
                        opacity: 0.8,
                      }}
                    />
                    <h3
                      style={{
                        color: "var(--text-primary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      No groups created yet
                    </h3>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        maxWidth: "480px",
                        margin: "0 auto 1.5rem auto",
                      }}
                    >
                      Form your first study cohort to add students by name or
                      department and post group-exclusive assignments.
                    </p>
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="btn btn-teacher"
                    >
                      <Plus size={16} /> Create First Cohort
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(360px, 1fr))",
                      gap: "1.25rem",
                    }}
                  >
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="glass-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          transition: "transform 0.2s, border-color 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                fontSize: "1.15rem",
                                color: "var(--text-primary)",
                                fontWeight: 600,
                                marginBottom: "0.2rem",
                              }}
                            >
                              {group.group_name}
                            </h3>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <Calendar size={12} /> Created:{" "}
                              {new Date(group.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            style={{
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#047857",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "999px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            {group.members?.length || 0} Students
                          </span>
                        </div>

                        {/* Quick Member Preview */}
                        <div style={{ flex: 1, marginBottom: "1.25rem" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              marginBottom: "0.5rem",
                              fontWeight: 600,
                            }}
                          >
                            Enrolled Members
                          </div>
                          {!group.members || group.members.length === 0 ? (
                            <div
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                fontStyle: "italic",
                                padding: "0.75rem",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "6px",
                              }}
                            >
                              No students in this group yet. Use "Add Students"
                              to enroll members from any department.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.4rem",
                                maxHeight: "160px",
                                overflowY: "auto",
                              }}
                            >
                              {group.members.slice(0, 4).map((m) => (
                                <div
                                  key={m.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.4rem 0.65rem",
                                    background: "rgba(87, 74, 36, 0.04)",
                                    borderRadius: "6px",
                                    border: "1px solid rgba(87, 74, 36, 0.12)",
                                  }}
                                >
                                  <div>
                                    <span
                                      style={{
                                        fontSize: "0.85rem",
                                        color: "var(--text-primary)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {m.name}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        color: "var(--text-secondary)",
                                        marginLeft: "0.5rem",
                                      }}
                                    >
                                      ({m.department})
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(group.id, m.id)
                                    }
                                    title="Remove from group"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#b42318",
                                      cursor: "pointer",
                                      padding: "0.2rem",
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                              {group.members.length > 4 && (
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    textAlign: "center",
                                    padding: "0.2rem",
                                  }}
                                >
                                  +{group.members.length - 4} more students
                                  enrolled
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                            marginTop: "auto",
                          }}
                        >
                          <button
                            onClick={() => handleOpenAddMemberModal(group)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <UserPlus size={14} color="#047857" />
                            <span>Add Students</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveGroupDetail(group);
                              setGroupSubTab("assignments");
                            }}
                            className="btn btn-teacher btn-sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <span>Open Cohort</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Group Drilldown Detail View
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "12px",
                    padding: "1.25rem 1.5rem",
                  }}
                >
                  <div>
                    <button
                      onClick={() => setActiveGroupDetail(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#047857",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        marginBottom: "0.4rem",
                        fontWeight: 600,
                      }}
                    >
                      ← Back to All Groups
                    </button>
                    <h2
                      style={{
                        fontSize: "1.4rem",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {activeGroupDetail.group_name}
                    </h2>
                    <span
                      style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                    >
                      Cohort Workspace •{" "}
                      {activeGroupDetail.members?.length || 0} Enrolled Members
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button
                      onClick={() =>
                        handleOpenAddMemberModal(activeGroupDetail)
                      }
                      className="btn btn-secondary btn-sm"
                    >
                      <UserPlus size={14} color="#047857" />
                      <span>Add Students</span>
                    </button>
                    <button
                      onClick={() => setShowGroupAssignmentModal(true)}
                      className="btn btn-teacher btn-sm"
                    >
                      <Plus size={14} />
                      <span>Post Assignment</span>
                    </button>
                    <button
                      onClick={() => setShowGroupAnnouncementModal(true)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Megaphone size={14} color="#38bdf8" />
                      <span>Announcement</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                    paddingBottom: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <button
                    onClick={() => setGroupSubTab("assignments")}
                    style={{
                      background:
                        groupSubTab === "assignments"
                          ? "rgba(16, 185, 129, 0.15)"
                          : "transparent",
                      color:
                        groupSubTab === "assignments"
                          ? "#047857"
                          : "var(--text-muted)",
                      border:
                        groupSubTab === "assignments"
                          ? "1px solid #047857"
                          : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.45rem 1rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <FileUp size={15} />
                    <span>Cohort Assignments ({groupAssignments.length})</span>
                  </button>

                  <button
                    onClick={() => setGroupSubTab("announcements")}
                    style={{
                      background:
                        groupSubTab === "announcements"
                          ? "rgba(16, 185, 129, 0.15)"
                          : "transparent",
                      color:
                        groupSubTab === "announcements"
                          ? "#047857"
                          : "var(--text-muted)",
                      border:
                        groupSubTab === "announcements"
                          ? "1px solid #047857"
                          : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.45rem 1rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Bell size={15} />
                    <span>Announcements ({groupAnnouncements.length})</span>
                  </button>

                  <button
                    onClick={() => setGroupSubTab("members")}
                    style={{
                      background:
                        groupSubTab === "members"
                          ? "rgba(16, 185, 129, 0.15)"
                          : "transparent",
                      color:
                        groupSubTab === "members"
                          ? "#047857"
                          : "var(--text-muted)",
                      border:
                        groupSubTab === "members"
                          ? "1px solid #047857"
                          : "1px solid transparent",
                      borderRadius: "6px",
                      padding: "0.45rem 1rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Users size={15} />
                    <span>
                      Members Directory (
                      {activeGroupDetail.members?.length || 0})
                    </span>
                  </button>
                </div>

                {/* SUBTAB: GROUP ASSIGNMENTS */}
                {groupSubTab === "assignments" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Assignments published here are visible{" "}
                        <strong>only</strong> to students enrolled in this
                        group.
                      </div>
                      <button
                        onClick={() => setShowGroupAssignmentModal(true)}
                        className="btn btn-teacher btn-sm"
                      >
                        <Plus size={14} /> New Group Assignment
                      </button>
                    </div>

                    {groupAssignments.length === 0 ? (
                      <div
                        style={{
                          padding: "3rem",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                          background: "#fffdf8",
                          borderRadius: "12px",
                          border: "1px dashed rgba(87, 74, 36, 0.12)",
                        }}
                      >
                        No assignments published to this group yet. Click "New
                        Group Assignment" to create one with a deadline!
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(350px, 1fr))",
                          gap: "1.25rem",
                        }}
                      >
                        {groupAssignments.map((a) => {
                          const isOverdue =
                            a.due_date && new Date(a.due_date) < new Date();
                          return (
                            <div
                              key={a.id}
                              className="glass-card"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                <h4
                                  style={{
                                    fontSize: "1.05rem",
                                    color: "var(--text-primary)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {a.title}
                                </h4>
                                {a.due_date && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      padding: "0.2rem 0.55rem",
                                      borderRadius: "6px",
                                      background: isOverdue
                                        ? "rgba(239, 68, 68, 0.15)"
                                        : "rgba(59, 130, 246, 0.15)",
                                      color: isOverdue ? "#b42318" : "#1d4ed8",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                    }}
                                  >
                                    <Clock size={11} />
<<<<<<< HEAD
                                    {isOverdue ? "OVERDUE" : "DUE"}:{" "}
                                    {new Date(a.due_date).toLocaleDateString()}
=======
                                    {isOverdue ? 'CLOSED' : 'DUE'}: {new Date(a.due_date).toLocaleString()}
>>>>>>> origin/feature/assignment-submission
                                  </span>
                                )}
                              </div>

                              <p
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-secondary)",
                                  lineHeight: 1.5,
                                  flex: 1,
                                  marginBottom: "1rem",
                                }}
                              >
                                {a.description}
                              </p>
                              <TeacherAssignmentSubmissions assignment={a} />

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderTop: "1px solid rgba(87, 74, 36, 0.12)",
                                  paddingTop: "0.75rem",
                                  marginTop: "auto",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  Posted:{" "}
                                  {new Date(a.created_at).toLocaleDateString()}
                                </span>
                                {a.file_url && (
                                  <a
                                    href={a.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      fontSize: "0.8rem",
                                      color: "#047857",
                                      textDecoration: "none",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <Download size={13} /> Resource Handout
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB: GROUP ANNOUNCEMENTS */}
                {groupSubTab === "announcements" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Announcements posted to this cohort are visible on
                        students' group dashboard.
                      </div>
                      <button
                        onClick={() => setShowGroupAnnouncementModal(true)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Megaphone size={14} color="#38bdf8" /> Post
                        Announcement
                      </button>
                    </div>

                    {groupAnnouncements.length === 0 ? (
                      <div
                        style={{
                          padding: "3rem",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                          background: "#fffdf8",
                          borderRadius: "12px",
                          border: "1px dashed rgba(87, 74, 36, 0.12)",
                        }}
                      >
                        No announcements posted to this cohort yet. Click "Post
                        Announcement" to communicate schedule updates or exam
                        hints!
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {groupAnnouncements.map((anno) => (
                          <div
                            key={anno.id}
                            className="glass-card"
                            style={{
                              borderLeft: "4px solid #80775c",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "0.4rem",
                              }}
                            >
                              <h4
                                style={{
                                  fontSize: "1.05rem",
                                  color: "var(--text-primary)",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                }}
                              >
                                <Megaphone size={15} color="#80775c" />{" "}
                                {anno.title}
                              </h4>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {new Date(anno.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text-secondary)",
                                lineHeight: 1.5,
                                margin: 0,
                              }}
                            >
                              {anno.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB: MEMBERS DIRECTORY */}
                {groupSubTab === "members" && (
                  <div className="glass-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        Enrolled Students Directory
                      </h3>
                      <button
                        onClick={() =>
                          handleOpenAddMemberModal(activeGroupDetail)
                        }
                        className="btn btn-teacher btn-sm"
                      >
                        <UserPlus size={14} /> Add More Students
                      </button>
                    </div>

                    {!activeGroupDetail.members ||
                    activeGroupDetail.members.length === 0 ? (
                      <div
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        No students currently enrolled in this group.
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            textAlign: "left",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                borderBottom:
                                  "1px solid rgba(87, 74, 36, 0.12)",
                                color: "var(--text-muted)",
                                fontSize: "0.8rem",
                                textTransform: "uppercase",
                              }}
                            >
                              <th style={{ padding: "0.75rem 1rem" }}>
                                Student Name
                              </th>
                              <th style={{ padding: "0.75rem 1rem" }}>
                                Email Address
                              </th>
                              <th style={{ padding: "0.75rem 1rem" }}>
                                Department
                              </th>
                              <th
                                style={{
                                  padding: "0.75rem 1rem",
                                  textAlign: "right",
                                }}
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeGroupDetail.members.map((m) => (
                              <tr
                                key={m.id}
                                style={{
                                  borderBottom:
                                    "1px solid rgba(87, 74, 36, 0.12)",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "0.75rem 1rem",
                                    color: "var(--text-primary)",
                                    fontWeight: 500,
                                  }}
                                >
                                  {m.name}
                                </td>
                                <td
                                  style={{
                                    padding: "0.75rem 1rem",
                                    color: "var(--text-muted)",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  {m.email}
                                </td>
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <span
                                    style={{
                                      background: "rgba(87, 74, 36, 0.08)",
                                      color: "var(--text-secondary)",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "4px",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    {m.department}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: "0.75rem 1rem",
                                    textAlign: "right",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(
                                        activeGroupDetail.id,
                                        m.id,
                                      )
                                    }
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      color: "#b42318",
                                      borderColor: "rgba(239, 68, 68, 0.2)",
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADMIN TASKS & COMPLAINTS (Assigned Tasks with Toggle Button)      */}
        {/* ========================================================================= */}
        {activeTab === "tasks" && (
          <div>
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
              <div>
                <h2
                  style={{
                    fontSize: "1.3rem",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ClipboardList size={20} color="#f59e0b" />
                  <span>Admin-Assigned Tasks & Action Items</span>
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Student grievances and campus requests assigned to you by the
                  administrative team. Use the <strong>Toggle Button</strong> to
                  notify the admin when addressed.
                </p>
              </div>

              {/* Status Filter */}
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  background: "#fffdf8",
                  padding: "0.3rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(87, 74, 36, 0.12)",
                }}
              >
                <button
                  onClick={() => setTaskFilter("all")}
                  style={{
                    background:
                      taskFilter === "all"
                        ? "rgba(87, 74, 36, 0.12)"
                        : "transparent",
                    color:
                      taskFilter === "all"
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  All ({tasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter("assigned")}
                  style={{
                    background:
                      taskFilter === "assigned"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "transparent",
                    color:
                      taskFilter === "assigned"
                        ? "#8a4b08"
                        : "var(--text-secondary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Pending Action ({pendingTasksCount})
                </button>
                <button
                  onClick={() => setTaskFilter("resolved")}
                  style={{
                    background:
                      taskFilter === "resolved"
                        ? "rgba(16, 185, 129, 0.2)"
                        : "transparent",
                    color:
                      taskFilter === "resolved"
                        ? "#047857"
                        : "var(--text-secondary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Resolved (
                  {tasks.filter((t) => t.status === "resolved").length})
                </button>
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Loading assigned tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div
                style={{
                  padding: "3.5rem 2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  background: "#fffdf8",
                  borderRadius: "12px",
                  border: "1px dashed rgba(87, 74, 36, 0.12)",
                }}
              >
                <CheckCircle
                  size={44}
                  style={{
                    color: "#047857",
                    margin: "0 auto 1rem auto",
                    opacity: 0.8,
                  }}
                />
                <h3
                  style={{
                    color: "var(--text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  No pending tasks matching filter
                </h3>
                <p
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
                >
                  You are all caught up! When administrators allocate student
                  complaints or lab requirements to you, they will appear here.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {filteredTasks.map((task) => {
                  const isResolved = task.status === "resolved";
                  const isToggling = togglingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="glass-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        borderLeft: isResolved
                          ? "4px solid #047857"
                          : "4px solid #f59e0b",
                        background: isResolved
                          ? "rgba(16, 185, 129, 0.03)"
                          : "rgba(245, 158, 11, 0.03)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "4px",
                              marginBottom: "0.35rem",
                              background: isResolved
                                ? "rgba(16, 185, 129, 0.2)"
                                : "rgba(245, 158, 11, 0.2)",
                              color: isResolved ? "#047857" : "#8a4b08",
                            }}
                          >
                            {isResolved
                              ? "RESOLVED / COMPLETED"
                              : "ACTION REQUIRED"}
                          </span>
                          <h3
                            style={{
                              fontSize: "1.1rem",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {task.title}
                          </h3>
                        </div>

                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          flex: 1,
                          marginBottom: "1.25rem",
                        }}
                      >
                        {task.description}
                      </p>

                      {/* Student Info */}
                      {task.student && (
                        <div
                          style={{
                            background: "rgba(87, 74, 36, 0.04)",
                            padding: "0.6rem 0.8rem",
                            borderRadius: "6px",
                            marginBottom: "1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          <User size={14} color="#1d4ed8" />
                          <span>
                            Filed by: <strong>{task.student.name}</strong> (
                            {task.student.department || task.student.email})
                          </span>
                        </div>
                      )}

                      {/* TOGGLE BUTTON */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderTop: "1px solid rgba(87, 74, 36, 0.12)",
                          paddingTop: "0.85rem",
                          marginTop: "auto",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Status:{" "}
                          <strong
                            style={{
                              color: isResolved ? "#047857" : "#8a4b08",
                            }}
                          >
                            {task.status.toUpperCase()}
                          </strong>
                        </div>

                        <button
                          onClick={() => handleToggleTask(task.id)}
                          disabled={isToggling}
                          className={`btn ${isResolved ? "btn-secondary" : "btn-teacher"} btn-sm`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.45rem",
                            fontWeight: 600,
                            padding: "0.45rem 0.9rem",
                            cursor: "pointer",
                          }}
                        >
                          {isResolved ? (
                            <>
                              <RotateCcw size={14} />
                              <span>Reopen / Mark In-Progress</span>
                            </>
                          ) : (
                            <>
                              <Check size={15} />
                              <span>Mark Finished (Notify Admin)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ASSIGNMENTS (All Assignments Overview)                             */}
        {/* ========================================================================= */}
        {activeTab === "assignments" && (
          <div>
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
              <div>
                <h2
                  style={{
                    fontSize: "1.3rem",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                  }}
                >
                  All Course Assignments
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Assignments can be published generally or restricted to
                  specific cohorts. Deadlines are automatically tracked for
                  students.
                </p>
              </div>
              <button
                onClick={() => setShowCreateAssignmentModal(true)}
                className="btn btn-teacher"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Plus size={16} />
                <span>Publish Assignment</span>
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Loading assignments...
              </div>
            ) : assignments.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  background: "#fffdf8",
                  borderRadius: "12px",
                  border: "1px dashed rgba(87, 74, 36, 0.12)",
                }}
              >
                No assignments uploaded yet. Click "Publish Assignment" to
                create your first problem set or brief.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {assignments.map((a) => {
                  const isOverdue =
                    a.due_date && new Date(a.due_date) < new Date();
                  const targetGroup = groups.find((g) => g.id === a.group_id);

                  return (
                    <div
                      key={a.id}
                      className="glass-card"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div>
                          {targetGroup ? (
                            <span
                              style={{
                                display: "inline-block",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#047857",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                marginBottom: "0.35rem",
                              }}
                            >
                              Cohort: {targetGroup.group_name}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                background: "rgba(87, 74, 36, 0.12)",
                                color: "var(--text-muted)",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                marginBottom: "0.35rem",
                              }}
                            >
                              All Students
                            </span>
                          )}
                          <h3
                            style={{
                              fontSize: "1.1rem",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {a.title}
                          </h3>
                        </div>

                        {a.due_date && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              background: isOverdue
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(59, 130, 246, 0.15)",
                              color: isOverdue ? "#b42318" : "#1d4ed8",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <Clock size={11} />
<<<<<<< HEAD
                            {isOverdue ? "OVERDUE" : "DUE"}:{" "}
                            {new Date(a.due_date).toLocaleDateString()}
=======
                            {isOverdue ? 'CLOSED' : 'DUE'}: {new Date(a.due_date).toLocaleString()}
>>>>>>> origin/feature/assignment-submission
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          flex: 1,
                          marginBottom: "1rem",
                        }}
                      >
                        {a.description}
                      </p>
                      <TeacherAssignmentSubmissions assignment={a} />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid rgba(87, 74, 36, 0.12)",
                          paddingTop: "0.75rem",
                          marginTop: "auto",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Uploaded:{" "}
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                        {a.file_url && (
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.8rem",
                              color: "#047857",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            <Download size={13} /> Resource File
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: STUDENT DIRECTORY                                                 */}
        {/* ========================================================================= */}
        {activeTab === "students" && (
          <div className="glass-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>
                Student Directory & Filter
              </h2>

              {/* Filters */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative", width: "220px" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "12px",
                      color: "var(--text-secondary)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchStudents()}
                    className="form-input"
                    style={{
                      paddingLeft: "2rem",
                      height: "38px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <select
                  value={studentDept}
                  onChange={(e) => setStudentDept(e.target.value)}
                  className="form-select"
                  style={{
                    width: "190px",
                    height: "38px",
                    fontSize: "0.85rem",
                    padding: "0.4rem 0.75rem",
                  }}
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Software Engineering">
                    Software Engineering
                  </option>
                  <option value="Electrical Engineering">
                    Electrical Engineering
                  </option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                </select>

                <button
                  onClick={fetchStudents}
                  className="btn btn-secondary btn-sm"
                  style={{ height: "38px" }}
                >
                  <Filter size={14} /> Filter
                </button>
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                No students found matching current filters.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "0.75rem 1rem" }}>Name</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Email</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Department</th>
                      <th
                        style={{ padding: "0.75rem 1rem", textAlign: "right" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => (
                      <tr
                        key={st.id}
                        style={{
                          borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {st.name}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {st.email}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              background: "rgba(87, 74, 36, 0.08)",
                              color: "var(--text-secondary)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                            }}
                          >
                            {st.department}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "right",
                          }}
                        >
                          <button
                            onClick={() => {
                              setMarksStudentId(st.id);
                              setShowMarksModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: "0.5rem" }}
                          >
                            <Award size={13} color="#047857" />
                            <span>Grade Mark</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab("messages");
                              handleSelectChatStudent(st);
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            <MessageSquare size={13} color="#1d4ed8" />
                            <span>Chat</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MARKS & GRADING                                                   */}
        {/* ========================================================================= */}
        {activeTab === "marks" && (
          <div className="glass-card">
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
              <div>
                <h2
                  style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}
                >
                  Student Performance & Marks
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Record official grades and examination scores for enrolled
                  scholars.
                </p>
              </div>
              <button
                onClick={() => setShowMarksModal(true)}
                className="btn btn-teacher btn-sm"
              >
                <Plus size={16} />
                <span>Record New Mark</span>
              </button>
            </div>

            {marksList.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                No marks awarded yet. Click "Record New Mark" to post an
                assessment grade.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "0.75rem 1rem" }}>Student</th>
                      <th style={{ padding: "0.75rem 1rem" }}>
                        Subject / Course
                      </th>
                      <th style={{ padding: "0.75rem 1rem" }}>Score</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Recorded On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksList.map((m) => (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                              fontWeight: 500,
                            }}
                          >
                            {m.student?.name || "Student"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {m.student?.email}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {m.subject}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color:
                                m.marks >= 75
                                  ? "#047857"
                                  : m.marks >= 50
                                    ? "#8a4b08"
                                    : "#b42318",
                            }}
                          >
                            {m.marks} / 100
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-secondary)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: BIDIRECTIONAL CHAT & COMMUNICATION                                */}
        {/* ========================================================================= */}
        {activeTab === "messages" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 340px) 1fr",
              gap: "1.25rem",
            }}
          >
            {/* Left: Students with Messages / Directory */}
            <div
              className="glass-card"
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                height: "650px",
              }}
            >
              <h3
                style={{
                  fontSize: "1.05rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.75rem",
                }}
              >
                Conversations
              </h3>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {students.map((st) => {
                  const isSelected = selectedChatStudent?.id === st.id;
                  const studentMsgs = messages.filter(
                    (m) => m.student_id === st.id,
                  );
                  const lastMsg = studentMsgs[studentMsgs.length - 1];

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleSelectChatStudent(st)}
                      className={`teacher-chat-student${isSelected ? " is-selected" : ""}`}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--text-primary)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {st.name}
                        </strong>
                        {studentMsgs.length > 0 && (
                          <span
                            style={{
                              background: "rgba(87, 74, 36, 0.12)",
                              color: "var(--text-muted)",
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                            }}
                          >
                            {studentMsgs.length}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {st.department}
                      </div>
                      {lastMsg && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lastMsg.sender_role === "teacher" ? "You: " : ""}
                          {lastMsg.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Chat Conversation Thread */}
            <div
              className="glass-card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                height: "650px",
              }}
            >
              {selectedChatStudent ? (
                <>
                  {/* Chat Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      borderBottom: "1px solid rgba(87, 74, 36, 0.12)",
                      paddingBottom: "0.75rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "rgba(29, 78, 216, 0.1)",
                        color: "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {selectedChatStudent.name[0]}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "1.05rem",
                          color: "var(--text-primary)",
                          margin: 0,
                        }}
                      >
                        {selectedChatStudent.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {selectedChatStudent.email} •{" "}
                        {selectedChatStudent.department}
                      </span>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      padding: "0.5rem 0",
                    }}
                  >
                    {chatThread.length === 0 ? (
                      <div
                        style={{
                          margin: "auto",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        No conversation history yet. Send a message to initiate
                        academic guidance!
                      </div>
                    ) : (
                      chatThread.map((msg) => {
                        const isTeacher = msg.sender_role === "teacher";
                        return (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: isTeacher ? "flex-end" : "flex-start",
                              maxWidth: "75%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isTeacher ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                background: isTeacher
                                  ? "#047857"
                                  : "rgba(87, 74, 36, 0.12)",
                                color: isTeacher
                                  ? "#ffffff"
                                  : "var(--text-primary)",
                                fontWeight: isTeacher ? 500 : 400,
                                padding: "0.7rem 1rem",
                                borderRadius: isTeacher
                                  ? "12px 12px 2px 12px"
                                  : "12px 12px 12px 2px",
                                fontSize: "0.88rem",
                                lineHeight: 1.45,
                              }}
                            >
                              {msg.message}
                            </div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-secondary)",
                                marginTop: "0.2rem",
                                padding: "0 0.25rem",
                              }}
                            >
                              {isTeacher ? "You" : selectedChatStudent.name} •{" "}
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Reply Input */}
                  <form
                    onSubmit={handleSendReply}
                    style={{
                      marginTop: "0.75rem",
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <input
                      type="text"
                      placeholder={`Reply to ${selectedChatStudent.name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="form-input"
                      style={{ flex: 1, height: "44px" }}
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="btn btn-teacher"
                      style={{
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0 1.25rem",
                      }}
                    >
                      <Send size={15} />
                      <span>Reply</span>
                    </button>
                  </form>
                </>
              ) : (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  <MessageSquare
                    size={44}
                    style={{
                      color: "var(--text-secondary)",
                      margin: "0 auto 1rem auto",
                      opacity: 0.5,
                    }}
                  />
                  <h4
                    style={{
                      color: "var(--text-primary)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Select a scholar to chat
                  </h4>
                  <p style={{ fontSize: "0.85rem" }}>
                    Click any student on the left panel to review or dispatch
                    replies.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE GROUP                                                     */}
      {/* ========================================================================= */}
      {showCreateGroupModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--text-primary)" }}>
                Establish New Study Cohort
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cohort / Group Name</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. CS-401 Distributed Systems Team A"
                    className="form-input"
                    autoFocus
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.35rem",
                      display: "block",
                    }}
                  >
                    Once created, you can search and add students based on their
                    names and department.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teacher">
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD MEMBERS TO GROUP (with Name & Department Search)              */}
      {/* ========================================================================= */}
      {showAddMemberModal && targetGroupForMember && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3
                  style={{
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                  }}
                >
                  Enroll Scholars into {targetGroupForMember.group_name}
                  {targetGroupForMember.members?.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#047857",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "999px",
                        fontWeight: 600,
                      }}
                    >
                      {targetGroupForMember.members.length} enrolled
                    </span>
                  )}
                </h3>
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  {filteredStudentsForModal.length} student
                  {filteredStudentsForModal.length !== 1 ? "s" : ""} available
                  to add
                </span>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Search & Department Filter Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "12px",
                      color: "var(--text-secondary)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by student name..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="form-input"
                    style={{
                      paddingLeft: "2rem",
                      height: "38px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <select
                  value={memberDeptFilter}
                  onChange={(e) => setMemberDeptFilter(e.target.value)}
                  className="form-select"
                  style={{ height: "38px", fontSize: "0.85rem" }}
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Software Engineering">
                    Software Engineering
                  </option>
                  <option value="Electrical Engineering">
                    Electrical Engineering
                  </option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleAddAllFilteredStudents}
                  disabled={
                    isAddingAllMembers || filteredStudentsForModal.length === 0
                  }
                  className="btn btn-teacher btn-sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <UserPlus size={14} />
                  {isAddingAllMembers
                    ? "Adding students..."
                    : `Add All Available (${filteredStudentsForModal.length})`}
                </button>
              </div>

              {/* Student Results List */}
              <div
                style={{
                  maxHeight: "280px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {filteredStudentsForModal.length === 0 ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {targetGroupForMember.members?.length > 0 &&
                    students.length > 0
                      ? "All matching students are already enrolled in this group."
                      : "No students found matching current filters."}
                  </div>
                ) : (
                  filteredStudentsForModal.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.65rem 0.85rem",
                        background: "rgba(87, 74, 36, 0.04)",
                        borderRadius: "8px",
                        border: "1px solid rgba(87, 74, 36, 0.12)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                            fontSize: "0.9rem",
                          }}
                        >
                          {st.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {st.email} •{" "}
                          <span style={{ color: "#047857" }}>
                            {st.department}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddMemberToGroup(st.id)}
                        className="btn btn-teacher btn-sm"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                        }}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="btn btn-secondary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: POST GROUP-SCOPED ASSIGNMENT (Exclusive to Active Group)         */}
      {/* ========================================================================= */}
      {showGroupAssignmentModal && activeGroupDetail && (
        <div
          className="modal-overlay"
          onClick={() => setShowGroupAssignmentModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ color: "var(--text-primary)" }}>
                  Post Assignment to {activeGroupDetail.group_name}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#047857" }}>
                  Only enrolled group members can access this assignment
                </span>
              </div>
              <button
                onClick={() => setShowGroupAssignmentModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroupAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={groupAssignTitle}
                    onChange={(e) => setGroupAssignTitle(e.target.value)}
                    placeholder="e.g. Lab 3: Raft Consensus Implementation"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Due Date & Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={groupAssignDueDate}
                    onChange={(e) => setGroupAssignDueDate(e.target.value)}
                    className="form-input"
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    Students who fail to submit before this deadline will see it
                    flagged as Overdue.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description & Instructions
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={groupAssignDesc}
                    onChange={(e) => setGroupAssignDesc(e.target.value)}
                    placeholder="Detailed grading rubrics, submission specifications, and questions..."
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Upload Resource File (PDF / DOCX)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setGroupAssignFile(e.target.files[0])}
                    className="form-input"
                    style={{ padding: "0.5rem" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Or Document Resource URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={groupAssignFileUrl}
                    onChange={(e) => setGroupAssignFileUrl(e.target.value)}
                    placeholder="https://example.com/handout.pdf"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowGroupAssignmentModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teacher">
                  Publish to Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: POST GROUP ANNOUNCEMENT                                          */}
      {/* ========================================================================= */}
      {showGroupAnnouncementModal && activeGroupDetail && (
        <div
          className="modal-overlay"
          onClick={() => setShowGroupAnnouncementModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--text-primary)" }}>
                Post Announcement to {activeGroupDetail.group_name}
              </h3>
              <button
                onClick={() => setShowGroupAnnouncementModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroupAnnouncement}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g. Midterm Review Session Rescheduled"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Important information for this cohort..."
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowGroupAnnouncementModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teacher">
                  Broadcast Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: GENERAL ASSIGNMENT CREATION (Optional Scoping to Any Group)      */}
      {/* ========================================================================= */}
      {showCreateAssignmentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateAssignmentModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--text-primary)" }}>
                Publish Course Assignment
              </h3>
              <button
                onClick={() => setShowCreateAssignmentModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g. Lab Exercise 4: Dynamic Programming & Graphs"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Target Study Group / Cohort (Optional)
                  </label>
                  <select
                    value={assignmentGroupId}
                    onChange={(e) => setAssignmentGroupId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">
                      -- All Students (Global Assignment) --
                    </option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name} ({g.members?.length || 0} members)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Due Date & Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description & Instructions
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={assignmentDesc}
                    onChange={(e) => setAssignmentDesc(e.target.value)}
                    placeholder="Detailed requirements, submission criteria, and grading rubrics..."
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload File (PDF / DOCX)</label>
                  <input
                    type="file"
                    onChange={(e) => setAssignmentFile(e.target.files[0])}
                    className="form-input"
                    style={{ padding: "0.5rem" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Or Document Resource URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={assignmentFileUrl}
                    onChange={(e) => setAssignmentFileUrl(e.target.value)}
                    placeholder="https://example.com/handout.pdf"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teacher">
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: GRADE / UPDATE MARKS MODAL                                       */}
      {/* ========================================================================= */}
      {showMarksModal && (
        <div className="modal-overlay" onClick={() => setShowMarksModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--text-primary)" }}>
                Record Student Grade
              </h3>
              <button
                onClick={() => setShowMarksModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveMarks}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Student</label>
                  <select
                    value={marksStudentId}
                    onChange={(e) => setMarksStudentId(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email}) - {st.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject / Course Name</label>
                  <input
                    type="text"
                    required
                    value={marksSubject}
                    onChange={(e) => setMarksSubject(e.target.value)}
                    placeholder="e.g. Distributed Systems, Algorithms"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Score / Marks (0 to 100)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    value={marksScore}
                    onChange={(e) => setMarksScore(e.target.value)}
                    placeholder="e.g. 92.5"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowMarksModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teacher">
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
