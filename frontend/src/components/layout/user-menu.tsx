import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = user.username.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3",
        className,
      )}
    >
      <div className="grid size-9 place-items-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.username}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={async () => {
          try {
            await logout();
          } catch {
            toast.error("Não foi possível sair");
          }
        }}
        aria-label="Sair"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
