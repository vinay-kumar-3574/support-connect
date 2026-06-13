import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Circle, MessageSquare, Send, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStore, type ChatMessage, type Role } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/room/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Call room — Vidline" }] }),
  component: Room,
});

function Room() {
  const { sessionId } = useParams({ from: "/room/$sessionId" });
  const navigate = useNavigate();

  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const agent = useStore((s) => s.auth.agent);
  const messages = useStore((s) => s.messages.filter((m) => m.sessionId === sessionId));
  const sendMessage = useStore((s) => s.sendMessage);
  const endSession = useStore((s) => s.endSession);
  const leaveSession = useStore((s) => s.leaveSession);
  const toggleRec = useStore((s) => s.toggleRecording);

  // Determine role/name
  const storedName = sessionStorage.getItem(`vidline-name-${sessionId}`);
  const storedRole = sessionStorage.getItem(`vidline-role-${sessionId}`) as Role | null;
  const role: Role = storedRole ?? (agent ? "agent" : "customer");
  const myName = storedName ?? agent?.fullName ?? "Guest";

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [draft, setDraft] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(() => toast.error("Couldn't access camera/microphone"));
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);

  // Redirect when session ends
  useEffect(() => {
    if (!session) return;
    if (session.status === "ended") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (role === "agent") {
        navigate({ to: "/session/$sessionId", params: { sessionId } });
      } else {
        const duration = (session.endedAt ?? Date.now()) - session.createdAt;
        sessionStorage.setItem("vidline-last-duration", String(duration));
        navigate({ to: "/session-ended" });
      }
    }
  }, [session, role, navigate, sessionId]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const activeParticipants = session.participants.filter((p) => !p.leftAt);
  const remote = activeParticipants.find((p) => p.name !== myName);

  const handleEnd = () => {
    if (role === "agent") {
      endSession(sessionId);
      toast.success("Session ended");
    } else {
      leaveSession(sessionId, myName);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const duration = Date.now() - session.createdAt;
      sessionStorage.setItem("vidline-last-duration", String(duration));
      navigate({ to: "/session-ended" });
    }
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(sessionId, myName, role, text);
    setDraft("");
  };

  return (
    <div className="h-screen flex flex-col bg-[oklch(0.12_0.02_240)] text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">#{session.id}</span>
          {session.recording && (
            <Badge variant="destructive" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Recording
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {activeParticipants.length} in call
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative p-4">
          <VideoTile
            label={remote?.name ?? "Waiting for participant…"}
            placeholder={!remote}
            big
          />
          {/* Local PIP */}
          <div className="absolute bottom-6 right-6 w-48 sm:w-64 aspect-video rounded-xl overflow-hidden border-2 border-border bg-black shadow-card">
            {camOn ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <AvatarPlaceholder name={myName} />
            )}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="rounded bg-black/60 px-2 py-0.5 text-xs text-white">You ({myName})</span>
              {!micOn && (
                <span className="rounded-full bg-destructive p-1 text-destructive-foreground">
                  <MicOff className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <aside className="w-80 border-l border-border/60 bg-card flex flex-col">
            <div className="h-12 px-4 flex items-center justify-between border-b border-border/60">
              <h3 className="font-medium text-sm">Chat</h3>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-4 py-3">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hi!</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => <Message key={m.id} m={m} mine={m.sender === myName} />)}
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border/60 flex gap-2">
              <Input
                placeholder="Message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button size="icon" onClick={handleSend}><Send className="h-4 w-4" /></Button>
            </div>
          </aside>
        )}
      </div>

      {/* Control bar */}
      <div className="h-20 border-t border-border/60 bg-card/80 backdrop-blur flex items-center justify-center gap-2">
        <ControlButton active={micOn} onClick={() => setMicOn(!micOn)} icon={micOn ? Mic : MicOff} danger={!micOn} />
        <ControlButton active={camOn} onClick={() => setCamOn(!camOn)} icon={camOn ? Camera : CameraOff} danger={!camOn} />
        {role === "agent" && (
          <ControlButton
            active={session.recording}
            onClick={() => toggleRec(sessionId)}
            icon={Circle}
            danger={session.recording}
            label={session.recording ? "Stop" : "Record"}
          />
        )}
        <ControlButton active={chatOpen} onClick={() => setChatOpen(!chatOpen)} icon={MessageSquare} />
        <div className="mx-2 h-8 w-px bg-border" />
        <Button size="lg" variant="destructive" onClick={handleEnd} className="rounded-full px-6">
          <PhoneOff className="h-4 w-4" />
          {role === "agent" ? "End for all" : "Leave"}
        </Button>
      </div>
    </div>
  );
}

function ControlButton({
  icon: Icon, active, onClick, danger, label,
}: { icon: any; active: boolean; onClick: () => void; danger?: boolean; label?: string }) {
  return (
    <Button
      size="lg"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "rounded-full h-12 w-12 p-0",
        label && "w-auto px-4",
        danger ? "bg-destructive/15 text-destructive hover:bg-destructive/25" : active ? "bg-secondary" : "bg-secondary",
      )}
    >
      <Icon className="h-5 w-5" />
      {label && <span className="ml-2 text-sm">{label}</span>}
    </Button>
  );
}

function VideoTile({ label, placeholder, big }: { label: string; placeholder?: boolean; big?: boolean }) {
  return (
    <div className={cn("relative w-full h-full rounded-2xl overflow-hidden bg-[oklch(0.18_0.02_240)] border border-border/60")}>
      {placeholder ? (
        <AvatarPlaceholder name={label} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.04_220)] to-[oklch(0.18_0.04_260)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <AvatarPlaceholder name={label} />
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4">
        <span className="rounded-lg bg-black/60 backdrop-blur px-3 py-1.5 text-sm text-white font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-24 w-24 rounded-full bg-gradient-brand flex items-center justify-center text-4xl font-semibold text-primary-foreground shadow-glow">
        {initial}
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
