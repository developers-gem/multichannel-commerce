import { useAuthStore } from "@/store/auth-store";

export function getAuthHeaders(): Record<string, string> {
  const token =
    useAuthStore.getState().token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  return {
    "Content-Type": "application/json",
    ...(token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAuthBearerHeader(): Record<string, string> {
  const token =
    useAuthStore.getState().token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  return token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {};
}

export function handleUnauthorized(): void {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
}
