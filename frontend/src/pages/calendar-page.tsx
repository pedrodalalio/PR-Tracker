import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals } from "@/hooks/use-goals";
import { useWorkouts } from "@/hooks/use-workouts";
import { workoutTypeLabel } from "@/lib/format";
import type { WeekDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const WEEK_DAY_BY_INDEX: WeekDay[] = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const { data, isLoading } = useWorkouts();
  const goals = useGoals();
  const targetDays = goals.data?.targetDays ?? [];
  const isPlannedDay = (d: Date) =>
    targetDays.includes(WEEK_DAY_BY_INDEX[d.getDay()]!);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const w of data ?? []) {
      const key = format(new Date(w.date), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(w);
      map.set(key, arr);
    }
    return map;
  }, [data]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const selectedWorkouts = workoutsByDay.get(dayKey(selected)) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Calendário"
        title="Veja sua frequência"
        description={
          targetDays.length > 0
            ? "Bolinha cheia = treino registrado. Bolinha vazia = dia planejado sem treino."
            : "Cada bolinha indica um treino registrado naquele dia."
        }
        action={
          <Button asChild variant="outline">
            <Link to="/calendar/progress">Progresso semanal</Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Mês
            </p>
            <h2 className="font-display text-xl font-semibold capitalize">
              {format(cursor, "MMMM yyyy", { locale: ptBR })}
            </h2>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCursor(startOfMonth(new Date()));
                setSelected(new Date());
              }}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-7 px-2 pb-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {isLoading
            ? Array.from({ length: days.length }).map((_, i) => (
                <div key={i} className="aspect-square p-1">
                  <Skeleton className="h-full w-full" />
                </div>
              ))
            : days.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const isSel = isSameDay(day, selected);
                const isToday = isSameDay(day, new Date());
                const has = workoutsByDay.has(dayKey(day));
                const planned = inMonth && isPlannedDay(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelected(day)}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-md p-1 text-sm transition-colors",
                      !inMonth && "text-muted-foreground/40",
                      inMonth && "hover:bg-accent",
                      planned && !isSel && !has && "bg-primary/[0.06]",
                      isSel && "bg-primary/15 text-primary",
                      isToday && !isSel && "ring-1 ring-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono",
                        isSel && "font-bold",
                        planned && !isSel && "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {has && (
                      <span
                        className={cn(
                          "absolute bottom-1 size-1.5 rounded-full",
                          isSel ? "bg-primary" : "bg-primary/70",
                        )}
                      />
                    )}
                    {planned && !has && (
                      <span
                        className={cn(
                          "absolute bottom-1 size-1.5 rounded-full border",
                          isSel
                            ? "border-primary"
                            : "border-primary/50",
                        )}
                      />
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      <section className="mt-6">
        <h3 className="mb-3 font-display text-lg font-semibold">
          {format(selected, "PPPP", { locale: ptBR })}
        </h3>
        {selectedWorkouts.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum treino registrado"
            description="Esse dia ficou sem treino. Bora amanhã?"
          />
        ) : (
          <ul className="space-y-2">
            {selectedWorkouts.map((w) => (
              <li key={w.id}>
                <Link
                  to={`/workouts/${w.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div>
                    <p className="font-display text-base font-semibold">
                      {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.exercises.length} exercício
                      {w.exercises.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="muted">
                    {workoutTypeLabel(w.workoutType)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
