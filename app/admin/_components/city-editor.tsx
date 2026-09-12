"use client";

import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { City } from "@/lib/content/schemas";
import { validateCities, type ContentIssue } from "@/lib/content/validate";
import { loadContent, saveContent } from "./content-api";
import { IssueList, SavedNotice } from "./issues";

/** Editing copy: coordinates stay strings while typing. */
interface DraftCity {
  name: string;
  country: string;
  flag: string;
  lat: string;
  lon: string;
}

const toDraft = (city: City): DraftCity => ({ ...city, lat: String(city.lat), lon: String(city.lon) });
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const fromDraft = (draft: DraftCity): City => ({
  name: draft.name,
  country: draft.country,
  flag: draft.flag,
  lat: toNumber(draft.lat),
  lon: toNumber(draft.lon),
});

/** Row-level checks so a bad coordinate is caught while editing, before Save all. */
function rowProblems(draft: DraftCity): string[] {
  const report = validateCities([fromDraft(draft)]);
  return report.errors
    .filter((issue) => !issue.message.startsWith("Needs at least"))
    .map((issue) => issue.message);
}

export function CityEditor() {
  const [cities, setCities] = useState<DraftCity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftCity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errors, setErrors] = useState<ContentIssue[]>([]);
  const [warnings, setWarnings] = useState<ContentIssue[]>([]);
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadContent<City[]>("distance")
      .then((data) => {
        if (!cancelled) setCities(data.map(toDraft));
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (!cities) return [];
    const needle = query.trim().toLowerCase();
    return cities
      .map((city, index) => ({ city, index }))
      .filter(({ city }) => !needle || `${city.name} ${city.country}`.toLowerCase().includes(needle));
  }, [cities, query]);

  const markDirty = () => {
    setDirty(true);
    setSavedFile(null);
  };

  const startEdit = (index: number) => {
    setEditing(index);
    setDraft({ ...cities![index] });
    setConfirmDelete(null);
  };

  const addCity = () => {
    const blank: DraftCity = { name: "", country: "", flag: "", lat: "", lon: "" };
    setCities((current) => [blank, ...(current ?? [])]);
    setEditing(0);
    setDraft(blank);
    setQuery("");
    markDirty();
  };

  const commitEdit = () => {
    if (editing === null || !draft) return;
    setCities((current) => current!.map((city, i) => (i === editing ? draft : city)));
    setEditing(null);
    setDraft(null);
    markDirty();
  };

  const cancelEdit = () => {
    if (editing !== null && cities && isBlank(cities[editing])) {
      // A freshly added, still empty row goes away on cancel.
      setCities((current) => current!.filter((_, i) => i !== editing));
    }
    setEditing(null);
    setDraft(null);
  };

  const deleteCity = (index: number) => {
    setCities((current) => current!.filter((_, i) => i !== index));
    setConfirmDelete(null);
    if (editing === index) cancelEdit();
    markDirty();
  };

  const save = async () => {
    if (!cities) return;
    const data = cities.map(fromDraft);
    const report = validateCities(data);
    setErrors(report.errors);
    setWarnings(report.warnings);
    if (!report.ok) return;
    setSaving(true);
    const result = await saveContent<City[]>("distance", data);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      setWarnings(result.warnings);
      return;
    }
    setCities(result.data.map(toDraft));
    setWarnings(result.warnings);
    setSavedFile(result.file);
    setDirty(false);
  };

  if (loadError) return <p className="text-destructive">Could not load cities: {loadError}</p>;
  if (!cities) return <p className="text-muted-foreground">Loading…</p>;

  const draftProblems = draft ? rowProblems(draft) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Distance cities</h1>
          <p className="text-sm text-muted-foreground">
            {cities.length} cities. Latitude -90..90, longitude -180..180, two decimals is plenty. Saved sorted by name.
          </p>
        </div>
        <Button onClick={save} disabled={saving || !dirty || editing !== null} className="h-10">
          <Save />
          {saving ? "Saving…" : dirty ? "Save all changes" : "Saved"}
        </Button>
      </div>

      {savedFile && <SavedNotice file={savedFile} />}
      <IssueList errors={errors} warnings={warnings} />

      <div className="flex items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by city or country…"
          aria-label="Search cities"
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {visible.length} of {cities.length}
        </span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={addCity} disabled={editing !== null}>
          <Plus />
          Add city
        </Button>
      </div>

      {editing !== null && draftProblems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive">
          {draftProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Flag</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="w-32">Latitude</TableHead>
            <TableHead className="w-32">Longitude</TableHead>
            <TableHead className="w-40 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map(({ city, index }) =>
            editing === index && draft ? (
              <TableRow key={index} className="bg-muted/40">
                <TableCell>
                  <Input value={draft.flag} aria-label="Flag" onChange={(e) => setDraft({ ...draft, flag: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input value={draft.name} aria-label="City" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input
                    value={draft.country}
                    aria-label="Country"
                    onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min={-90}
                    max={90}
                    value={draft.lat}
                    aria-label="Latitude"
                    onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min={-180}
                    max={180}
                    value={draft.lon}
                    aria-label="Longitude"
                    onChange={(e) => setDraft({ ...draft, lon: e.target.value })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" onClick={commitEdit} disabled={draftProblems.length > 0}>
                      <Check />
                      Done
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X />
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={index}>
                <TableCell className="text-lg">{city.flag}</TableCell>
                <TableCell className="font-medium">{city.name}</TableCell>
                <TableCell>{city.country}</TableCell>
                <TableCell className="font-mono text-sm">{city.lat}</TableCell>
                <TableCell className="font-mono text-sm">{city.lon}</TableCell>
                <TableCell className="text-right">
                  {confirmDelete === index ? (
                    <div className="inline-flex items-center gap-2 text-sm">
                      <span>Delete?</span>
                      <Button variant="destructive" size="sm" onClick={() => deleteCity(index)}>
                        Yes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${city.name}`} onClick={() => startEdit(index)} disabled={editing !== null}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${city.name}`}
                        className="text-destructive"
                        onClick={() => setConfirmDelete(index)}
                        disabled={editing !== null}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const isBlank = (city: DraftCity) => !city.name && !city.country && !city.flag && !city.lat && !city.lon;
