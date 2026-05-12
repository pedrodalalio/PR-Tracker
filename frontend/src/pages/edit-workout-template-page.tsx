import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  WorkoutTemplateForm,
  type TemplateFormValues,
} from "@/components/workout-template-form";
import {
  useUpdateWorkoutTemplate,
  useWorkoutTemplate,
} from "@/hooks/use-workout-templates";
import { ApiError } from "@/lib/api-client";

export function EditWorkoutTemplatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const templateQuery = useWorkoutTemplate(id);
  const update = useUpdateWorkoutTemplate(id ?? "");

  const defaults = useMemo<TemplateFormValues | null>(() => {
    if (!templateQuery.data) return null;
    const t = templateQuery.data;
    if (t.workoutType === "cardio") return null;
    return {
      name: t.name,
      workoutType: t.workoutType,
      exercises: t.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        notes: ex.notes ?? "",
      })),
    };
  }, [templateQuery.data]);

  if (templateQuery.isLoading || !id) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templateQuery.isError || !defaults) {
    return (
      <EmptyState
        title="Modelo não encontrado"
        description={
          templateQuery.error instanceof ApiError
            ? templateQuery.error.message
            : "Pode ter sido removido ou nunca existiu."
        }
        action={
          <Button asChild>
            <Link to="/templates">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      await update.mutateAsync({
        name: values.name,
        workoutType: values.workoutType,
        exercises: values.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          notes: ex.notes,
        })),
      });
      toast.success("Modelo atualizado");
      navigate("/templates", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o modelo",
      );
    }
  };

  return (
    <div>
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/templates">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Editando"
        title={defaults.name}
        description="Altere a ordem, exercícios ou séries-alvo."
      />

      <WorkoutTemplateForm
        defaultValues={defaults}
        onSubmit={onSubmit}
        submitLabel="Salvar alterações"
        isSubmitting={update.isPending}
        cancelTo="/templates"
      />
    </div>
  );
}
