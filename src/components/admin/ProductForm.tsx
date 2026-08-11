"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";
import type { Product } from "@/lib/products";

/** Пустая заготовка нового товара. */
function blank(): Draft {
  return {
    id: "",
    house: "visual",
    nameRu: "",
    nameEn: "",
    taglineRu: "",
    taglineEn: "",
    descriptionRu: "",
    descriptionEn: "",
    compositionRu: "",
    compositionEn: "",
    priceRub: "",
    priceUsd: "",
    image: "",
    sizes: "",
    video: "",
    featured: false,
    imageStyle: "cutout",
  };
}

type Draft = {
  id: string;
  house: "visual" | "forma";
  nameRu: string;
  nameEn: string;
  taglineRu: string;
  taglineEn: string;
  descriptionRu: string;
  descriptionEn: string;
  compositionRu: string;
  compositionEn: string;
  priceRub: string;
  priceUsd: string;
  image: string;
  sizes: string;
  video: string;
  featured: boolean;
  imageStyle: "cutout" | "cover";
};

export function draftFrom(product: Product): Draft {
  return {
    id: product.id,
    house: product.house,
    nameRu: product.name.ru,
    nameEn: product.name.en,
    taglineRu: product.tagline.ru,
    taglineEn: product.tagline.en,
    descriptionRu: product.description.ru,
    descriptionEn: product.description.en,
    compositionRu: product.composition.ru,
    compositionEn: product.composition.en,
    priceRub: String(product.priceRub),
    priceUsd: String(product.priceUsd),
    image: product.image,
    sizes: product.sizes ? product.sizes.join(", ") : "",
    video: product.video ?? "",
    featured: product.featured,
    imageStyle: product.imageStyle,
  };
}

const LABEL = "label label-muted block";
const FIELD = "field mt-2 w-full";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/**
 * Форма товара. Одна и та же для создания и правки — отличается только
 * тем, что у существующего товара идентификатор не меняется: он стоит
 * в адресе карточки и в уже оформленных заказах.
 */
export default function ProductForm({
  initial,
  onSaved,
  onCancel,
  adminKey,
}: {
  initial: Product | null;
  onSaved: (products: Product[]) => void;
  onCancel: () => void;
  adminKey: string;
}) {
  const isNew = initial === null;
  const [draft, setDraft] = useState<Draft>(
    initial ? draftFrom(initial) : blank(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slug", draft.id || draft.nameEn || "product");
      const saved = await adminFetch<{ url: string }>(
        adminKey,
        "/api/admin/upload",
        { method: "POST", body: form },
      );
      set("image", saved.url);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...draft,
        priceRub: Number(draft.priceRub),
        priceUsd: Number(draft.priceUsd),
      };
      await adminFetch(adminKey, "/api/admin/products", {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(body),
      });
      const { products } = await adminFetch<{ products: Product[] }>(
        adminKey,
        "/api/admin/products",
      );
      onSaved(products);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border hairline bg-porcelain px-5 py-6 md:px-8 md:py-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="display text-xl">
          {isNew ? "Новый товар" : `Правка · ${draft.nameRu || draft.id}`}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="label link-quiet"
        >
          Закрыть
        </button>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Фото */}
        <div>
          <span className={LABEL}>Фото</span>
          <div className="bg-porcelain hairline relative mt-2 aspect-[4/5] overflow-hidden border">
            {draft.image ? (
              <Image
                src={draft.image}
                alt=""
                fill
                sizes="240px"
                className={
                  draft.imageStyle === "cutout"
                    ? "object-contain p-[8%] mix-blend-multiply"
                    : "object-cover"
                }
              />
            ) : (
              <span className="label label-muted absolute inset-0 grid place-content-center text-center">
                нет фото
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="mt-3 w-full text-xs text-muted file:mr-3 file:border file:border-(--hairline) file:bg-transparent file:px-3 file:py-2 file:text-xs"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          {uploading && (
            <p className="mt-2 text-xs text-muted">Загружаем…</p>
          )}
          <input
            className="field mt-3 w-full text-xs"
            value={draft.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="/uploads/products/…"
            aria-label="Путь к фото"
          />
        </div>

        {/* Поля */}
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Идентификатор"
              hint={
                isNew
                  ? "Латиница, цифры, дефис. Станет адресом карточки"
                  : "Менять нельзя: стоит в адресе и в оформленных заказах"
              }
            >
              <input
                className={FIELD}
                value={draft.id}
                onChange={(e) => set("id", e.target.value)}
                disabled={!isNew}
                required
              />
            </Field>
            <Field label="Дом">
              <select
                className={FIELD}
                value={draft.house}
                onChange={(e) =>
                  set("house", e.target.value === "forma" ? "forma" : "visual")
                }
              >
                <option value="visual">VISUAL — одежда</option>
                <option value="forma">FORMA — уход</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Название · RU">
              <input
                className={FIELD}
                value={draft.nameRu}
                onChange={(e) => set("nameRu", e.target.value)}
                required
              />
            </Field>
            <Field label="Название · EN">
              <input
                className={FIELD}
                value={draft.nameEn}
                onChange={(e) => set("nameEn", e.target.value)}
                required
              />
            </Field>
            <Field label="Подпись · RU">
              <input
                className={FIELD}
                value={draft.taglineRu}
                onChange={(e) => set("taglineRu", e.target.value)}
                required
              />
            </Field>
            <Field label="Подпись · EN">
              <input
                className={FIELD}
                value={draft.taglineEn}
                onChange={(e) => set("taglineEn", e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Описание · RU">
              <textarea
                className={`${FIELD} min-h-28`}
                value={draft.descriptionRu}
                onChange={(e) => set("descriptionRu", e.target.value)}
                required
              />
            </Field>
            <Field label="Описание · EN">
              <textarea
                className={`${FIELD} min-h-28`}
                value={draft.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
                required
              />
            </Field>
            <Field label="Состав и уход · RU">
              <textarea
                className={`${FIELD} min-h-20`}
                value={draft.compositionRu}
                onChange={(e) => set("compositionRu", e.target.value)}
                required
              />
            </Field>
            <Field label="Состав и уход · EN">
              <textarea
                className={`${FIELD} min-h-20`}
                value={draft.compositionEn}
                onChange={(e) => set("compositionEn", e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Цена, ₽">
              <input
                className={FIELD}
                inputMode="numeric"
                value={draft.priceRub}
                onChange={(e) => set("priceRub", e.target.value)}
                required
              />
            </Field>
            <Field label="Цена, $">
              <input
                className={FIELD}
                inputMode="numeric"
                value={draft.priceUsd}
                onChange={(e) => set("priceUsd", e.target.value)}
                required
              />
            </Field>
            <Field label="Размеры" hint="Через запятую; пусто — один размер">
              <input
                className={FIELD}
                value={draft.sizes}
                onChange={(e) => set("sizes", e.target.value)}
                placeholder="XS, S, M, L"
              />
            </Field>
            <Field label="Видео" hint="Путь к файлу, если он есть">
              <input
                className={FIELD}
                value={draft.video}
                onChange={(e) => set("video", e.target.value)}
                placeholder="/videos/…"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Показывать в витрине на главной
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.imageStyle === "cover"}
                onChange={(e) =>
                  set("imageStyle", e.target.checked ? "cover" : "cutout")
                }
              />
              Фото во всю плитку
              <span className="text-xs text-muted">
                (для кадров с фоном; снимок на белом оставьте выключенным)
              </span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Сохраняем…" : isNew ? "Создать товар" : "Сохранить"}
        </button>
        <button
          type="button"
          className="btn btn-onlight-outline"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
