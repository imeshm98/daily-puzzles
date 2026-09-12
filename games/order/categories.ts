/**
 * Categories for the Order game, loaded from content/order-categories.json
 * and checked against the shared zod schema at load time. Edit the JSON with
 * the development-only admin at /admin/order (see README), not by hand.
 *
 * Values are approximate but the order within a category is correct.
 * `minGap` is the smallest difference (in the unit) between two items that
 * may appear together, unless their ratio is large.
 */
import categoriesJson from "@/content/order-categories.json";
import { orderCategoriesSchema, type OrderCategory, type OrderItem } from "@/lib/content/schemas";

export type { OrderCategory, OrderItem };

export const CATEGORIES: readonly OrderCategory[] = orderCategoriesSchema.parse(categoriesJson);
