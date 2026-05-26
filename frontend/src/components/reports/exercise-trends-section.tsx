import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryLabel } from "@/lib/format";
import type { Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMonthKey, MONTH_KEY_FORMAT } from "./utils";

interface ExerciseTrendsSectionProps {
  allWorkouts: Workout[];
  today: Date;
  monthCount: number;
}

interface ExerciseMonthlyPoint {
  monthKey: string;
  monthLabel: string;
  topWeight: number | null;
}

interface ExerciseTrendSeries {
  exerciseId: string;
  name: string;
  category: string;
  totalSessions: number;
  monthsWithData: number;
  points: ExerciseMonthlyPoint[];
  delta: number;
}

export function ExerciseTrendsSection({
  allWorkouts,
  today,
  monthCount,
}: ExerciseTrendsSectionProps) {
  const series = useMemo<ExerciseTrendSeries[]>(() => {
    const months = Array.from({ length: monthCount }, (_, i) =>
      subMonths(startOfMonth(today), monthCount - 1 - i),
    );
    const monthKeys = months.map((m) => formatMonthKey(m));

    // monthKey -> exerciseId -> top weight in that month
    const grid = new Map<string, Map<string, number>>();
    const exerciseInfo = new Map<
      string,
      { name: string; category: string; sessions: number }
    >();

    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      const monthKey = format(startOfMonth(wDate), MONTH_KEY_FORMAT);
      if (!monthKeys.includes(monthKey)) continue;

      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        if (topSet <= 0) continue;

        const info = exerciseInfo.get(we.exerciseId);
        if (info) {
          info.sessions += 1;
        } else {
          exerciseInfo.set(we.exerciseId, {
            name: we.exercise.name,
            category: we.exercise.category,
            sessions: 1,
          });
        }

        let monthMap = grid.get(monthKey);
        if (!monthMap) {
          monthMap = new Map();
          grid.set(monthKey, monthMap);
        }
        const cur = monthMap.get(we.exerciseId) ?? 0;
        if (topSet > cur) monthMap.set(we.exerciseId, topSet);
      }
    }

    const result: ExerciseTrendSeries[] = [];
    for (const [exerciseId, info] of exerciseInfo) {
      const points: ExerciseMonthlyPoint[] = months.map((m) => {
        const monthKey = formatMonthKey(m);
        const monthMap = grid.get(monthKey);
        return {
          monthKey,
          monthLabel: format(m, "MMM/yy", { locale: ptBR }),
          topWeight: monthMap?.get(exerciseId) ?? null,
        };
      });
      const monthsWithData = points.filter((p) => p.topWeight !== null).length;
      const filled = points.filter((p) => p.topWeight !== null);
      const delta =
        filled.length >= 2
          ? Math.round(
              (filled[filled.length - 1]!.topWeight! - filled[0]!.topWeight!) *
                10,
            ) / 10
          : 0;

      result.push({
        exerciseId,
        name: info.name,
        category: info.category,
        totalSessions: info.sessions,
        monthsWithData,
        points,
        delta,
      });
    }

    return result
      .filter((s) => s.monthsWithData >= 2)
      .sort(
        (a, b) =>
          b.monthsWithData - a.monthsWithData ||
          b.totalSessions - a.totalSessions ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6);
  }, [allWorkouts, today, monthCount]);

  if (series.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Tendências
          </p>
          <h2 className="font-display text-lg font-semibold">
            Cargas mês a mês
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top set por mês dos exercícios mais consistentes no período.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {series.length} exercício{series.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <div
            key={s.exerciseId}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{s.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {categoryLabel(s.category)} · {s.monthsWithData} mes
                  {s.monthsWithData === 1 ? "" : "es"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  s.delta > 0 && "text-emerald-700 dark:text-emerald-400",
                  s.delta < 0 && "text-amber-700 dark:text-amber-400",
                  s.delta === 0 && "text-muted-foreground",
                )}
              >
                {s.delta > 0 ? "+" : ""}
                {s.delta} kg
              </span>
            </div>
            <div className="mt-3 h-24 w-full md:h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={s.points}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <XAxis dataKey="monthLabel" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    cursor={{ stroke: "var(--accent)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                      padding: "4px 8px",
                    }}
                    labelStyle={{
                      color: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                    formatter={(value) => [
                      value === null ? "—" : `${value} kg`,
                      "Top set",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="topWeight"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    connectNulls
                    dot={{ fill: "var(--primary)", r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
