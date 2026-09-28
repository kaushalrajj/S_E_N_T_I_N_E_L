import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { api } from '../api/apiClient';
import { useRealtime } from '../context/RealtimeContext';
import {
  BookOpen,
  FileText,
  Award,
  Send,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  GraduationCap,
  X,
  MessageSquare,
  Sparkles,
  UserCheck,
  FolderPlus,
  Search,
  Megaphone,
  Calendar,
  AlertTriangle,
  ArrowRight,
  User,
  Filter
} from 'lucide-react';

const STREAMS = [
  'Computer Science',
  'Software Engineering',
  'Electrical Engineering',
  'Mathematics',
  'Physics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Data Science',
  'Electronics & Communication'
];

export const StudentDashboard = () => {
  const { lastEvent } = useRealtime();
  // Tabs: 'groups' | 'assignments' | 'complaints' | 'marks' | 'contact'
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Logged-in user
  const currentUser = JSON.parse(localStorage.getItem('campus_user') || '{}');

  // 1. Groups State
  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [activeGroupDetail, setActiveGroupDetail] = useState(null);
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [groupAnnouncements, setGroupAnnouncements] = useState([]);
  const [groupSubTab, setGroupSubTab] = useState('assignments'); // 'assignments' | 'announcements'

  // 2. All Assignments & Deadline Tracking State
  const [allAssignments, setAllAssignments] = useState([]);

  // 3. Complaints State
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  // 4. Marks State
  const [marks, setMarks] = useState([]);

  // 5. Contact Teacher & Bidirectional Chat State
  const [teachers, setTeachers] = useState([]);
  const [teacherStream, setTeacherStream] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [chatThread, setChatThread] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // Fetch Student's Groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.student.getGroups(groupSearch);
      setGroups(res);
      setActiveGroupDetail((prev) => {
        if (!prev) return prev;
        return res.find((g) => g.id === prev.id) || prev;
      });
    } catch (err) {
      setError(err.message || 'Failed to load enrolled groups');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Detail for Specific Group
  const fetchGroupContent = async (groupId) => {
    try {
      const [assigns, annos] = await Promise.all([
        api.student.getGroupAssignments(groupId),
        api.student.getGroupAnnouncements(groupId)
      ]);
      setGroupAssignments(assigns);
      setGroupAnnouncements(annos);
    } catch (err) {
      console.error('Error fetching group content:', err);
    }
  };

  // Fetch Aggregated Assignments across all student's groups
  const fetchAllAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.student.getAssignments();
      setAllAssignments(res);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.student.getComplaints();
      setComplaints(res);
    } catch (err) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Marks
  const fetchMarks = async () => {
    try {
      setLoading(true);
      const res = await api.student.getMarks();
      setMarks(res);
    } catch (err) {
      setError(err.message || 'Failed to load marks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Faculty & Messages
  const fetchContactData = async () => {
    try {
      setLoading(true);
      const teachersRes = await api.student.getTeachers(teacherStream, teacherSearch);
      setTeachers(teachersRes);

      if (teachersRes.length > 0 && (!selectedTeacher || !teachersRes.find(t => t.id === selectedTeacher.id))) {
        handleSelectTeacher(teachersRes[0]);
      } else if (selectedTeacher) {
        const thread = await api.student.getConversation(selectedTeacher.id);
        setChatThread(thread);
      }
    } catch (err) {
      setError(err.message || 'Failed to load faculty information');
    } finally {
      setLoading(false);
    }
  };

  // Select teacher to chat with
  const handleSelectTeacher = async (t) => {
    setSelectedTeacher(t);
    try {
      const thread = await api.student.getConversation(t.id);
      setChatThread(thread);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Send message to teacher
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedTeacher || !messageText.trim()) return;

    try {
      setSendingMsg(true);
      await api.student.sendMessage({
        teacher_id: selectedTeacher.id,
        message: messageText.trim()
      });
      setMessageText('');
      const updatedThread = await api.student.getConversation(selectedTeacher.id);
      setChatThread(updatedThread);
      notify('Message sent to professor!');
    } catch (err) {
      setError(err.message || 'Failed to dispatch message');
    } finally {
      setSendingMsg(false);
    }
  };

  // Tab switcher effect
  useEffect(() => {
    setError('');
    if (activeTab === 'groups') fetchGroups();
    if (activeTab === 'assignments') fetchAllAssignments();
    if (activeTab === 'complaints') fetchComplaints();
    if (activeTab === 'marks') fetchMarks();
    if (activeTab === 'contact') fetchContactData();
  }, [activeTab, teacherStream]);

  // Realtime events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.table === 'assignments' && activeTab === 'assignments') {
      fetchAllAssignments();
    }
    if (lastEvent.table === 'complaints' && activeTab === 'complaints') {
      fetchComplaints();
    }
    if (lastEvent.table === 'marks' && activeTab === 'marks') {
      fetchMarks();
    }
    if (lastEvent.table === 'messages' && activeTab === 'contact' && selectedTeacher) {
      api.student.getConversation(selectedTeacher.id).then(setChatThread).catch(console.error);
    }
    if (lastEvent.table === 'groups') {
      if (activeTab === 'groups') fetchGroups();
    }
  }, [lastEvent]);

  // Create complaint
  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    if (!complaintTitle || !complaintDesc) return;

    try {
      await api.student.createComplaint({
        title: complaintTitle,
        description: complaintDesc
      });
      setComplaintTitle('');
      setComplaintDesc('');
      setShowComplaintModal(false);
      notify('Complaint logged successfully! Admin and assigned faculty will track it.');
      fetchComplaints();
    } catch (err) {
      setError(err.message || 'Failed to submit complaint');
    }
  };

  // Calculate missed & upcoming deadlines across all assignments
  const now = new Date();
  const overdueAssignments = allAssignments.filter(
    (a) => a.due_date && new Date(a.due_date) < now
  );
  const upcomingAssignments = allAssignments.filter(
    (a) => a.due_date && new Date(a.due_date) >= now
  );

  return (
    <div className="app-container">
      <Navbar />

      <main style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="role-tag student">
                <BookOpen size={14} /> Student Hub
              </span>
              <span style={{ fontSize: '0.8rem', color: '#574A24', fontWeight: 600 }}>
                {currentUser.name} • {currentUser.stream || currentUser.department || 'Enrolled Scholar'}
              </span>
            </div>
            <h1 className="page-title">Academic Portal & Cohort Workspace</h1>
            <p className="page-subtitle">
              Access your enrolled study cohorts, track assignments and overdue deadlines, review examination marks, and chat with faculty.
            </p>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div style={{
            background: 'rgba(87, 74, 36, 0.10)',
            border: '1px solid rgba(87, 74, 36, 0.30)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#3E341A',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} color="#574A24" />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#574A24', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(203, 189, 147, 0.25)',
            border: '1px solid rgba(203, 189, 147, 0.55)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#3E341A',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={18} color="#574A24" />
            <span style={{ flex: 1 }}>{success}</span>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#574A24', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="tabs-nav" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          <button
            className={`tab-btn ${activeTab === 'groups' ? 'active student' : ''}`}
            onClick={() => { setActiveTab('groups'); setActiveGroupDetail(null); }}
          >
            <FolderPlus size={16} />
            <span>My Groups & Cohorts ({groups.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'assignments' ? 'active student' : ''}`}
            onClick={() => setActiveTab('assignments')}
            style={{ position: 'relative' }}
          >
            <FileText size={16} />
            <span>Assignments & Deadlines</span>
            {overdueAssignments.length > 0 && (
              <span style={{
                background: '#574A24',
                color: '#FAE8B4',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                marginLeft: '0.35rem'
              }}>
                {overdueAssignments.length} Overdue
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'complaints' ? 'active student' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            <AlertCircle size={16} />
            <span>My Complaints ({complaints.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'marks' ? 'active student' : ''}`}
            onClick={() => setActiveTab('marks')}
          >
            <Award size={16} />
            <span>Academic Grades</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'contact' ? 'active student' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <MessageSquare size={16} />
            <span>Chat with Faculty</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MY GROUPS & COHORTS                                                */}
        {/* ========================================================================= */}
        {activeTab === 'groups' && (
          <div>
            {!activeGroupDetail ? (
              // All Groups List
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', color: '#3E341A', fontWeight: 700 }}>Enrolled Study Groups</h2>
                    <p style={{ fontSize: '0.85rem', color: '#574A24' }}>
                      Cohorts you have been added to by your professors. Only members can view cohort assignments and announcements.
                    </p>
                  </div>

                  {/* Search Groups by Name */}
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#80775C' }} />
                    <input
                      type="text"
                      placeholder="Search cohorts..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchGroups()}
                      className="form-input"
                      style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#80775C' }}>Loading your study cohorts...</div>
                ) : groups.length === 0 ? (
                  <div style={{
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    color: '#574A24',
                    background: 'rgba(250, 232, 180, 0.45)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(128, 119, 92, 0.35)'
                  }}>
                    <FolderPlus size={44} style={{ color: '#574A24', margin: '0 auto 1rem auto', opacity: 0.8 }} />
                    <h3 style={{ color: '#3E341A', marginBottom: '0.5rem' }}>No enrolled groups</h3>
                    <p style={{ fontSize: '0.9rem', color: '#574A24', maxWidth: '480px', margin: '0 auto' }}>
                      You are not currently enrolled in any study cohorts. Professors will add you to cohorts based on your stream.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="glass-card"
                        onClick={() => {
                          setActiveGroupDetail(group);
                          fetchGroupContent(group.id);
                        }}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          background: 'rgba(250, 232, 180, 0.55)',
                          border: '1px solid rgba(203, 189, 147, 0.50)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.15rem', color: '#3E341A', fontWeight: 700, marginBottom: '0.2rem' }}>
                              {group.group_name}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: '#80775C', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <GraduationCap size={13} color="#574A24" /> Faculty: {group.teacher?.name || 'Academic Professor'}
                            </span>
                          </div>
                          <span style={{
                            background: 'rgba(87, 74, 36, 0.12)',
                            color: '#3E341A',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {group.members?.length || 0} Peers
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 'auto',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid rgba(203, 189, 147, 0.35)'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#80775C' }}>
                            Created: {new Date(group.created_at).toLocaleDateString()}
                          </span>
                          <span style={{
                            fontSize: '0.82rem',
                            color: '#574A24',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            Enter Cohort <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Group Drilldown
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: 'rgba(250, 232, 180, 0.60)',
                  border: '1px solid rgba(203, 189, 147, 0.50)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem'
                }}>
                  <div>
                    <button
                      onClick={() => setActiveGroupDetail(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#574A24',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        marginBottom: '0.4rem',
                        fontWeight: 700
                      }}
                    >
                      ← Back to All My Groups
                    </button>
                    <h2 style={{ fontSize: '1.4rem', color: '#3E341A', fontWeight: 800, margin: 0 }}>
                      {activeGroupDetail.group_name}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: '#574A24' }}>
                      Instructor: {activeGroupDetail.teacher?.name} • {activeGroupDetail.members?.length || 0} Cohort Members
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setGroupSubTab('assignments')}
                      style={{
                        background: groupSubTab === 'assignments' ? '#574A24' : 'rgba(255, 255, 255, 0.80)',
                        color: groupSubTab === 'assignments' ? '#FAE8B4' : '#574A24',
                        border: '1px solid rgba(128, 119, 92, 0.35)',
                        borderRadius: '6px',
                        padding: '0.45rem 1rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FileText size={15} />
                      <span>Assignments ({groupAssignments.length})</span>
                    </button>

                    <button
                      onClick={() => setGroupSubTab('announcements')}
                      style={{
                        background: groupSubTab === 'announcements' ? '#574A24' : 'rgba(255, 255, 255, 0.80)',
                        color: groupSubTab === 'announcements' ? '#FAE8B4' : '#574A24',
                        border: '1px solid rgba(128, 119, 92, 0.35)',
                        borderRadius: '6px',
                        padding: '0.45rem 1rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Megaphone size={15} />
                      <span>Announcements ({groupAnnouncements.length})</span>
                    </button>
                  </div>
                </div>

                {groupSubTab === 'assignments' && (
                  <div>
                    {groupAssignments.length === 0 ? (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: '#574A24',
                        background: 'rgba(250, 232, 180, 0.35)',
                        borderRadius: '12px'
                      }}>
                        No assignments posted to this cohort yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                        {groupAssignments.map((a) => (
                          <div key={a.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <h3 style={{ fontSize: '1.1rem', color: '#3E341A', fontWeight: 700 }}>{a.title}</h3>
                              {a.due_date && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  background: 'rgba(87, 74, 36, 0.12)',
                                  color: '#3E341A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}>
                                  <Clock size={11} /> DUE: {new Date(a.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#574A24', lineHeight: 1.5, flex: 1, marginBottom: '1.25rem' }}>
                              {a.description}
                            </p>
                            {a.file_url && (
                              <div style={{ borderTop: '1px solid rgba(203, 189, 147, 0.35)', paddingTop: '0.75rem' }}>
                                <a
                                  href={a.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.8rem',
                                    color: '#3E341A',
                                    textDecoration: 'none',
                                    fontWeight: 700
                                  }}
                                >
                                  <Download size={14} /> Download Problem Set Handout
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {groupSubTab === 'announcements' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {groupAnnouncements.length === 0 ? (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: '#574A24',
                        background: 'rgba(250, 232, 180, 0.35)',
                        borderRadius: '12px'
                      }}>
                        No announcements posted to this cohort yet.
                      </div>
                    ) : (
                      groupAnnouncements.map((anno) => (
                        <div key={anno.id} className="glass-card" style={{ padding: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', color: '#3E341A', fontWeight: 700 }}>{anno.title}</h3>
                            <span style={{ fontSize: '0.75rem', color: '#80775C' }}>
                              {new Date(anno.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: '#574A24', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {anno.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ASSIGNMENTS & DEADLINES (With Right-Aligned Compact Calendar)       */}
        {/* ========================================================================= */}
        {activeTab === 'assignments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left Column: Assignments & Missed Deadlines */}
            <div>
              {/* Overdue alert */}
              {overdueAssignments.length > 0 && (
                <div style={{
                  background: 'rgba(87, 74, 36, 0.12)',
                  border: '1.5px solid rgba(87, 74, 36, 0.35)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AlertTriangle size={20} color="#574A24" />
                    <h3 style={{ fontSize: '1.1rem', color: '#3E341A', margin: 0, fontWeight: 800 }}>
                      Urgent: {overdueAssignments.length} Assignment{overdueAssignments.length > 1 ? 's' : ''} Past Deadline!
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#574A24', margin: 0 }}>
                    The following assignments have passed their official due dates. Coordinate with your instructor immediately.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {overdueAssignments.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.85)',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(87, 74, 36, 0.3)'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#3E341A', fontSize: '0.9rem' }}>{a.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#574A24', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> Was Due: {new Date(a.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Assignments */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', color: '#3E341A', fontWeight: 800 }}>Active Course Assignments</h2>
                <p style={{ fontSize: '0.85rem', color: '#574A24' }}>
                  Assignments published to your enrolled cohorts. Submit solutions before the designated deadlines.
                </p>
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#80775C' }}>Loading assignments...</div>
              ) : upcomingAssignments.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#574A24',
                  background: 'rgba(250, 232, 180, 0.45)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(128, 119, 92, 0.35)'
                }}>
                  No upcoming assignments at this time. You are up to date!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {upcomingAssignments.map((a) => (
                    <div key={a.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#3E341A', fontWeight: 700 }}>{a.title}</h3>
                        {a.due_date && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(87, 74, 36, 0.12)',
                            color: '#3E341A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <Clock size={11} /> DUE: {new Date(a.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.88rem', color: '#574A24', lineHeight: 1.5, marginBottom: '1rem' }}>
                        {a.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(203, 189, 147, 0.35)',
                        paddingTop: '0.75rem',
                        marginTop: 'auto'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#80775C' }}>
                          Instructor: {a.teacher?.name || 'Faculty'}
                        </span>

                        {a.file_url && (
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem',
                              color: '#3E341A',
                              textDecoration: 'none',
                              fontWeight: 700
                            }}
                          >
                            <Download size={14} /> Problem Set Handout
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: COMPACT DEADLINES CALENDAR COMPONENT */}
            <div style={{
              background: 'rgba(255, 251, 240, 0.90)',
              border: '1px solid rgba(203, 189, 147, 0.60)',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 4px 20px rgba(87, 74, 36, 0.08)',
              position: 'sticky',
              top: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(203, 189, 147, 0.40)', paddingBottom: '0.75rem' }}>
                <Calendar size={18} color="#574A24" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#3E341A', margin: 0 }}>
                  Academic Deadlines
                </h3>
              </div>

              {/* Month/Week mini grid */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem', textAlign: 'center', fontSize: '0.70rem', fontWeight: 800, color: '#3E341A', marginBottom: '0.4rem' }}>
                  <div>MON</div>
                  <div>TUE</div>
                  <div>WED</div>
                  <div>THU</div>
                  <div>FRI</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                    const hasDeadline = allAssignments.some(a => {
                      if (!a.due_date) return false;
                      const d = new Date(a.due_date);
                      return d.getDay() === idx + 1;
                    });
                    return (
                      <div
                        key={day}
                        style={{
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          background: hasDeadline ? 'linear-gradient(135deg, #574A24, #3E341A)' : 'rgba(203, 189, 147, 0.20)',
                          color: hasDeadline ? '#FAE8B4' : '#3E341A',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          border: hasDeadline ? '1px solid #3E341A' : '1px solid rgba(203, 189, 147, 0.40)'
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Due Items Summary */}
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3E341A', marginBottom: '0.6rem' }}>
                Upcoming Schedule
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {allAssignments.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#80775C', textAlign: 'center', padding: '1rem 0' }}>
                    No assignment deadlines recorded.
                  </div>
                ) : (
                  allAssignments.slice(0, 5).map(a => (
                    <div
                      key={a.id}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(250, 232, 180, 0.45)',
                        border: '1px solid rgba(203, 189, 147, 0.45)'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#3E341A', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#574A24', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} /> {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No deadline'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GRIEVANCES & COMPLAINTS                                           */}
        {/* ========================================================================= */}
        {activeTab === 'complaints' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#3E341A', fontWeight: 800 }}>Grievances & Campus Inquiries</h2>
                <p style={{ fontSize: '0.85rem', color: '#574A24' }}>
                  Submit complaints regarding infrastructure, labs, or coursework. Administrators allocate them to available faculty in real-time.
                </p>
              </div>
              <button
                onClick={() => setShowComplaintModal(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #574A24 0%, #80775C 100%)',
                  color: '#FAE8B4',
                  fontWeight: 700
                }}
              >
                <Plus size={16} />
                <span>Submit Grievance</span>
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#80775C' }}>Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div style={{
                padding: '3.5rem 2rem',
                textAlign: 'center',
                color: '#574A24',
                background: 'rgba(250, 232, 180, 0.45)',
                borderRadius: '12px',
                border: '1px dashed rgba(128, 119, 92, 0.35)'
              }}>
                <AlertCircle size={44} style={{ color: '#574A24', margin: '0 auto 1rem auto', opacity: 0.8 }} />
                <h3 style={{ color: '#3E341A', marginBottom: '0.5rem' }}>No complaints filed</h3>
                <p style={{ fontSize: '0.9rem', color: '#574A24', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                  You have not submitted any complaints yet. Use the button above to report campus or coursework issues.
                </p>
                <button
                  onClick={() => setShowComplaintModal(true)}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #574A24, #80775C)', color: '#FAE8B4' }}
                >
                  <Plus size={16} /> File New Complaint
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject / Details</th>
                      <th>Status</th>
                      <th>Assigned Faculty</th>
                      <th>Filing Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id}>
                        <td style={{ maxWidth: '380px' }}>
                          <div style={{ fontWeight: 700, color: '#3E341A', marginBottom: '0.2rem' }}>
                            {c.title}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#574A24', lineHeight: 1.4 }}>
                            {c.description}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${c.status}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          {c.teacher ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#3E341A' }}>{c.teacher.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#80775C' }}>{c.teacher.email}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#80775C', fontStyle: 'italic' }}>
                              Awaiting faculty allocation
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#574A24' }}>
                          {new Date(c.created_at).toLocaleDateString()}
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
        {/* TAB 4: ACADEMIC MARKS & GRADE CARD                                        */}
        {/* ========================================================================= */}
        {activeTab === 'marks' && (
          <div className="glass-card">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#3E341A', fontWeight: 800 }}>Academic Performance & Grade Card</h2>
              <p style={{ fontSize: '0.85rem', color: '#574A24' }}>
                Official marks uploaded by faculty for examinations and laboratory assignments.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#80775C' }}>Loading grades...</div>
            ) : marks.length === 0 ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#574A24',
                background: 'rgba(250, 232, 180, 0.35)',
                borderRadius: '12px'
              }}>
                No grades published yet for your account.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject / Course</th>
                      <th>Score / Grade</th>
                      <th>Instructor</th>
                      <th>Recorded Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700, color: '#3E341A' }}>{m.subject}</td>
                        <td>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: '#3E341A',
                            background: 'rgba(203, 189, 147, 0.35)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px'
                          }}>
                            {m.score}
                          </span>
                        </td>
                        <td style={{ color: '#574A24' }}>{m.teacher?.name || 'Academic Faculty'}</td>
                        <td style={{ color: '#80775C', fontSize: '0.85rem' }}>
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
        {/* TAB 5: CHAT WITH FACULTY (Search & Filter Teachers by Stream)              */}
        {/* ========================================================================= */}
        {activeTab === 'contact' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '1.25rem' }}>
            {/* Left: Teachers Directory with Stream Filtering */}
            <div className="glass-card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', height: '650px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#3E341A', fontWeight: 800 }}>Faculty Directory</h3>
                <span style={{ fontSize: '0.75rem', color: '#80775C', fontWeight: 600 }}>{teachers.length} Found</span>
              </div>

              {/* Stream filter */}
              <div style={{ marginBottom: '0.6rem' }}>
                <select
                  value={teacherStream}
                  onChange={(e) => setTeacherStream(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                >
                  <option value="">Filter by Stream (All Streams)</option>
                  {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Teacher name search */}
              <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#80775C' }} />
                <input
                  type="text"
                  placeholder="Search faculty name..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchContactData()}
                  className="form-input"
                  style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {teachers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#80775C', fontSize: '0.82rem', padding: '2rem 0' }}>
                    No teachers found matching stream filter.
                  </div>
                ) : (
                  teachers.map((t) => {
                    const isSelected = selectedTeacher?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTeacher(t)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(87, 74, 36, 0.15)' : 'rgba(255, 255, 255, 0.60)',
                          border: isSelected ? '1.5px solid #574A24' : '1px solid rgba(203, 189, 147, 0.40)',
                          transition: 'background 0.2s'
                        }}
                      >
                        <strong style={{ color: '#3E341A', fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>
                          {t.name}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: '#574A24', fontWeight: 600 }}>
                          Stream: {t.stream || t.department || 'Faculty'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#80775C', marginTop: '0.2rem' }}>
                          {t.email}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Active Chat Conversation Thread */}
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '650px' }}>
              {selectedTeacher ? (
                <>
                  {/* Chat Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderBottom: '1px solid rgba(203, 189, 147, 0.45)',
                    paddingBottom: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #574A24, #80775C)',
                      color: '#FAE8B4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}>
                      {selectedTeacher.name[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: '#3E341A', fontWeight: 800, margin: 0 }}>{selectedTeacher.name}</h3>
                      <span style={{ fontSize: '0.78rem', color: '#574A24' }}>
                        {selectedTeacher.stream || selectedTeacher.department} • {selectedTeacher.email}
                      </span>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                    {chatThread.length === 0 ? (
                      <div style={{ margin: 'auto', textAlign: 'center', color: '#80775C', fontSize: '0.88rem' }}>
                        No previous messages with {selectedTeacher.name}. Type your question or consultation request below!
                      </div>
                    ) : (
                      chatThread.map((msg) => {
                        const isStudent = msg.sender_role === 'student';
                        return (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: isStudent ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isStudent ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <div style={{
                              background: isStudent ? 'linear-gradient(135deg, #574A24, #3E341A)' : 'rgba(255, 255, 255, 0.90)',
                              color: isStudent ? '#FAE8B4' : '#3E341A',
                              padding: '0.7rem 1rem',
                              borderRadius: isStudent ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              fontSize: '0.88rem',
                              lineHeight: 1.45,
                              boxShadow: '0 2px 8px rgba(87, 74, 36, 0.08)',
                              border: isStudent ? 'none' : '1px solid rgba(203, 189, 147, 0.45)'
                            }}>
                              {msg.message}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#80775C', marginTop: '0.2rem', padding: '0 0.25rem' }}>
                              {isStudent ? 'You' : selectedTeacher.name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Message Input */}
                  <form onSubmit={handleSendMessage} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder={`Send a message to ${selectedTeacher.name}...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="form-input"
                      style={{ flex: 1, height: '44px' }}
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !messageText.trim()}
                      className="btn btn-primary"
                      style={{
                        height: '44px', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.25rem',
                        background: 'linear-gradient(135deg, #574A24, #80775C)',
                        color: '#FAE8B4',
                        fontWeight: 700
                      }}
                    >
                      <Send size={15} />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#80775C' }}>
                  <MessageSquare size={44} style={{ color: '#80775C', margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  <h4 style={{ color: '#3E341A', marginBottom: '0.35rem', fontWeight: 700 }}>Select a professor to consult</h4>
                  <p style={{ fontSize: '0.85rem', color: '#574A24' }}>Choose an instructor from the faculty directory to review messages or inquire.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT COMPLAINT                                                   */}
      {/* ========================================================================= */}
      {showComplaintModal && (
        <div className="modal-overlay" onClick={() => setShowComplaintModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(255, 251, 240, 0.96)', border: '1px solid rgba(203, 189, 147, 0.60)' }}>
            <div className="modal-header">
              <h3 style={{ color: '#3E341A', fontWeight: 800 }}>Submit Academic / Campus Grievance</h3>
              <button onClick={() => setShowComplaintModal(false)} style={{ background: 'none', border: 'none', color: '#80775C', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateComplaint}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" style={{ color: '#3E341A', fontWeight: 700 }}>Complaint Title / Subject</label>
                  <input
                    type="text"
                    required
                    value={complaintTitle}
                    onChange={(e) => setComplaintTitle(e.target.value)}
                    placeholder="e.g. Broken hardware in Computer Science Lab 4"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#3E341A', fontWeight: 700 }}>Detailed Description</label>
                  <textarea
                    required
                    rows={4}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder="Provide full context, affected equipment, or specific circumstances..."
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowComplaintModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #574A24, #80775C)', color: '#FAE8B4', fontWeight: 700 }}
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
