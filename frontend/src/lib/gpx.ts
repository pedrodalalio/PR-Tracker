import GPXParser from "gpxparser";
import type { RoutePoint, Split } from "@/lib/types";

export interface ParsedRun {
  name: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  distance: number; // metros (com imputação em trechos de GPS travado)
  duration: number; // segundos (elapsed: clock total)
  movingTime: number; // segundos (excluindo paradas reais)
  pace: number; // segundos por km (baseado em movingTime)
  elevationGain: number | null;
  hasFreezes: boolean; // true quando detectamos GPS travado e imputamos distância
  imputedDistance: number; // metros adicionados via imputação
  routePoints: RoutePoint[];
  splits: Split[];
}

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpxParseError";
  }
}

const MIN_MOVING_SPEED = 0.6; // m/s — abaixo disso, considera parado
const SMOOTH_WINDOW_S = 10;   // janela pra calcular velocidade suavizada
const FREEZE_MIN_DURATION = 30; // s — sequência mínima pra considerar GPS travado
const FREEZE_MAX_DISP = 1.0;    // m — deslocamento máximo durante o "travamento"
const ELEVATION_NOISE_THRESHOLD = 1.5;

interface Freeze {
  startIdx: number;
  endIdx: number;
  duration: number;
  kind: "start" | "mid" | "end";
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
  const haversineTotal = track.distance.total;

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

  const tSec: number[] = points.map((p) =>
    p.time && startTime
      ? (new Date(p.time).getTime() - startTime.getTime()) / 1000
      : 0,
  );

  const freezes = detectFreezes(points, tSec);

  // Velocidade média de imputação: média das partes "em movimento" fora dos freezes,
  // calculada com smoothing pra evitar a falha "GPS lag" (segmentos onde o relógio
  // não amostrou posição entre dois ticks reais de movimento).
  const imputeSpeed = computeImputeSpeed(tSec, cumul, freezes);

  // Distância sintética: haversine fora de freezes + imputação dentro de freezes "mid".
  // movingTime: freezes "mid" contam como movimento; nos demais segmentos usa janela.
  let totalDistance = 0;
  let movingTime = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = tSec[i]! - tSec[i - 1]!;
    if (dt <= 0) continue;
    const f = freezeAt(freezes, i);
    if (f) {
      if (f.kind === "mid") {
        totalDistance += imputeSpeed * dt;
        movingTime += dt;
      }
      // start/end freezes: não conta como movimento, sem imputação
      continue;
    }
    totalDistance += cumul[i]! - cumul[i - 1]!;
    if (smoothedVelocity(i, tSec, cumul, freezes) >= MIN_MOVING_SPEED) {
      movingTime += dt;
    }
  }
  movingTime = Math.max(1, Math.round(movingTime));
  totalDistance = Math.round(totalDistance);

  const imputedDistance = Math.max(0, totalDistance - Math.round(haversineTotal));

  const pace =
    totalDistance > 0 ? movingTime / (totalDistance / 1000) : 0;

  const routePoints: RoutePoint[] = points.map((p, i) => ({
    lat: p.lat,
    lng: p.lon,
    ele: typeof p.ele === "number" ? p.ele : undefined,
    t: p.time && startTime ? Math.max(0, Math.round(tSec[i]!)) : undefined,
  }));

  const splits = computeSplits(tSec, cumul, freezes, imputeSpeed);
  const elevationGain = computeElevationGain(points);

  return {
    name: track.name?.trim() || null,
    date: startTime ?? new Date(),
    startTime,
    endTime,
    distance: totalDistance,
    duration,
    movingTime,
    pace,
    elevationGain,
    hasFreezes: freezes.some((f) => f.kind === "mid"),
    imputedDistance,
    routePoints,
    splits,
  };
}

function detectFreezes(
  points: { lat: number; lon: number }[],
  tSec: number[],
): Freeze[] {
  const freezes: Freeze[] = [];
  let i = 0;
  while (i < points.length - 1) {
    let j = i + 1;
    while (j < points.length) {
      const d = haversine(points[i]!, points[j]!);
      if (d > FREEZE_MAX_DISP) break;
      j++;
    }
    const dur = tSec[j - 1]! - tSec[i]!;
    if (j > i + 1 && dur >= FREEZE_MIN_DURATION) {
      freezes.push({
        startIdx: i,
        endIdx: j - 1,
        duration: dur,
        kind: "mid",
      });
      i = j;
    } else {
      i++;
    }
  }
  // Classifica cada freeze: borda se não há atividade significativa antes/depois.
  const ACTIVITY_PAD_S = 5;
  const total = tSec[tSec.length - 1]!;
  for (const f of freezes) {
    const hasBefore = tSec[f.startIdx]! > ACTIVITY_PAD_S;
    const hasAfter = total - tSec[f.endIdx]! > ACTIVITY_PAD_S;
    if (!hasBefore) f.kind = "start";
    else if (!hasAfter) f.kind = "end";
    else f.kind = "mid";
  }
  return freezes;
}

function freezeAt(freezes: Freeze[], idx: number): Freeze | null {
  for (const f of freezes) {
    if (idx > f.startIdx && idx <= f.endIdx) return f;
  }
  return null;
}

function smoothedVelocity(
  i: number,
  tSec: number[],
  cumul: number[],
  freezes: Freeze[],
): number {
  // Velocidade média numa janela centrada no segmento [i-1, i], excluindo
  // pontos dentro de freezes (que distorceriam a média).
  const tMid = (tSec[i]! + tSec[i - 1]!) / 2;
  let s = i - 1;
  let e = i;
  while (s > 0 && tSec[s]! > tMid - SMOOTH_WINDOW_S / 2 && !freezeAt(freezes, s)) {
    s--;
  }
  while (
    e < tSec.length - 1 &&
    tSec[e]! < tMid + SMOOTH_WINDOW_S / 2 &&
    !freezeAt(freezes, e + 1)
  ) {
    e++;
  }
  const wT = tSec[e]! - tSec[s]!;
  const wD = cumul[e]! - cumul[s]!;
  return wT > 0 ? wD / wT : 0;
}

function computeImputeSpeed(
  tSec: number[],
  cumul: number[],
  freezes: Freeze[],
): number {
  let dist = 0;
  let time = 0;
  for (let i = 1; i < tSec.length; i++) {
    if (freezeAt(freezes, i)) continue;
    const dt = tSec[i]! - tSec[i - 1]!;
    if (dt <= 0) continue;
    if (smoothedVelocity(i, tSec, cumul, freezes) >= MIN_MOVING_SPEED) {
      dist += cumul[i]! - cumul[i - 1]!;
      time += dt;
    }
  }
  return time > 0 ? dist / time : 0;
}

function computeSplits(
  tSec: number[],
  cumul: number[],
  freezes: Freeze[],
  imputeSpeed: number,
): Split[] {
  // Reconstrói cumul "sintética" + tempo em movimento acumulado por ponto.
  const synthCumul: number[] = new Array(tSec.length).fill(0);
  const movingAt: number[] = new Array(tSec.length).fill(0);
  for (let i = 1; i < tSec.length; i++) {
    const dt = tSec[i]! - tSec[i - 1]!;
    const f = freezeAt(freezes, i);
    if (f) {
      if (f.kind === "mid") {
        synthCumul[i] = synthCumul[i - 1]! + imputeSpeed * Math.max(0, dt);
        movingAt[i] = movingAt[i - 1]! + Math.max(0, dt);
      } else {
        synthCumul[i] = synthCumul[i - 1]!;
        movingAt[i] = movingAt[i - 1]!;
      }
      continue;
    }
    const dd = cumul[i]! - cumul[i - 1]!;
    synthCumul[i] = synthCumul[i - 1]! + dd;
    const moving =
      dt > 0 && smoothedVelocity(i, tSec, cumul, freezes) >= MIN_MOVING_SPEED;
    movingAt[i] = movingAt[i - 1]! + (moving ? dt : 0);
  }

  const splits: Split[] = [];
  const total = synthCumul[synthCumul.length - 1]!;
  const totalKm = Math.floor(total / 1000);
  let prevMovingSec = 0;
  for (let km = 1; km <= totalKm; km++) {
    const target = km * 1000;
    let idx = -1;
    for (let i = 0; i < synthCumul.length; i++) {
      if (synthCumul[i]! >= target) {
        idx = i;
        break;
      }
    }
    if (idx < 1) continue;
    const before = synthCumul[idx - 1]!;
    const after = synthCumul[idx]!;
    const ratio = after === before ? 0 : (target - before) / (after - before);
    const tBefore = movingAt[idx - 1]!;
    const tAfter = movingAt[idx]!;
    const tAtKm = tBefore + (tAfter - tBefore) * ratio;
    const dur = tAtKm - prevMovingSec;
    if (dur > 0 && Number.isFinite(dur)) {
      splits.push({ km, duration: Math.round(dur), pace: dur });
    }
    prevMovingSec = tAtKm;
  }
  return splits;
}

function computeElevationGain(
  points: { ele: number }[],
): number | null {
  const ele: number[] = [];
  for (const p of points) {
    if (typeof p.ele === "number" && Number.isFinite(p.ele)) ele.push(p.ele);
  }
  if (ele.length < 2) return null;

  const window = 5;
  const half = Math.floor(window / 2);
  const smoothed: number[] = new Array(ele.length);
  for (let i = 0; i < ele.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(ele.length - 1, i + half); j++) {
      sum += ele[j]!;
      count++;
    }
    smoothed[i] = sum / count;
  }

  let gain = 0;
  let lastConfirmed = smoothed[0]!;
  for (let i = 1; i < smoothed.length; i++) {
    const delta = smoothed[i]! - lastConfirmed;
    if (delta >= ELEVATION_NOISE_THRESHOLD) {
      gain += delta;
      lastConfirmed = smoothed[i]!;
    } else if (delta <= -ELEVATION_NOISE_THRESHOLD) {
      lastConfirmed = smoothed[i]!;
    }
  }
  return Math.round(gain);
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}
