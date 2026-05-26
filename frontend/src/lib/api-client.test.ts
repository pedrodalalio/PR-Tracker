import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  AUTH_CLEARED_EVENT,
  NetworkError,
  apiClient,
} from "./api-client";
import { setAccessToken } from "./auth-storage";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
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

describe("apiClient refresh-on-401", () => {
  it("renova o access token em 401 e re-executa a request original", async () => {
    setAccessToken("old-token");
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: "Token expirado" }, { status: 401 }),
      )
      .mockResolvedValueOnce(jsonResponse({ token: "new-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const data = await apiClient.get<{ ok: boolean }>("/workouts");
    expect(data).toEqual({ ok: true });
    expect(fetchMock.mock.calls).toHaveLength(3);
    const refreshCall = fetchMock.mock.calls[1]!;
    expect(String(refreshCall[0])).toContain("/auth/refresh");
    const retryHeaders = fetchMock.mock.calls[2]![1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer new-token");
  });

  it("derruba a sessão quando o refresh devolve 401 (cookie inválido)", async () => {
    setAccessToken("old-token");
    const onCleared = vi.fn();
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: "expired" }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "Refresh inválido" }, { status: 401 }),
      );

    await expect(apiClient.get("/workouts")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(onCleared).toHaveBeenCalled();
    window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
  });

  it("preserva a sessão quando o refresh falha por erro transiente", async () => {
    setAccessToken("old-token");
    const onCleared = vi.fn();
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: "expired" }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "Bad gateway" }, { status: 502 }),
      );

    await expect(apiClient.get("/workouts")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(onCleared).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
  });

  it("preserva a sessão quando o refresh falha por erro de rede", async () => {
    setAccessToken("old-token");
    const onCleared = vi.fn();
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: "expired" }, { status: 401 }),
      )
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiClient.get("/workouts")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(onCleared).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
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
