import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV_CONFIG } from "../config/environment";
import { secureStorage } from "./secureStorage";

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  details?: string[];
}

const AUTH_STORAGE_KEY = "@pr_tracker_auth";

// Criar instância do axios para autenticação
const authApiClient = axios.create({
  baseURL: ENV_CONFIG.apiBaseUrl,
  timeout: 10000,
});

// Interceptor para adicionar token automaticamente nas requisições autenticadas
authApiClient.interceptors.request.use(
  async (config) => {
    try {
      const authData = await secureStorage.getAuthData();
      if (authData && authData.type !== "guest") {
        const accessToken = await secureStorage.getAccessToken();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    } catch (error) {
      console.error("[AuthAPI] Error getting auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para renovação automática de tokens
authApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${ENV_CONFIG.apiBaseUrl}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data;

          // Store new tokens
          await secureStorage.storeTokens(token, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return authApiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error("[AuthAPI] Token refresh failed:", refreshError);
        await secureStorage.clearAll();
        // Optionally, redirect to login screen here
      }
    }

    return Promise.reject(error);
  },
);

// Interceptor para log de requisições em desenvolvimento
if (ENV_CONFIG.isDevelopment) {
  authApiClient.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => Promise.reject(error),
  );

  authApiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      console.error(
        "[AuthAPI] Response error:",
        error.response?.data || error.message,
      );
      return Promise.reject(error);
    },
  );
}

// Função auxiliar para verificar se é usuário guest
async function isGuestUser(): Promise<boolean> {
  try {
    const authData = await secureStorage.getAuthData();
    return authData?.type === "guest";
  } catch (error) {
    console.error("Error checking user type:", error);
  }
  return false;
}

class AuthApiService {
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await authApiClient.post("/auth/register", userData);

      // Salvar dados de autenticação com armazenamento seguro
      const authData = {
        type: "admin" as const,
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
      };

      await Promise.all([
        secureStorage.storeTokens(response.data.token, response.data.refreshToken),
        secureStorage.storeAuthData(authData),
      ]);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await authApiClient.post("/auth/login", credentials);

      // Salvar dados de autenticação com armazenamento seguro
      const authData = {
        type: "admin" as const,
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
      };

      await Promise.all([
        secureStorage.storeTokens(response.data.token, response.data.refreshToken),
        secureStorage.storeAuthData(authData),
      ]);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  async getCurrentUser(): Promise<{ user: AuthResponse["user"] }> {
    if (await isGuestUser()) {
      throw new Error("Cannot get current user for guest users");
    }

    try {
      const response = await authApiClient.get("/auth/me");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  async logout(): Promise<{ message: string }> {
    const authData = await secureStorage.getAuthData();

    if (authData?.type === "guest") {
      // Para usuários guest, apenas limpar o storage
      await secureStorage.clearAll();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return { message: "Logged out successfully" };
    }

    try {
      const response = await authApiClient.post("/auth/logout");

      // Limpar dados de autenticação do armazenamento seguro
      await secureStorage.clearAll();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

      return response.data;
    } catch (error) {
      // Mesmo se o logout falhar no servidor, limpar dados locais
      await secureStorage.clearAll();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  // Método para fazer login como guest
  async loginAsGuest(): Promise<void> {
    const guestData = {
      type: "guest" as const,
      id: "guest",
      username: "Usuário Convidado",
      email: "guest@example.com",
    };

    await Promise.all([
      secureStorage.storeAuthData(guestData),
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestData)),
    ]);
  }

  // Método para refresh manual de tokens
  async refreshTokens(): Promise<RefreshTokenResponse | null> {
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await authApiClient.post("/auth/refresh", {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken } = response.data;

      // Store new tokens
      await secureStorage.storeTokens(token, newRefreshToken);

      return response.data;
    } catch (error) {
      console.error("Manual token refresh failed:", error);
      await secureStorage.clearAll();
      throw error;
    }
  }

  // Método para verificar se existe token válido
  async hasValidToken(): Promise<boolean> {
    try {
      const authData = await secureStorage.getAuthData();
      if (authData) {
        if (authData.type === "guest") {
          return true;
        }
        const accessToken = await secureStorage.getAccessToken();
        return !!accessToken;
      }
    } catch (error) {
      console.error("Error checking token validity:", error);
    }
    return false;
  }

  // Método para obter dados de autenticação do storage
  async getStoredAuthData(): Promise<any> {
    try {
      return await secureStorage.getAuthData();
    } catch (error) {
      console.error("Error getting stored auth data:", error);
      return null;
    }
  }
}

export const authApi = new AuthApiService();
