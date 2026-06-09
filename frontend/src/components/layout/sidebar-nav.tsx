import { Plus } from "lucide-react";
import { NavLink } from "react-router";
import { Brand } from "@/components/brand";
import { navGroups } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  return (
    <aside className="hidden md:sticky md:top-0 md:h-dvh md:flex md:flex-col md:w-64 md:shrink-0 md:self-start md:border-r md:border-border md:bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <Brand />
      </div>
      <div className="px-3 pb-3">
        <Button asChild size="lg" className="w-full justify-start gap-2">
          <NavLink to="/workouts/new">
            <Plus className="size-4" />
            Novo treino
          </NavLink>
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-md",
                              isActive
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-3 py-4">
        <UserMenu />
      </div>
    </aside>
  );
}
