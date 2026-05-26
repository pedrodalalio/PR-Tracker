import { ChevronDown, History, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateWeight, useWeights } from "@/hooks/use-weights";
import { formatRelative } from "@/lib/format";
import type { WeightEntry } from "@/lib/types";

function todayLocalDate(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatDelta(diff: number): string {
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}`;
}

interface DeltaInfo {
  diff: number;
  previous: WeightEntry;
}

function computeDelta(entries: WeightEntry[]): DeltaInfo | null {
  if (entries.length < 2) return null;
  const [latest, previous] = entries;
  return {
    diff: Math.round((latest.weight - previous.weight) * 10) / 10,
    previous,
  };
}

export function WeightCard() {
  const weights = useWeights();
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...(weights.data ?? [])].sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    [weights.data],
  );

  const latest = sorted[0];
  const delta = computeDelta(sorted);

  if (weights.isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-12 w-40" />
        <Skeleton className="mt-3 h-9 w-full max-w-xs" />
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -bottom-12 size-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Peso atual
            </p>
            {latest ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-4xl font-bold tracking-tight md:text-5xl">
                  {latest.weight.toFixed(1)}
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  kg
                </span>
                {delta && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {delta.diff > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : delta.diff < 0 ? (
                      <TrendingDown className="size-3" />
                    ) : null}
                    {formatDelta(delta.diff)} kg
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Registre seu peso pra começar a acompanhar a evolução.
              </p>
            )}
            {latest && (
              <p className="mt-2 text-xs text-muted-foreground">
                Último registro {formatRelative(latest.recordedAt)}
                {delta && (
                  <>
                    {" · "}
                    anterior {delta.previous.weight.toFixed(1)} kg
                  </>
                )}
              </p>
            )}
          </div>
          <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
            <Scale className="size-5" />
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={() => setDialogOpen(true)}>
            {latest ? "Atualizar peso" : "Registrar peso"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/progress?tab=peso">
              <History className="size-4" />
              Ver histórico
            </Link>
          </Button>
        </div>
      </section>

      <WeightDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        latest={latest}
      />
    </>
  );
}

interface WeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latest?: WeightEntry;
}

function WeightDialog({ open, onOpenChange, latest }: WeightDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <WeightDialogForm
          latest={latest}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

interface WeightDialogFormProps {
  latest?: WeightEntry;
  onClose: () => void;
}

function WeightDialogForm({ latest, onClose }: WeightDialogFormProps) {
  const create = useCreateWeight();
  const [weight, setWeight] = useState(() =>
    latest ? latest.weight.toString() : "",
  );
  const [date, setDate] = useState(() => todayLocalDate());
  const [notes, setNotes] = useState("");
  const [bio, setBio] = useState<BioFormState>(() => emptyBio());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(weight.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe um peso válido");
      return;
    }

    const recordedAt = new Date(`${date}T12:00:00`);
    if (Number.isNaN(recordedAt.getTime())) {
      toast.error("Data inválida");
      return;
    }

    const bioParsed = parseBio(bio);
    if (bioParsed.error) {
      toast.error(bioParsed.error);
      return;
    }

    try {
      await create.mutateAsync({
        weight: parsed,
        recordedAt: recordedAt.toISOString(),
        notes: notes.trim() || undefined,
        ...bioParsed.values,
      });
      toast.success("Peso registrado");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao registrar peso",
      );
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {latest ? "Atualizar peso" : "Registrar peso"}
        </DialogTitle>
        <DialogDescription>
          {latest
            ? `Último: ${latest.weight.toFixed(1)} kg em ${formatRelative(
                latest.recordedAt,
              )}.`
            : "Vamos começar com seu peso atual."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            max="500"
            autoFocus
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="78.4"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Observação (opcional)</Label>
          <Input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: pós-treino, em jejum"
            maxLength={120}
          />
        </div>

        <BioimpedanceFields value={bio} onChange={setBio} idPrefix="new" />

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export interface BioFormState {
  bodyFatPct: string;
  muscleMassKg: string;
  maintenanceKcal: string;
  metabolicAge: string;
  visceralFat: string;
  bmi: string;
}

export function emptyBio(): BioFormState {
  return {
    bodyFatPct: "",
    muscleMassKg: "",
    maintenanceKcal: "",
    metabolicAge: "",
    visceralFat: "",
    bmi: "",
  };
}

export function bioFromEntry(entry: WeightEntry): BioFormState {
  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? "" : String(v).replace(".", ",");
  return {
    bodyFatPct: fmt(entry.bodyFatPct),
    muscleMassKg: fmt(entry.muscleMassKg),
    maintenanceKcal: fmt(entry.maintenanceKcal),
    metabolicAge: fmt(entry.metabolicAge),
    visceralFat: fmt(entry.visceralFat),
    bmi: fmt(entry.bmi),
  };
}

interface ParsedBio {
  error?: string;
  values: {
    bodyFatPct: number | null;
    muscleMassKg: number | null;
    maintenanceKcal: number | null;
    metabolicAge: number | null;
    visceralFat: number | null;
    bmi: number | null;
  };
}

export function parseBio(state: BioFormState): ParsedBio {
  const empty = {
    bodyFatPct: null,
    muscleMassKg: null,
    maintenanceKcal: null,
    metabolicAge: null,
    visceralFat: null,
    bmi: null,
  };
  const float = (raw: string, label: string, min: number, max: number) => {
    const t = raw.trim();
    if (!t) return { ok: true as const, value: null };
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n) || n < min || n > max) {
      return { ok: false as const, error: `${label} inválido` };
    }
    return { ok: true as const, value: Math.round(n * 10) / 10 };
  };
  const int = (raw: string, label: string, min: number, max: number) => {
    const t = raw.trim();
    if (!t) return { ok: true as const, value: null };
    const n = Number(t);
    if (!Number.isFinite(n)) return { ok: false as const, error: `${label} inválido` };
    const r = Math.round(n);
    if (r < min || r > max) return { ok: false as const, error: `${label} inválido` };
    return { ok: true as const, value: r };
  };

  const fat = float(state.bodyFatPct, "Gordura corporal", 0, 100);
  if (!fat.ok) return { error: fat.error, values: empty };
  const muscle = float(state.muscleMassKg, "Massa muscular", 0, 500);
  if (!muscle.ok) return { error: muscle.error, values: empty };
  const visc = float(state.visceralFat, "Gordura visceral", 0, 100);
  if (!visc.ok) return { error: visc.error, values: empty };
  const bmi = float(state.bmi, "IMC", 0, 100);
  if (!bmi.ok) return { error: bmi.error, values: empty };
  const kcal = int(state.maintenanceKcal, "Calorias", 0, 10000);
  if (!kcal.ok) return { error: kcal.error, values: empty };
  const age = int(state.metabolicAge, "Idade metabólica", 0, 150);
  if (!age.ok) return { error: age.error, values: empty };
  return {
    values: {
      bodyFatPct: fat.value,
      muscleMassKg: muscle.value,
      maintenanceKcal: kcal.value,
      metabolicAge: age.value,
      visceralFat: visc.value,
      bmi: bmi.value,
    },
  };
}

interface BioimpedanceFieldsProps {
  value: BioFormState;
  onChange: (v: BioFormState) => void;
  idPrefix: string;
  defaultOpen?: boolean;
}

export function BioimpedanceFields({
  value,
  onChange,
  idPrefix,
  defaultOpen,
}: BioimpedanceFieldsProps) {
  const set = <K extends keyof BioFormState>(key: K, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <details
      className="group rounded-lg border border-border bg-background/40 [&[open]>summary]:border-b [&[open]>summary]:border-border"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground select-none">
        <span>Avançado — bioimpedância</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid grid-cols-2 gap-3 p-3">
        <BioField
          id={`${idPrefix}-bodyFatPct`}
          label="Gordura (%)"
          value={value.bodyFatPct}
          onChange={(v) => set("bodyFatPct", v)}
          placeholder="22,5"
          decimal
        />
        <BioField
          id={`${idPrefix}-muscleMassKg`}
          label="Músculo (kg)"
          value={value.muscleMassKg}
          onChange={(v) => set("muscleMassKg", v)}
          placeholder="32,1"
          decimal
        />
        <BioField
          id={`${idPrefix}-bmi`}
          label="IMC"
          value={value.bmi}
          onChange={(v) => set("bmi", v)}
          placeholder="24,5"
          decimal
        />
        <BioField
          id={`${idPrefix}-visceralFat`}
          label="Gordura visceral"
          value={value.visceralFat}
          onChange={(v) => set("visceralFat", v)}
          placeholder="8"
          decimal
        />
        <BioField
          id={`${idPrefix}-maintenanceKcal`}
          label="Manutenção (kcal)"
          value={value.maintenanceKcal}
          onChange={(v) => set("maintenanceKcal", v)}
          placeholder="2200"
        />
        <BioField
          id={`${idPrefix}-metabolicAge`}
          label="Idade metabólica"
          value={value.metabolicAge}
          onChange={(v) => set("metabolicAge", v)}
          placeholder="28"
        />
      </div>
    </details>
  );
}

function BioField({
  id,
  label,
  value,
  onChange,
  placeholder,
  decimal,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  decimal?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const pattern = decimal ? /^\d*[.,]?\d*$/ : /^\d*$/;
          if (raw === "" || pattern.test(raw)) onChange(raw);
        }}
        placeholder={placeholder}
        className="font-mono"
      />
    </div>
  );
}
