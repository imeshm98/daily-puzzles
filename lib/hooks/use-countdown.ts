import { useSyncExternalStore } from "react";
import { formatCountdown, msUntilLocalMidnight } from "../daily";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
}

/** "HH:MM:SS" until the next local midnight, ticking every second. */
export function useCountdown(): string {
  return useSyncExternalStore(
    subscribe,
    () => formatCountdown(msUntilLocalMidnight()),
    () => "--:--:--",
  );
}
