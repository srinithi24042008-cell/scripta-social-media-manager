/**
 * Show a browser desktop notification using the Notification API.
 * Requests permission automatically if not yet granted. Silently
 * returns false if the API is unsupported or permission is denied.
 *
 * @param {string} title - Notification title
 * @param {object} [options] - Optional Notification options
 * @param {string} [options.body] - Notification body text
 * @param {string} [options.icon] - URL to an icon image
 * @param {string} [options.tag] - Unique tag to group/replace notifications
 * @returns {Promise<boolean>} Whether the notification was shown
 */
export async function showDesktopNotification(title, options = {}) {
  // Not supported
  if (!('Notification' in window)) return false;

  // Already granted → show
  if (Notification.permission === 'granted') {
    const notif = new Notification(title, {
      icon: '/logo.png',
      ...options,
    });
    // Auto-close after 5 seconds
    setTimeout(() => notif.close(), 5000);
    return true;
  }

  // Denied → bail
  if (Notification.permission === 'denied') return false;

  // Default → request permission once, then show
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const notif = new Notification(title, {
        icon: '/logo.png',
        ...options,
      });
      setTimeout(() => notif.close(), 5000);
      return true;
    }
  } catch {
    // Silently fail
  }
  return false;
}
