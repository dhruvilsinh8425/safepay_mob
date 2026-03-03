import type { ReactNode } from "react";
import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { subscribeAuthEvents } from "../lib/api";
import { clearAuthStorage, getItem, setItem, STORAGE_KEYS } from "../lib/storage";
import type { LoginRequest, RegisterRequest } from "../types/api";
import { Role, type User } from "../types/domain";
import { login as loginRequest, register as registerRequest } from "../services/auth.service";
import { getMe } from "../services/me.service";

export type AuthStatus = "loading" | "authed" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  bootstrap: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const role = user?.role ?? null;

  const logout = useCallback(async () => {
    if (__DEV__) {
      console.log("[Auth] Logout");
    }
    await clearAuthStorage();
    setUser(null);
    setStatus("guest");
    queryClient.clear();
  }, [queryClient]);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    const [accessToken, refreshToken] = await Promise.all([
      getItem(STORAGE_KEYS.accessToken),
      getItem(STORAGE_KEYS.refreshToken),
    ]);

    if (!accessToken || !refreshToken) {
      setUser(null);
      setStatus("guest");
      return;
    }

    try {
      const me = await getMe();
      setUser(me);
      await setItem(STORAGE_KEYS.userRole, me.role);
      setStatus("authed");
    } catch (error) {
      if (__DEV__) {
        console.warn("[Auth] Bootstrap failed", error);
      }
      await clearAuthStorage();
      setUser(null);
      setStatus("guest");
    }
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await loginRequest(payload);
      await Promise.all([
        setItem(STORAGE_KEYS.accessToken, response.tokens.accessToken),
        setItem(STORAGE_KEYS.refreshToken, response.tokens.refreshToken),
        setItem(STORAGE_KEYS.userRole, response.user.role),
      ]);
      await bootstrap();
    },
    [bootstrap],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await registerRequest(payload);
      await Promise.all([
        setItem(STORAGE_KEYS.accessToken, response.tokens.accessToken),
        setItem(STORAGE_KEYS.refreshToken, response.tokens.refreshToken),
        setItem(STORAGE_KEYS.userRole, response.user.role),
      ]);
      await bootstrap();
    },
    [bootstrap],
  );

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents((event) => {
      if (event === "logout") {
        void logout();
      }
    });
    return unsubscribe;
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      bootstrap,
      login,
      register,
      logout,
    }),
    [bootstrap, login, logout, register, role, status, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

