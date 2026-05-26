import {
  AlertCircle,
  Calendar,
  Dumbbell,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBulkDeleteWorkouts, useWorkouts } from "@/hooks/use-workouts";
import { workoutsApi } from "@/services/workouts-api";
import { useQueryClient } from "@tanstack/react-query";
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
];

export function WorkoutsPage() {
  const [filter, setFilter] = useState<WorkoutType | "all">("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { data, isLoading, isError, error, refetch } = useWorkouts();
  const bulkDelete = useBulkDeleteWorkouts();
  const qc = useQueryClient();

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const onBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(
        `${ids.length} treino${ids.length === 1 ? "" : "s"} removido${
          ids.length === 1 ? "" : "s"
        }`,
        {
          action: {
            label: "Desfazer",
            onClick: async () => {
              try {
                await Promise.all(ids.map((id) => workoutsApi.restore(id)));
                qc.invalidateQueries({ queryKey: ["workouts"] });
                qc.invalidateQueries({ queryKey: ["goals"] });
                toast.success("Treinos restaurados");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Falha ao restaurar",
                );
              }
            },
          },
        },
      );
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  };

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
          <div className="flex items-center gap-2">
            <ExportMenu resource="workouts" />
            <Button
              variant={selectMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? "Cancelar" : "Selecionar"}
            </Button>
            <Button asChild size="lg">
              <Link to="/workouts/new">
                <Plus className="size-4" />
                Novo treino
              </Link>
            </Button>
          </div>
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
            const isSelected = selected.has(w.id);
            const cardInner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                  {selectMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      aria-label="Selecionar treino"
                      className="mt-1 size-4 shrink-0 accent-primary"
                    />
                  ) : (
                    <Badge variant="muted">
                      {workoutTypeLabel(w.workoutType)}
                    </Badge>
                  )}
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
              </>
            );
            return (
              <li key={w.id}>
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => toggleSelected(w.id)}
                    className={cn(
                      "block w-full overflow-hidden rounded-xl border bg-card p-4 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {cardInner}
                  </button>
                ) : (
                  <Link
                    to={`/workouts/${w.id}`}
                    className="group block overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    {cardInner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {selectMode && selected.size > 0 && (
        <div className="sticky bottom-20 z-20 mx-auto mt-4 flex max-w-md items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg safe-bottom md:bottom-4">
          <span className="font-mono text-sm">
            {selected.size} selecionado{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={exitSelectMode}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
