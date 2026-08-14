"use client";

import { useEffect, useState } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";
import { plural } from "@/lib/i18n";

type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  createdAt: string;
};

/**
 * Покупатели и сброс пароля. Писем сайт не шлёт, поэтому забытый пароль
 * задаётся здесь и диктуется в ответном письме.
 */
export default function UsersSection({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<User[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    /* Небольшая пауза, чтобы список не дёргался на каждую букву */
    const timer = window.setTimeout(() => {
      adminFetch<{ users: User[] }>(adminKey, `/api/admin/users${query}`)
        .then((data) => {
          if (!alive) return;
          setItems(data.users);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
        });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [adminKey, search]);

  const resetPassword = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(adminKey, "/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ id, password }),
      });
      setDoneId(id);
      setPassword("");
      setOpenId(null);
      window.setTimeout(() => setDoneId(null), 4000);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label label-muted">
          {items
            ? `${items.length} ${plural("ru", items.length, {
                one: "покупатель",
                few: "покупателя",
                many: "покупателей",
              })}`
            : "Загружаем…"}
        </p>
        <input
          className="field max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Почта или имя"
          aria-label="Поиск покупателя"
        />
      </div>

      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
        Новый пароль задаётся здесь и сообщается покупателю в ответном письме.
        Все его прежние входы после сброса слетают.
      </p>

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="mt-10 text-muted">Покупателей пока нет.</p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 border-t hairline">
          {items.map((user) => (
            <li
              key={user.id}
              className="grid gap-4 border-b hairline py-6 lg:grid-cols-[1fr_260px_260px] lg:gap-8"
            >
              <div className="min-w-0">
                <h3 className="display text-sm tracking-[0.14em]">
                  {user.name}
                </h3>
                <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  {new Date(user.createdAt).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="min-w-0 text-[13px] text-muted">
                {user.phone && <p className="truncate">{user.phone}</p>}
                {(user.city || user.address) && (
                  <p className="mt-1 truncate">
                    {[user.city, user.address].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              <div>
                {openId === user.id ? (
                  <div className="flex flex-col gap-3">
                    <input
                      className="field"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Новый пароль, от 8 знаков"
                      aria-label="Новый пароль"
                    />
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => resetPassword(user.id)}
                        disabled={busyId === user.id || password.length < 8}
                        className="label link-quiet disabled:opacity-40"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(null);
                          setPassword("");
                        }}
                        className="label link-quiet text-muted"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(user.id);
                      setPassword("");
                    }}
                    className="label link-quiet"
                  >
                    {doneId === user.id ? "Пароль сброшен" : "Сбросить пароль"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
