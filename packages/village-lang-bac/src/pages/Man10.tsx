import { lazy } from 'react';
import { LessonPage2D } from '@so-chung/core';
import { BAI4_BACKGROUND, bai4Lesson } from '@so-chung/core/content/lessons/bai-4';

// Mỗi trạm tải sau (chỉ khi em tới trạm, hoặc lúc rảnh trước đó) để trang bài học mở nhanh và nhẹ.
const loadEasy = () => import('../bai-4/Easy');
const loadMedium = () => import('../bai-4/Medium');
const loadHard = () => import('../bai-4/Hard');
const Easy = lazy(() => loadEasy().then((m) => ({ default: m.Easy })));
const Medium = lazy(() => loadMedium().then((m) => ({ default: m.Medium })));
const Hard = lazy(() => loadHard().then((m) => ({ default: m.Hard })));

/** Màn 10 "Cây gộp sổ": bài học 2D trên nền Làng Bạc, 3 trạm ghép cặp, dựng cây 4 giao dịch, ghép lại cây 8 giao dịch. */
export default function Man10() {
  return (
    <LessonPage2D
      levelId={10}
      villageId="lang-bac"
      background={BAI4_BACKGROUND}
      content={bai4Lesson}
      stations={{
        de: { preload: loadEasy, render: ({ onComplete }) => <Easy onComplete={onComplete} /> },
        tb: { preload: loadMedium, render: ({ onComplete, onTwist }) => <Medium onComplete={onComplete} onTwist={onTwist} /> },
        kho: { preload: loadHard, render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
