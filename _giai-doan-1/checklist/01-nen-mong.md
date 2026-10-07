# PROMPT 1/7 — NỀN MÓNG: khung web, giao diện, lưu tiến độ

Bạn là kỹ sư frontend kiêm nhà thiết kế game giáo dục. Chúng ta xây **"Sổ Chung"**, web dạy blockchain cho học sinh THPT Việt Nam. Web gồm 5 bài, mỗi bài 3 mức Dễ / Trung bình / Khó (khoảng 15 mini-game), cộng 1 trang Tổng kết. Quy mô khoảng 1.000 người dùng/tháng.

Dự án làm qua 7 prompt. **Prompt này chỉ dựng nền móng**: khung app, design system, component dùng chung, lưu tiến độ, trang chủ và các trang bài học để trống. Nội dung từng bài có ở các prompt sau. Không tự bịa gameplay cho các bài.

Cách làm việc: trước khi code, tóm tắt kế hoạch 5–10 dòng rồi làm luôn (không cần chờ xác nhận). Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## 1. Nguyên tắc bắt buộc

- Chỉ là frontend tĩnh. Không backend, không server Node, không database, không đăng nhập. Không gọi API hay AI nào lúc chạy: không dùng `@google/genai`, không cần API key. Nếu môi trường tự tạo sẵn server hoặc code gọi Gemini, hãy gỡ bỏ.
- Toàn bộ chữ trên giao diện là tiếng Việt có dấu. Xưng "em" với học sinh; linh vật xưng "mình".
- Lưu tiến độ bằng `localStorage`, bọc `try/catch`. Nếu `localStorage` lỗi thì app vẫn chạy, chỉ không nhớ tiến độ.
- Mọi hàm tính toán của game là hàm thuần (pure function), nằm trong `logic.ts` riêng, tách khỏi giao diện.
- Mọi con số chỉnh được của game đặt tập trung trong `src/config/gameConfig.ts`.
- TypeScript strict, không dùng `any` tùy tiện. Component nhỏ, đặt tên rõ nghĩa.

## 2. Công nghệ

- React 19 + TypeScript + Vite.
- Tailwind CSS v4, khai báo design token bằng CSS variables / `@theme`.
- Điều hướng: `react-router` với **HashRouter**, để deploy tĩnh ở đâu cũng chạy mà không cần cấu hình rewrite.
- Animation: `motion` (import từ `motion/react`), dùng `LazyMotion` + `domAnimation` cho bundle nhỏ. Hiệu ứng đơn giản thì dùng CSS.
- Kéo thả: `@dnd-kit/core` với PointerSensor + TouchSensor + KeyboardSensor.
- Pháo giấy: `canvas-confetti`, import động (chỉ tải khi hoàn thành màn).
- Font tự host qua `@fontsource`:
  - **Baloo 2** (700, 800) cho tiêu đề, nút và con số lớn.
  - **Be Vietnam Pro** (400, 600, 700) cho nội dung.
  - Chỉ nạp subset `vietnamese` + `latin`, dùng `font-display: swap`.
- Icon: `lucide-react`, import từng icon một.
- Âm thanh: tự tổng hợp bằng Web Audio API, không dùng file âm thanh.
- Không dùng: thư viện UI nặng (MUI, Chakra, Ant…), lodash, moment, ảnh bitmap. Minh họa đều là SVG nội tuyến.

## 3. Hiệu năng (bắt buộc đạt)

- Mỗi bài học là một route lazy (`React.lazy` + `Suspense`). Khi trang chủ rảnh (`requestIdleCallback`), prefetch bài kế tiếp đang mở khóa.
- Ngân sách dung lượng:
  - JS tải ban đầu ≤ 120 KB gzip.
  - Mỗi chunk bài học ≤ 60 KB gzip.
- Lighthouse (Mobile): Performance ≥ 90, Accessibility ≥ 95, CLS < 0.05.
- Animation chỉ dùng `transform`/`opacity`, giữ 60fps.
- Tôn trọng `prefers-reduced-motion`, và có công tắc "Giảm chuyển động" trong Cài đặt.
- Phản hồi thao tác trong vòng 100 ms.
- Tác vụ tính toán dài (dò khóa ở Bài 3, bot ở Bài 5) phải chia nhỏ qua `setTimeout`/`requestAnimationFrame` hoặc chạy trong Web Worker, không làm đơ giao diện.
- Đồng hồ đếm giờ không được làm render lại cả màn: tách state của đồng hồ ra riêng, dùng `React.memo` cho các thẻ.

## 4. Thiết kế: "Vở ô ly & mực tím"

Phong cách game tươi sáng, vui như Duolingo, nhưng có bản sắc riêng gắn với ẩn dụ của khóa học: blockchain là một cuốn sổ, mỗi khối là một trang sổ. Chất liệu lấy từ cuốn vở ô ly và mực tím quen thuộc của học sinh Việt Nam.

### Màu (CSS variables)

| Tên | Hex (bản đậm) | Dùng cho |
|---|---|---|
| muc-tim | #5B3FD6 (#4430A8) | màu thương hiệu, tiêu đề, con dấu, viền focus |
| xanh-dung | #1FAF5A (#178A46) | đúng, hợp lệ, nút Kiểm tra/Tiếp tục |
| but-do | #E5484D (#B8363A) | sai, không khớp, hacker (như bút đỏ cô chấm bài) |
| vang-sao | #FFC21A (#D9A000) | sao, XP, điểm nhấn |
| xanh-mang | #2E90E8 (#1F6FB8) | node, mạng lưới, thông tin |
| giay | #FFFFFF | nền thẻ và trang sổ |
| nen | #F6F5FB | nền app |
| o-ly | #E9E4FF | đường kẻ ô ly |
| chu | #2A2340 (phụ: #6B6485) | chữ |

Màu nhấn theo bài:
- Bài 1: xanh-dung
- Bài 2: xanh-mang
- Bài 3: muc-tim
- Bài 4: vang-sao (chữ tối trên nền vàng)
- Bài 5: but-do

### Chữ

- Baloo 2 cho tiêu đề, nút và con số; Be Vietnam Pro cho nội dung.
- Thang cỡ chữ: 14 / 16 / 18 / 22 / 28 / 36 / 48 px.
- Chữ nội dung tối thiểu 16px, mỗi dòng không quá 70 ký tự.
- Con số dùng `font-variant-numeric: tabular-nums`.

### Thành phần hình ảnh

**Thẻ trang sổ (`TrangSo`)** là điểm nhấn thiết kế đẹp nhất, dồn công sức vào đây:
- Nền giấy trắng kẻ ô ly: `repeating-linear-gradient` màu o-ly, 12px mỗi ô, cứ 4 ô thì một đường đậm hơn.
- Một đường lề đỏ nhạt chạy dọc bên trái. Góc bo 14px.
- Tiêu đề kiểu "Trang 3", hai ô "Nội dung" và "Mã trang" với số to bằng Baloo 2.
- Khi trang được xác nhận, mã trang hiện trong một con dấu tròn màu mực tím, kèm hiệu ứng đóng dấu (phóng to rồi thu về, hơi nghiêng).

**Mắt xích (`MatXich`, SVG)** nằm giữa các trang:
- Hợp lệ: màu xanh, liền.
- Không khớp: màu đỏ, gãy đôi.
- Khi đổi trạng thái: "khớp vào" (nảy nhẹ) hoặc "gãy" (hai nửa tách ra, rung nhẹ).

**Nút kiểu 3D:**
- Bo 16px, viền dưới 4px màu đậm; khi nhấn thì dịch xuống 2px.
- Biến thể: chính (xanh-dung), phụ (nền trắng có viền), nguy hiểm (but-do).
- Cao tối thiểu 52px.

**Thẻ:**
- Bóng đổ đặc kiểu nhãn dán (`0 4px 0 #E3E0EE`), không dùng bóng mờ xám.
- Độ bo theo cấp bậc: nút 16, thẻ 14–20, hộp thoại 24. Không dùng một độ bo cho mọi thứ.

**Tránh:** chữ IN HOA làm nhãn; chuỗi ngăn bằng dấu chấm giữa; mũi tên gắn sau chữ trên nút; số thứ tự kiểu 01/02 chỉ để trang trí.

### Nhân vật

**Linh vật "Bi":** khối vuông bo tròn màu mực tím, mắt to màu trắng, trên đầu có một mắt xích nhỏ, vẽ bằng SVG. Có 5 biểu cảm (vui, suy nghĩ, buồn, ăn mừng, ngạc nhiên), chọn qua prop `mood`. Bi xuất hiện ở thẻ giới thiệu, phản hồi và trang chủ.

**Nhân vật phụ dùng xuyên suốt khóa học:**
- Tí 🦊: cáo tinh nghịch, hay gian lận, là "phản diện" của khóa học.
- Bình 🐢: cẩn thận.
- Chi 🐇: vội vàng.
- An, Dũng và các bạn khác.

Avatar là SVG đơn giản đặt trong vòng tròn màu.

### Chuyển động

- Chỉ có **một** màn mở đầu được dàn dựng: ở trang chủ, 3 trang sổ rơi xuống và mắt xích khớp vào nhau, khoảng 1,2 giây.
- Các chuyển động còn lại chỉ để đáp lại thao tác: đóng dấu, khớp/gãy mắt xích, lật thẻ, rung khi sai.
- Thời lượng: 150–250 ms cho UI, 400–600 ms cho khoảnh khắc ăn mừng.

### Âm thanh

Dùng Web Audio, âm lượng nhỏ, mặc định bật, có nút tắt trên header. Chỉ khởi tạo AudioContext sau thao tác đầu tiên của người dùng.

| Sự kiện | Âm thanh |
|---|---|
| Đúng | 2 nốt đi lên |
| Sai | 1 nốt trầm ngắn |
| Bấm | tiếng tick |
| Hoàn thành màn | arpeggio 4 nốt |
| Lật mở kết quả | tiếng "vút" |

### Khả năng tiếp cận

- Điều khiển được hoàn toàn bằng bàn phím; viền focus màu mực tím 3px.
- Màu không bao giờ là tín hiệu duy nhất: luôn kèm ✓/✗ và chữ.
- Có vùng `aria-live="polite"` đọc kết quả.
- Vùng bấm tối thiểu 44px; độ tương phản tối thiểu 4.5:1.

### Responsive

- Chạy tốt ở 360px (điện thoại), 768px (tablet), 1280px và 1920px (máy chiếu trong lớp).
- Có cài đặt "Chữ to (trình chiếu)" tăng cỡ chữ gốc lên 125%.

## 5. Cấu trúc thư mục

```
src/
  app/              router, layout, ErrorBoundary
  config/gameConfig.ts
  components/ui/    Button, Card, Modal, BottomSheet, ProgressBar, Hearts, Stars,
                    NumberInput, Mascot, Avatar, TrangSo, MatXich, Tooltip, Toast
  components/game/  LessonShell, LevelIntro, FeedbackSheet, LevelComplete, LevelFailed,
                    DidYouKnowModal, ReflectionQuestion, TapOrDrag (kéo thả + chạm)
  lib/              storage.ts, progress.ts, sound.ts, rng.ts (random có seed), format.ts
  lessons/lesson1…lesson5/   index.tsx, Easy.tsx, Medium.tsx, Hard.tsx,
                             logic.ts, content.ts, tests.ts
  pages/            Home, Summary, Settings, SelfTest, UiGallery, NotFound
```

Quy ước test: mỗi `tests.ts` export `tests: { name: string; expected: unknown; actual: () => unknown }[]`.

## 6. Màn hình

### Trang chủ

- **Đầu trang:** logo chữ "Sổ Chung" kèm linh vật, tổng XP, nút âm thanh, nút Cài đặt.
- **Hero ngắn:**
  - Tiêu đề: "Blockchain, giải thích bằng một cuốn sổ".
  - Một câu mô tả: "5 bài, 15 thử thách nhỏ, mỗi bài khoảng 15 phút."
  - Nút "Bắt đầu học"; nếu đã học rồi thì nút là "Học tiếp Bài X".
  - Minh họa 3 trang sổ nối mắt xích (đây là màn mở đầu duy nhất).
- **Lộ trình kiểu Duolingo:** đường uốn lượn dọc với 6 điểm dừng:
  1. Bài 1 Khối & chuỗi
  2. Bài 2 Node
  3. Bài 3 Khóa riêng & khóa công khai
  4. Bài 4 Cây Merkle
  5. Bài 5 Tấn công 51%
  6. Tổng kết
- **Mỗi điểm dừng:**
  - Nút tròn lớn màu nhấn của bài, có icon SVG, tên bài, và 3 chấm/sao ứng với 3 mức.
  - Bài bị khóa: màu xám, có ổ khóa, tooltip "Hoàn thành Bài X để mở".
  - Chỉ điểm dừng hiện tại có chuyển động nảy nhẹ. Linh vật đứng cạnh với bong bóng kiểu "Tiếp tục Bài 2 nhé!".

### Trang bài học (`LessonShell`)

- Header: nút quay lại, tên bài, nút "Em có biết?" (có chấm nhấp nháy cho tới khi được mở lần đầu).
- 3 thẻ mức "Dễ", "Trung bình", "Khó", hiện số sao đã đạt hoặc ổ khóa.
- Lần đầu vào một bài: tự mở "Em có biết?" một lần (đóng được).

### Luồng một màn chơi (dùng chung cho mọi mức)

1. **`LevelIntro`:** linh vật, mục tiêu 1–2 câu, nút "Bắt đầu".
2. **Khu chơi:**
   - Trên cùng có thanh tiến độ, tim (nếu màn dùng tim) và nút ✕.
   - Bấm ✕ thì hỏi "Thoát màn này? Tiến độ của màn sẽ không được lưu.", với hai nút "Thoát" và "Chơi tiếp".
3. **`FeedbackSheet`** trượt lên từ dưới sau mỗi lượt trả lời:
   - Màu xanh "Chính xác!" hoặc màu đỏ "Chưa đúng".
   - Giải thích theo trình tự: chuyện gì xảy ra, vì sao, cách sửa.
   - Nút "Tiếp tục" (phím Enter).
4. **`LevelComplete`:**
   - Sao (1–3), XP nhận được, thời gian, và 1 câu "Điều em vừa học".
   - Câu hỏi suy ngẫm nếu có (không tính điểm).
   - Pháo giấy; nút "Chơi lại" và "Màn tiếp theo".
5. **`LevelFailed`** (khi hết tim): linh vật buồn, 1 mẹo, nút "Thử lại".

### Hộp "Em có biết?" (`DidYouKnowModal`)

- 3–5 thẻ truyện. Mỗi thẻ có tiêu đề, 2–3 câu, 1 ví dụ đặt trong khung và minh họa SVG nhỏ.
- Chấm chỉ vị trí, nút "Tiếp"; thẻ cuối có nút "Mình hiểu rồi".
- Dùng được phím ← / → / Esc.

### Cài đặt

- Âm thanh; Giảm chuyển động; Chữ to (trình chiếu).
- Chế độ giáo viên: mở khóa mọi bài. Cũng bật được bằng URL `?giaovien=1`.
- Đổi tên.
- Xóa tiến độ: hộp thoại "Xóa toàn bộ tiến độ? Không thể hoàn tác.", với hai nút "Xóa tiến độ" và "Giữ lại".

### Các trang khác

- **Lần đầu vào web:** hỏi "Tên em là gì?". Không bắt buộc, có nút "Bỏ qua". Tên lưu local, dùng trong lời thoại và chứng nhận.
- **`#/dev/self-test`** (không có link trên giao diện): chạy mọi test trong các `tests.ts`, so sánh bằng deep-equal, hiện ✅/❌ từng dòng.
- **`#/dev/ui`:** bộ sưu tập mọi component (nút, TrangSo ở các trạng thái, MatXich khớp/gãy, FeedbackSheet…) để kiểm tra giao diện.
- **Trang 404** thân thiện.
- **ErrorBoundary cho từng bài:** "Bài này gặp lỗi." kèm nút "Tải lại bài", để lỗi một bài không làm sập cả app.

## 7. Tiến độ & mở khóa

- Lưu trong `localStorage`, key `sochung.v1`, có trường `version` để nâng cấp schema sau này. Nội dung lưu:
  - tên và cài đặt;
  - tổng XP;
  - mỗi màn: `{ completed, stars (0–3), bestTime }`;
  - cờ đã xem "Em có biết?" của từng bài;
  - dữ liệu riêng của từng bài (ví dụ chuỗi em xây ở Bài 1, bộ nhớ của bot ở Bài 5).
- Luật mở khóa:
  - Mức Trung bình mở khi xong Dễ; mức Khó mở khi xong Trung bình.
  - Bài sau mở khi hoàn thành mức Khó của bài trước.
  - Tổng kết mở khi xong Bài 5.
  - Chế độ giáo viên mở tất cả.
- "Hoàn thành" nghĩa là tới được màn `LevelComplete` (thắng, hoặc chơi hết giờ tùy màn). Hết tim thì không tính là hoàn thành.
- Sao mặc định (màn nào có luật riêng sẽ ghi rõ ở prompt của bài đó):
  - 0 lỗi: 3 sao.
  - 1–2 lỗi: 2 sao.
  - Nhiều hơn: 1 sao.
  - Luôn lưu số sao cao nhất.
- XP:
  - Dễ 10, Trung bình 15, Khó 20.
  - Cộng thêm 5 cho mỗi sao trên 1 sao.
  - Chỉ cộng phần chênh khi lần đầu đạt số sao cao hơn.

## 8. Kéo thả

- Mọi thao tác kéo thả phải có cách thay thế **"chạm chọn, chạm đặt"**: chạm thẻ để chọn, chạm ô để đặt, chạm lại để bỏ chọn.
- Dùng được bằng bàn phím.
- Ô thả sáng lên khi đang kéo. Thả sai thì thẻ trượt về chỗ cũ; thả đúng thì thẻ "hít" vào ô.

## 9. Thuật ngữ dùng thống nhất

| Thuật ngữ | Nghĩa |
|---|---|
| cuốn sổ | bản dữ liệu mà một node giữ |
| trang | = khối (block) |
| trang bìa | khối đầu tiên |
| nội dung | con số ghi trong trang |
| mã trang | |
| chuỗi | |
| node | người giữ sổ |
| điểm cọc | |
| khóa riêng | private key |
| khóa công khai | public key |
| chữ ký | |
| máy xác minh | |
| giao dịch | |
| gốc Merkle | Merkle root |
| Hacker, Người bảo vệ | hai phe ở Bài 5 |

Nút luôn bắt đầu bằng động từ và dùng đúng các nhãn sau ở mọi nơi: "Bắt đầu", "Kiểm tra", "Tiếp tục", "Thử lại", "Đóng dấu trang", "Đồng ý", "Từ chối", "Xem gợi ý", "Chốt lựa chọn".

## 10. Việc cần làm trong prompt này

- Dựng toàn bộ mục 1–9.
- 5 trang bài và trang Tổng kết tạm hiện thẻ "Nội dung đang được xây dựng". Trang bài vẫn có `LessonShell`, 3 thẻ mức và nút "Em có biết?" (nội dung rỗng).
- Tạo `gameConfig.ts` với `APP_NAME = "Sổ Chung"` và các nhóm `lesson1` … `lesson5` rỗng để prompt sau điền vào.
- Tạo `rng.ts`: random có seed (ví dụ mulberry32), hàm `randInt(min, max)` và `shuffle`.
- Tạo `format.ts`: định dạng số kiểu Việt Nam (1.000.003; 3,7 × 10^51).

## 11. Checklist nghiệm thu

- [ ] `npm run build` chạy không lỗi, không có cảnh báo TypeScript.
- [ ] Trang chủ hiện lộ trình 6 điểm: Bài 1 mở, các bài khác khóa. Bật chế độ giáo viên thì mở hết.
- [ ] `#/dev/ui` hiện đúng: nút 3D, trang sổ ô ly có lề đỏ, con dấu, mắt xích khớp/gãy.
- [ ] Tải lại trang vẫn nhớ tên, XP và cài đặt.
- [ ] Dùng phím Tab đi được qua mọi nút. Bật "Giảm chuyển động" thì không còn animation trang trí.
- [ ] Ở màn hình 360px không bị tràn ngang.
- [ ] Lighthouse Mobile: Performance ≥ 90.
