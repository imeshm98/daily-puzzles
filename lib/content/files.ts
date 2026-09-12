/**
 * The only files the development-only admin may read or write. The API looks
 * paths up by key here and never builds a path from request input, so there
 * is no way to reach any other file.
 */
export const CONTENT_FILES = {
  order: {
    path: "content/order-categories.json",
    label: "Order categories",
  },
  distance: {
    path: "content/cities.json",
    label: "Distance cities",
  },
} as const;

export type ContentKey = keyof typeof CONTENT_FILES;

export const CONTENT_KEYS = Object.keys(CONTENT_FILES) as ContentKey[];

export function isContentKey(value: unknown): value is ContentKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CONTENT_FILES, value);
}
