const API_BASE = "/api";

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("POST", "/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiRequest("POST", "/auth/reset-password", { token, password });
}

export async function acceptInvite(token: string, password: string, name: string): Promise<{ message: string }> {
  return apiRequest("POST", "/auth/accept-invite", { token, password, name });
}

export async function resendInvite(email: string): Promise<{ message: string }> {
  return apiRequest("POST", "/auth/resend-invite", { email });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest("POST", "/auth/change-password", { currentPassword, newPassword });
}

interface Session {
  id: string;
  userId?: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string | null;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  isCurrent?: boolean;
}

export async function getSessions(): Promise<Session[]> {
  return apiRequest("GET", "/auth/sessions");
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  return apiRequest("DELETE", `/auth/sessions/${sessionId}`);
}

export async function revokeAllSessions(): Promise<{ message: string }> {
  return apiRequest("DELETE", "/auth/sessions");
}

export async function inviteUser(email: string, name: string, role: string): Promise<{ id: string }> {
  return apiRequest("POST", "/platform/users/invite", { email, name, role });
}

export async function disableUser(userId: string): Promise<{ message: string }> {
  return apiRequest("PATCH", `/platform/users/${userId}/disable`);
}

export async function enableUser(userId: string): Promise<{ message: string }> {
  return apiRequest("PATCH", `/platform/users/${userId}/enable`);
}

export async function changeUserRole(userId: string, role: string): Promise<{ message: string }> {
  return apiRequest("PATCH", `/platform/users/${userId}/role`, { role });
}

export async function forcePasswordChange(userId: string): Promise<{ message: string }> {
  return apiRequest("PATCH", `/platform/users/${userId}/force-password-change`);
}
