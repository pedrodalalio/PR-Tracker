/**
 * Reprocessa Run.routePoints pra calcular movingTime, distance imputada,
 * pace, splits e elevationGain — pras corridas importadas antes da feature existir.
 *
 * Espelha a lógica de frontend/src/lib/gpx.ts. Detecta GPS travado
 * (zero deslocamento >30s) e imputa distância usando o pace médio da parte
 * em que o GPS funcionou.
 *
 * Uso: npx ts-node --transpile-only scripts/backfill-moving-time.ts [--dry]
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const MIN_MOVING_SPEED = 0.6;
const SMOOTH_WINDOW_S = 10;
const FREEZE_MIN_DURATION = 30;
const FREEZE_MAX_DISP = 1.0;
const ELEVATION_NOISE_THRESHOLD = 1.5;

interface Pt {
  lat: number;
  lng: number;
  ele?: number;
  t?: number;
}

interface Split {
  km: number;
  duration: number;
  pace: number;
}

interface Freeze {
  startIdx: number;
  endIdx: number;
  duration: number;
  kind: "start" | "mid" | "end";
}

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}

function detectFreezes(points: Pt[], tSec: number[]): Freeze[] {
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
      freezes.push({ startIdx: i, endIdx: j - 1, duration: dur, kind: "mid" });
      i = j;
    } else {
      i++;
    }
  }
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
  for (const f of freezes) if (idx > f.startIdx && idx <= f.endIdx) return f;
  return null;
}

function smoothedVelocity(
  i: number,
  tSec: number[],
  cumul: number[],
  freezes: Freeze[],
): number {
  const tMid = (tSec[i]! + tSec[i - 1]!) / 2;
  let s = i - 1;
  let e = i;
  while (s > 0 && tSec[s]! > tMid - SMOOTH_WINDOW_S / 2 && !freezeAt(freezes, s)) s--;
  while (
    e < tSec.length - 1 &&
    tSec[e]! < tMid + SMOOTH_WINDOW_S / 2 &&
    !freezeAt(freezes, e + 1)
  ) e++;
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

function computeFromPoints(points: Pt[]): {
  movingTime: number;
  distance: number;
  splits: Split[];
  elevationGain: number | null;
  pace: number | null;
  freezeMidCount: number;
  imputedDistance: number;
} {
  const tSec = points.map((p) => p.t ?? 0);
  const cumul: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumul.push(cumul[i - 1]! + haversine(points[i - 1]!, points[i]!));
  }
  const haversineTotal = cumul[cumul.length - 1]!;

  const freezes = detectFreezes(points, tSec);
  const imputeSpeed = computeImputeSpeed(tSec, cumul, freezes);

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
      continue;
    }
    totalDistance += cumul[i]! - cumul[i - 1]!;
    if (smoothedVelocity(i, tSec, cumul, freezes) >= MIN_MOVING_SPEED) {
      movingTime += dt;
    }
  }
  movingTime = Math.max(1, Math.round(movingTime));
  totalDistance = Math.round(totalDistance);

  // Splits sintéticos
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

  // Elevation
  const ele: number[] = [];
  for (const p of points) {
    if (typeof p.ele === "number" && Number.isFinite(p.ele)) ele.push(p.ele);
  }
  let elevationGain: number | null = null;
  if (ele.length >= 2) {
    const window = 5;
    const half = Math.floor(window / 2);
    const smoothed: number[] = [];
    for (let i = 0; i < ele.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - half); j <= Math.min(ele.length - 1, i + half); j++) {
        sum += ele[j]!;
        count++;
      }
      smoothed.push(sum / count);
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
    elevationGain = Math.round(gain);
  }

  const pace = totalDistance > 0 ? movingTime / (totalDistance / 1000) : null;
  const imputedDistance = Math.max(0, totalDistance - Math.round(haversineTotal));
  const freezeMidCount = freezes.filter((f) => f.kind === "mid").length;

  return {
    movingTime,
    distance: totalDistance,
    splits,
    elevationGain,
    pace,
    freezeMidCount,
    imputedDistance,
  };
}

async function main() {
  const dry = process.argv.includes("--dry");
  console.log(`Backfill movingTime ${dry ? "(DRY RUN)" : ""}`);

  const runs = await prisma.run.findMany({
    where: { routePoints: { not: undefined } },
    select: {
      id: true,
      name: true,
      distance: true,
      duration: true,
      movingTime: true,
      pace: true,
      elevationGain: true,
      routePoints: true,
    },
  });

  console.log(`${runs.length} corridas com routePoints encontradas`);

  let processed = 0;
  let skipped = 0;
  for (const r of runs) {
    const points = r.routePoints as unknown as Pt[] | null;
    if (!points || !Array.isArray(points) || points.length < 2) {
      skipped++;
      continue;
    }
    if (!points.some((p) => typeof p.t === "number")) {
      console.log(`  skip ${r.id} (${r.name ?? "?"}): sem timestamps`);
      skipped++;
      continue;
    }

    const out = computeFromPoints(points);
    console.log(
      `  ${r.id} (${r.name ?? "?"}): elapsed=${r.duration}s → moving=${out.movingTime}s, ` +
        `dist=${(out.distance / 1000).toFixed(2)}km${out.imputedDistance > 0 ? ` (+${(out.imputedDistance / 1000).toFixed(2)}km imputed)` : ""}, ` +
        `pace=${out.pace?.toFixed(1)}s/km, ele=${out.elevationGain}m, ` +
        `splits=${out.splits.length}, freezes(mid)=${out.freezeMidCount}`,
    );

    if (!dry) {
      await prisma.run.update({
        where: { id: r.id },
        data: {
          distance: out.distance,
          movingTime: out.movingTime,
          pace: out.pace,
          elevationGain: out.elevationGain,
          splits: out.splits as unknown as object,
        },
      });
    }
    processed++;
  }

  console.log(`\nFeito: ${processed} processadas, ${skipped} puladas`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
