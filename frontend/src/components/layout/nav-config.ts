import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileBarChart,
  Footprints,
  Home,
  LineChart,
  ListChecks,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/", label: "Início", icon: Home, end: true },
      { to: "/workouts", label: "Treinos", icon: Dumbbell, end: false },
      { to: "/runs", label: "Corridas", icon: Footprints, end: false },
      { to: "/calendar", label: "Calendário", icon: CalendarDays, end: false },
      { to: "/progress", label: "Progresso", icon: LineChart, end: false },
      { to: "/reports", label: "Relatórios", icon: FileBarChart, end: false },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/exercises", label: "Exercícios", icon: ListChecks, end: false },
      { to: "/templates", label: "Modelos", icon: ClipboardList, end: false },
      { to: "/goals", label: "Metas", icon: Target, end: false },
    ],
  },
];
