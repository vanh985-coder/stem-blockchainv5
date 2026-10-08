import { LessonPage2D } from '@so-chung/core';
import { BAI4_BACKGROUND, bai4Lesson } from '@so-chung/core/content/lessons/bai-4';
import { Easy } from '../bai-4/Easy';
import { Hard } from '../bai-4/Hard';
import { Medium } from '../bai-4/Medium';

/** Màn 10 "Cây gộp sổ": bài học 2D trên nền Làng Bạc, 3 trạm ghép cặp, dựng cây 4 giao dịch, ghép lại cây 8 giao dịch. */
export default function Man10() {
  return (
    <LessonPage2D
      levelId={10}
      villageId="lang-bac"
      background={BAI4_BACKGROUND}
      content={bai4Lesson}
      stations={{
        de: { render: ({ onComplete }) => <Easy onComplete={onComplete} /> },
        tb: { render: ({ onComplete, onTwist }) => <Medium onComplete={onComplete} onTwist={onTwist} /> },
        kho: { render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
