import crypto from "crypto";
import { prisma } from "./prisma";
import { AuthService } from "./auth";

// Contas demo são efêmeras: cada visitante que clica em "Entrar como visitante"
// ganha um usuário isolado, já populado com dados realistas. Identificamos essas
// contas pelo domínio do e-mail e limpamos as antigas a cada novo acesso, então
// ninguém precisa rodar job de limpeza e um visitante nunca bagunça o app do
// próximo. Não exige migração: é só um usuário comum com um e-mail reconhecível.
export const DEMO_EMAIL_DOMAIN = "demo.prtracker.local";
const DEMO_TTL_MS = 2 * 60 * 60 * 1000; // contas demo vivem ~2h

type ExerciseCategory = "Upper" | "Lower" | "Cardio";

const CORE_EXERCISES: {
  name: string;
  category: ExerciseCategory;
  muscleGroups: string[];
}[] = [
  { name: "Bench Press", category: "Upper", muscleGroups: ["chest", "triceps", "shoulders"] },
  { name: "Barbell Row", category: "Upper", muscleGroups: ["back", "biceps"] },
  { name: "Overhead Press", category: "Upper", muscleGroups: ["shoulders", "triceps", "core"] },
  { name: "Lat Pulldown", category: "Upper", muscleGroups: ["back", "biceps"] },
  { name: "Bicep Curls", category: "Upper", muscleGroups: ["biceps"] },
  { name: "Squat", category: "Lower", muscleGroups: ["quadriceps", "glutes", "hamstrings"] },
  { name: "Romanian Deadlift", category: "Lower", muscleGroups: ["hamstrings", "glutes"] },
  { name: "Leg Press", category: "Lower", muscleGroups: ["quadriceps", "glutes"] },
  { name: "Hip Thrust", category: "Lower", muscleGroups: ["glutes", "hamstrings"] },
  { name: "Calf Raises", category: "Lower", muscleGroups: ["calves"] },
];

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;

// Plano por dia de treino. weight = base + incr * nível de progressão.
const UPPER_PLAN = [
  { name: "Bench Press", base: 60, incr: 2, reps: [12, 10, 8] },
  { name: "Barbell Row", base: 50, incr: 2, reps: [12, 10, 10] },
  { name: "Overhead Press", base: 35, incr: 1.5, reps: [12, 10, 8] },
  { name: "Lat Pulldown", base: 55, incr: 2, reps: [12, 12, 10] },
  { name: "Bicep Curls", base: 14, incr: 1, reps: [12, 12, 10] },
];

const LOWER_PLAN = [
  { name: "Squat", base: 80, incr: 2.5, reps: [10, 8, 8] },
  { name: "Romanian Deadlift", base: 70, incr: 2.5, reps: [10, 10, 8] },
  { name: "Leg Press", base: 140, incr: 5, reps: [12, 10, 10] },
  { name: "Hip Thrust", base: 90, incr: 5, reps: [12, 10, 10] },
  { name: "Calf Raises", base: 60, incr: 2, reps: [15, 15, 12] },
];

const HISTORY_WEEKS = 8;

function shortId(bytes = 4): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function atHour(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Limpa contas demo expiradas. Cascade deletes cuidam de treinos/runs/etc.
export async function cleanupExpiredDemoUsers(): Promise<void> {
  try {
    await prisma.user.deleteMany({
      where: {
        email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        createdAt: { lt: new Date(Date.now() - DEMO_TTL_MS) },
      },
    });
  } catch (err) {
    // limpeza é best-effort; não bloqueia a criação do novo demo
    console.error("Failed to cleanup demo users:", err);
  }
}

// Garante que os exercícios usados pelo demo existem (são globais/compartilhados)
// e devolve um mapa nome -> id.
async function ensureExercises(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const ex of CORE_EXERCISES) {
    const record = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: {
        name: ex.name,
        category: ex.category,
        muscleGroups: { create: ex.muscleGroups.map((muscleGroup) => ({ muscleGroup })) },
      },
      select: { id: true },
    });
    map.set(ex.name, record.id);
  }
  return map;
}

function buildSets(
  plan: typeof UPPER_PLAN,
  exerciseIds: Map<string, string>,
  level: number,
) {
  return plan.map((item) => {
    const weight = Math.round((item.base + item.incr * level) * 2) / 2; // múltiplos de 0.5
    return {
      exercise: { connect: { id: exerciseIds.get(item.name)! } },
      sets: {
        create: item.reps.map((reps) => ({ reps, weight })),
      },
    };
  });
}

async function seedWorkouts(userId: string, exerciseIds: Map<string, string>) {
  // Treina seg (upper), qua (lower), sex (upper). Run no sábado (modelo Run).
  for (let offset = HISTORY_WEEKS * 7; offset >= 0; offset--) {
    const date = daysAgo(offset);
    const dow = date.getDay(); // 0=dom .. 6=sáb
    const weeksAgo = Math.floor(offset / 7);
    const level = HISTORY_WEEKS - 1 - weeksAgo; // mais recente = mais carga

    let workoutType: "upper" | "lower" | null = null;
    let plan: typeof UPPER_PLAN | null = null;
    if (dow === 1) {
      workoutType = "upper";
      plan = UPPER_PLAN;
    } else if (dow === 3) {
      workoutType = "lower";
      plan = LOWER_PLAN;
    } else if (dow === 5) {
      workoutType = "upper";
      plan = UPPER_PLAN;
    }

    if (!workoutType || !plan) continue;

    const start = atHour(date, 18);
    const end = atHour(date, 19);

    await prisma.workout.create({
      data: {
        userId,
        name: workoutType === "upper" ? "Treino A — Superior" : "Treino B — Inferior",
        date: start,
        startTime: start,
        endTime: end,
        workoutType,
        dayOfWeek: WEEKDAYS[dow] as any,
        exercises: { create: buildSets(plan, exerciseIds, Math.max(0, level)) },
      },
    });
  }
}

// Pequeno trajeto sintético (loop ~5km na região da Av. Paulista) pra alimentar
// o mapa da corrida sem depender do Strava.
function buildRoute(): { lat: number; lng: number; t: number }[] {
  const cx = -23.5613;
  const cy = -46.6565;
  const r = 0.012;
  const points: { lat: number; lng: number; t: number }[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      lat: cx + r * Math.sin(angle),
      lng: cy + r * Math.cos(angle) * 0.9,
      t: i * 45,
    });
  }
  return points;
}

async function seedRuns(userId: string) {
  const route = buildRoute();
  for (let w = HISTORY_WEEKS; w >= 0; w--) {
    // sábado de cada semana ~ offset baseado na semana
    const offset = w * 7 + 1;
    const date = atHour(daysAgo(offset), 8);
    const level = HISTORY_WEEKS - w;

    const distance = 5000 + level * 250; // distância cresce ao longo do tempo
    const paceSecPerKm = 360 - level * 6; // pace melhora (6:00 -> ~5:12 /km)
    const movingTime = Math.round((distance / 1000) * paceSecPerKm);
    const duration = movingTime + 90; // inclui paradas

    // As duas corridas mais recentes têm trajeto no mapa (1 via Strava, 1 GPX).
    const withRoute = w <= 1;
    const source = w === 0 ? "strava" : w === 1 ? "gpx" : "manual";

    await prisma.run.create({
      data: {
        userId,
        name: w === 0 ? "Corrida de sábado (Strava)" : "Corrida de sábado",
        date,
        startTime: date,
        endTime: new Date(date.getTime() + duration * 1000),
        distance,
        duration,
        movingTime,
        pace: paceSecPerKm,
        elevationGain: 40 + level * 3,
        source,
        externalId: source === "strava" ? `demo-${shortId()}` : null,
        routePoints: withRoute ? (route as any) : undefined,
      },
    });
  }
}

async function seedWeights(userId: string) {
  // Peso caindo gradualmente rumo à meta, com métricas de bioimpedância.
  let weight = 82;
  for (let w = HISTORY_WEEKS; w >= 0; w--) {
    const date = atHour(daysAgo(w * 7), 7);
    const jitter = (w % 2 === 0 ? 0.2 : -0.1);
    const value = Math.round((weight + jitter) * 10) / 10;
    await prisma.weightEntry.create({
      data: {
        userId,
        weight: value,
        recordedAt: date,
        bodyFatPct: Math.round((20 - (HISTORY_WEEKS - w) * 0.4) * 10) / 10,
        muscleMassKg: Math.round((34 + (HISTORY_WEEKS - w) * 0.2) * 10) / 10,
        maintenanceKcal: 2350,
        metabolicAge: 27,
        visceralFat: 8,
        bmi: Math.round((value / (1.78 * 1.78)) * 10) / 10,
      },
    });
    weight -= 0.5; // ~0.5kg/semana
  }
}

async function seedTemplates(userId: string, exerciseIds: Map<string, string>) {
  const make = async (
    name: string,
    workoutType: "upper" | "lower",
    plan: typeof UPPER_PLAN,
  ) => {
    await prisma.workoutTemplate.create({
      data: {
        userId,
        name,
        workoutType,
        exercises: {
          create: plan.map((item, position) => ({
            position,
            exercise: { connect: { id: exerciseIds.get(item.name)! } },
          })),
        },
      },
    });
  };
  await make("Treino A — Superior", "upper", UPPER_PLAN);
  await make("Treino B — Inferior", "lower", LOWER_PLAN);
}

export interface DemoUser {
  id: string;
  username: string;
  email: string;
}

// Cria e popula uma conta demo isolada. Retorna o usuário pronto pra login.
export async function createDemoUser(): Promise<DemoUser> {
  await cleanupExpiredDemoUsers();

  const exerciseIds = await ensureExercises();

  const suffix = shortId();
  const username = `visitante-${suffix}`;
  const email = `demo-${suffix}@${DEMO_EMAIL_DOMAIN}`;
  // Senha aleatória que nunca é exposta: o login do demo não passa por senha.
  const password = await AuthService.hashPassword(crypto.randomBytes(24).toString("hex"));

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password,
      emailVerifiedAt: new Date(),
    },
    select: { id: true, username: true, email: true },
  });

  const lastWorkout = (() => {
    // último dia de treino (seg/qua/sex) a partir de hoje pra trás
    for (let offset = 0; offset <= 7; offset++) {
      const dow = daysAgo(offset).getDay();
      if (dow === 1 || dow === 3 || dow === 5) return atHour(daysAgo(offset), 18);
    }
    return new Date();
  })();

  await prisma.userGoals.create({
    data: {
      userId: user.id,
      weeklyWorkoutGoal: 4,
      targetDays: ["segunda", "quarta", "sexta", "sabado"],
      currentStreak: 5,
      bestStreak: 12,
      totalWeeksCompleted: 6,
      lastWorkoutDate: lastWorkout,
      targetWeight: 75,
    },
  });

  await seedWorkouts(user.id, exerciseIds);
  await seedTemplates(user.id, exerciseIds);
  await seedRuns(user.id);
  await seedWeights(user.id);

  return user;
}
