// Em dev, deriva a URL da API a partir do host atual (window.location.hostname).
// Isso permite abrir o front pelo celular via LAN (ex.: http://192.168.x.x:5173)
// sem precisar trocar a env por máquina — em prod VITE_API_URL é setada
// explicitamente e tem precedência.
function defaultApiUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
}

export const env = {
  apiUrl:
    (import.meta.env.VITE_API_URL as string | undefined) ?? defaultApiUrl(),
  isDev: import.meta.env.DEV,
};
