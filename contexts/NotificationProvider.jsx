import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';
import useSocket from '../hooks/useSocket';

const NotificationContext = createContext({
  addNotification: () => {}
});

export const useRealtimeNotifications = () => useContext(NotificationContext);

function cleanNotificationMessage(message, type) {
  let cleanMsg = message;
  if (type === 'error' && message) {
    let text = message;
    let platform = '';
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
    if (platformLabel && !text.toLowerCase().endsWith(`with ${platformLabel.toLowerCase()}`)) {
      cleanMsg = text.startsWith('Failed:') ? text : `Failed: ${text} with ${platformLabel}`;
    } else if (!text.startsWith('Failed:') && (match || platformLabel)) {
      cleanMsg = `Failed: ${text}`;
    } else {
      cleanMsg = text;
    }
  }
  return cleanMsg;
}

export function RealtimeNotificationProvider({ children }) {
  const showToast = useToast();
  const { socket, connected } = useSocket();
  const prevConnected = useRef(connected);

  const addNotification = useCallback((notification) => {
    const type = notification.type || 'info';
    const cleanMsg = cleanNotificationMessage(notification.message || '', type);
    showToast(cleanMsg, type);
  }, [showToast]);

  // Listen to socket connection status changes
  useEffect(() => {
    if (prevConnected.current !== connected) {
      if (!connected && prevConnected.current !== null) {
        addNotification({
          type: 'error',
          message: 'Server disconnected.',
        });
      }
      prevConnected.current = connected;
    }
  }, [connected, addNotification]);

  // Listen to incoming socket notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data) => {
      addNotification(data);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
