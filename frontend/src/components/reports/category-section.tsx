import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { workoutTypeLabel } from "@/lib/format";
import type { WorkoutType } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { PeriodMetrics } from "./utils";

interface CategorySectionProps {
  current: PeriodMetrics;
}

export function CategorySection({ current }: CategorySectionProps) {
  const total = current.totalWorkouts;
  const rows: Array<{ key: WorkoutType; label: string; value: number }> = [
    { key: "upper", label: workoutTypeLabel("upper"), value: current.byType.upper },
    { key: "lower", label: workoutTypeLabel("lower"), value: current.byType.lower },
    {
      key: "cardio",
      label: workoutTypeLabel("cardio"),
      value: current.byType.cardio,
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Distribuição
        </p>
        <h2 className="font-display text-lg font-semibold">Treinos por categoria</h2>
      </header>
      {total === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sem treinos nesse mês"
          description="Quando você registrar treinos, a distribuição aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const pct = total === 0 ? 0 : Math.round((row.value / total) * 100);
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{row.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.value} · {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      row.key === "upper" && "bg-primary",
                      row.key === "lower" &&
                        "bg-amber-500/80 dark:bg-amber-400/80",
                      row.key === "cardio" &&
                        "bg-sky-500/80 dark:bg-sky-400/80",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
