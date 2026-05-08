import { WifiOff } from "lucide-react";
import { Outlet, useLocation } from "react-router";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

// Páginas com bastante densidade de gráficos ganham um container mais largo
// no desktop pra os labels não embolarem.
const WIDE_PATH_PREFIXES = ["/reports", "/progress"];

export function AppLayout() {
  const { pathname } = useLocation();
  const online = useOnline();
  const wide = WIDE_PATH_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="flex min-h-dvh">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        {!online && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-medium text-warning"
          >
            <WifiOff className="size-3.5" />
            <span>Sem conexão — alguns dados podem estar desatualizados.</span>
          </div>
        )}
        <main className="flex-1 pb-24 md:pb-10">
          <div
            className={cn(
              "mx-auto w-full px-4 py-5 md:px-8 md:py-8",
              wide ? "max-w-7xl" : "max-w-5xl",
            )}
          >
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
