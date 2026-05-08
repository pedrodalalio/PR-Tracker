import { addWeeks, startOfDay, startOfWeek } from "date-fns";

// Soma de dias treinados em semanas consecutivas que bateram a meta.
// Dia de descanso não quebra; quebra só se uma semana terminar abaixo da meta.
// A semana corrente nunca quebra (ainda dá tempo de bater).
export function computeStreaks(
  workouts: { date: string }[],
  weeklyGoal: number,
  now: Date = new Date(),
): { current: number; best: number; totalWeeksCompleted: number } {
  if (workouts.length === 0)
    return { current: 0, best: 0, totalWeeksCompleted: 0 };
  const goal = weeklyGoal > 0 ? weeklyGoal : 1;

  // Agrupa dias únicos por semana (Domingo como início).
  const weekDays = new Map<number, Set<number>>();
  for (const w of workouts) {
    const date = new Date(w.date);
    const day = startOfDay(date).getTime();
    const wk = startOfWeek(date, { weekStartsOn: 0 }).getTime();
    if (!weekDays.has(wk)) weekDays.set(wk, new Set());
    weekDays.get(wk)!.add(day);
  }

  const sortedKeys = [...weekDays.keys()].sort((a, b) => a - b);
  const earliest = sortedKeys[0]!;
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 }).getTime();

  // Lista todas as semanas entre a primeira e a atual (preenchendo zeros).
  const weeks: { count: number; isCurrent: boolean }[] = [];
  let cursor = new Date(earliest);
  while (cursor.getTime() <= currentWeekStart) {
    const start = cursor.getTime();
    weeks.push({
      count: weekDays.get(start)?.size ?? 0,
      isCurrent: start === currentWeekStart,
    });
    cursor = addWeeks(cursor, 1);
  }

  // Best: maior soma de dias num bloco de semanas consecutivas que bateram a meta
  // (ou semana corrente, que nunca quebra).
  let best = 0;
  let runDays = 0;
  for (const w of weeks) {
    const ok = w.isCurrent || w.count >= goal;
    if (ok) {
      runDays += w.count;
      if (runDays > best) best = runDays;
    } else {
      runDays = 0;
    }
  }

  // Current: anda do presente pra trás somando dias enquanto a semana bateu a meta.
  let current = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i]!;
    if (w.isCurrent || w.count >= goal) {
      current += w.count;
    } else {
      break;
    }
  }

  // Total de semanas em que a meta foi cumprida (inclui a corrente, se já bateu).
  let totalWeeksCompleted = 0;
  for (const w of weeks) {
    if (w.count >= goal) totalWeeksCompleted++;
  }

  return { current, best, totalWeeksCompleted };
}
