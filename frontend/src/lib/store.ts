import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from './api';

export type Role = 'agent' | 'customer';

export interface Agent {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: string;
  role?: Role;
  text: string;
  timestamp: number;
}

export interface Participant {
  name: string;
  role: Role;
  joinedAt: number;
  leftAt?: number;
}

export interface Session {
  id: string;
  inviteToken: string;
  agentId: string;
  agentName: string;
  createdAt: number;
  endedAt?: number;
  status: 'active' | 'ended';
  participants: Participant[];
  recording?: boolean;
  recordingReady?: boolean;
}

interface AuthState {
  token: string | null;
  agent: Agent | null;
}

interface StoreState {
  auth: AuthState;
  sessions: Session[];
  adminSessions: Session[];
  messages: ChatMessage[];
  
  // Auth
  register: (data: any) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;

  // Sessions
  fetchSessions: () => Promise<void>;
  fetchAllSessions: () => Promise<void>;
  createSession: () => Promise<Session | null>;
  endSession: (sessionId: string) => Promise<void>;
  
  // Socket Handlers
  receiveMessage: (payload: any) => void;
  markSessionEnded: (sessionId: string) => void;
  
  // Chat
  sendMessage: (sessionId: string, sender: string, role: Role, text: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      auth: { token: null, agent: null },
      sessions: [],
      adminSessions: [],
      messages: [],

      register: async ({ fullName, email, password }) => {
        try {
          const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: fullName, email, password }),
          });
          if (data.token) {
            set({
              auth: { token: data.token, agent: { id: data.user.id, fullName: data.user.name, email: data.user.email, role: data.user.role } },
            });
          }
          return { ok: true };
        } catch (error: any) {
          return { ok: false, error: error.message };
        }
      },

      login: async (email, password) => {
        try {
          const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          set({
            auth: { token: data.token, agent: { id: data.user.id, fullName: data.user.name, email: data.user.email, role: data.user.role } },
          });
          return { ok: true };
        } catch (error: any) {
          return { ok: false, error: error.message };
        }
      },

      logout: () => set({ auth: { token: null, agent: null }, sessions: [], adminSessions: [] }),

      fetchSessions: async () => {
        if (!get().auth.token) return;
        try {
          const data = await apiRequest('/session');
          // Map backend format to frontend format
          const formattedSessions: Session[] = data.map((s: any) => ({
            id: s.id,
            inviteToken: s.invite_token,
            agentId: s.created_by,
            agentName: 'Agent', // Could be populated from elsewhere
            createdAt: new Date(s.started_at).getTime(),
            endedAt: s.ended_at ? new Date(s.ended_at).getTime() : undefined,
            status: s.status,
            participants: s.participants ? s.participants.map((p: any) => ({
              name: p.name,
              role: p.role,
              joinedAt: new Date(p.joined_at).getTime(),
              leftAt: p.left_at ? new Date(p.left_at).getTime() : undefined,
            })) : []
          }));
          set({ sessions: formattedSessions });
        } catch (err) {
          console.error('Failed to fetch sessions', err);
        }
      },

      fetchAllSessions: async () => {
        if (!get().auth.token) return;
        try {
          const data = await apiRequest('/session/all');
          const formattedSessions: Session[] = data.map((s: any) => ({
            id: s.id,
            inviteToken: s.invite_token,
            agentId: s.created_by,
            agentName: 'Agent', // Replace with real agent name later if needed
            createdAt: new Date(s.started_at).getTime(),
            endedAt: s.ended_at ? new Date(s.ended_at).getTime() : undefined,
            status: s.status,
            participants: s.participants ? s.participants.map((p: any) => ({
              name: p.name,
              role: p.role,
              joinedAt: new Date(p.joined_at).getTime(),
              leftAt: p.left_at ? new Date(p.left_at).getTime() : undefined,
            })) : []
          }));
          set({ adminSessions: formattedSessions });
        } catch (err) {
          console.error('Failed to fetch all sessions', err);
        }
      },

      createSession: async () => {
        try {
          const data = await apiRequest('/session/create', { method: 'POST' });
          const newSession: Session = {
            id: data.id,
            inviteToken: data.invite_token,
            agentId: get().auth.agent?.id || '',
            agentName: get().auth.agent?.fullName || 'Agent',
            createdAt: Date.now(),
            status: 'active',
            participants: []
          };
          set((state) => ({ sessions: [newSession, ...state.sessions] }));
          return newSession;
        } catch (err) {
          console.error('Failed to create session', err);
          return null;
        }
      },

      endSession: async (sessionId) => {
        try {
          await apiRequest(`/session/${sessionId}/end`, { method: 'PATCH' });
          get().markSessionEnded(sessionId);
        } catch (err) {
          console.error('Failed to end session', err);
        }
      },

      receiveMessage: (payload) => {
        const { senderName, content, sent_at, sessionId } = payload;
        const msg: ChatMessage = {
          id: Math.random().toString(),
          sessionId,
          sender: senderName,
          text: content,
          timestamp: new Date(sent_at).getTime(),
        };
        set((s) => ({ messages: [...s.messages, msg] }));
      },

      markSessionEnded: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, status: 'ended', endedAt: Date.now() } : sess
          ),
        }));
      },

      sendMessage: (sessionId, sender, role, text) => {
        // Optimistically add to UI, socket will broadcast to others
        const msg: ChatMessage = {
          id: Math.random().toString(),
          sessionId,
          sender,
          role,
          text,
          timestamp: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, msg] }));
        
        // Let the socket.ts handle emission, store doesn't need to do it if component triggers it,
        // but component calls store.sendMessage right now. So we must emit here.
        import('./socket').then(({ socketService }) => {
          socketService.sendMessage(sessionId, sender, text);
        });
      },
    }),
    {
      name: 'vidline-store',
      version: 3,
      partialize: (state) => ({ auth: state.auth }), // Only persist auth
    }
  )
);

export const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
};
