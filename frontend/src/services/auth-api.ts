import { apiClient } from "@/lib/api-client";
import { userSchema, type User } from "@/lib/types";

interface AuthResponse {
  user: User;
}

export const authApi = {
  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/register", input);
    return userSchema.parse(data.user);
  },

  async login(input: {
    usernameOrEmail: string;
    password: string;
  }): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/login", input);
    return userSchema.parse(data.user);
  },

  async me(): Promise<User> {
    const data = await apiClient.get<AuthResponse>("/auth/me");
    return userSchema.parse(data.user);
  },

  async refresh(): Promise<User> {
    const data = await apiClient.post<AuthResponse>("/auth/refresh");
    return userSchema.parse(data.user);
  },

  async logout(): Promise<void> {
    await apiClient.post<{ message: string }>("/auth/logout");
  },
};
