import express from 'express';
import { db } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { broadcastEvent } from '../config/realtime.js';
import { attachStudentSubmissions, validateAssignmentId, checkSubmissionAllowed, receiveSubmissionPdf, submitAssignment, getSubmissionFile } from '../services/assignmentSubmissions.js';
import { submissionFailure } from '../services/assignmentRules.js';

const router = express.Router();

// Guard all student routes
router.use(verifyToken, requireRole('student'));

// -------------------------------------------------------------
// 1. COMPLAINTS
// Create complaint & view complaints with statuses
// -------------------------------------------------------------
router.get('/complaints', async (req, res) => {
  try {
    const complaints = await db.complaints.getByStudent(req.user.id);
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints: ' + error.message });
  }
});



router.post('/complaints', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const complaint = await db.complaints.create({
      student_id: req.user.id,
      title: title.trim(),
      description: description.trim()
    });

    // Broadcast realtime event
    broadcastEvent('complaints', 'INSERT', {
      ...complaint,
      student: { id: req.user.id, name: req.user.name, email: req.user.email, department: req.user.department }
    });

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit complaint: ' + error.message });
  }
});

// -------------------------------------------------------------
// 2. GROUPS
// View groups the student belongs to (read-only, cannot join)
// Search groups by name
// -------------------------------------------------------------
router.get('/groups', async (req, res) => {
  try {
    const { search } = req.query;
    const groups = await db.groups.getByStudent(req.user.id, { search });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups: ' + error.message });
  }
});

// Get group detail — only if student is a member
router.get('/groups/:id', async (req, res) => {
  try {
    const isMember = await db.groups.isMember(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    const group = await db.groups.getById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group details: ' + error.message });
  }
});

// Get assignments for a specific group — only if student is a member
router.get('/groups/:id/assignments', async (req, res) => {
  try {
    const isMember = await db.groups.isMember(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    const assignments = await db.assignments.getByGroup(req.params.id);
    res.set('Cache-Control', 'no-store').json(await attachStudentSubmissions(assignments, req.user.id));
  } catch (error) {
    submissionFailure(res, error);
  }
});

// Get announcements for a specific group — only if student is a member
router.get('/groups/:id/announcements', async (req, res) => {
  try {
    const isMember = await db.groups.isMember(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    const announcements = await db.announcements.getByGroup(req.params.id);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group announcements: ' + error.message });
  }
});

// -------------------------------------------------------------
// 3. ASSIGNMENTS (aggregated from all student's groups)
// View all assignments from groups the student belongs to
// -------------------------------------------------------------
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await db.assignments.getByStudentGroups(req.user.id);
    res.set('Cache-Control', 'no-store').json(await attachStudentSubmissions(assignments, req.user.id));
  } catch (error) {
    submissionFailure(res, error);
  }
});

router.post('/assignments/:id/submission', validateAssignmentId, checkSubmissionAllowed, receiveSubmissionPdf, submitAssignment);
router.get('/assignments/:id/submission/file', validateAssignmentId, getSubmissionFile);

// -------------------------------------------------------------
// 4. MARKS
// View marks obtained by this student
// -------------------------------------------------------------
router.get('/marks', async (req, res) => {
  try {
    const marks = await db.marks.getByStudent(req.user.id);
    res.json(marks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch marks: ' + error.message });
  }
});

// -------------------------------------------------------------
// 5. CONTACT TEACHER / CHAT
// Get list of teachers, send message, view conversation
// -------------------------------------------------------------
router.get('/teachers', async (req, res) => {
  try {
    const { stream, search } = req.query;
    const teachers = await db.users.getTeachers({ stream, search });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers: ' + error.message });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { teacher_id, message } = req.body;

    if (!teacher_id || !message || !message.trim()) {
      return res.status(400).json({ error: 'teacher_id and message are required' });
    }

    const newMsg = await db.messages.create({
      studentId: req.user.id,
      teacherId: teacher_id,
      message: message.trim(),
      senderRole: 'student'
    });

    // Broadcast realtime event
    broadcastEvent('messages', 'INSERT', {
      ...newMsg,
      student: { id: req.user.id, name: req.user.name, email: req.user.email, department: req.user.department }
    });

    res.status(201).json({
      message: 'Message sent to teacher successfully',
      record: newMsg
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message: ' + error.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const messages = await db.messages.getByStudent(req.user.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages: ' + error.message });
  }
});

// Get conversation thread with a specific teacher
router.get('/messages/:teacherId', async (req, res) => {
  try {
    const conversation = await db.messages.getConversation(req.user.id, req.params.teacherId);
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation: ' + error.message });
  }
});

export default router;


