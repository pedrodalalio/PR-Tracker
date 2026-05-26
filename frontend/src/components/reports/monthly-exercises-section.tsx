import { format } from "date-fns";
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

interface ExerciseChartPoint {
  date: string;
  dateLabel: string;
  weight: number;
  reps: number;
}

interface ExerciseSeries {
  exerciseId: string;
  name: string;
  category: string;
  sessions: number;
  topWeight: number;
  topReps: number;
  minWeight: number;
  delta: number;
  points: ExerciseChartPoint[];
}

export function MonthlyExercisesSection({
  workoutsInPeriod,
}: {
  workoutsInPeriod: Workout[];
}) {
  const series = useMemo<ExerciseSeries[]>(() => {
    const map = new Map<string, ExerciseSeries>();

    const sortedByDate = [...workoutsInPeriod].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    for (const w of sortedByDate) {
      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) =>
            s.weight > best.weight ||
            (s.weight === best.weight && s.reps > best.reps)
              ? s
              : best,
          { weight: 0, reps: 0 },
        );

        // Pula sets sem carga (cardio etc.) — gráfico de peso não faz sentido
        if (topSet.weight <= 0) continue;

        const point: ExerciseChartPoint = {
          date: w.date,
          dateLabel: format(new Date(w.date), "dd/MM", { locale: ptBR }),
          weight: topSet.weight,
          reps: topSet.reps,
        };

        const existing = map.get(we.exerciseId);
        if (existing) {
          existing.points.push(point);
          existing.sessions += 1;
          if (
            point.weight > existing.topWeight ||
            (point.weight === existing.topWeight &&
              point.reps > existing.topReps)
          ) {
            existing.topWeight = point.weight;
            existing.topReps = point.reps;
          }
          if (point.weight < existing.minWeight) {
            existing.minWeight = point.weight;
          }
        } else {
          map.set(we.exerciseId, {
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            category: we.exercise.category,
            sessions: 1,
            topWeight: point.weight,
            topReps: point.reps,
            minWeight: point.weight,
            delta: 0,
            points: [point],
          });
        }
      }
    }

    const result = [...map.values()];
    for (const s of result) {
      s.delta =
        Math.round(
          (s.points[s.points.length - 1]!.weight - s.points[0]!.weight) * 10,
        ) / 10;
    }

    return result.sort(
      (a, b) =>
        b.sessions - a.sessions ||
        b.topWeight - a.topWeight ||
        a.name.localeCompare(b.name),
    );
  }, [workoutsInPeriod]);

  if (series.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Cargas
          </p>
          <h2 className="font-display text-lg font-semibold">
            Exercícios do mês
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top set por sessão de cada exercício com carga registrada.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {series.length} exercício{series.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <ExerciseMiniChart key={s.exerciseId} series={s} />
        ))}
      </div>
    </section>
  );
}

function ExerciseMiniChart({ series }: { series: ExerciseSeries }) {
  const single = series.points.length < 2;

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-medium">{series.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {categoryLabel(series.category)} · {series.sessions} sessão
            {series.sessions === 1 ? "" : "ões"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs font-semibold text-primary">
            {series.topWeight} kg
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            × {series.topReps}
          </p>
        </div>
      </div>

      <div className="mt-3 h-24 w-full md:h-28">
        {single ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
            só 1 sessão no mês
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series.points}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <YAxis
                hide
                domain={[
                  (dataMin: number) => Math.floor(dataMin - 1),
                  (dataMax: number) => Math.ceil(dataMax + 1),
                ]}
              />
              <XAxis dataKey="dateLabel" hide />
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
                formatter={(_v, _n, item) => {
                  const p = item.payload as ExerciseChartPoint;
                  return [`${p.weight} kg × ${p.reps}`, "Top set"];
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {!single && (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            min{" "}
            <span className="text-foreground">{series.minWeight} kg</span>
          </span>
          <span
            className={cn(
              series.delta > 0 && "text-emerald-700 dark:text-emerald-400",
              series.delta < 0 && "text-amber-700 dark:text-amber-400",
            )}
          >
            {series.delta > 0 ? "+" : ""}
            {series.delta} kg
          </span>
        </div>
      )}
    </div>
  );
}
