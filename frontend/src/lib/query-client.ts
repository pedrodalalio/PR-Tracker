import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      // Combinado com staleTime 30s: ao retomar foco, só refetcha queries
      // antigas o suficiente — evita stale data sem matar o servidor.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
