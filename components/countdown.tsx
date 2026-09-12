"use client";

import { useCountdown } from "@/lib/hooks/use-countdown";

/** Time left until the next puzzle (local midnight). */
export function Countdown({ label = "Next puzzle in" }: { label?: string }) {
  const value = useCountdown();
  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
