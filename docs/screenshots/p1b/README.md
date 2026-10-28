# P1b — máy tính màn 4, Làng Dệt

6 ảnh JPEG toàn trang, cả Dễ (`de`) và Trung bình (`tb`), ở 1366×768, 360×800, 844×390. Tất cả dưới 300000 byte; kích thước thực và lỗi trang ghi trong `measurements.json`.

Chạy lại: mở hub dev với `VITE_MERGED=true`, `VITE_PROBE=true`, cổng 4174, rồi `node scripts/p1b-check.mjs`. Chrome trên Windows, puppeteer-core; cookie khách riêng, không sửa dữ liệu server. Ảnh chân dung không tải trong môi trường kiểm nên hiện hình thay thế.

Script kiểm nhập tay 57/36 ra 50, khởi đầu trống, nhập sai, Tab chuyển ô; chuột trên desktop và tap giả lập trên hai khung nhỏ. Nút Đồng ý vẫn mở phản hồi. Máy tính ở luồng nội dung, không định vị phủ; trang cuộn dọc được. Dùng cầu nối dev hoàn thành trạm Dễ để mở Trung bình, không phải kiểm chơi trọn bài.

Chưa kiểm thiết bị thật, bàn phím ảo, Safari, hoặc tương tác production. Không thay 3D, không đo FPS mới. Bộ test vẫn kiểm ModCalculator màn 8–9; component đó không sửa.
