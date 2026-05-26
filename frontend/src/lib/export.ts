import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/auth-storage";

export type ExportResource = "workouts" | "runs" | "weights";
export type ExportFormat = "csv" | "json";

/**
 * Faz GET autenticado em /export/<resource>.<format> e dispara download no
 * browser. Usa fetch direto pra preservar o blob (apiClient assume JSON).
 */
export async function downloadExport(
  resource: ExportResource,
  format: ExportFormat,
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${env.apiUrl}/export/${resource}.${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `pr-tracker-${resource}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
