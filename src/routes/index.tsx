import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Video, MessageSquare, Circle, ArrowRight, Sparkles, Users, Headphones, LogIn, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Navbar } from "@/components/Navbar";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vidline — Real-time video support for customer teams" },
      { name: "description", content: "Vidline is a browser-based video support platform. Launch sessions, chat, and record — no installs for your customers." },
      { property: "og:title", content: "Vidline — Video support, in the browser" },
      { property: "og:description", content: "Launch video support sessions with one click. Customers join from any link." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      toast.error("Paste your invite link or token first");
      return;
    }
    // Accept either a full URL containing /join/<token> or a bare token
    const match = trimmed.match(/\/join\/([^/?#]+)/);
    const t = match ? match[1] : trimmed;
    navigate({ to: "/join/$token", params: { token: t } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:pb-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            Browser-based — no installs, ever
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight">
            Video support that <br />
            <span className="text-gradient-brand">just opens a link.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Vidline gives your support team a real-time video room, in-call chat, and
            session recording — all from the browser. Customers join with a single link.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90">
                Agent sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline">Create agent account</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Try the demo: <span className="font-mono text-foreground/80">demo@vidline.app</span> / <span className="font-mono text-foreground/80">demo1234</span>
          </p>
        </div>
      </section>

      {/* Customer join */}
      <section className="container mx-auto px-6 pb-20">
        <Card className="mx-auto max-w-2xl p-8 shadow-card border-border/60">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Got an invite from your support agent?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Paste the invite link or token below and we'll connect you. No account needed.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Paste invite link or token…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
                <Button onClick={handleJoin}>Join call</Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Video, title: "HD video calling", desc: "Crystal-clear video and audio routed through the server for stable, predictable quality." },
            { icon: MessageSquare, title: "In-call chat", desc: "Send links, instructions, and notes alongside the video — never break the conversation." },
            { icon: Circle, title: "Session recording", desc: "Record sessions on demand and download the transcript and recording afterwards." },
          ].map((f) => (
            <Card key={f.title} className="p-6 border-border/60 hover:border-primary/40 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Vidline</span>
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Built for support teams</span>
        </div>
      </footer>
    </div>
  );
}
