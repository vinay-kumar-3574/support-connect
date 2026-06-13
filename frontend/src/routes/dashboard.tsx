import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Copy, LogIn, X, Clock, Users, Activity } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgentGuard } from "@/components/AgentGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore, formatDuration } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Vidline" }] }),
  component: () => (
    <AgentGuard>
      <Dashboard />
    </AgentGuard>
  ),
});

function Dashboard() {
  const navigate = useNavigate();
  const agent = useStore((s) => s.auth.agent);
  const sessions = useStore((s) => s.sessions);
  const create = useStore((s) => s.createSession);
  const end = useStore((s) => s.endSession);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteId, setInviteId] = useState("");

  const fetchSessions = useStore((s) => s.fetchSessions);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const myActive = sessions.filter((s) => s.agentId === agent?.id && s.status === "active");
  const myPast = sessions.filter((s) => s.agentId === agent?.id && s.status === "ended");

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mine = sessions.filter((s) => s.agentId === agent?.id);
    return {
      total: mine.length,
      today: mine.filter((s) => s.createdAt >= today.getTime()).length,
      callTime: mine.reduce((acc, s) => acc + ((s.endedAt ?? Date.now()) - s.createdAt), 0),
    };
  }, [sessions, agent]);

  const handleCreate = async () => {
    const sess = await create();
    if (!sess) return toast.error("Failed to create session");
    const url = `${window.location.origin}/join/${sess.inviteToken}`;
    setInviteUrl(url);
    setInviteId(sess.id);
    setInviteOpen(true);
    toast.success("Session created");
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="agent" />
      <main className="container mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back, {agent?.fullName.split(" ")[0]}</p>
            <h1 className="text-3xl font-semibold mt-1">Support dashboard</h1>
          </div>
          <Button size="lg" onClick={handleCreate} className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" />
            New session
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mt-8">
          <StatCard icon={Activity} label="Total sessions" value={String(stats.total)} />
          <StatCard icon={Users} label="Sessions today" value={String(stats.today)} />
          <StatCard icon={Clock} label="Total call time" value={formatDuration(stats.callTime)} />
        </div>

        <Tabs defaultValue="active" className="mt-8">
          <TabsList>
            <TabsTrigger value="active">Active <Badge variant="secondary" className="ml-2">{myActive.length}</Badge></TabsTrigger>
            <TabsTrigger value="past">Past <Badge variant="secondary" className="ml-2">{myPast.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {myActive.length === 0 ? (
              <EmptyState title="No active sessions" desc="Create a new session to get a sharable invite link for your customer." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myActive.map((s) => {
                  const duration = formatDuration(Date.now() - s.createdAt);
                  const present = s.participants.filter((p) => !p.leftAt).length;
                  return (
                    <Card key={s.id} className="p-5 border-border/60">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                            <span className="text-xs uppercase tracking-wider text-success font-medium">Live</span>
                          </div>
                          <p className="font-mono text-sm mt-2 text-muted-foreground">#{s.id}</p>
                          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {duration}</span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {present}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => navigate({ to: "/room/$sessionId", params: { sessionId: s.id } })}>
                          <LogIn className="h-4 w-4" />
                          Enter call
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => { await end(s.id); toast.success("Session ended"); }}>
                          <X className="h-4 w-4" />
                          End
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {myPast.length === 0 ? (
              <EmptyState title="No past sessions yet" desc="Completed sessions will show up here with full transcripts." />
            ) : (
              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPast.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{formatDuration((s.endedAt ?? s.createdAt) - s.createdAt)}</TableCell>
                        <TableCell>{s.participants.length}</TableCell>
                        <TableCell className="text-right">
                          <Link to="/session/$sessionId" params={{ sessionId: s.id }}>
                            <Button size="sm" variant="outline">View details</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session ready</DialogTitle>
            <DialogDescription>
              Share this link with your customer. They'll be able to join right from their browser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Input readOnly value={inviteUrl} className="font-mono text-xs" />
            <Button onClick={copyInvite}><Copy className="h-4 w-4" />Copy</Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Close</Button>
            <Button className="flex-1" onClick={() => navigate({ to: "/room/$sessionId", params: { sessionId: inviteId } })}>
              <LogIn className="h-4 w-4" />
              Enter call now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-3xl font-semibold mt-2 tracking-tight">{value}</p>
    </Card>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="p-12 border-border/60 border-dashed text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </Card>
  );
}
