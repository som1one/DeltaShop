"use client";

/**
 * Selectable card with native radio semantics — used for the delivery-region
 * and payment-method choices at checkout. The radio itself is visually hidden;
 * the card carries the selected state and the keyboard focus ring.
 */
export default function OptionCard({
  name,
  value,
  checked,
  onSelect,
  title,
  note,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-2 border p-5 transition-colors duration-300 md:p-6 has-[:focus-visible]:[outline:1.5px_solid_var(--oxblood-bright)] has-[:focus-visible]:outline-offset-[3px] ${
        checked ? "border-strong bg-porcelain" : "hairline hover:border-muted"
      }`}
    >
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
      />
      <span className="flex items-start justify-between gap-4">
        <span className="label">{title}</span>
        {/* Classic radio dot — reads as "one of several" at a glance */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
            checked ? "border-oxblood" : "hairline"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              checked ? "bg-oxblood" : "bg-transparent"
            }`}
          />
        </span>
      </span>
      <span className="text-xs leading-relaxed text-muted">{note}</span>
    </label>
  );
}
