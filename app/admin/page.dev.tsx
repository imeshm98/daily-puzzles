import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CITIES } from "@/games/distance/cities";
import { CATEGORIES } from "@/games/order/categories";
import { CONTENT_FILES } from "@/lib/content/files";
import { PuzzlePreview } from "./_components/puzzle-preview";

/** Development-only dashboard (page.dev.tsx: never in the static export). */
export default function AdminDashboard() {
  const itemCount = CATEGORIES.reduce((sum, category) => sum + category.items.length, 0);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">
            Edits are written straight to the JSON files under <code className="font-mono">content/</code>. After
            saving, commit and open a pull request.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/order" className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader>
                <CardTitle>📊 Order categories</CardTitle>
                <CardDescription>
                  {CATEGORIES.length} categories, {itemCount} items · <code className="font-mono">{CONTENT_FILES.order.path}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Add, edit and delete categories (question, unit, labels, minimum gap) and their items (name, value).
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/distance" className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader>
                <CardTitle>🌍 Distance cities</CardTitle>
                <CardDescription>
                  {CITIES.length} cities · <code className="font-mono">{CONTENT_FILES.distance.path}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Searchable table of cities: name, country, flag emoji, latitude and longitude.
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <PuzzlePreview />
    </div>
  );
}
