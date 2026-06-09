import { Menu, Plus } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { Brand } from "@/components/brand";
import { navGroups } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:h-16 md:px-6">
      <div className="md:hidden">
        <Brand />
      </div>
      {title && (
        <h1 className="hidden md:block font-display text-xl font-semibold tracking-tight">
          {title}
        </h1>
      )}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-72 flex-col">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Acesse todas as seções do app.
              </SheetDescription>
            </SheetHeader>
            <div className="px-1 pt-4">
              <Button asChild size="lg" className="w-full justify-start gap-2">
                <NavLink to="/workouts/new" onClick={() => setOpen(false)}>
                  <Plus className="size-4" />
                  Novo treino
                </NavLink>
              </Button>
            </div>
            <nav className="mt-4 flex flex-1 flex-col gap-6 overflow-y-auto px-1">
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
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
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
            <UserMenu className="mt-2" />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
