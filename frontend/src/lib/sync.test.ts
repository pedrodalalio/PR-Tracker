import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-client", async () => {
  const real = await vi.importActual<typeof import("./api-client")>(
    "./api-client",
  );
  return {
    ...real,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("./db", () => {
  type Entry = {
    id: number;
    resource: string;
    operation: string;
    endpoint: string;
    method: string;
    payload?: unknown;
    retries: number;
    error?: string;
    createdAt: number;
  };
  const store: Entry[] = [];
  const outbox = {
    add: vi.fn(async (entry: Omit<Entry, "id">) => {
      const next = { ...entry, id: store.length + 1 };
      store.push(next);
      return next.id;
    }),
    delete: vi.fn(async (id: number) => {
      const idx = store.findIndex((e) => e.id === id);
      if (idx >= 0) store.splice(idx, 1);
    }),
    update: vi.fn(async (id: number, patch: Partial<Entry>) => {
      const item = store.find((e) => e.id === id);
      if (item) Object.assign(item, patch);
    }),
    orderBy: vi.fn(() => ({
      toArray: vi.fn(async () => [...store]),
    })),
    __reset: () => {
      store.length = 0;
    },
  };
  return { db: { outbox } };
});

import { apiClient, NetworkError } from "./api-client";
import { db } from "./db";
import { enqueueOutbox, flushOutbox } from "./sync";

const apiMock = apiClient as unknown as {
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const outboxMock = db.outbox as unknown as {
  __reset: () => void;
};

beforeEach(() => {
  apiMock.post.mockReset();
  apiMock.put.mockReset();
  apiMock.delete.mockReset();
  outboxMock.__reset();
  vi.mocked(db.outbox.delete).mockClear();
  vi.mocked(db.outbox.update).mockClear();
  vi.mocked(db.outbox.add).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("flushOutbox", () => {
  it("processa entradas em sucesso e remove da fila", async () => {
    apiMock.post.mockResolvedValueOnce({ ok: true });
    await enqueueOutbox({
      resource: "workout",
      operation: "create",
      endpoint: "/workouts",
      method: "POST",
      payload: { name: "X" },
    });
    const result = await flushOutbox();
    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(apiMock.post).toHaveBeenCalledWith("/workouts", { name: "X" });
  });

  it("para de tentar quando bate em NetworkError, sem dropar a entrada", async () => {
    apiMock.post.mockRejectedValueOnce(new NetworkError());
    await enqueueOutbox({
      resource: "workout",
      operation: "create",
      endpoint: "/workouts",
      method: "POST",
      payload: { name: "X" },
    });
    const result = await flushOutbox();
    expect(result).toEqual({ processed: 0, failed: 0 });
    // deletion não deve ter rolado
    expect(db.outbox.delete).not.toHaveBeenCalled();
  });

  it("descarta entrada após exceder MAX_RETRIES em erro não-rede", async () => {
    apiMock.put.mockRejectedValue(new Error("server error"));
    await enqueueOutbox({
      resource: "workout",
      operation: "update",
      endpoint: "/workouts/abc",
      method: "PUT",
      payload: {},
    });
    for (let i = 0; i < 5; i++) {
      await flushOutbox();
    }
    expect(db.outbox.delete).toHaveBeenCalled();
  });
});
