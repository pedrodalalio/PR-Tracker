import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { Brand } from "@/components/brand";
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

const moreItems = [
  { to: "/runs", label: "Corridas" },
  { to: "/reports", label: "Relatórios" },
  { to: "/exercises", label: "Exercícios" },
  { to: "/exercises/manage", label: "Gerenciar exercícios" },
  { to: "/goals", label: "Metas" },
];

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
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Mais</SheetTitle>
              <SheetDescription>
                Acesse outras seções do app.
              </SheetDescription>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <UserMenu className="mt-6" />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
