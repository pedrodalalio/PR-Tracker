import { AlertCircle, Calendar, Dumbbell, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkouts } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api-client";
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
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading, isError, error, refetch } = useWorkouts();

  const hasFilters =
    filter !== "all" || query.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return list.filter((w) => {
      if (filter !== "all" && w.workoutType !== filter) return false;
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (fromTs !== null && new Date(w.date).getTime() < fromTs) return false;
      if (toTs !== null && new Date(w.date).getTime() > toTs) return false;
      return true;
    });
  }, [data, filter, query, dateFrom, dateTo]);

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

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do treino…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="-mx-4 flex-1 overflow-x-auto px-4 md:mx-0 md:px-0">
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
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Data inicial"
              className="w-auto"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Data final"
              className="w-auto"
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearFilters}
                aria-label="Limpar filtros"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar treinos"
          description={
            error instanceof ApiError
              ? error.message
              : "Não foi possível buscar a lista. Verifique sua conexão."
          }
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Tentar de novo
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={
            hasFilters
              ? "Nenhum treino com esses filtros"
              : "Nenhum treino ainda"
          }
          description={
            hasFilters
              ? "Tente ajustar os filtros ou criar um treino novo."
              : "Registre seu primeiro treino para começar a ver seu progresso."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link to="/workouts/new">Iniciar treino</Link>
              </Button>
            )
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
