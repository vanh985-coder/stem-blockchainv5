import { LessonPage2D } from '@so-chung/core';
import { BAI3_BACKGROUND, bai3Lesson } from '@so-chung/core/content/lessons/bai-3';
import { Easy } from '../bai-3/Easy';
import { Hard } from '../bai-3/Hard';
import { Medium } from '../bai-3/Medium';

/** Màn 7 "Khuôn riêng, mẫu chung": bài học 2D trên nền Làng Khắc Dấu, 3 trạm đóng dấu và soi dấu, hòm thư giả, đoán khóa. */
export default function Man7() {
  return (
    <LessonPage2D
      levelId={7}
      villageId="lang-khac-dau"
      background={BAI3_BACKGROUND}
      content={bai3Lesson}
      stations={{
        de: { render: ({ onComplete }) => <Easy onComplete={onComplete} /> },
        tb: { render: ({ onComplete }) => <Medium onComplete={onComplete} /> },
        kho: { render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
