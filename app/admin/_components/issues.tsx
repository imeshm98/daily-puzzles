"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { ContentIssue } from "@/lib/content/validate";

export function IssueList({ errors, warnings }: { errors: ContentIssue[]; warnings: ContentIssue[] }) {
  if (errors.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-semibold text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            {errors.length === 1 ? "1 problem to fix before saving" : `${errors.length} problems to fix before saving`}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {errors.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                <span className="font-medium">{issue.path}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-semibold text-amber-400">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {warnings.length === 1 ? "1 thing worth a look" : `${warnings.length} things worth a look`} (saving is still allowed)
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                <span className="font-medium">{issue.path}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Shown after a successful save. */
export function SavedNotice({ file }: { file: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-correct/40 bg-correct/10 p-3 text-sm">
      <CircleCheck className="mt-0.5 size-4 text-correct" aria-hidden="true" />
      <div>
        <p className="font-semibold">Saved to the data file. Now commit and open a pull request.</p>
        <p className="text-muted-foreground">
          Written to <code className="font-mono">{file}</code>. The running dev server picks the change up on the next
          reload.
        </p>
      </div>
    </div>
  );
}
