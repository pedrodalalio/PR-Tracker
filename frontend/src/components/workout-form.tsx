import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
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
import {
  workoutTypeSchema,
  type Category,
  type WeekDay,
  type WorkoutType,
} from "@/lib/types";

function workoutTypeToCategory(type: WorkoutType): Category {
  if (type === "lower") return "Lower";
  if (type === "cardio") return "Cardio"; // legado — não criamos novos cardio
  return "Upper";
}

const setSchema = z.object({
  reps: z.number().int().nonnegative("Reps inválidos"),
  weight: z.number().nonnegative("Carga inválida"),
  // Cardio sets legados — preservados em edits, não editáveis pela UI atual.
  duration: z.number().int().nullable().optional(),
  distance: z.number().nullable().optional(),
  pace: z.number().nullable().optional(),
});

const exerciseSchema = z.object({
  exerciseId: z.string().min(1, "Escolha um exercício"),
  notes: z.string().optional(),
  sets: z.array(setSchema).min(1, "Adicione pelo menos uma série"),
});

export const workoutFormSchema = z.object({
  name: z.string().min(1, "Dê um nome ao treino"),
  date: z.string().min(1, "Escolha uma data"),
  workoutType: workoutTypeSchema,
  notes: z.string().optional(),
  exercises: z
    .array(exerciseSchema)
    .min(1, "Adicione pelo menos um exercício"),
});

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;

const weekDayByIndex: WeekDay[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export function dayOfWeekFromDate(isoDate: string): WeekDay {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return weekDayByIndex[date.getDay()] ?? "segunda";
}

export function localDateToIso(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0).toISOString();
}

export function todayLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoToLocalDateString(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface WorkoutFormProps {
  defaultValues: WorkoutFormValues;
  onSubmit: (values: WorkoutFormValues) => Promise<void> | void;
  submitLabel: string;
  isSubmitting?: boolean;
  cancelTo: string;
}

export function WorkoutForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  cancelTo,
}: WorkoutFormProps) {
  const navigate = useNavigate();
  const exercises = useExercises();
  const [creatingFor, setCreatingFor] = useState<{
    rowIndex: number;
    defaultName: string;
  } | null>(null);

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues,
  });

  const exerciseFields = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const watchedType = form.watch("workoutType");
  const watchedExercises = form.watch("exercises");
  const targetCategory = workoutTypeToCategory(watchedType);

  // Quando o tipo muda, limpa exercícios que não batem com a nova categoria.
  useEffect(() => {
    const exData = exercises.data;
    if (!exData) return;
    const target = workoutTypeToCategory(watchedType);
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
      sets: [{ reps: 10, weight: 0 }],
    });

  return (
    <>
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 pb-24"
      >
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Como foi o treino, observações..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Exercícios</h2>
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
              description="Adicione exercícios e suas séries para registrar o treino."
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
                className="rounded-xl border border-border bg-card p-4 space-y-4"
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
                            : `Nenhum exercício de ${categoryLabel(targetCategory)} encontrado`;
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

                <SetsField exerciseIndex={exerciseIndex} />
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

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur safe-bottom md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
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

function SetsField({ exerciseIndex }: { exerciseIndex: number }) {
  const { control } = useFormContext<WorkoutFormValues>();
  const sets = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.sets`,
  });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>#</span>
        <span>Reps</span>
        <span>Carga (kg)</span>
        <span />
      </div>
      <ul className="space-y-2">
        {sets.fields.map((field, setIndex) => (
          <li
            key={field.id}
            className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"
          >
            <span className="grid size-8 place-items-center rounded-md bg-muted font-mono text-xs font-semibold text-muted-foreground">
              {setIndex + 1}
            </span>
            <Controller
              control={control}
              name={`exercises.${exerciseIndex}.sets.${setIndex}.reps`}
              render={({ field: f }) => (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="text-center font-mono"
                  value={Number.isFinite(f.value) ? f.value : ""}
                  onChange={(e) =>
                    f.onChange(
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                />
              )}
            />
            <Controller
              control={control}
              name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
              render={({ field: f }) => (
                <WeightInput value={f.value} onChange={f.onChange} />
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => sets.remove(setIndex)}
              disabled={sets.fields.length === 1}
              aria-label="Remover série"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => sets.append({ reps: 10, weight: 0 })}
      >
        <Plus className="size-4" />
        Adicionar série
      </Button>
    </div>
  );
}

function WeightInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(() => weightToText(value));
  const [tracked, setTracked] = useState(value);

  // Resync local text if the form value changes externally (reset, default load).
  if (value !== tracked) {
    setTracked(value);
    if (parseWeight(text) !== value) setText(weightToText(value));
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className="text-center font-mono"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
        setText(raw);
        const parsed = parseWeight(raw);
        if (parsed !== value) onChange(parsed);
      }}
    />
  );
}

function weightToText(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}

function parseWeight(text: string): number {
  if (!text) return 0;
  const normalized = text.replace(",", ".");
  if (normalized === "." || normalized === "") return 0;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
