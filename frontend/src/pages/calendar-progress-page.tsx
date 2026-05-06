import {
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals } from "@/hooks/use-goals";
import { useWorkouts } from "@/hooks/use-workouts";
import { cn } from "@/lib/utils";

const WEEKS_TO_SHOW = 12;

export function CalendarProgressPage() {
  const workouts = useWorkouts();
  const goals = useGoals();
  const goal = goals.data?.weeklyWorkoutGoal ?? 3;

  const weeks = useMemo(() => {
    const today = new Date();
    return Array.from({ length: WEEKS_TO_SHOW }).map((_, i) => {
      const ref = subWeeks(today, i);
      const start = startOfWeek(ref, { weekStartsOn: 1 });
      const end = endOfWeek(ref, { weekStartsOn: 1 });
      const count = (workouts.data ?? []).filter((w) =>
        isSameWeek(new Date(w.date), ref, { weekStartsOn: 1 }),
      ).length;
      return { start, end, count, isCurrent: i === 0 };
    });
  }, [workouts.data]);

  return (
    <div>
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/calendar">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Histórico"
        title="Progresso semanal"
        description={`Meta atual: ${goal} treinos por semana.`}
      />

      {workouts.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {weeks.map(({ start, end, count, isCurrent }) => {
            const pct = Math.min(100, (count / Math.max(1, goal)) * 100);
            const completed = count >= goal;
            return (
              <li
                key={start.toISOString()}
                className={cn(
                  "rounded-xl border border-border bg-card p-4",
                  isCurrent && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {isCurrent ? "Esta semana" : "Semana"}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      {format(start, "dd MMM", { locale: ptBR })} –{" "}
                      {format(end, "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">
                      <span
                        className={cn(
                          completed ? "text-primary" : "text-foreground",
                        )}
                      >
                        {count}
                      </span>
                      <span className="text-muted-foreground">/{goal}</span>
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {completed ? "Meta atingida" : "Em andamento"}
                    </p>
                  </div>
                </div>
                <Progress value={pct} className="mt-3 h-1.5" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
