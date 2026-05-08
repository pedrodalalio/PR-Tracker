import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MuscleGroupInput } from "@/components/muscle-group-input";
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
import { useCreateExercise } from "@/hooks/use-exercises";
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

interface NewExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (exercise: Exercise) => void;
  defaultName?: string;
  lockedCategory?: Category;
}

export function NewExerciseDialog({
  open,
  onOpenChange,
  onCreated,
  defaultName = "",
  lockedCategory,
}: NewExerciseDialogProps) {
  const create = useCreateExercise();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      category: lockedCategory ?? "Upper",
      muscleGroups: [],
    },
  });

  // Reset form whenever the dialog reopens with new defaults.
  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultName,
        category: lockedCategory ?? "Upper",
        muscleGroups: [],
      });
    }
  }, [open, defaultName, lockedCategory, form]);

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
      const created = await create.mutateAsync({
        name: values.name,
        category: values.category,
        muscleGroups: values.muscleGroups,
      });
      toast.success(`"${created.name}" adicionado`);
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível adicionar o exercício",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo exercício</DialogTitle>
          <DialogDescription>
            Cadastre um exercício e ele já fica selecionado no treino.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: Supino reto"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!lockedCategory && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
            )}
            <MuscleGroupInput
              values={muscleGroups}
              onAdd={addGroup}
              onRemove={removeGroup}
              error={form.formState.errors.muscleGroups?.message as string}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
