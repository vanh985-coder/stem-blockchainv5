# SPEC 01 — NỀN TẢNG: MONOREPO & SUBDOMAIN (mốc 1; phần model ở mốc 2)

## Mục tiêu

Dựng **một repo duy nhất** chứa toàn bộ game "Giấc mơ Sổ Chung":

- **Trong lúc làm:** mỗi làng (1 bài học + 2 game) chạy riêng trên một subdomain, để làm song song và thử độc lập.
- **Cuối cùng (spec 10):** gộp tất cả thành **một web** mà gần như không phải sửa code. Muốn vậy, ngay từ đầu nội dung mỗi làng phải là một **gói (package)** để web chính import vào.

Tên miền trong mọi spec viết là `ten-mien.vn`. Thay bằng tên miền thật của bạn.

## 1. Cấu trúc repo

```
so-chung/
├── apps/                         ứng dụng để deploy
│   ├── hub/                      web chính → ten-mien.vn
│   │                             (trang chủ, đăng nhập, cốt truyện, chợ phiên, giáo viên, hội làng)
│   ├── lang-giay/                vỏ chạy riêng Bài 1 → lang-giay.ten-mien.vn
│   ├── lang-det/                 vỏ chạy riêng Bài 2 → lang-det.ten-mien.vn
│   ├── lang-khac-dau/            vỏ chạy riêng Bài 3 → lang-khac-dau.ten-mien.vn
│   └── lang-bac/                 vỏ chạy riêng Bài 4 → lang-bac.ten-mien.vn
├── packages/
│   ├── core/                     dùng chung: giao diện, động cơ 3D, đăng nhập, tiến độ, câu hỏi, logic 4 bài
│   ├── village-lang-giay/        nội dung Bài 1: cảnh làng + màn 1, 2, 3
│   ├── village-lang-det/         nội dung Bài 2: màn 4, 5, 6
│   ├── village-lang-khac-dau/    nội dung Bài 3: màn 7, 8, 9
│   └── village-lang-bac/         nội dung Bài 4: màn 10, 11, 12
├── assets/                       đồ họa (đã có): models, scenes, sprites, story, ui, concept, source
├── supabase/                     migrations SQL, edge functions (spec 02, 09)
├── docs/specs/                   toàn bộ file spec này
└── CLAUDE.md                     hướng dẫn cho AI code (xem 00-PROJECT-INSTRUCTIONS)
```

**Theo mốc:**
- **Mốc 1:** mỗi gói làng chỉ có route trang bài học (`/lang/<id>/man/<n>` của màn bài học). Các màn khác để `coming-soon`.
- **Mốc 2–3:** thêm dần cảnh làng 3D và các game vào đúng gói đó.

## 2. Công nghệ

- **Repo:** pnpm workspaces.
- **Frontend:** Vite, React 19, TypeScript (strict), Tailwind CSS v4.
- **Định tuyến:** react-router, dùng BrowserRouter.
- **3D:** `three`, `@react-three/fiber`, `@react-three/drei`.
- **Đăng nhập và dữ liệu:** `@supabase/supabase-js` và `@supabase/ssr` (xem spec 02).
- **Hiệu ứng, kéo thả:** `motion`, `@dnd-kit/core`.
- **Test:** `vitest` cho toàn bộ hàm logic trong `packages/`. Lệnh `pnpm test` chạy test của mọi gói.
- **Hosting:** Vercel. Mỗi app là một project Vercel riêng, cùng trỏ vào repo này.

## 3. Chuyển code từ web 2D hiện có

1. **Logic 4 bài:** chuyển `logic.ts`, `content.ts` và test của Bài 1–4 vào `packages/core/src/lessons/bai-1` … `bai-4`. Giữ nguyên công thức và số liệu; các test cũ phải vẫn ✅.
2. **Bỏ hẳn Bài 5:** không chuyển code, test hay nội dung nào của Bài 5.
3. **Đổi tên hiển thị trong Bài 3:** người tên "Linh" (khóa riêng 7, khóa công khai 17) đổi thành **"Lan"**, để khỏi trùng với thầy Linh. Số khóa giữ nguyên.
4. **Giao diện:** chuyển các component giao diện dùng chung (Button, FeedbackSheet, LevelIntro, LevelComplete…) vào `packages/core/src/ui`. Phong cách mới ghi ở spec 03.
5. **Đổi nội dung bài cũ cho khớp bối cảnh mới.** Làm một lượt khi chuyển bài; không chỉ đổi giao diện:

| Trong bài giai đoạn 1 | Đổi thành |
|---|---|
| "Linh vật" (lời nhắc, giải thích) | **Bi** nói, kèm chân dung `bi` |
| 🦊 Tí, "Tí" | `{phanDien}`, bỏ emoji, kèm chân dung `ti` |
| 🐢 Bình, "Bình" | "cụ Bình", chân dung `cu-binh` |
| 🐇 Chi, "Chi" | "cô Chi", chân dung `co-chi` |
| "An" | "bác An", chân dung `bac-an` |
| "Dũng" | "chú Dũng", chân dung `chu-dung` |
| "Linh" (khóa riêng 7, ở Bài 3) | "Lan" |
| Nút "Sang Bài N" ở cuối bài | **Mốc 1:** chỉ có "Về bản đồ". **Từ mốc 2:** "Về làng" và "Chơi tiếp: [tên game phụ 1]" (game `coming-soon` thì bỏ nút này) |

**Chỉ đổi chữ hiển thị** (lời thoại, nhãn, tên trên giao diện):
- **Không sửa chuỗi trong test**, cũng không sửa chuỗi dữ liệu được đưa vào hàm băm hay chữ ký.
- Ví dụ: thông điệp "Chuyển 3 xu cho An" ở Bài 3 giữ nguyên. Chữ ký `{r: 20, s: 1}` tính từ đúng chuỗi này; đổi thành "…cho bác An" thì ra `{r: 20, s: 17}` và test chữ ký sẽ đỏ.

**Lời thoại và phần kiến thức:**
- Lời nhân vật dùng từ của thế giới game ("cả làng", "người giữ sổ").
- Các ô kiến thức như "Em có biết?" giữ thuật ngữ thật (node, mạng lưới, blockchain).

**Bỏ câu bị trùng** (khi lời của Bi và lời người dẫn gần như giống nhau, chỉ giữ lời người dẫn ở spec làng):
- **Bài 1, cuối trạm Khó:** bỏ câu của linh vật "Một người không thể sửa nhanh hơn cả mạng lưới…". Bác An nói câu này ở cuối bài.
- **Bài 4, lúc {phanDien} tráo giao dịch:** bỏ câu của linh vật "Chỉ đổi 1 giao dịch mà gốc đổi ngay…". Thầy Linh nói câu này.

## 4. Gói làng (village module)

Mỗi `packages/village-*` export **đúng một đối tượng**:

```ts
// packages/core/src/village.ts
export interface VillageModule {
  id: 'lang-giay' | 'lang-det' | 'lang-khac-dau' | 'lang-bac';
  name: string;                 // "Làng Giấy"
  levels: [number, number, number];  // ví dụ [1, 2, 3]
  routes: RouteObject[];        // route lazy, gắn dưới /lang/<id>
}
```

**Route bên trong một làng:**

| Route | Nội dung |
|---|---|
| `/lang/<id>` | Cảnh làng (khu đi lại có 3 cổng màn) |
| `/lang/<id>/man/<n>` | Từng màn |

**Vỏ chạy riêng `apps/lang-*`:**
- Chỉ gồm: các provider chung (đăng nhập, tiến độ, đồ họa), cộng gói làng gắn ở `/lang/<id>`.
- **Mốc 1** (chưa có cảnh làng):
  - trang `/` và `/lang/<id>` chuyển về `VITE_HUB_URL/ban-do`;
  - chỉ có route màn bài học `/lang/<id>/man/<n>`;
  - cuối bài chỉ có nút "Về bản đồ".
- **Từ mốc 2:** trang `/` chuyển sang `/lang/<id>` (cảnh làng 3D); nút "Về chợ" mở `VITE_HUB_URL`, tức chuyển hẳn sang web chính.

**Web chính `apps/hub`:**
- Lúc mới dựng, cổng mỗi làng trong chợ phiên trỏ tới subdomain của làng đó.
- Khi gộp (spec 10), hub import thẳng 4 gói làng. Cổng làng đổi thành điều hướng nội bộ, bằng cách bật biến `VITE_MERGED=true`.

## 5. Đồ họa dùng chung

**Theo mốc:**
- **Mốc 1:** phần **ảnh** (ảnh nền, ảnh truyện, bản đồ, icon, giấy dó, logo, chân dung), cùng project `assets.ten-mien.vn` và `manifest.json`.
- **Mốc 2:** phần **model** (nén GLB, thu nhỏ texture, giảm mặt).
- **Mốc 3:** tách nền trời cho 2 lớp nền màn 6, làm cùng lúc với màn 6.

**Thư mục `assets/` đã có sẵn** (bạn tạo theo DO-HOA 01–06): `models/`, `scenes/`, `sprites/`, `story/`, `ui/`, cộng hai thư mục chỉ để tham khảo `concept/` và `source/`. Danh sách file thực tế nằm trong `danh-sach-assets3.txt`.

**Về Git:** `assets/` gốc nặng khoảng 600 MB nên **không đưa lên Git**:
- thêm `assets/` vào `.gitignore`; bản gốc cất trên Google Drive;
- chạy `pnpm assets:build` trên máy, rồi **commit thư mục `assets-build/`** (khoảng 40–60 MB). Vercel chỉ cần deploy thư mục này.

**Lệnh `pnpm assets:build`** (script `scripts/assets-build.mjs`, dùng `@gltf-transform/core` và `sharp`). Đọc `assets/`, ghi kết quả ra `assets-build/`. **Không deploy** `concept/`, `source/` và mọi file không phải ảnh hoặc model.

**Xử lý model (`.glb`):**
1. **Mọi model:** `dedup`, `weld`; nén `meshopt`; texture chuyển sang WebP.
2. **Nhân vật:**
   - Texture tối đa **1024**. Hiện mỗi nhân vật có 3 texture, một cái tới 4096×4096.
   - Nếu tổng texture một nhân vật sau nén vẫn trên 2 MB, ghi cảnh báo.
3. **Model có trên 30.000 tam giác:**
   - **không có xương** (6 nhân vật đứng yên, đồ vật): `simplify` xuống khoảng 15.000 tam giác (nhân vật) hoặc khoảng 8.000 (đồ vật). Xuất ảnh chụp trước và sau ra `assets-build/_preview/` để kiểm tra bằng mắt.
   - **có xương:** không simplify, chỉ ghi cảnh báo.
4. **Đồ vật thường:** texture 1024. Cây đa và 4 cổng làng: 2048.

**Xử lý ảnh:**
1. **Chuyển sang WebP:** ảnh nền và ảnh truyện tối đa 1920px chiều ngang, chất lượng 82. Hình rời, icon, ô lá, thẻ bài giữ nền trong suốt, tối đa 1024px (icon 256px).
2. **Riêng `scenes/man-06-doi-xa.jpg` và `man-06-tre-gan.jpg`:**
   - Hai ảnh JPG này cần phần trời trong suốt. Script tách nền theo màu trời: lấy mẫu màu ở 5% hàng trên cùng, pixel nào gần màu đó thì cho trong suốt, làm mềm viền 2px. Xuất ra PNG, rồi chuyển sang WebP có alpha.
   - Kiểm tra bằng mắt trong `_preview/`. Viền xấu thì báo người dùng vẽ lại 2 ảnh này bằng ChatGPT, yêu cầu nền trong suốt.

**Manifest:**
- Ghi `assets-build/manifest.json`, liệt kê đường dẫn và kích thước từng file.
- Code tìm theo **đường dẫn không kèm đuôi file**, ví dụ `scenes/bai-hoc-lang-giay`, nên bản `.png` hay `.jpg` gốc đều dùng được.

**Deploy và tải:**
- `assets-build/` được deploy thành một project riêng tại `assets.ten-mien.vn`:
  - `Access-Control-Allow-Origin: *` cho mọi file;
  - file đã nén có `Cache-Control: public, max-age=31536000, immutable`.
- App đọc đồ họa qua `VITE_ASSETS_URL`. Thiếu file thì dùng hình thay thế, không được làm hỏng trang.

**Dung lượng mục tiêu sau build:**
- Mỗi nhân vật ≤ 2,5 MB; mỗi đồ vật ≤ 1,5 MB; mỗi ảnh nền ≤ 400 KB.
- Tổng cả bộ khoảng 40–60 MB, tải theo từng cảnh.
File trong assets-build/ mang mã băm nội dung trong tên (ten.<hash8>.webp); manifest.json ánh xạ đường dẫn gốc sang tên này và có Cache-Control: no-cache.
## 6. Biến môi trường

| Biến | Ví dụ | Ghi chú |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Spec 02 |
| `VITE_SUPABASE_ANON_KEY` | `eyJ…` | Khóa công khai, được phép để ở frontend |
| `VITE_USERNAME_EMAIL_DOMAIN` | `hs.ten-mien.vn` | Spec 02: tên miền email nội bộ của tài khoản tên đăng nhập (`<ten>@…`); học sinh không thấy, không gửi email |
| `VITE_ASSETS_URL` | `https://assets.ten-mien.vn` | Lúc dev: `http://localhost:5180` |
| `VITE_HUB_URL` | `https://ten-mien.vn` | |
| `VITE_COOKIE_DOMAIN` | `.ten-mien.vn` | Để trống khi chạy localhost |
| `VITE_MERGED` | `false` | Đặt `true` sau khi gộp |

## 7. Deploy trên Vercel

1. Tạo **6 project** từ cùng một repo GitHub. Mỗi project đặt **Root Directory** riêng: `apps/hub`, `apps/lang-giay`, `apps/lang-det`, `apps/lang-khac-dau`, `apps/lang-bac`, `assets-build`.
2. Gắn tên miền:
   - hub: `ten-mien.vn` và `www.ten-mien.vn`;
   - 4 làng: `lang-giay.ten-mien.vn` và tương tự cho 3 làng còn lại;
   - đồ họa: `assets.ten-mien.vn`.
3. Ở nhà cung cấp tên miền, tạo bản ghi DNS theo hướng dẫn Vercel hiện cho từng tên miền (thường là CNAME tới Vercel).
4. Mỗi app có `vercel.json` để mọi đường dẫn đều trả về `index.html` (ứng dụng 1 trang):
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. Nhập biến môi trường của mục 6 vào từng project.

## 8. Chạy trên máy

| Lệnh | Cổng |
|---|---|
| `pnpm dev:hub` | 5173 |
| `pnpm dev:lang-giay` | 5174 |
| `pnpm dev:lang-det` | 5175 |
| `pnpm dev:lang-khac-dau` | 5176 |
| `pnpm dev:lang-bac` | 5177 |
| `pnpm dev:assets` | 5180 (phục vụ `assets-build/` có CORS) |

Thêm `--host` để mở thử bằng điện thoại cùng mạng Wi-Fi.

## Checklist nghiệm thu

**Mốc 1:**
- [ ] `pnpm install`, `pnpm test`, `pnpm build` chạy không lỗi. Test logic 4 bài cũ vẫn ✅. Không còn Bài 5.
- [ ] 6 project đã deploy. Mở `/` hay `/lang/<id>` ở subdomain làng thì chuyển về bản đồ ở hub.
- [ ] Từ bản đồ bấm "Vào" một bài học trên subdomain làng; xong bài bấm "Về bản đồ" quay lại hub được.
- [ ] `pnpm assets:build` phần ảnh: ảnh đã chuyển WebP, có `manifest.json`, không deploy `concept/` và `source/`.
- [ ] Một ảnh trên `assets.ten-mien.vn` tải được từ cả hub lẫn subdomain làng (không lỗi CORS).
- [ ] Đã áp bảng đổi nội dung (Linh thành Lan, các tên, Bi); chuỗi trong test giữ nguyên; test vẫn ✅.

**Mốc 2:**
- [ ] `pnpm assets:build` phần model: texture nhân vật ≤ 1024; model không xương đã giảm mặt; có thư mục `_preview` để soi bằng mắt.
- [ ] Một model trên `assets.ten-mien.vn` tải được từ cả hub lẫn subdomain làng (không lỗi CORS).

**Mốc 3:**
- [ ] 2 lớp nền màn 6 đã tách nền trời trong suốt, hoặc đã báo cần vẽ lại.
