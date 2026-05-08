import { AlertCircle, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExercises } from "@/hooks/use-exercises";
import { ApiError } from "@/lib/api-client";
import { categoryLabel } from "@/lib/format";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryFilters: Array<{ value: Category | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "Upper", label: "Superior" },
  { value: "Lower", label: "Inferior" },
  { value: "Cardio", label: "Cardio" },
];

export function ExercisesPage() {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useExercises();

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((ex) => {
      if (filter !== "all" && ex.category !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const inName = ex.name.toLowerCase().includes(q);
        const inMuscle = ex.muscleGroups.some((m) =>
          m.muscleGroup.toLowerCase().includes(q),
        );
        if (!inName && !inMuscle) return false;
      }
      return true;
    });
  }, [data, filter, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Exercícios"
        description="Veja todos os exercícios cadastrados e selecione para os seus treinos."
        action={
          <Button asChild variant="outline">
            <Link to="/exercises/manage">
              <SlidersHorizontal className="size-4" />
              Gerenciar
            </Link>
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício ou grupo muscular"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="flex gap-2">
            {categoryFilters.map((f) => (
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
      </div>

      <div className="mt-6">
        {isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro ao carregar catálogo"
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
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nenhum exercício encontrado"
            description={
              query || filter !== "all"
                ? "Tente outro termo ou categoria."
                : "Adicione o primeiro exercício do seu catálogo."
            }
            action={
              <Button asChild>
                <Link to="/exercises/manage">
                  <Plus className="size-4" />
                  Adicionar exercício
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((ex) => (
              <li
                key={ex.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {categoryLabel(ex.category)}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold">
                      {ex.name}
                    </h3>
                  </div>
                </div>
                {ex.muscleGroups.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {ex.muscleGroups.map((m) => (
                      <Badge key={m.id} variant="muted">
                        {m.muscleGroup}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
