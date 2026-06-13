import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, type ChatMessage, type Role } from "@/lib/store";
import { socketService } from "@/lib/socket";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";

export const Route = createFileRoute("/room/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Call room — Vidline" }] }),
  component: Room,
});

function Room() {
  const { sessionId } = useParams({ from: "/room/$sessionId" });
  const navigate = useNavigate();

  const authState = useStore((s) => s.auth);
  const agent = authState.agent;
  
  const allMessages = useStore((s) => s.messages);
  const messages = useMemo(
    () => allMessages.filter((m) => m.sessionId === sessionId),
    [allMessages, sessionId],
  );
  
  const sendMessage = useStore((s) => s.sendMessage);
  const markSessionEnded = useStore((s) => s.markSessionEnded);

  const storedName = sessionStorage.getItem(`vidline-name-${sessionId}`);
  const storedRole = sessionStorage.getItem(`vidline-role-${sessionId}`) as Role | null;
  const role: Role = storedRole || (agent ? "agent" : "customer");
  const myName = storedName || agent?.fullName || (agent ? "Agent" : "Guest");

  const [chatOpen, setChatOpen] = useState(true);
  const [draft, setDraft] = useState("");
  
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitHost, setLivekitHost] = useState("");
  const [error, setError] = useState("");

  // 1. Fetch LiveKit Token & Connect Socket
  useEffect(() => {
    let active = true;

    async function initConnection() {
      try {
        // Fetch token from backend
        const data = await apiRequest('/livekit/token', {
          method: 'POST',
          body: JSON.stringify({ sessionId, userName: myName, role }),
        });

        if (active) {
          setLivekitToken(data.token);
          setLivekitHost(data.livekit_host || 'ws://localhost:7880');
          
          // Connect Socket
          socketService.connect(authState.token);
          socketService.joinSession(sessionId, myName, role);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to connect to room');
          toast.error(err.message || 'Failed to connect to room');
        }
      }
    }

    initConnection();

    return () => {
      active = false;
      // We don't disconnect the socket here completely because they might navigate away temporarily
      // But we could emit a leave event if needed. The backend handles disconnect grace periods.
    };
  }, [sessionId, myName, role, authState.token]);

  // 2. Listen to Session Ended in store (from Socket)
  const sessions = useStore(s => s.sessions);
  const session = sessions.find(s => s.id === sessionId);
  useEffect(() => {
    if (session?.status === 'ended') {
      toast.info("Session ended");
      navigate({ to: role === 'agent' ? '/dashboard' : '/session-ended' });
    }
  }, [session?.status, navigate, role]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(sessionId, myName, role, text);
    setDraft("");
  };

  if (error) {
    return <div className="h-screen flex items-center justify-center bg-background text-destructive">{error}</div>;
  }

  if (!livekitToken || !livekitHost) {
    return <div className="h-screen flex items-center justify-center bg-background text-muted-foreground">Connecting to secure room...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hide LiveKit's default Chat button so it doesn't confuse the user */}
        <style>{`
          .lk-button[aria-label="Chat"],
          .lk-chat-toggle {
            display: none !important;
          }
        `}</style>

        {/* LiveKit Video Area */}
        <div className="flex-1 relative bg-black">
          <LiveKitRoom
            video={true}
            audio={true}
            token={livekitToken}
            serverUrl={livekitHost}
            connect={true}
            className="h-full w-full"
            data-lk-theme="default"
            onDisconnected={() => {
              if (role === 'agent') {
                navigate({ to: '/dashboard' });
              } else {
                navigate({ to: '/session-ended' });
              }
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>

          {/* Custom Controls Overlay for Agent */}
          {role === 'agent' && (
            <div className="absolute top-4 left-4 z-50">
              <Button 
                variant="destructive" 
                size="sm" 
                className="shadow-lg font-medium"
                onClick={async () => {
                  await useStore.getState().endSession(sessionId);
                  toast.success("Session ended for everyone");
                  navigate({ to: '/dashboard' });
                }}
              >
                End Session for All
              </Button>
            </div>
          )}

          {/* Toggle Custom Chat Button overlay */}
          {/* We move it to right-20 to avoid colliding with LiveKit's Focus/Zoom button which sits at top-right of tiles */}
          {!chatOpen && (
            <div className="absolute top-4 right-20 z-50">
              <Button variant="secondary" className="rounded-full shadow-lg gap-2 pr-4 pl-3" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-4 w-4" />
                <span>Open Chat</span>
              </Button>
            </div>
          )}
        </div>

        {/* Custom Socket.io Chat sidebar */}
        {chatOpen && (
          <aside className="w-80 border-l border-border/60 bg-card flex flex-col z-40 relative">
            <div className="h-12 px-4 flex items-center justify-between border-b border-border/60">
              <h3 className="font-medium text-sm">Socket.io Chat</h3>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hi!</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => <Message key={m.id} m={m} mine={m.sender === myName} />)}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border/60 flex gap-2">
              <Input
                placeholder="Message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button size="sm" onClick={handleSend}>Send</Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Message({ m, mine }: { m: ChatMessage; mine: boolean }) {
  return (
    <div className={cn("flex flex-col", mine && "items-end")}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium">{m.sender}</span>
        <span className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className={cn(
        "mt-1 px-3 py-2 rounded-2xl text-sm max-w-[85%]",
        mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm",
      )}>
        {m.text}
      </div>
    </div>
  );
}
