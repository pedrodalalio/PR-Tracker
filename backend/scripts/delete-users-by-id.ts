// Script de manutenção: remove contas de usuário por ID (cascade cuida dos
// dados relacionados: treinos, runs, pesos, templates, tokens, etc.).
//
// Uso:
//   ts-node scripts/delete-users-by-id.ts            (apenas lista — dry run)
//   ts-node scripts/delete-users-by-id.ts --delete   (apaga de fato)
import { prisma } from "../src/lib/prisma";

const IDS = [
  "7007d9d8-6ac2-4cce-98aa-6b3758d25d63",
  "a757d719-0895-4368-bf82-4e7059720e4f",
];

async function main() {
  const doDelete = process.argv.includes("--delete");

  for (const id of IDS) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            workouts: true,
            runs: true,
            weightEntries: true,
            workoutTemplates: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`- ${id}: NÃO encontrado`);
      continue;
    }
    const c = user._count;
    console.log(
      `- ${user.email} (${user.username}) id=${user.id} criada ${user.createdAt.toISOString()}\n` +
        `    workouts=${c.workouts} runs=${c.runs} weightEntries=${c.weightEntries} templates=${c.workoutTemplates}`,
    );
  }

  if (!doDelete) {
    console.log("\nDry run (nada foi apagado). Rode de novo com --delete para remover.");
    return;
  }

  const { count } = await prisma.user.deleteMany({ where: { id: { in: IDS } } });
  console.log(`\n${count} conta(s) removida(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
