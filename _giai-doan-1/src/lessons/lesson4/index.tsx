import React from 'react';
import { LessonShell, LevelProps } from '../../components/game/LessonShell';
import { Easy } from './Easy';
import { Medium } from './Medium';
import { Hard } from './Hard';
import { storyCards, levelsMeta } from './content';
import { LevelId } from '../../lib/progressLogic';

export const levels: Record<LevelId, React.ComponentType<LevelProps>> = {
  easy: Easy,
  medium: Medium,
  hard: Hard,
};

export default function Lesson4Page() {
  return (
    <LessonShell
      lessonId={4}
      storyCards={storyCards}
      levelsMeta={levelsMeta}
      levels={levels}
    />
  );
}
