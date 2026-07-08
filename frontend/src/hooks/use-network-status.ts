'use client';

import { useEffect, useState } from 'react';
import { getOfflineQueueCount, subscribeOfflineQueue } from '../lib/offline-sync';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const syncState = () => {
      setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
      setQueueCount(getOfflineQueueCount());
    };

    syncState();
    window.addEventListener('online', syncState);
    window.addEventListener('offline', syncState);
    const unsubscribeQueue = subscribeOfflineQueue(syncState);

    return () => {
      window.removeEventListener('online', syncState);
      window.removeEventListener('offline', syncState);
      unsubscribeQueue();
    };
  }, []);

  return {
    online,
    offline: !online,
    queueCount
  };
}
