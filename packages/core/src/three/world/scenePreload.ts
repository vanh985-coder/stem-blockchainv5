import { asset } from '../../assets/store';
import type { VillageId } from '../../village';
import { sceneAssetPaths } from './sceneTurns';

/**
 * Nạp và giải mã trước ảnh của cảnh mở đầu làng (ảnh truyện, chân dung người dẫn) khi người chơi vào vùng chuẩn bị của làng mà cảnh chưa xem. Trước đây ảnh chỉ bắt đầu tải
 * và giải mã khi hộp thoại hiện ra, lúc người chơi vừa qua cổng: một khung hình mất 54 đến 77 ms (spec 03 mục 9, bước L3). `HTMLImageElement.decode()` giải mã ngoài luồng chính; giữ
 * tham chiếu ảnh ở đây để bản giải mã còn trong bộ nhớ đệm cho tới khi cảnh chiếu xong (`releaseSceneImages`).
 */
const kept = new Map<VillageId, HTMLImageElement[]>();
const pending = new Map<VillageId, Promise<void>>();

function decodeImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    const done = () => resolve(img);
    if (typeof img.decode === 'function') img.decode().then(done, () => resolve(null));
    else {
      img.onload = done;
      img.onerror = () => resolve(null);
    }
  });
}

/** Đã nạp và giải mã xong ảnh cảnh mở đầu của làng (chưa gọi hoặc làng không có cảnh thì rỗng). Gọi nhiều lần chỉ nạp một lần. Thiếu ảnh thì bỏ qua, không lỗi. */
export function preloadSceneImages(village: VillageId): Promise<void> {
  const had = pending.get(village);
  if (had) return had;
  const urls = sceneAssetPaths(village)
    .map((p) => asset(p))
    .filter((u): u is string => u !== null);
  const p = Promise.all(urls.map(decodeImage)).then((imgs) => {
    kept.set(
      village,
      imgs.filter((i): i is HTMLImageElement => i !== null),
    );
  });
  pending.set(village, p);
  return p;
}

/** Cảnh chiếu xong (hoặc rời trang): thả ảnh đã giữ. */
export function releaseSceneImages(village?: VillageId): void {
  if (village) {
    kept.delete(village);
    pending.delete(village);
    return;
  }
  kept.clear();
  pending.clear();
}
