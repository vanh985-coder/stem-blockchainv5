# TRẠNG THÁI DỰ ÁN SỔ CHUNG

File này là bộ nhớ chung giữa các cửa sổ chat. Cuối mỗi cửa sổ, Claude viết lại toàn bộ file; bạn xóa bản cũ trong project và tải bản mới lên. Giữ gọn dưới khoảng 100 dòng.

## Thông tin chung

- **Người code:** Gemini, chạy trong **Google Antigravity** (code nằm trên máy, Windows), thư mục `stem-blockchainV4`. Một dự án duy nhất cho cả web.
- **Repo GitHub / web đã deploy:** (chưa có)
- **Spec:** các file 01–07 là nguồn sự thật. Lý do các quyết định: 00-HUONG-DAN.md. Ý tưởng gốc: stemv2.docx (spec thắng nếu mâu thuẫn).

## Tiến độ

| Cửa sổ | Bước | Spec | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1 | Nền móng | 01-nen-mong.md | Xong | Test 20/20 ✅; JS ban đầu 93 KB gzip. Kiểm tra tay và Lighthouse: xem mục Lỗi còn tồn |
| 2 | Bài 1: Khối & chuỗi | 02-bai1-khoi-va-chuoi.md | Chưa làm | |
| 3 | Bài 2: Node | 03-bai2-node.md | Chưa làm | |
| 4 | Bài 3: Khóa | 04-bai3-khoa.md | Chưa làm | |
| 5 | Bài 4: Merkle | 05-bai4-merkle.md | Chưa làm | |
| 6 | Bài 5: Tấn công 51% | 06-bai5-tan-cong-51.md | Chưa làm | |
| 7 | Tổng kết & hoàn thiện | 07-tong-ket-hoan-thien.md | Chưa làm | |

## Cấu trúc code thực tế (tên thật, prompt sau phải dùng đúng)

- **Stack:** React 19, Vite 6, Tailwind v4, react-router 7 (HashRouter), terser.
- **Thư mục chính:**
  - `src/app/`: `router.tsx`, `layout.tsx`, `ErrorBoundary.tsx`, `ProgressContext.tsx`.
  - `src/components/ui/`, `src/components/game/`.
  - `src/lib/`: `storage`, `progress`, `progressLogic`, `sound`, `rng`, `format`, `tests.ts`.
  - `src/lessons/registry.ts`, `src/lessons/lessonN/` gồm `index.tsx`, `Easy/Medium/Hard.tsx`, `logic.ts`, `content.ts`, `tests.ts`.
  - `src/pages/`.
- **Tiến độ:** `useProgress()` từ `src/app/ProgressContext.tsx`.
  - Action: `completeLevel`, `markDidYouKnowSeen`, `getLessonData<T>(key: string)`, `setLessonData(key, data)`, `setName`, `updateSettings`, `resetProgress`.
  - `completeLevel(lesson, level, { stars?, mistakes?, timeMs? })` trả về `{ starsEarned, xpGained, isNewBest }`.
  - Hàm thuần nằm ở `progressLogic.ts`: `starsFromMistakes`, `xpForStars`, `xpDelta`, `isLessonUnlocked`, `isLevelUnlocked`, `isSummaryUnlocked`.
  - Schema `sochung.v1`: `{ version, userName, settings{soundEnabled, reducedMotion, presentationFont, teacherMode}, totalXp, levels{"1_easy":{completed,stars,bestTime}}, didYouKnowViewed{"1":true}, lessonData{}, firstVisitDone }`.
  - Quy ước key cho `lessonData`: dùng `"lesson1"`, `"lesson5"`…
- **Màn chơi:** `LevelProps { onComplete(r: LevelResult), onFail(tip?) }` và `LevelResult { stars: 1|2|3, timeMs, learned?, reflection? }`, export từ `components/game/LessonShell.tsx`.
- **Cách viết `lessonN/index.tsx`:**
  - `export const levels = { easy, medium, hard }`.
  - `export default function LessonPage() { return <LessonShell lessonId={N} storyCards={…} levelsMeta={…} levels={levels} /> }`.
  - `levelsMeta` chứa intro của từng mức. Chỉ dùng cách `levels`, không dùng `renderLevel`/`children`.
- **Registry và test:**
  - `LESSONS_REGISTRY` trong `registry.ts` gồm `{ id, title, shortTitle, accent, darkAccent, icon, metaphor, load }`.
  - Self-test tự gom mọi `tests.ts` bằng `import.meta.glob`, không cần đăng ký.
- **Component UI (props chính):**
  - `TrangSo { pageNumber, content, pageCode, prevCode?, isConfirmed?, isInvalid?, isValidating?, isInteractive?, onClick?, size? }`
  - `MatXich { status?: 'valid'|'broken'|'neutral', orientation?, size?, animateOnChange? }`
  - `Mascot { mood?: 'vui'|'suy_nghi'|'buon'|'an_mung'|'ngac_nhien', size?, speechBubble? }`
  - `Avatar { character: 'ti'|'binh'|'chi'|'an'|'dung'|'bi', size?, showName? }`
  - `Button { variant?: 'primary'|'secondary'|'danger'|'purple'|'yellow'|'ghost', size?, fullWidth?, silent?, leftIcon? }`
  - `NumberInput { value: number, onChange, min?, max?, step?, disabled?, label? }`
  - `Hearts { current, max? }`, `ProgressBar { current, max, color? }`
  - `FeedbackSheet { isOpen, isCorrect, title?, whatHappened, whyHappened?, howToFix?, onContinue, continueLabel? }`
  - `LevelIntro { title, objective, mascotMood?, tip?, onStart }`
  - `ReflectionQuestion { question, options[], explanation?, onAnswered? }`
  - `DidYouKnowModal` nhận `StoryCard { title, text, example?, svgIcon? }`
  - `TapOrDrag`: `TapOrDragContainer { onDropOrPlace(itemId, slotId) }`, `DraggableItem { id }`, `DroppableSlot { id, acceptedItemId?, isOccupied? }`
  - `Toast { message, type?, duration?, onClose }`
- **Thư viện dùng chung:**
  - `sound`: `playClick`, `playCorrect`, `playWrong`, `playLevelComplete`, `playWhoosh`, `isEnabled`, `setEnabled`, `toggle`.
  - `rng`: `createMulberry32(seed)`, `randInt(min, max, rng?)`, `shuffle(arr, rng?)`, `chooseOne(arr, rng?)`, `setSeed` (global). Logic của các bài luôn truyền `rng` vào, không dùng global.
  - `format`: `formatNumber`, `formatDecimal`, `formatSci`, và hàm định dạng thời gian.
- **Config:** `GAME_CONFIG` trong `src/config/gameConfig.ts` có sẵn các khóa `lesson1…lesson5: {}`, `xp`, `stars`, `gameplay.defaultHearts`.
- **Animation:**
  - Trang chủ, `TrangSo`, `MatXich`, `Modal`, `Toast`, `Mascot` dùng CSS keyframes, tắt bằng `html[data-reduce-motion="true"]` hoặc `prefers-reduced-motion`.
  - `motion` chỉ dùng trong chunk bài học (`LazyMotion` đặt trong `LessonShell`).
- **Bundle:** `manualChunks` gồm vendor-react (68,5), vendor-router (12,8), vendor-motion, vendor-dnd, vendor-confetti (lazy). Mỗi placeholder bài khoảng 1,3 KB.

## Quyết định mới / lệch so với spec

- Ngân sách JS ban đầu siết còn ≤ 100 KB gzip (spec 01 là 120 KB) để chừa chỗ. Hiện đang là 93 KB.
- Hiệu ứng của trang chủ và các component UI dùng CSS, không dùng motion.
- Có thêm `progressLogic.ts`, `registry.ts` và `src/lib/tests.ts` (hợp đồng kỹ thuật, mục 12 của prompt nền móng).

## Lỗi còn tồn / việc để sau

- **Chờ người dùng kiểm tra tay:**
  - `#/dev/ui` hiển thị đúng;
  - tải lại trang vẫn nhớ tên và cài đặt;
  - `?giaovien=1` mở hết bài;
  - Tab đi qua mọi nút;
  - "Giảm chuyển động" hoạt động;
  - 360px không tràn ngang;
  - Lighthouse Mobile (đo trên `npx vite preview`).
- **Việc cho prompt Bài 1:**
  - `NumberInput` phải hỗ trợ ô trống (`value: number | null`), phím Enter để kiểm tra, và thông báo lỗi.
  - `TrangSo` phải có thêm các trạng thái: trang bìa (không có nội dung), trang chưa tới lượt (mờ), "Sẽ phải tính lại" (viền vàng nét đứt), trang có ô nhập.
- **Mỗi prompt bài:**
  - Xóa nút "hoàn thành thử" trong placeholder.
  - Thay nội dung "Em có biết?" mẫu bằng nội dung của spec.

## Bàn giao gần nhất

- Cửa sổ 1: dựng nền móng qua 3 lượt (dựng khung → bổ sung hợp đồng mục 12 → bỏ motion khỏi trang chủ, dọn API). Build sạch, self-test 20/20 ✅.

## Câu mở đầu cho cửa sổ tiếp theo

```
Cửa sổ 2/7 — BÀI 1: KHỐI & CHUỖI (spec: 02-bai1-khoi-va-chuoi.md). Nền móng đã xong, code ở Antigravity. Đọc TRANG-THAI.md (nhất là mục Cấu trúc code thực tế và Việc cho prompt Bài 1) và spec, rồi đưa mình prompt để dán vào Gemini. Kết quả kiểm tra tay của Nền móng: [ghi "ổn hết", hoặc liệt kê mục lỗi].
```