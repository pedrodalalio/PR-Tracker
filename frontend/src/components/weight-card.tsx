import { History, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

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
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                      delta.diff > 0
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : delta.diff < 0
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
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
  const create = useCreateWeight();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setWeight(latest ? latest.weight.toString() : "");
      setDate(todayLocalDate());
      setNotes("");
    }
  }, [open, latest]);

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

    try {
      await create.mutateAsync({
        weight: parsed,
        recordedAt: recordedAt.toISOString(),
        notes: notes.trim() || undefined,
      });
      toast.success("Peso registrado");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao registrar peso",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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
    </Dialog>
  );
}
