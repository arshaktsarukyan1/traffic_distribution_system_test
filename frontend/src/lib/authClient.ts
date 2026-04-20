import { api, setApiAuthToken } from "@/lib/apiClient";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
  updated_at: string | null;
};

type AuthPayload = {
  user: AuthUser;
  token: string;
  token_type: "Bearer";
  expires_at: string;
};

type AuthResponse = { data: AuthPayload };
type MeResponse = { data: AuthUser };

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const res = await api.post<AuthResponse>("v1/auth/register", input);
  setApiAuthToken(res.data.token);
  return res.data;
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const res = await api.post<AuthResponse>("v1/auth/login", input);
  setApiAuthToken(res.data.token);
  return res.data;
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await api.post("v1/auth/logout");
  } finally {
    setApiAuthToken(null);
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await api.get<MeResponse>("v1/me");
  return res.data;
}
