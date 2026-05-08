import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateRun } from "@/hooks/use-runs";
import { GpxParseError, parseGpx, type ParsedRun } from "@/lib/gpx";
import {
  formatDistance,
  formatDuration,
  formatPace,
} from "@/lib/format";

function todayLocalDate(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function durationToSeconds(text: string): number | null {
  // Aceita "mm:ss", "hh:mm:ss" ou número de minutos
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const minutes = Number(trimmed);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;
    return Math.round(minutes * 60);
  }
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }
  return null;
}

export function NewRunPage() {
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("import") === "1" ? "import" : "manual";
  const [tab, setTab] = useState<"manual" | "import">(initialTab);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Corrida"
        title="Nova corrida"
        description="Importe um GPX do Strava ou registre manualmente."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "manual" | "import")}>
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="import">Importar GPX</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-6">
          <ManualForm />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <ImportForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManualForm() {
  const create = useCreateRun();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const distNum = Number(distance.replace(",", "."));
    if (!Number.isFinite(distNum) || distNum <= 0) {
      toast.error("Distância inválida");
      return;
    }
    const durSec = durationToSeconds(duration);
    if (!durSec || durSec <= 0) {
      toast.error("Duração inválida — use mm:ss ou hh:mm:ss");
      return;
    }

    const recordedAt = new Date(`${date}T08:00:00`);
    if (Number.isNaN(recordedAt.getTime())) {
      toast.error("Data inválida");
      return;
    }

    try {
      const run = await create.mutateAsync({
        name: name.trim() || undefined,
        date: recordedAt.toISOString(),
        distance: Math.round(distNum * 1000), // km → metros
        duration: durSec,
        notes: notes.trim() || undefined,
        source: "manual",
      });
      toast.success("Corrida registrada");
      navigate(`/runs/${run.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome (opcional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Corrida matinal"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="distance">Distância (km)</Label>
          <Input
            id="distance"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="5.2"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duração (mm:ss ou hh:mm:ss)</Label>
          <Input
            id="duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="28:45"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observação</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: parque, intervalado, calor"
          maxLength={300}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/runs")}
          disabled={create.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function ImportForm() {
  const create = useCreateRun();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRun | null>(null);
  const [name, setName] = useState("");
  const [parsing, setParsing] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const text = await file.text();
      const result = parseGpx(text);
      setParsed(result);
      if (result.name) setName(result.name);
      toast.success("GPX carregado — confira os dados antes de salvar");
    } catch (err) {
      const message =
        err instanceof GpxParseError
          ? err.message
          : "Falha ao ler arquivo GPX";
      toast.error(message);
      setParsed(null);
    } finally {
      setParsing(false);
    }
  }

  async function onSave() {
    if (!parsed) return;
    try {
      const run = await create.mutateAsync({
        name: name.trim() || undefined,
        date: parsed.date.toISOString(),
        startTime: parsed.startTime?.toISOString(),
        endTime: parsed.endTime?.toISOString(),
        distance: parsed.distance,
        duration: parsed.duration,
        movingTime: parsed.movingTime,
        pace: parsed.pace,
        elevationGain: parsed.elevationGain ?? undefined,
        source: "gpx",
        routePoints: parsed.routePoints,
        splits: parsed.splits,
      });
      toast.success("Corrida importada");
      navigate(`/runs/${run.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-card p-6">
        <div className="flex flex-col items-center text-center">
          <p className="font-display text-lg font-semibold">
            Selecione um arquivo .gpx
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            No Strava: abra a atividade → "..." → "Exportar GPX". Funciona
            também com arquivos do Garmin Connect, Coros, Wahoo, etc.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? "Lendo arquivo..." : "Escolher arquivo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      {parsed && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="import-name">Nome</Label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Long run dominical"
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Preview
              label="Distância"
              value={formatDistance(parsed.distance)}
              hint={
                parsed.imputedDistance > 0
                  ? `inclui ${formatDistance(parsed.imputedDistance)} estimados`
                  : undefined
              }
            />
            <Preview
              label="Tempo em movimento"
              value={formatDuration(parsed.movingTime)}
              hint={
                parsed.movingTime !== parsed.duration
                  ? `total: ${formatDuration(parsed.duration)}`
                  : undefined
              }
            />
            <Preview label="Pace" value={formatPace(parsed.pace)} />
            <Preview
              label="Elevação"
              value={
                parsed.elevationGain
                  ? `+${Math.round(parsed.elevationGain)} m`
                  : "—"
              }
            />
          </dl>

          {parsed.hasFreezes && (
            <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Detectamos trecho(s) onde o GPS travou. Estimamos {formatDistance(parsed.imputedDistance)}{" "}
              de distância usando o pace médio do resto da corrida — pode ficar
              um pouco diferente do que o app que gravou (que usa
              acelerômetro/cadência junto).
            </p>
          )}

          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {parsed.routePoints.length} pontos · {parsed.splits.length} splits
            · {parsed.startTime
              ? new Date(parsed.startTime).toLocaleString("pt-BR")
              : "sem horário"}
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setParsed(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={create.isPending}
            >
              Trocar arquivo
            </Button>
            <Button onClick={onSave} disabled={create.isPending}>
              {create.isPending ? "Salvando..." : "Salvar corrida"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-base font-semibold">{value}</p>
      {hint && (
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
