import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types";

const CREATE_VALUE = "__create__";

interface ExerciseComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: Exercise[];
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  onCreateRequest?: (query: string) => void;
}

export function ExerciseCombobox({
  value,
  onChange,
  options,
  placeholder = "Escolha o exercício",
  emptyMessage = "Nenhum exercício encontrado",
  loading,
  disabled,
  onCreateRequest,
}: ExerciseComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const selected = options.find((ex) => ex.id === value);
  const triggerLabel = selected?.name ?? placeholder;

  const handleCreate = () => {
    if (!onCreateRequest) return;
    onCreateRequest(query.trim());
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs",
            "focus:outline-hidden focus:ring-2 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "md:h-10 md:text-sm",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {loading ? "Carregando…" : triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            if (itemValue === CREATE_VALUE) return 1;
            return itemValue.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar exercício…"
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {options.map((ex) => {
              const muscles = ex.muscleGroups
                .map((m) => m.muscleGroup)
                .join(" ");
              return (
                <CommandItem
                  key={ex.id}
                  value={`${ex.name}||${muscles}`.toLowerCase()}
                  onSelect={() => {
                    onChange(ex.id);
                    handleOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === ex.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{ex.name}</span>
                  {ex.muscleGroups.length > 0 && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {ex.muscleGroups.map((m) => m.muscleGroup).join(", ")}
                    </span>
                  )}
                </CommandItem>
              );
            })}
            {onCreateRequest && (
              <CommandItem
                value={CREATE_VALUE}
                onSelect={handleCreate}
                className="border-t border-border mt-1 pt-2 text-primary data-[selected=true]:text-primary"
              >
                <Plus className="size-4" />
                <span className="flex-1 truncate">
                  {query.trim()
                    ? `Criar "${query.trim()}"`
                    : "Criar novo exercício"}
                </span>
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
