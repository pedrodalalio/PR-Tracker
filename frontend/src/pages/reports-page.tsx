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
  CartesianGrid,
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

interface MonthMetrics {
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
  monthStart: Date,
  monthEnd: Date,
  targetDays: WeekDay[],
  today: Date,
): PlannedAdherence | null {
  if (targetDays.length === 0) return null;
  const targetSet = new Set(targetDays);
  const cap = monthEnd < today ? monthEnd : today;

  let plannedCount = 0;
  let metCount = 0;
  for (
    let d = new Date(monthStart);
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
  month: Date,
  targetDays: WeekDay[],
  today: Date,
): MonthMetrics {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const inMonth = workouts.filter((w) =>
    isWithinInterval(new Date(w.date), { start, end }),
  );

  const days = new Set(
    inMonth.map((w) => format(new Date(w.date), "yyyy-MM-dd")),
  );

  const byType: Record<WorkoutType, number> = {
    upper: 0,
    lower: 0,
    cardio: 0,
  };
  for (const w of inMonth) byType[w.workoutType] += 1;

  return {
    workouts: inMonth,
    totalWorkouts: inMonth.length,
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

  const targetDays = goals.data?.targetDays ?? [];
  const current = useMemo(
    () =>
      computeMetrics(workouts.data ?? [], selectedMonth, targetDays, today),
    [workouts.data, selectedMonth, targetDays, today],
  );
  const previous = useMemo(
    () =>
      computeMetrics(
        workouts.data ?? [],
        subMonths(selectedMonth, 1),
        targetDays,
        today,
      ),
    [workouts.data, selectedMonth, targetDays, today],
  );

  const isFutureMonth = selectedMonth > today;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Relatórios"
        title={format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        description="Resumo do mês com comparativos, distribuição por categoria, heatmap e evolução de peso."
        action={
          <MonthPicker
            selected={selectedMonth}
            available={availableMonths}
            onChange={setMonth}
          />
        }
      />

      {isLoading ? (
        <ReportSkeleton />
      ) : isFutureMonth ? (
        <EmptyState
          icon={CalendarDays}
          title="Mês ainda não chegou"
          description="Volte ao mês atual ou escolha um mês passado pra ver o relatório."
        />
      ) : current.totalWorkouts === 0 &&
        (weights.data ?? []).every(
          (w) => !isSameMonth(new Date(w.recordedAt), selectedMonth),
        ) ? (
        <EmptyState
          icon={Dumbbell}
          title="Sem registros nesse mês"
          description="Não há treinos nem peso registrado nesse mês. Que tal escolher outro?"
        />
      ) : (
        <>
          <SummarySection current={current} previous={previous} />
          <CategorySection current={current} />
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
          <WeightSection
            month={selectedMonth}
            entries={weights.data ?? []}
          />
          <TopAndPRsSection
            allWorkouts={workouts.data ?? []}
            month={selectedMonth}
            workoutsInMonth={current.workouts}
          />
          <MonthlyExercisesSection workoutsInMonth={current.workouts} />
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
  current: MonthMetrics;
  previous: MonthMetrics;
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
  current: MonthMetrics;
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
  const start = startOfMonth(month);
  const end = endOfMonth(month);
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
  }, [start, end, trainedDays, targetDays, goalForWeek]);

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
  month: Date;
  entries: import("@/lib/types").WeightEntry[];
}

function WeightSection({ month, entries }: WeightSectionProps) {
  const inMonth = useMemo(
    () =>
      entries
        .filter((e) => isSameMonth(new Date(e.recordedAt), month))
        .sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() -
            new Date(b.recordedAt).getTime(),
        ),
    [entries, month],
  );

  const data = inMonth.map((e) => ({
    dateLabel: format(new Date(e.recordedAt), "dd/MM", { locale: ptBR }),
    weight: e.weight,
  }));

  const first = inMonth[0];
  const last = inMonth[inMonth.length - 1];
  const delta =
    first && last ? Math.round((last.weight - first.weight) * 10) / 10 : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Peso corporal
          </p>
          <h2 className="font-display text-lg font-semibold">Evolução no mês</h2>
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
            {delta.toFixed(1)} kg no mês
          </span>
        )}
      </header>
      {inMonth.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Sem registros de peso nesse mês"
          description="Registre seu peso na home pra ver a evolução aqui."
        />
      ) : inMonth.length === 1 ? (
        <div className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
          Apenas um registro no mês:{" "}
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
  workoutsInMonth: Workout[];
  month: Date;
}

interface TopExercise {
  exerciseId: string;
  name: string;
  sessions: number;
  topWeight: number;
}

interface MonthPR {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
}

function TopAndPRsSection({
  allWorkouts,
  workoutsInMonth,
  month,
}: TopAndPRsSectionProps) {
  const top = useMemo<TopExercise[]>(() => {
    const map = new Map<string, TopExercise>();
    for (const w of workoutsInMonth) {
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
  }, [workoutsInMonth]);

  const prs = useMemo<MonthPR[]>(() => {
    const monthEnd = endOfMonth(month);
    const monthStart = startOfMonth(month);

    // Para cada exercício, encontre o melhor peso *antes* do mês.
    const bestBefore = new Map<string, number>();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate >= monthStart) continue;
      for (const we of w.exercises) {
        const top = we.sets.reduce(
          (best, s) => (s.weight > best ? s.weight : best),
          0,
        );
        const cur = bestBefore.get(we.exerciseId) ?? 0;
        if (top > cur) bestBefore.set(we.exerciseId, top);
      }
    }

    // No mês, encontre o melhor peso por exercício e marque PRs (acima do bestBefore).
    const monthBest = new Map<
      string,
      { name: string; weight: number; reps: number; date: string }
    >();
    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      if (wDate < monthStart || wDate > monthEnd) continue;
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
        const cur = monthBest.get(we.exerciseId);
        if (
          !cur ||
          topSet.weight > cur.weight ||
          (topSet.weight === cur.weight && topSet.reps > cur.reps)
        ) {
          monthBest.set(we.exerciseId, {
            name: we.exercise.name,
            weight: topSet.weight,
            reps: topSet.reps,
            date: w.date,
          });
        }
      }
    }

    const results: MonthPR[] = [];
    for (const [exerciseId, data] of monthBest) {
      const before = bestBefore.get(exerciseId) ?? 0;
      if (data.weight > before) {
        results.push({ exerciseId, ...data });
      }
    }
    return results.sort((a, b) => b.weight - a.weight);
  }, [allWorkouts, month]);

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
            title="Sem exercícios no mês"
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
              PRs do mês
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
  workoutsInMonth,
}: {
  workoutsInMonth: Workout[];
}) {
  const series = useMemo<ExerciseSeries[]>(() => {
    const map = new Map<string, ExerciseSeries>();

    const sortedByDate = [...workoutsInMonth].sort(
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
  }, [workoutsInMonth]);

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

      <div className="mt-3 h-20 w-full">
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
