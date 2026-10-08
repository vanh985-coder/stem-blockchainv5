import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SETTINGS_KEY, parseStored, resolveSettings, serializeStored, type Settings, type StoredSettings } from './settings';

interface SettingsContextValue {
  settings: Settings;
  /** Đặt một hoặc nhiều mục; lưu ngay vào localStorage. */
  update: (patch: Partial<Settings>) => void;
}

const DEFAULT_VALUE: SettingsContextValue = {
  settings: { reducedMotion: false, largeText: false },
  update: () => {},
};

const SettingsContext = createContext<SettingsContextValue>(DEFAULT_VALUE);

function readStored(): StoredSettings {
  try {
    return parseStored(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return {};
  }
}

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Áp cài đặt lên <html>: CSS dùng data-reduce-motion và data-large-text. */
function applyToDocument(s: Settings): void {
  const root = document.documentElement;
  root.dataset.reduceMotion = String(s.reducedMotion);
  root.dataset.largeText = String(s.largeText);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredSettings>(readStored);
  const [prefers, setPrefers] = useState(prefersReduced);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setPrefers(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const settings = useMemo(() => resolveSettings(stored, prefers), [stored, prefers]);

  useEffect(() => {
    applyToDocument(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, serializeStored(next));
      } catch {
        // Không lưu được (chế độ riêng tư, hết chỗ): vẫn dùng được trong phiên này.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
