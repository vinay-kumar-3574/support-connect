import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "agent" | "customer";

export interface Agent {
  id: string;
  fullName: string;
  email: string;
  password: string; // mock only
  isAdmin?: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: string;
  role: Role;
  text: string;
  timestamp: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
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
  status: "active" | "ended";
  recording: boolean;
  recordingReady?: boolean;
  participants: Participant[];
}

interface AuthState {
  token: string | null;
  agent: Agent | null;
}

interface StoreState {
  agents: Agent[];
  auth: AuthState;
  sessions: Session[];
  messages: ChatMessage[];
  events: SessionEvent[];

  register: (data: Omit<Agent, "id">) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;

  createSession: () => Session;
  endSession: (sessionId: string) => void;
  joinSession: (sessionId: string, name: string, role: Role) => void;
  leaveSession: (sessionId: string, name: string) => void;
  toggleRecording: (sessionId: string) => void;

  sendMessage: (sessionId: string, sender: string, role: Role, text: string) => void;
  addEvent: (sessionId: string, text: string) => void;

  getSessionByToken: (token: string) => Session | undefined;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const mockToken = (agentId: string) =>
  btoa(JSON.stringify({ sub: agentId, role: "agent", iat: Date.now() }));

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      agents: [
        {
          id: "demo",
          fullName: "Demo Agent",
          email: "demo@vidline.app",
          password: "demo1234",
        },
        {
          id: "admin",
          fullName: "Vidline Admin",
          email: "admin@vidline.app",
          password: "admin1234",
          isAdmin: true,
        },
      ],
      auth: { token: null, agent: null },
      sessions: [],
      messages: [],
      events: [],

      register: ({ fullName, email, password }) => {
        const exists = get().agents.find((a) => a.email === email);
        if (exists) return { ok: false, error: "Email already in use" };
        const agent: Agent = { id: uid(), fullName, email, password };
        set((s) => ({
          agents: [...s.agents, agent],
          auth: { token: mockToken(agent.id), agent },
        }));
        return { ok: true };
      },

      login: (email, password) => {
        const agent = get().agents.find(
          (a) => a.email === email && a.password === password,
        );
        if (!agent) return { ok: false, error: "Invalid email or password" };
        set({ auth: { token: mockToken(agent.id), agent } });
        return { ok: true };
      },

      logout: () => set({ auth: { token: null, agent: null } }),

      createSession: () => {
        const agent = get().auth.agent!;
        const session: Session = {
          id: uid(),
          inviteToken: uid() + uid(),
          agentId: agent.id,
          agentName: agent.fullName,
          createdAt: Date.now(),
          status: "active",
          recording: false,
          participants: [
            { name: agent.fullName, role: "agent", joinedAt: Date.now() },
          ],
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        get().addEvent(session.id, `Session created by ${agent.fullName}`);
        return session;
      },

      endSession: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  status: "ended",
                  endedAt: Date.now(),
                  recording: false,
                  recordingReady: sess.recording ? true : sess.recordingReady,
                  participants: sess.participants.map((p) =>
                    p.leftAt ? p : { ...p, leftAt: Date.now() },
                  ),
                }
              : sess,
          ),
        }));
        get().addEvent(sessionId, "Session ended");
      },

      joinSession: (sessionId, name, role) => {
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            if (sess.participants.find((p) => p.name === name && !p.leftAt)) return sess;
            return {
              ...sess,
              participants: [
                ...sess.participants,
                { name, role, joinedAt: Date.now() },
              ],
            };
          }),
        }));
        get().addEvent(sessionId, `${name} (${role}) joined`);
      },

      leaveSession: (sessionId, name) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  participants: sess.participants.map((p) =>
                    p.name === name && !p.leftAt ? { ...p, leftAt: Date.now() } : p,
                  ),
                }
              : sess,
          ),
        }));
        get().addEvent(sessionId, `${name} left`);
      },

      toggleRecording: (sessionId) => {
        const sess = get().sessions.find((s) => s.id === sessionId);
        if (!sess) return;
        const newVal = !sess.recording;
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? { ...x, recording: newVal, recordingReady: !newVal && (x.recording || x.recordingReady) }
              : x,
          ),
        }));
        get().addEvent(sessionId, newVal ? "Recording started" : "Recording stopped");
      },

      sendMessage: (sessionId, sender, role, text) => {
        const msg: ChatMessage = {
          id: uid(),
          sessionId,
          sender,
          role,
          text,
          timestamp: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, msg] }));
      },

      addEvent: (sessionId, text) => {
        set((s) => ({
          events: [
            ...s.events,
            { id: uid(), sessionId, text, timestamp: Date.now() },
          ],
        }));
      },

      getSessionByToken: (token) =>
        get().sessions.find((s) => s.inviteToken === token),
    }),
    {
      name: "vidline-store",
      version: 2,
      migrate: (persisted: any) => {
        if (persisted && Array.isArray(persisted.agents)) {
          if (!persisted.agents.find((a: Agent) => a.email === "admin@vidline.app")) {
            persisted.agents.push({
              id: "admin",
              fullName: "Vidline Admin",
              email: "admin@vidline.app",
              password: "admin1234",
              isAdmin: true,
            });
          }
        }
        return persisted;
      },
    },
  ),
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
