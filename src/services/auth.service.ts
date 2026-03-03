// src/services/auth.service.ts
import { api } from "../lib/api";
import { getItem, setItem, STORAGE_KEYS } from "../lib/storage";
import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/api";
import { Role, type User } from "../types/domain";

const MOCK_AUTH_ENABLED = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true";
const MOCK_ACCESS_TOKEN = "mock-access-token";
const MOCK_REFRESH_TOKEN = "mock-refresh-token";

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

type TokenPair = { accessToken: string; refreshToken: string };

// Accepts: {accessToken,refreshToken} OR {tokens:{...}} OR {data:{...}} OR stringified JSON
function normalizeTokens(raw: any): TokenPair {
  const unwrapped = unwrapData<any>(raw);

  if (!unwrapped) throw new Error("Empty response from server");

  if (typeof unwrapped === "string") {
    try {
      return normalizeTokens(JSON.parse(unwrapped));
    } catch {
      throw new Error("Invalid JSON response from server");
    }
  }

  // backend might return direct tokens
  if (unwrapped.accessToken && unwrapped.refreshToken) {
    return { accessToken: unwrapped.accessToken, refreshToken: unwrapped.refreshToken };
  }

  // frontend mock shape might return tokens object
  if (unwrapped.tokens?.accessToken && unwrapped.tokens?.refreshToken) {
    return { accessToken: unwrapped.tokens.accessToken, refreshToken: unwrapped.tokens.refreshToken };
  }

  throw new Error("Login response missing tokens");
}

function createMockUser({
  email,
  role,
  name,
}: {
  email: string;
  role: Role;
  name: string;
}): User {
  return {
    id: `mock-${email.toLowerCase()}`,
    name,
    email: email.toLowerCase(),
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  if (MOCK_AUTH_ENABLED) {
    const mockUser = createMockUser({
      email: payload.email.trim(),
      role: payload.role,
      name: payload.name.trim(),
    });
    await setItem(STORAGE_KEYS.mockUser, JSON.stringify(mockUser));
    return {
      user: mockUser,
      tokens: { accessToken: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
    };
  }

  const response = await api.post("/auth/register", payload);

  // If backend returns only tokens, adapt:
  // (If your backend returns user too, we'll keep it)
  const data = unwrapData<any>(response.data);

  // If backend already returns {user,tokens}, keep it
  if (data?.user && data?.tokens?.accessToken) return data as RegisterResponse;

  // If backend returns tokens only, create minimal response
  const tokens = normalizeTokens(data);
  const user: User = await getMeAfterAuth(tokens.accessToken); // helper below
  return { user, tokens };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (MOCK_AUTH_ENABLED) {
    const existing = await getItem(STORAGE_KEYS.mockUser);
    const normalizedEmail = payload.email.trim().toLowerCase();
    let mockUser: User | null = null;

    if (existing) {
      try {
        const parsed = JSON.parse(existing) as Partial<User>;
        if (typeof parsed?.email === "string" && parsed.email.toLowerCase() === normalizedEmail) {
          mockUser = parsed as User;
        }
      } catch {}
    }

    if (!mockUser) {
      mockUser = createMockUser({
        email: normalizedEmail,
        role: Role.CLIENT,
        name: normalizedEmail.split("@")[0] || "Test User",
      });
      await setItem(STORAGE_KEYS.mockUser, JSON.stringify(mockUser));
    }

    return {
      user: mockUser,
      tokens: { accessToken: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
    };
  }

  const response = await api.post("/auth/login", payload);
  const data = unwrapData<any>(response.data);

  // If backend already returns {user,tokens}, keep it
  if (data?.user && data?.tokens?.accessToken) return data as LoginResponse;

  // Otherwise backend returns tokens only -> adapt and fetch /me
  const tokens = normalizeTokens(data);

  // IMPORTANT: store access token temporarily so /me works if api.ts reads from storage
  // If your api.ts interceptor reads access token from storage, write it before calling /me.
  // You can remove this if your /me is called elsewhere after storing tokens.
  // await setItem(STORAGE_KEYS.accessToken, tokens.accessToken); // use your real key if exists

  const user: User = await getMeAfterAuth(tokens.accessToken);
  return { user, tokens };
}

export async function refresh(payload: RefreshRequest): Promise<RefreshResponse> {
  const response = await api.post("/auth/refresh", payload);
  const data = unwrapData<any>(response.data);

  // If backend returns direct refresh payload, keep it
  if (data?.accessToken) return data as RefreshResponse;

  // If backend returns nested tokens, flatten to RefreshResponse shape
  if (data?.tokens?.accessToken) {
    return {
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  }

  // Generic fallback: normalize and map to RefreshResponse
  const tokens = normalizeTokens(data);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

function normalizeMeUser(raw: any): User {
  return {
    id: String(raw?.id ?? ""),
    email: String(raw?.email ?? ""),
    role: raw?.role as Role,
    name: String(raw?.name ?? raw?.fullName ?? ""),
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

// Helper: fetch authenticated profile
async function getMeAfterAuth(accessToken?: string): Promise<User> {
  const res = await api.get("/auth/me", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  const data = unwrapData<any>(res.data);
  return normalizeMeUser(data);
}
