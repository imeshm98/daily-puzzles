import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import citiesJson from "@/content/cities.json";
import categoriesJson from "@/content/order-categories.json";
import { CONTENT_FILES } from "./files";
import { sortCategories, sortCities, toContentFile } from "./format";
import { validateCategories, validateCities } from "./validate";

/** The shipped content must pass the same checks the admin applies before a save. */
describe("content files", () => {
  it("order categories are valid", () => {
    const report = validateCategories(categoriesJson);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.data!.length).toBeGreaterThanOrEqual(10);
  });

  it("cities are valid", () => {
    const report = validateCities(citiesJson);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.data!.length).toBeGreaterThanOrEqual(200);
  });

  it("are stored sorted and formatted exactly as the admin would write them", () => {
    const orderText = readFileSync(CONTENT_FILES.order.path, "utf8");
    expect(orderText).toBe(toContentFile(sortCategories(categoriesJson)));
    const citiesText = readFileSync(CONTENT_FILES.distance.path, "utf8");
    expect(citiesText).toBe(toContentFile(sortCities(citiesJson)));
  });
});
