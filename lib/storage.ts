import { STORAGE_PREFIX } from "./config";

/** Builds a namespaced localStorage key, e.g. storageKey("melody", "stats"). */
export function storageKey(...parts: string[]): string {
  return [STORAGE_PREFIX, ...parts].join(":");
}

/** Reads and parses JSON from localStorage. Returns null on the server or on any error. */
export function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Serialises and writes JSON to localStorage. Silently ignores errors (private mode, quota). */
export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The game keeps working in memory even if storage is unavailable.
  }
}

export function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}
