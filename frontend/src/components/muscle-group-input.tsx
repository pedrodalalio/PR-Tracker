import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const COMMON_MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Quadríceps",
  "Posterior",
  "Glúteos",
  "Panturrilha",
];

interface MuscleGroupInputProps {
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  error?: string;
}

export function MuscleGroupInput({
  values,
  onAdd,
  onRemove,
  error,
}: MuscleGroupInputProps) {
  const [input, setInput] = useState("");
  const submitInput = () => {
    if (input) {
      onAdd(input);
      setInput("");
    }
  };
  return (
    <div className="space-y-2">
      <FormLabelLike error={!!error}>Grupos musculares</FormLabelLike>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-1.5 min-h-11 md:min-h-10",
          error && "border-destructive",
        )}
      >
        {values.map((g) => (
          <Badge
            key={g}
            variant="muted"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs"
          >
            {g}
            <button
              type="button"
              onClick={() => onRemove(g)}
              className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
              aria-label={`Remover ${g}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              submitInput();
            } else if (e.key === "Backspace" && !input && values.length > 0) {
              onRemove(values[values.length - 1]!);
            }
          }}
          onBlur={submitInput}
          placeholder={values.length === 0 ? "Ex.: Peito, Tríceps" : ""}
          className="flex-1 min-w-32 bg-transparent px-2 py-1 text-sm outline-hidden placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_MUSCLE_GROUPS.filter((g) => !values.includes(g))
          .slice(0, 8)
          .map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onAdd(g)}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              + {g}
            </button>
          ))}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function FormLabelLike({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none",
        error && "text-destructive",
      )}
    >
      {children}
    </label>
  );
}
