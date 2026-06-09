import crypto from "crypto";
import { prisma } from "./prisma";
import { AuthService } from "./auth";

// Existe UMA conta demo compartilhada. Todo visitante que clica em "Entrar como
// visitante" entra nela — o login é instantâneo, sem seed por clique. Para a
// conta não acumular lixo das alterações dos visitantes, os dados são
// re-semeados em background quando ficam "velhos" (ver RESET_TTL_MS). Não exige
// migração: é só um usuário comum com um e-mail reconhecível pelo domínio.
export const DEMO_EMAIL_DOMAIN = "demo.prtracker.local";
const DEMO_EMAIL = `visitante@${DEMO_EMAIL_DOMAIN}`;
const DEMO_USERNAME = "visitante";
const RESET_TTL_MS = 6 * 60 * 60 * 1000; // re-semeia no máximo a cada ~6h

// Estado em memória para coordenar criação/reset dentro do processo (deploy
// single-instance). Reinicia a cada restart, o que no pior caso re-semeia uma
// vez — inofensivo.
let lastSeededAt = 0;
let inFlightCreate: Promise<DemoUser> | null = null;
let resetting = false;

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

// Garante que os exercícios usados pelo demo existem (são globais/compartilhados)
// e devolve um mapa nome -> id. Os upserts são independentes (nomes distintos),
// então rodam em paralelo em vez de um round-trip por exercício.
async function ensureExercises(): Promise<Map<string, string>> {
  const records = await Promise.all(
    CORE_EXERCISES.map((ex) =>
      prisma.exercise
        .upsert({
          where: { name: ex.name },
          update: {},
          create: {
            name: ex.name,
            category: ex.category,
            muscleGroups: {
              create: ex.muscleGroups.map((muscleGroup) => ({ muscleGroup })),
            },
          },
          select: { id: true },
        })
        .then((record) => [ex.name, record.id] as const),
    ),
  );
  return new Map(records);
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
  // Cada treino tem sets aninhados (sem createMany), mas são independentes entre
  // si, então criamos todos em paralelo em vez de um round-trip por treino.
  const creates: Promise<unknown>[] = [];
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

    creates.push(
      prisma.workout.create({
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
      }),
    );
  }
  await Promise.all(creates);
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
  // Runs não têm relações aninhadas → um único createMany em vez de N creates.
  const data = [];
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

    data.push({
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
    });
  }
  await prisma.run.createMany({ data });
}

async function seedWeights(userId: string) {
  // Peso caindo gradualmente rumo à meta, com métricas de bioimpedância.
  // Sem relações aninhadas → um único createMany.
  const data = [];
  let weight = 82;
  for (let w = HISTORY_WEEKS; w >= 0; w--) {
    const date = atHour(daysAgo(w * 7), 7);
    const jitter = (w % 2 === 0 ? 0.2 : -0.1);
    const value = Math.round((weight + jitter) * 10) / 10;
    data.push({
      userId,
      weight: value,
      recordedAt: date,
      bodyFatPct: Math.round((20 - (HISTORY_WEEKS - w) * 0.4) * 10) / 10,
      muscleMassKg: Math.round((34 + (HISTORY_WEEKS - w) * 0.2) * 10) / 10,
      maintenanceKcal: 2350,
      metabolicAge: 27,
      visceralFat: 8,
      bmi: Math.round((value / (1.78 * 1.78)) * 10) / 10,
    });
    weight -= 0.5; // ~0.5kg/semana
  }
  await prisma.weightEntry.createMany({ data });
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
  await Promise.all([
    make("Treino A — Superior", "upper", UPPER_PLAN),
    make("Treino B — Inferior", "lower", LOWER_PLAN),
  ]);
}

export interface DemoUser {
  id: string;
  username: string;
  email: string;
}

// Popula a conta demo com goals + todo o histórico. Tudo que é independente
// roda em paralelo para minimizar round-trips ao banco (o gargalo em prod).
async function populateDemoData(userId: string): Promise<void> {
  const exerciseIds = await ensureExercises();

  const lastWorkout = (() => {
    // último dia de treino (seg/qua/sex) a partir de hoje pra trás
    for (let offset = 0; offset <= 7; offset++) {
      const dow = daysAgo(offset).getDay();
      if (dow === 1 || dow === 3 || dow === 5) return atHour(daysAgo(offset), 18);
    }
    return new Date();
  })();

  await Promise.all([
    prisma.userGoals.create({
      data: {
        userId,
        weeklyWorkoutGoal: 4,
        targetDays: ["segunda", "quarta", "sexta", "sabado"],
        currentStreak: 5,
        bestStreak: 12,
        totalWeeksCompleted: 6,
        lastWorkoutDate: lastWorkout,
        targetWeight: 75,
      },
    }),
    seedWorkouts(userId, exerciseIds),
    seedTemplates(userId, exerciseIds),
    seedRuns(userId),
    seedWeights(userId),
  ]);
}

// Apaga os dados gerados da conta demo (mantém o próprio usuário, para os
// tokens de sessão ativos continuarem válidos). Workouts saem antes dos
// templates porque Workout.templateId é SetNull.
async function wipeDemoData(userId: string): Promise<void> {
  await prisma.workout.deleteMany({ where: { userId } });
  await Promise.all([
    prisma.workoutTemplate.deleteMany({ where: { userId } }),
    prisma.run.deleteMany({ where: { userId } }),
    prisma.weightEntry.deleteMany({ where: { userId } }),
    prisma.weeklyGoalEntry.deleteMany({ where: { userId } }),
    prisma.userGoals.deleteMany({ where: { userId } }),
  ]);
}

// Cria a conta demo única (uma vez na vida do banco) e a popula.
async function createDemoUser(): Promise<DemoUser> {
  // Senha aleatória que nunca é exposta: o login do demo não passa por senha.
  const password = await AuthService.hashPassword(
    crypto.randomBytes(24).toString("hex"),
  );

  try {
    const user = await prisma.user.create({
      data: {
        username: DEMO_USERNAME,
        email: DEMO_EMAIL,
        password,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, username: true, email: true },
    });

    await populateDemoData(user.id);
    lastSeededAt = Date.now();
    return user;
  } catch (err: any) {
    // Corrida rara: outra requisição já criou a conta demo (e-mail único).
    // Reaproveita a conta existente em vez de estourar.
    if (err?.code === "P2002") {
      const existing = await prisma.user.findUnique({
        where: { email: DEMO_EMAIL },
        select: { id: true, username: true, email: true },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

// Se os dados ficaram velhos, re-semeia em background. O visitante atual segue
// com os dados existentes (que são válidos de qualquer forma); o reset vale para
// os próximos. Um lock em memória evita resets concorrentes.
function maybeResetInBackground(userId: string): void {
  if (resetting) return;
  if (Date.now() - lastSeededAt < RESET_TTL_MS) return;
  resetting = true;
  void (async () => {
    try {
      await wipeDemoData(userId);
      await populateDemoData(userId);
      lastSeededAt = Date.now();
    } catch (err) {
      console.error("Failed to reset demo data:", err);
    } finally {
      resetting = false;
    }
  })();
}

// Ponto de entrada do login demo. Retorna a conta padrão compartilhada — quase
// sempre instantâneo (só uma busca). Só paga o seed completo na primeiríssima
// vez, quando a conta ainda não existe.
export async function getDemoUser(): Promise<DemoUser> {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, username: true, email: true },
  });

  if (existing) {
    // No primeiro acesso após um restart, assume que os dados estão frescos
    // para não disparar um reset desnecessário logo de cara.
    if (lastSeededAt === 0) lastSeededAt = Date.now();
    maybeResetInBackground(existing.id);
    return existing;
  }

  // Ainda não existe: cria + popula uma única vez. O lock garante que requisições
  // concorrentes compartilhem a mesma criação em vez de colidir no e-mail único.
  if (!inFlightCreate) {
    inFlightCreate = createDemoUser().finally(() => {
      inFlightCreate = null;
    });
  }
  return inFlightCreate;
}
