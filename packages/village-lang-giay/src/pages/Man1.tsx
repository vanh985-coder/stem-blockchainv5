import { lazy, useRef } from 'react';
import { LessonPage2D } from '@so-chung/core';
import { BAI1_BACKGROUND, bai1Lesson } from '@so-chung/core/content/lessons/bai-1';
import type { Lesson1Data } from '@so-chung/core/lessons/bai-1/logic';

// Mỗi trạm tải sau (chỉ khi em tới trạm, hoặc lúc rảnh trước đó) để trang bài học mở nhanh và nhẹ.
const loadEasy = () => import('../bai-1/Easy');
const loadMedium = () => import('../bai-1/Medium');
const loadHard = () => import('../bai-1/Hard');
const Easy = lazy(() => loadEasy().then((m) => ({ default: m.Easy })));
const Medium = lazy(() => loadMedium().then((m) => ({ default: m.Medium })));
const Hard = lazy(() => loadHard().then((m) => ({ default: m.Hard })));

/** Màn 1 "Trang nối trang": bài học 2D trên nền Làng Giấy, 3 trạm Dễ, Trung bình, Khó. */
export default function Man1() {
  // Chuỗi em xây ở trạm Dễ, trạm Trung bình dùng lại (giữ trong lần học này).
  const chain = useRef<Lesson1Data | null>(null);

  return (
    <LessonPage2D
      levelId={1}
      villageId="lang-giay"
      background={BAI1_BACKGROUND}
      content={bai1Lesson}
      stations={{
        de: {
          preload: loadEasy,
          render: ({ onComplete }) => (
            <Easy
              onComplete={onComplete}
              onChainBuilt={(d) => {
                chain.current = d;
              }}
            />
          ),
        },
        tb: { preload: loadMedium, render: ({ onComplete }) => <Medium onComplete={onComplete} saved={chain.current} /> },
        kho: { preload: loadHard, render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
