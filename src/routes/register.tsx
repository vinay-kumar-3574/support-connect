import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create agent account — Vidline" }, { name: "description", content: "Create your Vidline support agent account." }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const register = useStore((s) => s.register);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("Enter a valid email");
    if (password.length < 6) return setErr("Password must be at least 6 characters");
    if (password !== confirm) return setErr("Passwords do not match");
    const res = register({ fullName, email, password });
    if (!res.ok) return setErr(res.error || "Registration failed");
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-card border-border/60">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vidline</span>
        </Link>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Start running video support sessions in minutes.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90">Create account</Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have one?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
