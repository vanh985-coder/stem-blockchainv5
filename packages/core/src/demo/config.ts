/**
 * Chế độ demo (quay video giới thiệu): chỉ bật khi bản build/dev có VITE_DEMO=true VÀ địa chỉ có ?demo=1.
 * `DEMO_ACTIVE` chốt một lần lúc nạp trang (chuyển trang bằng router làm mất ?demo=1 nhưng demo vẫn chạy tiếp).
 */
export const DEMO_BUILD: boolean = import.meta.env.VITE_DEMO === 'true';

function readQuery(): URLSearchParams | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

export const DEMO_ACTIVE: boolean = DEMO_BUILD && readQuery()?.get('demo') === '1';

export const SPEEDS = [0.75, 1, 1.5] as const;

/** Nhịp demo từ ?tocdo=0.75|1|1.5; giá trị khác thì 1. */
export function parseSpeed(raw: string | null | undefined): number {
  const v = Number(raw);
  return (SPEEDS as readonly number[]).includes(v) ? v : 1;
}

/** `?canh=<id cảnh>`: bắt đầu từ cảnh đó (để quay lại một đoạn, hoặc kiểm một cảnh riêng); không xóa tiến độ. */
export const DEMO_START: string | null = DEMO_ACTIVE ? (readQuery()?.get('canh') ?? null) : null;

export const DEMO_SPEED: number = parseSpeed(readQuery()?.get('tocdo'));

/** Đưa vài đối tượng ra `window` cho demo và script kiểm (chỉ khi build demo). */
export function exposeForDemo(obj: Record<string, unknown>): void {
  if (DEMO_BUILD && typeof window !== 'undefined') Object.assign(window, obj);
}
