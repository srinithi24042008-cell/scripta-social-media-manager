const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext, checkRole } = require('../middleware/workspace');
const { createNotification } = require('../services/notificationService');

const router = express.Router();
router.use(requireAuth);

const generateUniqueInviteCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await Organization.findOne({ inviteCode: code });
    if (!existing) return code;
  }
};

// GET /api/organizations - List organizations current user is in
router.get('/', async (req, res) => {
  try {
    const orgs = await Organization.find({
      $or: [
        { owner: req.userId },
        { 'members.user': req.userId }
      ]
    }).lean();

    const resolvedOrgs = orgs.map(org => {
      let role = 'viewer';
      if (org.owner === req.userId) {
        role = 'admin';
      } else {
        const memberInfo = org.members.find(m => m.user === req.userId);
        if (memberInfo) {
          role = memberInfo.role;
        }
      }
      return {
        ...org,
        role
      };
    });

    res.json({ organizations: resolvedOrgs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations - Create organization (also supports /create for backwards compatibility)
const handleCreateOrg = async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Organization name is required' });
  }

  try {
    const inviteCode = await generateUniqueInviteCode();
    const id = uuidv4();
    const newOrg = await Organization.create({
      _id: id,
      name: name.trim(),
      description: (description || '').trim(),
      owner: req.userId,
      inviteCode,
      members: [{ user: req.userId, role: 'admin', joinedAt: new Date() }],
      createdBy: req.userId
    });

    res.status(201).json({ organization: newOrg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/', handleCreateOrg);
router.post('/create', handleCreateOrg);

// POST /api/organizations/join - Join organization using invite code
router.post('/join', async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const code = inviteCode.trim().toUpperCase();
    const org = await Organization.findOne({ inviteCode: code });
    if (!org) {
      return res.status(404).json({ error: 'Invalid invite code. Organization not found.' });
    }

    const isMember = org.owner === req.userId || org.members.some(m => m.user === req.userId);
    if (isMember) {
      return res.status(400).json({ error: 'You are already a member of this organization' });
    }

    org.members.push({
      user: req.userId,
      role: 'viewer', // joined user is viewer by default
      joinedAt: new Date()
    });
    await org.save();

    const userObj = await User.findById(req.userId).lean();
    const userName = userObj ? userObj.name : 'A user';
    
    // Notify the user who joined
    await createNotification(
      req.userId,
      'info',
      `${userName} was added as viewer in ${org.name}`,
      null,
      org._id
    );

    // Notify the workspace owner
    if (org.owner !== req.userId) {
      await createNotification(
        org.owner,
        'info',
        `${userName} was added as viewer in ${org.name}`,
        null,
        org._id
      );
    }

    res.json({ organization: org });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id - Get specific organization
router.get('/:id', workspaceContext, async (req, res) => {
  res.json(req.organization);
});

// GET /api/organizations/:id/members - List members
router.get('/:id/members', workspaceContext, async (req, res) => {
  try {
    const org = req.organization;
    const userIds = [org.owner, ...org.members.map(m => m.user)];
    const users = await User.find({ _id: { $in: userIds } }, 'email name').lean();
    const userMap = users.reduce((acc, u) => {
      acc[u._id] = u;
      return acc;
    }, {});

    const membersList = org.members.map(m => {
      const u = userMap[m.user] || { _id: m.user, email: '', name: '' };
      return {
        userId: u._id,
        name: u.name || 'Member',
        email: u.email || '',
        role: m.role,
        joinedAt: m.joinedAt
      };
    });

    // Ensure owner is listed (represented as admin if not already present in members)
    const isOwnerInMembers = membersList.some(m => m.userId === org.owner);
    if (!isOwnerInMembers) {
      const ownerUser = userMap[org.owner] || { _id: org.owner, email: '', name: '' };
      membersList.unshift({
        userId: ownerUser._id,
        name: ownerUser.name || 'Member',
        email: ownerUser.email || '',
        role: 'admin',
        joinedAt: org.createdAt
      });
    }

    res.json({ members: membersList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/organizations/:id/members/:userId - Change member role
router.put('/:id/members/:userId', workspaceContext, checkRole(['admin']), async (req, res) => {
  const { role } = req.body;
  const targetUserId = req.params.userId;

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const org = req.organization;
  if (targetUserId === org.owner) {
    return res.status(400).json({ error: 'Cannot change role of the organization owner' });
  }

  try {
    const member = org.members.find(m => m.user === targetUserId);
    if (!member) {
      return res.status(404).json({ error: 'User is not a member of this organization' });
    }

    member.role = role;
    await org.save();

    const targetUserObj = await User.findById(targetUserId).lean();
    const targetUserName = targetUserObj ? targetUserObj.name : 'A user';

    // Notify the user about their role update
    await createNotification(
      targetUserId,
      'info',
      `${targetUserName} was added as ${role} in ${org.name}`,
      null,
      org._id
    );

    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizations/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', workspaceContext, checkRole(['admin']), async (req, res) => {
  const targetUserId = req.params.userId;
  const org = req.organization;

  if (targetUserId === org.owner) {
    return res.status(400).json({ error: 'Cannot remove the organization owner' });
  }

  try {
    const initialLen = org.members.length;
    org.members = org.members.filter(m => m.user !== targetUserId);
    if (org.members.length === initialLen) {
      return res.status(404).json({ error: 'User is not a member of this organization' });
    }

    await org.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations/:id/invite/regenerate - Regenerate invite code
router.post('/:id/invite/regenerate', workspaceContext, checkRole(['admin']), async (req, res) => {
  try {
    const org = req.organization;
    const newCode = await generateUniqueInviteCode();
    org.inviteCode = newCode;
    await org.save();
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations/:id/leave - Leave organization
router.post('/:id/leave', workspaceContext, async (req, res) => {
  const org = req.organization;
  if (req.userId === org.owner) {
    return res.status(400).json({ error: 'Owner cannot leave the organization. Transfer ownership or delete it.' });
  }

  try {
    org.members = org.members.filter(m => m.user !== req.userId);
    await org.save();

    const userObj = await User.findById(req.userId).lean();
    const userName = userObj ? userObj.name : 'A user';

    // Notify the workspace owner
    if (org.owner !== req.userId) {
      await createNotification(
        org.owner,
        'info',
        `${userName} left the team`,
        null,
        org._id
      );
    }

    // Notify other members of the team
    for (const member of org.members) {
      if (member.user !== req.userId) {
        await createNotification(
          member.user,
          'info',
          `${userName} left the team`,
          null,
          org._id
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', workspaceContext, checkRole(['admin']), async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  try {
    // Delete the organization
    await Organization.deleteOne({ _id: org._id });

    // Cascading delete for other models referencing this organization
    const Post = require('../models/Post');
    const SocialAccount = require('../models/SocialAccount');
    const BrandProfile = require('../models/BrandProfile');
    const Campaign = require('../models/Campaign');
    const Analytics = require('../models/Analytics');
    const Notification = require('../models/Notification');

    await Promise.all([
      Post.deleteMany({ organizationId: org._id }),
      SocialAccount.deleteMany({ organizationId: org._id }),
      BrandProfile.deleteMany({ organizationId: org._id }),
      Campaign.deleteMany({ organizationId: org._id }),
      Analytics.deleteMany({ organizationId: org._id }),
      Notification.deleteMany({ organizationId: org._id })
    ]);

    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
