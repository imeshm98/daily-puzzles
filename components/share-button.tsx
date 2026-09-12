"use client";

import { Check, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { shareResult } from "@/lib/share";
import { cn } from "@/lib/utils";

/** Native share sheet on mobile, clipboard elsewhere (shows "Copied!"). */
export function ShareButton({ text, className }: { text: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);

  const handleClick = async () => {
    const outcome = await shareResult(text);
    if (outcome === "shared" || outcome === "cancelled") return;
    setState(outcome === "copied" ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <Button
      size="lg"
      className={cn(
        "h-12 w-full text-base font-semibold",
        state === "copied" && "bg-correct text-white hover:bg-correct/90",
        className,
      )}
      onClick={handleClick}
    >
      {state === "copied" ? <Check /> : <Share2 />}
      {state === "copied" ? "Copied!" : state === "failed" ? "Couldn't copy" : "Share"}
    </Button>
  );
}
