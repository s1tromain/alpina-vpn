"use client";

import { useEffect, useState } from "react";

/**
 * Returns `false` during SSR and the first client render, then flips to `true`
 * once `useEffect` fires. Use it to gate any markup that depends on
 * browser-only state (Telegram SDK, dynamic viewport, localStorage, Date.now)
 * so that the first client render matches the server output byte-for-byte.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
