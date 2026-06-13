import { io, Socket } from 'socket.io-client';
import { useStore } from './store';

let socket: Socket | null = null;

export const socketService = {
  get socket() { return socket; },
  connect: (token?: string | null) => {
    if (socket?.connected) return socket;

    // Connect to the backend
    const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
    socket = io(API_BASE, {
      auth: {
        token: token || undefined
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    // Handle incoming chat messages
    socket.on('chat:message', (payload) => {
      useStore.getState().receiveMessage(payload);
    });

    // Handle participant joining
    socket.on('participant:joined', (payload) => {
      // payload = { userName, role }
      // We don't have the sessionId in the payload directly if they join the room they are in,
      // but usually the active session is known by the store or component.
      // We'll let the component or store handle fetching updated session details, or we can dispatch directly.
      console.log('Participant joined:', payload);
    });

    socket.on('participant:left', (payload) => {
      console.log('Participant left:', payload);
    });

    // Handle session end
    socket.on('session:ended', (payload) => {
      const { session_id } = payload;
      useStore.getState().markSessionEnded(session_id);
    });

    socket.on('recording:status', (payload) => {
      if (payload.sessionId && payload.status) {
        useStore.getState().updateRecordingStatus(payload.sessionId, payload.status);
      }
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinSession: (sessionId: string, userName: string, role: string) => {
    if (socket?.connected) {
      socket.emit('session:join', { sessionId, userName, role });
    }
  },

  sendMessage: (sessionId: string, senderName: string, message: string) => {
    if (socket?.connected) {
      socket.emit('chat:message', { sessionId, senderName, message });
    }
  },

  endSession: (sessionId: string) => {
    if (socket?.connected) {
      socket.emit('session:end', { sessionId });
    }
  }
};
