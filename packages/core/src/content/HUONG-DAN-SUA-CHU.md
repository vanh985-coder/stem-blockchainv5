# Hướng dẫn sửa chữ trong game

Mọi chữ người chơi nhìn thấy nằm trong thư mục này (`packages/core/src/content/`). Em không cần đụng vào code.

## Cách sửa
1. Mở file cần sửa (hiện có `ui.ts` cho nút, nhãn, thông báo, cài đặt; `characters.ts` cho tên nhân vật).
2. **Chỉ sửa chữ nằm giữa hai dấu ngoặc kép** `"..."` hoặc `'...'`.
3. **Giữ nguyên** các chỗ giữ tên nằm trong ngoặc nhọn, ví dụ `{ten}`, `{Ten}`, `{phanDien}`, `{so}`. Game sẽ tự thay chúng:
   - `{ten}`: tên học sinh (chưa có tên thì là "em").
   - `{Ten}`: tên học sinh, viết hoa chữ đầu (chưa có tên thì là "Em").
   - `{phanDien}`: tên nhân vật phản diện.
   - `{bacAn}`, `{cuBinh}`, `{coChi}`, `{chuDung}`, `{thayLinh}`, `{laiBuon}`, `{baCu}`, `{nongDan}`: tên các nhân vật khác.
   - `{so}`, `{diem}`…: con số do game điền.
4. Sửa xong chạy `pnpm test` và `pnpm check:text`, rồi mở trang xem lại.

## Đổi tên nhân vật phản diện
Mở `characters.ts`, sửa đúng một dòng:

```ts
export const phanDien = 'Tí';
```

Ví dụ đổi thành `'Cuội'`. Mọi lời thoại có `{phanDien}` đổi theo.

## Không được làm
- Không viết chữ tiếng Việt thẳng vào file `.tsx`. Lệnh `pnpm check:text` sẽ báo lỗi.
- Không xóa dấu ngoặc nhọn của chỗ giữ tên, không đổi tên bên trong ngoặc nhọn.
