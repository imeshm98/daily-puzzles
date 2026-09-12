import { describe, expect, it } from "vitest";
import { formatJson, sortCategories, sortCities, toContentFile } from "./format";
import {
  almostEqual,
  closePairs,
  distinguishableCount,
  MIN_CITIES,
  MIN_ITEMS_PER_CATEGORY,
  validateCategories,
  validateCities,
} from "./validate";

const items = (values: number[]) => values.map((value, i) => ({ name: `Item ${i + 1}`, value }));

/** A valid category: 16 items spread widely. */
const category = (overrides: Partial<ReturnType<typeof baseCategory>> = {}) => ({
  ...baseCategory(),
  ...overrides,
});
function baseCategory() {
  return {
    id: "test-things",
    question: "Put these things in order from smallest to largest",
    unit: "kg",
    lowLabel: "Smallest",
    highLabel: "Largest",
    minGap: 10,
    items: items(Array.from({ length: 16 }, (_, i) => (i + 1) * 100)),
  };
}

const city = (overrides: Partial<{ name: string; country: string; flag: string; lat: number; lon: number }> = {}) => ({
  name: "Paris",
  country: "France",
  flag: "🇫🇷",
  lat: 48.86,
  lon: 2.35,
  ...overrides,
});
const cities = (n: number) =>
  Array.from({ length: n }, (_, i) => city({ name: `City ${i}`, lat: (i % 90) - 45, lon: (i * 7) % 180 }));

describe("validateCategories", () => {
  it("accepts a well-formed category with no errors or warnings", () => {
    const report = validateCategories([category()]);
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.data?.[0].items).toHaveLength(16);
  });

  it("requires every field and reports where the problem is", () => {
    const report = validateCategories([category({ question: "", items: [{ name: "", value: 1 }] })]);
    expect(report.ok).toBe(false);
    expect(report.errors.map((e) => e.path)).toEqual(
      expect.arrayContaining(["test-things › question", "test-things › item 1 › name"]),
    );
  });

  it("rejects values that are not numbers", () => {
    const raw = [category({ items: [...items([1, 2]), { name: "Bad", value: "12" as unknown as number }] })];
    const report = validateCategories(raw);
    expect(report.ok).toBe(false);
    expect(report.errors).toContainEqual({ path: "test-things › Bad › value", message: "Value must be a number" });
  });

  it("needs at least the minimum number of items", () => {
    const report = validateCategories([category({ items: items([1, 2, 3]) })]);
    expect(report.errors.some((e) => e.message.startsWith(`Needs at least ${MIN_ITEMS_PER_CATEGORY} items`))).toBe(true);
  });

  it("rejects duplicate item names, ignoring case and spaces", () => {
    const withDup = category();
    withDup.items[3] = { name: " item 1 ", value: 999 };
    const report = validateCategories([withDup]);
    // The schema trims names, so the duplicate is reported by its clean name.
    expect(report.errors).toContainEqual({ path: "test-things › item 1", message: 'Duplicate item name "item 1"' });
  });

  it("rejects duplicate category ids and malformed ids", () => {
    expect(validateCategories([category(), category()]).errors).toContainEqual({
      path: "test-things",
      message: 'Duplicate category id "test-things"',
    });
    expect(validateCategories([category({ id: "Bad Id" })]).ok).toBe(false);
  });

  it("treats equal or nearly equal values as errors, and merely close values as warnings", () => {
    const equal = category();
    equal.items.push({ name: "Twin", value: 100 });
    expect(validateCategories([equal]).errors.map((e) => e.message)).toContainEqual(
      '"Item 1" and "Twin" have the same value (100)',
    );

    const nearly = category();
    nearly.items.push({ name: "Almost", value: 100.005 }); // gap 0.005 < 0.1% of minGap 10
    expect(validateCategories([nearly]).errors.some((e) => e.message.includes("almost the same value"))).toBe(true);

    const close = category();
    close.items.push({ name: "Neighbour", value: 105 }); // ratio 1.05, gap 5 < minGap 10: never shown together
    const report = validateCategories([close]);
    expect(report.ok).toBe(true);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0].message).toContain("too close to appear together");
  });

  it("requires enough clearly different values for a puzzle", () => {
    // 16 items but all within 1000..1003 with minGap 10: only one is distinguishable.
    const crowded = category({ items: items(Array.from({ length: 16 }, (_, i) => 1000 + i * 0.2)) });
    const report = validateCategories([crowded]);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.message.includes("clearly different"))).toBe(true);
  });

  it("rejects an empty list and non-array input", () => {
    expect(validateCategories([]).ok).toBe(false);
    expect(validateCategories({ nope: true }).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("almostEqual respects the category scale", () => {
    expect(almostEqual(100, 100, 10)).toBe(true);
    expect(almostEqual(100, 100.005, 10)).toBe(true);
    expect(almostEqual(100, 100.05, 10)).toBe(false);
    expect(almostEqual(0.02, 0.1, 10)).toBe(false); // ratio 5: clearly different
  });

  it("closePairs and distinguishableCount agree with the game rule", () => {
    // 10/11: ratio 1.1 and gap 1 < 5. 30/31: same. 11/30 and 31/100: ratio over 1.2.
    const list = items([10, 11, 30, 31, 100]);
    expect(closePairs(list, 5).map(([a, b]) => `${a.value}/${b.value}`)).toEqual(["10/11", "30/31"]);
    expect(distinguishableCount(list, 5)).toBe(3);
  });
});

describe("validateCities", () => {
  it("accepts a valid list", () => {
    const report = validateCities(cities(MIN_CITIES));
    expect(report.ok).toBe(true);
    expect(report.data).toHaveLength(MIN_CITIES);
  });

  it("checks latitude and longitude ranges with the city named in the path", () => {
    const report = validateCities([...cities(MIN_CITIES), city({ name: "Nowhere", lat: 91 }), city({ name: "Elsewhere", lon: -181 })]);
    expect(report.ok).toBe(false);
    expect(report.errors).toContainEqual({ path: "Nowhere › lat", message: "Latitude must be between -90 and 90" });
    expect(report.errors).toContainEqual({ path: "Elsewhere › lon", message: "Longitude must be between -180 and 180" });
  });

  it("requires a flag emoji and non-empty names", () => {
    const report = validateCities([...cities(MIN_CITIES), city({ name: "", flag: "FR" })]);
    expect(report.errors.map((e) => e.path)).toEqual(expect.arrayContaining(["city 21 › name", "city 21 › flag"]));
  });

  it("rejects duplicates and too few cities", () => {
    expect(validateCities([...cities(MIN_CITIES), city({ name: "city 0" })]).errors).toContainEqual({
      path: "city 0",
      message: 'Duplicate city "city 0, France"',
    });
    expect(validateCities(cities(3)).errors[0].message).toContain(`Needs at least ${MIN_CITIES} cities`);
  });
});

describe("stable formatting", () => {
  it("sorts categories by id and items by value, cities by name then country", () => {
    const sorted = sortCategories([
      { id: "b", items: items([3, 1, 2]) },
      { id: "a", items: [] },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["a", "b"]);
    expect(sorted[1].items.map((i) => i.value)).toEqual([1, 2, 3]);
    const sortedCities = sortCities([
      { name: "Paris", country: "United States" },
      { name: "Lyon", country: "France" },
      { name: "Paris", country: "France" },
    ]);
    expect(sortedCities.map((c) => `${c.name}, ${c.country}`)).toEqual(["Lyon, France", "Paris, France", "Paris, United States"]);
  });

  it("writes one primitive-only object per line and is idempotent", () => {
    const value = [{ id: "x", plain: true, items: [{ name: "A", value: 1 }] }];
    const text = toContentFile(value);
    expect(text).toBe(
      '[\n  {\n    "id": "x",\n    "plain": true,\n    "items": [\n      { "name": "A", "value": 1 }\n    ]\n  }\n]\n',
    );
    expect(toContentFile(JSON.parse(text))).toBe(text);
    expect(formatJson({ a: undefined, b: 2 })).toBe('{ "b": 2 }');
  });
});
