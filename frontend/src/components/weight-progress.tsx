import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Scale,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
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
import {
  useDeleteWeight,
  useUpdateWeight,
  useWeights,
} from "@/hooks/use-weights";
import { formatRelative } from "@/lib/format";
import type { WeightEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChartPoint {
  date: string;
  dateLabel: string;
  weight: number;
}

function toLocalDateInput(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function WeightProgress() {
  const weights = useWeights();
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  const sortedAsc = useMemo(
    () =>
      [...(weights.data ?? [])].sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      ),
    [weights.data],
  );

  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc]);

  const chartData = useMemo<ChartPoint[]>(
    () =>
      sortedAsc.map((entry) => ({
        date: entry.recordedAt,
        dateLabel: format(new Date(entry.recordedAt), "dd/MM", {
          locale: ptBR,
        }),
        weight: entry.weight,
      })),
    [sortedAsc],
  );

  const summary = useMemo(() => {
    if (sortedAsc.length === 0) return null;
    const first = sortedAsc[0]!;
    const latest = sortedAsc[sortedAsc.length - 1]!;
    const min = sortedAsc.reduce((a, b) => (b.weight < a.weight ? b : a));
    const max = sortedAsc.reduce((a, b) => (b.weight > a.weight ? b : a));
    return {
      latest,
      first,
      min,
      max,
      delta: Math.round((latest.weight - first.weight) * 10) / 10,
    };
  }, [sortedAsc]);

  if (weights.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (sortedAsc.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Sem registros de peso"
        description="Registre seu peso pela primeira vez na home pra começar a acompanhar a evolução."
      />
    );
  }

  return (
    <>
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini
            label="Atual"
            value={summary.latest.weight.toFixed(1)}
            unit="kg"
            emphasis
          />
          <Mini
            label="Variação total"
            value={
              summary.delta > 0
                ? `+${summary.delta.toFixed(1)}`
                : summary.delta.toFixed(1)
            }
            unit="kg"
            tone={
              summary.delta > 0
                ? "warn"
                : summary.delta < 0
                  ? "down"
                  : "neutral"
            }
          />
          <Mini
            label="Mínimo"
            value={summary.min.weight.toFixed(1)}
            unit="kg"
          />
          <Mini
            label="Máximo"
            value={summary.max.weight.toFixed(1)}
            unit="kg"
          />
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Evolução
            </p>
            <h2 className="font-display text-lg font-semibold">Peso ao longo do tempo</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {sortedAsc.length} registro{sortedAsc.length === 1 ? "" : "s"}
          </span>
        </header>

        {sortedAsc.length < 2 ? (
          <EmptyState
            icon={Scale}
            title="Precisa de mais dados"
            description="Registre o peso pelo menos duas vezes pra ver o gráfico de evolução."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={40}
                  domain={["auto", "auto"]}
                  unit=" kg"
                />
                <Tooltip
                  cursor={{ stroke: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(_value, _name, item) => {
                    const p = item.payload as ChartPoint;
                    return [`${p.weight.toFixed(1)} kg`, "Peso"];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--primary)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Histórico
          </p>
          <h2 className="font-display text-lg font-semibold">Registros</h2>
        </header>
        <ul className="divide-y divide-border">
          {sortedDesc.map((entry, index) => {
            const next = sortedDesc[index + 1];
            const diff = next
              ? Math.round((entry.weight - next.weight) * 10) / 10
              : 0;
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-base font-semibold">
                      {entry.weight.toFixed(1)} kg
                    </span>
                    {next && diff !== 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                          diff > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {diff > 0 ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.recordedAt), "PP", { locale: ptBR })}
                    {" · "}
                    {formatRelative(entry.recordedAt)}
                  </p>
                  {entry.notes && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(entry)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton id={entry.id} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <EditWeightDialog
        entry={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

interface MiniProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  emphasis?: boolean;
  tone?: "warn" | "down" | "neutral";
}

function Mini({ label, value, unit, emphasis, tone }: MiniProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background/40 px-3 py-2.5",
        emphasis && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-xl font-bold tracking-tight",
            emphasis && "text-primary",
            tone === "warn" && "text-amber-600 dark:text-amber-400",
            tone === "down" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const remove = useDeleteWeight();
  const [confirm, setConfirm] = useState(false);

  async function onClick() {
    if (!confirm) {
      setConfirm(true);
      window.setTimeout(() => setConfirm(false), 3000);
      return;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Registro removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={remove.isPending}
      aria-label={confirm ? "Confirmar exclusão" : "Excluir"}
      className={cn(confirm && "text-destructive")}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

interface EditWeightDialogProps {
  entry: WeightEntry | null;
  onClose: () => void;
}

function EditWeightDialog({ entry, onClose }: EditWeightDialogProps) {
  const update = useUpdateWeight();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setWeight(entry.weight.toString());
      setDate(toLocalDateInput(entry.recordedAt));
      setNotes(entry.notes ?? "");
    }
  }, [entry]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;

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
      await update.mutateAsync({
        id: entry.id,
        input: {
          weight: parsed,
          recordedAt: recordedAt.toISOString(),
          notes: notes.trim() ? notes.trim() : null,
        },
      });
      toast.success("Registro atualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar");
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar registro</DialogTitle>
          <DialogDescription>
            Ajuste o peso, a data ou a observação deste registro.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-weight">Peso (kg)</Label>
            <Input
              id="edit-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Data</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Observação</Label>
            <Input
              id="edit-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={update.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
