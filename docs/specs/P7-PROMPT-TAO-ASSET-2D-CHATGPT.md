# Bộ prompt tạo ảnh 2D màn 5 bằng ChatGPT

## Cách dùng

Tải file Markdown này và ảnh tham chiếu Whack a Mouse mà chủ dự án đã chọn lên cùng cuộc trò chuyện ChatGPT. File này không chứa ảnh tham chiếu, nên cần đính kèm ảnh riêng.

Gửi: **“Đọc tài liệu này và ảnh mẫu. Tạo từng ảnh riêng theo thứ tự đề nghị, bắt đầu với mouse-normal.png. Không ghép thành bảng tổng hợp. Sau mỗi ảnh dừng để tôi xem.”**

Mục tiêu: bộ hình hoạt hình 2D cho game bốn làn dọc, bám sát nét vẽ và màu sắc ảnh mẫu. Ưu tiên bố cục game PC ngang; không cần model 3D. Đây là yêu cầu tạo tài nguyên, không phải thiết kế lại luật chơi.

## Quy chuẩn chung cho mọi ảnh

- Hoạt hình 2D: đường viền đậm sạch, màu tươi, mảng bóng mềm, hình rõ khi thu nhỏ. Không phong cách ảnh chụp hoặc render 3D.
- Không chữ, số, logo, watermark, giao diện trình duyệt hoặc ảnh chụp màn hình. Không tái hiện watermark của ảnh tham chiếu.
- Mỗi file chỉ có đúng đối tượng được yêu cầu; không ghép sprite sheet, không tạo nhiều phương án trong cùng ảnh.
- Các ảnh rời xuất PNG với alpha trong suốt thật, không vẽ nền caro hoặc nền trắng giả trong suốt.
- Chừa lề khoảng 8–12% quanh hình, không cắt tai, đuôi, tay hoặc búa. Không có bóng nền hình chữ nhật.
- Giữ hướng sáng từ trên trái và độ dày nét nhất quán giữa các file.
- Kích thước dưới đây là mục tiêu. Nếu công cụ không hỗ trợ chính xác, ưu tiên tỉ lệ khung và chất lượng; thông báo kích thước thực tế, không kéo giãn méo hình.
- Tên file là tên lưu mong muốn, không phải chữ cần vẽ trong ảnh.

## Danh sách 15 file

| File | Kích thước mục tiêu | Nền |
|---|---|---|
| mouse-normal.png | 512 × 512 | Trong suốt |
| mouse-fast.png | 512 × 512 | Trong suốt |
| mouse-switch.png | 512 × 512 | Trong suốt |
| mouse-big.png | 512 × 512 | Trong suốt |
| mouse-question.png | 512 × 512 | Trong suốt |
| hero-idle.png | 1024 × 1024 | Trong suốt |
| hero-hit.png | 1024 × 1024 | Trong suốt |
| coin.png | 512 × 512 | Trong suốt |
| wood-border.png | 256 × 1024 | Trong suốt |
| book.png | 1024 × 512 | Trong suốt |
| background-pc.png | 1920 × 1080 | Nền kín |
| lane-blue.png | 512 × 1536 | Nền kín, sát mép |
| lane-yellow.png | 512 × 1536 | Nền kín, sát mép |
| lane-red.png | 512 × 1536 | Nền kín, sát mép |
| lane-green.png | 512 × 1536 | Nền kín, sát mép |

Thứ tự: duyệt chuột thường trước, dùng ảnh đó làm tham chiếu cho bốn biến thể; duyệt nhân vật đứng trước khi tạo tư thế đập. Sau đó tạo xu, gỗ, sổ và nền.

## 1. Chuột thường — mouse-normal.png

```text
Tạo một sprite chuột đồ chơi hoạt hình 2D dựa trên kiểu chuột trong ảnh tham chiếu: thân bầu dục xanh lam, tai hồng lớn, hai mắt rõ, mũi tròn đỏ hướng về phía trên khung, đuôi mảnh kéo xuống phía dưới và chi tiết lên dây cót nhỏ bên hông. Góc nhìn từ trên xuống, không phối cảnh nghiêng. Hình dễ thương, tinh nghịch, đường viền đen đậm sạch, bóng mềm, dễ nhận diện khi hiển thị nhỏ trên làn màu.
Chỉ một con chuột, không xu, không làn, không chữ hay biểu tượng bổ sung. PNG nền trong suốt thật, khung vuông mục tiêu 512×512, toàn thân nằm trọn khung và chừa lề 10%. Không render 3D.
```

## 2. Chuột nhanh — mouse-fast.png

Đính kèm lại mouse-normal.png đã duyệt.

```text
Dùng chuột thường đã duyệt làm chuẩn nét vẽ, góc nhìn, hướng sáng và vị trí trong khung. Tạo biến thể chuột nhanh: thân tím thon hơn, tai hồng, mắt tinh nghịch, thân có dáng khí động học nhẹ nhưng vẫn là chuột đồ chơi cùng bộ. Mũi hướng lên, đuôi hướng xuống. Không vẽ vệt chuyển động, chữ hoặc tia chớp; code sẽ thêm dấu nhận biết và chuyển động.
Một đối tượng, PNG nền trong suốt thật, 512×512, chừa lề 10%, không cắt chi tiết.
```

## 3. Chuột đổi làn — mouse-switch.png

Đính kèm lại mouse-normal.png đã duyệt.

```text
Tạo biến thể chuột đổi làn cùng bộ với chuột thường: thân xanh ngọc, tai hồng hơi nhọn hơn và một chỏm lông nhỏ để khác biệt cả về hình dáng. Giữ góc nhìn từ trên xuống, mũi hướng lên, đuôi xuống, cùng nét viền và hướng sáng. Không nghiêng toàn thân sang bên, không vẽ mũi tên hoặc chữ; code sẽ thêm biểu tượng đổi làn.
Một con chuột, PNG alpha trong suốt, 512×512, toàn thân trọn khung và lề 10%.
```

## 4. Chuột to — mouse-big.png

Đính kèm lại mouse-normal.png đã duyệt.

```text
Tạo chuột to cùng bộ: thân cam đỏ tròn mập, bụng rộng, tai hồng, dáng chắc chắn nhưng đáng yêu. Dễ phân biệt với chuột thường nhờ hình dáng ngay cả khi bỏ màu. Giữ góc nhìn từ trên xuống, mũi lên, đuôi xuống, phong cách viền đậm và bóng mềm. Không vẽ thanh máu, số hoặc chữ; game sẽ xử lý hai lần đập.
Một con chuột, PNG nền trong suốt thật, 512×512, không cắt tai hay đuôi, lề 10%.
```

## 5. Chuột câu hỏi — mouse-question.png

Đính kèm lại mouse-normal.png đã duyệt.

```text
Tạo chuột câu hỏi cùng bộ chuột đồ chơi: thân vàng kem, tai hồng, có vương miện nhỏ màu vàng cam để nhận biết bằng hình dáng, biểu cảm vui và tò mò. Góc nhìn từ trên xuống, mũi lên, đuôi xuống. Giữ độ dày nét, hướng sáng và tỉ lệ đầu giống bộ đã duyệt. Không vẽ dấu hỏi, chữ, hào quang lớn hoặc số; code sẽ thêm dấu hỏi và hiệu ứng.
Một đối tượng, PNG alpha trong suốt thật, 512×512, chừa lề 10%.
```

## 6. Nhân vật chờ đập — hero-idle.png

```text
Dựa vào nhân vật học sinh trong ảnh mẫu, tạo nhân vật nam học sinh Việt Nam hoạt hình 2D: tóc đen, gương mặt vui, áo sơ mi trắng, cầm búa gỗ lớn chuẩn bị đập. Vẽ nửa người, mặt hướng về người chơi, búa ở bên vai như ảnh tham chiếu. Nét đậm, màu sáng, bóng mềm, đồng bộ với bộ chuột đồ chơi. Áo không có chữ hoặc logo. Giữ cả hai tay và toàn bộ búa trong khung.
Chỉ nhân vật và búa, không nền, không bàn, không chuột, không chữ. PNG alpha trong suốt, khung 1024×1024, lề an toàn đủ rộng cho tư thế vung búa kế tiếp. Ghi nhớ vị trí thân để tạo hero-hit.png cùng khung.
```

## 7. Nhân vật đập — hero-hit.png

Đính kèm hero-idle.png đã duyệt; yêu cầu chỉnh tư thế dựa trên ảnh này.

```text
Từ hero-idle.png đã duyệt, tạo tư thế nhân vật đang vung búa gỗ xuống phía trước. Giữ nguyên khuôn mặt, tóc, quần áo, kích thước đầu và thân, vị trí gốc thân trong khung, hướng sáng và nét vẽ. Chỉ thay đổi tay, búa và biểu cảm tập trung vui vẻ cho động tác đập. Búa và tay phải nằm trọn trong khung, không thêm tia sáng hay chữ.
PNG alpha trong suốt 1024×1024, cùng canvas và điểm neo thân với ảnh đứng để code đổi tư thế không bị giật vị trí. Không tự cắt sát đối tượng hoặc phóng to nhân vật.
```

## 8. Đồng xu — coin.png

```text
Tạo một đồng xu vàng hoạt hình 2D nhìn chính diện như ảnh tham chiếu: viền tròn dày màu vàng cam, mặt vàng sáng, ngôi sao năm cánh nổi ở chính giữa, điểm sáng ở phía trên trái và bóng mềm tạo độ nổi bằng nét vẽ 2D. Đọc rõ khi thu nhỏ, không thêm số hoặc chữ. Không hiệu ứng hào quang ngoài xu vì code sẽ dựng hiệu ứng.
Chỉ một đồng xu, PNG alpha trong suốt thật, 512×512, hình tròn không méo, nằm giữa khung, lề 10%.
```

## 9. Viền gỗ — wood-border.png

```text
Tạo một thanh viền gỗ dọc hoạt hình 2D cho cạnh sân chơi, nhìn chính diện: gỗ nâu ấm, các đường vân dọc rõ nhưng không rối, điểm nhấn đinh tán vàng nhỏ như ảnh mẫu. Hai cạnh thẳng, không phối cảnh thu nhỏ về phía xa, không hoa văn lớn hoặc chữ. Thanh gỗ chiếm gần hết chiều cao, chừa lề trong suốt mỏng quanh hình. Một thanh riêng, không làm cả khung kín.
PNG alpha trong suốt thật, mục tiêu 256×1024, tỉ lệ 1:4. Code sẽ dùng lại cho hai cạnh và điều chỉnh theo màn hình.
```

## 10. Cuốn sổ — book.png

```text
Tạo một cuốn sổ mở hoạt hình 2D nhìn hơi từ trên xuống, bố cục ngang: bìa nâu ấm dày, giấy màu kem sáng, gáy giữa rõ, đường viền sạch và bóng mềm cùng phong cách bộ chuột. Hai trang hoàn toàn trống, đủ diện tích để code đặt các dấu mực lên sau. Không chữ, số, ký hiệu hoặc vết mực, không đồ vật bên cạnh.
Một cuốn sổ, PNG alpha trong suốt thật, mục tiêu 1024×512, tỉ lệ 2:1, không cắt bìa, chừa lề quanh hình.
```

## 11. Nền PC — background-pc.png

```text
Tạo nền game hoạt hình 2D ngang 16:9, thế giới phô mai vàng tươi vui theo ảnh tham chiếu. Các khối phô mai lớn nhỏ có lỗ tròn, tông vàng chanh và vàng cam, nét vẽ mềm sạch, có lớp gần xa nhưng không render 3D. Trang trí tập trung ở hai rìa và dải phía trên. Vùng giữa khoảng 60% chiều rộng thoáng, ít chi tiết và độ tương phản vừa phải để đặt bốn làn chơi lên trên bằng code. Phần dưới vẫn có nền liên tục, không để mảng trắng hoặc kem trống.
Không nhân vật, không chuột, không đồng xu, không búa, không cuốn sổ, không làn màu, không khung HUD, không chữ, không số và không watermark. Đây chỉ là nền sân chơi, không phải ảnh chụp giao diện hoàn chỉnh. Nền kín, mục tiêu 1920×1080.
```

## 12–15. Bốn đường chạy của chuột — nền làn riêng

Bốn file riêng, không ghép bốn làn thành một ảnh. Ngoại lệ với quy tắc ảnh rời ở trên: ảnh làn là hình chữ nhật nền kín phủ sát cả bốn mép, không chừa lề trong suốt. Mục tiêu 512×1536 (tỉ lệ 1:3), cùng kích thước và cùng mật độ họa tiết. Không có phối cảnh: hai cạnh song song, chiều rộng không thu nhỏ về phía trên.

### 12. lane-blue.png

```text
Tạo riêng nền một làn chạy dọc màu xanh lam cho game đập chuột 2D, bám sát làn xanh trong ảnh mẫu. Hình chữ nhật đứng 1:3, mục tiêu 512×1536. Màu xanh lam tươi, giữa hơi sáng, hai bên đậm nhẹ, các ngôi sao năm cánh xanh nhạt bán trong suốt rải đều với vài kích thước khác nhau. Phong cách hoạt hình 2D sạch, họa tiết vừa phải để chuột và xu nổi bật khi đặt lên. Nhìn chính diện phẳng, không phối cảnh hoặc đường chân trời.
Chỉ nền làn: không chuột, xu, nhân vật, khung gỗ, vạch vùng đập, nút, chữ, số hoặc watermark. Màu và họa tiết phủ kín sát bốn mép, không bo góc, không lề trắng hay trong suốt. Đây là một ảnh nền tĩnh, không phải ảnh toàn bộ game.
```

### 13. lane-yellow.png

Đính kèm lane-blue.png đã duyệt.

```text
Tạo biến thể nền làn màu vàng chanh sáng từ ảnh làn xanh đã duyệt. Giữ kích thước 512×1536, nét vẽ, mật độ và kích thước ngôi sao; sao màu vàng kem nhạt. Giữa sáng, hai bên đậm nhẹ, đủ tương phản nhẹ để thấy sao nhưng không lấn át đối tượng game. Chỉ một làn nền kín sát mép, không phối cảnh, không chuột, xu, khung, vạch, nút, chữ hoặc watermark.
```

### 14. lane-red.png

Đính kèm lane-blue.png đã duyệt.

```text
Tạo biến thể nền làn màu đỏ tươi từ ảnh làn xanh đã duyệt, các sao màu hồng nhạt bán trong suốt. Giữ kích thước 512×1536, phong cách, mật độ họa tiết và độ sáng tương ứng bộ làn. Không làm nền đỏ tối hoặc đen. Chỉ một làn nền kín sát mép, không phối cảnh, không chuột, xu, khung, vạch, nút, chữ hoặc watermark.
```

### 15. lane-green.png

Đính kèm lane-blue.png đã duyệt.

```text
Tạo biến thể nền làn màu xanh lá chanh từ ảnh làn xanh lam đã duyệt, các sao màu xanh vàng nhạt bán trong suốt. Giữ kích thước 512×1536, phong cách, mật độ và kích thước họa tiết để đặt cạnh ba làn còn lại thành một sân chơi đồng nhất. Chỉ một làn nền kín sát mép, không phối cảnh, không chuột, xu, khung, vạch, nút, chữ hoặc watermark.
```

Gemini đặt bốn ảnh theo thứ tự trái sang phải: xanh lam, vàng, đỏ, xanh lá. Code dựng đường phân cách mảnh, vùng đập và chuyển động chuột phía trên. Ảnh nền làn không quyết định tốc độ, vùng va chạm hay vị trí chuột. Khi đổi tỉ lệ khung trên PC, dùng crop/cover phù hợp để sao không méo; không mặc định ảnh có thể lặp liền mạch nếu chưa kiểm đường nối.

## Phần không cần gen ảnh

Gemini dựng bằng code: khung bố trí bốn làn và đường phân cách (dùng bốn ảnh nền làn ở trên), dấu hỏi, biểu tượng tốc độ/đổi làn, thanh máu, HUD, chữ, điểm, nút, vùng đập, vết mực, tia sáng và chuyển động. Không đặt số liệu hoặc chữ cố định vào ảnh.

## Kiểm ảnh trước khi chuyển cho Gemini

- Mỗi file đúng một đối tượng, không có chữ hay watermark.
- Ảnh rời có alpha thật; mở trên cả nền tối và sáng để kiểm viền.
- Chuột cùng góc nhìn và hướng; tai/đuôi không bị cắt, nhìn rõ khi thu nhỏ.
- Hai tư thế nhân vật giữ cùng vị trí thân và tỉ lệ, không bị nhảy khi đổi ảnh.
- Nền đủ rộng cho PC và không chứa các đối tượng đáng lẽ phải chuyển động.
- Không yêu cầu các sprite raster co giãn tùy ý: giữ tỉ lệ ảnh khi đưa vào game.

## Bàn giao cho Gemini code

Đặt ảnh gốc vào `assets/man5-2d/` ở thư mục gốc dự án; giữ ảnh tham chiếu riêng trong `assets/references/`. Đây là thư mục ảnh gốc, không tự đưa lên Git trái quy tắc repo.

Gửi Gemini:

```text
Bộ ảnh 2D mới nằm trong assets/man5-2d/. Kiểm đủ file, kích thước, alpha và tính đồng nhất trước khi tích hợp. Dùng quy trình assets:build và manifest.json của dự án, không hardcode đường dẫn bỏ qua manifest. Giữ ảnh gốc theo quy tắc Git hiện có.

Thay hình placeholder của màn 5 bằng bộ ảnh mới. Dựng các lớp riêng: nền, khung, làn, nhân vật, chuột, xu, sổ và UI. Không dùng ảnh mẫu nguyên tấm làm game. Giữ luật P7b, vùng nhận thao tác khớp vị trí sprite, giữ tỉ lệ và điểm neo khi đổi tư thế.

Ưu tiên PC: sân chơi lớn, cân giữa viewport, không để trống nửa màn phía dưới; chuyển thể bố cục ảnh dọc sang ngang, không kéo méo ảnh. Chụp bản mẫu tại 1366×768 và 1920×1080 để chủ dự án xem trước khi chốt đồ họa. Sau đó kiểm thêm 360×800 và 844×390.
```
