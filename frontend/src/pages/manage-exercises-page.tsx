import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { MuscleGroupInput } from "@/components/muscle-group-input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateExercise,
  useDeleteExercise,
  useExercises,
  useUpdateExercise,
} from "@/hooks/use-exercises";
import { ApiError } from "@/lib/api-client";
import { categoryLabel } from "@/lib/format";
import {
  categorySchema,
  type Category,
  type Exercise,
} from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: categorySchema,
  muscleGroups: z.array(z.string().min(1)).min(1, "Adicione ao menos um grupo"),
});

type FormValues = z.infer<typeof formSchema>;

export function ManageExercisesPage() {
  const exercises = useExercises();
  const create = useCreateExercise();
  const remove = useDeleteExercise();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: "Upper", muscleGroups: [] },
  });

  const muscleGroups = form.watch("muscleGroups");

  const addGroup = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const exists = muscleGroups.some(
      (g) => g.toLowerCase() === value.toLowerCase(),
    );
    if (exists) return;
    form.setValue("muscleGroups", [...muscleGroups, value], {
      shouldValidate: true,
    });
  };

  const removeGroup = (group: string) => {
    form.setValue(
      "muscleGroups",
      muscleGroups.filter((g) => g !== group),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        name: values.name,
        category: values.category,
        muscleGroups: values.muscleGroups,
      });
      toast.success(`"${values.name}" adicionado`);
      form.reset({ name: "", category: values.category, muscleGroups: [] });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível adicionar o exercício",
      );
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success("Exercício removido");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover",
      );
    }
  };

  return (
    <div>
      <div className="-mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/exercises">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Catálogo"
        title="Gerenciar exercícios"
        description="Adicione, edite ou remova exercícios do seu catálogo pessoal."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Adicionar exercício
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre um novo exercício para usar nos treinos.
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-5 space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Supino reto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["Upper", "Lower"] as Category[]).map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {categoryLabel(c)}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <MuscleGroupInput
                values={muscleGroups}
                onAdd={addGroup}
                onRemove={removeGroup}
                error={form.formState.errors.muscleGroups?.message as string}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Adicionar
              </Button>
            </form>
          </Form>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">
            Catálogo atual
          </h2>
          {exercises.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (exercises.data ?? []).length === 0 ? (
            <EmptyState
              title="Sem exercícios"
              description="Comece adicionando um exercício acima."
            />
          ) : (
            <ul className="space-y-2">
              {(exercises.data ?? []).map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-medium">{ex.name}</h3>
                      <Badge variant="muted">
                        {categoryLabel(ex.category)}
                      </Badge>
                    </div>
                    {ex.muscleGroups.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ex.muscleGroups.map((m) => (
                          <Badge key={m.id} variant="outline">
                            {m.muscleGroup}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(ex)}
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConfirmDelete(ex)}
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <EditExerciseDialog
          exercise={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover exercício?</DialogTitle>
            <DialogDescription>
              "{confirmDelete?.name}" será removido do seu catálogo. Treinos já
              registrados não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
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

function EditExerciseDialog({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const update = useUpdateExercise(exercise.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups.map((m) => m.muscleGroup),
    },
  });

  const muscleGroups = form.watch("muscleGroups");

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({
        name: values.name,
        category: values.category,
        muscleGroups: values.muscleGroups,
      });
      toast.success("Exercício atualizado");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar",
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar exercício</DialogTitle>
          <DialogDescription>
            Atualize informações do "{exercise.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["Upper", "Lower"] as Category[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <MuscleGroupInput
              values={muscleGroups}
              onAdd={(v) =>
                form.setValue(
                  "muscleGroups",
                  Array.from(new Set([...muscleGroups, v.trim()])),
                  { shouldValidate: true },
                )
              }
              onRemove={(v) =>
                form.setValue(
                  "muscleGroups",
                  muscleGroups.filter((g) => g !== v),
                  { shouldValidate: true },
                )
              }
              error={form.formState.errors.muscleGroups?.message as string}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
