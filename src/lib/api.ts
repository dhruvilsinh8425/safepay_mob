import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import type { RefreshResponse } from "../types/api";
import { clearAuthStorage, getItem, setItem, STORAGE_KEYS } from "./storage";

type AuthEvent = "logout";
type AuthListener = (event: AuthEvent) => void;

const authListeners = new Set<AuthListener>();

export function subscribeAuthEvents(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function emitAuthEvent(event: AuthEvent): void {
  authListeners.forEach((listener) => listener(event));
}

function getApiBaseUrl(): string {
  const apiRoot = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiRoot) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL. Example: EXPO_PUBLIC_API_URL=http://192.168.1.10:3333",
    );
  }
  return `${apiRoot}/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();
console.log("API baseURL:", API_BASE_URL);
const API_KEY = (process.env.EXPO_PUBLIC_API_KEY ?? "").trim();

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type UnknownRecord = Record<string, unknown>;

const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

let refreshPromise: Promise<string | null> | null = null;

function toRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") {
    return value as UnknownRecord;
  }
  return {};
}

function normalizeRefreshPayload(payload: unknown): RefreshResponse | null {
  const root = toRecord(payload);
  const data = toRecord(root.data);
  const rootTokens = toRecord(root.tokens);
  const tokens = toRecord(data.tokens);
  const candidate = Object.keys(tokens).length > 0
    ? tokens
    : Object.keys(rootTokens).length > 0
      ? rootTokens
      : Object.keys(data).length > 0
        ? data
        : root;

  const accessToken = typeof candidate.accessToken === "string" ? candidate.accessToken.trim() : "";
  const refreshToken = typeof candidate.refreshToken === "string"
    ? candidate.refreshToken.trim()
    : undefined;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) {
      await clearAuthStorage();
      emitAuthEvent("logout");
      return null;
    }

    try {
      const response = await refreshClient.post<unknown>("/auth/refresh", {
        refreshToken,
      });
      const normalized = normalizeRefreshPayload(response.data);
      if (!normalized?.accessToken) {
        throw new Error("Invalid refresh response payload");
      }

      const newAccessToken = normalized.accessToken;
      const newRefreshToken = normalized.refreshToken ?? refreshToken;

      await Promise.all([
        setItem(STORAGE_KEYS.accessToken, newAccessToken),
        setItem(STORAGE_KEYS.refreshToken, newRefreshToken),
      ]);
      return newAccessToken;
    } catch (error) {
      if (__DEV__) {
        console.warn("Token refresh failed", error);
      }
      await clearAuthStorage();
      emitAuthEvent("logout");
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

refreshClient.interceptors.request.use(
  (config) => {
    const method = (config.method ?? "GET").toUpperCase();
    const requestUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
    console.log(`[API] ${method} ${requestUrl}`);
    if (API_KEY) {
      config.headers["x-api-key"] = API_KEY;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.request.use(
  async (config) => {
    const method = (config.method ?? "GET").toUpperCase();
    const requestUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
    console.log(`[API] ${method} ${requestUrl}`);
    if (
      __DEV__ &&
      method === "POST" &&
      typeof config.url === "string" &&
      /\/milestones\/[^/]+\/(submit|accept|dispute)$/.test(config.url)
    ) {
      console.log("[API milestone payload]", {
        method,
        url: config.url,
        data: config.data,
      });
    }
    if (API_KEY) {
      config.headers["x-api-key"] = API_KEY;
    }
    const accessToken = await getItem(STORAGE_KEYS.accessToken);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    if (
      __DEV__ &&
      typeof response.config.url === "string" &&
      /\/milestones\/[^/]+\/(submit|accept|dispute)$/.test(response.config.url)
    ) {
      const method = (response.config.method ?? "GET").toUpperCase();
      console.log("[API milestone response]", {
        method,
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const responseStatus = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isRefreshCall = requestUrl.includes("/auth/refresh");

    if (__DEV__) {
      const method = (originalRequest?.method ?? "GET").toUpperCase();
      console.log("[API error response]", {
        method,
        url: originalRequest?.url,
        status: responseStatus,
        data: error.response?.data,
      });
    }

    if (
      responseStatus !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshCall
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const freshToken = await refreshAccessToken();

    if (!freshToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${freshToken}`;
    return api(originalRequest);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      const responseData =
        typeof error.response.data === "string"
          ? error.response.data
          : JSON.stringify(error.response.data);
      if (/invalid api key provided/i.test(responseData)) {
        return "Payment backend is misconfigured (invalid Stripe API key on server). Ask backend to update Stripe secret key.";
      }
      return `Request failed (${status}): ${responseData}`;
    }
    return "Cannot reach server. Use PC IP, same WiFi, allow firewall on port 3333.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}
