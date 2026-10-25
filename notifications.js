const express = require('express');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);

// GET / — list notifications with optional type filter
router.get('/', async (req, res) => {
  try {
    const filter = { ...req.workspaceFilter };
    if (req.query.type && ['success', 'error', 'info'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    const notifications = await Notification.find(filter)
      .sort({ created_at: -1 })
      .lean();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /unread-count — get count of unread notifications
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ ...req.workspaceFilter, read: false });
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /read — mark all unread as read
router.post('/read', async (req, res) => {
  try {
    await Notification.updateMany({ ...req.workspaceFilter, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE / — clear all notifications for user in active workspace
router.delete('/', async (req, res) => {
  try {
    const result = await Notification.deleteMany(req.workspaceFilter);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/read — mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await Notification.updateOne(
      { _id: req.params.id, ...req.workspaceFilter },
      { read: true }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Notification not found or already read' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete single notification
router.delete('/:id', async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, ...req.workspaceFilter });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
