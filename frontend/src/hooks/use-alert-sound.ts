'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ALERT_SOUND_SRC = '/sounds/ferm-plus-alert.m4a';
const ALERT_SOUND_STORAGE_KEY = 'ferm_plus_alert_sound_enabled';
const ALERT_SOUND_EVENT = 'ferm-plus-alert-sound-change';

export function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncPreference = () => {
      const storedValue = window.localStorage.getItem(ALERT_SOUND_STORAGE_KEY);
      setIsEnabled(storedValue !== 'false');
    };

    syncPreference();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ALERT_SOUND_STORAGE_KEY) {
        syncPreference();
      }
    };

    const handleCustomSync = () => {
      syncPreference();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(ALERT_SOUND_EVENT, handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ALERT_SOUND_EVENT, handleCustomSync);
    };
  }, []);

  const primeAudio = useCallback(() => {
    if (typeof Audio === 'undefined') {
      return null;
    }

    if (!audioRef.current) {
      const audio = new Audio(ALERT_SOUND_SRC);
      audio.preload = 'auto';
      audio.volume = 0.9;
      audioRef.current = audio;
    }

    return audioRef.current;
  }, []);

  const playAlertSound = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    const audio = primeAudio();

    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      return;
    }
  }, [isEnabled, primeAudio]);

  const updateEnabled = useCallback((nextValue: boolean) => {
    setIsEnabled(nextValue);

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ALERT_SOUND_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new Event(ALERT_SOUND_EVENT));
  }, []);

  const toggleEnabled = useCallback(() => {
    updateEnabled(!isEnabled);
  }, [isEnabled, updateEnabled]);

  return {
    isEnabled,
    setIsEnabled: updateEnabled,
    toggleEnabled,
    playAlertSound,
    primeAudio
  };
}
