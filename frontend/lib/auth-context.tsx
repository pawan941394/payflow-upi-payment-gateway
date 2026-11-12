"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, clearToken, getToken, setToken } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  business_name: string;
  display_name: string;
  is_staff: boolean;
  is_merchant_active: boolean;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  register(d: {
    username: string;
    email: string;
    password: string;
    business_name: string;
  }): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

function pickUser(res: any): User | null {
  if (res && typeof res === "object") {
    if (res.user && typeof res.user === "object") return res.user as User;
    if (typeof res.username === "string") return res as User;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<User>("/auth/me");
        if (!cancelled) setUser(pickUser(me));
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthResponse = useCallback(async (res: any) => {
    const token: string | undefined = res?.token || res?.access_token;
    if (token) setToken(token);
    let u = pickUser(res);
    if (!u) {
      u = pickUser(await api<User>("/auth/me"));
    }
    setUser(u);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api("/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });
      await applyAuthResponse(res);
    },
    [applyAuthResponse]
  );

  const register = useCallback(
    async (d: {
      username: string;
      email: string;
      password: string;
      business_name: string;
    }) => {
      const res = await api("/auth/register", {
        method: "POST",
        body: d,
        auth: false,
      });
      await applyAuthResponse(res);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
