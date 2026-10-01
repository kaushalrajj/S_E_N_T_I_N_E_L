import express from "express";
import multer from "multer";
import { db } from "../config/db.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { broadcastEvent } from "../config/realtime.js";
import {
  uploadBufferToCloudinary,
  isCloudinaryConfigured,
} from "../config/cloudinary.js";
import { validateAssignmentId, listAssignmentSubmissions, getSubmissionFile } from '../services/assignmentSubmissions.js';

const router = express.Router();

// Configure in-memory storage for file uploads (stored directly on Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Guard all teacher routes
router.use(verifyToken, requireRole("teacher"));

function getTeacherId(req) {
  return req.user?.id || req.user?.user_id || req.user?.teacher_id || null;
}

router.get('/assignments/:id/submissions', validateAssignmentId, listAssignmentSubmissions);
router.get('/assignments/:id/submissions/:studentId/file', validateAssignmentId, getSubmissionFile);

async function requireOwnedGroup(req, res, next) {
  try {
    const group = await db.groups.getById(req.params.id || req.body.group_id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.teacher_id !== getTeacherId(req)) return res.status(403).json({ error: 'You can only manage your own groups.' });
    next();
  } catch {
    res.status(500).json({ error: 'Could not check group ownership.' });
  }
}

function validateAssignmentDeadline(req, res, next) {
  const value = req.body.due_date;
  if (value && (!/(Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value)))) {
    return res.status(400).json({ error: 'Provide a valid deadline including its timezone.' });
  }
  next();
}

// -------------------------------------------------------------
// 1. STUDENT MANAGEMENT
// View all students with filters: department and name
// -------------------------------------------------------------
router.get("/students", async (req, res) => {
  try {
    const { stream, department, name, search } = req.query;
    const students = await db.users.getStudents({
      stream: stream || department,
      search: search || name,
    });
    res.json(students);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch students: " + error.message });
  }
});

// -------------------------------------------------------------
// 2. GROUP MANAGEMENT
// View groups, create group, add/remove student to group
// -------------------------------------------------------------
router.get("/groups", async (req, res) => {
  try {
    const groups = await db.groups.getByTeacher(req.user.id);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups: " + error.message });
  }
});

router.post("/groups", async (req, res) => {
  try {
    const { group_name } = req.body;
    if (!group_name || !group_name.trim()) {
      return res.status(400).json({ error: "group_name is required" });
    }

    const newGroup = await db.groups.create(req.user.id, group_name.trim());

    // Broadcast realtime event
    broadcastEvent("groups", "INSERT", {
      ...newGroup,
      teacher: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res
      .status(201)
      .json({ message: "Group created successfully", group: newGroup });
  } catch (error) {
    res.status(500).json({ error: "Failed to create group: " + error.message });
  }
});

router.post("/groups/:id/members/bulk", requireOwnedGroup, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res
        .status(400)
        .json({ error: "student_ids must be a non-empty array" });
    }

    const studentIds = [
      ...new Set(
        student_ids
          .filter(
            (studentId) => typeof studentId === "string" && studentId.trim(),
          )
          .map((studentId) => studentId.trim()),
      ),
    ];
    if (studentIds.length === 0) {
      return res
        .status(400)
        .json({ error: "student_ids must contain valid student IDs" });
    }

    const members = await db.groups.addMembers(groupId, studentIds);
    if (members.length > 0) {
      broadcastEvent("group_members", "INSERT", {
        group_id: groupId,
        student_ids: members.map((member) => member.student_id),
        bulk: true,
      });
    }

    res
      .status(201)
      .json({ message: "Students added to group successfully", members });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add students to group: " + error.message });
  }
});

router.post("/groups/:id/members", requireOwnedGroup, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }

    const member = await db.groups.addMember(groupId, student_id);

    // Broadcast realtime event
    broadcastEvent("group_members", "INSERT", {
      group_id: groupId,
      student_id,
      ...member,
    });

    res
      .status(201)
      .json({ message: "Student added to group successfully", member });
  } catch (error) {
    const msg = error.message || "";
    if (
      msg.includes("duplicate key") ||
      msg.includes("unique constraint") ||
      msg.includes("already")
    ) {
      return res
        .status(400)
        .json({ error: "This student is already enrolled in this cohort." });
    }
    res.status(500).json({ error: "Failed to add student to group: " + msg });
  }
});

router.delete("/groups/:id/members/:student_id", requireOwnedGroup, async (req, res) => {
  try {
    const { id: groupId, student_id } = req.params;
    await db.groups.removeMember(groupId, student_id);

    // Broadcast realtime event
    broadcastEvent("group_members", "DELETE", {
      group_id: groupId,
      student_id,
    });

    res.json({ message: "Student removed from group successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to remove student from group: " + error.message });
  }
});

// -------------------------------------------------------------
// 2b. GROUP ASSIGNMENTS (scoped to a group)
// Create / view assignments for a specific group
// -------------------------------------------------------------
router.get("/groups/:id/assignments", requireOwnedGroup, async (req, res) => {
  try {
    const assignments = await db.assignments.getByGroup(req.params.id);
    res.json(assignments);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch group assignments: " + error.message });
  }
});

router.post(
  "/groups/:id/assignments",
  requireOwnedGroup,
  upload.single("file"),
  validateAssignmentDeadline,
  async (req, res) => {
    try {
      const { title, description, file_url, due_date } = req.body;

      if (!title || !description) {
        return res
          .status(400)
          .json({ error: "Title and description are required" });
      }

      let resolvedFileUrl = file_url;
      if (req.file) {
        if (isCloudinaryConfigured) {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
            folder: "campus_portal/assignments",
            filename: req.file.originalname,
            resource_type: "auto",
          });
          resolvedFileUrl = uploadResult.secure_url;
        } else {
          return res.status(400).json({
            error:
              "Cloudinary credentials are required to upload files. Please configure CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY in server/.env",
          });
        }
      }

      const newAssignment = await db.assignments.create({
        teacherId: getTeacherId(req),
        groupId: req.params.id,
        title: title.trim(),
        description: description.trim(),
        file_url: resolvedFileUrl || null,
        due_date: due_date || null,
      });

      broadcastEvent("assignments", "INSERT", {
        ...newAssignment,
        teacher: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          department: req.user.department,
        },
      });

      res
        .status(201)
        .json({
          message: "Assignment published to group",
          assignment: newAssignment,
        });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to create group assignment: " + error.message });
    }
  },
);

// -------------------------------------------------------------
// 2c. GROUP ANNOUNCEMENTS
// Create / view announcements for a specific group
// -------------------------------------------------------------
router.get("/groups/:id/announcements", async (req, res) => {
  try {
    const announcements = await db.announcements.getByGroup(req.params.id);
    res.json(announcements);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch announcements: " + error.message });
  }
});

router.post("/groups/:id/announcements", async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const newAnnouncement = await db.announcements.create({
      groupId: req.params.id,
      teacherId: req.user.id,
      title: title.trim(),
      message: message.trim(),
    });

    broadcastEvent("announcements", "INSERT", {
      ...newAnnouncement,
      teacher: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res
      .status(201)
      .json({ message: "Announcement posted", announcement: newAnnouncement });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create announcement: " + error.message });
  }
});

// -------------------------------------------------------------
// 3. ASSIGNMENTS (teacher-level view of all their assignments)
// Upload / create assignments (visible on student dashboard)
// -------------------------------------------------------------
router.get("/assignments", async (req, res) => {
  try {
    const assignments = await db.assignments.getByTeacher(req.user.id);
    res.json(assignments);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch assignments: " + error.message });
  }
});

router.post('/assignments', upload.single('file'), validateAssignmentDeadline, (req, res, next) => {
  if (req.body.group_id) return requireOwnedGroup(req, res, next);
  next();
}, async (req, res) => {
  try {
    const { title, description, file_url, group_id, due_date } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    let resolvedFileUrl = file_url;
    if (req.file) {
      if (isCloudinaryConfigured) {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
          folder: "campus_portal/assignments",
          filename: req.file.originalname,
          resource_type: "auto",
        });
        resolvedFileUrl = uploadResult.secure_url;
      } else {
        return res.status(400).json({
          error:
            "Cloudinary credentials are required to upload files. Please configure CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY in server/.env",
        });
      }
    }

    const newAssignment = await db.assignments.create({
      teacherId: getTeacherId(req),
      groupId: group_id || null,
      title: title.trim(),
      description: description.trim(),
      file_url: resolvedFileUrl || null,
      due_date: due_date || null,
    });

    // Broadcast realtime event
    broadcastEvent("assignments", "INSERT", {
      ...newAssignment,
      teacher: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        department: req.user.department,
      },
    });

    res
      .status(201)
      .json({
        message: "Assignment published successfully",
        assignment: newAssignment,
      });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create assignment: " + error.message });
  }
});

// -------------------------------------------------------------
// 4. MARKS MANAGEMENT
// Add / update student marks
// -------------------------------------------------------------
router.get("/marks", async (req, res) => {
  try {
    const marks = await db.marks.getByTeacher(req.user.id);
    res.json(marks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch marks: " + error.message });
  }
});

router.post("/marks", async (req, res) => {
  try {
    const { student_id, subject, marks } = req.body;

    if (!student_id || !subject || marks === undefined || marks === "") {
      return res
        .status(400)
        .json({ error: "student_id, subject, and marks are required" });
    }

    const numMarks = parseFloat(marks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
      return res
        .status(400)
        .json({ error: "Marks must be a valid number between 0 and 100" });
    }

    const result = await db.marks.upsert({
      studentId: student_id,
      teacherId: req.user.id,
      subject: subject.trim(),
      marks: numMarks,
    });

    // Broadcast realtime event
    broadcastEvent("marks", "UPDATE", result);

    res.json({ message: "Marks updated successfully", record: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update marks: " + error.message });
  }
});

// -------------------------------------------------------------
// 5. MESSAGES (Bidirectional chat)
// View messages sent by students AND send replies
// -------------------------------------------------------------
router.get("/messages", async (req, res) => {
  try {
    const messages = await db.messages.getByTeacher(req.user.id);
    res.json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch messages: " + error.message });
  }
});

// Get conversation thread with a specific student
router.get("/messages/:studentId", async (req, res) => {
  try {
    const conversation = await db.messages.getConversation(
      req.params.studentId,
      req.user.id,
    );
    res.json(conversation);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch conversation: " + error.message });
  }
});

// Teacher sends a reply to a student
router.post("/messages", async (req, res) => {
  try {
    const { student_id, message } = req.body;

    if (!student_id || !message || !message.trim()) {
      return res
        .status(400)
        .json({ error: "student_id and message are required" });
    }

    const newMsg = await db.messages.create({
      studentId: student_id,
      teacherId: req.user.id,
      message: message.trim(),
      senderRole: "teacher",
    });

    broadcastEvent("messages", "INSERT", {
      ...newMsg,
      teacher: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        department: req.user.department,
      },
    });

    res.status(201).json({ message: "Reply sent to student", record: newMsg });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message: " + error.message });
  }
});

// -------------------------------------------------------------
// 6. ADMIN TASKS
// View complaints assigned to this teacher by admin
// Toggle task completion status
// -------------------------------------------------------------
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await db.complaints.getByTeacher(req.user.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks: " + error.message });
  }
});

router.patch("/tasks/:id/toggle", async (req, res) => {
  try {
    const updated = await db.complaints.toggleStatus(
      req.params.id,
      req.user.id,
    );
    if (!updated) {
      return res
        .status(404)
        .json({ error: "Task not found or not assigned to you" });
    }

    broadcastEvent("complaints", "UPDATE", updated);

    res.json({
      message: `Task marked as ${updated.status}`,
      task: updated,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to toggle task status: " + error.message });
  }
});

export default router;
