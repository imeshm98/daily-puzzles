import { useEffect } from "react";
import { getLocalDateKey } from "../daily";

/** Reloads the page when the local date changes, so a new puzzle appears at midnight. */
export function useReloadOnNewDay(): void {
  useEffect(() => {
    const startKey = getLocalDateKey();
    const check = () => {
      if (getLocalDateKey() !== startKey) window.location.reload();
    };
    const id = window.setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}
