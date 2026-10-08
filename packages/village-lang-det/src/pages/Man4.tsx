import { LessonPage2D } from '@so-chung/core';
import { BAI2_BACKGROUND, bai2Lesson } from '@so-chung/core/content/lessons/bai-2';
import { Easy } from '../bai-2/Easy';
import { Hard } from '../bai-2/Hard';
import { Medium } from '../bai-2/Medium';

/** Màn 4 "Cả làng cùng giữ sổ": bài học 2D trên nền Làng Dệt, 3 trạm Duyệt trang, So sổ, Đặt cọc. */
export default function Man4() {
  return (
    <LessonPage2D
      levelId={4}
      villageId="lang-det"
      background={BAI2_BACKGROUND}
      content={bai2Lesson}
      stations={{
        de: { render: ({ onComplete, onFail }) => <Easy onComplete={onComplete} onFail={onFail} /> },
        tb: { render: ({ onComplete, onFail }) => <Medium onComplete={onComplete} onFail={onFail} /> },
        kho: { render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
