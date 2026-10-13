'use client';

import { useEffect, useState } from 'react';

export function useNowSeconds(): bigint {
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
