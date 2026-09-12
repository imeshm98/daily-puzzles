"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatValue } from "@/games/order/logic";
import type { OrderCategory, OrderItem } from "@/lib/content/schemas";
import { MIN_ITEMS_PER_CATEGORY, validateCategories, type ContentIssue } from "@/lib/content/validate";
import { loadContent, saveContent } from "./content-api";
import { IssueList, SavedNotice } from "./issues";

/** Editing copy: values stay strings while typing so "1." and "" are allowed. */
interface DraftItem {
  name: string;
  value: string;
}
interface DraftCategory extends Omit<OrderCategory, "items" | "minGap"> {
  minGap: string;
  items: DraftItem[];
}

const toDraft = (category: OrderCategory): DraftCategory => ({
  ...category,
  minGap: String(category.minGap),
  items: category.items.map((item) => ({ name: item.name, value: String(item.value) })),
});

const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

const fromDraft = (draft: DraftCategory): OrderCategory => ({
  ...draft,
  minGap: toNumber(draft.minGap),
  plain: draft.plain ? true : undefined,
  items: draft.items.map((item): OrderItem => ({ name: item.name, value: toNumber(item.value) })),
});

const newCategory = (): DraftCategory => ({
  id: "",
  question: "Put these things in order from smallest to largest",
  unit: "",
  lowLabel: "Smallest",
  highLabel: "Largest",
  minGap: "1",
  plain: false,
  items: [],
});

export function OrderEditor() {
  const [categories, setCategories] = useState<DraftCategory[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ContentIssue[]>([]);
  const [warnings, setWarnings] = useState<ContentIssue[]>([]);
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sortByValue, setSortByValue] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadContent<OrderCategory[]>("order")
      .then((data) => {
        if (cancelled) return;
        setCategories(data.map(toDraft));
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIndex = useMemo(
    () => (categories && selectedId !== null ? categories.findIndex((c) => c.id === selectedId) : -1),
    [categories, selectedId],
  );
  const selected = selectedIndex >= 0 ? categories![selectedIndex] : null;

  /** Applies a change to the selected category and marks the draft dirty. */
  const update = (change: (category: DraftCategory) => DraftCategory) => {
    if (selectedIndex < 0) return;
    setCategories((current) => current!.map((c, i) => (i === selectedIndex ? change(c) : c)));
    setDirty(true);
    setSavedFile(null);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    update((c) => ({ ...c, items: c.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));

  const moveItem = (index: number, direction: -1 | 1) =>
    update((c) => {
      const items = [...c.items];
      const target = index + direction;
      if (target < 0 || target >= items.length) return c;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...c, items };
    });

  const addCategory = () => {
    const draft = newCategory();
    setCategories((current) => [...(current ?? []), draft]);
    setSelectedId(draft.id);
    setDirty(true);
    setSavedFile(null);
  };

  const deleteCategory = () => {
    if (selectedIndex < 0) return;
    setCategories((current) => current!.filter((_, i) => i !== selectedIndex));
    setSelectedId(null);
    setConfirmDelete(false);
    setDirty(true);
    setSavedFile(null);
  };

  const save = async () => {
    if (!categories) return;
    const data = categories.map(fromDraft);
    const report = validateCategories(data);
    setErrors(report.errors);
    setWarnings(report.warnings);
    if (!report.ok) return;
    setSaving(true);
    const result = await saveContent<OrderCategory[]>("order", data);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      setWarnings(result.warnings);
      return;
    }
    const drafts = result.data.map(toDraft);
    setCategories(drafts);
    setSelectedId(selected ? selected.id : (drafts[0]?.id ?? null));
    setWarnings(result.warnings);
    setSavedFile(result.file);
    setDirty(false);
  };

  if (loadError) return <p className="text-destructive">Could not load categories: {loadError}</p>;
  if (!categories) return <p className="text-muted-foreground">Loading…</p>;

  const selectedWarnings = selected
    ? warnings.filter((issue) => issue.path.startsWith(`${selected.id} ›`))
    : [];

  const displayItems = selected
    ? selected.items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => (sortByValue ? toNumber(a.item.value) - toNumber(b.item.value) : 0))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order categories</h1>
          <p className="text-sm text-muted-foreground">
            Each category needs at least {MIN_ITEMS_PER_CATEGORY} items with clearly different values. Items are saved
            sorted by value.
          </p>
        </div>
        <Button onClick={save} disabled={saving || !dirty} className="h-10">
          <Save />
          {saving ? "Saving…" : dirty ? "Save all changes" : "Saved"}
        </Button>
      </div>

      {savedFile && <SavedNotice file={savedFile} />}
      {/* Errors block the save, so all of them show. Warnings are per category and collapsed. */}
      <IssueList errors={errors} warnings={[]} />
      {selected && selectedWarnings.length > 0 && (
        <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-amber-400">
            {selectedWarnings.length} pairs in {selected.id} are too close to appear together (fine, just so you know)
          </summary>
          <div className="pt-2">
            <IssueList errors={[]} warnings={selectedWarnings} />
          </div>
        </details>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id || "__new__"}
              type="button"
              onClick={() => {
                setSelectedId(category.id);
                setConfirmDelete(false);
              }}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                category.id === selectedId ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="block font-medium">{category.id || "(new category)"}</span>
              <span className="text-xs text-muted-foreground">
                {category.items.length} items · {category.unit || "no unit"}
              </span>
            </button>
          ))}
          <Button variant="outline" className="w-full" onClick={addCategory}>
            <Plus />
            Add category
          </Button>
        </aside>

        {selected ? (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Id (URL-safe, never change after launch)" id="cat-id">
                <Input
                  id="cat-id"
                  value={selected.id}
                  onChange={(event) => {
                    const id = event.target.value;
                    update((c) => ({ ...c, id }));
                    setSelectedId(id);
                  }}
                  placeholder="rivers-length"
                />
              </Field>
              <Field label="Unit (empty for plain numbers)" id="cat-unit">
                <Input id="cat-unit" value={selected.unit} onChange={(e) => update((c) => ({ ...c, unit: e.target.value }))} />
              </Field>
              <Field label="Question" id="cat-question" className="md:col-span-2">
                <Input
                  id="cat-question"
                  value={selected.question}
                  onChange={(e) => update((c) => ({ ...c, question: e.target.value }))}
                />
              </Field>
              <Field label="Low label (top of the list)" id="cat-low">
                <Input id="cat-low" value={selected.lowLabel} onChange={(e) => update((c) => ({ ...c, lowLabel: e.target.value }))} />
              </Field>
              <Field label="High label (bottom of the list)" id="cat-high">
                <Input id="cat-high" value={selected.highLabel} onChange={(e) => update((c) => ({ ...c, highLabel: e.target.value }))} />
              </Field>
              <Field label="Minimum gap between items shown together" id="cat-gap">
                <Input
                  id="cat-gap"
                  type="number"
                  step="any"
                  value={selected.minGap}
                  onChange={(e) => update((c) => ({ ...c, minGap: e.target.value }))}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(selected.plain)}
                  onChange={(e) => update((c) => ({ ...c, plain: e.target.checked }))}
                />
                Plain numbers (years, atomic numbers: no thousands separators)
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                Items <span className="text-sm font-normal text-muted-foreground">({selected.items.length})</span>
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sortByValue} onChange={(e) => setSortByValue(e.target.checked)} />
                  Show sorted by value
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update((c) => ({ ...c, items: [...c.items, { name: "", value: "" }] }))}
                >
                  <Plus />
                  Add item
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-40">Value</TableHead>
                  <TableHead className="w-40">Shown as</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map(({ item, index }, position) => {
                  const value = toNumber(item.value);
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{position + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.name}
                          placeholder="Name"
                          aria-label={`Item ${position + 1} name`}
                          onChange={(e) => updateItem(index, { name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          value={item.value}
                          placeholder="Value"
                          aria-label={`Item ${position + 1} value`}
                          onChange={(e) => updateItem(index, { value: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {Number.isFinite(value)
                          ? formatValue(value, { unit: selected.unit, plain: selected.plain })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move up"
                            disabled={sortByValue || index === 0}
                            onClick={() => moveItem(index, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move down"
                            disabled={sortByValue || index === selected.items.length - 1}
                            onClick={() => moveItem(index, 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete item"
                            className="text-destructive"
                            onClick={() => update((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end border-t border-border pt-4">
              {confirmDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span>Delete this whole category?</span>
                  <Button variant="destructive" size="sm" onClick={deleteCategory}>
                    Yes, delete it
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete category
                </Button>
              )}
            </div>
          </section>
        ) : (
          <p className="text-muted-foreground">Pick a category on the left, or add one.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
