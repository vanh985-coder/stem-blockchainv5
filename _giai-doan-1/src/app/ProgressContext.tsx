import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppProgressData,
  loadProgress,
  subscribeProgress,
  updateSettings as saveSettings,
  setName as saveName,
  completeLevel as doCompleteLevel,
  resetProgress as doResetProgress,
  markDidYouKnowSeen as doMarkDidYouKnowSeen,
  getLessonData as doGetLessonData,
  setLessonData as doSetLessonData,
  LevelId,
  Stars,
  UserSettings,
} from '../lib/progress';

export interface ProgressContextValue {
  progress: AppProgressData;
  completeLevel: (
    lesson: number,
    level: LevelId,
    result: { stars?: Stars; mistakes?: number; timeMs?: number }
  ) => { starsEarned: 1 | 2 | 3; xpGained: number; isNewBest: boolean };
  markDidYouKnowSeen: (lesson: number) => void;
  getLessonData: <T = unknown>(key: string) => T | undefined;
  setLessonData: (key: string, data: unknown) => void;
  setName: (name: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<AppProgressData>(loadProgress);

  useEffect(() => {
    const unsubscribe = subscribeProgress((newProg) => {
      setProgress({ ...newProg });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (progress.settings.presentationFont) {
        document.documentElement.classList.add('presentation-mode');
      } else {
        document.documentElement.classList.remove('presentation-mode');
      }

      if (progress.settings.reducedMotion) {
        document.documentElement.classList.add('reduced-motion-mode');
        document.documentElement.setAttribute('data-reduce-motion', 'true');
      } else {
        document.documentElement.classList.remove('reduced-motion-mode');
        document.documentElement.removeAttribute('data-reduce-motion');
      }
    }
  }, [progress.settings.presentationFont, progress.settings.reducedMotion]);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        completeLevel: doCompleteLevel,
        markDidYouKnowSeen: doMarkDidYouKnowSeen,
        getLessonData: doGetLessonData,
        setLessonData: doSetLessonData,
        setName: saveName,
        updateSettings: saveSettings,
        resetProgress: doResetProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress phải được gọi bên trong ProgressProvider');
  }
  return ctx;
}
