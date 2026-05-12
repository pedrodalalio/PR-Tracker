import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  WorkoutTemplateForm,
  type TemplateFormValues,
} from "@/components/workout-template-form";
import { useCreateWorkoutTemplate } from "@/hooks/use-workout-templates";
import { ApiError } from "@/lib/api-client";

export function NewWorkoutTemplatePage() {
  const navigate = useNavigate();
  const create = useCreateWorkoutTemplate();

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      await create.mutateAsync({
        name: values.name,
        workoutType: values.workoutType,
        exercises: values.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          notes: ex.notes,
        })),
      });
      toast.success("Modelo criado");
      navigate("/templates", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o modelo",
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
        eyebrow="Novo modelo"
        title="Crie um modelo"
        description="Defina o tipo, escolha os exercícios na ordem em que pretende fazer e configure séries-alvo."
      />

      <WorkoutTemplateForm
        defaultValues={{
          name: "",
          workoutType: "upper",
          exercises: [],
        }}
        onSubmit={onSubmit}
        submitLabel="Salvar modelo"
        isSubmitting={create.isPending}
        cancelTo="/templates"
      />
    </div>
  );
}
