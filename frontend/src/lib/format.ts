import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: string | Date, pattern = "PPP") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: ptBR });
}

export function formatRelative(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function workoutTypeLabel(type: string) {
  switch (type) {
    case "upper":
      return "Superior";
    case "lower":
      return "Inferior";
    case "cardio":
      return "Cardio";
    default:
      return type;
  }
}

export function categoryLabel(category: string) {
  switch (category) {
    case "Upper":
      return "Superior";
    case "Lower":
      return "Inferior";
    case "Cardio":
      return "Cardio";
    default:
      return category;
  }
}

export function dayOfWeekLabel(day: string) {
  const map: Record<string, string> = {
    segunda: "Segunda",
    "terça": "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
    domingo: "Domingo",
  };
  return map[day] ?? day;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, "0")}min`;
  }
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${s}s`;
}

export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
