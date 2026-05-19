import * as React from "react";
import { Input } from "@/components/ui/input";

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, placeholder = "dd/mm/aaaa", ...rest }, ref) => {
    const [text, setText] = React.useState(() => isoToDisplay(value));
    const [tracked, setTracked] = React.useState(value);

    if (value !== tracked) {
      setTracked(value);
      if (displayToIso(text) !== value) setText(isoToDisplay(value));
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskDigits(e.target.value);
      setText(masked);
      const iso = displayToIso(masked);
      if (iso !== value) onChange(iso);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        maxLength={10}
      />
    );
  },
);
DateInput.displayName = "DateInput";

function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  // Valida o calendário (rejeita 31/02, 32/01, mês 13 etc.).
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return "";
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}
