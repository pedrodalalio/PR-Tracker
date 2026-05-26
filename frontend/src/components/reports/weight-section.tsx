import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale } from "lucide-react";
import { useMemo } from "react";
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
import { cn } from "@/lib/utils";

interface WeightSectionProps {
  start: Date;
  end: Date;
  entries: import("@/lib/types").WeightEntry[];
}

export function WeightSection({ start, end, entries }: WeightSectionProps) {
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
