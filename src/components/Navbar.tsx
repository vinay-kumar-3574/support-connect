import { Link, useNavigate } from "@tanstack/react-router";
import { Video, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar({ variant = "public" }: { variant?: "public" | "agent" }) {
  const navigate = useNavigate();
  const agent = useStore((s) => s.auth.agent);
  const logout = useStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Vidline</span>
        </Link>

        {variant === "agent" && agent ? (
          <nav className="flex items-center gap-1">
            <Link to="/dashboard">
              {({ isActive }) => (
                <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              )}
            </Link>
            {agent.isAdmin && (
              <Link to="/admin">
                {({ isActive }) => (
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                )}
              </Link>
            )}
            <div className="mx-3 h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {agent.fullName}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Agent login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90">
                Get started
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
