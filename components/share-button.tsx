"use client";

import { Check, MessageCircle, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl, shareResult } from "@/lib/share";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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

/**
 * Opens WhatsApp (the app on phones, WhatsApp Web on desktop) with the share
 * text already typed, so the player only has to pick a friend.
 */
export function WhatsAppButton({ text, className }: { text: string; className?: string }) {
  return (
    <a
      href={buildWhatsAppUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "h-12 w-full text-base font-semibold",
        className,
      )}
    >
      <MessageCircle />
      Challenge on WhatsApp
    </a>
  );
}
