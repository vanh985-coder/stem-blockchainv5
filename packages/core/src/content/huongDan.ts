/**
 * "Hướng dẫn chơi" (mốc 2, bước 16): nội dung chia PHẦN, mỗi phần 2 đến 4 TRANG, mỗi trang một hình và 1 đến 2 câu ngắn. Mọi chữ của hướng dẫn nằm ở đây (không có chữ trong ảnh).
 *
 * Hộp chung (nút ? ở HUD và mục trong Menu, bước X1) chỉ hiện các phần KHÔNG đánh dấu `rieng` (hiện là Đi lại, Nói chuyện); phần `rieng` chỉ mở từ nơi gắn riêng của nó (nút "Hướng dẫn chơi" ở thẻ bắt đầu màn 2, màn 3),
 * khi đó hộp chỉ có đúng phần đó. Phần `rieng` vẫn giữ nguyên chỗ trong `GUIDE_SECTIONS` (cờ lưu theo bit).
 *
 * Thêm phần mới ở mốc sau: thêm một đối tượng vào CUỐI `GUIDE_SECTIONS` (id mới, tiêu đề, trang). KHÔNG đổi thứ tự hay xóa phần cũ: cờ "đã mở tự động" lưu theo số bit theo thứ tự này
 * (xem `progress/guideFlags.ts`). Hình là ảnh chụp thật từ game (`shot`: `ui/huong-dan/<id>`, do `pnpm guide:capture` tạo) hoặc hình minh họa SVG do code vẽ (`art`: `ui/GuideArt.tsx`).
 * Mỗi trang có lời cho máy tính (`may`) và cho điện thoại (`dt`, bỏ trống thì dùng chung lời `may`); hình cũng có thể khác theo thiết bị (`hinhDt`).
 */

/** Hình chụp thật từ game: đường dẫn trong assets là `ui/huong-dan/<id>` */
export const GUIDE_SHOT_IDS = [
  'cho-di-lai',
  'cong-dong',
  'cong-mo',
  'bien-go',
  'bai-hoc',
  'man-2-chay',
  'man-2-cau-hoi',
  'man-3-ban',
  'hud-trang-vang',
  'ban-do',
] as const;
export type GuideShotId = (typeof GUIDE_SHOT_IDS)[number];

/** Hình minh họa SVG do code vẽ */
export const GUIDE_ART_IDS = [
  'phim-di-chuyen',
  'chuot-camera',
  'can-dieu-khien',
  'vuot-camera',
  'phim-e',
  'nut-tay',
  'ba-lan-phim',
  'ba-lan-vuot',
  'nhay-truot-phim',
  'nhay-truot-vuot',
  'keo-the',
  'soi-the',
  'ro-trang',
  'sao',
  'bong-den',
  'bon-trang',
] as const;
export type GuideArtId = (typeof GUIDE_ART_IDS)[number];

export type GuideFigure = { shot: GuideShotId } | { art: GuideArtId };
export type GuideDevice = 'may' | 'dt';

export interface GuidePage {
  /** Hình (ảnh chụp hoặc minh họa) dùng cho máy tính, và cho điện thoại nếu không có `hinhDt` */
  hinh: GuideFigure;
  hinhDt?: GuideFigure;
  /** 1 đến 2 câu ngắn cho máy tính (và điện thoại nếu không có `dt`) */
  may: string;
  dt?: string;
}

export interface GuideSection {
  id: string;
  /** Chữ ngắn trên nút chọn phần */
  nhan: string;
  /** Tiêu đề phần (có thể có {phanDien}) */
  tieuDe: string;
  trang: readonly GuidePage[];
  /** Các màn (số màn 1 đến 12) mở thẳng phần này khi bấm "Hướng dẫn chơi" ở thẻ bắt đầu của game */
  man?: readonly number[];
  /** Phần riêng của một nơi (bước X1): không có trong hộp chung ở HUD và Menu, chỉ mở từ nơi gắn riêng (thẻ bắt đầu game) */
  rieng?: true;
}

const shot = (id: GuideShotId): GuideFigure => ({ shot: id });
const art = (id: GuideArtId): GuideFigure => ({ art: id });

export const GUIDE_SECTIONS = [
  {
    id: 'di-lai',
    nhan: 'Đi lại',
    tieuDe: 'Đi lại và camera',
    trang: [
      {
        hinh: art('phim-di-chuyen'),
        hinhDt: art('can-dieu-khien'),
        may: 'Đi bằng phím W A S D hoặc các phím mũi tên. Giữ Shift để chạy, bấm Space để nhảy.',
        dt: 'Chạm và giữ nửa trái màn hình rồi đẩy cần điều khiển để đi. Đẩy thật mạnh thì em chạy. Nút nhảy ở góc phải.',
      },
      {
        hinh: art('chuot-camera'),
        hinhDt: art('vuot-camera'),
        may: 'Bấm vào khung hình để khóa chuột, rồi rê chuột để xoay camera. Bấm Esc để nhả chuột và mở menu.',
        dt: 'Vuốt ngón tay ở nửa phải màn hình để xoay camera.',
      },
      {
        hinh: shot('cho-di-lai'),
        may: 'Đi theo mũi tên vàng dưới chân em để tới nơi cần đến, mũi tên chỉ đường đi dọc theo đường đất. Dòng nhiệm vụ ở góc trên trái nhắc em việc cần làm.',
      },
    ],
  },
  {
    id: 'noi-chuyen',
    nhan: 'Nói chuyện',
    tieuDe: 'Nói chuyện, cổng làng, biển gỗ',
    trang: [
      {
        hinh: art('phim-e'),
        hinhDt: art('nut-tay'),
        may: 'Đứng gần một người hoặc một vật, dòng "E: …" hiện ra. Bấm phím E để nói chuyện.',
        dt: 'Đứng gần một người hoặc một vật, bấm nút bàn tay ở góc phải để nói chuyện.',
      },
      {
        hinh: shot('cong-dong'),
        may: 'Cổng có then gỗ và dây đỏ là cổng chưa mở, em không vào được. Đứng gần cổng và bấm E để nghe lý do. Hãy giúp làng trước, cổng sẽ mở ra.',
        dt: 'Cổng có then gỗ và dây đỏ là cổng chưa mở, em không vào được. Đứng gần cổng và bấm nút bàn tay để nghe lý do. Hãy giúp làng trước, cổng sẽ mở ra.',
      },
      {
        hinh: shot('cong-mo'),
        may: 'Cổng đã mở thì em đi thẳng qua cổng để vào làng, không cần bấm gì. Đi theo biển chỉ đường gỗ để biết đường tới từng làng.',
      },
      {
        hinh: shot('bien-go'),
        may: 'Trong làng, đứng trước biển gỗ và bấm E để vào màn chơi. Biển còn mờ nghĩa là màn chưa mở. Bấm E ở bác An để nghe lời nhắc.',
        dt: 'Trong làng, đứng trước biển gỗ và bấm nút bàn tay để vào màn chơi. Biển còn mờ nghĩa là màn chưa mở. Bấm nút bàn tay ở bác An để nghe lời nhắc.',
      },
    ],
  },
  {
    id: 'bai-hoc',
    nhan: 'Bài học',
    tieuDe: 'Trang bài học',
    rieng: true,
    trang: [
      {
        hinh: shot('bai-hoc'),
        may: 'Mỗi bài học có ba trạm: Dễ, Trung bình, Khó. Xong trạm này thì trạm sau mới mở.',
      },
      {
        hinh: art('sao'),
        may: 'Trả lời càng tốt thì em được càng nhiều sao.',
      },
      {
        hinh: art('bong-den'),
        may: 'Bấm nút bóng đèn "Em có biết?" để đọc lại kiến thức của bài bất cứ lúc nào.',
      },
    ],
  },
  {
    id: 'man-2',
    nhan: 'Màn 2',
    tieuDe: 'Màn 2: Đuổi theo {phanDien}',
    man: [2],
    rieng: true,
    trang: [
      {
        hinh: art('ba-lan-phim'),
        hinhDt: art('ba-lan-vuot'),
        may: 'Đường chạy có ba làn. Bấm phím ← → hoặc A D để đổi làn.',
        dt: 'Đường chạy có ba làn. Vuốt sang trái hoặc phải để đổi làn.',
      },
      {
        hinh: art('nhay-truot-phim'),
        hinhDt: art('nhay-truot-vuot'),
        may: 'Phím ↑, W hoặc Space để nhảy qua vật thấp như đống rơm. Phím ↓ hoặc S để trượt qua sào cao.',
        dt: 'Vuốt lên để nhảy qua vật thấp như đống rơm. Vuốt xuống để trượt qua sào cao.',
      },
      {
        hinh: shot('man-2-chay'),
        may: 'Nhặt trang sổ và tiền đồng. Nón lá, guốc mộc và túi tiền giúp em chạy tốt hơn.',
      },
      {
        hinh: shot('man-2-cau-hoi'),
        may: 'Hết mỗi vòng có một câu hỏi. Trả lời đúng em được thêm trang, trả lời sai thì mất một tim.',
      },
    ],
  },
  {
    id: 'man-3',
    nhan: 'Màn 3',
    tieuDe: 'Màn 3: Ghép lại cuốn sổ',
    man: [3],
    rieng: true,
    trang: [
      {
        hinh: shot('man-3-ban'),
        may: 'Mỗi thẻ ghi mã trang trước, nội dung và mã trang. Ở vòng 1 và 2, em ghép các thẻ thành một chuỗi liền nhau.',
      },
      {
        hinh: art('keo-the'),
        may: 'Kéo thẻ vào ô kế tiếp của chuỗi, hoặc bấm chọn thẻ rồi bấm vào ô đó.',
        dt: 'Kéo thẻ bằng ngón tay vào ô kế tiếp, hoặc chạm chọn thẻ rồi chạm vào ô đó.',
      },
      {
        hinh: art('soi-the'),
        may: 'Bấm "Soi công thức" để tự tính mã trang. Thẻ nào có mã sai công thức là trang giả, em kéo nó vào rổ.',
        dt: 'Chạm "Soi công thức" để tự tính mã trang. Thẻ nào có mã sai công thức là trang giả, em kéo nó vào rổ.',
      },
      {
        hinh: art('ro-trang'),
        may: 'Vòng 3 là giữ sổ trong 90 giây. {phanDien} liên tục tráo trang trong chuỗi: em kéo trang giả vào rổ rồi đặt đúng trang thật vào chỗ trống.',
      },
    ],
  },
  {
    id: 'trang-vang',
    nhan: 'Trang Sổ Vàng',
    tieuDe: 'Trang Sổ Vàng và tiến độ',
    rieng: true,
    trang: [
      {
        hinh: shot('hud-trang-vang'),
        may: 'Bốn ô ở góc trên bên phải là bốn Trang Sổ Vàng. Mỗi làng trao em một trang khi em hoàn thành làng đó.',
      },
      {
        hinh: shot('ban-do'),
        may: 'Bản đồ cho em xem các màn của bốn làng: màn đã xong, màn đang mở và màn còn khóa. Mở bản đồ từ menu.',
      },
      {
        hinh: art('bon-trang'),
        may: 'Đủ bốn Trang Sổ Vàng thì cuốn sổ chung trọn vẹn và em tỉnh dậy khỏi giấc mơ.',
      },
    ],
  },
] as const satisfies readonly GuideSection[];

export type GuideSectionId = (typeof GUIDE_SECTIONS)[number]['id'];
/** Thứ tự cố định các phần (cờ "đã mở tự động" lưu theo số bit theo thứ tự này: chỉ được thêm vào cuối) */
export const GUIDE_SECTION_IDS: readonly GuideSectionId[] = GUIDE_SECTIONS.map((s) => s.id);

/** Phần mở tự động lần đầu vào chợ */
export const GUIDE_FIRST_SECTION: GuideSectionId = 'di-lai';

/** Chữ trên nhãn phím trong hình minh họa (chỉ là tên phím) */
export const huongDan = {
  tieuDe: 'Hướng dẫn chơi',
  /** Nút trên HUD (kèm nhãn đọc màn hình) */
  nutHud: 'Hướng dẫn chơi',
  kyHieuHud: '?',
  /** Nút ở menu và ở thẻ bắt đầu của game */
  nut: 'Hướng dẫn chơi',
  cacPhan: 'Các phần của hướng dẫn',
  /** Tiến trình trang trong phần: {n}/{tong} */
  trang: 'Trang {n}/{tong}',
  truoc: 'Trước',
  sau: 'Tiếp',
  xong: 'Đã hiểu',
  dong: 'Đóng',
  thieuHinh: 'Hình minh họa',
  phim: { w: 'W', a: 'A', s: 'S', d: 'D', e: 'E', shift: 'Shift', space: 'Space', esc: 'Esc' },
} as const;

/** Phần theo id; không có thì undefined */
export function guideSection(id: string): GuideSection | undefined {
  return GUIDE_SECTIONS.find((s) => s.id === id);
}

/** Phần mở thẳng khi bấm "Hướng dẫn chơi" ở thẻ bắt đầu của màn `levelId`; màn không có phần riêng thì null (mở từ phần đầu) */
export function guideSectionOfLevel(levelId: number): GuideSectionId | null {
  return (GUIDE_SECTIONS.find((s) => (s as GuideSection).man?.includes(levelId))?.id as GuideSectionId | undefined) ?? null;
}

/**
 * Các phần hiện trong hộp "Hướng dẫn chơi" khi mở với phần `id`: id là một phần riêng (`rieng`, ví dụ "man-2" từ thẻ bắt đầu màn 2) thì chỉ có đúng phần đó; ngược lại (không có id, id lạ hay id của
 * phần chung) là hộp chung: các phần không phải `rieng` theo thứ tự cố định.
 */
export function guideSectionsFor(id?: string): readonly GuideSection[] {
  const own = id ? GUIDE_SECTIONS.find((s) => s.id === id) : undefined;
  if (own && (own as GuideSection).rieng) return [own];
  return GUIDE_SECTIONS.filter((s) => !(s as GuideSection).rieng);
}

/** Hình của trang theo thiết bị (điện thoại dùng `hinhDt` nếu có) */
export function guideFigure(page: GuidePage, device: GuideDevice): GuideFigure {
  return device === 'dt' && page.hinhDt ? page.hinhDt : page.hinh;
}

/** Lời của trang theo thiết bị (điện thoại dùng `dt` nếu có, không thì lời chung `may`) */
export function guideText(page: GuidePage, device: GuideDevice): string {
  return device === 'dt' && page.dt ? page.dt : page.may;
}
