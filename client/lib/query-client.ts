import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";

/**
 * Gets the base URL for the Express API server
 * On web: uses localhost:5000
 * On mobile: uses EXPO_PUBLIC_API_URL or extracts IP from EXPO_PUBLIC_DOMAIN
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const isDev = typeof __DEV__ !== "undefined" && __DEV__;

  // Detect Android emulator (model contains "sdk" or "emulator")
  const isAndroidEmulator =
    isDev &&
    Platform.OS === "android" &&
    typeof Platform.constants === "object" &&
    /sdk|emulator/i.test(
      (Platform.constants as any).Model ||
        (Platform.constants as any).Fingerprint ||
        "",
    );

  // Check for explicit API URL first (works for both dev and prod)
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) {
    const normalized =
      explicit.startsWith("http://") || explicit.startsWith("https://")
        ? explicit
        : `http://${explicit}`;

    // On web in dev, convert LAN IP to localhost
    if (
      isDev &&
      Platform.OS === "web" &&
      /192\.168\.\d+\.\d+/.test(normalized)
    ) {
      return normalized.replace(/192\.168\.\d+\.\d+/, "localhost");
    }

    // Android emulator: swap LAN IP for 10.0.2.2 (host alias)
    if (isAndroidEmulator && /192\.168\.\d+\.\d+/.test(normalized)) {
      const url = normalized.replace(/192\.168\.\d+\.\d+/, "10.0.2.2");
      return new URL(url).href.replace(/\/$/, "");
    }

    return new URL(normalized).href.replace(/\/$/, "");
  }

  // In development without explicit URL
  if (isDev) {
    if (Platform.OS === "web") {
      return "http://localhost:5000";
    } else {
      // Android emulator: use 10.0.2.2 (host alias)
      if (isAndroidEmulator) {
        return "http://10.0.2.2:5000";
      }
      // Mobile: try to get IP from EXPO_PUBLIC_DOMAIN
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (domain) {
        const hostname = domain.replace(/^https?:\/\//, "").split(":")[0];
        const url = `http://${hostname}:5000`;
        console.log("[getApiUrl] Mobile using:", url, "from domain:", domain);
        return url;
      }
      console.warn("[getApiUrl] EXPO_PUBLIC_DOMAIN not set, using localhost");
      return "http://localhost:5000";
    }
  }

  // Production: use EXPO_PUBLIC_DOMAIN
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  if (host.startsWith("http://") || host.startsWith("https://")) {
    return new URL(host).href.replace(/\/$/, "");
  }

  return new URL(`https://${host}`).href.replace(/\/$/, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
