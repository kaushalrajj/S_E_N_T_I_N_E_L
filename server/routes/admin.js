import express from 'express';
import { db } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { broadcastEvent } from '../config/realtime.js';

const router = express.Router();

// Guard all admin routes
router.use(verifyToken, requireRole('admin'));

// 1. Get statistics for Admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.admin.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats: ' + error.message });
  }
});

// 2. Get list of teachers (optionally filtered by stream)
router.get('/teachers', async (req, res) => {
  try {
    const { stream, search } = req.query;
    const teachers = await db.users.getTeachers({ stream, search });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers: ' + error.message });
  }
});

// 2b. Get list of teachers available at a specific time slot
// Query: ?day=Monday&hour=9&stream=Computer+Science
router.get('/teachers/available', async (req, res) => {
  try {
    const { day, hour, stream } = req.query;
    const teachers = await db.users.getTeachersAvailable({ day, hour, stream });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available teachers: ' + error.message });
  }
});

// 3. View complaints with status filter (pending / assigned / resolved) and stream filter
router.get('/complaints', async (req, res) => {
  try {
    const { status, stream } = req.query;
    const complaints = await db.complaints.getAll({ status, stream });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints: ' + error.message });
  }
});

// 4. Assign complaint to teacher
router.patch('/complaints/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacher_id } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ error: 'teacher_id is required' });
    }

    const updated = await db.complaints.assign(id, teacher_id);
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Broadcast realtime update
    broadcastEvent('complaints', 'UPDATE', updated);

    res.json({
      message: 'Complaint successfully assigned to teacher',
      complaint: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign complaint: ' + error.message });
  }
});

// 5. Update complaint status (pending / assigned / resolved)
router.patch('/complaints/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'assigned', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await db.complaints.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Broadcast realtime update
    broadcastEvent('complaints', 'UPDATE', updated);

    res.json({
      message: `Complaint status updated to ${status}`,
      complaint: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update complaint status: ' + error.message });
  }
});

export default router;
