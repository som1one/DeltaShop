"use client";

import { useId } from "react";

/**
 * The house crescent — the chrome mark from the Crescent longsleeve.
 * A full disc minus an offset disc, open toward the upper right.
 */
export default function LogoMark({
  size = 20,
  className = "",
  muted = false,
}: {
  size?: number;
  className?: string;
  muted?: boolean;
}) {
  const uid = useId();
  const gradId = `chrome-${uid}`;
  const maskId = `cut-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="8" x2="40" y2="44">
          <stop offset="0" stopColor="var(--chrome-hi)" />
          <stop offset="0.52" stopColor="var(--chrome-mid)" />
          <stop offset="1" stopColor="var(--chrome-lo)" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="48" height="48" fill="white" />
          <circle cx="31" cy="17" r="15.5" fill="black" />
        </mask>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="20"
        fill={muted ? "currentColor" : `url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
