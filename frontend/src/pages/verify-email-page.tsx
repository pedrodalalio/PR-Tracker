import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";

type Status = "loading" | "ok" | "error" | "missing";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "missing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiClient.post<{ message: string }>(
          "/auth/verify-email",
          { token },
          { skipAuth: true },
        );
        if (!cancelled) setStatus("ok");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError ? err.message : "Falha ao verificar",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell
      eyebrow="Verificação"
      title="Confirmar e-mail"
      subtitle="Validando seu link…"
    >
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando…</p>
          </>
        )}
        {status === "missing" && (
          <>
            <XCircle className="size-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Link sem token. Use o link recebido por e-mail.
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="size-10 text-primary" />
            <p className="text-sm">E-mail verificado com sucesso.</p>
            <Button asChild>
              <Link to="/">Ir para o início</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="size-10 text-destructive" />
            <p className="text-sm">{errorMsg ?? "Token inválido ou expirado."}</p>
            <Button asChild variant="outline">
              <Link to="/">Voltar</Link>
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
