import { lazy } from 'react';
import { LessonPage2D } from '@so-chung/core';
import { BAI2_BACKGROUND, bai2Lesson } from '@so-chung/core/content/lessons/bai-2';

// Mỗi trạm tải sau (chỉ khi em tới trạm, hoặc lúc rảnh trước đó) để trang bài học mở nhanh và nhẹ.
const loadEasy = () => import('../bai-2/Easy');
const loadMedium = () => import('../bai-2/Medium');
const loadHard = () => import('../bai-2/Hard');
const Easy = lazy(() => loadEasy().then((m) => ({ default: m.Easy })));
const Medium = lazy(() => loadMedium().then((m) => ({ default: m.Medium })));
const Hard = lazy(() => loadHard().then((m) => ({ default: m.Hard })));

/** Màn 4 "Cả làng cùng giữ sổ": bài học 2D trên nền Làng Dệt, 3 trạm Duyệt trang, So sổ, Đặt cọc. */
export default function Man4() {
  return (
    <LessonPage2D
      levelId={4}
      villageId="lang-det"
      background={BAI2_BACKGROUND}
      content={bai2Lesson}
      stations={{
        de: { preload: loadEasy, render: ({ onComplete, onFail }) => <Easy onComplete={onComplete} onFail={onFail} /> },
        tb: { preload: loadMedium, render: ({ onComplete, onFail }) => <Medium onComplete={onComplete} onFail={onFail} /> },
        kho: { preload: loadHard, render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
