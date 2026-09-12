"use client";

import { useCountdown } from "@/lib/hooks/use-countdown";

interface CountdownProps {
  label?: string;
  /** "sm" renders a single quiet line; "md" is the large centred version. */
  size?: "md" | "sm";
}

/** Time left until the next daily puzzle (local midnight). */
export function Countdown({ label = "Next puzzle in", size = "md" }: CountdownProps) {
  const value = useCountdown();

  if (size === "sm") {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {label} <span className="font-mono text-foreground tabular-nums">{value}</span>
      </p>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
