import { MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!user || user.emailVerifiedAt || hidden) return null;

  const onResend = async () => {
    setBusy(true);
    try {
      await apiClient.post<{ message: string }>("/auth/resend-verification");
      toast.success("Link de verificação reenviado");
      setHidden(true);
    } catch {
      toast.error("Falha ao reenviar — tente novamente em alguns minutos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-col items-start gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning sm:flex-row sm:items-center sm:justify-center sm:gap-3"
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <MailWarning className="size-3.5" />
        Confirme seu e-mail para garantir o acesso à recuperação de senha.
      </span>
      <button
        type="button"
        onClick={onResend}
        disabled={busy}
        className="underline-offset-2 hover:underline disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Reenviar link"}
      </button>
    </div>
  );
}
