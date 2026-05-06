import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { BrandMark } from "@/components/brand";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <BrandMark className="size-12 text-foreground/10" />
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireAnonymous({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <BrandMark className="size-12 text-foreground/10" />
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
