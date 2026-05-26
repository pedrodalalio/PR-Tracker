import {
  CalendarDays,
  Dumbbell,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeriodMetrics } from "./utils";

interface SummarySectionProps {
  current: PeriodMetrics;
  previous: PeriodMetrics;
}

export function SummarySection({ current, previous }: SummarySectionProps) {
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
