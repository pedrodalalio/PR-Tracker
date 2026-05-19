import {
  CalendarDays,
  Dumbbell,
  Home,
  LineChart,
  Plus,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const leftItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/workouts", label: "Treinos", icon: Dumbbell, end: false },
] as const;

const rightItems = [
  { to: "/calendar", label: "Calendário", icon: CalendarDays, end: false },
  { to: "/progress", label: "Progresso", icon: LineChart, end: false },
] as const;

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onNew = pathname === "/workouts/new";

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom"
      aria-label="Navegação principal"
    >
      <div className="relative mx-auto flex h-14 max-w-md items-stretch px-2">
        {leftItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}

        <div className="relative flex flex-1 items-end justify-center">
          <button
            type="button"
            onClick={() => navigate("/workouts/new")}
            aria-label="Novo treino"
            aria-current={onNew ? "page" : undefined}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6",
              "flex size-14 items-center justify-center rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-lg shadow-primary/30 ring-4 ring-background",
              "transition-all active:scale-95 hover:shadow-primary/40",
              onNew && "ring-primary/30 scale-105",
            )}
          >
            <Plus className="size-6" strokeWidth={2.75} />
          </button>
        </div>

        {rightItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}

type Item = (typeof leftItems)[number] | (typeof rightItems)[number];

function NavItem({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute top-0 h-0.5 w-8 rounded-full transition-opacity",
              isActive ? "bg-primary opacity-100" : "opacity-0",
            )}
          />
          <Icon
            className={cn(
              "size-5 transition-transform",
              isActive && "scale-110",
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span className="leading-none">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
