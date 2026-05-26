import { isSameMonth, startOfMonth } from "date-fns";
import { CalendarDays, Dumbbell } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CategorySection } from "@/components/reports/category-section";
import { ExerciseTrendsSection } from "@/components/reports/exercise-trends-section";
import { HeatmapSection } from "@/components/reports/heatmap-section";
import { MonthPicker } from "@/components/reports/month-picker";
import { MonthlyExercisesSection } from "@/components/reports/monthly-exercises-section";
import { ReportSkeleton } from "@/components/reports/report-skeleton";
import { SummarySection } from "@/components/reports/summary-section";
import { TopAndPRsSection } from "@/components/reports/top-prs-section";
import { TrendsSection } from "@/components/reports/trends-section";
import {
  buildPeriod,
  computeMetrics,
  formatMonthKey,
  parseMonthKey,
  periodSubtitle,
  periodTitle,
  previousPeriodBounds,
  type RangeMode,
  resolveGoalForWeek,
} from "@/components/reports/utils";
import { WeightSection } from "@/components/reports/weight-section";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useGoals, useWeeklyGoalHistory } from "@/hooks/use-goals";
import { useWeights } from "@/hooks/use-weights";
import { useWorkouts } from "@/hooks/use-workouts";

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
