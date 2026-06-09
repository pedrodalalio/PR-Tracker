// Script de manutenção: remove as contas demo ANTIGAS, do modelo efêmero
// per-visitante (e-mail `demo-<sufixo>@demo.prtracker.local`). Preserva a nova
// conta demo compartilhada (`visitante@demo.prtracker.local`).
//
// Uso:
//   ts-node scripts/cleanup-old-demo-users.ts            (apenas lista — dry run)
//   ts-node scripts/cleanup-old-demo-users.ts --delete   (apaga de fato)
//
// Os deletes em cascata cuidam de treinos/runs/pesos/etc. de cada conta.
import { prisma } from "../src/lib/prisma";
import { DEMO_EMAIL_DOMAIN } from "../src/lib/demo";

const OLD_DEMO_WHERE = {
  // contas antigas tinham e-mail "demo-<sufixo>@<domínio>"
  email: {
    startsWith: "demo-",
    endsWith: `@${DEMO_EMAIL_DOMAIN}`,
  },
} as const;

async function main() {
  const doDelete = process.argv.includes("--delete");

  const matches = await prisma.user.findMany({
    where: OLD_DEMO_WHERE,
    select: { id: true, username: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Contas demo antigas encontradas: ${matches.length}`);
  for (const u of matches) {
    console.log(`  - ${u.email}  (${u.username})  criada ${u.createdAt.toISOString()}`);
  }

  if (matches.length === 0) {
    console.log("Nada a fazer.");
    return;
  }

  if (!doDelete) {
    console.log("\nDry run (nada foi apagado). Rode de novo com --delete para remover.");
    return;
  }

  const { count } = await prisma.user.deleteMany({ where: OLD_DEMO_WHERE });
  console.log(`\n${count} conta(s) demo antiga(s) removida(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
