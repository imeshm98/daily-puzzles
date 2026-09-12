/**
 * Development-only content API for the admin at /admin.
 *
 * This file is named route.dev.ts: the "dev.ts" page extension is only
 * registered under `next dev` (see next.config.ts), so `next build` and the
 * static export never include it. As a second line of defence every handler
 * also answers 404 unless NODE_ENV is "development".
 *
 *   GET /api/admin/content?key=order       → { key, data }
 *   PUT /api/admin/content  { key, data }  → validates, sorts, formats, writes
 *
 * Only the files listed in lib/content/files.ts can be read or written. The
 * path comes from that table, never from the request, so there is no way to
 * reach any other file.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { CONTENT_FILES, isContentKey, type ContentKey } from "@/lib/content/files";
import { sortCategories, sortCities, toContentFile } from "@/lib/content/format";
import { validateCategories, validateCities, type ContentIssue } from "@/lib/content/validate";

export const dynamic = "force-dynamic";

function notInDevelopment(): NextResponse | null {
  if (process.env.NODE_ENV === "development") return null;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function contentPath(key: ContentKey): string {
  return path.join(process.cwd(), ...CONTENT_FILES[key].path.split("/"));
}

/** Validates and sorts one content file's data. Returns the file text to write when ok. */
function prepare(
  key: ContentKey,
  data: unknown,
): { ok: true; data: unknown; text: string; warnings: ContentIssue[] } | { ok: false; errors: ContentIssue[]; warnings: ContentIssue[] } {
  if (key === "order") {
    const report = validateCategories(data);
    if (!report.ok || !report.data) return { ok: false, errors: report.errors, warnings: report.warnings };
    const sorted = sortCategories(report.data);
    return { ok: true, data: sorted, text: toContentFile(sorted), warnings: report.warnings };
  }
  const report = validateCities(data);
  if (!report.ok || !report.data) return { ok: false, errors: report.errors, warnings: report.warnings };
  const sorted = sortCities(report.data);
  return { ok: true, data: sorted, text: toContentFile(sorted), warnings: report.warnings };
}

export async function GET(request: Request) {
  const blocked = notInDevelopment();
  if (blocked) return blocked;

  const key = new URL(request.url).searchParams.get("key");
  if (!isContentKey(key)) {
    return NextResponse.json({ error: "Unknown content key" }, { status: 400 });
  }
  const text = await readFile(contentPath(key), "utf8");
  return NextResponse.json({ key, file: CONTENT_FILES[key].path, data: JSON.parse(text) });
}

export async function PUT(request: Request) {
  const blocked = notInDevelopment();
  if (blocked) return blocked;

  const body: unknown = await request.json().catch(() => null);
  const key = body && typeof body === "object" ? (body as { key?: unknown }).key : undefined;
  if (!isContentKey(key)) {
    return NextResponse.json({ error: "Unknown content key" }, { status: 400 });
  }
  const data = (body as { data?: unknown }).data;

  const prepared = prepare(key, data);
  if (!prepared.ok) {
    return NextResponse.json(
      { ok: false, errors: prepared.errors, warnings: prepared.warnings },
      { status: 422 },
    );
  }
  await writeFile(contentPath(key), prepared.text, "utf8");
  return NextResponse.json({
    ok: true,
    key,
    file: CONTENT_FILES[key].path,
    data: prepared.data,
    warnings: prepared.warnings,
  });
}
