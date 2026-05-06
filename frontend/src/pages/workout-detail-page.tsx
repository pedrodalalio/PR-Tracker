import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
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
  useDeleteWorkout,
  useWorkout,
} from "@/hooks/use-workouts";
import {
  dayOfWeekLabel,
  formatDate,
  workoutTypeLabel,
} from "@/lib/format";
import { ApiError } from "@/lib/api-client";

export function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useWorkout(id);
  const remove = useDeleteWorkout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onDelete = async () => {
    if (!id) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Treino removido");
      navigate("/workouts", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o treino",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Treino não encontrado"
        description={
          error instanceof ApiError
            ? error.message
            : "Pode ter sido removido ou nunca existiu."
        }
        action={
          <Button asChild>
            <Link to="/workouts">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/workouts">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
            {formatDate(data.date, "EEEE, dd 'de' MMMM")} ·{" "}
            {dayOfWeekLabel(data.dayOfWeek)}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {data.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{workoutTypeLabel(data.workoutType)}</Badge>
            <Badge variant="muted">
              {data.exercises.length} exercício
              {data.exercises.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link to={`/workouts/${data.id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={remove.isPending}
          >
            <Trash2 className="size-4" />
            Remover
          </Button>
        </div>
      </header>

      {data.notes && (
        <section className="rounded-xl border border-border bg-card/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Notas
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{data.notes}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Exercícios</h2>
        {data.exercises.length === 0 ? (
          <EmptyState
            title="Nenhum exercício registrado"
            description="Esse treino foi criado sem exercícios."
          />
        ) : (
          <ul className="space-y-3">
            {data.exercises.map((we) => (
              <li
                key={we.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-base font-semibold">
                    {we.exercise.name}
                  </h3>
                  <Badge variant="muted">
                    {we.sets.length} série{we.sets.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {we.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {we.notes}
                  </p>
                )}
                {we.sets.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          <th className="pb-2 pr-3 font-mono font-normal">#</th>
                          <th className="pb-2 pr-3 font-mono font-normal">
                            Reps
                          </th>
                          <th className="pb-2 pr-3 font-mono font-normal">
                            Carga (kg)
                          </th>
                          {we.sets.some((s) => s.duration != null) && (
                            <th className="pb-2 pr-3 font-mono font-normal">
                              Tempo
                            </th>
                          )}
                          {we.sets.some((s) => s.distance != null) && (
                            <th className="pb-2 pr-3 font-mono font-normal">
                              Distância
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {we.sets.map((s, idx) => (
                          <tr key={s.id}>
                            <td className="py-2 pr-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2 pr-3 font-mono">{s.reps}</td>
                            <td className="py-2 pr-3 font-mono">
                              {s.weight}
                            </td>
                            {s.duration != null && (
                              <td className="py-2 pr-3 font-mono">
                                {s.duration}s
                              </td>
                            )}
                            {s.distance != null && (
                              <td className="py-2 pr-3 font-mono">
                                {s.distance}m
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover treino?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={remove.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
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
