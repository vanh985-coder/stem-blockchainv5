# SPEC 07 — BÀI 3: LÀNG KHẮC DẤU (mốc 1: bài học; mốc 3: cảnh làng, màn 8, màn 9)

**Gói:** `packages/village-lang-khac-dau`. Gồm màn 7 (bài học), màn 8, màn 9. Chạy riêng ở `lang-khac-dau.ten-mien.vn`.

**Nguồn luật:** toán, cách tạo đề và chấm sao của bài học giữ đúng **spec giai đoạn 1 `04-bai3-khoa.md`**. Dùng lại `modPow`, `publicKey`, `sign`, `verify` trong `packages/core/src/lessons/bai-3`. Tên hiển thị "Linh" ở Bài 3 đã đổi thành **"Lan"** (spec 01).

**Bảng khóa dùng chung cả làng** (p = 23, g = 5):

| Người | Khóa riêng | Khóa công khai |
|---|---|---|
| Em (học sinh) | 12 | 18 |
| Bác An | 15 | 19 |
| Cụ Bình | 17 | 15 |
| Cô Chi | 19 | 7 |
| Chú Dũng | 21 | 14 |
| {phanDien} | 13 | 21 |
| Giang | 3 | 10 |
| Hoa | 5 | 20 |
| Khang | 6 | 8 |
| Lan | 7 | 17 |
| Minh | 9 | 11 |

**Người dẫn:** chú Dũng (`characters/chu-dung`, không có xương).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 7 là trang bài học 2D; màn 8 và màn 9 là 2.5D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, vùng làng của `WorldScene` ở thế giới mở `/cho`; bước W1 chỉ có bản tối giản, nội dung đầy đủ làm sau)

- **Cổng vào:** `env/cong-lang-khac-dau`.
- **Bên trong:** nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh`; `env/bui-tre`.
- **Code tự dựng:**
  - bàn thợ khắc dấu;
  - **máy soi dấu** đặt giữa sân, theo ảnh mẫu `source/objects/may-soi-dau.jpg`: thân trụ đồng, vài bánh răng xoay chậm, khe nhận thư, đèn tròn sáng nhấp nháy;
  - bảng gỗ treo 6 tấm mẫu dấu công khai ghi số.
- **Chú Dũng** đứng cạnh máy.
- **Cảnh mở đầu:** ảnh truyện số 8 kèm lời. Chú Dũng: "Mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình. Từ khuôn tạo ra mẫu thì dễ, nhìn mẫu mà đoán ngược ra khuôn thì chịu."
- **3 biển gỗ:** "Học cùng chú Dũng" (màn 7), "Lật thẻ tìm cặp khóa" (màn 8), "Chữa đàn gà" (màn 9).

## Màn 7 — Game chính: "Khuôn riêng, mẫu chung" (trang bài học 2D)

**Dựng bằng `LessonPage2D`:**
- Nền: `scenes/bai-hoc-lang-khac-dau`.
- Bảng giữa: **dùng lại nguyên bài 3 của web 2D giai đoạn 1**, gồm 3 trạm: đóng dấu và soi dấu, hòm thư giả, đoán khóa. Tên hiển thị "Linh" đã đổi thành "Lan".
- **Trạm Khó:** dò số với p = 1.000.003 phải chia nhỏ vòng lặp (như giai đoạn 1), không làm đơ giao diện.

**Lời chú Dũng:**

| Thời điểm | Chú Dũng nói |
|---|---|
| **Đầu bài** | "Khuôn riêng cất kín, chỉ cháu biết. Mẫu công khai thì treo cho cả làng xem. Có mẫu, ai cũng kiểm được dấu thật hay giả." |
| **Trước Trạm Trung bình** | "{phanDien} vừa gửi mấy lá thư giả, còn kèm cả mẫu dấu tự làm. Nhớ chỉ tin bảng mẫu của làng thôi!" |
| **Cuối bài** | "Mất khuôn riêng là mất hết, không ai lấy lại giúp được đâu." |

## Màn 8 — Game phụ 1: "Lật thẻ tìm cặp khóa"

Logic đặt trong `memoryLogic.ts` (hàm thuần, có test).

**Câu chuyện:** chú Dũng có **bộ khuôn tập**: khuôn mẫu chú khắc cho thợ học việc luyện tay, không phải khuôn riêng thật của ai. {phanDien} trộn lung tung bộ khuôn tập này. Học sinh lật thẻ để ghép lại từng cặp khuôn và mẫu công khai của nó.

**Lưu ý về bài học:** khuôn riêng thật thì phải cất kín, mất là mất hết (câu B3-01, B3-06). Vì vậy truyện chỉ nói đây là bộ khuôn tập, không bao giờ nói kho chứa khuôn riêng của mọi người.

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-08-kho-dau`.
- Thẻ là mặt phẳng hai mặt, lật bằng xoay 180°.
- **{phanDien}:** ở vòng 3, model 3D ló ra mép phải mỗi lần tráo bài (`cheer`). Hai thẻ bị tráo có vệt sáng tím chỉ rõ.

**Thẻ:**
- Ảnh trong `ui/cards/`.
- **Thẻ khuôn** chỉ ghi "Khuôn tập: x". **Không có tên, không có chân dung.**
  - x lấy trong bộ khuôn tập `{3, 5, 6, 7, 8, 9, 10, 11, 14, 16, 18, 20}`. 12 mẫu công khai của bộ này là 10, 20, 8, 17, 16, 11, 9, 22, 13, 3, 6, 12: khác nhau hết, và không số nào trùng với chính khuôn của nó.
  - **Không dùng khóa riêng của 6 nhân vật chính** (12, 13, 15, 17, 19, 21). Ví dụ khuôn 12 của học sinh, thứ Bài 3 luôn che bằng ••, hay khuôn 15 của bác An, chính là đáp án trạm Khó.
  - Các số 3, 5, 6, 7, 9 trùng khóa của 5 người phụ là được phép: đó là số luyện tập, cần cho đủ 8 cặp ở vòng 3.
- **Thẻ mẫu công khai chỉ ghi số:** "Mẫu công khai: y". **Không có tên, không có chân dung.** Như vậy học sinh phải tính xuôi 5^x mod 23 mới ghép được, không ghép theo mặt người được.
- **Nút "Máy tính mod"** ở góc màn hình (giống màn 9): nhập x, ra 5^x mod 23.

**3 vòng:**

| Vòng | Số cặp | Lưới |
|---|---|---|
| 1 | 4 cặp | 4 × 2 |
| 2 | 6 cặp | 4 × 3 |
| 3 | 8 cặp | 4 × 4 |

Mỗi vòng chọn ngẫu nhiên các khuôn trong bộ khuôn tập.

**Lật thẻ:**
- Mỗi lượt lật 2 thẻ.
- Khớp (thẻ khuôn x với thẻ mẫu 5^x mod 23): hai thẻ mở luôn, hiện dòng "5^x mod 23 = y".
- Không khớp: úp lại sau 0,8 giây.

**{phanDien} tráo bài (chỉ vòng 3):** cứ 20 giây {phanDien} tráo chỗ 2 thẻ đang úp và chưa khớp, có hoạt cảnh chỉ rõ 2 thẻ nào. Còn dưới 2 thẻ như vậy thì bỏ qua.

**Điểm mỗi vòng** = max(0, 300 − 10 × số lần lật sai).

| Mốc | Điểm |
|---|---|
| Đồng | 300 |
| Bạc | 550 |
| Vàng | 750 |

**Điều khiển:** chạm hoặc bấm; bàn phím dùng phím mũi tên và Enter.

**Test (`memoryLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| Tạo bộ thẻ n cặp | Có 2n thẻ; mỗi khuôn đúng 2 thẻ (một thẻ khuôn, một thẻ mẫu) |
| Cùng seed | Cùng thứ tự thẻ |
| Mọi thẻ mẫu công khai | Bằng `publicKey(khuôn)`; không chứa tên hay chân dung |
| Mọi thẻ khuôn | Số nằm trong bộ khuôn tập; không có số nào của bảng khóa thật (12, 13, 15, 17, 19, 21) |
| Trong một vòng | Các số mẫu công khai đều khác nhau |
| Điểm vòng: lật sai 3 lần / 35 lần | 270 / 0 |
| {phanDien} tráo bài | Chỉ đụng thẻ đang úp và chưa khớp |

**Đã làm (mốc 3, bước B1–B2):**
- Code ở `packages/village-lang-khac-dau/src/memory/`: `memoryConfig.ts` (`MEMORY_SPEC`, mốc `medals` truyền thẳng vào `MiniGameLevel`), `memoryLogic.ts` (luật), `memoryLayout.ts` (bố cục khung ngang và dọc), `memoryFaces.ts` (vẽ mặt thẻ), `MemoryBoard.tsx` (thẻ và {phanDien} trong Scene25D), `MemoryGame.tsx` (màn chơi), `memoryBots.ts` + `memoryBalance.test.ts`. Trang `pages/Man8.tsx`, route `man/8`. Máy tính mod dùng chung cho màn 9: `src/ui/ModCalculator.tsx`.
- `stepMemory(state, dt, { swapClock })` tính `dt` bằng ms. Mở Máy tính mod hay đang chiếu hoạt cảnh tráo thì đồng hồ tráo đứng yên (`swapClock: false`), đồng hồ úp lại 0,8 giây vẫn chạy.
- Thẻ: mặt phẳng hai mặt trong một nhóm xoay 180°. Mặt sau `ui/cards/the-mat-sau`; mặt trước lấy nền `ui/cards/the-khuon-rieng` hay `ui/cards/the-mau-cong-khai`, code vẽ khung giấy với nhãn "Khuôn tập" hay "Mẫu công khai" và số bên dưới (không tên, không chân dung). 24 mặt trước và mặt sau vẽ chung một atlas 5 × 5 (một texture). Ảnh gốc có nền trắng ở góc nên khi vẽ được cắt mép 3,5% và bo góc.
- Chữ trên thẻ ≥ 14 px trên màn hình (vẽ theo cỡ thẻ thật, vẽ lại khi cỡ thẻ đổi); "Chữ to" nhân 1,15, thẻ hẹp quá thì thu về không dưới 14 px. Đo: thẻ 82,8 px ở 360 × 640 (khung dọc 9:16), 86,6 đến 90,6 px ở 844 × 390, 170,6 đến 178,5 px ở 1366 × 768.
- Khung ngang: cột trái có nút Máy tính mod, vòng, điểm, số lần sai, dòng kết quả; {phanDien} ló ra mép phải. Khung dọc (điện thoại xoay dọc, `allowPortrait`): dải trên là thanh trên, {phanDien} ló ra ở góc dưới phải.
- Tráo bài: vệt tím (quầng tím sau thẻ và lớp tím phủ lên thẻ) hiện 1 giây ở chỗ cũ, rồi hai thẻ trượt sang chỗ mới trong 0,45 giây; lúc này chưa bấm được thẻ. {phanDien} ló ra và cười (`cheer`). "Giảm chuyển động": lật không xoay, đổi chỗ ngay sau 1 giây vệt tím, {phanDien} không ló ra.
- Bàn phím: phím mũi tên đi giữa các thẻ (viền rõ khi chọn bằng phím), Enter hay Space để lật. Mỗi thẻ có nhãn cho trình đọc màn hình ("Thẻ úp, hàng 1, cột 2" hoặc mặt thẻ khi đã mở).
- Màn kết quả: điểm = tổng 3 vòng, mỗi vòng một dòng (số lần lật sai → điểm).

**Cân bằng (300 ván mỗi bot, seed 1 đến 300, mốc 300 / 550 / 750):**

| Bot | Lật sai trung bình (vòng 1 / 2 / 3) | Điểm trung bình | Chưa đạt | Đồng | Bạc | Vàng |
|---|---|---|---|---|---|---|
| Giỏi: nhớ hết, tính đúng, để ý thẻ bị tráo | 1,92 / 3,16 / 4,52 | 804,0 (thấp nhất 780) | 0% | 0% | 0% | 100% |
| Trung bình: quên 30% thẻ đã thấy sau mỗi lượt, 15% lật nhầm thẻ bên cạnh, không để ý thẻ bị tráo | 3,40 / 7,13 / 13,35 | 661,3 (490 đến 800) | 0% | 5,3% | 90,0% | 4,7% |

Đạt tiêu chí như màn 2, 3 (bot giỏi ≥ 90% Vàng; bot trung bình Đồng hoặc Bạc ≥ 80%, Vàng dưới 10%). Màn này không có tim nên không có tỉ lệ hết tim. Hồ sơ bot trung bình là tự chọn.

## Màn 9 — Game phụ 2: "Chữa đàn gà" (bắn ná)

Logic đặt trong `chickenLogic.ts` (hàm thuần, có test).

**Câu chuyện:** {phanDien} lùa một đàn gà bệnh vào làng để phá phiên chợ. Mỗi con gà đeo một thẻ số, là mẫu công khai. Học sinh dùng ná cao su bắn **viên thuốc** đúng loại để chữa cho gà.

**Bước "Nạp đạn"** (trước mỗi đợt):
- Có 3–4 loại thuốc, mỗi loại ghi một **khuôn riêng**, ví dụ "Thuốc 3", "Thuốc 5", "Thuốc 6".
- Học sinh kéo nhãn mẫu công khai (lẫn vài nhãn nhiễu) vào đúng loại thuốc, tức là tính xuôi 5^x mod 23. Có máy tính mod để hỗ trợ.
- Nạp đúng hết thì đợt gà bắt đầu. Nạp sai thì nhãn bật ra, trừ điểm thưởng nạp.
- **Lưu ý về bài học:** game chỉ bắt tính **xuôi** (từ khuôn riêng ra mẫu công khai). Không bao giờ bắt đoán ngược, đúng như Bài 3 dạy.

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-09-duong-lang`: đường đất có 3 làn chạy từ xa về phía cổng làng ở dưới.
- **3 làn:** cấu hình bằng đoạn thẳng trên ảnh, giống màn 5. Có trang `/dev/man-09-lanes` để chỉnh.
- **Gà:** hình rời `sprites/man-09-chua-ga/ga-benh`, `ga-khoe`, `ga-trum`. Code làm gà chạy lạch bạch: nảy lên xuống, nghiêng trái phải; càng xa càng nhỏ. Thẻ số treo trên đầu gà.
- **Ná cao su:** hình rời `sprites/man-09-chua-ga/na-cao-su`, đặt giữa đáy màn hình, xoay hướng về con gà được chọn.
- **Học sinh:** model 3D đứng cạnh ná, quay người theo hướng bắn.
- **Bảng thuốc:** 3–4 nút thuốc ở cạnh dưới.

**Đợt gà:**
- Gà chạy lạch bạch từ cuối đường về phía cổng làng, theo 3 làn.
- Chọn loại thuốc: phím 1–4, hoặc chạm nút thuốc. Sau đó chạm hoặc bấm vào con gà để bắn; viên thuốc bay theo đường vòng cung.
- **Đúng thuốc** (`publicKey(khuôn của thuốc)` bằng thẻ trên gà): gà lấp lánh, đổi sang hình `ga-khoe` rồi chạy về chuồng (ở mép đường). +20.
- **Sai thuốc:** hiện "Không đúng thuốc!", gà vẫn chạy tiếp. −5.
- Gà chạy tới cổng làng: mất 1 tim.

**Ba đợt:**

| Đợt | Thuốc (khuôn riêng) | Mẫu công khai trên gà | Số gà |
|---|---|---|---|
| 1 | 3, 5, 6 | 10, 20, 8 | 8 |
| 2 | 5, 7, 9 | 20, 17, 11 | 10, chạy nhanh hơn |
| 3 | 3, 6, 7, 9 | 10, 8, 17, 11 | 12, rồi tới gà trùm |

**Gà trùm cuối đợt 3:**
- {phanDien} cưỡi con gà trùm: hình rời `ga-trum`, với model 3D {phanDien} ngồi trên yên (`idle`, thu nhỏ cho vừa).
- Gà trùm cần chữa **3 lần**; sau mỗi lần đúng, thẻ trên gà đổi sang một số khác trong bộ đã nạp.
- Chữa xong: {phanDien} ngã nhào (`hurt`), kêu "Ối!" rồi chạy mất (`run`).

**Tim, điểm:**
- 3 tim.
- Điểm = số gà chữa được × 20, trừ 5 cho mỗi phát sai, cộng 30 cho mỗi lần nạp đạn không sai, cộng 60 khi chữa xong gà trùm.

| Mốc | Điểm |
|---|---|
| Đồng | 300 |
| Bạc | 500 |
| Vàng | 700 |

**Test (`chickenLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| `publicKey` của 3, 5, 6, 7, 9 | 10, 20, 8, 17, 11 |
| Thuốc 5 bắn gà có thẻ 20 / thẻ 8 | Chữa được / không chữa được |
| Thẻ trên gà | Chỉ lấy trong bộ mẫu công khai của đợt đã nạp |
| Gà trùm | Cần đúng 3 lần chữa |
| Gà chạy tới cổng | Mất 1 tim |
| Nạp đạn | Chỉ cho bắt đầu khi mọi nhãn đều đúng |

## Kết thúc làng

- Chú Dũng trao **Trang Sổ Vàng thứ ba**.
- Chú Dũng: "Không giả dấu được nữa, {phanDien} chuyển sang trò trộn giao dịch ở Làng Bạc rồi."

## Checklist nghiệm thu

- [ ] Test Bài 3 (giai đoạn 1), `memoryLogic` và `chickenLogic` đều ✅.
- [ ] Màn 7: máy soi dấu chỉ đúng người đã đóng dấu; dò số với p = 1.000.003 không làm đơ giao diện.
- [ ] Màn 8: {phanDien} tráo bài có hoạt cảnh rõ ràng, không bao giờ đụng thẻ đã khớp.
- [ ] Màn 9:
  - nạp đạn chỉ tính xuôi;
  - bắn đúng thuốc thì gà khỏi bệnh chạy về chuồng;
  - gà trùm có {phanDien} cưỡi.
- [ ] Xong màn 9: nhận Trang Sổ Vàng; cổng Làng Bạc mở.
