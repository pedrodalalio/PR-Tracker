import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Erro 404
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-muted-foreground">
        O caminho que você tentou acessar não existe ou foi movido.
      </p>
      <Button asChild size="lg">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
