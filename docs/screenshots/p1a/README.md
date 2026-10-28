# Mốc 4 · P1a

Người code: **Codex**, đã đọc `AGENTS.md`. Không đổi luật, số vòng, công thức,
điểm, tiến độ hay máy tính màn 4. Không push.

## Phạm vi

- Màn 3: đồng hồ tối thiểu 24 px, khung cao 44 px; giảm đệm thanh trên và
  dời chú thích xuống dưới chuỗi riêng vòng giữ sổ để không đè lên thẻ.
- Màn 6: kiểm ảnh `cot-tre` trong manifest (1024×559): thân chỉ rộng khoảng
  20 px, nghiêng và mềm ngay trong nguồn. Crop 64×291 rồi phóng bằng
  `LinearFilter` không thể tạo thêm chi tiết. Thay phần thân bằng canvas 256×1164,
  có viền và đốt tre rõ; giữ tỉ lệ thân/tấm 20/64, `POLE_TILE`, UV, vị trí và
  toàn bộ va chạm. Vẫn nạp theo manifest; ảnh thiếu vẫn dùng hình thay thế.
- Màn 8: máy tính hiện sẵn, không tự focus; ngang ở cột trái, dọc ở dưới thẻ.
  Chỉ khi focus vào máy tính mới dừng đồng hồ tráo như trạng thái mở bảng cũ;
  rời focus thì chạy lại. Đồng hồ úp thẻ và tạm dừng của game không đổi.
  Màn 9 vẫn dùng biến thể nút mở/đóng cũ.
- Màn 10, trạm Khó: cây vừa bề rộng thực của bảng. Khung hẹp xếp lá xen kẽ
  hai hàng để giữ vùng đặt ≥44×44 px, không thu chữ bằng `scale` và không cuộn
  ngang. Không thay thứ tự chỉ số hay quan hệ cha/con. Bỏ câu nhắc vuốt ngang
  không còn đúng; nút Kiểm tra ở sau cây theo luồng trang, không dính đáy che lá.
  Trạm Dễ/Trung bình không đổi.

## Cách kiểm lại

Chạy `pnpm dev:assets`. Dựng riêng bản đo (PowerShell, tại `apps/hub`):

```powershell
$env:VITE_PROBE='true'
$env:VITE_MERGED='true'
$env:VITE_ASSETS_URL='http://localhost:5180'
pnpm exec vite build --outDir dist-p1a
pnpm exec vite preview --outDir dist-p1a --port 4173
```

Tại gốc repo: `node scripts/p1a-check.mjs` (`CHROME_PATH`, `P1A_URL` tùy chọn).
Script tạo context khách biệt lập, không dùng tài khoản hay sửa dữ liệu server.
Chỉ đọc state qua cầu đo `VITE_PROBE`; đặt/lật thẻ bằng thao tác DOM thật.
Ảnh JPEG giữ nguyên kích thước viewport. `measurements.json` là số đo của lần
chạy cuối, không phải số ước lượng.

Script kiểm cả lưới 4×4 và thông báo nhập sai `99`, không chỉ đề vòng đầu;
kiểm dừng/chạy lại đồng hồ tráo khi focus/blur, nút gợi ý và đồng hồ úp lại.
Với cây, chờ hiệu ứng hữu hạn kết thúc rồi kiểm đủ 15 ô trong viewport,
không chồng nhau, không bị phần tử khác che tâm ô, không cuộn ngang và có thể
chọn mảnh từ khay để đặt bằng chuột/chạm.

## Kết quả trình duyệt đã xác minh

Chrome **156.0.8078.49**, Windows, Intel UHD Graphics (ANGLE/D3D11), mức **Thấp**.
1366×768 dùng chuột; hai khung còn lại dùng chạm giả lập, DPR 1.

| Viewport | Đồng hồ màn 3 | Cây Khó màn 10 | Vùng nút nhỏ nhất |
|---|---|---|---|
| 1366×768 | 35,50 px; khung 103,69×44 px | 825,45×289,19 px; đủ 15 ô | 47,47 px |
| 360×800 | Nhắc xoay ngang | 276×308 px; đủ 15 ô | 44 px |
| 844×390 | 24 px; khung 79,83×44 px | 712×268 px; đủ 15 ô | 44 px |

Thanh đồng hồ không đè chuỗi. Cây không cuộn ngang, các ô không chồng nhau,
không bị nút Kiểm tra che. Máy tính màn 8 hiện sẵn ở cả ba khung, kể cả khi
nhập sai, không che lưới 4×4. Kiểm được phép tính `3 → 10`, lật thẻ,
dừng/chạy đồng hồ tráo, nút gợi ý, và úp lại thẻ sai trong lúc nhập máy tính.
Không có `pageerror` trong lượt kiểm cuối.

**FPS màn 6 (mẫu ngắn lúc chơi, không phải cả ván):**

| Viewport | Khung / thời gian mẫu | FPS trung bình | Khung lâu nhất |
|---|---|---|---|
| 1366×768 | 433 / 3003,6 ms | 144,160 | 7,3 ms |
| 844×390, chạm giả lập | 433 / 3003,7 ms | 144,156 | 7,1 ms |

Đo bằng `requestAnimationFrame` trên bản build `VITE_PROBE`, không phải bản dev.
Không đo FPS chơi dọc màn 6 vì khung đó bị chặn xoay ngang theo spec.
12 ảnh, ảnh lớn nhất **179.792 byte**, tất cả dưới **300.000 byte**.

**Bundle hub production** (`pnpm build`, không `VITE_PROBE`; byte thật trong
`bundle.json`, gzip bằng `node:zlib`, kB = 1000 byte):

| Chunk | kB | gzip kB |
|---|---:|---:|
| JS chính `index` | 237,40 | 74,58 |
| CSS | 100,77 | 16,36 |
| Màn 3 | 35,29 | 11,50 |
| Màn 6 | 26,24 | 10,48 |
| Màn 8 | 19,45 | 7,97 |
| Máy tính dùng chung | 2,41 | 1,20 |
| Cây Merkle dùng chung | 4,86 | 2,24 |
| Lõi 3D `rendererRelease` (tải lười) | 1016,12 | 271,87 |

Đây là kích thước từng chunk, không phải tổng tải của một trang. Build còn
cảnh báo chunk 3D trên 500 kB; không đổi cách chia bundle ngoài phạm vi P1a.

## Kiểm tra mã

- `pnpm test --maxWorkers=2`: **2094 pass, 1 skipped**, 190 file pass,
  1 file skipped; 190,58 giây.
- `pnpm typecheck`: đạt toàn workspace.
- `pnpm check:text`: sạch, 423 file.
- `pnpm build`: đạt cả 5 app; còn cảnh báo chunk lớn nêu trên.
- `node scripts/p1a-check.mjs`: đạt cả ba viewport, chuột/chạm giả lập.

Các lượt `pnpm test` mặc định trước đó gặp timeout ở các mô phỏng nặng có sẵn
(`man11Anim`, rồi `kiteLogic`); lượt hai worker cuối không gặp lỗi. Không tăng
timeout, không sửa mô phỏng hay luật game để né lỗi. Lỗi content thừa do bỏ
lời nhắc vuốt ngang đã được sửa bằng cách xóa đúng chuỗi không còn dùng.

## Giới hạn

- Chạm được giả lập trong Chrome máy tính, không phải điện thoại thật.
- 360×800: màn 3/6 yêu cầu xoay ngang và dừng theo spec, không kiểm đồng hồ/cột
  trong trạng thái chơi dọc không được hỗ trợ.
- Trang bài học vẫn cuộn dọc để đi giữa bảng giao dịch, cây và khay; không cần
  cuộn bên trong cây hoặc cuộn ngang để tìm nút. Không ép toàn bộ bài học vào
  một màn hình thấp.
- Chưa xác minh bàn phím ảo, Safari/iPhone, thao tác đa chạm hay FPS trên điện
  thoại tầm trung. FPS Chrome máy tính không chứng minh ngưỡng 30 FPS của máy thật.
