import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";

export function AgentGuard({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const navigate = useNavigate();
  const token = useStore((s) => s.auth.token);
  const agent = useStore((s) => s.auth.agent);

  useEffect(() => {
    if (!token) navigate({ to: "/login" });
    else if (requireAdmin && !agent?.isAdmin) navigate({ to: "/dashboard" });
  }, [token, agent, requireAdmin, navigate]);

  if (!token) return null;
  if (requireAdmin && !agent?.isAdmin) return null;
  return <>{children}</>;
}
