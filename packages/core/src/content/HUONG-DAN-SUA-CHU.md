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

## Chữ đậm, nghiêng, chỉ số trên trong bài học
Ở `lessons/bai-3.ts` và `lessons/bai-4.ts`, mỗi câu là một chuỗi trọn vẹn. Chỗ cần nhấn mạnh đánh dấu ngay trong câu:
- `**chữ đậm**`: ví dụ `Chỉ một mình em giữ, dùng để **ký tên**.`
- `~~chữ nghiêng~~`
- `^^chỉ số trên^^`: ví dụ `5^^x^^ mod 23` hiện là 5 mũ x.

Khóa đặt theo trạm rồi tới nội dung câu, ví dụ `tramTb.khoaDinhKemLaDo` là câu nói về khóa đính kèm ở trạm Trung bình.
Chuỗi nhóm `chuyen…xuCho…` ("Chuyển 3 xu cho An") là nội dung được ký; đổi một chữ thì chữ ký đổi theo, nên đừng sửa.

## Đổi tên nhân vật phản diện
Mở `characters.ts`, sửa đúng một dòng:

```ts
export const phanDien = 'Tí';
```

Ví dụ đổi thành `'Cuội'`. Mọi lời thoại có `{phanDien}` đổi theo.

## Không được làm
- Không viết chữ tiếng Việt thẳng vào file `.tsx`. Lệnh `pnpm check:text` sẽ báo lỗi.
- Không xóa dấu ngoặc nhọn của chỗ giữ tên, không đổi tên bên trong ngoặc nhọn.

## Chuỗi thừa

`pnpm test` có bài kiểm tra `content/unused.test.ts`: mỗi chuỗi trong `ui`, `teacherTexts`, `villageIntroTexts` và `bai1Texts` … `bai4Texts` phải được tham chiếu ở đâu đó trong mã (dạng `.khóa`). Chuỗi thừa thì bài kiểm tra báo tên đầy đủ; xóa chuỗi đó khỏi `content/`. Bảng nào được tra bằng khóa động (ví dụ `ui.lang[id]`) thì thêm vào `DYNAMIC_TABLES` trong file kiểm tra.
