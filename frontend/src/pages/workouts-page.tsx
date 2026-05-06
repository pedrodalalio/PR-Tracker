import { Calendar, Dumbbell, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkouts } from "@/hooks/use-workouts";
import {
  dayOfWeekLabel,
  formatDate,
  formatRelative,
  workoutTypeLabel,
} from "@/lib/format";
import type { WorkoutType } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: Array<{ value: WorkoutType | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "upper", label: "Superior" },
  { value: "lower", label: "Inferior" },
  { value: "cardio", label: "Cardio" },
];

export function WorkoutsPage() {
  const [filter, setFilter] = useState<WorkoutType | "all">("all");
  const { data, isLoading } = useWorkouts();

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((w) => w.workoutType === filter);
  }, [data, filter]);

  return (
    <div>
      <PageHeader
        eyebrow="Histórico"
        title="Seus treinos"
        description="Veja, edite e revise todos os treinos que você registrou."
        action={
          <Button asChild size="lg">
            <Link to="/workouts/new">
              <Plus className="size-4" />
              Novo treino
            </Link>
          </Button>
        }
      />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={
            filter === "all"
              ? "Nenhum treino ainda"
              : "Nenhum treino com esse filtro"
          }
          description={
            filter === "all"
              ? "Registre seu primeiro treino para começar a ver seu progresso."
              : "Tente outra categoria ou crie um treino agora."
          }
          action={
            <Button asChild>
              <Link to="/workouts/new">Iniciar treino</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((w) => {
            const totalSets = w.exercises.reduce(
              (acc, ex) => acc + ex.sets.length,
              0,
            );
            return (
              <li key={w.id}>
                <Link
                  to={`/workouts/${w.id}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {formatRelative(w.date)} · {dayOfWeekLabel(w.dayOfWeek)}
                      </p>
                      <h3 className="mt-1 line-clamp-1 font-display text-lg font-semibold">
                        {w.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(w.date, "PPP")}
                      </p>
                    </div>
                    <Badge variant="muted">
                      {workoutTypeLabel(w.workoutType)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Dumbbell className="size-3.5" />
                      <span className="font-mono text-foreground">
                        {w.exercises.length}
                      </span>
                      exercício{w.exercises.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span className="font-mono text-foreground">
                        {totalSets}
                      </span>
                      séries
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
