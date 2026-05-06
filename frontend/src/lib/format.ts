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

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
