import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Video, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Vidline" }, { name: "description", content: "Sign in to your Vidline support agent or admin account." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const [mode, setMode] = useState<"agent" | "admin">("agent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const res = await login(email, password);
    if (!res.ok) return setErr(res.error || "Login failed");
    const agent = useStore.getState().auth.agent;
    // For now, any successful login will take the user to the dashboard 
    // since we use a single 'agent' role in Supabase.
    toast.success("Welcome back");
    if (agent?.role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const switchMode = (m: string) => {
    setMode(m as "agent" | "admin");
    setErr("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md p-8 shadow-card border-border/60">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vidline</span>
        </Link>

        <Tabs value={mode} onValueChange={switchMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="mt-6">
            <h1 className="text-2xl font-semibold">Agent sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Access your support dashboard.</p>
          </TabsContent>
          <TabsContent value="admin" className="mt-6">
            <h1 className="text-2xl font-semibold">Admin sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor activity across all agents.</p>
          </TabsContent>
        </Tabs>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={mode === "admin" ? "admin@vidline.app" : "you@company.com"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90">
            Sign in as {mode === "admin" ? "admin" : "agent"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          {mode === "admin" ? (
            <>Demo admin: <span className="font-mono text-foreground/80">admin@vidline.app</span> / <span className="font-mono text-foreground/80">admin1234</span></>
          ) : (
            <>Demo agent: <span className="font-mono text-foreground/80">demo@vidline.app</span> / <span className="font-mono text-foreground/80">demo1234</span></>
          )}
        </p>
      </Card>
    </div>
  );
}
