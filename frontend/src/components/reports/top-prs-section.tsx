import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Award, Dumbbell } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "@/components/empty-state";
import type { Workout } from "@/lib/types";

interface TopAndPRsSectionProps {
  allWorkouts: Workout[];
  workoutsInPeriod: Workout[];
  start: Date;
  end: Date;
}

interface TopExercise {
  exerciseId: string;
  name: string;
  sessions: number;
  topWeight: number;
}

interface PeriodPR {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
}

export function TopAndPRsSection({
  allWorkouts,
  workoutsInPeriod,
  start,
  end,
}: TopAndPRsSectionProps) {
  const top = useMemo<TopExercise[]>(() => {
    const map = new Map<string, TopExercise>();
    for (const w of workoutsInPeriod) {
      for (const we of w.exercises) {
        const cur = map.get(we.exerciseId);
        const top = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        if (cur) {
          cur.sessions += 1;
          if (top > cur.topWeight) cur.topWeight = top;
        } else {
          map.set(we.exerciseId, {
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            sessions: 1,
            topWeight: top,
          });
        }
      }
    }
    return [...map.values()]
      .sort(
        (a, b) =>
          b.sessions - a.sessions ||
          b.topWeight - a.topWeight ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 5);
  }, [workoutsInPeriod]);

  const prs = useMemo<PeriodPR[]>(() => {
    // Para cada exercício, encontre o melhor peso *antes* do início do período.
    const bestBefore = new Map<string, number>();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate >= start) continue;
      for (const we of w.exercises) {
        const top = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        const cur = bestBefore.get(we.exerciseId) ?? 0;
        if (top > cur) bestBefore.set(we.exerciseId, top);
      }
    }

    // No período, encontre o melhor peso por exercício e marque PRs (acima do bestBefore).
    const periodBest = new Map<
      string,
      { name: string; weight: number; reps: number; date: string }
    >();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate < start || wDate > end) continue;
      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) =>
            s.weight > best.weight ||
            (s.weight === best.weight && s.reps > best.reps)
              ? s
              : best,
          { weight: 0, reps: 0 },
        );
        if (topSet.weight <= 0) continue;
        const cur = periodBest.get(we.exerciseId);
        if (
          !cur ||
          topSet.weight > cur.weight ||
          (topSet.weight === cur.weight && topSet.reps > cur.reps)
        ) {
          periodBest.set(we.exerciseId, {
            name: we.exercise.name,
            weight: topSet.weight,
            reps: topSet.reps,
            date: w.date,
          });
        }
      }
    }

    const results: PeriodPR[] = [];
    for (const [exerciseId, data] of periodBest) {
      const before = bestBefore.get(exerciseId) ?? 0;
      if (data.weight > before) {
        results.push({ exerciseId, ...data });
      }
    }
    return results.sort((a, b) => b.weight - a.weight);
  }, [allWorkouts, start, end]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Frequência
          </p>
          <h2 className="font-display text-lg font-semibold">
            Top exercícios
          </h2>
        </header>
        {top.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sem exercícios no período"
            description="Quando você registrar treinos, os mais frequentes aparecem aqui."
          />
        ) : (
          <ul className="space-y-3">
            {top.map((ex, i) => (
              <li
                key={ex.exerciseId}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5"
              >
                <span className="grid size-7 place-items-center rounded-md bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{ex.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {ex.sessions} sessão{ex.sessions === 1 ? "" : "ões"}
                    {ex.topWeight > 0 && (
                      <>
                        {" · "}
                        top {ex.topWeight} kg
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Recordes
            </p>
            <h2 className="font-display text-lg font-semibold">
              PRs no período
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {prs.length} novo{prs.length === 1 ? "" : "s"}
          </span>
        </header>
        {prs.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Sem PRs novos"
            description="Quando você bater uma carga máxima, ela aparece aqui."
          />
        ) : (
          <ul className="space-y-3">
            {prs.map((pr) => (
              <li
                key={pr.exerciseId}
                className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5"
              >
                <Award className="size-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{pr.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {pr.weight} kg × {pr.reps}
                    {" · "}
                    {format(new Date(pr.date), "dd/MM", { locale: ptBR })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
