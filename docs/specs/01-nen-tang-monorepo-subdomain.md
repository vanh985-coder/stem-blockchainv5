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
- **Hosting:** tự host trên Windows Server: một image Docker (Caddy) phục vụ cả 5 app và đồ họa, đưa ra Internet bằng Cloudflare Tunnel (mục 7). Không dùng Vercel.

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
| `/lang/<id>` | (Từ bước W1) chuyển sang thế giới mở ở hub: `VITE_HUB_URL/cho?tu=<id>` |
| `/lang/<id>/man/<n>` | Từng màn |

**Vỏ chạy riêng `apps/lang-*`:**
- Chỉ gồm: các provider chung (đăng nhập, tiến độ, đồ họa), cộng gói làng gắn ở `/lang/<id>`.
- **Mốc 1** (chưa có cảnh làng):
  - trang `/` và `/lang/<id>` chuyển về `VITE_HUB_URL/ban-do`;
  - chỉ có route màn bài học `/lang/<id>/man/<n>`;
  - cuối bài chỉ có nút "Về bản đồ".
- **Từ mốc 2:** trang `/` chuyển sang `/lang/<id>` (cảnh làng 3D, giữ nguyên phần `?query`); nút "Về chợ" (menu và cổng làng) mở `VITE_HUB_URL/cho?tu=<id>`, tức chuyển hẳn sang web chính, và ở chợ người chơi xuất hiện ngay trước cổng của làng đó (xem spec 04 mục 3). Cuối màn 1 có "Về làng" và "Chơi tiếp: [tên game 1]" (bỏ khi game 1 `coming-soon`). Mốc 2 mới có Làng Giấy; 3 làng còn lại giữ cách của mốc 1 cho tới mốc 3.
- **Từ bước W1 (thế giới mở):** chợ và 4 làng nằm trong MỘT cảnh 3D ở hub, địa chỉ `/cho` (spec 03 mục 6 "`WorldScene`", spec 04 mục 3). Subdomain của làng chỉ còn **trang bài học và game** (`/lang/<id>/man/<n>`); `/` và `/lang/<id>` của vỏ làng chuyển sang hub `/cho?tu=<id>` (giữ nguyên phần `?query` khác). "Về làng" ở cuối mỗi màn và "Về chợ" đều mở `/cho?tu=<id>` (`villageWorldUrl` trong `config/urls.ts`); khi gộp web (`VITE_MERGED=true`) là đường dẫn nội bộ. `/ban-do` giữ nguyên. Cảnh làng 3D không còn nằm trong gói làng (`packages/village-*` chỉ giữ nội dung, bài học và game); bố cục Làng Giấy chuyển về `packages/core/src/three/world/villages/giay.ts`.

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
- chạy `pnpm assets:build` trên máy, rồi **commit thư mục `assets-build/`** (khoảng 40–60 MB). Docker chỉ cần thư mục này (bỏ `_preview/`).

**Lệnh `pnpm assets:build`** (script `scripts/assets-build.mjs`, dùng `@gltf-transform/core` và `sharp`). Đọc `assets/`, ghi kết quả ra `assets-build/`. **Không deploy** `concept/`, `source/` và mọi file không phải ảnh hoặc model.

**Xử lý model (`.glb`):**
1. **Mọi model:** `dedup`, `weld`; nén `meshopt` (UV 14 bit); texture chuyển sang WebP chất lượng 90. Gỡ `KHR_materials_transmission` và `KHR_materials_volume` (đổi về vật liệu thường, giữ màu gốc; hiện chỉ có `volume` ở 14 model đồ vật, không model nào dùng `transmission`).
2. **Texture tối đa:**
   - **2048:** cả 10 nhân vật; cây đa; 4 cổng làng; nhà (`nha-mai-ngoi`, `nha-mai-tranh`).
   - **1024:** đồ vật còn lại.
3. **Giảm mặt bản chính** (`simplify` có tính UV, pháp tuyến, màu đỉnh; chỉ chế độ chặt, **không** dùng `Permissive`; sai số tối đa 3% kích thước model, để không sinh gai):
   - **không có xương** (đồ vật; nhân vật đứng yên chỉ giảm nếu trên 30.000 tam giác, xuống khoảng 15.000, hiện không có cái nào):
     - đồ vật thường: **30.000** tam giác;
     - cổng làng, cây đa, nhà: **50.000** tam giác;
     - model chỉ có màu đỉnh (`bui-tre`, `khung-cui`, `sap-thap`): **30.000** tam giác.
   - **có xương:** không giảm mặt, chỉ ghi cảnh báo nếu trên 30.000 tam giác.
   - Nếu chế độ chặt dừng ở mức cao hơn mục tiêu thì giữ nguyên và ghi cảnh báo. Hiện có 3 model: `khung-cui` (~134.000 tam giác), `leu-cho` (~67.000), `bui-tre` (~41.700).
4. **Bản vừa (LOD giữa, bước 8b và 8c):** model trong `models/env` và `models/games` có bản chính trên **20.000** tam giác thì thử tạo bản `<tên>-vua` (ví dụ `models/env/cong-lang-giay-vua`) khoảng **15.000** tam giác. CHỈ dùng chế độ chặt của meshopt (sai số tối đa 3%, **không** `Permissive`; không tính lại pháp tuyến), texture **1024** (WebP chất lượng 85). **Chỉ giữ bản vừa khi chế độ chặt xuống được ≤ 25.000 tam giác** (`MID_MAX_TRIS`); dừng cao hơn thì bản vừa chẳng nhẹ hơn bản chính bao nhiêu nên **không tạo, không ghi vào manifest** và `pnpm assets:build` ghi cảnh báo (kết quả được nhớ trong cache để lần build sau không thử lại). Kết quả hiện tại: 9 bản vừa: cổng làng 4 cái 15.000 (0,42 đến 0,51 MB), giếng 15.740 (0,40 MB), `phen-phoi-giay`, `sap-thap`, `xe-cho-hang` 15.000, `xe-bo` 24.010; không tạo cho nhà ngói (chế độ chặt dừng ở 35.906), nhà tranh (41.100), bụi tre (36.244), lều chợ (66.988) và `khung-cui` (134.214). Cây đa (9.126 tam giác) và nhân vật không có bản vừa. Ghi vào manifest như model thường (có `tris`).
5. **Bản xa (LOD):** mỗi model trong `models/env` và `models/games` có thêm bản `<tên>-xa` (ví dụ `models/env/cong-lang-giay-xa`): khoảng **8.000** tam giác (dùng `Permissive`, tính lại pháp tuyến), texture **512** (WebP chất lượng 80). Ghi vào manifest như model thường. Nhân vật không có bản xa.
6. **Kiểm tra bằng mắt:** mỗi model một ảnh `assets-build/_preview/models/<tên>.png` gồm các hình cùng góc nhìn và ánh sáng: gốc | bản chính | bản vừa (nếu có) | bản xa, kèm số tam giác và dung lượng. Ảnh do bộ vẽ phần mềm dựng (không có normal map) nên chỉ để so hình khối và màu; nhân vật có xương vẽ ở tư thế gốc.
6. **Kiểm tra xương và hoạt ảnh:** với `hoc-sinh-nam`, `ti`, `dan-lang-ba-cu`, `dan-lang-nong-dan`, build đọc lại file đã nén và báo lỗi nếu không còn đủ 65 xương Mixamo hoặc thiếu clip ở spec 03 mục 3.2 (có test vitest).
7. **Khi tải bằng `GLTFLoader`:** phải gọi `loader.setMeshoptDecoder(MeshoptDecoder)`, vì file nén `meshopt` bắt buộc cần bộ giải mã. Model không còn nén Draco.

**Xử lý ảnh:**
1. **Chuyển sang WebP:** ảnh nền và ảnh truyện tối đa 1920px chiều ngang, chất lượng 82. Hình rời, icon, ô lá, thẻ bài giữ nền trong suốt, tối đa 1024px (icon 256px).
2. **Riêng `scenes/man-06-doi-xa.jpg` và `man-06-tre-gan.jpg`:**
   - Hai ảnh JPG này cần phần trời trong suốt. Script tách nền theo màu trời: lấy mẫu màu ở 5% hàng trên cùng, pixel nào gần màu đó thì cho trong suốt, làm mềm viền 2px. Xuất ra PNG, rồi chuyển sang WebP có alpha.
   - Kiểm tra bằng mắt trong `_preview/`. Viền xấu thì báo người dùng vẽ lại 2 ảnh này bằng ChatGPT, yêu cầu nền trong suốt.

**Manifest:**
- Ghi `assets-build/manifest.json`, liệt kê đường dẫn và kích thước từng file.
- Code tìm theo **đường dẫn không kèm đuôi file**, ví dụ `scenes/bai-hoc-lang-giay`, nên bản `.png` hay `.jpg` gốc đều dùng được.

**Deploy và tải:**
- `assets-build/` được phục vụ như một site riêng (`sb-assets.blockchainptit.com`, mục 7):
  - `Access-Control-Allow-Origin: *` cho mọi file;
  - file đã nén có `Cache-Control: public, max-age=31536000, immutable`.
- App đọc đồ họa qua `VITE_ASSETS_URL`. Thiếu file thì dùng hình thay thế, không được làm hỏng trang.

**Dung lượng mục tiêu sau build:**
- Mỗi nhân vật ≤ 3 MB; mỗi đồ vật ≤ 2,5 MB; mỗi bản vừa không nặng hơn bản chính; mỗi bản xa ≤ 0,4 MB; mỗi ảnh nền ≤ 400 KB.
- Tổng model của một cảnh ≤ 30 MB (hiện: chợ phiên khoảng 20–23 MB, Làng Giấy khoảng 11–13 MB, màn 2 khoảng 11–13 MB; cả bộ 25 model chính 30,7 MB, 9 bản vừa 4,0 MB và 15 bản xa 4,5 MB; chợ phiên đo ở /cho: Thấp 21,6 MB, Vừa và Cao 23,9 MB vì có thêm 5 bản vừa dùng được, 2,3 MB). Model tải theo từng cảnh; bản vừa chỉ tải khi cảnh dùng.
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

## 7. Deploy bằng Docker + Cloudflare Tunnel

**Mô hình:** một **image Docker** chứa web server Caddy, phục vụ 5 app (đã build) và thư mục đồ họa `assets-build/` ở 6 cổng. **Cloudflare Tunnel** (`cloudflared`, chạy như dịch vụ Windows, cấu hình bằng `config.yml`) đưa từng hostname vào đúng cổng trên server (`http://localhost:18081` …). HTTPS do Cloudflare lo; Caddy chỉ nói HTTP trong máy. Hướng dẫn từng bước cho người làm tay: `docs/DEPLOY.md`.

| Phần | Địa chỉ | Cổng trên server (mặc định, chỉ mở trên 127.0.0.1) | Cổng trong container |
|---|---|---|---|
| hub | `https://stem-block.blockchainptit.com` | 18081 (`HUB_PORT`) | 8081 |
| lang-giay | `https://sb-lang-giay.blockchainptit.com` | 18082 (`LANG_GIAY_PORT`) | 8082 |
| lang-det | `https://sb-lang-det.blockchainptit.com` | 18083 (`LANG_DET_PORT`) | 8083 |
| lang-khac-dau | `https://sb-lang-khac-dau.blockchainptit.com` | 18084 (`LANG_KHAC_DAU_PORT`) | 8084 |
| lang-bac | `https://sb-lang-bac.blockchainptit.com` | 18085 (`LANG_BAC_PORT`) | 8085 |
| assets | `https://sb-assets.blockchainptit.com` | 18086 (`ASSETS_PORT`) | 8086 |

**File liên quan:**
- `Dockerfile` (gốc repo), 2 tầng:
  - tầng build: Node 22, pnpm đúng phiên bản `packageManager` (corepack), `pnpm install --frozen-lockfile`, chạy `pnpm check:text` và `pnpm test` (đỏ thì dừng, không tạo image), rồi `pnpm build`. Biến `VITE_*` truyền bằng **build args**; không chép `.env*` vào image;
  - tầng chạy: `caddy:2-alpine` kèm `dist` của 5 app, `assets-build/` (không có `_preview/`) và `deploy/Caddyfile`.
- `.dockerignore`: `node_modules`, `dist`, `assets/`, `.env*`, `assets-build/_preview/`, `.git`.
- `deploy/Caddyfile`:
  - 5 app: đường dẫn không phải file thì trả `index.html`; `index.html` là `no-cache`; file trong `/assets/` (có mã băm) là `public, max-age=31536000, immutable`; nén zstd/gzip; header `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` tắt camera, micro, định vị;
  - assets: `Access-Control-Allow-Origin: *`; file có mã băm 8 ký tự là `immutable`, còn lại (như `manifest.json`) là `no-cache`; khai báo kiểu `.webp`, `.glb`, `.woff2` (giống `pnpm dev:assets`).
- `deploy/docker-compose.yml`: 1 service, `restart: unless-stopped`, cổng trên server gắn vào `127.0.0.1` lấy từ `deploy/.env` (`HUB_PORT`, `LANG_GIAY_PORT`, `LANG_DET_PORT`, `LANG_KHAC_DAU_PORT`, `LANG_BAC_PORT`, `ASSETS_PORT`; mặc định 18081–18086 để khỏi trùng chương trình khác; cổng bên trong container giữ nguyên 8081–8086), build args lấy từ `deploy/.env` (không commit; mẫu ở `deploy/.env.example`), có healthcheck.

**Biến môi trường khi deploy:** `VITE_HUB_URL`, 4 biến `VITE_LANG_*_URL`, `VITE_ASSETS_URL` là 6 địa chỉ ở bảng trên; `VITE_COOKIE_DOMAIN=.blockchainptit.com`; `VITE_USERNAME_EMAIL_DOMAIN=hs.blockchainptit.com` (cùng giá trị với secret `USERNAME_EMAIL_DOMAIN` của Edge Function, spec 09); `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (chỉ khóa công khai).

**Cookie:** cookie phiên Supabase, `sc_guest` và `sc_pending` đều đặt `Domain=.blockchainptit.com`, `Path=/`, `SameSite=Lax` và `Secure` (khi trang chạy https). Cookie dùng chung cho mọi subdomain `*.blockchainptit.com` đã được chủ dự án chấp nhận (mọi dịch vụ khác trên tên miền này cũng thấy cookie đó). **Tài khoản admin và giáo viên nên dùng hồ sơ trình duyệt riêng** (Chrome Profile hoặc cửa sổ riêng), tách khỏi các việc khác trên tên miền.

**Cập nhật:** `git pull`, rồi dựng lại image và chạy lại (docs/DEPLOY.md, mục "Cập nhật").

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
- [ ] Image Docker dựng được và chạy đủ 6 cổng; Cloudflare Tunnel đưa 6 hostname vào đúng cổng. Mở `/` hay `/lang/<id>` ở subdomain làng thì chuyển về bản đồ ở hub.
- [ ] Từ bản đồ bấm "Vào" một bài học trên subdomain làng; xong bài bấm "Về bản đồ" quay lại hub được.
- [ ] `pnpm assets:build` phần ảnh: ảnh đã chuyển WebP, có `manifest.json`, không deploy `concept/` và `source/`.
- [ ] Một ảnh trên `sb-assets.blockchainptit.com` tải được từ cả hub lẫn subdomain làng (không lỗi CORS).
- [ ] Đã áp bảng đổi nội dung (Linh thành Lan, các tên, Bi); chuỗi trong test giữ nguyên; test vẫn ✅.

**Mốc 2:**
- [ ] `pnpm assets:build` phần model: texture nhân vật 2048; model không xương đã giảm mặt (30.000 / 50.000 tam giác); mỗi model env và games có bản `-xa`, và có bản `-vua` nếu bản chính trên 20.000 tam giác; có ảnh gốc | chính | vừa | xa trong `_preview/models/` để soi bằng mắt. (Bước 15a, đo từ báo cáo `assets:build`: ĐẠT texture 2048 (học sinh nam 1724×2048 theo tỉ lệ gốc), 14/14 model có bản `-xa` (0,18 đến 0,34 MB), 25 ảnh so sánh ở `_preview/models/`, nhân vật ≤ 1,98 MB, đồ vật ≤ 1,70 MB. CHƯA ĐẠT: 3 model không xuống được mục tiêu vì chế độ chặt dừng khi sai số vượt 3% (`env/bui-tre` 41.691, `env/leu-cho` 66.992, `env/khung-cui` 134.198 tam giác) và 5 model trên 20.000 tam giác không có bản `-vua` (bui-tre, khung-cui, leu-cho, nha-mai-ngoi, nha-mai-tranh); `games/man-02-duoi-ti/xe-bo` có bản vừa 24.010 tam giác thay vì 15.000. Cảnh vẫn chạy được nhờ bản xa; làm đẹp hơn cần người dựng lại các model này nhẹ hơn.)
- [ ] Một model trên `sb-assets.blockchainptit.com` tải được từ cả hub lẫn subdomain làng (không lỗi CORS). (Bước 15a: chạy máy: hub 5173 và làng Giấy 5174 đều tải `.glb` từ `pnpm dev:assets` 5180 khác nguồn gốc không lỗi; `Caddyfile` có `Access-Control-Allow-Origin: *`, `Content-Type: model/gltf-binary`, `immutable` cho tên có mã băm. Cần kiểm trên server thật.)

**Mốc 3:**
- [ ] 2 lớp nền màn 6 đã tách nền trời trong suốt, hoặc đã báo cần vẽ lại.
- [x] Hình rời (`assets/sprites/`, mốc 2 bước 14): ảnh gốc do AI tạo có nền ô vuông xám trắng hoặc nền một màu in thẳng vào ảnh (alpha có nhưng 0 điểm ảnh trong suốt). `pnpm assets:build` tự nhận dạng và tách (`scripts/lib/cutout.mjs`, có test): lấy mẫu dải mép ảnh để tìm 1 hoặc 2 màu nền, chỉ giữ điểm ảnh gần màu nền và gần trung tính (hình màu kem, nâu, vàng không bị nhầm), co 2 điểm ảnh để cắt cầu mỏng, loang từ mép ảnh, nở lại trong phạm vi ứng viên, bỏ nền ô vuông lọt trong lỗ của hình (cả hai màu ô vuông, từ 40 điểm ảnh), xóa bụi dưới 60 điểm ảnh và dấu mờ (ngôi sao) của công cụ tạo ảnh ở góc dưới phải, thu hẹp 1 điểm ảnh và làm mềm mép. Ảnh đã trong suốt thật hoặc nền là cảnh thì để nguyên. Vùng trắng/xám bên trong hình không nối với mép không bị xóa. Ảnh xem trước (trước | sau nền tối | sau nền sáng) và `_report.json` ở `assets-build/_preview/sprites/`; ảnh tách chưa sạch được liệt kê cuối phần ảnh của `assets:build`. Chỉ áp dụng cho `sprites/` (thẻ `ui/cards`, lá `ui/tiles` cũng có nền một màu nhưng chưa dùng nên chưa bật).
- [x] Dấu ngôi sao của công cụ vẽ ảnh (mốc 2, bước 14b): hầu hết ảnh AI trong `scenes/`, `story/`, `ui/` có một ngôi sao bốn cánh trắng mờ ở góc dưới phải (tâm cách mép phải và mép dưới 0,156 bề cao ảnh, nửa cạnh khoảng 0,034 bề cao). `pnpm assets:build` tự nhận dạng và xóa (`scripts/lib/watermark.mjs`, có test) chỉ trong một ô góc cố định quanh tâm đó: hai kiểm định (hồi quy độ sáng theo mặt nạ ngôi sao, và bộ lọc khớp Laplacian của nét biên), rồi gỡ lớp phủ trắng theo công thức pixel' = (pixel − 255·a·c) / (1 − a·c) (giữ nguyên hoa văn nền), nội suy dải biên mảnh, hoặc tô lại từ điểm ảnh xung quanh khi không phải lớp phủ trắng. Ảnh xem trước trước | sau ở `assets-build/_preview/watermark/`; danh sách ảnh có dấu ở cuối phần ảnh của `assets:build`. Ảnh không có dấu thì byte không đổi. Bước 15a: cỡ ngôi sao tính theo số điểm ảnh (`s` = làm tròn căn bậc hai của (rộng × cao) / (1376 × 768), tối thiểu 1) thay vì theo bề cao, nên ảnh vuông 2048×2048 (thẻ, chân dung, lá, mặt đất) cũng nhận ra: tổng cộng 45 ảnh có dấu, đều đã xóa. Ba ảnh có dấu quá mờ để nhận dạng chắc chắn (`story/06-lang-giay`, `ui/portraits/lan`, `ui/textures/san-gach`) nằm trong danh sách `FORCE_SPARKLE` của `scripts/assets-build.mjs`: luôn xóa ô góc (gỡ lớp phủ với độ trong điển hình 0,31, hoặc tô lại từ điểm ảnh xung quanh khi không gỡ được), ảnh trước | sau ở `_preview/watermark/`. Còn nghi ngờ: `ui/textures/giay-do` (chưa nhận dạng chắc chắn nên chưa xóa); `story/06-lang-giay` còn một viền rất nhạt.
