import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  WorkoutForm,
  dayOfWeekFromDate,
  isoToLocalDateString,
  localDateToIso,
  type WorkoutFormValues,
} from "@/components/workout-form";
import { useUpdateWorkout, useWorkout } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api-client";

export function EditWorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workoutQuery = useWorkout(id);
  const update = useUpdateWorkout(id ?? "");

  const defaults = useMemo<WorkoutFormValues | null>(() => {
    if (!workoutQuery.data) return null;
    const w = workoutQuery.data;
    return {
      name: w.name,
      date: isoToLocalDateString(w.date),
      workoutType: w.workoutType,
      notes: w.notes ?? "",
      exercises: w.exercises.map((we) => ({
        exerciseId: we.exerciseId,
        notes: we.notes ?? "",
        sets: we.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
      })),
    };
  }, [workoutQuery.data]);

  if (workoutQuery.isLoading || !id) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workoutQuery.isError || !defaults) {
    return (
      <EmptyState
        title="Treino não encontrado"
        description={
          workoutQuery.error instanceof ApiError
            ? workoutQuery.error.message
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

  const onSubmit = async (values: WorkoutFormValues) => {
    try {
      await update.mutateAsync({
        name: values.name,
        date: localDateToIso(values.date),
        workoutType: values.workoutType,
        dayOfWeek: dayOfWeekFromDate(values.date),
        notes: values.notes || undefined,
        exercises: values.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
        })),
      });
      toast.success("Treino atualizado");
      navigate(`/workouts/${id}`, { replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o treino",
      );
    }
  };

  return (
    <div>
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/workouts/${id}`}>
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Editando"
        title={defaults.name}
        description="Altere o que precisar. As séries e exercícios serão substituídos pelo que estiver no formulário."
      />

      <WorkoutForm
        defaultValues={defaults}
        onSubmit={onSubmit}
        submitLabel="Salvar alterações"
        isSubmitting={update.isPending}
        cancelTo={`/workouts/${id}`}
      />
    </div>
  );
}
