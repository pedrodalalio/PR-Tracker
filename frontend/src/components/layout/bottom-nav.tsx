import { CalendarDays, Dumbbell, Home, LineChart, Plus } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/workouts", label: "Treinos", icon: Dumbbell, end: false },
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
      <div className="relative mx-auto grid max-w-2xl grid-cols-5 px-2 pb-1 pt-1.5">
        <NavItem item={items[0]} />
        <NavItem item={items[1]} />
        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/workouts/new")}
            className={cn(
              "absolute -top-5 left-1/2 -translate-x-1/2 flex size-14 items-center justify-center rounded-full",
              "bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95",
              "ring-4 ring-background",
              onNew && "ring-primary/40",
            )}
            aria-label="Novo treino"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
          <span className="block pt-9 text-center text-[10px] font-medium text-muted-foreground">
            Novo
          </span>
        </div>
        <NavItem item={items[2]} />
        <NavItem item={items[3]} />
      </div>
    </nav>
  );
}

function NavItem({ item }: { item: (typeof items)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "size-5 transition-transform",
              isActive && "scale-110",
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
