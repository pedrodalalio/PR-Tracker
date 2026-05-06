import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  showText?: boolean;
}

export function Brand({ className, showText = true }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {showText && (
        <span className="font-display text-base font-bold tracking-tight">
          PR <span className="text-primary">Tracker</span>
        </span>
      )}
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8", className)}
      fill="none"
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="currentColor" className="text-foreground/5" />
      <rect x="6" y="22" width="6" height="20" rx="2" className="fill-primary" />
      <rect x="13" y="26" width="5" height="12" rx="1.5" className="fill-primary/70" />
      <rect x="46" y="26" width="5" height="12" rx="1.5" className="fill-primary/70" />
      <rect x="52" y="22" width="6" height="20" rx="2" className="fill-primary" />
      <rect x="18" y="29" width="28" height="6" rx="1" className="fill-foreground" />
    </svg>
  );
}
