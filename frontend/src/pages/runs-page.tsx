import {
  isWithinInterval,
  endOfMonth,
  startOfMonth,
} from "date-fns";
import { ArrowUpRight, Footprints, Plug, Plus, Timer, Upload } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRuns } from "@/hooks/use-runs";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatRelative,
} from "@/lib/format";

export function RunsPage() {
  const runs = useRuns();
  const today = useMemo(() => new Date(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("strava_connected") === "1") {
      toast.success("Strava conectado!");
      const next = new URLSearchParams(searchParams);
      next.delete("strava_connected");
      setSearchParams(next, { replace: true });
    }
    const err = searchParams.get("strava_error");
    if (err) {
      toast.error(`Falha no Strava: ${err}`);
      const next = new URLSearchParams(searchParams);
      next.delete("strava_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useMemo(() => {
    const data = runs.data ?? [];
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const runsThisMonth = data.filter((r) =>
      isWithinInterval(new Date(r.date), {
        start: monthStart,
        end: monthEnd,
      }),
    );
    const distanceMonth = runsThisMonth.reduce(
      (acc, r) => acc + r.distance,
      0,
    );
    const distanceTotal = data.reduce((acc, r) => acc + r.distance, 0);
    const longest = data.reduce(
      (best, r) => (r.distance > best ? r.distance : best),
      0,
    );
    const avgPace =
      data.length === 0
        ? null
        : data.reduce((acc, r) => acc + (r.pace ?? 0), 0) /
          data.filter((r) => (r.pace ?? 0) > 0).length || null;

    return {
      monthCount: runsThisMonth.length,
      distanceMonth,
      distanceTotal,
      longest,
      avgPace: Number.isFinite(avgPace) && avgPace ? avgPace : null,
    };
  }, [runs.data, today]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Corrida"
        title="Suas corridas"
        description="Importe do Strava (.gpx), registre manualmente e acompanhe pace, distância e evolução."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/runs/strava">
                <Plug className="size-4" />
                Strava
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/runs/new?import=1">
                <Upload className="size-4" />
                GPX
              </Link>
            </Button>
            <Button asChild>
              <Link to="/runs/new">
                <Plus className="size-4" />
                Nova
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Este mês"
          value={
            runs.isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              stats.monthCount
            )
          }
          unit={stats.monthCount === 1 ? "corrida" : "corridas"}
          icon={Footprints}
          emphasis="primary"
        />
        <StatCard
          label="Distância no mês"
          value={
            runs.isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              formatDistance(stats.distanceMonth)
            )
          }
        />
        <StatCard
          label="Mais longa"
          value={
            runs.isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : stats.longest === 0 ? (
              "—"
            ) : (
              formatDistance(stats.longest)
            )
          }
        />
        <StatCard
          label="Pace médio"
          value={
            runs.isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : stats.avgPace ? (
              formatPace(stats.avgPace)
            ) : (
              "—"
            )
          }
          icon={Timer}
        />
      </section>

      <section>
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Histórico</h2>
          {runs.data && (
            <span className="font-mono text-xs text-muted-foreground">
              {runs.data.length}{" "}
              {runs.data.length === 1 ? "corrida" : "corridas"} ·{" "}
              {formatDistance(stats.distanceTotal)} no total
            </span>
          )}
        </header>

        {runs.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : !runs.data || runs.data.length === 0 ? (
          <EmptyState
            icon={Footprints}
            title="Nenhuma corrida registrada"
            description="Comece importando um arquivo GPX do Strava ou registrando manualmente."
            action={
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/runs/new?import=1">Importar GPX</Link>
                </Button>
                <Button asChild>
                  <Link to="/runs/new">Nova corrida</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {runs.data.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/runs/${r.id}`}
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {formatRelative(r.date)}
                      </p>
                      <p className="mt-1 line-clamp-1 font-display text-base font-semibold">
                        {r.name ||
                          `Corrida de ${formatDate(r.date, "dd/MM")}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.date, "PPP")}
                      </p>
                    </div>
                    {r.source !== "manual" && (
                      <Badge variant="muted">
                        {r.source === "gpx" ? "GPX" : r.source}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-xs">
                    <Stat label="Distância" value={formatDistance(r.distance)} />
                    <Stat label="Tempo" value={formatDuration(r.movingTime ?? r.duration)} />
                    <Stat label="Pace" value={formatPace(r.pace)} />
                  </dl>
                  <div className="flex items-center justify-end text-xs font-mono text-muted-foreground transition-colors group-hover:text-primary">
                    Ver detalhes
                    <ArrowUpRight className="ml-1 size-3.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-display text-base font-semibold">{value}</dd>
    </div>
  );
}
