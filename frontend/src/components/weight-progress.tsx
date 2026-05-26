import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Scale,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ExportMenu } from "@/components/export-menu";
import {
  BioimpedanceFields,
  bioFromEntry,
  parseBio,
  type BioFormState,
} from "@/components/weight-card";
import { useGoals } from "@/hooks/use-goals";
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
  useBulkDeleteWeights,
  useDeleteWeight,
  useUpdateWeight,
  useWeights,
} from "@/hooks/use-weights";
import { weightsApi } from "@/services/weights-api";
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

// Regressão linear simples sobre as últimas N entries (kg em função de dias).
// Retorna null se não dá pra projetar (poucos pontos, slope na direção errada
// pra meta, ou slope ~0).
function projectEta(
  entries: WeightEntry[],
  target: number,
  windowSize = 8,
): { days: number; current: number; slopePerDay: number } | null {
  if (entries.length < 3) return null;
  const recent = entries.slice(-windowSize);
  const t0 = new Date(recent[0]!.recordedAt).getTime();
  const xs = recent.map(
    (e) => (new Date(e.recordedAt).getTime() - t0) / 86_400_000,
  );
  const ys = recent.map((e) => e.weight);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const current = ys[n - 1]!;
  const remaining = target - current;
  if (Math.abs(remaining) < 0.1) return { days: 0, current, slopePerDay: slope };
  // Direção da tendência precisa bater com a direção da meta.
  if (Math.sign(slope) !== Math.sign(remaining)) return null;
  if (Math.abs(slope) < 0.005) return null; // < 35g/semana — projeção instável
  const days = Math.ceil(remaining / slope);
  if (days <= 0 || days > 365 * 5) return null;
  return { days, current, slopePerDay: slope };
}

export function WeightProgress() {
  const weights = useWeights();
  const goals = useGoals();
  const bulkDelete = useBulkDeleteWeights();
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const qcMain = useQueryClient();
  const onBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(
        `${ids.length} registro${ids.length === 1 ? "" : "s"} removido${
          ids.length === 1 ? "" : "s"
        }`,
        {
          action: {
            label: "Desfazer",
            onClick: async () => {
              try {
                await Promise.all(ids.map((id) => weightsApi.restore(id)));
                qcMain.invalidateQueries({ queryKey: ["weights"] });
                toast.success("Registros restaurados");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Falha ao restaurar",
                );
              }
            },
          },
        },
      );
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  };

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

  const targetWeight = goals.data?.targetWeight ?? null;
  const eta = useMemo(
    () =>
      targetWeight !== null && sortedAsc.length > 0
        ? projectEta(sortedAsc, targetWeight)
        : null,
    [sortedAsc, targetWeight],
  );

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

      {targetWeight !== null && summary && (
        <TargetWeightCard
          target={targetWeight}
          current={summary.latest.weight}
          eta={eta}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card p-5">
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
          <div className="h-72 w-full min-w-0">
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
                  fontSize={12}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
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
                    fontSize: 13,
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
                  dot={{ fill: "var(--primary)", r: 3.5 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Histórico
            </p>
            <h2 className="font-display text-lg font-semibold">Registros</h2>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu resource="weights" />
            <Button
              type="button"
              variant={selectMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() =>
                selectMode ? exitSelectMode() : setSelectMode(true)
              }
            >
              {selectMode ? "Cancelar" : "Selecionar"}
            </Button>
          </div>
        </header>
        <ul className="divide-y divide-border">
          {sortedDesc.map((entry, index) => {
            const next = sortedDesc[index + 1];
            const diff = next
              ? Math.round((entry.weight - next.weight) * 10) / 10
              : 0;
            const isSelected = selected.has(entry.id);
            return (
              <li
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 py-3 first:pt-0 last:pb-0",
                  selectMode && "cursor-pointer",
                  selectMode && isSelected && "bg-primary/5",
                )}
                onClick={() => selectMode && toggleSelected(entry.id)}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(entry.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar registro"
                    className="size-4 shrink-0 accent-primary"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-base font-semibold">
                      {entry.weight.toFixed(1)} kg
                    </span>
                    {next && diff !== 0 && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                  <BioMetricsRow entry={entry} />
                </div>
                {!selectMode && (
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
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {selectMode && selected.size > 0 && (
        <div className="sticky bottom-20 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg safe-bottom md:bottom-4">
          <span className="font-mono text-sm">
            {selected.size} selecionado{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={exitSelectMode}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </div>
        </div>
      )}

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
}

function Mini({ label, value, unit, emphasis }: MiniProps) {
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
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function onClick() {
    if (!confirm) {
      setConfirm(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setConfirm(false);
        timeoutRef.current = null;
      }, 3000);
      return;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Registro removido", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await weightsApi.restore(id);
              qc.invalidateQueries({ queryKey: ["weights"] });
              toast.success("Registro restaurado");
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Falha ao restaurar",
              );
            }
          },
        },
      });
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
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      {entry && <EditWeightForm entry={entry} onClose={onClose} />}
    </Dialog>
  );
}

interface EditWeightFormProps {
  entry: WeightEntry;
  onClose: () => void;
}

function EditWeightForm({ entry, onClose }: EditWeightFormProps) {
  const update = useUpdateWeight();
  const [weight, setWeight] = useState(() => entry.weight.toString());
  const [date, setDate] = useState(() => toLocalDateInput(entry.recordedAt));
  const [notes, setNotes] = useState(() => entry.notes ?? "");
  const [bio, setBio] = useState<BioFormState>(() => bioFromEntry(entry));

  const hasBio =
    entry.bodyFatPct != null ||
    entry.muscleMassKg != null ||
    entry.maintenanceKcal != null ||
    entry.metabolicAge != null ||
    entry.visceralFat != null ||
    entry.bmi != null;

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
      await update.mutateAsync({
        id: entry.id,
        input: {
          weight: parsed,
          recordedAt: recordedAt.toISOString(),
          notes: notes.trim() ? notes.trim() : null,
          ...bioParsed.values,
        },
      });
      toast.success("Registro atualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar");
    }
  }

  return (
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

        <BioimpedanceFields
          value={bio}
          onChange={setBio}
          idPrefix={`edit-${entry.id}`}
          defaultOpen={hasBio}
        />

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
  );
}

function BioMetricsRow({ entry }: { entry: WeightEntry }) {
  const items: Array<{ label: string; value: string }> = [];
  if (entry.bodyFatPct != null) {
    items.push({ label: "Gordura", value: `${formatNumber(entry.bodyFatPct, 1)}%` });
  }
  if (entry.muscleMassKg != null) {
    items.push({ label: "Músculo", value: `${formatNumber(entry.muscleMassKg, 1)} kg` });
  }
  if (entry.bmi != null) {
    items.push({ label: "IMC", value: formatNumber(entry.bmi, 1) });
  }
  if (entry.visceralFat != null) {
    items.push({ label: "Visceral", value: formatNumber(entry.visceralFat, 1) });
  }
  if (entry.maintenanceKcal != null) {
    items.push({ label: "Manutenção", value: `${entry.maintenanceKcal} kcal` });
  }
  if (entry.metabolicAge != null) {
    items.push({ label: "Idade metab.", value: `${entry.metabolicAge} anos` });
  }
  if (items.length === 0) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {items.map((it) => (
        <li
          key={it.label}
          className="inline-flex items-baseline gap-1 font-mono text-[11px] tabular-nums text-muted-foreground"
        >
          <span className="uppercase tracking-wider text-[9px]">{it.label}</span>
          <span className="font-semibold text-foreground/80">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

function formatEtaDays(days: number): string {
  if (days <= 0) return "agora";
  if (days < 14) return `${days} dia${days === 1 ? "" : "s"}`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `~${weeks} semana${weeks === 1 ? "" : "s"}`;
  }
  if (days < 730) {
    const months = Math.round(days / 30);
    return `~${months} mes${months === 1 ? "" : "es"}`;
  }
  const years = (days / 365).toFixed(1);
  return `~${years.replace(".", ",")} anos`;
}

function TargetWeightCard({
  target,
  current,
  eta,
}: {
  target: number;
  current: number;
  eta: { days: number; current: number; slopePerDay: number } | null;
}) {
  const remaining = Math.round((target - current) * 10) / 10;
  const reached = Math.abs(remaining) < 0.1;
  const direction = remaining > 0 ? "ganhar" : "perder";
  const etaDate = eta
    ? new Date(Date.now() + eta.days * 86_400_000)
    : null;
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Meta de peso
          </p>
          <h2 className="font-display text-lg font-semibold">
            {target.toFixed(1).replace(".", ",")} kg
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          atual {current.toFixed(1).replace(".", ",")} kg
        </span>
      </header>
      {reached ? (
        <p className="text-sm text-muted-foreground">Você bateu a meta. 🎯</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            Faltam{" "}
            <span className="font-mono font-semibold">
              {Math.abs(remaining).toFixed(1).replace(".", ",")} kg
            </span>{" "}
            pra {direction}.
          </p>
          {eta ? (
            <p className="text-xs text-muted-foreground">
              No ritmo dos últimos registros (
              {(eta.slopePerDay * 7).toFixed(2).replace(".", ",")} kg/semana),
              estimativa de chegada em{" "}
              <span className="font-mono text-foreground">
                {formatEtaDays(eta.days)}
              </span>
              {etaDate && (
                <>
                  {" "}— por volta de{" "}
                  <span className="font-mono text-foreground">
                    {format(etaDate, "PP", { locale: ptBR })}
                  </span>
                </>
              )}
              .
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem tendência suficiente pra estimar prazo. Registre mais pesagens
              ou ajuste o ritmo.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
