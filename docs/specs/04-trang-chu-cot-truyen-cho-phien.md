# SPEC 04 — TRANG CHỦ, CỐT TRUYỆN & CHỢ PHIÊN (mốc 1: mục 1, 2, 7; mốc 2: chợ 3D)

Nằm trong `apps/hub`. Cốt truyện đầy đủ ở file `COT-TRUYEN-GIAC-MO-SO-CHUNG.md`. Tên phản diện viết `{phanDien}` (hiện là Tí).

## 1. Trang chủ `/`

Trang 2D, nhẹ, tải nhanh.

- **Đầu trang:** hình logo (`ui/logo-art`) cùng tên game "Giấc mơ Sổ Chung" (chữ do code viết), và một câu: "Mơ về Đại Việt thế kỷ XVI, học bí quyết giữ sổ để tỉnh giấc."
- **Nút:**
  - Chưa đăng nhập: nút chính "Đăng nhập để chơi", nút phụ "Chơi thử".
  - Đã đăng nhập: nút chính "Chơi tiếp", cùng tên học sinh và số Trang Sổ Vàng đã có (0/4). Ở mốc 1, "Chơi tiếp" mở `/ban-do`. Từ mốc 2 thì mở `/cho` (chợ 3D), và trang chủ có thêm liên kết "Bản đồ" (đã làm ở bước 8 và 8b: "Chơi thử" và đăng nhập xong cũng mở `/cho`, kể cả đăng nhập mà không có `next`).
- **Liên kết:** "Đọc truyện", "Hồ sơ"; với tài khoản giáo viên thêm "Trang giáo viên"; "Quyền riêng tư".
- **Nền:** `NenTrangTri` (spec 03 mục 1): ảnh `ui/man-hinh-tai` hơi mờ cùng icon bộ `lang` trôi chậm; tắt icon khi bật "Giảm chuyển động".

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
- Nền là màu ấm theo chủ đề đổi theo lượt (1–2 `mo`: tím than → tím nhạt; 3–11 `lang`: giấy dó → be ấm; 12–14 `hoi`: cam nhạt → vàng), không có lớp phủ tối; ảnh truyện đang xem làm mờ chỉ phủ khoảng 35%; icon trôi chậm của bộ. Đổi chủ đề thì màu và icon chuyển dần khoảng 0,6 giây (spec 03 mục 1, `NenTrangTri`).

**Lượt cuối (ảnh 14):** nút kết thúc là **"Bắt đầu hành trình"**. Ở mốc 1 dẫn vào `/ban-do`; từ mốc 2 dẫn vào `/cho` (đã làm ở bước 8; "Bỏ qua" vẫn vào `/ban-do`).

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

**Bản làm ở mốc 2 (bước 7, route `/cho`, chưa nối từ trang chủ):** chợ ĐƠN GIẢN, đủ đồ vật chính; chợ đông đồ vật làm ở mốc 4.
- **Từ làng về chợ** (`/cho?tu=<id làng>`): **từ bước W1** người chơi xuất hiện TRONG làng đó, cạnh 3 biển gỗ (`villageSpawn` trong `worldLayout.ts`, có test); `tu` sai hoặc không có thì dùng chỗ xuất hiện mặc định dưới đây. (Trước W1: cách cổng 3,8 về phía sân chợ.)
- **Tọa độ:** người chơi xuất hiện ở phía nam cây đa (0, −10) và nhìn về +Z, nên **Bắc = +Z, Nam = −Z, Tây = +X, Đông = −X**. Cây đa ở gốc. Vùng đi lại bán kính 42; cổng cách tâm 30; sân chợ bán kính 14; đường rộng 6.
- **Cổng:** mặt trước quay về sân chợ. Bắc Giấy (0, 30), Nam Dệt (0, −30), Tây Khắc Dấu (30, 0), Đông Bạc (−30, 0). Hai bên cổng là vật cản, lối giữa đi qua được (cổng mở/khóa làm ở bước sau).
- **Bao quanh:** 12 đến 15 lều chợ, giếng, 7 nhà mái ngói và 7 nhà mái tranh trở lên, 14 đến 20 bụi tre; đồ nhỏ do code dựng (chum vại, đống rơm, khóm hoa). Sinh bằng bộ ngẫu nhiên có seed (`three/cho/marketLayout.ts`, hàm thuần có test: không đè lên đường, không đè nhau, 4 cổng và bến tàu luôn tới được từ chỗ xuất hiện).
- **Đông:** sau cổng Bạc là bến sông (đường ra bến tàu ván gỗ rộng 3,4, thuyền gỗ có mui lá, bờ đá). Sông là vật cản ngoài bến tàu. Ruộng lúa phủ ngoài biên, đồi xa ở chân trời, hàng rào tre quanh rìa.
- **Va chạm và mặt cầu (bước 7b, 8d):** vật cản của nhà, lều, giếng, cổng, tre dựng theo chân tường thật (xem spec 03 mục 3.7); **cây đa**: vật cản là mép nền rễ to nhô cao (bán kính khoảng 6), người chơi không đi lên nền rễ được, lều xếp ra ngoài nền. Sông có vật cản dọc bờ (trừ lối lên cầu), cuối cầu và hai bên cầu có lan can vô hình; đá bờ sông có vật cản. Cầu tàu là sàn đặc cao 0,45 có dốc lên ở đầu cầu; người chơi đứng đúng mặt sàn, nhảy tính từ mặt sàn. **Hàng rào tre quanh rìa là chuỗi hộp mỏng**, đồ nhỏ do code dựng cao hơn 0,3 có vật cản sát hình (trừ khóm hoa). `?debug=colliders` để soi.
- **Người:** 4 dân làng (bà cụ, chú nông dân xen kẽ) đi lại trên 4 con đường và là vật cản tròn; lái buôn đứng gần bến sông.
- **Bước 8 (đã làm):** cổng mở/khóa theo tiến độ, HUD, Bi nhắc nhiệm vụ, dân chợ nói chuyện, menu thật, mũi tên chỉ đường (xem các mục bên dưới). Lều chợ quây quanh gốc cây đa theo ảnh `concept-cho-phien` (vòng 5,5 đến 14 quanh cây; vòng ngoài 13 đến 22 nếu hết chỗ); cây đa chỉ có gốc chính là vật cản (bán kính 2,5).
- **Quanh mỗi cổng làng (bước 8d):** không có nhà và bụi tre trong 8 đơn vị quanh tâm cổng; thay bằng đồ gợi nghề của làng, nằm hai bên đường (cách trục đường từ 5,6, ngoài dải đường rộng 4,4 mỗi bên) và phía sân chợ của tường cổng, có vật cản đầy đủ và không chắn đường đất tới cổng: **Giấy (Bắc)** 3 phên phơi giấy (`env/phen-phoi-giay`, nằm trên giá cao 0,85) và 4 chồng giấy; **Dệt (Nam)** 1 khung cửi (`env/khung-cui`) và 7 cuộn vải nhiều màu; **Khắc Dấu (Tây)** 4 khối đá và 2 bàn đá khắc; **Bạc (Đông)** 3 hòm gỗ, 3 thúng, 3 chum. Vị trí khai báo theo khung của cổng (`GATE_DECOR`, `gateDecorWorld`). Bản chính khung cửi (134.000 tam giác) chỉ dùng khi cách camera dưới 7 (Vừa) hay 10 (Cao); xa hơn dùng bản xa.
- **Chưa làm:** cảnh mở đầu (mục 4, mốc 4). Hiệu ứng nhận Trang Sổ Vàng và mở cổng đã làm ở bước 15a (mục 5).

### Cổng làng

- **Mỗi làng một model riêng:** `env/cong-lang-giay`, `env/cong-lang-det`, `env/cong-lang-khac-dau`, `env/cong-lang-bac`. Không đổi màu.
- **Cổng đã mở:**
  - (Từ bước W1) cổng đã mở thì đi thẳng qua, không còn bấm E hay chuyển trang: làng nằm trong cùng cảnh `/cho`, sau cổng. Chỉ cổng đang đóng mới có vật tương tác. (Trước W1: `gateUrl` chuyển sang subdomain; nay thay bằng `villageWorldUrl(urls, id, merged)` dùng cho "Về làng" / "Về chợ".)
- **Cổng còn khóa:** code thêm thanh then gỗ và dây đỏ chắn ngang vòm cổng. Tương tác thì hiện "Cổng làng đóng vì sổ đang lệch. Hãy giúp [làng trước] trước nhé."
  - (Bước 8: lời của Bi trong hộp thoại; thanh then gỗ, hai thanh ngang, hai sợi dây đỏ bắt chéo và chùm tua do code dựng (`GateBarrier.tsx`); cổng đóng có vật cản mỏng chắn kín lối đi. Cổng thứ k mở khi có k Trang Sổ Vàng (`computeUnlock().villageOpen`), tài khoản giáo viên mở hết; hàm thuần ở `three/cho/marketQuest.ts`. Lời nhắc: "E: Vào Làng Giấy" (mở) hay "E: Xem cổng Làng Dệt" (đóng).)

### HUD

- **Góc trên trái:** dòng "Nhiệm vụ: …".
- **Góc trên phải:** 4 ô Trang Sổ Vàng (icon `trang-vang`; trang chưa có thì mờ), nút menu.
- **Chỉ đường:** mũi tên trên đầu nhân vật chỉ về cổng cần tới.
- (Bước 8: `MarketHud.tsx`. Nhiệm vụ lấy từ `content/dialogues.ts` (`NHIEM_VU`, mục 5; 0 trang là "Đến Làng Giấy ở phía bắc gặp bác An."; đủ 4 trang là "Cả làng đang mở hội. Hãy đến dự hội làng nhé!"). 4 ô Trang Sổ Vàng theo `unlock.goldenPages`. Mũi tên là mũi tên vàng dẹt bay nhấp nhô (đứng yên khi "Giảm chuyển động"), quay mượt về cổng của nhiệm vụ, ẩn khi tới gần cổng 6 đơn vị hoặc đủ 4 trang. Nút Menu: máy tính nhả khóa chuột rồi menu hiện ra, điện thoại bật menu.)

- **Bước 16:** thêm nút **?** ("Hướng dẫn chơi") cạnh nút Menu (`onGuide`). Lần đầu vào `/cho` tự mở phần "Đi lại và camera" của Hướng dẫn chơi một lần (spec 03 mục 3.8; chờ chuỗi mở cổng xong nếu đang có).

### Nhân vật ở chợ

- **Bi:** bay theo người chơi; nói chuyện với Bi thì Bi nhắc nhiệm vụ.
  - (Bước 8: E gần Bi (vật dự phòng) mở hộp thoại 2 lượt có chân dung: câu Bi nói của bảng mục 5 (`BI_NHAC_NHIEM`), rồi "Nhiệm vụ của {ten} bây giờ: …".)
- **Bà cụ và chú nông dân:** đi lại theo vài điểm mốc (clip `walk`), dừng lại thì `idle`. Mỗi người có 2–3 câu thoại vui về phiên chợ.
  - (Bước 8: 4 dân làng đi lại, mỗi người 3 câu trong `content/dialogues.ts` (`MARKET_TALKERS`); E gần họ mở `VnDialog` có chân dung bà cụ hoặc chú nông dân. Trong lúc nói chuyện họ đứng yên quay mặt về người chơi; người chơi đứng chắn đường trong 1,5 phía trước thì họ dừng lại nhường, chờ rồi đi vòng (spec 03 mục 3.7). Lái buôn chỉ đứng yên, chưa nói chuyện.)
- **Lái buôn:** đứng yên gần bến sông (kiểu không xương, spec 03 mục 3.4).

### Menu

Tiếp tục; Hồ sơ; Cài đặt (chất lượng, âm thanh, giảm chuyển động, chữ to, độ nhạy chuột); Đọc lại truyện; Bản đồ; **Hướng dẫn chơi** (bước 16, mở hộp hướng dẫn); Về trang chủ.

(Bước 8: `MarketMenu.tsx`, thay hộp Menu tạm. Hiện khi nhả khóa chuột sau khi đã chơi, hoặc khi bấm nút Menu ở HUD (lúc chưa khóa thì hiện luôn). "Tiếp tục" khóa chuột lại ngay trong sự kiện bấm; bấm nền ngoài hộp cũng là tiếp tục. "Cài đặt" dùng lại `SettingsPanel` (có đủ 5 mục). Hồ sơ → `/ho-so`, Đọc lại truyện → `/truyen`, Bản đồ → `/ban-do`, Về trang chủ → `/`.)

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

**Bản làm (mốc 2, bước 15a):**
- **Cờ chiếu một lần**, mỗi làng một cờ trong `game_state.data` (chơi thử: một bit trong cookie `sc_guest`), hợp cờ khi gộp tiến độ: `goldenSeen` (cảnh người dẫn trao trang ở làng; cookie `gs`) và `gateOpenSeen` (hiệu ứng mở cổng ở chợ; cookie `go`). Hàm thuần `shouldShowGolden`, `pendingGateOpening` ở `progress/villageIntro.ts`, có test (`goldenFlags.test.ts`). Tài khoản giáo viên không chiếu.
- **Ở làng** (spec 05 "Kết thúc làng"): người dẫn trao trang, hàng 4 ô Trang Sổ Vàng có trang vừa nhận bay vào, HUD nhấp sáng ô đó; lượt cuối nút "Về chợ" sang `/cho?mo=<id làng>`; "Bỏ qua" ở lại làng.
- **Ở thế giới mở** (từ bước W1, `WorldPage`; chạy khi người chơi tới gần cổng Dệt, cách dưới 12, lần đầu sau khi nhận Trang Sổ Vàng 1; `?mo=<id làng>` giữ làm cách kiểm tra: người chơi xuất hiện cách cổng 8,5 đơn vị, quay mặt về cổng, `gateApproachSpawn`): chờ 0,9 giây; then gỗ và dây đỏ rơi xuống nằm trên đất (`barrierFall` ở `gateFall.ts`, hàm thuần có test: thanh trên rơi trước, rồi thanh dưới, dây đỏ và chùm tua; khoảng 1,9 giây, kèm tiếng vút và tiếng đập; bật "Giảm chuyển động" thì không có hoạt cảnh, cổng mở ngay); rồi Bi nói câu của bảng trên và dòng "Nhiệm vụ của {ten} bây giờ: …". Dòng nhiệm vụ và mũi tên chỉ đổi sang cổng mới sau khi Bi nói xong. Trạng thái chuỗi nằm ở `data-seq` của phần tử gốc (idle, wait, fall, talk, done) để kiểm tra bằng trình duyệt. Vào `/cho` bằng đường khác (không `?mo=`) mà hiệu ứng còn chờ thì Bi báo ngay, không có hoạt cảnh rơi (cổng đã mở sẵn). Chiếu xong ghi cờ `gateOpenSeen` nên không bao giờ chiếu lại.

## 5b. Thế giới mở (mốc 2, bước W1)

Chợ và 4 làng nằm trong một cảnh 3D ở hub, địa chỉ vẫn `/cho` (kỹ thuật: spec 03 mục 6 "`WorldScene`").
- **Sơ đồ** (nhìn từ trên, Bắc = +Z lên trên, Tây = +X sang trái màn hình khi nhìn từ phía nam): chợ ở giữa bán kính 42; Bắc Giấy, Nam Dệt, Tây Khắc Dấu, Đông Bạc; mỗi hướng một con đường đất dài 30 từ rìa chợ tới cổng làng (cách tâm chợ 72). Đường sang Bạc đi qua một cây cầu gỗ bắc qua sông ở phía đông chợ. Xem `/cho?cam=top` để nhìn cả thế giới từ trên cao.
- **Cổng dời ra đầu mỗi làng.** Rìa chợ chỉ còn lối ra đường và **biển chỉ đường** gỗ ghi tên làng. Cổng làng chưa mở: có then gỗ, dây đỏ; thấy làng từ ngoài, không vào được; bấm E hiện "Cổng làng đóng…" như cũ.
- **Mở đầu làng:** cảnh mở đầu và "Em có biết?" của làng chạy khi người chơi lần đầu bước qua cổng làng. Cảnh mở cổng Làng Dệt (bước 15a) chạy khi người chơi tới gần cổng Dệt lần đầu sau khi nhận Trang Sổ Vàng 1; dòng nhiệm vụ đổi ngay sau cảnh trao trang.
- **Mũi tên dưới chân:** chỉ theo đường tới mục tiêu nhiệm vụ, ẩn khi gần mục tiêu; mũi tên trên đầu của chợ (bước 8) được thay bằng mũi tên này.
- **Làng Giấy mở rộng (bước W2):** làng bán kính 35 mở ra phía sau cổng (cổng vẫn cách tâm chợ 72, tâm làng cách tâm chợ 107): đại lộ từ cổng, khu giữa làng (ba biển, bác An), xưởng làm giấy, khu nhà ở, ao, đình, cây đa, ruộng và 3 dân làng (chi tiết spec 05). Mũi tên dưới chân đi theo đường nhỏ trong làng tới từng biển và tới bác An. `?tu=lang-giay` đưa người chơi tới (0, −14,5) trong làng, ngay trước ba biển.
- **3 làng chưa dựng** (Dệt, Khắc Dấu, Bạc): cổng đúng model, vài nhà, bụi tre và một biển "Học cùng [người dẫn]" dẫn vào bài học (màn 4, 7, 10); game để "Sắp ra mắt". Nội dung 3D của 3 làng này làm ở bước W2 và mốc 3.
- **"Về làng" / "Về chợ"** cuối mỗi màn và trong menu đều mở `/cho?tu=<id>`; `/ban-do` giữ nguyên.

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
  - cảnh mở đầu chạy đúng và bỏ qua được; (CHƯA LÀM: mục 4 để mốc 4)
  - chỉ cổng Làng Giấy mở; (đạt, bước 15a: tài khoản mới: bấm E ở cổng Làng Dệt hiện "Cổng làng đóng vì sổ đang lệch. Hãy giúp Làng Giấy trước nhé.")
  - cổng đã mở thì đi thẳng vào làng, không chuyển trang. (đạt, bước W1: làng nằm trong cùng cảnh; bài học và game vẫn ở subdomain của làng, cần thử trên server)
- [x] Nút ? và mục "Hướng dẫn chơi" trong Menu mở hướng dẫn; lần đầu vào `/cho` tự mở phần "Đi lại và camera", tải lại thì không mở lại. (Bước 16, kiểm bằng Chrome.)
- [x] HUD hiện đúng số Trang Sổ Vàng theo tiến độ đã lưu. (Bước 15a: tiến độ 0 trang thì 4 ô "Chưa nhận"; sau khi xong màn 3 thì ô 1 "Đã nhận", ô 2 đến 4 "Chưa nhận".)
- [ ] Đạt ít nhất 30fps ở mức Thấp trên điện thoại tầm trung. (Bước 15a, `/cho` bản build trên máy tính, mức Thấp: 146 fps khi vsync 144 Hz, 519 fps không vsync, 161 fps khi làm chậm CPU 4 lần; 202 nghìn tam giác, 39 draw call. Còn cần thử trên điện thoại thật.)
