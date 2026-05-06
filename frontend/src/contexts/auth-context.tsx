import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, NetworkError } from "@/lib/api-client";
import { authApi } from "@/services/auth-api";
import type { User } from "@/lib/types";

const USER_CACHE_KEY = "pr-tracker:user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_CACHE_KEY);
  }
}

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (input: {
    usernameOrEmail: string;
    password: string;
  }) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const loadSession = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      writeCachedUser(me);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          const refreshed = await authApi.refresh();
          setUser(refreshed);
          writeCachedUser(refreshed);
          setStatus("authenticated");
          return;
        } catch {
          // fall through to anonymous
        }
      }
      if (err instanceof NetworkError) {
        const cached = readCachedUser();
        if (cached) {
          setUser(cached);
          setStatus("authenticated");
          return;
        }
      }
      writeCachedUser(null);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (input: { usernameOrEmail: string; password: string }) => {
      const u = await authApi.login(input);
      setUser(u);
      writeCachedUser(u);
      setStatus("authenticated");
    },
    [],
  );

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const u = await authApi.register(input);
      setUser(u);
      writeCachedUser(u);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      writeCachedUser(null);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refresh }),
    [user, status, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
