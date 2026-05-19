import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { NewExerciseDialog } from "@/components/new-exercise-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExercises } from "@/hooks/use-exercises";
import { categoryLabel, workoutTypeLabel } from "@/lib/format";
import type { Category } from "@/lib/types";

function templateTypeToCategory(type: "upper" | "lower"): Category {
  return type === "lower" ? "Lower" : "Upper";
}

const templateExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Escolha um exercício"),
  notes: z.string().optional(),
});

export const templateFormSchema = z.object({
  name: z.string().min(1, "Dê um nome ao modelo"),
  workoutType: z.enum(["upper", "lower"]),
  exercises: z
    .array(templateExerciseSchema)
    .min(1, "Adicione pelo menos um exercício"),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface WorkoutTemplateFormProps {
  defaultValues: TemplateFormValues;
  onSubmit: (values: TemplateFormValues) => Promise<void> | void;
  submitLabel: string;
  isSubmitting?: boolean;
  cancelTo: string;
}

export function WorkoutTemplateForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  cancelTo,
}: WorkoutTemplateFormProps) {
  const navigate = useNavigate();
  const exercises = useExercises();
  const [creatingFor, setCreatingFor] = useState<{
    rowIndex: number;
    defaultName: string;
  } | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues,
  });

  const exerciseFields = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const watchedType = form.watch("workoutType");
  const watchedExercises = form.watch("exercises");
  const targetCategory = templateTypeToCategory(watchedType);

  // Limpa exerciseIds que não batem com a nova categoria ao trocar tipo.
  useEffect(() => {
    const exData = exercises.data;
    if (!exData) return;
    const target = templateTypeToCategory(watchedType);
    const current = form.getValues("exercises");
    current.forEach((ex, i) => {
      if (!ex.exerciseId) return;
      const data = exData.find((e) => e.id === ex.exerciseId);
      if (data && data.category !== target) {
        form.setValue(`exercises.${i}.exerciseId`, "", {
          shouldValidate: false,
        });
      }
    });
  }, [watchedType, exercises.data, form]);

  const availablePerRow = useMemo(() => {
    const exData = exercises.data;
    if (!exData) return [] as (typeof exData)[];
    const otherIds = (idx: number) =>
      new Set(
        (watchedExercises ?? [])
          .map((e, i) => (i === idx ? "" : e.exerciseId))
          .filter(Boolean),
      );
    return (watchedExercises ?? []).map((ex, idx) => {
      const myId = ex.exerciseId;
      const exclude = otherIds(idx);
      return exData.filter((e) => {
        if (e.id === myId) return true;
        if (e.category !== targetCategory) return false;
        if (exclude.has(e.id)) return false;
        return true;
      });
    });
  }, [exercises.data, watchedExercises, targetCategory]);

  const appendExerciseRow = () =>
    exerciseFields.append({
      exerciseId: "",
      notes: "",
    });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 pb-24"
        >
          <section className="rounded-xl border border-border bg-card p-5 space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Peito + Tríceps" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workoutType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["upper", "lower"] as const).map((t) => (
                        <SelectItem key={t} value={t}>
                          {workoutTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Exercícios
                </h2>
                <p className="text-xs text-muted-foreground">
                  A ordem aqui é a ordem que aparece no treino.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={appendExerciseRow}
              >
                <Plus className="size-4" />
                Adicionar
              </Button>
            </header>

            {exerciseFields.fields.length === 0 && (
              <EmptyState
                title="Sem exercícios ainda"
                description="Adicione exercícios na ordem em que pretende treinar."
                action={
                  <Button type="button" onClick={appendExerciseRow}>
                    <Plus className="size-4" />
                    Adicionar exercício
                  </Button>
                }
              />
            )}

            <ul className="space-y-3">
              {exerciseFields.fields.map((field, exerciseIndex) => (
                <li
                  key={field.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
                      {exerciseIndex + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <FormField
                        control={form.control}
                        name={`exercises.${exerciseIndex}.exerciseId`}
                        render={({ field: f }) => {
                          const rowOptions =
                            availablePerRow[exerciseIndex] ?? [];
                          const emptyMessage =
                            (exercises.data ?? []).length === 0
                              ? "Cadastre um exercício antes"
                              : `Nenhum exercício de ${categoryLabel(
                                  targetCategory,
                                )} encontrado`;
                          return (
                            <FormItem>
                              <FormLabel className="sr-only">
                                Exercício
                              </FormLabel>
                              <FormControl>
                                <ExerciseCombobox
                                  value={f.value}
                                  onChange={f.onChange}
                                  options={rowOptions}
                                  loading={exercises.isLoading}
                                  emptyMessage={emptyMessage}
                                  onCreateRequest={(query) =>
                                    setCreatingFor({
                                      rowIndex: exerciseIndex,
                                      defaultName: query,
                                    })
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          exerciseIndex > 0 &&
                          exerciseFields.move(exerciseIndex, exerciseIndex - 1)
                        }
                        disabled={exerciseIndex === 0}
                        aria-label="Subir"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          exerciseIndex < exerciseFields.fields.length - 1 &&
                          exerciseFields.move(exerciseIndex, exerciseIndex + 1)
                        }
                        disabled={
                          exerciseIndex === exerciseFields.fields.length - 1
                        }
                        aria-label="Descer"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => exerciseFields.remove(exerciseIndex)}
                        aria-label="Remover exercício"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {form.formState.errors.exercises &&
              !Array.isArray(form.formState.errors.exercises) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.exercises.message}
                </p>
              )}
          </section>

          <div className="fixed inset-x-0 bottom-above-nav z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:static md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 md:px-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(cancelTo)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="md:min-w-40"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </Form>
      <NewExerciseDialog
        open={creatingFor !== null}
        onOpenChange={(open) => {
          if (!open) setCreatingFor(null);
        }}
        defaultName={creatingFor?.defaultName ?? ""}
        lockedCategory={targetCategory}
        onCreated={(exercise) => {
          if (creatingFor) {
            form.setValue(
              `exercises.${creatingFor.rowIndex}.exerciseId`,
              exercise.id,
              { shouldValidate: true },
            );
          }
          setCreatingFor(null);
        }}
      />
    </>
  );
}
