'use client';

/**
 * Wakes the API as soon as a portal page opens.
 *
 * A free-tier backend is stopped after ~15 minutes without traffic, and the
 * next request pays the container's cold start — roughly 50 seconds. Without
 * this, that 50 seconds lands on whoever clicks "Upload Document", in front of
 * whoever is watching, and looks exactly like a hang. Pinging /health on mount
 * moves the wake to page load, so the container is warm by the time a document
 * is actually submitted.
 *
 * Renders nothing. Failures are swallowed on purpose: this is a warm-up, not a
 * health check. A backend that is genuinely down should announce itself at the
 * point of real use, with a real error, not as a toast on an unrelated screen.
 */

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function BackendWarmup() {
  useEffect(() => {
    const controller = new AbortController();
    // A cold instance can take ~50s to answer the first request; allow 60.
    const timer = window.setTimeout(() => controller.abort(), 60_000);

    fetch(`${API}/health`, { signal: controller.signal, cache: 'no-store' })
      .catch(() => { /* warm-up only — see note above */ })
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return null;
}

export default BackendWarmup;
