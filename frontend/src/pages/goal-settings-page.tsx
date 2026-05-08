import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  Calendar,
  CalendarDays,
  Flame,
  Loader2,
  Target,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, useUpdateGoals } from "@/hooks/use-goals";
import { useWorkouts } from "@/hooks/use-workouts";
import { ApiError } from "@/lib/api-client";
import { computeStreaks } from "@/lib/streak";
import type { WeekDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS = [3, 4, 5, 6];

const WEEK_DAYS: Array<{ value: WeekDay; short: string; long: string }> = [
  { value: "segunda", short: "S", long: "Segunda" },
  { value: "terça", short: "T", long: "Terça" },
  { value: "quarta", short: "Q", long: "Quarta" },
  { value: "quinta", short: "Q", long: "Quinta" },
  { value: "sexta", short: "S", long: "Sexta" },
  { value: "sabado", short: "S", long: "Sábado" },
  { value: "domingo", short: "D", long: "Domingo" },
];

const DAY_PRESETS: Array<{ label: string; days: WeekDay[] }> = [
  { label: "Seg–Sex", days: ["segunda", "terça", "quarta", "quinta", "sexta"] },
  { label: "Seg/Qua/Sex", days: ["segunda", "quarta", "sexta"] },
  { label: "Ter/Qui/Sáb", days: ["terça", "quinta", "sabado"] },
  {
    label: "Todos os dias",
    days: [
      "segunda",
      "terça",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
      "domingo",
    ],
  },
];

function arraysEqual(a: WeekDay[], b: WeekDay[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((d) => setA.has(d));
}

export function GoalSettingsPage() {
  const goals = useGoals();
  const workouts = useWorkouts();
  const update = useUpdateGoals();

  const [weeklyDraft, setWeeklyDraft] = useState<number | null>(null);
  const [daysDraft, setDaysDraft] = useState<WeekDay[] | null>(null);

  const weeklyValue = weeklyDraft ?? goals.data?.weeklyWorkoutGoal ?? 3;
  const daysValue = daysDraft ?? goals.data?.targetDays ?? [];

  const savedGoal = goals.data?.weeklyWorkoutGoal ?? 1;
  const streaks = computeStreaks(workouts.data ?? [], savedGoal);
  const lastWorkoutDate = (workouts.data ?? [])
    .map((w) => w.date)
    .sort()
    .at(-1);
  const statsLoading = goals.isLoading || workouts.isLoading;

  const isWeeklyDirty =
    weeklyDraft !== null && weeklyDraft !== (goals.data?.weeklyWorkoutGoal ?? null);
  const isDaysDirty =
    daysDraft !== null &&
    !arraysEqual(daysDraft, goals.data?.targetDays ?? []);
  const isDirty = isWeeklyDirty || isDaysDirty;

  const toggleDay = (day: WeekDay) => {
    const cur = daysDraft ?? goals.data?.targetDays ?? [];
    if (cur.includes(day)) {
      setDaysDraft(cur.filter((d) => d !== day));
    } else {
      setDaysDraft([...cur, day]);
    }
  };

  const applyDayPreset = (days: WeekDay[]) => {
    setDaysDraft(days);
    // Sugere também ajustar a meta semanal pra bater com a quantidade de dias,
    // mas só se o usuário ainda não mexeu manualmente.
    if (weeklyDraft === null) setWeeklyDraft(days.length);
  };

  const discard = () => {
    setWeeklyDraft(null);
    setDaysDraft(goals.data?.targetDays ?? null);
  };

  const onSave = async () => {
    try {
      await update.mutateAsync({
        weeklyWorkoutGoal: weeklyValue,
        targetDays: daysValue,
      });
      toast.success("Meta atualizada");
      setWeeklyDraft(null);
      setDaysDraft(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar",
      );
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configurações"
        title="Suas metas"
        description="Defina quantos treinos por semana e quais dias você pretende treinar."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Sequência atual"
          value={
            statsLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              streaks.current
            )
          }
          unit="dias"
          icon={Flame}
          emphasis="primary"
        />
        <StatCard
          label="Melhor sequência"
          value={
            statsLoading ? <Skeleton className="h-10 w-12" /> : streaks.best
          }
          unit="dias"
          icon={Award}
        />
        <StatCard
          label="Semanas concluídas"
          value={
            statsLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              streaks.totalWeeksCompleted
            )
          }
          unit="semanas"
          icon={Calendar}
          hint={
            lastWorkoutDate && (
              <span>
                Último treino:{" "}
                <span className="text-foreground">
                  {format(new Date(lastWorkoutDate), "PP", {
                    locale: ptBR,
                  })}
                </span>
              </span>
            )
          }
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <Target className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold">
              Meta semanal de treinos
            </h2>
            <p className="text-sm text-muted-foreground">
              Quantos treinos por semana você quer fazer no total. A sequência
              reinicia quando uma semana fecha abaixo da meta.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setWeeklyDraft(p)}
                className={cn(
                  "rounded-md border px-4 py-2 font-mono text-sm transition-colors",
                  weeklyValue === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {p} / sem
              </button>
            ))}
          </div>
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="custom-goal">Personalizado</Label>
            <Input
              id="custom-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={14}
              value={weeklyValue}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) setWeeklyDraft(n);
              }}
              className="font-mono"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <CalendarDays className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold">
              Dias de treino
            </h2>
            <p className="text-sm text-muted-foreground">
              Marque os dias que você pretende treinar. A Home avisa se hoje é
              dia de treino e o calendário destaca esses dias.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEK_DAYS.map((d) => {
              const active = daysValue.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={active}
                  aria-label={d.long}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg border font-mono text-xs uppercase tracking-wider transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-[10px] tracking-[0.18em]">
                    {d.long.slice(0, 3)}
                  </span>
                  <span className="font-display text-base font-semibold">
                    {d.short}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Atalhos
            </p>
            <div className="flex flex-wrap gap-2">
              {DAY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyDayPreset(p.days)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
              {daysValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDaysDraft([])}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {daysValue.length > 0 && weeklyValue < daysValue.length && (
            <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
              Você marcou {daysValue.length} dias mas a meta semanal é{" "}
              <span className="font-mono text-foreground">{weeklyValue}</span>.
              Tudo bem — nem todo dia marcado precisa virar treino.
            </p>
          )}
        </div>
      </section>

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur safe-bottom md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center justify-end gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              onClick={discard}
              disabled={update.isPending}
            >
              Descartar
            </Button>
          )}
          <Button
            size="lg"
            onClick={onSave}
            disabled={update.isPending || !isDirty}
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
