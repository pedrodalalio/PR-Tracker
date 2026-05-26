import {
  addDays,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import type { WeekDay, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WEEK_DAY_BY_INDEX } from "./utils";

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

export function HeatmapSection({
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
