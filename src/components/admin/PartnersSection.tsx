"use client";

import { useEffect, useState } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";

type PartnerStatus = "new" | "approved" | "rejected";

type Application = {
  id: number;
  name: string;
  email: string;
  status: PartnerStatus;
  refCode: string | null;
  note: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<PartnerStatus, string> = {
  new: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};

export default function PartnersSection({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminFetch<{ applications: Application[] }>(adminKey, "/api/admin/partners")
      .then((data) => {
        if (!alive) return;
        setItems(data.applications);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
      });
    return () => {
      alive = false;
    };
  }, [adminKey]);

  const update = async (
    id: number,
    patch: { status?: PartnerStatus; note?: string | null },
  ) => {
    setBusyId(id);
    try {
      const { application } = await adminFetch<{ application: Application }>(
        adminKey,
        "/api/admin/partners",
        { method: "PATCH", body: JSON.stringify({ id, ...patch }) },
      );
      setItems((prev) =>
        prev ? prev.map((a) => (a.id === application.id ? application : a)) : prev,
      );
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    } finally {
      setBusyId(null);
    }
  };

  const linkFor = (code: string) =>
    `${window.location.origin}/?ref=${code}`;

  const copy = async (app: Application) => {
    if (!app.refCode) return;
    try {
      await navigator.clipboard.writeText(linkFor(app.refCode));
      setCopied(app.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Буфер обмена недоступен — скопируйте ссылку вручную");
    }
  };

  const pending = items?.filter((a) => a.status === "new").length ?? 0;

  return (
    <div>
      <p className="label label-muted">
        {items
          ? `${items.length} заявок · ${pending} ждут решения`
          : "Загружаем…"}
      </p>

      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
        Письма пока не уходят — SMTP не подключён. После одобрения скопируйте
        персональную ссылку и отправьте партнёру сами.
      </p>

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="mt-10 text-muted">Заявок пока нет.</p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 border-t hairline">
          {items.map((app) => (
            <li
              key={app.id}
              className="grid gap-4 border-b hairline py-6 lg:grid-cols-[1fr_260px_240px] lg:gap-8"
            >
              <div className="min-w-0">
                <h3 className="display text-sm tracking-[0.14em]">
                  {app.name}
                </h3>
                <p className="mt-1 truncate text-sm text-muted">{app.email}</p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  {new Date(app.createdAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {STATUS_LABEL[app.status]}
                </p>
              </div>

              <div>
                {app.refCode ? (
                  <>
                    <span className="label label-muted block">Ссылка</span>
                    <p className="mt-2 break-all text-xs tabular-nums">
                      /?ref={app.refCode}
                    </p>
                    <button
                      type="button"
                      className="hairline mt-2 border px-3 py-1.5 text-xs"
                      onClick={() => copy(app)}
                    >
                      {copied === app.id ? "Скопировано" : "Скопировать"}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted">
                    Код появится после одобрения
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <button
                  type="button"
                  className="hairline border px-4 py-2 text-xs disabled:opacity-40"
                  disabled={busyId === app.id || app.status === "approved"}
                  onClick={() => update(app.id, { status: "approved" })}
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  className="hairline border px-4 py-2 text-xs text-(--oxblood) disabled:opacity-40"
                  disabled={busyId === app.id || app.status === "rejected"}
                  onClick={() => update(app.id, { status: "rejected" })}
                >
                  Отклонить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
