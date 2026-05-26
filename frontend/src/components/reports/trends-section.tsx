import {
  addDays,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyGoalEntry, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMonthKey, resolveGoalForWeek } from "./utils";

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

export function TrendsSection({
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
