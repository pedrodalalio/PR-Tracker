import {
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Award,
  Dumbbell,
  Flame,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  CartesianGrid,
  Bar,
  BarChart,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { WeightProgress } from "@/components/weight-progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, useStreak } from "@/hooks/use-goals";
import { useWorkouts } from "@/hooks/use-workouts";
import { categoryLabel } from "@/lib/format";
import type { Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

function workoutVolume(w: Workout) {
  return w.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.reduce((s, set) => s + set.reps * (set.weight || 0), 0),
    0,
  );
}

interface ProgressPoint {
  date: string;
  dateLabel: string;
  weight: number;
  reps: number;
  isPr: boolean;
}

export function ProgressPage() {
  const workouts = useWorkouts();
  const goals = useGoals();
  const streak = useStreak();

  const weeklyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const ref = subWeeks(today, 11 - i);
      const start = startOfWeek(ref, { weekStartsOn: 1 });
      const end = endOfWeek(ref, { weekStartsOn: 1 });
      const items = (workouts.data ?? []).filter((w) =>
        isSameWeek(new Date(w.date), ref, { weekStartsOn: 1 }),
      );
      return {
        week: format(start, "dd/MM", { locale: ptBR }),
        treinos: items.length,
        volume: items.reduce((acc, w) => acc + workoutVolume(w), 0),
        start,
        end,
      };
    });
  }, [workouts.data]);

  const totalVolume = weeklyData.reduce((acc, w) => acc + w.volume, 0);
  const avgPerWeek =
    weeklyData.reduce((acc, w) => acc + w.treinos, 0) / weeklyData.length;

  // Exercícios que aparecem em pelo menos um treino (ordenados por nome).
  const exercisesInWorkouts = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; category: string; sessions: number }
    >();
    for (const w of workouts.data ?? []) {
      for (const we of w.exercises) {
        const cur = map.get(we.exercise.id);
        if (cur) {
          cur.sessions += 1;
        } else {
          map.set(we.exercise.id, {
            id: we.exercise.id,
            name: we.exercise.name,
            category: we.exercise.category,
            sessions: 1,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts.data]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  // Default: pega o primeiro exercício da lista quando carregar.
  useEffect(() => {
    if (selectedExerciseId) return;
    if (exercisesInWorkouts.length > 0) {
      setSelectedExerciseId(exercisesInWorkouts[0]!.id);
    }
  }, [exercisesInWorkouts, selectedExerciseId]);

  // Pontos do gráfico — uma entrada por treino, com a melhor série do dia.
  const exerciseProgress = useMemo<ProgressPoint[]>(() => {
    if (!selectedExerciseId || !workouts.data) return [];
    const points = workouts.data
      .map((w) => {
        const we = w.exercises.find((e) => e.exerciseId === selectedExerciseId);
        if (!we || we.sets.length === 0) return null;
        const top = we.sets.reduce(
          (best, s) =>
            s.weight > best.weight ||
            (s.weight === best.weight && s.reps > best.reps)
              ? s
              : best,
          we.sets[0]!,
        );
        return {
          date: w.date,
          dateLabel: format(new Date(w.date), "dd/MM", { locale: ptBR }),
          weight: top.weight,
          reps: top.reps,
        };
      })
      .filter((p): p is Omit<ProgressPoint, "isPr"> => p !== null)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

    // Marca PRs (maior carga até a data)
    let runningMax = -Infinity;
    return points.map((p) => {
      const isPr = p.weight > runningMax;
      if (p.weight > runningMax) runningMax = p.weight;
      return { ...p, isPr };
    });
  }, [workouts.data, selectedExerciseId]);

  const exerciseSummary = useMemo(() => {
    if (exerciseProgress.length === 0) return null;
    const first = exerciseProgress[0]!;
    const last = exerciseProgress[exerciseProgress.length - 1]!;
    const pr = exerciseProgress.reduce((a, b) =>
      b.weight > a.weight ? b : a,
    );
    return {
      sessions: exerciseProgress.length,
      first,
      last,
      pr,
      delta: last.weight - first.weight,
    };
  }, [exerciseProgress]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "peso" ? "peso" : "treinos";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Estatísticas"
        title="Seu progresso"
        description="Tendências dos últimos três meses, frequência semanal e evolução por exercício."
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams);
          if (value === "treinos") next.delete("tab");
          else next.set("tab", value);
          setSearchParams(next, { replace: true });
        }}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="treinos">Treinos</TabsTrigger>
          <TabsTrigger value="peso">Peso</TabsTrigger>
        </TabsList>

        <TabsContent value="treinos" className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sequência"
          value={
            streak.isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              streak.data?.currentStreak ?? 0
            )
          }
          unit="dias"
          icon={Flame}
          emphasis="primary"
        />
        <StatCard
          label="Melhor"
          value={
            streak.isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              streak.data?.bestStreak ?? 0
            )
          }
          unit="dias"
          icon={TrendingUp}
        />
        <StatCard
          label="Média / semana"
          value={
            workouts.isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              avgPerWeek.toFixed(1)
            )
          }
          unit="treinos"
          icon={Activity}
        />
        <StatCard
          label="Volume 12 sem."
          value={
            workouts.isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              Math.round(totalVolume).toLocaleString("pt-BR")
            )
          }
          unit="kg·rep"
          icon={Dumbbell}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Frequência
            </p>
            <h2 className="font-display text-lg font-semibold">
              Treinos por semana
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            últimas 12 semanas
          </span>
        </header>
        <div className="h-64 w-full">
          {workouts.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
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
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(value) => {
                    const v = Number(value);
                    return [`${v} treino${v === 1 ? "" : "s"}`, ""];
                  }}
                />
                <Bar
                  dataKey="treinos"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Evolução
            </p>
            <h2 className="font-display text-lg font-semibold">
              Maior carga por treino
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A melhor série de cada treino, ao longo do tempo.
            </p>
          </div>
          <Select
            value={selectedExerciseId ?? ""}
            onValueChange={(v) => setSelectedExerciseId(v)}
            disabled={exercisesInWorkouts.length === 0}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Escolha um exercício" />
            </SelectTrigger>
            <SelectContent>
              {exercisesInWorkouts.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  <span className="flex items-center gap-2">
                    <span>{ex.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {categoryLabel(ex.category)} · {ex.sessions}x
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        {workouts.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : exercisesInWorkouts.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nenhum exercício registrado ainda"
            description="Quando você registrar treinos, vai poder ver aqui a evolução de cada exercício."
          />
        ) : exerciseProgress.length < 2 ? (
          <EmptyState
            icon={TrendingUp}
            title="Precisa de mais dados"
            description={
              exerciseProgress.length === 1
                ? "Você só tem um treino com esse exercício. Registre mais um pra ver a evolução."
                : "Esse exercício ainda não tem treinos."
            }
          />
        ) : (
          <>
            {exerciseSummary && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Mini
                  label="Sessões"
                  value={exerciseSummary.sessions}
                  unit="treinos"
                />
                <Mini
                  label="PR"
                  value={`${exerciseSummary.pr.weight}`}
                  unit={`kg × ${exerciseSummary.pr.reps}`}
                  emphasis
                  icon={Award}
                />
                <Mini
                  label="Última"
                  value={`${exerciseSummary.last.weight}`}
                  unit={`kg × ${exerciseSummary.last.reps}`}
                />
                <Mini
                  label="Evolução"
                  value={
                    exerciseSummary.delta > 0
                      ? `+${exerciseSummary.delta.toLocaleString("pt-BR")}`
                      : exerciseSummary.delta.toLocaleString("pt-BR")
                  }
                  unit="kg"
                  icon={
                    exerciseSummary.delta > 0
                      ? TrendingUp
                      : exerciseSummary.delta < 0
                        ? TrendingDown
                        : undefined
                  }
                  tone={
                    exerciseSummary.delta > 0
                      ? "positive"
                      : exerciseSummary.delta < 0
                        ? "negative"
                        : "neutral"
                  }
                />
              </div>
            )}

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={exerciseProgress}
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
                    width={36}
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
                      const p = item.payload as ProgressPoint;
                      return [`${p.weight} kg × ${p.reps}`, "Top set"];
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
                  {exerciseSummary && (
                    <ReferenceDot
                      x={exerciseSummary.pr.dateLabel}
                      y={exerciseSummary.pr.weight}
                      r={6}
                      fill="var(--primary)"
                      stroke="var(--background)"
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {goals.data && (
        <p className="text-center text-xs text-muted-foreground">
          Meta semanal:{" "}
          <span className="font-mono text-foreground">
            {goals.data.weeklyWorkoutGoal}
          </span>{" "}
          treinos · Concluiu{" "}
          <span className="font-mono text-foreground">
            {goals.data.totalWeeksCompleted}
          </span>{" "}
          semanas no total.
        </p>
      )}
        </TabsContent>

        <TabsContent value="peso" className="space-y-6">
          <WeightProgress />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MiniProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: typeof TrendingUp;
  emphasis?: boolean;
  tone?: "positive" | "negative" | "neutral";
}

function Mini({ label, value, unit, icon: Icon, emphasis, tone }: MiniProps) {
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
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
        {Icon && (
          <Icon
            className={cn(
              "ml-auto size-3.5 text-muted-foreground",
              emphasis && "text-primary",
              tone === "positive" && "text-success",
              tone === "negative" && "text-destructive",
            )}
          />
        )}
      </div>
    </div>
  );
}
