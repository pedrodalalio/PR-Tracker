import {
  AlertCircle,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteWorkoutTemplate,
  useWorkoutTemplates,
} from "@/hooks/use-workout-templates";
import { ApiError } from "@/lib/api-client";
import { workoutTypeLabel } from "@/lib/format";

export function WorkoutTemplatesPage() {
  const { data, isLoading, isError, error, refetch } = useWorkoutTemplates();
  const remove = useDeleteWorkoutTemplate();
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success("Modelo removido");
      setToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o modelo",
      );
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Modelos de treino"
        description="Monte estruturas reutilizáveis com a ordem e número de séries de cada exercício."
        action={
          <Button asChild size="lg">
            <Link to="/templates/new">
              <Plus className="size-4" />
              Novo modelo
            </Link>
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar modelos"
          description={
            error instanceof ApiError
              ? error.message
              : "Não foi possível buscar a lista."
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
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum modelo ainda"
          description="Crie um modelo com seus exercícios favoritos e use de base ao iniciar um treino."
          action={
            <Button asChild>
              <Link to="/templates/new">
                <Plus className="size-4" />
                Criar modelo
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data!.map((t) => (
            <li
              key={t.id}
              className="overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {t.exercises.length} exercício
                    {t.exercises.length === 1 ? "" : "s"}
                  </p>
                  <h3 className="mt-1 line-clamp-1 font-display text-lg font-semibold">
                    {t.name}
                  </h3>
                </div>
                <Badge variant="muted">{workoutTypeLabel(t.workoutType)}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {t.exercises.slice(0, 4).map((ex) => (
                  <li key={ex.id} className="line-clamp-1">
                    {ex.exercise.name}
                  </li>
                ))}
                {t.exercises.length > 4 && (
                  <li className="text-[11px]">
                    +{t.exercises.length - 4} mais
                  </li>
                )}
              </ul>
              <div className="mt-3 flex justify-end gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/templates/${t.id}/edit`}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToDelete({ id: t.id, name: t.name })}
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover modelo?</DialogTitle>
            <DialogDescription>
              {toDelete
                ? `"${toDelete.name}" não poderá ser usado em novos treinos. Treinos já criados a partir dele não são afetados.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={remove.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
