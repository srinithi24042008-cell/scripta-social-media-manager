import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

/**
 * Custom hook that connects to the backend Socket.IO server with
 * the current JWT auth token. Automatically reconnects on token changes.
 *
 * @returns {{ socket: import('socket.io-client').Socket | null, connected: boolean }}
 */
export default function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('scripta_token');
    if (!token) {
      setConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Don't reconnect if the token hasn't changed and we already have a socket
    if (socketRef.current && tokenRef.current === token) return;

    tokenRef.current = token;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  return { socket: socketRef.current, connected };
}
