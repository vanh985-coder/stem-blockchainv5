# TRẠNG THÁI DỰ ÁN SỔ CHUNG

File này là bộ nhớ chung giữa các cửa sổ chat. Cuối mỗi cửa sổ, Claude viết lại toàn bộ file; bạn xóa bản cũ trong project và tải bản mới lên. Giữ gọn dưới khoảng 100 dòng.

## Thông tin chung

- **Người code:** Gemini, chạy trong **Google Antigravity** (code nằm trên máy, Windows), thư mục `stem-blockchainV4`.
- **Repo GitHub:** tài khoản `vanh985-coder`. **Web đã deploy:** (chưa có)
- **Chơi thử:** `npm run dev` → `http://localhost:5173/#/lesson/N` (thêm `?giaovien=1` nếu bài còn khóa). Kiểm bản build: `npm run build` rồi `npm run preview` (cổng 4173).
- **Git:** commit sau MỖI prompt đã nghiệm thu, đặt tên theo việc (`Bai 4: cay Merkle`). Hỏng thì `git checkout -- .` (chưa commit) hoặc `git revert HEAD` (đã commit).
- **Spec:** file 01–07 là nguồn sự thật. Lý do quyết định: 00-HUONG-DAN.md. Ý tưởng gốc: stemv2.docx (spec thắng).
- **Cách nghiệm thu:** người dùng tự chơi thử và báo kết quả; Claude đọc báo cáo của Gemini và ảnh chụp.

## Tiến độ

| Cửa sổ | Bước                  | Spec                      | Trạng thái | Ghi chú                                          |
| ------ | --------------------- | ------------------------- | ---------- | ------------------------------------------------ |
| 1      | Nền móng              | 01-nen-mong.md            | Xong       | Test 20/20 ✅; Lighthouse đạt                    |
| 2      | Bài 1: Khối & chuỗi   | 02-bai1-khoi-va-chuoi.md  | Xong       | Chơi thử 15/15 đạt                               |
| 3      | Bài 2: Node           | 03-bai2-node.md           | Xong       | Test 55/55 ✅; mô phỏng khớp spec                |
| 4      | Bài 3: Khóa           | 04-bai3-khoa.md           | Xong       | Test 65/65 ✅; 1 lượt xây + 8 lượt sửa           |
| 5      | Bài 4: Merkle         | 05-bai4-merkle.md         | Xong       | Test 77/77 ✅; 1 lượt xây + 1 lượt sửa đóng gói  |
| 6      | Bài 5: Tấn công 51%   | 06-bai5-tan-cong-51.md    | Chưa làm   |                                                  |
| 7      | Tổng kết & hoàn thiện | 07-tong-ket-hoan-thien.md | Chưa làm   | Kèm việc nới khung PC (xem mục cuối)             |

## Cấu trúc code thực tế (tên thật, prompt sau phải dùng đúng)

- **Stack:** React 19, Vite 6, Tailwind v4, react-router 7 (HashRouter), terser. Route: `#/lesson/N`. Dev có StrictMode: updater của setState phải thuần.
- **Thư mục:** `src/app/` (router, layout, ErrorBoundary, ProgressContext); `src/components/ui/`, `src/components/game/`; `src/lib/` (storage, progress, progressLogic, sound, rng, format, chain, tests.ts); `src/lessons/registry.ts`; `src/lessons/lessonN/` gồm `index.tsx`, `Easy/Medium/Hard.tsx`, `logic.ts`, `content.ts`, `tests.ts` (Bài 2 thêm `bots.ts`; Bài 3 thêm `DanhBa.tsx`, `MayXacMinh.tsx`, `TheGiaoDich.tsx`; Bài 4 thêm `CayMerkle.tsx`); `src/pages/` (`UiGallery.tsx`, `SelfTest.tsx`).
- **Tiến độ:** `useProgress()` với `completeLevel`, `markDidYouKnowSeen`, `getLessonData<T>(key)`, `setLessonData`, `setName`, `updateSettings`, `resetProgress`.
  - `completeLevel(lesson, level, { stars?, mistakes?, timeMs? })` → `{ starsEarned, xpGained, isNewBest }`. Key mức: `"1_easy"`.
  - `progressLogic.ts`: `starsFromMistakes` (0 lỗi→3, 1–2→2, ≥3→1; ngưỡng khác thì tự truyền `stars`), `xpForStars`, `xpDelta`, `isLessonUnlocked`, `isLevelUnlocked`, `isSummaryUnlocked`.
  - `lessonData.lesson1 = { genesisCode, contents[], codes[] }`; `lesson2 = { hardCardSeen }`. Bài 3, Bài 4 không dùng `lessonData`.
- **LessonShell:** `LevelProps { onComplete(r: LevelResult), onFail(tip?) }`, `LevelResult { stars: 1|2|3, timeMs, learned?: string, reflection? }` — `learned` là **chuỗi đơn**, không phải mảng.
  - `index.tsx`: `export const levels = { easy, medium, hard }`; `<LessonShell lessonId storyCards levelsMeta levels />`.
  - **Tim:** LessonShell KHÔNG render tim; màn tự giữ, hết tim gọi `onFail(tip)`. Bài 3 và Bài 4 không có tim.
  - **Mức cuối:** LessonShell tự truyền `nextLabel = "Sang Bài N+1"` và `nextLessonUrl`.
- **Registry và test:** `LESSONS_REGISTRY { id, title, shortTitle, accent, darkAccent, icon, metaphor, load }`, `load` luôn là dynamic import. Self-test gom mọi `tests.ts` bằng `import.meta.glob` **chế độ lazy** (`await loadModule()`, KHÔNG `eager: true`). Hiện **77 test**: lib 20, Bài 1 8, Bài 2 27, Bài 3 10, Bài 4 12.
- **Component UI (props chính):**
  - `TrangSo { pageNumber, content, pageCode, prevCode?, isConfirmed?, isInvalid?, invalidBadgeText?, isValidating?, isInteractive?, onClick?, size?, isCover?, isDimmed?, willRecalc?, struckContent?, contentSlot?, codeSlot? }`. Ưu tiên: isInvalid > willRecalc > isConfirmed > thường.
  - `ChainStrip` (trong `components/game/`), `NumberInput { value: number|null, onChange, min?, max?, onEnter?, error?, showButtons? … }`, `MatXich`, `Mascot`.
  - `Avatar { character: 'em'|'ti'|'binh'|'chi'|'an'|'dung'|'bi', size?, showName?, customName? }` (`'em'` + `customName` = tên người dùng, lấy từ `userName`, mặc định "Em").
  - `Button { variant?: 'primary'|'secondary'|'danger'|'purple'|'yellow'|'ghost', size?, fullWidth?, silent?, leftIcon? }`; `Hearts`; `ProgressBar`; `Toast`; `Modal`.
  - `FeedbackSheet`; `LevelIntro`; `ReflectionQuestion { question, options[], explanation?, onAnswered? }`; `DidYouKnowModal` nhận `StoryCard { title, text, example?, svgIcon? }`.
  - **`TapOrDrag`:** `TapOrDragContainer { onDropOrPlace(itemId, slotId) }`, **`DraggableCard { id }`** (tên thật, không phải `DraggableItem`), `DroppableSlot { id, acceptedItemId?, isOccupied? }`. Bắt buộc dùng cho mọi chỗ kéo thả: có cả kéo lẫn chạm-chọn/chạm-đặt.
- **Logic dùng chung:** `src/lib/chain.ts`: `pageCode(prev, content, multiplier=2)`, `buildChain`, `isSafeDelta`, `MOD = 100`.
- **Bài 2 để dùng lại (Bài 5):** `lesson2/logic.ts` (`isValidProposal`, `explainCheck`, `wrongCode`, `generateEasy`, `generateMedium`); `lesson2/bots.ts` (`settleRound`, `pAccept3`, `evCheat`, `updateBeliefs`, `tiDecide`, `botVote`, `chiCreate`, `makeCheatPage`, `hardStars`, `summarizePlayer`, `simulateGames`). Muốn dùng ở bài khác thì chuyển sang `src/lib/`, không import chéo.
- **Bài 3 để dùng lại:** `lesson3/logic.ts`: `modPow` (dùng `Math.floor`, chạy được tới p = 1.000.003), `publicKey`, `hash`, `sign`, `verify`, `signUnique`, `findSigner`, `generateMedium`, `startBrute`/`stepBrute`, `PEOPLE`, `DIRECTORY_KEYS`, `STRANGER`, `ESTIMATES`.
- **Bài 4 để dùng lại:** `lesson4/logic.ts`: `combine(a,b)=a*10+b`, `buildTree`, `pathToRoot`, `generateEasy/Medium/Hard`; `lesson4/CayMerkle.tsx` vẽ cây bằng SVG thuần, cuộn ngang trên màn hẹp.
- **Thư viện:** `sound` (`playClick`, `playCorrect`, `playWrong`, `playLevelComplete`, `playWhoosh`); `rng` (`createMulberry32`, `randInt`, `shuffle`, `chooseOne`; logic luôn nhận `rng: () => number`); `format` (`formatNumber`, `formatDecimal`, `formatSci`); `storage` (đọc/ghi localStorage, Bài 5 phải dùng file này chứ không gọi thẳng localStorage).
- **Config:** `GAME_CONFIG` trong `src/config/gameConfig.ts`. Đã điền `lesson1`…`lesson4` (lesson4: `leafMin/leafMax 1–9`, `easyQuestionsCount 5`, `hiddenCount 6`, `distractorCount 2`, `tamperStepDelayMs 600`, `cardMergeDelayMs 400`). `lesson5: {}`.
- **Bundle (gzip):** JS ban đầu **94,09 KB** = entry `index-*` 12,84 + `vendor-react` 68,48 + `vendor-router` 12,77. Chunk bài (lazy): lesson1 6,73; lesson2 9,95 (+`bots` 2,81); lesson3 22,07; lesson4 10,14. Vendor lazy: `vendor-motion` 25,29; `vendor-dnd` 12,33; `vendor-confetti` 4,19. `SelfTest` 2,14. Ngân sách: ban đầu ≤ 100 KB, mỗi chunk bài ≤ 60 KB.
- **Tên chunk:** `vite.config.ts` đặt `chunkFileNames` để chunk mỗi bài có tên `lessonN-*.js`. Trước đây mọi chunk đều là `index-*.js` nên rất dễ đọc nhầm chunk bài học thành entry — đã hết.

## Quyết định mới / lệch so với spec

- Ngân sách JS ban đầu siết còn ≤ 100 KB gzip (spec 01 ghi 120 KB).
- Nhãn viết thường ở mọi nơi, không IN HOA.
- Ô nhập số: ô trống hoặc ngoài khoảng không tính là lỗi.
- **Chưa nộp thì không lộ đáp án** — luật áp cho mọi bài: trước khi bấm nộp/kiểm tra, không tô màu, không hiện nhãn đúng/sai.
- **Bài 3 (bổ sung so với spec 04, đã ghi vào cuối file spec):** không có tim; mọi thẻ ở mức Trung bình đều có khóa đính kèm; lời đề bài không nói trước khóa đính kèm là bẫy; mức Khó phần 1 khóa nút "để máy thử" và bảng tra cho tới khi tự thử 3 số; mức Khó phần 2 chia 3 bước.
- **Bài 4:** không có tim; mức Dễ và Trung bình tính sao bằng `starsFromMistakes`, mức Khó truyền thẳng `stars` theo luật riêng (1 lần kiểm tra → 3 sao, 2 lần → 2 sao, nhiều hơn → 1 sao). Bấm vào ô đang khóa (chưa đủ nút con) chỉ cảnh báo, không tính là lỗi.
- Mỗi công cụ (máy tính, máy xác minh, khay mảnh ghép) phải có dòng chú thích nói rõ dùng để làm gì. Công thức trình bày ba tầng: công thức tổng quát → giải thích từng tham số → ví dụ thay số.

## Lỗi còn tồn / việc để sau

- **Nới khung PC (chưa chạy, để cửa sổ 7):** trên 1280px và 1920px nội dung bó trong cột hẹp. Dự kiến sửa ở layout dùng chung `src/app/`: ≥768px tối đa 900px, ≥1280px 1200px, ≥1536px 1400px; khối chữ dài giữ 65ch; sau đó mới tăng cỡ chữ gốc 112% ở ≥1280px. Làm xong phải chơi lại Bài 1 (ChainStrip giãn), Bài 2 Trung bình (hai hàng sổ có còn thẳng cột) và Bài 4 Khó (cây 8 lá).
- Spec 01 có cài đặt "Chữ to (trình chiếu)" 125% — chưa xác nhận đã làm chưa.
- Đo Lighthouse trên bản build (tab ẩn danh, Mobile).
- Bài 2 Khó: trang gian kiểu A vào sổ chung chỉ lưu `content`, `code`, `isInvalid`, nên mắt xích trước nó chưa hiện "gãy". Bổ sung nếu Bài 5 cần.
- Bài 3 dùng `toLocaleString('vi-VN')` ở một chỗ trong `Hard.tsx` thay vì `formatNumber`; gộp sửa khi có dịp.
- **Việc cho prompt Bài 5:** trong `src/lessons/lesson5/` hiện đã có file placeholder (build ra 2 chunk `lesson5-*`) — phải xóa sạch trước khi xây. Bot đặt riêng trong `bot.ts`, hàm thuần, nhận `rng` có seed, **không được đọc nước đi của học sinh trong round hiện tại**. Mô hình thói quen lưu qua `src/lib/storage.ts`, không gọi thẳng `localStorage`. Bảng W và 12 test case của `frontier`/`recoverable`/`legalAttacks`/`legalDefenses`/`resolve` có sẵn trong spec 06, chép nguyên. Bàn cờ vòng tròn 10 node vẽ SVG thuần; mức Dễ kéo node giữa hai cột và mức Trung bình nối thẻ đều dùng `TapOrDrag` (`DraggableCard`). Bot suy nghĩ < 30 ms, chạy trong `setTimeout 0` sau khi đã hiện "đang suy nghĩ…"; timer lưu trong ref, dọn khi unmount. Bong bóng lời thoại của bot chỉ hiện SAU reveal. Mức Khó luôn tính là hoàn thành, sao theo luật riêng nên truyền thẳng `stars`. Điền `GAME_CONFIG.lesson5`. Yêu cầu Gemini báo gzip theo đúng tên chunk mới (`lesson5-*`, entry là `index-*` được nhúng trong `dist/index.html`).

## Bàn giao gần nhất

- Cửa sổ 5: Bài 4 xong sau 1 lượt xây + 1 lượt sửa. Lượt sửa không phải lỗi code: Gemini đọc nhầm chunk của Bài 3 (`index-*.js`, 22,07 KB) thành entry index và báo vượt ngân sách. Đã đặt `chunkFileNames` cho từng bài và chuyển `import.meta.glob` của SelfTest sang lazy (SelfTest giảm 8,14 → 2,14 KB gzip). Bài học: khi Gemini báo số đo, bắt nó nói rõ tên file và đối chiếu với `dist/index.html`, đừng tin nhãn "✅" nó tự gán.

## Câu mở đầu cho cửa sổ tiếp theo

```
Cửa sổ 6/7 — BÀI 5: TẤN CÔNG 51% (spec: 06-bai5-tan-cong-51.md). Bài 1, 2, 3, 4 đã xong, code ở Antigravity. Đọc TRANG-THAI.md (nhất là mục Cấu trúc code thực tế và Việc cho prompt Bài 5) và spec, rồi đưa mình prompt để dán vào Gemini.
```