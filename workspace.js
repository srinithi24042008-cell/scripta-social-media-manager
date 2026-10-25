const Organization = require('../models/Organization');
const { AppError } = require('./errorHandler');

async function workspaceContext(req, res, next) {
  // Read workspace ID from X-Workspace-Id header or query/body or params
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body.workspaceId || req.params.id;

  if (!workspaceId || workspaceId === 'personal') {
    req.workspace = 'personal';
    req.organization = null;
    req.userRole = 'admin';
    req.workspaceFilter = {
      $or: [
        { organizationId: null },
        { organizationId: { $exists: false } }
      ],
      user_id: req.userId
    };
    return next();
  }

  try {
    const org = await Organization.findById(workspaceId);
    if (!org) {
      return next(new AppError('Workspace organization not found', 404));
    }

    const isOwner = org.owner === req.userId;
    const member = org.members.find(m => m.user === req.userId);

    if (!isOwner && !member) {
      return next(new AppError('Access denied: You do not belong to this team workspace', 403));
    }

    let role = 'viewer';
    if (isOwner) {
      role = 'admin';
    } else if (member) {
      role = member.role;
    }

    req.workspace = workspaceId;
    req.organization = org;
    req.userRole = role;
    req.workspaceFilter = {
      organizationId: workspaceId
    };

    next();
  } catch (err) {
    next(err);
  }
}

function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return next(new AppError('Role not determined for this context', 403));
    }
    if (!allowedRoles.includes(req.userRole)) {
      return next(new AppError('Access denied: Insufficient role permissions', 403));
    }
    next();
  };
}

const PERMISSIONS = {
  create_post: ['admin', 'editor'],
  edit_post: ['admin', 'editor'],
  delete_post: ['admin'],
  publish_post: ['admin'],
  approve_post: ['admin'],
  schedule_post: ['admin', 'editor'],
  manage_members: ['admin'],
  connect_social: ['admin'],
  disconnect_social: ['admin'],
  manage_settings: ['admin'],
  view_analytics: ['admin', 'editor', 'viewer'],
  view_posts: ['admin', 'editor', 'viewer'],
  upload_media: ['admin', 'editor'],
};

function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.userRole) {
      return next(new AppError('Role not determined for this context', 403));
    }
    const allowedRoles = PERMISSIONS[permission] || ['admin'];
    if (!allowedRoles.includes(req.userRole)) {
      return next(new AppError('Access denied: You do not have permission to perform this action', 403));
    }
    next();
  };
}

module.exports = { workspaceContext, checkRole, checkPermission };
