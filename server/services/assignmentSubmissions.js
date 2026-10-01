import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { db } from '../config/db.js';
import cloudinary, { uploadBufferToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { MAX_SUBMISSION_BYTES, assertDeadlineOpen, validateSubmissionPdf, submissionMetadata, submissionError, submissionFailure } from './assignmentRules.js';

const receivePdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SUBMISSION_BYTES, files: 1, fields: 0 },
}).single('file');

export function receiveSubmissionPdf(req, res, next) {
  receivePdf(req, res, error => {
    if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE'
      ? 'PDF must be 4 MB or less.' : 'Upload exactly one PDF in the file field.' });
    next();
  });
}

export function validateAssignmentId(req, res, next) {
  const ids = [req.params.id, req.params.studentId].filter(Boolean);
  if (ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    return res.status(400).json({ error: 'Invalid assignment or student ID.' });
  }
  next();
}

async function studentAssignment(assignmentId, studentId) {
  const assignment = await db.assignments.getById(assignmentId);
  if (!assignment) throw submissionError(404, 'Assignment not found.');
  if (assignment.group_id && !await db.groups.isMember(assignment.group_id, studentId)) {
    throw submissionError(403, 'You are not a member of this group.');
  }
  return assignment;
}

async function teacherAssignment(assignmentId, teacherId) {
  const assignment = await db.assignments.getById(assignmentId);
  if (!assignment) throw submissionError(404, 'Assignment not found.');
  if (assignment.teacher_id !== teacherId) throw submissionError(403, 'You can only view submissions for your own assignments.');
  return assignment;
}

export async function attachStudentSubmissions(assignments, studentId) {
  const submissions = await db.assignmentSubmissions.getForStudent(studentId, assignments.map(a => a.id));
  const byAssignment = new Map(submissions.map(s => [s.assignment_id, submissionMetadata(s)]));
  return assignments.map(a => ({ ...a, submission: byAssignment.get(a.id) || null }));
}

export async function checkSubmissionAllowed(req, res, next) {
  try {
    const assignment = await studentAssignment(req.params.id, req.user.id);
    if (await db.assignmentSubmissions.getOne(assignment.id, req.user.id)) {
      throw submissionError(409, 'Already submitted. A submission cannot be replaced.');
    }
    assertDeadlineOpen(assignment);
    if (!isCloudinaryConfigured) throw submissionError(503, 'PDF storage is not configured. Ask the project owner to configure Cloudinary on the server.');
    next();
  } catch (error) { submissionFailure(res, error); }
}

export async function submitAssignment(req, res) {
  let uploaded;
  let saved = false;
  try {
    validateSubmissionPdf(req.file);
    // Recheck after receiving the file, before spending time on cloud upload.
    const assignment = await studentAssignment(req.params.id, req.user.id);
    assertDeadlineOpen(assignment);
    uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'campus_portal/submissions',
      public_id: `${randomUUID()}.pdf`,
      resource_type: 'raw',
      type: 'authenticated',
      overwrite: false,
    });
    const submission = await db.assignmentSubmissions.create({
      assignment_id: assignment.id,
      student_id: req.user.id,
      file_name: req.file.originalname.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255),
      file_size: req.file.size,
      storage_public_id: uploaded.public_id,
    });
    saved = true;
    // No public SSE broadcast: student details and files stay behind authenticated routes.
    res.status(201).json({ message: 'Assignment submitted successfully.', submission: submissionMetadata(submission) });
  } catch (error) {
    if (uploaded && !saved) {
      // An insert may commit even if its response is lost. Never delete a saved PDF.
      try {
        const existing = await db.assignmentSubmissions.getOne(req.params.id, req.user.id);
        if (existing?.storage_public_id === uploaded.public_id) {
          return res.status(201).json({ message: 'Assignment submitted successfully.', submission: submissionMetadata(existing) });
        }
      } catch {
        return submissionFailure(res, error);
      }
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'raw', type: 'authenticated' });
      } catch { console.error('Could not clean up an unaccepted submission upload.'); }
    }
    submissionFailure(res, error);
  }
}

export async function listAssignmentSubmissions(req, res) {
  try {
    const assignment = await teacherAssignment(req.params.id, req.user.id);
    const records = await db.assignmentSubmissions.getByAssignment(assignment.id);
    const students = assignment.group_id
      ? (await db.groups.getById(assignment.group_id))?.members || []
      : await db.users.getStudents();
    const byStudent = new Map(records.map(s => [s.student_id, s]));
    const rows = students.map(s => ({
      student: { id: s.id, name: s.name, email: s.email, department: s.department },
      submission: submissionMetadata(byStudent.get(s.id)),
    }));
    // Keep submitted work visible if a student is later removed from the group.
    const included = new Set(students.map(s => s.id));
    for (const record of records) {
      if (!included.has(record.student_id)) rows.push({ student: record.student, submission: submissionMetadata(record) });
    }
    res.set('Cache-Control', 'no-store').json({
      assignment_id: assignment.id,
      submitted_count: records.length,
      pending_count: rows.filter(r => !r.submission).length,
      students: rows,
    });
  } catch (error) { submissionFailure(res, error); }
}

export async function getSubmissionFile(req, res) {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.params.studentId;
    if (req.user.role === 'student') {
      // A student retains access to their own submitted work even after leaving a group.
      if (!await db.assignments.getById(req.params.id)) throw submissionError(404, 'Assignment not found.');
    } else {
      await teacherAssignment(req.params.id, req.user.id);
    }
    const submission = await db.assignmentSubmissions.getOne(req.params.id, studentId);
    if (!submission) throw submissionError(404, 'No submission found.');
    if (!isCloudinaryConfigured) throw submissionError(503, 'PDF storage is not configured.');
    const options = { resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 120 };
    res.set('Cache-Control', 'no-store').json({
      view_url: cloudinary.utils.private_download_url(submission.storage_public_id, undefined, { ...options, attachment: false }),
      download_url: cloudinary.utils.private_download_url(submission.storage_public_id, undefined, { ...options, attachment: true }),
    });
  } catch (error) { submissionFailure(res, error); }
}
