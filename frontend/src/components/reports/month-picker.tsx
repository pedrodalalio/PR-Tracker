import { addMonths, format, isSameMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthKey, parseMonthKey } from "./utils";

export interface MonthPickerProps {
  selected: Date;
  available: Date[];
  onChange: (date: Date) => void;
}

export function MonthPicker({ selected, available, onChange }: MonthPickerProps) {
  const today = new Date();
  const canGoNext = !isSameMonth(selected, today) && selected < today;
  const selectedKey = formatMonthKey(selected);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(subMonths(selected, 1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Select
        value={selectedKey}
        onValueChange={(value) => {
          const parsed = parseMonthKey(value);
          if (parsed) onChange(parsed);
        }}
      >
        <SelectTrigger className="min-w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {available.map((m) => {
            const key = formatMonthKey(m);
            return (
              <SelectItem key={key} value={key}>
                {format(m, "MMMM 'de' yyyy", { locale: ptBR })}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        disabled={!canGoNext}
        onClick={() => onChange(addMonths(selected, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
