'use client';

import { useEffect, useState } from 'react';

type Status = 'loading' | 'up' | 'down';

const LABELS: Record<Status, string> = {
  loading: 'Перевіряємо API…',
  up: 'API працює',
  down: 'API недоступний',
};

/** Calls /api/health through the Next.js rewrite to NestJS. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setStatus(res.ok ? 'up' : 'down'))
      .catch(() => setStatus('down'));
  }, []);

  return (
    <p data-testid="api-status" data-status={status} className="text-sm text-gray-500">
      {LABELS[status]}
    </p>
  );
}
