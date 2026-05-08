import {
  isWithinInterval,
  endOfMonth,
  startOfMonth,
} from "date-fns";
import {
  AlertCircle,
  ArrowUpRight,
  Footprints,
  Plug,
  Plus,
  Search,
  Timer,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRuns } from "@/hooks/use-runs";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatRelative,
} from "@/lib/format";
import { ApiError } from "@/lib/api-client";

export function RunsPage() {
  const runs = useRuns();
  const today = useMemo(() => new Date(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = query.trim() !== "" || dateFrom !== "" || dateTo !== "";
  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const filteredRuns = useMemo(() => {
    const list = runs.data ?? [];
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return list.filter((r) => {
      if (q) {
        const haystack = `${r.name ?? ""} ${r.notes ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (fromTs !== null && new Date(r.date).getTime() < fromTs) return false;
      if (toTs !== null && new Date(r.date).getTime() > toTs) return false;
      return true;
    });
  }, [runs.data, query, dateFrom, dateTo]);

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
    const withPace = data.filter((r) => (r.pace ?? 0) > 0);
    const avgPace =
      withPace.length === 0
        ? null
        : withPace.reduce((acc, r) => acc + (r.pace ?? 0), 0) /
          withPace.length;

    return {
      monthCount: runsThisMonth.length,
      distanceMonth,
      distanceTotal,
      longest,
      avgPace,
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

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou notas…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Data inicial"
              className="w-auto"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Data final"
              className="w-auto"
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearFilters}
                aria-label="Limpar filtros"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {runs.isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro ao carregar corridas"
            description={
              runs.error instanceof ApiError
                ? runs.error.message
                : "Não foi possível buscar a lista. Verifique sua conexão."
            }
            action={
              <Button variant="outline" onClick={() => runs.refetch()}>
                Tentar de novo
              </Button>
            }
          />
        ) : runs.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : filteredRuns.length === 0 ? (
          <EmptyState
            icon={Footprints}
            title={
              hasFilters
                ? "Nenhuma corrida com esses filtros"
                : "Nenhuma corrida registrada"
            }
            description={
              hasFilters
                ? "Tente ajustar os filtros de data ou termo de busca."
                : "Comece importando um arquivo GPX do Strava ou registrando manualmente."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to="/runs/new?import=1">Importar GPX</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/runs/new">Nova corrida</Link>
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredRuns.map((r) => (
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
