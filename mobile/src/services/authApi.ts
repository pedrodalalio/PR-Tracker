import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV_CONFIG } from "../config/environment";

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
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        if (authData.token && authData.type !== "guest") {
          config.headers.Authorization = `Bearer ${authData.token}`;
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
    const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      return authData.type === "guest";
    }
  } catch (error) {
    console.error("Error checking user type:", error);
  }
  return false;
}

class AuthApiService {
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await authApiClient.post("/auth/register", userData);

      // Salvar dados de autenticação no AsyncStorage
      const authData = {
        type: "authenticated",
        token: response.data.token,
        user: response.data.user,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

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

      // Salvar dados de autenticação no AsyncStorage
      const authData = {
        type: "authenticated",
        token: response.data.token,
        user: response.data.user,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

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
    if (await isGuestUser()) {
      // Para usuários guest, apenas limpar o storage
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return { message: "Logged out successfully" };
    }

    try {
      const response = await authApiClient.post("/auth/logout");

      // Limpar dados de autenticação do AsyncStorage
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

      return response.data;
    } catch (error) {
      // Mesmo se o logout falhar no servidor, limpar dados locais
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
      type: "guest",
      user: {
        id: "guest",
        username: "Usuário Convidado",
        email: "guest@example.com",
      },
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestData));
  }

  // Método para verificar se existe token válido
  async hasValidToken(): Promise<boolean> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        return !!(authData.token || authData.type === "guest");
      }
    } catch (error) {
      console.error("Error checking token validity:", error);
    }
    return false;
  }

  // Método para obter dados de autenticação do storage
  async getStoredAuthData(): Promise<any> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        return JSON.parse(storedAuth);
      }
    } catch (error) {
      console.error("Error getting stored auth data:", error);
    }
    return null;
  }
}

export const authApi = new AuthApiService();
