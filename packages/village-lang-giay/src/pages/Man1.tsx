import { LessonPlaceholder, Portrait } from '@so-chung/core';

export default function Man1() {
  return (
    <LessonPlaceholder lesson={1} levelId={1}>
      {/* Tạm: thử tải ảnh từ cổng đồ họa khác (CORS) */}
      <div className="flex justify-center">
        <Portrait id="bac-an" size={128} />
      </div>
    </LessonPlaceholder>
  );
}
