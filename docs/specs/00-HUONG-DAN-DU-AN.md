# HƯỚNG DẪN DỰ ÁN — Giấc mơ Sổ Chung (bản 3: chia theo mốc, không còn hạn chót)

## 1. Bốn mốc làm việc

**Không còn hạn chót.** Nhịp làm khoảng **2–3 giờ mỗi ngày**. Làm theo thứ tự mốc; **xong mốc nào là có một bản dùng được ngay ở mốc đó**. Vẫn giữ kiến trúc subdomain (spec 01).

| Mốc | Làm gì | Spec | Ước lượng |
|---|---|---|---|
| **1. Lõi**: dùng được ở lớp | Repo và deploy (hub cộng 4 subdomain làng, mỗi làng lúc này chỉ có trang bài học); **xử lý ảnh và project assets** (spec 01 mục 5, phần ảnh); đăng nhập; lưu tiến độ an toàn khi chuyển giữa các subdomain; **4 bài học 2D**, đổi nội dung theo bảng ở spec 01 mục 3; chân dung cắt từ ảnh gốc; **trang truyện** và **bản đồ 2D để chọn màn**; trang giáo viên | 01, 02, 03 (mục 1, 5, 6), 04 (mục 1, 2, 7), 05–08 (phần bài học), 09 | 25–30 giờ, khoảng 2 tuần |
| **2. Làng mẫu**: bản demo 3D | Động cơ 3D tối thiểu (đi, chạy, camera, người dẫn đứng yên); xử lý **model** khi build; chợ phiên đơn giản; cảnh Làng Giấy; **màn 2** (chạy 3D) và **màn 3** (ghép sổ); đo FPS trên máy thật | 01 (mục 5), 03, 04 (mục 3), 05 | 25–30 giờ, khoảng 2 tuần |
| **3. Nhân rộng**: đủ game | Cảnh 3 làng còn lại (bản đơn giản: cổng, người dẫn, 3 biển gỗ); các game theo thứ tự **8 → 12 → 5 → 6 → 9 → 11**; hội làng, thử thách cuối, bằng khen; **cuối mốc: gộp web** (spec 10 mục 2) **và kiểm tra toàn bộ** (spec 10 mục 3) | 06, 07, 08, 10 | 35–45 giờ, khoảng 3 tuần |
| **4. Trau chuốt** | Nhân vật nhìn theo đáp án ở mọi màn (màn 5 đã có từ mốc 3); các tư thế sad, point; cảnh mở đầu ở chợ; chợ đông đồ vật; đổi tên phản diện nếu muốn; tiệm đồ | 03, 04 | Tùy |

**Tổng cộng khoảng 85–105 giờ, tức 6–8 tuần** với nhịp 2–3 giờ mỗi ngày.

**Vì sao thứ tự game như vậy:**
- Màn 3, 8 và 12 bắt học sinh **dùng đúng kiến thức** mới chơi được: soi công thức tìm trang giả, tính xuôi mới ghép được thẻ, leo theo nhánh lệch.
- Màn 5, 6, 9 có câu hỏi nhưng lối chơi ít dùng kiến thức hơn.
- Màn 11 nhiều luật nhất, lại ít liên quan cây Merkle, nên để cuối.
- Màn 2 nằm ở mốc 2 vì đi cùng động cơ 3D và Làng Giấy.

**Dùng chung:**
- `CAU-HOI-ON-TAP.md`: câu hỏi.
- `COT-TRUYEN-GIAC-MO-SO-CHUNG.md`: cốt truyện.
- `danh-sach-assets3.txt`: **danh sách đồ họa thực tế, dùng làm chuẩn tên file**.

## 2. Thay đổi so với bộ spec trước (đã sửa trong các spec)

**Bốn loại cảnh** (spec 03 mục 0):

| Loại | Dùng cho |
|---|---|
| 3D đi lại | Chợ phiên, 4 làng, hội làng |
| 3D chạy | Chỉ màn 2 |
| 2.5D (nền và hình rời 2D, nhân vật 3D) | Màn 3, 5, 6, 8, 9, 11, 12 |
| Trang bài học 2D | Màn 1, 4, 7, 10. **Dùng lại bài 2D giai đoạn 1**, đặt trên nền ảnh của làng |

**Nhân vật** (spec 03 mục 3):
- **4 nhân vật có xương:** học sinh, Tí, 2 dân làng. Hoạt ảnh đã kiểm tra trong file.
- **6 nhân vật đứng yên:** code làm nhún nhẹ, lắc lư.
- **Code tự dựng tư thế:** sad, point, slide, swing, hurt.
- **Chân dung:** tự chụp từ model 3D.
- **Bi:** code dựng.

**Đồ họa** (spec 01 mục 5):
- Texture nhân vật thu nhỏ từ 4096 xuống 1024.
- Tự giảm số mặt cho model không có xương.
- Tự tách nền trời cho 2 lớp nền màn 6.
- `assets/` gốc không đưa lên Git; chỉ commit `assets-build/`.

**Màn 5:** làm lại theo kiểu Whack-A-Mouse của Talking Tom (spec 06).

**Code tự dựng (không có file đồ họa):** máy soi dấu, đèn lồng, thuyền, cầu tàu, hàng rào, đống rơm, tiền đồng, nón lá, quạt nan.

**Tên phản diện:** luôn viết `{phanDien}` (hiện là "Tí"). Muốn đổi tên (ví dụ thành "Cuội") thì chỉ sửa một dòng trong `characters.ts`.

## 3. Chuẩn bị trước mốc 1

- [ ] **Tên miền: cần có ngay ở mốc 1.** Vì giữ subdomain, đăng nhập dùng chung giữa hub và các làng chỉ chạy khi có tên miền riêng; trên `vercel.app` thì không chạy.
- [ ] Repo GitHub `so-chung`, tài khoản Vercel, project Supabase và đăng nhập Google (spec 02 mục 1)
- [ ] Claude Code trong VS Code
- [ ] Trong repo:
  - đặt `assets/` ở gốc (nằm trong `.gitignore`);
  - spec mới vào `docs/specs/`;
  - 4 spec bài học giai đoạn 1 vào `docs/specs/giai-doan-1/`;
  - `danh-sach-assets3.txt` vào `docs/`;
  - `CLAUDE.md` ở gốc (phần B của `00-PROJECT-INSTRUCTIONS.md`)
- [ ] Code web 2D giai đoạn 1 (để chuyển 4 bài học sang)

## 4. File trong project claude.ai

**Giữ:**
- 00-HUONG-DAN-DU-AN, TRANG-THAI, spec 01–10, CAU-HOI-ON-TAP, COT-TRUYEN-GIAC-MO-SO-CHUNG;
- 4 spec bài học giai đoạn 1;
- `danh-sach-assets3.txt`;
- DO-HOA-02 (bảng nhân vật đã chốt).

**Bỏ ra cho nhẹ:** DO-HOA-01, 03, 04, 05, 06. Đồ họa đã làm xong, và tên file đã có trong spec cùng danh sách đồ họa.

## 5. Nguyên tắc khi làm

- **Mỗi mốc phải chạy được trọn vẹn** rồi mới sang mốc sau. Không làm dở dang nhiều mốc cùng lúc.
- **Game nào chưa làm** thì để trạng thái `coming-soon` (spec 03 mục 6): biển ghi "Sắp ra mắt", không chặn đường đi.
- **Sau mỗi mốc,** cho vài học sinh chơi thử trên máy thật (nhất là máy ở phòng máy trường), rồi mới làm tiếp.

## 6. Câu mở đầu cho cửa sổ đầu tiên

```
Mốc 1 — Lõi. Spec: 01 (kể cả phần ảnh của mục 5 và bảng đổi nội dung ở mục 3), 02, 09; giao diện theo 03 mục 1; chân dung theo 03 mục 3.6 (phần mốc 1); câu hỏi theo 03 mục 5; mở khóa theo 03 mục 6; trang chủ, truyện và bản đồ 2D theo 04 mục 1, 2, 7; phần bài học 2D trong 05–08. Đọc TRANG-THAI.md và các spec này, chia mốc 1 thành các bước nhỏ cho Claude Code, rồi đưa mình lời giao việc cho bước đầu tiên.
```

