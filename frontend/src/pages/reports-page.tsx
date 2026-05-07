import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isWithinInterval,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Minus,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useGoals, useWeeklyGoalHistory } from "@/hooks/use-goals";
import { useWeights } from "@/hooks/use-weights";
import { useWorkouts } from "@/hooks/use-workouts";
import { categoryLabel, workoutTypeLabel } from "@/lib/format";
import type {
  WeekDay,
  WeeklyGoalEntry,
  Workout,
  WorkoutType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTH_KEY_FORMAT = "yyyy-MM";

const WEEK_DAY_BY_INDEX: WeekDay[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function formatMonthKey(date: Date) {
  return format(date, MONTH_KEY_FORMAT);
}

function parseMonthKey(key: string): Date | null {
  const parsed = parse(key, MONTH_KEY_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? null : startOfMonth(parsed);
}

interface PlannedAdherence {
  metCount: number;
  plannedCount: number;
  percent: number;
}

interface PeriodMetrics {
  workouts: Workout[];
  totalWorkouts: number;
  daysTrained: number;
  byType: Record<WorkoutType, number>;
  plannedAdherence: PlannedAdherence | null;
}

// Percorre os dias do mês, conta os que caem em targetDays (até "today") e marca
// quantos tiveram pelo menos um treino. Para o mês corrente, ignora dias futuros.
function computePlannedAdherence(
  trainedDays: Set<string>,
  start: Date,
  end: Date,
  targetDays: WeekDay[],
  today: Date,
): PlannedAdherence | null {
  if (targetDays.length === 0) return null;
  const targetSet = new Set(targetDays);
  const cap = end < today ? end : today;

  let plannedCount = 0;
  let metCount = 0;
  for (
    let d = new Date(start);
    d <= cap;
    d = addDays(d, 1)
  ) {
    const weekday = WEEK_DAY_BY_INDEX[getDay(d)] ?? "segunda";
    if (!targetSet.has(weekday)) continue;
    plannedCount += 1;
    const key = format(d, "yyyy-MM-dd");
    if (trainedDays.has(key)) metCount += 1;
  }

  if (plannedCount === 0) return null;
  return {
    metCount,
    plannedCount,
    percent: Math.round((metCount / plannedCount) * 100),
  };
}

function computeMetrics(
  workouts: Workout[],
  start: Date,
  end: Date,
  targetDays: WeekDay[],
  today: Date,
): PeriodMetrics {
  const inPeriod = workouts.filter((w) =>
    isWithinInterval(new Date(w.date), { start, end }),
  );

  const days = new Set(
    inPeriod.map((w) => format(new Date(w.date), "yyyy-MM-dd")),
  );

  const byType: Record<WorkoutType, number> = {
    upper: 0,
    lower: 0,
    cardio: 0,
  };
  for (const w of inPeriod) byType[w.workoutType] += 1;

  return {
    workouts: inPeriod,
    totalWorkouts: inPeriod.length,
    daysTrained: days.size,
    byType,
    plannedAdherence: computePlannedAdherence(
      days,
      start,
      end,
      targetDays,
      today,
    ),
  };
}

type RangeMode = "monthly" | "6m" | "12m";

interface PeriodInfo {
  mode: RangeMode;
  start: Date;
  end: Date;
  monthCount: number;
}

function buildPeriod(
  mode: RangeMode,
  selectedMonth: Date,
  today: Date,
): PeriodInfo {
  if (mode === "monthly") {
    return {
      mode,
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
      monthCount: 1,
    };
  }
  const months = mode === "6m" ? 6 : 12;
  return {
    mode,
    start: startOfMonth(subMonths(today, months - 1)),
    end: endOfMonth(today),
    monthCount: months,
  };
}

function previousPeriodBounds(period: PeriodInfo): {
  start: Date;
  end: Date;
} {
  if (period.mode === "monthly") {
    const prev = subMonths(period.start, 1);
    return { start: startOfMonth(prev), end: endOfMonth(prev) };
  }
  return {
    start: subMonths(period.start, period.monthCount),
    end: endOfMonth(subMonths(period.start, 1)),
  };
}

function periodTitle(period: PeriodInfo): string {
  if (period.mode === "monthly") {
    return format(period.start, "MMMM 'de' yyyy", { locale: ptBR });
  }
  return period.mode === "6m" ? "Últimos 6 meses" : "Últimos 12 meses";
}

function periodSubtitle(period: PeriodInfo): string {
  if (period.mode === "monthly") return "";
  return `${format(period.start, "MMM/yy", { locale: ptBR })} → ${format(
    period.end,
    "MMM/yy",
    { locale: ptBR },
  )}`;
}

// Resolve a meta semanal vigente em um determinado momento.
// Regra: para uma semana terminando em weekEnd, usamos a entrada mais recente
// com effectiveFrom <= min(today, weekEnd). Pra semanas atuais/futuras isso
// equivale a "meta atual"; pra passadas, usa o valor que estava ativo ao fim
// daquela semana.
function resolveGoalForWeek(
  history: WeeklyGoalEntry[],
  weekEnd: Date,
  today: Date,
  fallback: number,
): number {
  if (history.length === 0) return fallback;
  const anchor = weekEnd < today ? weekEnd : today;
  let value = fallback;
  for (const entry of history) {
    if (new Date(entry.effectiveFrom) <= anchor) {
      value = entry.weeklyWorkoutGoal;
    } else {
      break;
    }
  }
  return value;
}

export function ReportsPage() {
  const workouts = useWorkouts();
  const weights = useWeights();
  const goals = useGoals();
  const goalHistory = useWeeklyGoalHistory();

  const [searchParams, setSearchParams] = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const queryMonth = searchParams.get("ym");
  const queryRange = searchParams.get("range");
  const rangeMode: RangeMode =
    queryRange === "6m" || queryRange === "12m" ? queryRange : "monthly";
  const selectedMonth = useMemo(() => {
    if (queryMonth) {
      const parsed = parseMonthKey(queryMonth);
      if (parsed) return parsed;
    }
    return startOfMonth(today);
  }, [queryMonth, today]);

  function setMonth(date: Date) {
    const next = new URLSearchParams(searchParams);
    if (isSameMonth(date, today)) next.delete("ym");
    else next.set("ym", formatMonthKey(date));
    setSearchParams(next, { replace: true });
  }

  function setRangeMode(mode: RangeMode) {
    const next = new URLSearchParams(searchParams);
    if (mode === "monthly") next.delete("range");
    else next.set("range", mode);
    setSearchParams(next, { replace: true });
  }

  const period = useMemo(
    () => buildPeriod(rangeMode, selectedMonth, today),
    [rangeMode, selectedMonth, today],
  );
  const prevBounds = useMemo(() => previousPeriodBounds(period), [period]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts.data ?? [])
      set.add(formatMonthKey(startOfMonth(new Date(w.date))));
    for (const we of weights.data ?? [])
      set.add(formatMonthKey(startOfMonth(new Date(we.recordedAt))));
    set.add(formatMonthKey(startOfMonth(today)));
    set.add(formatMonthKey(selectedMonth));
    return [...set]
      .map((k) => parseMonthKey(k))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());
  }, [workouts.data, weights.data, today, selectedMonth]);

  const isLoading = workouts.isLoading || goals.isLoading;

  const targetDays = useMemo(
    () => goals.data?.targetDays ?? [],
    [goals.data?.targetDays],
  );
  const current = useMemo(
    () =>
      computeMetrics(
        workouts.data ?? [],
        period.start,
        period.end,
        targetDays,
        today,
      ),
    [workouts.data, period, targetDays, today],
  );
  const previous = useMemo(
    () =>
      computeMetrics(
        workouts.data ?? [],
        prevBounds.start,
        prevBounds.end,
        targetDays,
        today,
      ),
    [workouts.data, prevBounds, targetDays, today],
  );

  const isFutureMonth = rangeMode === "monthly" && selectedMonth > today;

  const subtitle = periodSubtitle(period);
  const noDataInPeriod =
    current.totalWorkouts === 0 &&
    (weights.data ?? []).every((w) => {
      const d = new Date(w.recordedAt);
      return d < period.start || d > period.end;
    });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Relatórios"
        title={periodTitle(period)}
        description={
          subtitle ||
          "Resumo do mês com comparativos, distribuição por categoria, heatmap e evolução de peso."
        }
        action={
          rangeMode === "monthly" ? (
            <MonthPicker
              selected={selectedMonth}
              available={availableMonths}
              onChange={setMonth}
            />
          ) : null
        }
      />

      <Tabs
        value={rangeMode}
        onValueChange={(v) => setRangeMode(v as RangeMode)}
      >
        <TabsList>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="6m">Últimos 6 meses</TabsTrigger>
          <TabsTrigger value="12m">Últimos 12 meses</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ReportSkeleton />
      ) : isFutureMonth ? (
        <EmptyState
          icon={CalendarDays}
          title="Mês ainda não chegou"
          description="Volte ao mês atual ou escolha um mês passado pra ver o relatório."
        />
      ) : noDataInPeriod ? (
        <EmptyState
          icon={Dumbbell}
          title="Sem registros nesse período"
          description="Não há treinos nem peso registrado. Tente outro mês ou um intervalo maior."
        />
      ) : (
        <>
          {rangeMode !== "monthly" && (
            <TrendsSection
              allWorkouts={workouts.data ?? []}
              weights={weights.data ?? []}
              goalHistory={goalHistory.data ?? []}
              today={today}
              selectedMonth={selectedMonth}
              currentGoalValue={goals.data?.weeklyWorkoutGoal ?? 0}
              monthCount={period.monthCount}
            />
          )}

          <SummarySection current={current} previous={previous} />
          <CategorySection current={current} />

          {rangeMode === "monthly" && (
            <HeatmapSection
              month={selectedMonth}
              allWorkouts={workouts.data ?? []}
              goalForWeek={(weekEnd) =>
                resolveGoalForWeek(
                  (goalHistory.data ?? []).slice().sort(
                    (a, b) =>
                      new Date(a.effectiveFrom).getTime() -
                      new Date(b.effectiveFrom).getTime(),
                  ),
                  weekEnd,
                  today,
                  goals.data?.weeklyWorkoutGoal ?? 0,
                )
              }
              targetDays={targetDays}
            />
          )}

          <WeightSection
            start={period.start}
            end={period.end}
            entries={weights.data ?? []}
          />
          <TopAndPRsSection
            allWorkouts={workouts.data ?? []}
            start={period.start}
            end={period.end}
            workoutsInPeriod={current.workouts}
          />

          {rangeMode === "monthly" ? (
            <MonthlyExercisesSection workoutsInPeriod={current.workouts} />
          ) : (
            <ExerciseTrendsSection
              allWorkouts={workouts.data ?? []}
              today={today}
              monthCount={period.monthCount}
            />
          )}
        </>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-72" />
      <Skeleton className="h-56" />
    </div>
  );
}

interface MonthPickerProps {
  selected: Date;
  available: Date[];
  onChange: (date: Date) => void;
}

function MonthPicker({ selected, available, onChange }: MonthPickerProps) {
  const today = new Date();
  const canGoNext = !isSameMonth(selected, today) && selected < today;
  const selectedKey = formatMonthKey(selected);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(subMonths(selected, 1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Select
        value={selectedKey}
        onValueChange={(value) => {
          const parsed = parseMonthKey(value);
          if (parsed) onChange(parsed);
        }}
      >
        <SelectTrigger className="min-w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {available.map((m) => {
            const key = formatMonthKey(m);
            return (
              <SelectItem key={key} value={key}>
                {format(m, "MMMM 'de' yyyy", { locale: ptBR })}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        disabled={!canGoNext}
        onClick={() => onChange(addMonths(selected, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

interface SummarySectionProps {
  current: PeriodMetrics;
  previous: PeriodMetrics;
}

function SummarySection({ current, previous }: SummarySectionProps) {
  const adherence = current.plannedAdherence;
  const adherencePrev = previous.plannedAdherence;
  const showAdherence = adherence !== null;

  return (
    <section
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        showAdherence && "lg:grid-cols-3",
      )}
    >
      <SummaryCard
        label="Treinos"
        value={current.totalWorkouts}
        previous={previous.totalWorkouts}
        unit={current.totalWorkouts === 1 ? "treino" : "treinos"}
        icon={Dumbbell}
        emphasis
      />
      <SummaryCard
        label="Dias treinados"
        value={current.daysTrained}
        previous={previous.daysTrained}
        unit={current.daysTrained === 1 ? "dia" : "dias"}
        icon={CalendarDays}
      />
      {adherence && (
        <SummaryCard
          label="Aderência ao plano"
          value={adherence.percent}
          previous={adherencePrev?.percent ?? null}
          unit="%"
          icon={Target}
          subtitle={`${adherence.metCount} de ${adherence.plannedCount} dias planejados`}
          deltaUnit="pp"
        />
      )}
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: number | null;
  previous: number | null;
  unit?: string;
  icon: typeof Dumbbell;
  emphasis?: boolean;
  formatter?: (n: number) => string;
  subtitle?: string;
  deltaUnit?: string;
}

function SummaryCard({
  label,
  value,
  previous,
  unit,
  icon: Icon,
  emphasis,
  formatter,
  subtitle,
  deltaUnit,
}: SummaryCardProps) {
  const display =
    value === null
      ? "—"
      : formatter
        ? formatter(value)
        : value.toLocaleString("pt-BR");

  let delta: number | null = null;
  if (value !== null && previous !== null && (value !== 0 || previous !== 0)) {
    delta = value - previous;
  }

  const trend = delta === null ? "neutral" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5",
        emphasis && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-md",
            emphasis ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-3xl font-bold tracking-tight md:text-4xl",
            emphasis && "text-primary",
          )}
        >
          {display}
        </span>
        {unit && value !== null && (
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendIcon
          className={cn(
            "size-3.5",
            trend === "up" && "text-emerald-600 dark:text-emerald-400",
            trend === "down" && "text-amber-600 dark:text-amber-400",
          )}
        />
        {delta === null ? (
          <span>Sem comparativo</span>
        ) : delta === 0 ? (
          <span>Igual ao mês anterior</span>
        ) : (
          <span
            className={cn(
              trend === "up" && "text-emerald-700 dark:text-emerald-400",
              trend === "down" && "text-amber-700 dark:text-amber-400",
            )}
          >
            {delta > 0 ? "+" : ""}
            {formatter
              ? formatter(Math.abs(delta))
              : Math.abs(delta).toLocaleString("pt-BR")}
            {deltaUnit ? ` ${deltaUnit}` : ""} vs mês anterior
          </span>
        )}
      </div>
    </div>
  );
}

interface CategorySectionProps {
  current: PeriodMetrics;
}

function CategorySection({ current }: CategorySectionProps) {
  const total = current.totalWorkouts;
  const rows: Array<{ key: WorkoutType; label: string; value: number }> = [
    { key: "upper", label: workoutTypeLabel("upper"), value: current.byType.upper },
    { key: "lower", label: workoutTypeLabel("lower"), value: current.byType.lower },
    {
      key: "cardio",
      label: workoutTypeLabel("cardio"),
      value: current.byType.cardio,
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Distribuição
        </p>
        <h2 className="font-display text-lg font-semibold">Treinos por categoria</h2>
      </header>
      {total === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sem treinos nesse mês"
          description="Quando você registrar treinos, a distribuição aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const pct = total === 0 ? 0 : Math.round((row.value / total) * 100);
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{row.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.value} · {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      row.key === "upper" && "bg-primary",
                      row.key === "lower" &&
                        "bg-amber-500/80 dark:bg-amber-400/80",
                      row.key === "cardio" &&
                        "bg-sky-500/80 dark:bg-sky-400/80",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface HeatmapSectionProps {
  month: Date;
  allWorkouts: Workout[];
  goalForWeek: (weekEnd: Date) => number;
  targetDays: WeekDay[];
}

interface DayCell {
  date: Date;
  inMonth: boolean;
  trained: boolean;
  isPlanned: boolean;
}

interface WeekRow {
  cells: DayCell[];
  weekCount: number;
  weekGoal: number;
  goalMet: boolean;
  belongsToMonth: boolean;
}

function HeatmapSection({
  month,
  allWorkouts,
  goalForWeek,
  targetDays,
}: HeatmapSectionProps) {
  const { start, end } = useMemo(
    () => ({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month],
  );
  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const trainedDays = useMemo(() => {
    const set = new Set<string>();
    for (const w of allWorkouts)
      set.add(format(new Date(w.date), "yyyy-MM-dd"));
    return set;
  }, [allWorkouts]);

  const rows = useMemo<WeekRow[]>(() => {
    // Semana começa no domingo (getDay = 0)
    const offset = getDay(start);
    const firstSunday = addDays(start, -offset);
    const endWeekday = getDay(end);
    const lastSaturday = addDays(end, 6 - endWeekday);
    const totalCells =
      Math.round(
        (lastSaturday.getTime() - firstSunday.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1;
    const result: WeekRow[] = [];

    for (let w = 0; w < totalCells / 7; w++) {
      const cells: DayCell[] = [];
      let weekCount = 0;
      for (let i = 0; i < 7; i++) {
        const date = addDays(firstSunday, w * 7 + i);
        const key = format(date, "yyyy-MM-dd");
        const trained = trainedDays.has(key);
        const inMonth = date >= start && date <= end;
        const weekday = WEEK_DAY_BY_INDEX[getDay(date)] ?? "segunda";
        cells.push({
          date,
          inMonth,
          trained,
          isPlanned: targetDays.includes(weekday),
        });
        if (trained) weekCount += 1;
      }
      const weekEnd = cells[cells.length - 1]!.date;
      const weekGoal = goalForWeek(weekEnd);
      // Regra ISO-ish: a semana "pertence" ao mês cuja quinta-feira ela contém.
      // Evita inflar o denominador com a primeira/última linha que mal toca o mês.
      // Com domingo como dia 0 da semana, quinta cai no índice 4.
      const thursday = cells[4]!.date;
      result.push({
        cells,
        weekCount,
        weekGoal,
        goalMet: weekGoal > 0 && weekCount >= weekGoal,
        belongsToMonth: isSameMonth(thursday, month),
      });
    }
    return result;
  }, [start, end, month, trainedDays, targetDays, goalForWeek]);

  const totalDaysTrained = rows.reduce(
    (acc, row) => acc + row.cells.filter((c) => c.inMonth && c.trained).length,
    0,
  );
  const monthRows = rows.filter((r) => r.belongsToMonth);
  const weeksMet = monthRows.filter((r) => r.goalMet).length;
  const hasAnyWeeklyGoal = monthRows.some((r) => r.weekGoal > 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Calendário
          </p>
          <h2 className="font-display text-lg font-semibold">
            Dias treinados
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {totalDaysTrained} dias
          {hasAnyWeeklyGoal && (
            <>
              {" · "}
              {weeksMet}/{monthRows.length} semanas na meta
            </>
          )}
        </span>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-7 gap-1.5 text-center">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="w-16 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Semana
          </div>
        </div>

        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-2">
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {row.cells.map((cell) => (
                <DayBox key={cell.date.toISOString()} cell={cell} />
              ))}
            </div>
            {row.belongsToMonth ? (
              <WeekSummary
                weekCount={row.weekCount}
                goal={row.weekGoal}
                goalMet={row.goalMet}
              />
            ) : (
              <div className="w-16" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm bg-primary" />
          treinou
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm border border-border bg-background" />
          não treinou
        </span>
        {targetDays.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-sm border border-primary/50 bg-background" />
            dia planejado
          </span>
        )}
        {hasAnyWeeklyGoal && (
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-sm bg-emerald-500/30 dark:bg-emerald-400/30" />
            meta da semana
          </span>
        )}
      </div>
    </section>
  );
}

function DayBox({ cell }: { cell: DayCell }) {
  const title = `${format(cell.date, "PPP", { locale: ptBR })} — ${cell.trained ? "treinou" : "não treinou"}${cell.isPlanned ? " · dia planejado" : ""}`;

  return (
    <div
      title={title}
      className={cn(
        "relative aspect-square rounded-md border text-[10px] font-mono flex items-end justify-end p-1",
        !cell.inMonth
          ? "border-transparent bg-muted/30 text-muted-foreground/40"
          : cell.trained
            ? "border-primary bg-primary text-primary-foreground"
            : cell.isPlanned
              ? "border-primary/50 bg-background text-muted-foreground"
              : "border-border bg-background text-muted-foreground",
      )}
    >
      <span className={cn(cell.trained && "font-semibold")}>
        {cell.date.getDate()}
      </span>
    </div>
  );
}

function WeekSummary({
  weekCount,
  goal,
  goalMet,
}: {
  weekCount: number;
  goal: number;
  goalMet: boolean;
}) {
  if (goal <= 0) {
    return (
      <div className="w-16 text-center font-mono text-xs text-muted-foreground">
        {weekCount}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "w-16 rounded-md border px-2 py-1 text-center font-mono text-xs",
        goalMet
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      <span className={cn("font-semibold", goalMet && "text-emerald-700 dark:text-emerald-400")}>
        {weekCount}
      </span>
      <span className="text-muted-foreground">/{goal}</span>
    </div>
  );
}

interface WeightSectionProps {
  start: Date;
  end: Date;
  entries: import("@/lib/types").WeightEntry[];
}

function WeightSection({ start, end, entries }: WeightSectionProps) {
  const inPeriod = useMemo(
    () =>
      entries
        .filter((e) => {
          const d = new Date(e.recordedAt);
          return d >= start && d <= end;
        })
        .sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() -
            new Date(b.recordedAt).getTime(),
        ),
    [entries, start, end],
  );

  const data = inPeriod.map((e) => ({
    dateLabel: format(new Date(e.recordedAt), "dd/MM", { locale: ptBR }),
    weight: e.weight,
  }));

  const first = inPeriod[0];
  const last = inPeriod[inPeriod.length - 1];
  const delta =
    first && last ? Math.round((last.weight - first.weight) * 10) / 10 : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Peso corporal
          </p>
          <h2 className="font-display text-lg font-semibold">
            Evolução no período
          </h2>
        </div>
        {delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
              delta > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : delta < 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} kg no período
          </span>
        )}
      </header>
      {inPeriod.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Sem registros de peso no período"
          description="Registre seu peso na home pra ver a evolução aqui."
        />
      ) : inPeriod.length === 1 ? (
        <div className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
          Apenas um registro no período:{" "}
          <span className="font-mono text-foreground">
            {first!.weight.toFixed(1)} kg
          </span>{" "}
          em {format(new Date(first!.recordedAt), "PP", { locale: ptBR })}.
          Registre mais pesagens pra ver evolução.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
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
                formatter={(_v, _n, item) => [
                  `${(item.payload as { weight: number }).weight.toFixed(1)} kg`,
                  "Peso",
                ]}
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
  );
}

interface TopAndPRsSectionProps {
  allWorkouts: Workout[];
  workoutsInPeriod: Workout[];
  start: Date;
  end: Date;
}

interface TopExercise {
  exerciseId: string;
  name: string;
  sessions: number;
  topWeight: number;
}

interface PeriodPR {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
}

function TopAndPRsSection({
  allWorkouts,
  workoutsInPeriod,
  start,
  end,
}: TopAndPRsSectionProps) {
  const top = useMemo<TopExercise[]>(() => {
    const map = new Map<string, TopExercise>();
    for (const w of workoutsInPeriod) {
      for (const we of w.exercises) {
        const cur = map.get(we.exerciseId);
        const top = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        if (cur) {
          cur.sessions += 1;
          if (top > cur.topWeight) cur.topWeight = top;
        } else {
          map.set(we.exerciseId, {
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            sessions: 1,
            topWeight: top,
          });
        }
      }
    }
    return [...map.values()]
      .sort(
        (a, b) =>
          b.sessions - a.sessions ||
          b.topWeight - a.topWeight ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 5);
  }, [workoutsInPeriod]);

  const prs = useMemo<PeriodPR[]>(() => {
    // Para cada exercício, encontre o melhor peso *antes* do início do período.
    const bestBefore = new Map<string, number>();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate >= start) continue;
      for (const we of w.exercises) {
        const top = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        const cur = bestBefore.get(we.exerciseId) ?? 0;
        if (top > cur) bestBefore.set(we.exerciseId, top);
      }
    }

    // No período, encontre o melhor peso por exercício e marque PRs (acima do bestBefore).
    const periodBest = new Map<
      string,
      { name: string; weight: number; reps: number; date: string }
    >();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate < start || wDate > end) continue;
      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) =>
            s.weight > best.weight ||
            (s.weight === best.weight && s.reps > best.reps)
              ? s
              : best,
          { weight: 0, reps: 0 },
        );
        if (topSet.weight <= 0) continue;
        const cur = periodBest.get(we.exerciseId);
        if (
          !cur ||
          topSet.weight > cur.weight ||
          (topSet.weight === cur.weight && topSet.reps > cur.reps)
        ) {
          periodBest.set(we.exerciseId, {
            name: we.exercise.name,
            weight: topSet.weight,
            reps: topSet.reps,
            date: w.date,
          });
        }
      }
    }

    const results: PeriodPR[] = [];
    for (const [exerciseId, data] of periodBest) {
      const before = bestBefore.get(exerciseId) ?? 0;
      if (data.weight > before) {
        results.push({ exerciseId, ...data });
      }
    }
    return results.sort((a, b) => b.weight - a.weight);
  }, [allWorkouts, start, end]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Frequência
          </p>
          <h2 className="font-display text-lg font-semibold">
            Top exercícios
          </h2>
        </header>
        {top.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sem exercícios no período"
            description="Quando você registrar treinos, os mais frequentes aparecem aqui."
          />
        ) : (
          <ul className="space-y-3">
            {top.map((ex, i) => (
              <li
                key={ex.exerciseId}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5"
              >
                <span className="grid size-7 place-items-center rounded-md bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{ex.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {ex.sessions} sessão{ex.sessions === 1 ? "" : "ões"}
                    {ex.topWeight > 0 && (
                      <>
                        {" · "}
                        top {ex.topWeight} kg
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Recordes
            </p>
            <h2 className="font-display text-lg font-semibold">
              PRs no período
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {prs.length} novo{prs.length === 1 ? "" : "s"}
          </span>
        </header>
        {prs.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Sem PRs novos"
            description="Quando você bater uma carga máxima, ela aparece aqui."
          />
        ) : (
          <ul className="space-y-3">
            {prs.map((pr) => (
              <li
                key={pr.exerciseId}
                className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5"
              >
                <Award className="size-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{pr.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {pr.weight} kg × {pr.reps}
                    {" · "}
                    {format(new Date(pr.date), "dd/MM", { locale: ptBR })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface ExerciseChartPoint {
  date: string;
  dateLabel: string;
  weight: number;
  reps: number;
}

interface ExerciseSeries {
  exerciseId: string;
  name: string;
  category: string;
  sessions: number;
  topWeight: number;
  topReps: number;
  minWeight: number;
  delta: number;
  points: ExerciseChartPoint[];
}

function MonthlyExercisesSection({
  workoutsInPeriod,
}: {
  workoutsInPeriod: Workout[];
}) {
  const series = useMemo<ExerciseSeries[]>(() => {
    const map = new Map<string, ExerciseSeries>();

    const sortedByDate = [...workoutsInPeriod].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    for (const w of sortedByDate) {
      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) =>
            s.weight > best.weight ||
            (s.weight === best.weight && s.reps > best.reps)
              ? s
              : best,
          { weight: 0, reps: 0 },
        );

        // Pula sets sem carga (cardio etc.) — gráfico de peso não faz sentido
        if (topSet.weight <= 0) continue;

        const point: ExerciseChartPoint = {
          date: w.date,
          dateLabel: format(new Date(w.date), "dd/MM", { locale: ptBR }),
          weight: topSet.weight,
          reps: topSet.reps,
        };

        const existing = map.get(we.exerciseId);
        if (existing) {
          existing.points.push(point);
          existing.sessions += 1;
          if (
            point.weight > existing.topWeight ||
            (point.weight === existing.topWeight &&
              point.reps > existing.topReps)
          ) {
            existing.topWeight = point.weight;
            existing.topReps = point.reps;
          }
          if (point.weight < existing.minWeight) {
            existing.minWeight = point.weight;
          }
        } else {
          map.set(we.exerciseId, {
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            category: we.exercise.category,
            sessions: 1,
            topWeight: point.weight,
            topReps: point.reps,
            minWeight: point.weight,
            delta: 0,
            points: [point],
          });
        }
      }
    }

    const result = [...map.values()];
    for (const s of result) {
      s.delta =
        Math.round(
          (s.points[s.points.length - 1]!.weight - s.points[0]!.weight) * 10,
        ) / 10;
    }

    return result.sort(
      (a, b) =>
        b.sessions - a.sessions ||
        b.topWeight - a.topWeight ||
        a.name.localeCompare(b.name),
    );
  }, [workoutsInPeriod]);

  if (series.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Cargas
          </p>
          <h2 className="font-display text-lg font-semibold">
            Exercícios do mês
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top set por sessão de cada exercício com carga registrada.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {series.length} exercício{series.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <ExerciseMiniChart key={s.exerciseId} series={s} />
        ))}
      </div>
    </section>
  );
}

function ExerciseMiniChart({ series }: { series: ExerciseSeries }) {
  const single = series.points.length < 2;

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-medium">{series.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {categoryLabel(series.category)} · {series.sessions} sessão
            {series.sessions === 1 ? "" : "ões"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs font-semibold text-primary">
            {series.topWeight} kg
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            × {series.topReps}
          </p>
        </div>
      </div>

      <div className="mt-3 h-24 w-full md:h-28">
        {single ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
            só 1 sessão no mês
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series.points}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <YAxis
                hide
                domain={[
                  (dataMin: number) => Math.floor(dataMin - 1),
                  (dataMax: number) => Math.ceil(dataMax + 1),
                ]}
              />
              <XAxis dataKey="dateLabel" hide />
              <Tooltip
                cursor={{ stroke: "var(--accent)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                labelStyle={{
                  color: "var(--muted-foreground)",
                  fontSize: 10,
                }}
                formatter={(_v, _n, item) => {
                  const p = item.payload as ExerciseChartPoint;
                  return [`${p.weight} kg × ${p.reps}`, "Top set"];
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {!single && (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            min{" "}
            <span className="text-foreground">{series.minWeight} kg</span>
          </span>
          <span
            className={cn(
              series.delta > 0 && "text-emerald-700 dark:text-emerald-400",
              series.delta < 0 && "text-amber-700 dark:text-amber-400",
            )}
          >
            {series.delta > 0 ? "+" : ""}
            {series.delta} kg
          </span>
        </div>
      )}
    </div>
  );
}

interface MonthTrendPoint {
  monthKey: string;
  monthLabel: string;
  totalWorkouts: number;
  adherencePercent: number | null;
  endWeight: number | null;
}

interface TrendsSectionProps {
  allWorkouts: Workout[];
  weights: import("@/lib/types").WeightEntry[];
  goalHistory: WeeklyGoalEntry[];
  today: Date;
  selectedMonth: Date;
  currentGoalValue: number;
  monthCount: number;
}

function TrendsSection({
  allWorkouts,
  weights,
  goalHistory,
  today,
  selectedMonth,
  currentGoalValue,
  monthCount,
}: TrendsSectionProps) {
  const sortedHistory = useMemo(
    () =>
      [...goalHistory].sort(
        (a, b) =>
          new Date(a.effectiveFrom).getTime() -
          new Date(b.effectiveFrom).getTime(),
      ),
    [goalHistory],
  );

  const data = useMemo<MonthTrendPoint[]>(() => {
    const months = Array.from({ length: monthCount }, (_, i) =>
      subMonths(startOfMonth(today), monthCount - 1 - i),
    );

    return months.map((month) => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const workoutsInMonth = allWorkouts.filter((w) => {
        const d = new Date(w.date);
        return d >= start && d <= end;
      });

      // Aderência: semanas que pertencem ao mês (regra da quinta) e bateram a meta vigente
      const offset = getDay(start);
      const firstSunday = addDays(start, -offset);
      const endWeekday = getDay(end);
      const lastSaturday = addDays(end, 6 - endWeekday);

      let weeksOfMonth = 0;
      let weeksMet = 0;

      for (
        let cursor = firstSunday;
        cursor <= lastSaturday;
        cursor = addDays(cursor, 7)
      ) {
        const weekStart = cursor;
        const weekEnd = addDays(weekStart, 6);
        const thursday = addDays(weekStart, 4);
        if (!isSameMonth(thursday, month)) continue;

        weeksOfMonth += 1;

        const weekCount = allWorkouts.filter((w) => {
          const d = new Date(w.date);
          return d >= weekStart && d <= weekEnd;
        }).length;

        const weekGoal = resolveGoalForWeek(
          sortedHistory,
          weekEnd,
          today,
          currentGoalValue,
        );
        if (weekGoal > 0 && weekCount >= weekGoal) weeksMet += 1;
      }

      const adherencePercent =
        weeksOfMonth > 0
          ? Math.round((weeksMet / weeksOfMonth) * 100)
          : null;

      const monthWeights = weights
        .filter((w) => {
          const d = new Date(w.recordedAt);
          return d >= start && d <= end;
        })
        .sort(
          (a, b) =>
            new Date(b.recordedAt).getTime() -
            new Date(a.recordedAt).getTime(),
        );
      const endWeight = monthWeights[0]?.weight ?? null;

      return {
        monthKey: formatMonthKey(month),
        monthLabel: format(month, "MMM/yy", { locale: ptBR }),
        totalWorkouts: workoutsInMonth.length,
        adherencePercent,
        endWeight,
      };
    });
  }, [allWorkouts, weights, sortedHistory, today, currentGoalValue, monthCount]);

  const selectedKey = formatMonthKey(selectedMonth);
  const selectedPoint =
    data.find((d) => d.monthKey === selectedKey) ?? data[data.length - 1]!;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Tendências
          </p>
          <h2 className="font-display text-lg font-semibold">
            Últimos {monthCount} meses
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {data[0]!.monthLabel} → {data[data.length - 1]!.monthLabel}
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <TrendCard
          title="Treinos / mês"
          highlight={selectedPoint.totalWorkouts.toString()}
          unit={selectedPoint.totalWorkouts === 1 ? "treino" : "treinos"}
          data={data}
          dataKey="totalWorkouts"
          chart="bar"
          selectedKey={selectedKey}
        />
        <TrendCard
          title="Semanas na meta"
          highlight={
            selectedPoint.adherencePercent === null
              ? "—"
              : `${selectedPoint.adherencePercent}`
          }
          unit={selectedPoint.adherencePercent === null ? "" : "%"}
          data={data}
          dataKey="adherencePercent"
          chart="line"
          selectedKey={selectedKey}
        />
        <TrendCard
          title="Peso fim do mês"
          highlight={
            selectedPoint.endWeight === null
              ? "—"
              : selectedPoint.endWeight.toFixed(1)
          }
          unit={selectedPoint.endWeight === null ? "" : "kg"}
          data={data}
          dataKey="endWeight"
          chart="line"
          selectedKey={selectedKey}
        />
      </div>
    </section>
  );
}

interface TrendCardProps {
  title: string;
  highlight: string;
  unit?: string;
  data: MonthTrendPoint[];
  dataKey: "totalWorkouts" | "adherencePercent" | "endWeight";
  chart: "bar" | "line";
  selectedKey: string;
}

function TrendCard({
  title,
  highlight,
  unit,
  data,
  dataKey,
  chart,
  selectedKey,
}: TrendCardProps) {
  // Em períodos longos os labels embolam horizontalmente — inclinamos pra
  // caber todos sem perder nenhum mês.
  const wide = data.length > 6;
  const labelAngle = wide ? -35 : 0;
  const xAxisHeight = wide ? 36 : 20;
  const allNullOrZero = data.every((d) => {
    const v = d[dataKey];
    return v === null || v === 0;
  });

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold text-primary tracking-tight">
          {highlight}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-3 w-full",
          wide ? "h-36 md:h-40 lg:h-44" : "h-28 md:h-32 lg:h-36",
        )}
      >
        {allNullOrZero ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
            sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chart === "bar" ? (
              <BarChart
                data={data}
                margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
              >
                <XAxis
                  dataKey="monthLabel"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  interval={0}
                  angle={labelAngle}
                  textAnchor={wide ? "end" : "middle"}
                  height={xAxisHeight}
                  tickMargin={4}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)", fontSize: 10 }}
                  formatter={(value) => [`${value}`, title]}
                />
                <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {data.map((d) => (
                    <Cell
                      key={d.monthKey}
                      fill="var(--primary)"
                      fillOpacity={d.monthKey === selectedKey ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart
                data={data}
                margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
              >
                <XAxis
                  dataKey="monthLabel"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  interval={0}
                  angle={labelAngle}
                  textAnchor={wide ? "end" : "middle"}
                  height={xAxisHeight}
                  tickMargin={4}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  cursor={{ stroke: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)", fontSize: 10 }}
                  formatter={(value) => [
                    value === null ? "—" : `${value}${unit ? ` ${unit}` : ""}`,
                    title,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  connectNulls
                  dot={(dotProps) => {
                    const { cx, cy, payload, index } = dotProps as {
                      cx: number;
                      cy: number;
                      payload: MonthTrendPoint;
                      index: number;
                    };
                    if (
                      cx === undefined ||
                      cy === undefined ||
                      payload[dataKey] === null
                    ) {
                      return <g key={`dot-${index}`} />;
                    }
                    const isSelected = payload.monthKey === selectedKey;
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 4.5 : 3}
                        fill="var(--primary)"
                        fillOpacity={isSelected ? 1 : 0.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface ExerciseTrendsSectionProps {
  allWorkouts: Workout[];
  today: Date;
  monthCount: number;
}

interface ExerciseMonthlyPoint {
  monthKey: string;
  monthLabel: string;
  topWeight: number | null;
}

interface ExerciseTrendSeries {
  exerciseId: string;
  name: string;
  category: string;
  totalSessions: number;
  monthsWithData: number;
  points: ExerciseMonthlyPoint[];
  delta: number;
}

function ExerciseTrendsSection({
  allWorkouts,
  today,
  monthCount,
}: ExerciseTrendsSectionProps) {
  const series = useMemo<ExerciseTrendSeries[]>(() => {
    const months = Array.from({ length: monthCount }, (_, i) =>
      subMonths(startOfMonth(today), monthCount - 1 - i),
    );
    const monthKeys = months.map((m) => formatMonthKey(m));

    // monthKey -> exerciseId -> top weight in that month
    const grid = new Map<string, Map<string, number>>();
    const exerciseInfo = new Map<
      string,
      { name: string; category: string; sessions: number }
    >();

    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      const monthKey = format(startOfMonth(wDate), MONTH_KEY_FORMAT);
      if (!monthKeys.includes(monthKey)) continue;

      for (const we of w.exercises) {
        const topSet = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        if (topSet <= 0) continue;

        const info = exerciseInfo.get(we.exerciseId);
        if (info) {
          info.sessions += 1;
        } else {
          exerciseInfo.set(we.exerciseId, {
            name: we.exercise.name,
            category: we.exercise.category,
            sessions: 1,
          });
        }

        let monthMap = grid.get(monthKey);
        if (!monthMap) {
          monthMap = new Map();
          grid.set(monthKey, monthMap);
        }
        const cur = monthMap.get(we.exerciseId) ?? 0;
        if (topSet > cur) monthMap.set(we.exerciseId, topSet);
      }
    }

    const result: ExerciseTrendSeries[] = [];
    for (const [exerciseId, info] of exerciseInfo) {
      const points: ExerciseMonthlyPoint[] = months.map((m) => {
        const monthKey = formatMonthKey(m);
        const monthMap = grid.get(monthKey);
        return {
          monthKey,
          monthLabel: format(m, "MMM/yy", { locale: ptBR }),
          topWeight: monthMap?.get(exerciseId) ?? null,
        };
      });
      const monthsWithData = points.filter((p) => p.topWeight !== null).length;
      const filled = points.filter((p) => p.topWeight !== null);
      const delta =
        filled.length >= 2
          ? Math.round(
              (filled[filled.length - 1]!.topWeight! - filled[0]!.topWeight!) *
                10,
            ) / 10
          : 0;

      result.push({
        exerciseId,
        name: info.name,
        category: info.category,
        totalSessions: info.sessions,
        monthsWithData,
        points,
        delta,
      });
    }

    return result
      .filter((s) => s.monthsWithData >= 2)
      .sort(
        (a, b) =>
          b.monthsWithData - a.monthsWithData ||
          b.totalSessions - a.totalSessions ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6);
  }, [allWorkouts, today, monthCount]);

  if (series.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Tendências
          </p>
          <h2 className="font-display text-lg font-semibold">
            Cargas mês a mês
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top set por mês dos exercícios mais consistentes no período.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {series.length} exercício{series.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <div
            key={s.exerciseId}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{s.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {categoryLabel(s.category)} · {s.monthsWithData} mes
                  {s.monthsWithData === 1 ? "" : "es"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  s.delta > 0 && "text-emerald-700 dark:text-emerald-400",
                  s.delta < 0 && "text-amber-700 dark:text-amber-400",
                  s.delta === 0 && "text-muted-foreground",
                )}
              >
                {s.delta > 0 ? "+" : ""}
                {s.delta} kg
              </span>
            </div>
            <div className="mt-3 h-24 w-full md:h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={s.points}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <XAxis dataKey="monthLabel" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    cursor={{ stroke: "var(--accent)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                      padding: "4px 8px",
                    }}
                    labelStyle={{
                      color: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                    formatter={(value) => [
                      value === null ? "—" : `${value} kg`,
                      "Top set",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="topWeight"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    connectNulls
                    dot={{ fill: "var(--primary)", r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

