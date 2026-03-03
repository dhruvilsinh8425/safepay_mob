import { api } from "../lib/api";
import { getItem, STORAGE_KEYS } from "../lib/storage";
import type { MeResponse } from "../types/api";
import { Role, type User } from "../types/domain";

const MOCK_AUTH_ENABLED = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true";

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

export async function getMe(): Promise<MeResponse> {
  if (MOCK_AUTH_ENABLED) {
    const cached = await getItem(STORAGE_KEYS.mockUser);
    if (cached) {
      try {
        return JSON.parse(cached) as User;
      } catch {
        // fall through to fallback user
      }
    }

    return {
      id: "mock-user",
      name: "Test User",
      email: "test@example.com",
      role: Role.CLIENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await api.get<MeResponse | { data: MeResponse }>("/auth/me");
  const data = unwrapData<any>(response.data);
  return {
    id: String(data?.id ?? ""),
    email: String(data?.email ?? ""),
    role: data?.role as Role,
    name: String(data?.name ?? data?.fullName ?? ""),
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
}
