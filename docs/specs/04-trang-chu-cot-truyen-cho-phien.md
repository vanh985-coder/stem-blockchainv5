# SPEC 04 — TRANG CHỦ, CỐT TRUYỆN & CHỢ PHIÊN (mốc 1: mục 1, 2, 7; mốc 2: chợ 3D)

Nằm trong `apps/hub`. Cốt truyện đầy đủ ở file `COT-TRUYEN-GIAC-MO-SO-CHUNG.md`. Tên phản diện viết `{phanDien}` (hiện là Tí).

## 1. Trang chủ `/`

Trang 2D, nhẹ, tải nhanh.

- **Đầu trang:** hình logo (`ui/logo-art`) cùng tên game "Giấc mơ Sổ Chung" (chữ do code viết), và một câu: "Mơ về Đại Việt thế kỷ XVI, học bí quyết giữ sổ để tỉnh giấc."
- **Nút:**
  - Chưa đăng nhập: nút chính "Đăng nhập để chơi", nút phụ "Chơi thử".
  - Đã đăng nhập: nút chính "Chơi tiếp", cùng tên học sinh và số Trang Sổ Vàng đã có (0/4). Ở mốc 1, "Chơi tiếp" mở `/ban-do`. Từ mốc 2 thì mở `/cho` (chợ 3D), và trang chủ có thêm liên kết "Bản đồ".
- **Liên kết:** "Đọc truyện", "Hồ sơ"; với tài khoản giáo viên thêm "Trang giáo viên"; "Quyền riêng tư".
- **Nền:** `NenTrangTri` (spec 03 mục 1): ảnh `ui/man-hinh-tai` hơi mờ cùng vài icon trôi chậm; tắt icon khi bật "Giảm chuyển động".

## 2. Trang cốt truyện `/truyen`

Hiện 14 ảnh trong `assets/story/` (`01-ngu-guc` … `14-gio-tay`) theo kiểu hộp thoại visual novel (`VnDialog`, bố cục bên dưới).

**Mỗi lượt:**
- Ảnh ngang 16:9 ở phần trên.
- Bên dưới là lời truyện, đặt trên nền giấy dó. Lời truyện lấy ở bảng sau, chép vào `packages/core/src/content/story.ts`:
  - `{ten}` là tên hiển thị của học sinh (chơi thử thì là "em"); `{Ten}` là cùng giá trị đó nhưng viết hoa chữ đầu, dùng khi đứng đầu câu (chơi thử thì là "Em");
  - `{phanDien}` lấy từ `characters.ts`.

| # | Ảnh | Lời truyện |
|---|---|---|
| 1 | `story/01-ngu-guc` | Tối trước bài kiểm tra về blockchain, {ten} học mãi không hiểu, ngủ gục lúc nào không hay. |
| 2 | `story/02-cuon-vo-sang` | Cuốn vở bìa tím bỗng phát sáng… |
| 3 | `story/03-cho-phien` | {Ten} mở mắt và thấy mình đứng giữa một chợ phiên Đại Việt thế kỷ XVI, thời buôn bán đang phát triển. |
| 4 | `story/04-gap-bi` | Cuốn vở hóa thành Bi: "Muốn tỉnh dậy, cậu phải học bí quyết giữ Sổ Chung của bốn làng. Mỗi làng trao một Trang Sổ Vàng, đủ 4 trang là cậu tỉnh!" |
| 5 | `story/05-ti-chay` | {phanDien}, cậu thiếu niên muốn thành lái buôn giàu nhất vùng, lẻn đi sửa sổ, giả dấu, trộn giao dịch. Sổ các làng lệch nhau, cổng làng đóng hết! |
| 6 | `story/06-lang-giay` | Làng Giấy: Bác An buồn rầu vì có kẻ đã sửa trộm một trang sổ của làng. |
| 7 | `story/07-lang-det` | Làng Dệt: nhà nào cũng giữ một bản sổ, có trang mới là cả làng kéo về đình kiểm tra. |
| 8 | `story/08-lang-khac-dau` | Làng Khắc Dấu: mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình cho mọi người đối chiếu. |
| 9 | `story/09-lang-bac` | Làng Bạc: mỗi ngày hàng trăm khoản bạc qua tay. Thầy Linh gộp chúng lên cây đa thành một con số gốc. |
| 10 | `story/10-ti-tren-cay` | {phanDien} tráo một chiếc lá giao dịch để cuỗm khoản bạc của lái buôn phương xa, nhưng con số gốc đã báo lệch… |
| 11 | `story/11-ti-hoi-cai` | "Hóa ra làm thật mới có lời." {phanDien} xin được làm người giữ sổ của làng. |
| 12 | `story/12-hoi-lang` | Hội làng mở ra. Bốn Trang Sổ Vàng ghép lại thành một cuốn sổ sáng rực… |
| 13 | `story/13-tinh-giac` | {Ten} tỉnh giấc. Ở trang cuối cuốn vở có một con dấu tím mà {ten} không nhớ mình đã đóng. |
| 14 | `story/14-gio-tay` | Cô giáo hỏi: "Vì sao blockchain khó bị sửa lén?" {Ten} giơ tay đầu tiên. |

**Hiển thị:** dùng `VnDialog` (spec 03 mục 1), **14 lượt, mỗi ảnh một lượt**:
- ảnh truyện (16:9) ở phần trên, lời truyện ở dưới (đi qua `fmt()`); nền phía sau là **chính ảnh đang xem**, làm mờ;
- "Tiếp ›" (hoặc →, Enter, Space) sang ảnh kế, "‹" (hoặc ←) lùi lại; tiến trình "x/14";
- ảnh kế tiếp được tải trước; ảnh thiếu thì hiện khung trống kèm lời truyện, không lỗi;
- "Bỏ qua" (hoặc Esc) đi thẳng vào `/ban-do`.

**Lượt cuối (ảnh 14):** nút kết thúc là **"Bắt đầu hành trình"**. Ở mốc 1 dẫn vào `/ban-do`; từ mốc 2 dẫn vào `/cho`.

Trang `/truyen` tải theo route (không nằm trong trang đầu của hub).

**Tái sử dụng:** cùng bộ ảnh và lời này được dùng lại làm cảnh chuyển trong game:
- Ảnh 1–5: mở đầu.
- Ảnh 6–9: mở mỗi làng.
- Ảnh 10–11: cao trào.
- Ảnh 12–14: kết thúc.

## 3. Chợ phiên 3D `/cho`

Cảnh đi lại chính, nằm giữa 4 làng.

### Bố cục

| Hướng | Nội dung |
|---|---|
| Giữa | Cây đa (`env/cay-da`), lều chợ (`env/leu-cho` nhân nhiều bản), giếng (`env/gieng-lang`) |
| Bắc | Cổng **Làng Giấy** |
| Nam | Cổng **Làng Dệt** |
| Tây | Cổng **Làng Khắc Dấu** |
| Đông | Cổng **Làng Bạc**, phía sau là bến sông |

**Bao quanh chợ:**
- Nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh` (nhân bản, đổi màu, tỉ lệ, góc xoay).
- Bụi tre `env/bui-tre`.

**Code tự dựng:**
- Đường đất, ruộng lúa, sông.
- Thuyền gỗ và cầu tàu đơn giản.
- Hàng rào tre, khóm hoa, đống rơm, thúng, chum vại, gánh hàng bày trên sạp.

Xếp theo ảnh `concept-toan-canh` và `concept-cho-phien`. Phải **đủ đông đồ vật** để chợ trông tấp nập.

### Cổng làng

- **Mỗi làng một model riêng:** `env/cong-lang-giay`, `env/cong-lang-det`, `env/cong-lang-khac-dau`, `env/cong-lang-bac`. Không đổi màu.
- **Cổng đã mở:**
  - lúc dev, tương tác thì chuyển sang subdomain của làng;
  - khi `VITE_MERGED=true`, chuyển nội bộ tới `/lang/<id>`.
- **Cổng còn khóa:** code thêm thanh then gỗ và dây đỏ chắn ngang vòm cổng. Tương tác thì hiện "Cổng làng đóng vì sổ đang lệch. Hãy giúp [làng trước] trước nhé."

### HUD

- **Góc trên trái:** dòng "Nhiệm vụ: …".
- **Góc trên phải:** 4 ô Trang Sổ Vàng (icon `trang-vang`; trang chưa có thì mờ), nút menu.
- **Chỉ đường:** mũi tên trên đầu nhân vật chỉ về cổng cần tới.

### Nhân vật ở chợ

- **Bi:** bay theo người chơi; nói chuyện với Bi thì Bi nhắc nhiệm vụ.
- **Bà cụ và chú nông dân:** đi lại theo vài điểm mốc (clip `walk`), dừng lại thì `idle`. Mỗi người có 2–3 câu thoại vui về phiên chợ.
- **Lái buôn:** đứng yên gần bến sông (kiểu không xương, spec 03 mục 3.4).

### Menu

Tiếp tục; Hồ sơ; Cài đặt (chất lượng, âm thanh, giảm chuyển động, chữ to); Đọc lại truyện; Về trang chủ.

## 4. Cảnh mở đầu (lần đầu vào `/cho`)

Bỏ qua được bằng nút "Bỏ qua".

1. Lần lượt chiếu ảnh truyện 1, 2, 3, mỗi ảnh kèm lời truyện; bấm để sang ảnh tiếp.
2. Vào cảnh 3D: Bi bay ra. Bi: "Chào {ten}! Đây là giấc mơ của cậu. Muốn tỉnh dậy, cậu phải học bí quyết giữ Sổ Chung của bốn làng. Mỗi làng trao một Trang Sổ Vàng, đủ 4 trang là cậu tỉnh!"
3. {phanDien} chạy vụt qua chợ, ôm xấp trang sổ. {phanDien}: "Sổ mà có tên {phanDien} giàu nhất vùng thì ai cũng phải nể!" Rồi {phanDien} chạy mất về phía Làng Giấy.
4. Tiếng mõ vang lên, 3 cổng làng đóng sập. Bi: "Chỉ còn cổng Làng Giấy mở. Đi thôi!"
5. Nhiệm vụ mới: "Đến Làng Giấy ở phía bắc gặp bác An."

## 5. Khi nhận Trang Sổ Vàng

**Ở cuối mỗi làng:** người dẫn của làng trao trang, có hiệu ứng trang giấy vàng bay vào ô trên HUD.

**Quay về chợ:**
- Cổng làng kế tiếp mở ra, kèm hiệu ứng.
- Bi nói một câu (bảng dưới), rồi hiện nhiệm vụ mới.

| Trang | Bi nói | Nhiệm vụ mới |
|---|---|---|
| 1 | "Một trang rồi! Cổng Làng Dệt đã mở." | Đến Làng Dệt ở phía nam gặp cụ Bình |
| 2 | "Hai trang! Giờ tới Làng Khắc Dấu." | Đến Làng Khắc Dấu ở phía tây gặp chú Dũng |
| 3 | "Ba trang! Chỉ còn Làng Bạc thôi." | Đến Làng Bạc ở phía đông gặp thầy Linh |
| 4 | "Đủ 4 trang rồi! Cả làng đang mở hội." | Chuyển sang `/hoi-lang` (spec 10) |

## 6. Làm sau (mốc 4)

Tiệm đồ, đồ mặc cho nhân vật, trang sổ giấu quanh chợ để đi tìm, chế độ 2D nhẹ cho máy yếu.

Phần này để trống chỗ, **không làm trong đợt này**.

## 7. Bản đồ 2D `/ban-do` (làm ở mốc 1)

**Công dụng:**
- Là **đường đi chính ở mốc 1**, khi chưa có chợ 3D.
- Từ mốc 2 trở đi, vẫn giữ làm **đường đi nhanh**: giáo viên đỡ mất thời gian trên lớp, máy yếu ở phòng máy cũng chơi được.

**Bố cục:**
- **Nền:** ảnh `ui/ban-do`, đã có sẵn trong `assets/ui/ban-do.jpg` (bản đồ vẽ tay bạn đã tạo theo DO-HOA-05). Tọa độ 4 điểm làng chỉnh bằng trang `/dev/ban-do-hotspots`, giống cách căn làn ở màn 5.
- **4 điểm làng:** đặt trên ảnh theo tọa độ trong `banDoHotspots.ts`. Mỗi điểm có tên làng (code viết), 3 chấm nhỏ ứng với 3 màn, và icon Trang Sổ Vàng nếu đã nhận.
- **Bấm vào một làng:** mở bảng bên cạnh, liệt kê 3 màn của làng đó. Mỗi màn hiện một trong các trạng thái:
  - 🔒 Khóa (kèm dòng "Hoàn thành … để mở");
  - Mở (nút "Vào");
  - ✓ Đã xong (kèm số sao hoặc mốc điểm);
  - "Sắp ra mắt".
- **Bấm "Vào":** mở màn đó trên subdomain của làng.
- **Góc trên:** 4 ô Trang Sổ Vàng, tên học sinh, nút Hồ sơ.

**Giới thiệu làng (lần đầu bấm vào một làng):**
- Lần đầu học sinh bấm vào một làng, **trước khi mở bảng làng**, mở `VnDialog` với chân dung lớn của người dẫn và nền là ảnh `scenes/bai-hoc-<làng>` làm mờ. Mỗi làng 2 lượt lời của người dẫn, rồi **lượt cuối chung**: "Làng có 3 nhiệm vụ cho em. Xong cả ba, làng trao em Trang Sổ Vàng thứ {so}.", kèm **danh sách 3 màn** lấy từ `levels.ts` (tên màn, "Bài học" hoặc "Thử thách", trạng thái khóa / mở / xong / sắp ra mắt). Nút ở lượt cuối: "Xem các màn".
- Người dẫn và lời (chép trong `packages/core/src/content/villageIntro.ts`): Làng Giấy (bác An), Làng Dệt (cụ Bình), Làng Khắc Dấu (chú Dũng), Làng Bạc (thầy Linh).
- **Cờ đã xem** lưu trong `game_state.data` (khóa `villageIntroSeen`, mỗi làng một cờ); khi hai bên gộp thì hợp cờ của cả hai. Chơi thử thì cờ đi theo cookie khách `sc_guest` (trường `vi`, mỗi làng một bit). Đã xem rồi thì bấm làng mở thẳng bảng làng; chưa biết chắc (đang tải dữ liệu từ máy chủ) thì không hiện.
- **Hết giới thiệu** (xong hoặc "Bỏ qua") thì mở bảng làng như cũ. Bảng làng có thêm nút **"Xem lại giới thiệu"**.
- Hàm thuần có test: có hiện giới thiệu không (lần đầu / đã xem) và ghép danh sách nhiệm vụ (`progress/villageIntro.ts`). Phần giới thiệu tải theo route, chỉ khi cần.

**Điện thoại:** bản đồ co theo chiều ngang; bảng danh sách màn hiện thành tấm trượt lên từ dưới.

**Trong game:** menu của chợ 3D và của các làng có mục "Bản đồ" để mở trang này.

## Checklist nghiệm thu

- [ ] Trang chủ tải nhanh; hiện đúng nút theo trạng thái đăng nhập.
- [ ] `/ban-do`: 4 làng hiện đúng trạng thái từng màn theo tiến độ; bấm "Vào" mở đúng màn trên subdomain của làng.
- [ ] Lần đầu bấm một làng thì hiện giới thiệu làng (lượt cuối có danh sách 3 màn); lần sau mở thẳng bảng làng; bảng làng có "Xem lại giới thiệu".
- [ ] Trang chủ, `/ho-so`, `/dang-nhap`, `/dang-ky`, `/quyen-rieng-tu` có nền trang trí; bật "Giảm chuyển động" thì icon đứng yên (ẩn).
- [ ] `/truyen` hiện đủ 14 lượt kiểu visual novel (nền là ảnh đang xem làm mờ); ảnh thiếu thì hiện khung trống có lời truyện, không lỗi trang; lượt cuối có nút "Bắt đầu hành trình" dẫn vào `/ban-do`.
- [ ] `/cho`:
  - cảnh mở đầu chạy đúng và bỏ qua được;
  - chỉ cổng Làng Giấy mở;
  - bấm cổng thì sang được subdomain Làng Giấy.
- [ ] HUD hiện đúng số Trang Sổ Vàng theo tiến độ đã lưu.
- [ ] Đạt ít nhất 30fps ở mức Thấp trên điện thoại tầm trung.
