import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Download, Circle, Clock, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgentGuard } from "@/components/AgentGuard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatDuration } from "@/lib/store";

export const Route = createFileRoute("/session/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Session details — Vidline" }] }),
  component: () => (
    <AgentGuard>
      <SessionDetail />
    </AgentGuard>
  ),
});

function SessionDetail() {
  const { sessionId } = useParams({ from: "/session/$sessionId" });
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const allMessages = useStore((s) => s.messages);
  const allEvents = useStore((s) => s.events);
  const messages = useMemo(
    () => allMessages.filter((m) => m.sessionId === sessionId),
    [allMessages, sessionId],
  );
  const events = useMemo(
    () => allEvents.filter((e) => e.sessionId === sessionId),
    [allEvents, sessionId],
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="agent" />
        <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">Session not found.</div>
      </div>
    );
  }

  const duration = (session.endedAt ?? Date.now()) - session.createdAt;

  const downloadTranscript = () => {
    const rows = ["timestamp,sender,role,message"];
    for (const m of messages) {
      rows.push(`${new Date(m.timestamp).toISOString()},${csv(m.sender)},${m.role},${csv(m.text)}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vidline-${session.id}-transcript.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="agent" />
      <main className="container mx-auto px-6 py-10 max-w-5xl">
        <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Session details</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">#{session.id}</p>
          </div>
          <Badge variant={session.status === "active" ? "default" : "secondary"}>
            {session.status === "active" ? "Active" : "Ended"}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          <MetaCard icon={Clock} label="Duration" value={formatDuration(duration)} />
          <MetaCard icon={Users} label="Participants" value={String(session.participants.length)} />
          <MetaCard icon={Circle} label="Created" value={new Date(session.createdAt).toLocaleString()} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          {/* Participants */}
          <Card className="p-6 border-border/60">
            <h2 className="font-semibold">Participants</h2>
            <ul className="mt-4 space-y-3">
              {session.participants.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">· {p.role}</span></p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(p.joinedAt).toLocaleTimeString()}
                      {p.leftAt && <> · Left {new Date(p.leftAt).toLocaleTimeString()}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Recording */}
          <Card className="p-6 border-border/60">
            <h2 className="font-semibold">Recording</h2>
            {session.recordingReady ? (
              <div className="mt-4">
                <Badge className="bg-success text-success-foreground">Ready</Badge>
                <Button variant="outline" className="w-full mt-3" onClick={() => alert("Demo: recording download would start here.")}>
                  <Download className="h-4 w-4" /> Download recording
                </Button>
              </div>
            ) : session.recording ? (
              <Badge variant="secondary" className="mt-4">Processing…</Badge>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No recording was made for this session.</p>
            )}
          </Card>
        </div>

        {/* Transcript */}
        <Card className="p-6 border-border/60 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Chat transcript</h2>
            <Button variant="outline" size="sm" onClick={downloadTranscript} disabled={messages.length === 0}>
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
          <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages were sent during this session.</p>
            ) : messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</span>{" "}
                <span className="font-medium">{m.sender}:</span>{" "}
                <span>{m.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Event log */}
        <Card className="p-6 border-border/60 mt-6">
          <h2 className="font-semibold">Session event log</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="text-xs text-muted-foreground w-28 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}

function MetaCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="text-xl font-semibold mt-2">{value}</p>
    </Card>
  );
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
