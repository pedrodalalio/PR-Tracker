import { apiClient } from "@/lib/api-client";
import { setAccessToken } from "@/lib/auth-storage";
import { userSchema, type User } from "@/lib/types";

interface AuthResponse {
  user: User;
  token: string;
}

interface MeResponse {
  user: User;
}

export const authApi = {
  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/register", input);
    setAccessToken(data.token);
    return userSchema.parse(data.user);
  },

  async login(input: {
    usernameOrEmail: string;
    password: string;
  }): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/login", input);
    setAccessToken(data.token);
    return userSchema.parse(data.user);
  },

  async me(): Promise<User> {
    const data = await apiClient.get<MeResponse>("/auth/me");
    return userSchema.parse(data.user);
  },

  async refresh(): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/refresh", undefined, {
      skipAuth: true,
    });
    setAccessToken(data.token);
    return userSchema.parse(data.user);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<{ message: string }>("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post<{ message: string }>(
      "/auth/forgot-password",
      { email },
      { skipAuth: true },
    );
  },

  async resetPassword(input: {
    token: string;
    password: string;
  }): Promise<void> {
    await apiClient.post<{ message: string }>(
      "/auth/reset-password",
      input,
      { skipAuth: true },
    );
  },
};
