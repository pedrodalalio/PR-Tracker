import {
  addDays,
  endOfMonth,
  format,
  getDay,
  isWithinInterval,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  WeekDay,
  WeeklyGoalEntry,
  Workout,
  WorkoutType,
} from "@/lib/types";

export const MONTH_KEY_FORMAT = "yyyy-MM";

export const WEEK_DAY_BY_INDEX: WeekDay[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export function formatMonthKey(date: Date) {
  return format(date, MONTH_KEY_FORMAT);
}

export function parseMonthKey(key: string): Date | null {
  const parsed = parse(key, MONTH_KEY_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? null : startOfMonth(parsed);
}

export interface PlannedAdherence {
  metCount: number;
  plannedCount: number;
  percent: number;
}

export interface PeriodMetrics {
  workouts: Workout[];
  totalWorkouts: number;
  daysTrained: number;
  byType: Record<WorkoutType, number>;
  plannedAdherence: PlannedAdherence | null;
}

// Percorre os dias do mês, conta os que caem em targetDays (até "today") e marca
// quantos tiveram pelo menos um treino. Para o mês corrente, ignora dias futuros.
export function computePlannedAdherence(
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

export function computeMetrics(
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

export type RangeMode = "monthly" | "6m" | "12m";

export interface PeriodInfo {
  mode: RangeMode;
  start: Date;
  end: Date;
  monthCount: number;
}

export function buildPeriod(
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

export function previousPeriodBounds(period: PeriodInfo): {
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

export function periodTitle(period: PeriodInfo): string {
  if (period.mode === "monthly") {
    return format(period.start, "MMMM 'de' yyyy", { locale: ptBR });
  }
  return period.mode === "6m" ? "Últimos 6 meses" : "Últimos 12 meses";
}

export function periodSubtitle(period: PeriodInfo): string {
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
export function resolveGoalForWeek(
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
