import {
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Dumbbell, Flame, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  CartesianGrid,
  Bar,
  BarChart,
  LabelList,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals } from "@/hooks/use-goals";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWorkouts } from "@/hooks/use-workouts";
import { computeStreaks } from "@/lib/streak";
import { cn } from "@/lib/utils";

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
  const isMobile = useMediaQuery("(max-width: 767px)");

  const weeklyGoal = goals.data?.weeklyWorkoutGoal ?? 1;
  const streaks = useMemo(
    () => computeStreaks(workouts.data ?? [], weeklyGoal),
    [workouts.data, weeklyGoal],
  );

  const weeklyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const ref = subWeeks(today, 11 - i);
      const start = startOfWeek(ref, { weekStartsOn: 0 });
      const end = endOfWeek(ref, { weekStartsOn: 0 });
      const items = (workouts.data ?? []).filter((w) =>
        isSameWeek(new Date(w.date), ref, { weekStartsOn: 0 }),
      );
      return {
        week: format(start, "dd/MM", { locale: ptBR }),
        treinos: items.length,
        start,
        end,
      };
    });
  }, [workouts.data]);

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

  const [selectedCategory, setSelectedCategory] = useState<"Upper" | "Lower">(
    "Upper",
  );

  // Top-set por treino, agrupado por exercício.
  const progressByExercise = useMemo(() => {
    const map = new Map<string, ProgressPoint[]>();
    if (!workouts.data) return map;
    for (const ex of exercisesInWorkouts) {
      const points = workouts.data
        .map((w) => {
          const we = w.exercises.find((e) => e.exerciseId === ex.id);
          if (!we || we.sets.length === 0) return null;
          const firstSet = we.sets[0];
          if (!firstSet) return null;
          const top = we.sets.reduce(
            (best, s) =>
              s.weight > best.weight ||
              (s.weight === best.weight && s.reps > best.reps)
                ? s
                : best,
            firstSet,
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

      let runningMax = -Infinity;
      const withPr: ProgressPoint[] = points.map((p) => {
        const isPr = p.weight > runningMax;
        if (p.weight > runningMax) runningMax = p.weight;
        return { ...p, isPr };
      });
      map.set(ex.id, withPr);
    }
    return map;
  }, [workouts.data, exercisesInWorkouts]);

  // Só lista exercícios com pelo menos 2 pontos (gráfico só faz sentido a partir daí).
  const exercisesByCategory = useMemo(() => {
    const upper: typeof exercisesInWorkouts = [];
    const lower: typeof exercisesInWorkouts = [];
    for (const ex of exercisesInWorkouts) {
      const points = progressByExercise.get(ex.id);
      if (!points || points.length < 2) continue;
      if (ex.category === "Upper") upper.push(ex);
      else if (ex.category === "Lower") lower.push(ex);
    }
    return { upper, lower };
  }, [exercisesInWorkouts, progressByExercise]);

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
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Sequência"
          value={
            workouts.isLoading || goals.isLoading ? (
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
          label="Melhor"
          value={
            workouts.isLoading || goals.isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              streaks.best
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
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card p-5">
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
        <div
          className="w-full min-w-0"
          style={{ height: isMobile ? 360 : 288 }}
        >
          {workouts.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : isMobile ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                layout="vertical"
                margin={{ top: 4, right: 28, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  allowDecimals={false}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="week"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 13,
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
                  radius={[0, 6, 6, 0]}
                  maxBarSize={18}
                >
                  <LabelList
                    dataKey="treinos"
                    position="right"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    formatter={(v) => (typeof v === "number" && v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 20, right: 4, bottom: 0, left: 0 }}
              >
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
                  fontSize={12}
                  minTickGap={24}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 13,
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
                >
                  <LabelList
                    dataKey="treinos"
                    position="top"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    formatter={(v) => (typeof v === "number" && v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card p-5">
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Evolução
          </p>
          <h2 className="font-display text-lg font-semibold">
            Carga máxima por exercício
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            O top set de cada treino ao longo do tempo, separado por categoria.
          </p>
        </header>

        {workouts.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : exercisesInWorkouts.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nenhum exercício registrado ainda"
            description="Quando você registrar treinos, vai poder ver aqui a evolução de cada exercício."
          />
        ) : (
          <Tabs
            value={selectedCategory}
            onValueChange={(v) =>
              setSelectedCategory(v as "Upper" | "Lower")
            }
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="Upper">Superiores</TabsTrigger>
              <TabsTrigger value="Lower">Inferiores</TabsTrigger>
            </TabsList>
            <TabsContent value="Upper">
              <ExerciseProgressList
                exercises={exercisesByCategory.upper}
                progressByExercise={progressByExercise}
              />
            </TabsContent>
            <TabsContent value="Lower">
              <ExerciseProgressList
                exercises={exercisesByCategory.lower}
                progressByExercise={progressByExercise}
              />
            </TabsContent>
          </Tabs>
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

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  sessions: number;
}

function ExerciseProgressList({
  exercises,
  progressByExercise,
}: {
  exercises: ExerciseRow[];
  progressByExercise: Map<string, ProgressPoint[]>;
}) {
  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem dados suficientes"
        description="Registre pelo menos dois treinos com exercícios dessa categoria para ver a evolução."
      />
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {exercises.map((ex) => (
        <ExerciseProgressCard
          key={ex.id}
          name={ex.name}
          points={progressByExercise.get(ex.id) ?? []}
        />
      ))}
    </div>
  );
}

function ExerciseProgressCard({
  name,
  points,
}: {
  name: string;
  points: ProgressPoint[];
}) {
  if (points.length === 0) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const pr = points.reduce((a, b) => (b.weight > a.weight ? b : a));
  const delta = last.weight - first.weight;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/30 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium">{name}</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {points.length}× sessões
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <MiniStat label="PR" value={`${pr.weight} kg`} sub={`× ${pr.reps}`} emphasis />
        <MiniStat
          label="Última"
          value={`${last.weight} kg`}
          sub={`× ${last.reps}`}
        />
        <MiniStat
          label="Δ"
          value={`${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR")} kg`}
          tone={delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}
        />
      </div>
      <div className="h-52 w-full min-w-0 sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
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
              minTickGap={28}
              interval="preserveStartEnd"
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
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(_v, _n, item) => {
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
              activeDot={{ r: 6 }}
            />
            <ReferenceDot
              x={pr.dateLabel}
              y={pr.weight}
              r={6}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-xs",
          emphasis && "text-primary",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
        {sub && (
          <span className="ml-1 text-muted-foreground">{sub}</span>
        )}
      </p>
    </div>
  );
}

