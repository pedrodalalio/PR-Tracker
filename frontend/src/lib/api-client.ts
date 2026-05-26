import { env } from "@/lib/env";
import { getAccessToken, setAccessToken } from "@/lib/auth-storage";

export const AUTH_CLEARED_EVENT = "pr-tracker:auth-cleared";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor(message = "Sem conexão com o servidor") {
    super(message);
    this.name = "NetworkError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
  /** Internal: marca uma chamada como já tendo tentado refresh, evita loop. */
  _retried?: boolean;
}

// Refresh-on-401: ao receber 401 numa chamada autenticada, tenta /auth/refresh
// uma vez e re-executa a request original com o novo access token. Múltiplas
// chamadas paralelas que faltarem 401 simultaneamente compartilham a mesma
// promise (uma só /auth/refresh roda por vez).
//
// IMPORTANTE: a sessão só é encerrada quando o backend devolve uma resposta
// definitiva (401/403/404) — falhas transientes (rede, 5xx, 429) propagam o
// 401 original como erro pro caller mas preservam o token/cookie, pra não
// derrubar o usuário no meio de um treino por causa de um soluço de rede.
type RefreshResult =
  | { kind: "ok"; token: string }
  | { kind: "expired" }
  | { kind: "transient" };

let refreshInflight: Promise<RefreshResult> | null = null;

async function tryRefreshAccessToken(): Promise<RefreshResult> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch(`${env.apiUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { kind: "expired" as const };
      }
      if (!res.ok) {
        return { kind: "transient" as const };
      }
      const data = (await res.json()) as { token?: string };
      if (data.token) {
        setAccessToken(data.token);
        return { kind: "ok" as const, token: data.token };
      }
      return { kind: "transient" as const };
    } catch {
      return { kind: "transient" as const };
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

async function request<T>(
  path: string,
  { body, searchParams, headers, skipAuth, _retried, ...init }: RequestOptions = {},
): Promise<T> {
  const url = new URL(
    path.startsWith("http") ? path : `${env.apiUrl}${path}`,
  );
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token && !finalHeaders.has("Authorization")) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      ...init,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(
      err instanceof Error ? err.message : "Sem conexão com o servidor",
    );
  }

  // Intercepta 401 em chamadas autenticadas: tenta refresh + retry uma vez.
  // Pula em chamadas a /auth/* (login, register, refresh) pra evitar loop.
  const isAuthRoute = path.startsWith("/auth/");
  if (
    response.status === 401 &&
    !skipAuth &&
    !isAuthRoute &&
    !_retried
  ) {
    const result = await tryRefreshAccessToken();
    if (result.kind === "ok") {
      return request<T>(path, {
        body,
        searchParams,
        headers,
        skipAuth,
        _retried: true,
        ...init,
      });
    }
    if (result.kind === "expired") {
      // Refresh cookie inválido/expirado: limpa o token e avisa o AuthContext
      // pra cair pro fluxo de "anonymous" (redireciona pra /login).
      setAccessToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
      }
    }
    // result.kind === "transient": deixa o 401 cair como ApiError abaixo
    // sem matar a sessão. O caller mostra o erro e o usuário tenta de novo.
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorField =
      data && typeof data === "object" && "error" in data
        ? (data as { error: unknown }).error
        : null;
    const message =
      (typeof errorField === "string" && errorField) ||
      response.statusText ||
      "Erro inesperado";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "POST", body });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "PUT", body });
  },
  delete<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "DELETE", body });
  },
};
