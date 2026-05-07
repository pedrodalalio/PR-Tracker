import GPXParser from "gpxparser";
import type { RoutePoint, Split } from "@/lib/types";

export interface ParsedRun {
  name: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  distance: number; // metros
  duration: number; // segundos
  pace: number; // segundos por km
  elevationGain: number | null;
  routePoints: RoutePoint[];
  splits: Split[];
}

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpxParseError";
  }
}

export function parseGpx(xmlText: string): ParsedRun {
  const parser = new GPXParser();
  parser.parse(xmlText);

  const track = parser.tracks[0];
  if (!track || !track.points || track.points.length === 0) {
    throw new GpxParseError(
      "Arquivo GPX sem pontos de rota. Verifique o arquivo.",
    );
  }

  const points = track.points;
  const cumul = track.distance.cumul as unknown as number[];
  const totalDistance = track.distance.total;

  if (!cumul || !Array.isArray(cumul) || cumul.length !== points.length) {
    throw new GpxParseError("Distância cumulativa inválida no GPX.");
  }

  const startTime = points[0]!.time ? new Date(points[0]!.time) : null;
  const endTime = points[points.length - 1]!.time
    ? new Date(points[points.length - 1]!.time)
    : null;

  const duration =
    startTime && endTime
      ? Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000))
      : 0;

  if (duration <= 0) {
    throw new GpxParseError(
      "Não foi possível calcular a duração — pontos sem timestamp.",
    );
  }

  const pace = totalDistance > 0 ? duration / (totalDistance / 1000) : 0;

  const routePoints: RoutePoint[] = points.map((p) => ({
    lat: p.lat,
    lng: p.lon,
    ele: typeof p.ele === "number" ? p.ele : undefined,
    t:
      p.time && startTime
        ? Math.max(
            0,
            Math.round(
              (new Date(p.time).getTime() - startTime.getTime()) / 1000,
            ),
          )
        : undefined,
  }));

  const splits = computeSplits(points, cumul, startTime);

  return {
    name: track.name?.trim() || null,
    date: startTime ?? new Date(),
    startTime,
    endTime,
    distance: totalDistance,
    duration,
    pace,
    elevationGain:
      typeof track.elevation?.pos === "number" ? track.elevation.pos : null,
    routePoints,
    splits,
  };
}

function computeSplits(
  points: { lat: number; lon: number; ele: number; time: Date }[],
  cumul: number[],
  startTime: Date | null,
): Split[] {
  if (!startTime) return [];

  const splits: Split[] = [];
  const totalKm = Math.floor(cumul[cumul.length - 1]! / 1000);

  let prevTimeSec = 0;
  for (let km = 1; km <= totalKm; km++) {
    const target = km * 1000;
    // Encontra o primeiro ponto cuja distância cumulativa >= target
    let idx = -1;
    for (let i = 0; i < cumul.length; i++) {
      if (cumul[i]! >= target) {
        idx = i;
        break;
      }
    }
    if (idx < 1) continue;

    // Interpola o tempo no ponto exato do km
    const before = cumul[idx - 1]!;
    const after = cumul[idx]!;
    const ratio = after === before ? 0 : (target - before) / (after - before);
    const tBefore =
      (new Date(points[idx - 1]!.time).getTime() - startTime.getTime()) / 1000;
    const tAfter =
      (new Date(points[idx]!.time).getTime() - startTime.getTime()) / 1000;
    const tAtKm = tBefore + (tAfter - tBefore) * ratio;

    const splitDuration = tAtKm - prevTimeSec;
    if (splitDuration > 0 && Number.isFinite(splitDuration)) {
      splits.push({
        km,
        duration: Math.round(splitDuration),
        pace: splitDuration, // pace = sec/km, e cada split é exatamente 1 km
      });
    }
    prevTimeSec = tAtKm;
  }

  return splits;
}
