import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  WorkoutForm,
  dayOfWeekFromDate,
  localDateToIso,
  todayLocalDateString,
  type WorkoutFormValues,
} from "@/components/workout-form";
import { useCreateWorkout } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api-client";

export function NewWorkoutPage() {
  const navigate = useNavigate();
  const create = useCreateWorkout();

  const onSubmit = async (values: WorkoutFormValues) => {
    try {
      const created = await create.mutateAsync({
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
      toast.success("Treino registrado!");
      navigate(`/workouts/${created.id}`, { replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o treino",
      );
    }
  };

  return (
    <div>
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/workouts">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Novo treino"
        title="Registre seu treino"
        description="Adicione exercícios, séries e cargas. Você pode editar depois."
      />

      <WorkoutForm
        defaultValues={{
          name: "",
          date: todayLocalDateString(),
          workoutType: "upper",
          notes: "",
          exercises: [],
        }}
        onSubmit={onSubmit}
        submitLabel="Salvar treino"
        isSubmitting={create.isPending}
        cancelTo="/workouts"
      />
    </div>
  );
}
