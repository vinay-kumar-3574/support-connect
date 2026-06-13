import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";

export function AgentGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const token = useStore((s) => s.auth.token);

  useEffect(() => {
    if (!token) navigate({ to: "/login" });
  }, [token, navigate]);

  if (!token) return null;
  return <>{children}</>;
}
