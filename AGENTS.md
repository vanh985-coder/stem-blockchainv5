# Giấc mơ Sổ Chung — hướng dẫn cho AI code

Game phiêu lưu 3D trên web dạy blockchain cho học sinh THPT: 12 màn ở 4 làng, có đăng nhập Supabase và trang giáo viên.

## Đọc trước khi làm
- `docs/specs/00-HUONG-DAN-DU-AN.md`, rồi đúng file spec của việc được giao. Spec 03 là nền tảng cho mọi màn. Làm đúng spec; không tự thêm tính năng ngoài spec.
- Luật và số liệu của 4 bài học: spec giai đoạn 1 trong `docs/specs/giai-doan-1/`.

## Lệnh
- `pnpm install` · `pnpm test` · `pnpm build` · `pnpm check:text` · `pnpm crop-portraits`
- `pnpm dev:hub` (5173), `pnpm dev:lang-giay` (5174), `pnpm dev:lang-det` (5175), `pnpm dev:lang-khac-dau` (5176), `pnpm dev:lang-bac` (5177), `pnpm dev:assets` (5180)
- `pnpm assets:build`: nén đồ họa vào `assets-build/` và tạo `manifest.json`

## Cấu trúc
- `apps/hub`: web chính. `apps/lang-*`: vỏ chạy riêng từng làng.
- `packages/core`: giao diện, động cơ 3D, đăng nhập, tiến độ, câu hỏi, logic 4 bài.
- `packages/village-*`: nội dung từng làng, export `VillageModule`.
- `supabase/`: migrations SQL, edge functions.

## Đồ họa
- Bản gốc nằm ở `assets/` (không đưa lên Git). Chạy `pnpm assets:build`, rồi commit `assets-build/`.
- Tìm file theo đường dẫn không kèm đuôi file, có trong `manifest.json`. Danh sách chuẩn: `docs/danh-sach-assets3.txt`.
- Nhân vật: xem `docs/specs/03-dong-co-3d-giao-dien-chung.md` mục 3.
  - Chỉ hoc-sinh-nam, ti, dan-lang-ba-cu, dan-lang-nong-dan có xương Mixamo.
  - Clip tìm theo từ khóa.
  - sad, point, slide, swing, hurt do code dựng.

## Quy tắc bắt buộc
- Lời thoại và câu hỏi KHÔNG viết cứng tên phản diện; dùng `{phanDien}` lấy từ `content/characters.ts`.
- Dùng lại logic có sẵn trong `packages/core/src/lessons/`. KHÔNG viết lại công thức.
- Mọi hàm logic game là hàm thuần, có test vitest. `pnpm test` phải xanh trước khi báo xong.
- Chữ trên giao diện là tiếng Việt có dấu, xưng "em" với học sinh. Không có chữ trong ảnh.
- MỌI chữ hiển thị (lời thoại, nút, thông báo, nội dung bài) nằm trong packages/core/src/content/. Không viết chữ tiếng Việt thẳng trong component. `pnpm check:text` phải sạch.
- Đồ họa tải theo `manifest.json` từ `VITE_ASSETS_URL`. Thiếu file thì hiện hình thay thế, không được lỗi trang.
- Hiệu năng: mức chất lượng Thấp ≥ 30fps trên điện thoại tầm trung; không tạo object mới trong `useFrame`; rời cảnh thì dispose.
- Supabase: chỉ dùng anon key ở frontend. Thay đổi cơ sở dữ liệu viết thành file migration mới. Không tắt RLS.
- Không thêm server riêng, quảng cáo hay công cụ theo dõi.
- Bí mật để trong `.env.local`, không commit.

## Khi xong một việc
Trả lời bằng bản tóm tắt gồm:
- đã làm gì;
- kết quả `pnpm test`;
- số FPS và dung lượng bundle nếu có phần 3D;
- những điểm còn chưa chắc chắn.
