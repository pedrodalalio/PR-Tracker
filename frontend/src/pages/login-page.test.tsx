import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/auth-api", () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(
      Object.assign(new Error("unauthorized"), {
        name: "ApiError",
        status: 401,
      }),
    ),
    refresh: vi.fn().mockRejectedValue(new Error("nope")),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authApi } from "@/services/auth-api";
import { AuthProvider } from "@/contexts/auth-context";
import { LoginPage } from "@/pages/login-page";

function HomeStub() {
  return <div data-testid="home">home</div>;
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomeStub />} />
          </Routes>
        </AuthProvider>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(authApi.login).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoginPage", () => {
  it("valida campos vazios e não chama login", async () => {
    setup();
    const user = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByLabelText(/usuário ou e-mail/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    expect(
      await screen.findByText(/informe seu usuário ou e-mail/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/informe sua senha/i)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("envia credenciais e navega para a home no sucesso", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      id: "u1",
      username: "pedro",
      email: "p@x.com",
    });
    setup();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/usuário ou e-mail/i), "pedro");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    await user.type(passwordInput, "secret123");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        usernameOrEmail: "pedro",
        password: "secret123",
      });
    });
    expect(await screen.findByTestId("home")).toBeInTheDocument();
  });
});
