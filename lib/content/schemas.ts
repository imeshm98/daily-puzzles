/**
 * Zod schemas for the JSON content files in /content. The games parse the
 * files through these at load time and the development-only admin validates
 * every save with them, so both always agree on the shape.
 */
import { z } from "zod";

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Two regional indicator symbols, e.g. 🇬🇧. */
const flagEmoji = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;

export const orderItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  value: z.number("Value must be a number"),
});

export const orderCategorySchema = z.object({
  id: z.string().regex(slug, "Id must be lowercase words joined by dashes, e.g. rivers-length"),
  /** Shown above the list, e.g. "Put these animals in order from lightest to heaviest". */
  question: z.string().trim().min(10, "Question is required (at least 10 characters)"),
  /** Unit shown after values, e.g. "kg". Empty for plain numbers and years. */
  unit: z.string().trim(),
  /** Labels for the top and bottom of the list. */
  lowLabel: z.string().trim().min(1, "Low label is required"),
  highLabel: z.string().trim().min(1, "High label is required"),
  /** Two items closer than this (and with a small ratio) never appear together. */
  minGap: z.number("Minimum gap must be a number").positive("Minimum gap must be greater than 0"),
  /** Years and atomic numbers are shown without thousands separators. */
  plain: z.boolean().optional(),
  items: z.array(orderItemSchema),
});

export const orderCategoriesSchema = z.array(orderCategorySchema);

export const citySchema = z.object({
  name: z.string().trim().min(1, "City name is required"),
  country: z.string().trim().min(1, "Country is required"),
  flag: z.string().regex(flagEmoji, "Flag must be a single flag emoji, e.g. 🇫🇷"),
  lat: z.number("Latitude must be a number").min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lon: z.number("Longitude must be a number").min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
});

export const citiesSchema = z.array(citySchema);

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderCategory = z.infer<typeof orderCategorySchema>;
export type City = z.infer<typeof citySchema>;
