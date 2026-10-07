import type { ReactNode } from 'react';

// Kiểu dữ liệu tối thiểu mà content.ts của 4 bài cần.
// Khi chuyển giao diện (bước sau), các kiểu này sẽ nằm cùng component tương ứng trong packages/core/src/ui.

export type LevelId = 'easy' | 'medium' | 'hard';

export interface StoryCard {
  title: string;
  text: string;
  example?: string;
  svgIcon?: ReactNode;
}

export interface LevelMetadata {
  title: string;
  objective: string;
  tip?: string;
}
