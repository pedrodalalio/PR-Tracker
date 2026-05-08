import { ArrowLeft, Check, Loader2, Plug, Unplug } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import {
  useStravaActivities,
  useStravaAuthorize,
  useStravaDisconnect,
  useStravaImport,
  useStravaStatus,
} from "@/hooks/use-strava";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/format";
import type { StravaActivity } from "@/services/strava-api";

export function StravaPage() {
  const status = useStravaStatus();
  const authorize = useStravaAuthorize();
  const disconnect = useStravaDisconnect();
  const [page, setPage] = useState(1);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const activities = useStravaActivities(page, !!status.data?.connected);

  async function onConnect() {
    try {
      const res = await authorize.mutateAsync();
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao iniciar OAuth");
    }
  }

  async function onConfirmDisconnect() {
    try {
      await disconnect.mutateAsync();
      toast.success("Desconectado do Strava");
      setConfirmDisconnect(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao desconectar");
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
        eyebrow="Integração"
        title="Strava"
        description="Importe corridas direto da sua conta — vem com distância, splits e pace exatos do Strava."
        action={
          status.data?.connected ? (
            <Button
              variant="outline"
              onClick={() => setConfirmDisconnect(true)}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unplug className="size-4" />
              )}
              Desconectar
            </Button>
          ) : null
        }
      />

      {status.isLoading ? (
        <Skeleton className="h-32" />
      ) : !status.data?.connected ? (
        <ConnectCard onConnect={onConnect} pending={authorize.isPending} />
      ) : (
        <ActivitiesList
          loading={activities.isLoading}
          error={activities.error}
          activities={activities.data ?? []}
          page={page}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      <Dialog
        open={confirmDisconnect}
        onOpenChange={(open) => !open && setConfirmDisconnect(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar do Strava?</DialogTitle>
            <DialogDescription>
              Suas corridas já importadas continuam aqui. Você pode reconectar
              depois para importar mais.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDisconnect(false)}
              disabled={disconnect.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDisconnect}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectCard({
  onConnect,
  pending,
}: {
  onConnect: () => void;
  pending: boolean;
}) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card p-8">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#fc4c02]/15 text-[#fc4c02]">
          <Plug className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold">
          Conecte sua conta do Strava
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          A gente pede só permissão de leitura das atividades. Nada é publicado
          no seu Strava — usamos só pra trazer suas corridas pra cá.
        </p>
        <Button
          className="mt-6 bg-[#fc4c02] text-white hover:bg-[#e34402]"
          onClick={onConnect}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plug className="size-4" />
          )}
          Conectar com Strava
        </Button>
      </div>
    </section>
  );
}

function ActivitiesList({
  loading,
  error,
  activities,
  page,
  onPrev,
  onNext,
}: {
  loading: boolean;
  error: unknown;
  activities: StravaActivity[];
  page: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Falha ao buscar atividades"
        description={
          error instanceof ApiError ? error.message : "Erro desconhecido"
        }
      />
    );
  }

  if (activities.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={page === 1 ? "Sem corridas no Strava" : "Sem mais atividades"}
          description={
            page === 1
              ? "Não achei atividades de corrida na sua conta."
              : "Você chegou ao fim da lista."
          }
        />
        {page > 1 && (
          <div className="flex justify-center">
            <Button variant="ghost" onClick={onPrev}>
              ← Voltar
            </Button>
          </div>
        )}
      </div>
    );
  }

  // perPage atual no servidor (strava.ts:216 default 30). Heurística do "Próxima":
  // se a página veio com menos que perPage, certamente é a última. Quando vier
  // exatamente perPage, deixamos o botão habilitado e a página seguinte mostra
  // o empty state com "Voltar" — Strava não devolve total count.
  const PAGE_SIZE = 30;
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {activities.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </ul>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onPrev} disabled={page === 1}>
          ← Anterior
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          página {page}
        </span>
        <Button
          variant="ghost"
          onClick={onNext}
          disabled={activities.length < PAGE_SIZE}
        >
          Próxima →
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: StravaActivity }) {
  const importMut = useStravaImport();

  async function onImport() {
    try {
      const res = await importMut.mutateAsync(activity.id);
      if (res.alreadyImported) {
        toast.message("Essa corrida já está importada");
      } else {
        toast.success(`Importada: ${activity.name}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao importar");
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display font-semibold">{activity.name}</p>
            <Badge variant="muted" className="shrink-0 text-[10px]">
              {activity.sportType}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {formatDate(activity.startDateLocal, "dd/MM/yyyy 'às' HH:mm")}
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Distância</dt>
              <dd className="font-mono font-medium">
                {formatDistance(activity.distance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tempo</dt>
              <dd className="font-mono font-medium">
                {formatDuration(activity.movingTime)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pace</dt>
              <dd className="font-mono font-medium">
                {formatPace(
                  activity.distance > 0
                    ? activity.movingTime / (activity.distance / 1000)
                    : 0,
                )}
              </dd>
            </div>
          </dl>
        </div>
        <div className="shrink-0">
          {activity.imported ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-success"
            >
              <Link to={`/runs/${activity.importedRunId}`}>
                <Check className="size-4" />
                Importada
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onImport}
              disabled={importMut.isPending}
            >
              {importMut.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Importar
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
