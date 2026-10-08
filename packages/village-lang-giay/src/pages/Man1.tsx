import { useRef } from 'react';
import { LessonPage2D } from '@so-chung/core';
import { BAI1_BACKGROUND, bai1Lesson } from '@so-chung/core/content/lessons/bai-1';
import type { Lesson1Data } from '@so-chung/core/lessons/bai-1/logic';
import { Easy } from '../bai-1/Easy';
import { Hard } from '../bai-1/Hard';
import { Medium } from '../bai-1/Medium';

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
          render: ({ onComplete }) => (
            <Easy
              onComplete={onComplete}
              onChainBuilt={(d) => {
                chain.current = d;
              }}
            />
          ),
        },
        tb: { render: ({ onComplete }) => <Medium onComplete={onComplete} saved={chain.current} /> },
        kho: { render: ({ onComplete }) => <Hard onComplete={onComplete} /> },
      }}
    />
  );
}
