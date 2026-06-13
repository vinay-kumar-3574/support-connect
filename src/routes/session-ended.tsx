import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/store";

export const Route = createFileRoute("/session-ended")({
  head: () => ({ meta: [{ title: "Session ended — Vidline" }] }),
  component: SessionEnded,
});

function SessionEnded() {
  const raw = typeof window !== "undefined" ? sessionStorage.getItem("vidline-last-duration") : null;
  const duration = raw ? formatDuration(Number(raw)) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <Card className="max-w-md w-full p-10 text-center border-border/60 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Thanks for your call</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your support session has ended. We hope we were able to help today.
        </p>
        {duration && (
          <p className="mt-6 text-sm">
            <span className="text-muted-foreground">Call duration:</span>{" "}
            <span className="font-semibold">{duration}</span>
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Video className="h-3.5 w-3.5" /> Powered by Vidline
        </div>
      </Card>
    </div>
  );
}
