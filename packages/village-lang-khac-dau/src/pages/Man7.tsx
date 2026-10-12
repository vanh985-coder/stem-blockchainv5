import { lazy } from 'react';
import { LessonPage2D } from '@so-chung/core';
import { BAI3_BACKGROUND, bai3Lesson } from '@so-chung/core/content/lessons/bai-3';

// Mỗi trạm tải sau (chỉ khi em tới trạm, hoặc lúc rảnh trước đó) để trang bài học mở nhanh và nhẹ.
const loadEasy = () => import('../bai-3/Easy');
const loadMedium = () => import('../bai-3/Medium');
const loadHard = () => import('../bai-3/Hard');
const Easy = lazy(() => loadEasy().then((m) => ({ default: m.Easy })));
const Medium = lazy(() => loadMedium().then((m) => ({ default: m.Medium })));
const Hard = lazy(() => loadHard().then((m) => ({ default: m.Hard })));

/** Màn 7 "Khuôn riêng, mẫu chung": bài học 2D trên nền Làng Khắc Dấu, 3 trạm đóng dấu và soi dấu, hòm thư giả, đoán khóa. */
export default function Man7() {
  return (
    <LessonPage2D
      levelId={7}
      villageId="lang-khac-dau"
      background={BAI3_BACKGROUND}
      content={bai3Lesson}
      stations={{
        de: { preload: loadEasy, render: ({ onComplete }) => <Easy onComplete={onComplete} /> },
        tb: { preload: loadMedium, render: ({ onComplete }) => <Medium onComplete={onComplete} /> },
        kho: { preload: loadHard, render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
