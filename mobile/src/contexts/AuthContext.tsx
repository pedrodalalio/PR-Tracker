import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, AuthResponse } from "../services/authApi";
import { ToastService } from "../services/toastService";
import { MockDataService } from "../services/mockDataService";
import { secureStorage } from "../services/secureStorage";

export type UserType = "admin" | "guest";

interface User {
  type: UserType;
  id?: string;
  username?: string;
  email?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    type: UserType,
    credentials?: { username: string; password: string },
  ) => Promise<boolean>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@pr_tracker_auth";
const TOKEN_STORAGE_KEY = "@pr_tracker_token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const authData = await secureStorage.getAuthData();

      if (authData) {
        // Se for um usuário real (não guest), validar o token
        if (authData.type === "admin" && authData.id) {
          try {
            const accessToken = await secureStorage.getAccessToken();
            if (accessToken) {
              try {
                const response = await authApi.getCurrentUser();
                setUser({
                  type: "admin",
                  id: response.user.id,
                  username: response.user.username,
                  email: response.user.email,
                  token: accessToken,
                });
              } catch (error) {
                console.error("User validation failed:", error);
                // Tentar renovar o token automaticamente
                try {
                  await authApi.refreshTokens();
                  const newAccessToken = await secureStorage.getAccessToken();
                  const response = await authApi.getCurrentUser();
                  setUser({
                    type: "admin",
                    id: response.user.id,
                    username: response.user.username,
                    email: response.user.email,
                    token: newAccessToken,
                  });
                } catch (refreshError) {
                  console.error("Token refresh failed:", refreshError);
                  // Tokens inválidos, limpar dados
                  await secureStorage.clearAll();
                  await AsyncStorage.multiRemove([
                    AUTH_STORAGE_KEY,
                    TOKEN_STORAGE_KEY,
                  ]);
                }
              }
            } else {
              console.log("No access token found, user needs to login");
            }
          } catch (error) {
            console.error("Error loading user tokens:", error);
          }
        } else {
          // Usuário guest
          setUser(authData);
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    type: UserType,
    credentials?: { username: string; password: string },
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      if (type === "admin") {
        if (!credentials) {
          return false;
        }

        try {
          const response = await authApi.login({
            usernameOrEmail: credentials.username,
            password: credentials.password,
          });

          const userData: User = {
            type: "admin",
            id: response.user.id,
            username: response.user.username,
            email: response.user.email,
            token: response.token,
          };

          setUser(userData);
          ToastService.showSuccess(`Bem-vindo, ${response.user.username}!`);
          return true;
        } catch (error) {
          console.error("Login failed:", error);
          ToastService.handleApiError(error, "Falha no login");
          return false;
        }
      } else if (type === "guest") {
        const userData: User = {
          type: "guest",
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<boolean> => {
    try {
      setIsLoading(true);

      try {
        const response = await authApi.register(userData);

        const newUser: User = {
          type: "admin",
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          token: response.token,
        };

        setUser(newUser);
        ToastService.showSuccess(`Conta criada com sucesso! Bem-vindo, ${response.user.username}!`);
        return true;
      } catch (error) {
        console.error("Registration failed:", error);
        ToastService.handleApiError(error, "Falha no cadastro");
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user?.token) {
        try {
          await authApi.logout();
        } catch (error) {
          console.warn("AuthContext: Failed to logout from API:", error);
        }
      }

      // Reset demo data if user was in guest mode
      if (user?.type === "guest") {
        try {
          const mockService = MockDataService.getInstance();
          await mockService.resetToDefaults();
        } catch (error) {}
      }

      await secureStorage.clearAll();
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.type === "admin",
    isGuest: user?.type === "guest",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
