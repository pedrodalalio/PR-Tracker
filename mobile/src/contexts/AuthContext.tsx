import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, AuthResponse } from "../services/authApi";

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
      const [storedAuth, storedToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
      ]);

      if (storedAuth && storedToken) {
        const authData = JSON.parse(storedAuth);

        // Se for um usuário real (não guest), validar o token
        if (authData.type === "admin" && authData.id) {
          try {
            const response = await authApi.getCurrentUser(storedToken);
            setUser({
              ...authData,
              token: storedToken,
              ...response.user,
            });
          } catch (error) {
            console.error("Token validation failed:", error);
            // Token inválido, limpar dados
            await AsyncStorage.multiRemove([
              AUTH_STORAGE_KEY,
              TOKEN_STORAGE_KEY,
            ]);
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

          await AsyncStorage.multiSet([
            [AUTH_STORAGE_KEY, JSON.stringify(userData)],
            [TOKEN_STORAGE_KEY, response.token],
          ]);

          setUser(userData);
          return true;
        } catch (error) {
          console.error("Login failed:", error);
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

        await AsyncStorage.multiSet([
          [AUTH_STORAGE_KEY, JSON.stringify(newUser)],
          [TOKEN_STORAGE_KEY, response.token],
        ]);

        setUser(newUser);
        return true;
      } catch (error) {
        console.error("Registration failed:", error);
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
          await authApi.logout(user.token);
        } catch (error) {
          console.warn("AuthContext: Failed to logout from API:", error);
        }
      }

      // Reset demo data if user was in guest mode
      if (user?.type === "guest") {
        try {
          const { MockDataService } = await import(
            "../services/mockDataService"
          );
          const mockService = MockDataService.getInstance();
          await mockService.resetToDefaults();
        } catch (error) {}
      }

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
