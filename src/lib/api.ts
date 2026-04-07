const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    fetchAPI<{ token: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  // Dashboard
  getDashboardStats: (days = 7) =>
    fetchAPI<Record<string, unknown>>(`/api/analytics/dashboard?days=${days}`),

  getHealth: () =>
    fetchAPI<Record<string, unknown>>("/api/analytics/health"),

  getAlerts: () =>
    fetchAPI<Record<string, unknown>>("/api/analytics/alerts"),

  // Conversations
  getConversations: () =>
    fetchAPI<Record<string, unknown>>("/api/admin/conversations"),

  getMessages: (userId: string, limit = 30) =>
    fetchAPI<Record<string, unknown>>(`/api/admin/conversations/${userId}/messages?limit=${limit}`),

  sendMessage: (userId: string, message: string) =>
    fetchAPI<Record<string, unknown>>(`/api/admin/conversations/${userId}/send`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Handoffs
  getHandoffs: (status = "pending") =>
    fetchAPI<Record<string, unknown>>(`/api/admin/handoffs?status=${status}`),

  getHandoffCount: () =>
    fetchAPI<{ count: number }>("/api/admin/handoffs/count"),

  claimHandoff: (id: number) =>
    fetchAPI<Record<string, unknown>>(`/api/admin/handoffs/${id}/claim`, { method: "POST" }),

  resolveHandoff: (id: number) =>
    fetchAPI<Record<string, unknown>>(`/api/admin/handoffs/${id}/resolve`, { method: "POST" }),

  // Cache
  clearCache: () =>
    fetchAPI<Record<string, unknown>>("/cache/clear", { method: "POST" }),
};
