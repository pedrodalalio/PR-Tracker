import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { downloadExport, type ExportResource } from "@/lib/export";

interface ExportMenuProps {
  resource: ExportResource;
  label?: string;
}

export function ExportMenu({ resource, label = "Exportar" }: ExportMenuProps) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const onPick = async (format: "csv" | "json") => {
    setOpen(false);
    setBusy(true);
    try {
      await downloadExport(resource, format);
      toast.success(`Exportado como ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <button
          type="button"
          className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
          onClick={() => onPick("csv")}
        >
          Baixar CSV
        </button>
        <button
          type="button"
          className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
          onClick={() => onPick("json")}
        >
          Baixar JSON
        </button>
      </PopoverContent>
    </Popover>
  );
}
