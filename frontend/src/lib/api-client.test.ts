import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, apiClient } from "./api-client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("apiClient", () => {
  it("envia GET com credentials e retorna JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const data = await apiClient.get<{ ok: boolean }>("/health");
    expect(data).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("serializa body em POST e seta Content-Type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await apiClient.post("/workouts", { name: "A" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "A" }));
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("propaga ApiError com mensagem do servidor em respostas !ok", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Credenciais inválidas" }, { status: 401 }),
    );
    await expect(apiClient.post("/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Credenciais inválidas",
    });
  });

  it("converte falha de rede em NetworkError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiClient.get("/anything")).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("retorna undefined em respostas 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiClient.delete("/x");
    expect(result).toBeUndefined();
  });

  it("anexa querystring quando searchParams é fornecido", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await apiClient.get("/exercises", {
      searchParams: { muscle: "peito", page: 2, empty: "" },
    });
    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.searchParams.get("muscle")).toBe("peito");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.has("empty")).toBe(false);
  });
});

describe("ApiError", () => {
  it("expõe status e details", () => {
    const err = new ApiError("Boom", 500, { trace: "abc" });
    expect(err.status).toBe(500);
    expect(err.details).toEqual({ trace: "abc" });
    expect(err).toBeInstanceOf(Error);
  });
});
