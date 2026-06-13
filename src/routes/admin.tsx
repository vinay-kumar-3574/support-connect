import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Users, X, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgentGuard } from "@/components/AgentGuard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore, formatDuration } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Vidline" }] }),
  component: () => (
    <AgentGuard>
      <Admin />
    </AgentGuard>
  ),
});

function Admin() {
  const sessions = useStore((s) => s.sessions);
  const endSession = useStore((s) => s.endSession);

  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 3000);
    return () => clearInterval(i);
  }, []);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const active = sessions.filter((s) => s.status === "active");

  const metrics = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 86400_000;
    const today = sessions.filter((s) => s.createdAt >= startOfDay.getTime());
    const week = sessions.filter((s) => s.createdAt >= weekAgo);
    const ended = sessions.filter((s) => s.endedAt);
    const avg = ended.length === 0 ? 0 : ended.reduce((a, s) => a + (s.endedAt! - s.createdAt), 0) / ended.length;
    return { activeNow: active.length, today: today.length, week: week.length, avg };
  }, [sessions, active]);

  const filteredHistory = useMemo(() => {
    return sessions.filter((s) => {
      if (query) {
        const q = query.toLowerCase();
        const inId = s.id.toLowerCase().includes(q);
        const inP = s.participants.some((p) => p.name.toLowerCase().includes(q));
        if (!inId && !inP) return false;
      }
      if (from && s.createdAt < new Date(from).getTime()) return false;
      if (to && s.createdAt > new Date(to).getTime() + 86399_000) return false;
      return true;
    });
  }, [sessions, query, from, to]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="agent" />
      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold">Admin overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Live activity and history across all agents.</p>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          <Metric icon={Activity} label="Active now" value={String(metrics.activeNow)} accent />
          <Metric icon={Users} label="Today" value={String(metrics.today)} />
          <Metric icon={Users} label="This week" value={String(metrics.week)} />
          <Metric icon={Clock} label="Avg duration" value={metrics.avg ? formatDuration(metrics.avg) : "—"} />
        </div>

        {/* Live */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live sessions</h2>
            <Badge variant="secondary" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Auto-refreshing
            </Badge>
          </div>
          <Card className="mt-4 border-border/60">
            {active.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No active sessions right now.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                      <TableCell>{s.agentName}</TableCell>
                      <TableCell className="text-sm">
                        {s.participants.filter((p) => !p.leftAt).map((p) => p.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{formatDuration(Date.now() - s.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => { endSession(s.id); toast.success("Session terminated"); }}>
                          <X className="h-4 w-4" /> End
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>

        {/* History */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Session history</h2>
          <Card className="mt-4 p-4 border-border/60 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by session ID or participant name" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-44" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-44" />
          </Card>

          <Card className="mt-4 border-border/60">
            {filteredHistory.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No sessions match your filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                      <TableCell>{s.agentName}</TableCell>
                      <TableCell className="text-sm">{new Date(s.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{formatDuration((s.endedAt ?? Date.now()) - s.createdAt)}</TableCell>
                      <TableCell>{s.participants.length}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-5 border-border/60 ${accent ? "shadow-glow" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className="text-3xl font-semibold mt-2 tracking-tight">{value}</p>
    </Card>
  );
}
