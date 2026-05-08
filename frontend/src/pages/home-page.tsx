import {
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  Coffee,
  Dumbbell,
  Flame,
  Target,
} from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { WeightCard } from "@/components/weight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useGoals, useWeekProgress } from "@/hooks/use-goals";
import { useWorkouts } from "@/hooks/use-workouts";
import {
  formatDate,
  formatRelative,
  greetingFor,
  workoutTypeLabel,
} from "@/lib/format";
import { computeStreaks } from "@/lib/streak";
import { weeklyProgressPercent, type WeekDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEK_DAY_BY_INDEX: WeekDay[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function todayDayOfWeek(): WeekDay {
  return WEEK_DAY_BY_INDEX[new Date().getDay()] ?? "segunda";
}

export function HomePage() {
  const { user } = useAuth();
  const goals = useGoals();
  const week = useWeekProgress();
  const workouts = useWorkouts();

  const weeklyGoal = goals.data?.weeklyWorkoutGoal ?? 1;
  const streaks = computeStreaks(workouts.data ?? [], weeklyGoal);
  const recentWorkouts = (workouts.data ?? []).slice(0, 4);
  const targetDays = goals.data?.targetDays ?? [];
  const today = todayDayOfWeek();
  const todayPlan: "training" | "rest" | "unplanned" =
    targetDays.length === 0
      ? "unplanned"
      : targetDays.includes(today)
        ? "training"
        : "rest";

  return (
    <div className="space-y-8">
      <Hero username={user?.username ?? ""} todayPlan={todayPlan} />

      <WeightCard />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Sequência"
          value={
            workouts.isLoading || goals.isLoading ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              streaks.current
            )
          }
          unit="dias"
          icon={Flame}
          emphasis="primary"
          hint={
            !workouts.isLoading && !goals.isLoading && (
              <span>
                Melhor:{" "}
                <span className="font-mono text-foreground">
                  {streaks.best}
                </span>
              </span>
            )
          }
        />
        <StatCard
          label="Esta semana"
          value={
            week.isLoading ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              `${week.data?.completedWorkouts ?? 0}/${
                week.data?.targetWorkouts ?? goals.data?.weeklyWorkoutGoal ?? 3
              }`
            )
          }
          unit="treinos"
          icon={Target}
          hint={
            week.data && (
              <Progress
                value={weeklyProgressPercent(week.data)}
                className="mt-2 h-1.5"
              />
            )
          }
        />
        <StatCard
          label="Total"
          value={
            workouts.isLoading ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              workouts.data?.length ?? 0
            )
          }
          unit="treinos"
          icon={Dumbbell}
          hint="Tudo que você já registrou aqui."
        />
      </section>

      <section>
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">
            Treinos recentes
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/workouts">
              Ver todos
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </header>

        {workouts.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : recentWorkouts.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nenhum treino ainda"
            description="Quando você registrar um treino, ele aparece aqui."
            action={
              <Button asChild>
                <Link to="/workouts/new">Iniciar primeiro treino</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentWorkouts.map((w) => (
              <Link
                key={w.id}
                to={`/workouts/${w.id}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {formatRelative(w.date)}
                    </p>
                    <p className="mt-1 line-clamp-1 font-display text-base font-semibold">
                      {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(w.date, "PP")}
                    </p>
                  </div>
                  <Badge variant="muted">{workoutTypeLabel(w.workoutType)}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {w.exercises.length} exercício
                  {w.exercises.length === 1 ? "" : "s"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Hero({
  username,
  todayPlan,
}: {
  username: string;
  todayPlan: "training" | "rest" | "unplanned";
}) {
  const greeting = greetingFor();
  const firstName = username.split(/[._@\s]/)[0] ?? username;

  const heroCopy =
    todayPlan === "rest"
      ? "Dia de descanso pelo seu plano. Recupere bem — amanhã tem treino."
      : "Bora levantar? Registre seu treino de hoje e mantenha a constância.";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM")}
        </p>
        {todayPlan !== "unplanned" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
              todayPlan === "training"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {todayPlan === "training" ? (
              <CalendarCheck className="size-3" />
            ) : (
              <Coffee className="size-3" />
            )}
            {todayPlan === "training" ? "Dia de treino" : "Dia de descanso"}
          </span>
        )}
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
        {greeting},{" "}
        <span className="text-primary">{firstName || "atleta"}</span>.
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
        {heroCopy}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button asChild size="lg">
          <Link to="/workouts/new">Iniciar treino</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/progress">Ver progresso</Link>
        </Button>
      </div>
    </section>
  );
}
