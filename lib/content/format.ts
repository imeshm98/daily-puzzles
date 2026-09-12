/**
 * Stable formatting and ordering for the JSON content files, so that every
 * save (from the admin or the migration script) produces the same bytes for
 * the same data and git diffs stay small. No path aliases here: the migration
 * script runs this file directly in Node.
 */

const collator = new Intl.Collator("en", { sensitivity: "base" });

export interface SortableItem {
  name: string;
  value: number;
}

export interface SortableCategory {
  id: string;
  items: SortableItem[];
}

export interface SortableCity {
  name: string;
  country: string;
}

/** Categories by id; items by value, then name. Returns new arrays. */
export function sortCategories<C extends SortableCategory>(categories: readonly C[]): C[] {
  return categories
    .map((category) => ({
      ...category,
      items: [...category.items].sort(
        (a, b) => a.value - b.value || collator.compare(a.name, b.name),
      ),
    }))
    .sort((a, b) => collator.compare(a.id, b.id));
}

/** Cities by name, then country. Returns a new array. */
export function sortCities<C extends SortableCity>(cities: readonly C[]): C[] {
  return [...cities].sort(
    (a, b) => collator.compare(a.name, b.name) || collator.compare(a.country, b.country),
  );
}

const isPrimitive = (value: unknown) =>
  value === null || ["string", "number", "boolean"].includes(typeof value);

/**
 * JSON with two-space indentation, except that objects made only of
 * primitives are written on one line. One item or city per line keeps the
 * files readable and a change to one entry a one-line diff.
 */
export function formatJson(value: unknown, indent = ""): string {
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => inner + formatJson(item, inner)).join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, item]) => item !== undefined,
    );
    if (entries.length === 0) return "{}";
    if (entries.every(([, item]) => isPrimitive(item))) {
      return `{ ${entries.map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(", ")} }`;
    }
    return `{\n${entries
      .map(([key, item]) => `${inner}${JSON.stringify(key)}: ${formatJson(item, inner)}`)
      .join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/** The exact file contents: formatted JSON with a trailing newline. */
export function toContentFile(value: unknown): string {
  return formatJson(value) + "\n";
}
