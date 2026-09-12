import { useSyncExternalStore } from "react";
import { getLocalDateKey, getPuzzleNumber, type Today } from "../daily";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Today's local date key and puzzle number. Null until hydrated on the client. */
export function useToday(): Today | null {
  const dateKey = useSyncExternalStore(
    subscribe,
    () => getLocalDateKey(),
    () => null,
  );
  return dateKey ? { dateKey, puzzleNumber: getPuzzleNumber(dateKey) } : null;
}
