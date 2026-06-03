// Script temporário: encontra a melhor corrida real (com trajeto) de uma conta
// não-demo e gera um access token local pra ela, pra alimentar o screenshot.
// Saída: JSON em stdout e em /tmp/real-run.json.
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { AuthService } from "../src/lib/auth";
import { DEMO_EMAIL_DOMAIN } from "../src/lib/demo";

async function main() {
  const runs = await prisma.run.findMany({
    where: {
      deletedAt: null,
      user: { email: { not: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } },
    },
    select: {
      id: true,
      name: true,
      distance: true,
      source: true,
      routePoints: true,
      user: { select: { id: true, username: true, email: true } },
    },
  });

  const withRoute = runs
    .map((r) => ({
      ...r,
      points: Array.isArray(r.routePoints) ? r.routePoints.length : 0,
    }))
    .filter((r) => r.points > 2)
    .sort((a, b) => b.points - a.points);

  if (withRoute.length === 0) {
    console.error("Nenhuma corrida real com trajeto encontrada.");
    process.exit(2);
  }

  console.error(`Encontradas ${withRoute.length} corridas com trajeto. Top 5:`);
  for (const r of withRoute.slice(0, 5)) {
    console.error(
      `  - ${r.user.username} | ${r.name ?? "(sem nome)"} | ${(r.distance / 1000).toFixed(2)}km | ${r.points} pontos | ${r.source}`,
    );
  }

  const best = withRoute[0];
  const token = AuthService.generateToken({
    userId: best.user.id,
    username: best.user.username,
    email: best.user.email,
  });

  const out = {
    runId: best.id,
    username: best.user.username,
    name: best.name,
    distanceKm: Number((best.distance / 1000).toFixed(2)),
    points: best.points,
    source: best.source,
    token,
  };
  writeFileSync("/tmp/real-run.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ...out, token: token.slice(0, 20) + "…" }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
