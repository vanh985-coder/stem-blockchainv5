import { HUB_MAP_URL } from '../config/urls';

/** Trang tạm cho màn bài học, thay bằng bài học thật khi chuyển từng bài. */
export function LessonPlaceholder({ lesson }: { lesson: number }) {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bài học {lesson} — đang chuyển</h1>
        <a
          href={HUB_MAP_URL}
          className="inline-block rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white"
        >
          Về bản đồ
        </a>
      </div>
    </main>
  );
}
