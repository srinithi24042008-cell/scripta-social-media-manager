const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');
const { emitToUser } = require('./websocketService');

function cleanNotificationMessage(type, message) {
  if (type !== 'error' || !message) return message;
  
  let text = message;
  let platform = '';

  // Extract platform from "Publishing to <platform> (@handle) failed..." or "<platform> error:"
  const match = text.match(/^Publishing to ([a-zA-Z0-9_-]+)(?:\s*\([^)]+\))?\s*failed(?: permanently)?:\s*(.*)/i);
  if (match) {
    platform = match[1];
    text = match[2];
  } else {
    const match2 = text.match(/^([a-zA-Z0-9_-]+) error:\s*(.*)/i);
    if (match2 && ['instagram', 'facebook', 'linkedin', 'youtube'].includes(match2[1].toLowerCase())) {
      platform = match2[1];
      text = match2[2];
    }
  }

  // Strip common verbose prefixes
  text = text.replace(/^(Publishing to [a-zA-Z0-9_-]+(?: \([^)]+\))? failed(?: permanently)?: )/i, '');
  text = text.replace(/^(Instagram|Facebook|LinkedIn|YouTube) error:\s*/i, '');
  text = text.replace(/^API error:\s*/i, '');
  text = text.replace(/\s*\(code:\s*\d+\)/i, '');

  if (text.toLowerCase().includes('aspect ratio') || text.includes('36003')) {
    text = 'Incorrect aspect ratio';
  } else if (text.toLowerCase().includes('oauth') || text.toLowerCase().includes('token expired') || text.includes('190')) {
    text = 'Reconnect required';
  }

  const platformLabel = platform ? (platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()) : '';
  if (platformLabel) {
    // If text already ends with "with <platformLabel>", don't duplicate
    if (text.toLowerCase().endsWith(`with ${platformLabel.toLowerCase()}`)) {
      return text.startsWith('Failed:') ? text : `Failed: ${text}`;
    }
    return `Failed: ${text} with ${platformLabel}`;
  } else if (text.startsWith('Publishing to ')) {
    // If still matching publishing to without cleanly caught platform
    return text.replace(/^Publishing to ([a-zA-Z0-9_-]+) failed:\s*(.*)/i, (m, p, r) => `Failed: ${r} with ${p.charAt(0).toUpperCase() + p.slice(1)}`);
  }
  
  return text.startsWith('Failed:') ? text : (match ? `Failed: ${text}` : text);
}

async function createNotification(userId, type, message, postId = null, organizationId = null) {
  try {
    const cleanMessage = cleanNotificationMessage(type, message);
    const notification = await Notification.create({
      _id: uuidv4(),
      user_id: userId,
      type,
      message: cleanMessage,
      post_id: postId,
      organizationId,
    });

    // Emit real-time event to the user via WebSocket
    emitToUser(userId, 'notification', {
      _id: notification._id,
      user_id: notification.user_id,
      type: notification.type,
      message: notification.message,
      post_id: notification.post_id,
      organizationId: notification.organizationId,
      read: notification.read,
      created_at: notification.created_at,
    });

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification, cleanNotificationMessage };
