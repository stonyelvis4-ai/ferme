'use client';

import { useEffect, useState } from 'react';
import type { SessionResponse } from '../services/auth-client';
import { readSession } from '../lib/session-store';

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  return session;
}
