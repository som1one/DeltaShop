"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Текущий покупатель. Первое значение приходит с сервера из корневого layout,
 * поэтому шапка сразу знает, войдён человек или нет, — без мигания «Войти».
 * Дальше состояние двигают формы входа, выхода и профиля.
 *
 * Клиентскому значению никто не доверяет: каждый API-маршрут проверяет куку
 * сам.
 */

export type AccountUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  address: string;
};

type AuthValue = {
  user: AccountUser | null;
  setUser: (user: AccountUser | null) => void;
  /** Перечитать с сервера — после действий, меняющих профиль на его стороне */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AccountUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AccountUser | null>(initialUser);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { user: AccountUser | null };
      setUser(data.user);
    } catch {
      /* сеть моргнула — оставляем то, что есть */
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, setUser, refresh, logout }),
    [user, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
