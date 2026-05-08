import { ArrowLeft, Mountain, Timer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RunMap } from "@/components/run-map";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRun, useRun } from "@/hooks/use-runs";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/lib/format";
import type { RoutePoint, Split } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RunDetailPage() {
  const { id } = useParams();
  const run = useRun(id);
  const navigate = useNavigate();
  const remove = useDeleteRun();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (run.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (run.error || !run.data) {
    return (
      <EmptyState
        icon={Timer}
        title="Corrida não encontrada"
        description="Pode ter sido removida ou o link está errado."
        action={
          <Button asChild variant="outline">
            <Link to="/runs">Voltar pra lista</Link>
          </Button>
        }
      />
    );
  }

  const r = run.data;
  const points = r.routePoints ?? [];
  const splits = r.splits ?? [];

  async function onDelete() {
    if (!r) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success("Corrida removida");
      navigate("/runs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/runs">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
      </Button>

      <PageHeader
        eyebrow={
          r.source !== "manual" ? (r.source === "gpx" ? "GPX" : r.source) : "Manual"
        }
        title={r.name || `Corrida de ${formatDate(r.date, "dd/MM")}`}
        description={formatDate(r.date, "PPPP")}
        action={
          <div className="flex items-center gap-2">
            {r.source !== "manual" && (
              <Badge variant="muted">{r.source}</Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label="Remover"
              onClick={() => setConfirmOpen(true)}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Distância" value={formatDistance(r.distance)} emphasis />
        <Stat
          label="Tempo em movimento"
          value={formatDuration(r.movingTime ?? r.duration)}
          icon={Timer}
          hint={
            r.movingTime && r.movingTime !== r.duration
              ? `total: ${formatDuration(r.duration)}`
              : undefined
          }
        />
        <Stat label="Pace médio" value={formatPace(r.pace)} />
        <Stat
          label="Ganho de elevação"
          value={r.elevationGain ? `+${Math.round(r.elevationGain)} m` : "—"}
          icon={Mountain}
        />
      </section>

      {points.length > 0 && (
        <section>
          <header className="mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Percurso
            </p>
            <h2 className="font-display text-lg font-semibold">Mapa da rota</h2>
          </header>
          <RunMap points={points} />
        </section>
      )}

      {splits.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Pace por km
            </p>
            <h2 className="font-display text-lg font-semibold">
              Splits da corrida
            </h2>
          </header>
          <SplitsChart splits={splits} avgPace={r.pace ?? null} />
        </section>
      )}

      {points.some((p) => typeof p.ele === "number") && (
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Elevação
            </p>
            <h2 className="font-display text-lg font-semibold">
              Perfil altimétrico
            </h2>
          </header>
          <ElevationChart points={points} totalDistance={r.distance} />
        </section>
      )}

      {r.notes && (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Observação
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>
        </section>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover corrida?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Os dados de pace, splits e
              percurso serão apagados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={remove.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  icon?: typeof Timer;
  emphasis?: boolean;
  hint?: string;
}

function Stat({ label, value, icon: Icon, emphasis, hint }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        emphasis && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-md",
              emphasis ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl",
          emphasis && "text-primary",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SplitsChart({
  splits,
  avgPace,
}: {
  splits: Split[];
  avgPace: number | null;
}) {
  const data = splits.map((s) => ({
    km: `${s.km}`,
    pace: s.pace,
    duration: s.duration,
  }));

  const maxPace = Math.max(...splits.map((s) => s.pace));
  const minPace = Math.min(...splits.map((s) => s.pace));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="km"
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            label={{
              value: "km",
              position: "insideBottomRight",
              offset: -2,
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={(v) => formatPace(Number(v))}
            domain={[
              (dataMin: number) => Math.max(0, dataMin - 30),
              (dataMax: number) => dataMax + 30,
            ]}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.3 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(_v, _n, item) => {
              const p = item.payload as { pace: number; duration: number };
              return [
                `${formatPace(p.pace)} (${formatDuration(p.duration)})`,
                "Pace",
              ];
            }}
            labelFormatter={(km) => `Km ${km}`}
          />
          <Bar dataKey="pace" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell
                key={d.km}
                fill={
                  d.pace === minPace
                    ? "var(--primary)"
                    : d.pace === maxPace
                      ? "var(--muted-foreground)"
                      : "var(--primary)"
                }
                fillOpacity={
                  d.pace === minPace ? 1 : d.pace === maxPace ? 0.4 : 0.7
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {avgPace && (
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          pace médio: {formatPace(avgPace)} · mais rápido:{" "}
          {formatPace(minPace)} · mais lento: {formatPace(maxPace)}
        </p>
      )}
    </div>
  );
}

function ElevationChart({
  points,
  totalDistance,
}: {
  points: RoutePoint[];
  totalDistance: number;
}) {
  const data = useMemo(() => {
    // Acumula distância ao longo dos pontos pra usar no eixo X (em km)
    const result: { km: number; ele: number }[] = [];
    let acc = 0;
    let prev: RoutePoint | null = null;
    for (const p of points) {
      if (typeof p.ele !== "number") continue;
      if (prev) {
        acc += haversine(prev.lat, prev.lng, p.lat, p.lng);
      }
      result.push({ km: acc / 1000, ele: p.ele });
      prev = p;
    }
    // Garante que o último ponto bate com a distância total
    if (result.length > 0 && totalDistance > 0) {
      const lastKm = totalDistance / 1000;
      const ratio = lastKm / result[result.length - 1]!.km;
      if (Number.isFinite(ratio) && ratio > 0) {
        for (const r of result) r.km *= ratio;
      }
    }
    return result;
  }, [points, totalDistance]);

  if (data.length === 0) return null;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="km"
            type="number"
            domain={[0, "dataMax"]}
            tickFormatter={(v) => `${v.toFixed(1)}`}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            label={{
              value: "km",
              position: "insideBottomRight",
              offset: -2,
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={36}
            unit=" m"
          />
          <Tooltip
            cursor={{ stroke: "var(--accent)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${Math.round(Number(value))} m`, "Elevação"]}
            labelFormatter={(km) => `${Number(km).toFixed(2)} km`}
          />
          <Area
            type="monotone"
            dataKey="ele"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#elev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
