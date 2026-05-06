import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  dayOfWeekLabel,
  greetingFor,
  workoutTypeLabel,
} from "./format";

describe("format helpers", () => {
  it("traduz workoutType para pt-BR", () => {
    expect(workoutTypeLabel("upper")).toBe("Superior");
    expect(workoutTypeLabel("lower")).toBe("Inferior");
    expect(workoutTypeLabel("cardio")).toBe("Cardio");
  });

  it("traduz category para pt-BR", () => {
    expect(categoryLabel("Upper")).toBe("Superior");
    expect(categoryLabel("Lower")).toBe("Inferior");
    expect(categoryLabel("Cardio")).toBe("Cardio");
  });

  it("traduz dia da semana", () => {
    expect(dayOfWeekLabel("segunda")).toBe("Segunda");
    expect(dayOfWeekLabel("sabado")).toBe("Sábado");
    expect(dayOfWeekLabel("desconhecido")).toBe("desconhecido");
  });

  it("escolhe saudação por horário", () => {
    expect(greetingFor(new Date("2026-05-06T08:00:00"))).toBe("Bom dia");
    expect(greetingFor(new Date("2026-05-06T13:00:00"))).toBe("Boa tarde");
    expect(greetingFor(new Date("2026-05-06T20:00:00"))).toBe("Boa noite");
  });
});
