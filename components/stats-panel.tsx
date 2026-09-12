import { winPercent, type GameStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
  stats: GameStats;
  maxTries: number;
  /** Highlights the distribution bar for today's winning try count. */
  highlightTries?: number | null;
  distributionLabel?: string;
}

/** Played / win % / streaks tiles plus the guess distribution bars. */
export function StatsPanel({
  stats,
  maxTries,
  highlightTries = null,
  distributionLabel = "Guess distribution",
}: StatsPanelProps) {
  const tiles: [string, number][] = [
    ["Played", stats.played],
    ["Win %", winPercent(stats)],
    ["Current streak", stats.currentStreak],
    ["Max streak", stats.maxStreak],
  ];
  const largest = Math.max(1, ...stats.distribution);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-4 gap-2 text-center">
        {tiles.map(([label, value]) => (
          <div key={label}>
            <dd className="text-2xl font-bold tabular-nums">{value}</dd>
            <dt className="text-[11px] leading-tight text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {distributionLabel}
        </h3>
        <ol className="space-y-1">
          {Array.from({ length: maxTries }, (_, index) => {
            const count = stats.distribution[index] ?? 0;
            const width = Math.max(8, Math.round((count / largest) * 100));
            const highlighted = highlightTries === index + 1;
            return (
              <li key={index} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right tabular-nums">{index + 1}</span>
                <div className="flex-1">
                  <div
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-right font-semibold text-white tabular-nums",
                      highlighted ? "bg-correct" : "bg-absent",
                    )}
                    style={{ width: `${width}%` }}
                  >
                    {count}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
