import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Video, AlertCircle, Camera, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Join session — Vidline" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = useParams({ from: "/join/$token" });
  const navigate = useNavigate();
  const [session, setSession] = useState<{ id: string, status: string, agent_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/session/join/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSession(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const valid = session && session.status === "active";

  const [name, setName] = useState("");
  const [previewOn, setPreviewOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!valid) return;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPreviewOn(true);
      })
      .catch(() => setPreviewOn(false));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [valid]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session) return;
    sessionStorage.setItem(`vidline-name-${session.id}`, name.trim());
    sessionStorage.setItem(`vidline-role-${session.id}`, "customer");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    
    // Inject a stub session into the global store so the customer can view the details page later
    useStore.setState((s) => ({
      sessions: [
        ...s.sessions.filter(x => x.id !== session.id),
        {
          id: session.id,
          inviteToken: token,
          agentId: '',
          agentName: session.agent_name,
          createdAt: Date.now(),
          status: 'active',
          participants: []
        }
      ]
    }));

    toast.success("Joining call…");
    navigate({ to: "/room/$sessionId", params: { sessionId: session.id } });
  };

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
        <Card className="max-w-md p-8 text-center border-border/60">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Invite link not valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is invalid or the session has ended. Please contact your support
            agent to request a new link.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 py-12">
      <Card className="w-full max-w-xl p-8 border-border/60 shadow-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vidline</span>
        </div>

        <h1 className="text-2xl font-semibold">Ready to join the call</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You're joining a session with <span className="text-foreground font-medium">{session?.agent_name || "an agent"}</span>.
        </p>

        <div className="mt-6 aspect-video rounded-xl bg-black overflow-hidden relative border border-border/60">
          {previewOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Camera className="h-6 w-6" />
              <span className="text-xs">Waiting for camera permission…</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded-full bg-black/60 px-2 py-1 text-xs flex items-center gap-1 text-white"><Camera className="h-3 w-3" /> Camera</span>
            <span className="rounded-full bg-black/60 px-2 py-1 text-xs flex items-center gap-1 text-white"><Mic className="h-3 w-3" /> Mic</span>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Jamie" autoFocus />
          </div>
          <p className="text-xs text-muted-foreground">
            Your browser will ask for camera and microphone permission — please allow it for the call to work.
          </p>
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90" size="lg">
            Join call
          </Button>
        </form>
      </Card>
    </div>
  );
}
