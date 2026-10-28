# P2b — thẻ "Em có biết?" chưa nhặt trên bản đồ (28/10/2026)

## Làm gì

Hiện hình thoi vàng (cùng ký hiệu `MapGlyph` với bản đồ trong game) cho mọi thẻ chưa nhặt:

| Nơi | Phạm vi | Cách đặt |
|---|---|---|
| Bản đồ lớn (phím M / chạm bản đồ nhỏ) | cả 4 làng, kể cả khi em đang ở chợ | đúng tọa độ thế giới của từng cuộn giấy |
| Bản đồ nhỏ | thẻ của cả 4 làng, **chỉ vẽ thẻ nằm trong vòng đang hiện** (`placeMarker().visible`) | đúng tọa độ, cả chế độ hướng bắc và xoay theo hướng nhìn |
| `/ban-do` | cả 4 làng | quanh điểm làng của ảnh vẽ tay (xem "Giới hạn") |

- Một nguồn dữ liệu: `LOCAL_VILLAGES[...].scrolls`, đổi sang tọa độ thế giới bằng `placeVillage` (cùng phép với `assembleWorld`). Không chép tọa độ.
- Thẻ đã nhặt biến mất ở mọi nơi: cùng mặt nạ `knowCards` hiệu lực với cuộn giấy trong cảnh 3D. Không đổi cơ chế nhặt, mở khóa, tiến độ.
- Chú thích có chữ ở cả hai nơi lớn: bản đồ lớn (mục "Thẻ "Em có biết?" chưa nhặt" trong Chú thích) và `/ban-do` (chip có hình + "còn n/16 thẻ ở cả bốn làng", kèm lời đọc màn hình theo làng). Chữ ở `content/minimap.ts` (`banDoThe`).
- Phân biệt với cổng (ô vuông có vòm/ổ khóa), biển màn (hình tròn có ✓ / mũi tên / khóa) và người chơi (mũi tên tím): thẻ là hình thoi vàng viền nâu có hai nét trắng, khác về HÌNH chứ không chỉ về màu.

Tệp mã: `packages/core/src/three/world/map/{mapMarkers,miniMapFrame,MiniMap.tsx,banDoScrolls}.ts`, `content/minimap.ts`, `apps/hub/src/ban-do/{BanDoPage,ScrollMarks}.tsx`. Không sửa dựng cảnh 3D.

## Giới hạn của `/ban-do` (nói thẳng)

`/ban-do` là ảnh vẽ tay **không theo tỉ lệ**, mỗi làng chỉ có một điểm, và chữ tên làng (cùng 3 chấm màn) chiếm gần hết vùng quanh điểm đó. Nên:
- thẻ được đặt **quanh làng theo hướng la bàn thật** của nó trong làng (bắc ở trên, đông bên phải), thu nhỏ đều: bán kính làng 125 ↔ 11 % bề ngang ảnh;
- thẻ nào vướng chữ tên làng, mép ảnh hay thẻ khác thì được **dời lên mép khung chữ của làng mình** theo hướng gần hướng thật nhất còn trống (`layoutScrollIcons`). Trên cả 3 cỡ kiểm, **không thẻ nào còn ở đúng vị trí công thức** (0/16): hướng la bàn lệch trung bình **3° (1366×768), 24° (360×800), 7° (844×390)**, lớn nhất 7°, 90°, 34°;
- vì vậy `/ban-do` cho biết "làng nào còn thẻ và thẻ nằm hướng nào trong làng", **không** chỉ đúng chỗ. Vị trí chính xác chỉ có ở bản đồ lớn và bản đồ nhỏ (đã kiểm khớp vật thể thật ở dưới).

## Kết quả kiểm (`node scripts/p2b-check.mjs`, bản build có cầu nối đo, Chrome headless, WebGL phần mềm)

**123 kiểm đạt** (1366×768: 45, 360×800: 39, 844×390: 39). Số đo từng kiểm: `ket-qua.json`; danh sách ảnh: `anh.json`. Chuột ở 1366×768, chạm giả lập ở hai cỡ còn lại (`Touchscreen.tap`; mở bản đồ lớn bằng chạm bản đồ nhỏ).

| Yêu cầu | Kết quả |
|---|---|
| Khách mới: đủ 16 vị trí | `/ban-do` 16 biểu tượng (mỗi làng 4); bản đồ lớn 16 khi em đứng ở chợ, tọa độ trùng tọa độ thật từng cái; chú thích "còn 16/16" |
| Đã nhặt một phần / tất cả | mặt nạ Giấy 2 thẻ, Dệt đủ, Khắc Dấu 0, Bạc 1: đúng 9 thẻ còn lại đúng bộ, chú thích "còn 9/16", lời đọc "2, 0, 4, 3"; đủ thẻ: 0 biểu tượng, chú thích "đã nhặt đủ" |
| Khớp vật thể thật | cả 4 làng: 4 vật tương tác (cuộn giấy trong cảnh 3D, `__worldInteractables`) trùng tọa độ ký hiệu; đứng ngay chỗ từng thẻ (16 lần) thì ký hiệu nằm giữa bản đồ nhỏ, lệch 0,00 px |
| Bản đồ nhỏ, hướng bắc và xoay | 5 chỗ đứng/hướng nhìn × 2 chế độ: vị trí khớp công thức chiếu (lệch lớn nhất 0,03 px và 0,06 px) và chỉ vẽ đúng các thẻ trong vòng; ở chợ: 16 ký hiệu trong DOM, 0 thẻ vẽ (không thẻ nào trong vòng 88) |
| Nhặt thẻ thật (phím E, "Cất vào sổ", 1366×768) | bản đồ nhỏ còn 15 ký hiệu; mở lại bản đồ lớn: 15, thiếu đúng thẻ vừa nhặt, Làng Giấy 1/4 |
| Tải lại trang | cookie khách đã lưu; bản đồ lớn và `/ban-do` vẫn 15, không có thẻ đã nhặt |
| Đổi người chơi | cookie khách mới thấy lại đủ 16 thẻ (không mang thẻ người trước sang) |
| Chuột/chạm | bấm/chạm nút làng sát biểu tượng thẻ vẫn mở bảng làng (lớp phủ `pointer-events: none`) |
| Bố cục `/ban-do` | không biểu tượng nào đè chữ tên làng, không hai biểu tượng đè nhau, tất cả nằm trọn trong ảnh, hình ≥ 20 px (27 px ở 1366); chú thích ở góc dưới trái bản đồ (1366) hoặc ngoài bản đồ, phía trên (màn hẹp) và không đè biểu tượng nào |
| Chữ to + giảm chuyển động | bản đồ nhỏ nhân 1,15 (207 / 138 px) vẫn có ký hiệu; `/ban-do` và bản đồ lớn đủ 16 biểu tượng và chú thích; không phần tử nhấp nháy |

**Ảnh** (26 file, lớn nhất 158.305 byte, đều dưới 300 KB): `ban-do-khach-moi`, `ban-do-mot-phan`, `ban-do-du-the`, `ban-do-chu-to` (cả 3 cỡ), `ban-do-lon-khach-moi`, `ban-do-lon-chu-to`, `ban-do-nho-bac`, `ban-do-nho-xoay` (cả 3 cỡ), `nhat-the-hop-thoai` và `ban-do-lon-sau-khi-nhat` (1366×768).

### Lưu ý khi chạy kiểm

Máy đo dựng 3D phần mềm rất chậm nên bản đồ nhỏ (cập nhật 10 lần/giây) có lúc trễ nhịp; script chờ tới khi khớp rồi mới tính. Khi viết script, hai chỗ đo sớm đã bị lộ ra và dẫn tới sửa mã thật: (1) biểu tượng đè chữ tên làng và chú thích đè làng Dệt ở màn nhỏ (trước khi có `layoutScrollIcons` và chú thích đặt ngoài bản đồ); (2) khung chữ tên làng đổi cỡ khi phông chữ tải xong mà không đo lại (nay đo lại theo `ResizeObserver` của từng nút làng và `document.fonts.ready`).

## Test và lệnh bắt buộc

- `pnpm test --maxWorkers=2`: **2143 pass, 1 skipped** (195 file pass, 1 skipped). Test mới/sửa: `mapMarkers` (16 thẻ mọi làng, đã nhặt biến mất, đúng tọa độ), `miniMapFrame` (phạm vi vẽ, hướng bắc và xoay cho cùng kết luận), `banDoScrolls` (16 điểm, trùng bố cục thế giới, lọc đã nhặt, hướng bắc/đông, `layoutScrollIcons`: không đè chữ/mép/nhau, tất định), `ScrollMarks` (dựng tĩnh), `banDoNho` (14/16 khi chỉ Làng Giấy nhặt 2).
- `pnpm typecheck` đạt; `pnpm check:text` sạch (430 file); `pnpm build` đạt (5 app, `VITE_MERGED=true`).

## Bundle (build thường, trước/sau P2b, tổng JS của hub)

Tổng **+10.176 byte / +5.533 byte gzip** (2.764.071 → 2.774.247). Phần lớn là xáo trộn tách chunk của Vite. Đáng chú ý:

- entry `index`: 237.402 → 237.673 (+271 byte);
- `BanDoPage`: 8.047 → 8.828 (+781);
- chunk lười mới `ScrollMarks` 4.465 byte (2.170 gzip), chỉ tải ở `/ban-do`;
- dữ liệu bố cục làng nay nằm ở chunk dùng chung `worldFrames` 67.357 byte (23.444 gzip), vừa cho thế giới 3D vừa cho `/ban-do`; chunk thế giới giảm 1,5 KB. **Chi phí thật cho trang `/ban-do`: tải thêm khoảng 71,8 KB (25,6 KB gzip) sau khi bản đồ đã hiện** (tải lười, không chặn việc hiện bản đồ);
- CSS: 100.625 → 101.829 (+1.204).

Không sửa dựng cảnh 3D nên **không đo FPS**. Bản đồ nhỏ chỉ thêm một `setAttribute('display')` cho tối đa 16 ký hiệu thẻ mỗi 100 ms.

## Chưa xác minh

- Thiết bị thật, Safari/iPhone, trình đọc màn hình; chạm thật chỉ giả lập bằng Chrome.
- **Đổi tài khoản thật (Supabase)**: không có khóa Supabase ở máy đo, nên chỉ kiểm "khách mới thấy lại đủ 16 thẻ" và logic dựa hoàn toàn vào tiến độ của người đang đăng nhập (không có bộ nhớ đệm mức module). Chưa thử đăng xuất rồi đăng nhập người khác.
- Nhặt thẻ thật chỉ lái bằng bàn phím ở 1366×768; hai cỡ cảm ứng kiểm thẻ còn lại qua cookie tiến độ (không dùng nút bàn tay trên màn hình).
- Thẻ của làng chưa mở khóa vẫn hiện (theo yêu cầu "cả 4 làng"); chưa hỏi chủ dự án có muốn ẩn thẻ của làng chưa mở không.
- Giáo viên (không bị chặn thẻ) chưa kiểm riêng; mặt nạ hiệu lực không đổi nên thấy cùng bộ thẻ như học sinh cùng tiến độ.
