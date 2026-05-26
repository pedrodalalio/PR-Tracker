import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { apiClient, ApiError } from "@/lib/api-client";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/auth-storage";

export function AccountPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const downloadBundle = async () => {
    setExporting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${env.apiUrl}/account/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "pr-tracker-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Sua conta"
        description="Baixe uma cópia completa dos seus dados ou exclua sua conta permanentemente."
      />

      {user && (
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Logado como
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold">
            {user.username}
          </h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <Download className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold">
              Exportar meus dados
            </h2>
            <p className="text-sm text-muted-foreground">
              Baixa um arquivo JSON único com tudo: treinos, séries, corridas,
              pesagens, metas e exercícios cadastrados.
            </p>
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={downloadBundle}
          disabled={exporting}
          variant="outline"
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Baixar JSON completo
        </Button>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-destructive/15 text-destructive">
            <ShieldAlert className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-destructive">
              Excluir conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Apaga sua conta e todos os dados associados. Esta ação não pode
              ser desfeita.
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Excluir minha conta
        </Button>
      </section>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== "EXCLUIR") {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }
    setBusy(true);
    try {
      await apiClient.delete<void>("/account", { password });
      toast.success("Conta excluída");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao excluir conta";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta permanentemente</DialogTitle>
          <DialogDescription>
            Todos os seus dados serão apagados imediatamente. Antes de prosseguir,
            considere fazer download dos dados na seção acima.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">Sua senha</Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Digite <span className="font-mono font-bold">EXCLUIR</span> para
              confirmar
            </Label>
            <Input
              id="delete-confirm"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={busy || confirm !== "EXCLUIR" || password.length === 0}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Excluir conta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
