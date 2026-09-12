"use client";

import type { ContentKey } from "@/lib/content/files";
import type { ContentIssue } from "@/lib/content/validate";

export type SaveResult<T> =
  | { ok: true; data: T; file: string; warnings: ContentIssue[] }
  | { ok: false; errors: ContentIssue[]; warnings: ContentIssue[] };

// Trailing slash: next.config.ts sets trailingSlash, so the bare path answers 308.
const ENDPOINT = "/api/admin/content/";

export async function loadContent<T>(key: ContentKey): Promise<T> {
  const response = await fetch(`${ENDPOINT}?key=${key}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${key}: ${response.status}`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export async function saveContent<T>(key: ContentKey, data: T): Promise<SaveResult<T>> {
  const response = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, data }),
  });
  const body = (await response.json().catch(() => null)) as SaveResult<T> | { error: string } | null;
  if (!body) return { ok: false, errors: [{ path: "save", message: `Server error ${response.status}` }], warnings: [] };
  if ("error" in body) return { ok: false, errors: [{ path: "save", message: body.error }], warnings: [] };
  return body;
}
