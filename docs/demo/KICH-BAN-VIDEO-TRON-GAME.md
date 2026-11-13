# Kịch bản video hướng dẫn trọn game — Giấc mơ Sổ Chung (bản 1)

Dùng cho bản demo tự chơi `?demo=1&kieu=tron` (nhánh `feat/demo-tron`, KHÔNG BAO GIỜ merge vào `main`, không deploy).

**Cách dùng file này**
- Mỗi dòng có **Mã đoạn** (S01, G01…). Bot của Claude Code chia video đúng theo các mã này và ghi mốc giây của từng đoạn ra file, nên bạn không phải tự ghi mốc.
- **Số liệu đã khóa cứng** trong bản demo theo bảng ở cuối file. Quay lại bao nhiêu lần cũng ra đúng số này.
- Chỗ ghi **[SL: …]** là số Claude Code sẽ báo lại trong `docs/demo/SO-LIEU-DEMO-TRON.md` sau khi khóa đề. Mình điền vào rồi mới đem đi lồng tiếng.
- Mỗi phần có 2 câu bắt buộc: **"Phần này liên quan tới blockchain ở chỗ…"** và **"Trong blockchain thật, …"** (ứng dụng).

**Nhịp quay**
- Làng Giấy: đi bộ đúng tốc độ người chơi từ chợ vào làng, đi bộ tới từng thẻ "Em có biết?", trả lời từng thẻ với tốc độ đọc bình thường, rồi chơi màn 1, 2, 3.
- Làng Dệt, Khắc Dấu, Bạc: dịch chuyển bằng bản đồ, nhặt thẻ và trả lời nhanh gấp 1,5 lần.
- Màn bài học (1, 4, 7, 10): đủ 3 trạm Dễ, Trung bình, Khó.
- Game phụ (2, 3, 5, 6, 8, 9, 11, 12): rút còn khoảng 1 phút mỗi màn (bảng "Rút ngắn" ở cuối file).
- Bỏ qua các bước "làm thử" của hướng dẫn trong game; lời thuyết minh thay phần đó.

---

## Phần mở đầu

| Mã | Bắt đầu khi trên màn hình… | Lời thuyết minh |
|---|---|---|
| S01 | Trang chủ hiện | Chào các em. Đây là "Giấc mơ Sổ Chung", trò chơi giúp các em hiểu blockchain qua một chuyến phiêu lưu. Trong video này, mình sẽ chơi thử từ đầu đến cuối để các em thấy cách chơi và hiểu mỗi phần đang dạy điều gì về blockchain. |
| S02 | Trang truyện mở đầu hiện | Nhân vật chính ngủ quên và mơ thấy mình về Đại Việt thế kỷ 16. Ở đó, các làng nghề cùng ghi chung một cuốn sổ gọi là Sổ Chung. Nhưng có một cậu bé tinh nghịch tên Tí luôn tìm cách sửa sổ để có lợi cho mình. Nhiệm vụ của em là đi qua 4 làng, học cách giữ sổ của từng làng và thu đủ 4 Trang Sổ Vàng. Cuốn Sổ Chung chính là hình ảnh của blockchain: một cuốn sổ ghi chép mà nhiều người cùng giữ và không ai sửa lén được. |
| S03 | Nhân vật đứng giữa chợ phiên, bảng Nhiệm vụ hiện | Đây là chợ phiên, nơi bắt đầu chuyến đi. Ở góc trên bên trái là bản đồ nhỏ và bảng Nhiệm vụ cho em biết phải làm gì tiếp theo. Em đi bằng phím W, A, S, D hoặc phím mũi tên; giữ Shift hoặc bấm nút "Chạy nhanh" để chạy. Mũi tên vàng dưới chân luôn chỉ đường tới nơi cần đến. Cách chơi ở mỗi làng giống nhau: vào làng, đi nhặt 4 thẻ "Em có biết?" và trả lời câu hỏi, rồi chơi bài học chính và 2 trò chơi phụ. Mình bắt đầu với Làng Giấy ở phía bắc. |

---

## Làng Giấy — khối và chuỗi

| Mã | Bắt đầu khi trên màn hình… | Lời thuyết minh |
|---|---|---|
| G01 | Nhân vật bắt đầu đi bộ từ chợ về cổng Làng Giấy | Mình đi theo mũi tên vàng sang Làng Giấy. Làng này dạy ý tưởng đầu tiên và quan trọng nhất của blockchain: các trang sổ móc nối vào nhau thành một chuỗi. |
| G02 | Hộp thoại bác An hiện (cảnh mở đầu của làng) | Bác An, người giữ sổ của làng, kể rằng đêm qua có kẻ sửa trộm một trang sổ. Trong làng có 4 cuộn giấy "Em có biết?" giấu ở 4 khu khác nhau. Bản đồ nhỏ đánh dấu chỗ có cuộn giấy, và em phải nhặt đủ 4 cuộn thì mới vào được bài học. |
| G03 | Nhân vật nhặt cuộn giấy thứ nhất, thẻ hiện | Mỗi thẻ có 3 phần: kiến thức, ví dụ và một câu hỏi. Thẻ này nói: blockchain là một cuốn sổ, mỗi trang là một khối, các trang nối tiếp nhau thành chuỗi. Câu hỏi: sổ có 8 trang ghi nối tiếp thì đó là gì? Đáp án là một chuỗi gồm 8 khối. Trả lời sai em vẫn nhận được thẻ và được đọc giải thích, nên các em cứ mạnh dạn trả lời. |
| G04 | Thẻ thứ hai hiện | Thẻ thứ hai: mỗi trang có 2 phần là nội dung và mã trang. Mã trang giống như dấu vân tay của trang. Nếu Tí đổi nội dung mà không tính lại mã, mã cũ sẽ không còn khớp, nên em phát hiện ra ngay. |
| G05 | Thẻ thứ ba hiện | Thẻ thứ ba là công thức của cả làng: lấy mã trang trước nhân 2, cộng với nội dung, rồi chỉ giữ 2 chữ số cuối. Câu hỏi: mã trước 43, nội dung 58. Ta có 43 nhân 2 được 86, cộng 58 được 144, giữ 2 chữ số cuối là 44. |
| G06 | Thẻ thứ tư hiện | Thẻ thứ tư giải thích vì sao khó sửa lén: mã trang sau được tính từ mã trang trước, nên sửa một trang thì phải tính lại các trang phía sau. Blockchain thật dùng hàm băm như SHA-256, phức tạp hơn rất nhiều, nhưng ý tưởng giống nhau. Đủ 4 thẻ rồi, mình quay về 3 biển gỗ ở giữa làng. |
| G07 | Trang bài học màn 1 mở, trạm Dễ | Màn 1, "Trang nối trang". Với độ khó dễ, em học cách tính mã trang. Trên màn hình là trang bìa có mã 10 và 5 trang có sẵn nội dung 23, 45, 7, 88, 12. Em tính lần lượt: trang 1 lấy 10 nhân 2 được 20, cộng 23 được 43. Trang 2 lấy 43 nhân 2 được 86, cộng 45 được 131, giữ 2 chữ số cuối là 31. Cứ thế, trang 3 là 69, trang 4 là 26, trang 5 là 64. Nhiệm vụ của em là tính đúng mã cho cả 5 trang. |
| G08 | Tí xuất hiện và đổi nội dung trang 2 (trạm Trung bình) | Với độ khó trung bình, Tí lén đổi nội dung trang 2 từ 45 thành 72. Trang 2 lập tức báo sai lệch vì mã cũ được tính từ nội dung cũ. Em tính lại: 43 nhân 2 được 86, cộng 72 được 158, giữ 58. Nhưng mã trang 3 được tính từ mã trang 2, nên trang 3 sai theo: 58 nhân 2 được 116, cộng 7 được 123, giữ 23. Trang 4 thành 34, trang 5 thành 80. Chỉ sửa một trang mà em phải sửa cả dây chuyền phía sau. |
| G09 | Đồng hồ đếm ngược trạm Khó hiện | Với độ khó khó, em đứng ở vị trí kẻ gian: một trang cũ trong chuỗi của em bị đổi, em phải sửa lại cả chuỗi trong khi cả làng vẫn liên tục ghi thêm trang mới. Ví dụ trang 1 có mã 87, trang 2 có nội dung 22: 87 nhân 2 được 174, cộng 22 được 196, giữ 96. Trang 3 nội dung 18 ra 10, trang 4 nội dung 47 ra 67. Hết giờ, chuỗi của làng vẫn dài hơn chuỗi của em. |
| G10 | Màn kết quả màn 1 hiện | Phần này liên quan tới blockchain ở chỗ: mỗi trang là một khối, mã trang là mã băm của khối, và mỗi khối giữ mã của khối trước nên các khối móc vào nhau thành chuỗi. Trong blockchain thật như Bitcoin, mỗi khối chứa mã băm của khối liền trước. Muốn sửa một giao dịch cũ, kẻ gian phải tính lại khối đó và mọi khối sau nó, nhanh hơn cả mạng lưới đang ghi thêm khối mới, điều gần như không thể. Đó là lý do lịch sử giao dịch trên blockchain rất khó bị sửa. |
| G11 | Màn 2 bắt đầu chạy | Màn 2, "Đuổi theo Tí". Tí ôm xấp trang bị trộm chạy qua đường làng. Nhân vật tự chạy, em đổi làn bằng phím trái phải, nhảy bằng phím lên hoặc phím cách, trượt bằng phím xuống; trên điện thoại thì vuốt theo hướng đó. Nhặt trang sổ để lấy lại các trang bị trộm. |
| G12 | Bảng câu hỏi cuối vòng hiện | Hết vòng, game hỏi một câu ôn công thức. Mã trang trước là 40, nội dung 25: 40 nhân 2 được 80, cộng 25 được 105, giữ 2 chữ số cuối là 05, tức là 5, đáp án C. Cẩn thận: 105 là đáp án bẫy khi quên giữ 2 chữ số cuối. Phần này liên quan tới blockchain ở chỗ: máy nào trong mạng cũng phải tự tính lại mã để kiểm tra, nên tính nhanh và đúng là kỹ năng cơ bản của người giữ sổ. |
| G13 | Màn 3 bắt đầu | Màn 3, "Ghép lại cuốn sổ". Em mang các trang lấy lại về bàn bác An và ghép lại theo đúng thứ tự. Mỗi thẻ ghi mã trang trước, nội dung và mã trang. Thẻ đặt được vào chuỗi khi mã trang trước của nó bằng mã trang của trang cuối chuỗi, và mã trang tính đúng công thức. [SL: số trang vòng 1 và thứ tự ghép] |
| G14 | Tí nhét trang giả (vòng 2) | Ở vòng 2, Tí nhét một trang giả vào xấp giấy. Trang giả có mã trang trước khớp, nhưng mã trang sai công thức. Ví dụ thẻ ghi mã trước 31, nội dung 50, mã 99. Em bấm "Soi công thức": 31 nhân 2 được 62, cộng 50 được 112, giữ 12, khác 99, nên đây là trang giả và em kéo nó vào rổ trang giả. Phần này liên quan tới blockchain ở chỗ: khi một máy mới tải chuỗi từ máy khác, nó tự kiểm từng khối bằng công thức, khối nào sai là bị loại, dù trông có vẻ nối đúng chỗ. |
| G15 | Bác An trao Trang Sổ Vàng thứ nhất | Xong Làng Giấy, bác An trao Trang Sổ Vàng thứ nhất. Bác nhắc: một mình giữ sổ thì kẻ gian vẫn có thể ngồi sửa cả đêm. Vì thế các làng không bao giờ để sổ ở một nơi. Mình sang Làng Dệt để xem cả làng cùng giữ sổ như thế nào. |

---

## Làng Dệt — nhiều người cùng giữ sổ

| Mã | Bắt đầu khi trên màn hình… | Lời thuyết minh |
|---|---|---|
| D01 | Bản đồ lớn mở, chọn cổng Làng Dệt, dịch chuyển | Các em đã biết cách đi bộ vào làng, nên từ đây mình dùng bản đồ: bấm M mở bản đồ lớn, chọn nơi muốn tới rồi bấm "Đi tới" để dịch chuyển cho nhanh. |
| D02 | Hộp thoại cụ Bình hiện | Ở Làng Dệt, nhà nào cũng giữ một cuốn sổ giống hệt nhau. Có trang mới là cả làng cùng kiểm. |
| D03 | Bắt đầu nhặt thẻ "Em có biết?" đầu tiên của Làng Dệt | Làng này dạy về node. Bốn thẻ nói rằng: node là một máy tính trong mạng, giống một người giữ sổ, mỗi node có bản sổ đầy đủ. Khi có trang mới, node tự kiểm 2 điều: mã trang trước có khớp trang cuối trong sổ của mình không, và mã trang mới có tính đúng không. Chỉ khi đa số đồng ý thì trang mới được ghi. Và vì sổ nằm ở nhiều nơi, một người sửa lén sổ của riêng mình sẽ bị đa số phát hiện. |
| D04 | Trang bài học màn 4 mở, trạm Dễ | Màn 4, "Cả làng cùng giữ sổ". Với độ khó dễ, em là một người giữ sổ và duyệt trang mới. [SL: trang cuối sổ, các trang mới được gửi tới và đáp án Đồng ý/Từ chối]. Ví dụ trang cuối trong sổ có mã 57, trang mới ghi mã trước 57, nội dung 36, mã 50: 57 nhân 2 được 114, cộng 36 được 150, giữ 50, khớp, nên em Đồng ý. Nếu trang mới ghi mã 51 thì em Từ chối. |
| D05 | Trạm Trung bình bắt đầu | Với độ khó trung bình, em so sổ với các node khác rồi bỏ phiếu. Phiếu của cụ Bình, cô Chi và Tí chỉ hiện sau khi em đã chọn, để em tự quyết định chứ không chép theo ai. Tí luôn gian ở lượt đầu. [SL: diễn biến lượt bỏ phiếu] |
| D06 | Trạm Khó bắt đầu | Với độ khó khó, mỗi người phải đặt cọc trước khi được ghi trang. Ghi trang thật thì được thưởng, ghi trang gian mà bị phát hiện thì mất cọc. [SL: số cọc, trang em tạo, ví dụ 25 và 18 ra 68] |
| D07 | Màn kết quả màn 4 hiện | Phần này liên quan tới blockchain ở chỗ: sổ không nằm trong tay một người mà ở nhiều node, và trang mới chỉ được ghi khi đa số đồng ý. Cách các node thống nhất với nhau gọi là cơ chế đồng thuận. Trong blockchain thật, Bitcoin có hàng nghìn node trên khắp thế giới, mỗi node giữ một bản sao và tự kiểm mọi khối mới. Ethereum dùng cách đặt cọc: người muốn xác nhận khối phải khóa một khoản tiền làm cọc, gian lận thì bị phạt mất cọc, giống trạm Khó em vừa chơi. |
| D08 | Màn 5 bắt đầu | Màn 5, "Đập Tí". Tí gấp trang giả thành chuột giấy, cho chạy từ dưới lên để bôi mực vào Sổ Chung. Em đập chuột khi nó vào vùng sáng, bằng các phím D, F, J, K hoặc chạm vào làn. Sổ dính đủ 8 vết mực là thua. Trong video mình chỉ chơi 3 lượt câu hỏi cho gọn. |
| D09 | Lượt chuột câu hỏi đầu tiên mở | Đập chuột vàng có dấu hỏi thì mở lượt câu hỏi. Các chuột vàng mang chữ đáp án chạy lên, em đập đúng con mang đáp án mình chọn. Câu 1: trang cuối sổ có mã 57, trang mới ghi mã trước 57, nội dung 36, mã 51. Tính lại ra 50, không khớp 51, nên em đập chuột Từ chối. Câu 2: trang cuối mã 25, trang mới ghi 25, 30, 80. Ta có 25 nhân 2 được 50, cộng 30 được 80, khớp, nên em đập chuột Đồng ý. Câu 3: khi nào trang mới được ghi vào sổ của cả làng? Khi đa số người giữ sổ đồng ý. Phần này liên quan tới blockchain ở chỗ: mỗi node là một người gác cổng, khối giả bị chặn ngay ở cửa, không lọt được vào sổ chung. |
| D10 | Màn 6 bắt đầu | Màn 6, "Diều đưa sổ". Em thả diều mang bản sao sổ tới các làng xa. Bấm chuột, chạm hoặc phím cách để diều bật lên, né cột tre và diều đen của Tí. Tới cổng làng thì trả lời một câu hỏi. [SL: câu hỏi ở cổng] |
| D11 | Cổng làng đầu tiên mở | Mỗi làng nhận được sổ thì có thêm một bản sao giống hệt. Phần này liên quan tới blockchain ở chỗ: khi có khối mới, các node chuyền nó cho nhau, máy này gửi máy kia, cho tới khi cả mạng đều có bản sao giống nhau. |
| D12 | Cụ Bình trao Trang Sổ Vàng thứ hai | Cụ Bình trao Trang Sổ Vàng thứ hai và nhắc: sổ thì ai cũng kiểm được, nhưng làm sao biết giấy nợ đúng là người đó viết? Mình sang Làng Khắc Dấu. |

---

## Làng Khắc Dấu — khóa riêng, khóa công khai và chữ ký

| Mã | Bắt đầu khi trên màn hình… | Lời thuyết minh |
|---|---|---|
| K01 | Dịch chuyển tới cổng Làng Khắc Dấu, hộp thoại chú Dũng | Ở Làng Khắc Dấu, mỗi người có một khuôn dấu riêng cất kín và một mẫu dấu công khai treo ở đình. Từ khuôn tạo ra mẫu thì dễ, nhìn mẫu mà đoán ngược ra khuôn thì rất khó. |
| K02 | Nhặt thẻ "Em có biết?" đầu tiên của Làng Khắc Dấu | Bốn thẻ của làng nói rằng: chữ ký số được tính từ chính nội dung, đổi nội dung là chữ ký không còn khớp. Khóa công khai tính từ khóa riêng bằng công thức 5 mũ x chia 23 lấy dư: tính xuôi dễ, tính ngược khó. Ví dụ khóa riêng 15 cho khóa công khai 19. Bitcoin dùng khóa riêng 256 bit, khoảng 1,16 nhân 10 mũ 77 khả năng, nên không thể đoán bằng cách thử lần lượt. Và nếu tự giữ ví mà mất hết bản sao khóa riêng thì không ai lấy lại giúp được. |
| K03 | Trang bài học màn 7 mở, trạm Dễ | Màn 7, "Khuôn riêng, mẫu chung". Bảng khóa của làng dùng công thức 5 mũ x chia 23 lấy dư. Khóa riêng của em là 12, khóa công khai là 18. Với độ khó dễ, em đóng dấu bằng khuôn riêng và dùng máy soi dấu kiểm xem dấu thuộc về ai bằng mẫu công khai. [SL: thư và người đóng dấu] |
| K04 | Trạm Trung bình bắt đầu | Với độ khó trung bình, Tí gửi mấy lá thư giả, còn kèm cả mẫu dấu tự làm. Ví dụ thư ghi "Từ cụ Bình" nhưng con dấu chỉ khớp mẫu của Tí. Em chỉ tin bảng mẫu công khai của làng, không tin mẫu do người gửi đính kèm. [SL: các lá thư và kết quả] |
| K05 | Trạm Khó bắt đầu | Với độ khó khó, em thử đoán ngược khóa riêng từ khóa công khai. Biết khóa công khai 19, em thử x bằng 1, 2, 3… tới x bằng 15 mới ra 19. Số nhỏ như 23 thì thử được, nhưng khi số rất lớn thì số lần thử nhiều tới mức không thể làm xong. [SL: số lần thử và bước trạm Khó] |
| K06 | Màn kết quả màn 7 hiện | Phần này liên quan tới blockchain ở chỗ: khuôn riêng là khóa riêng, mẫu công khai là khóa công khai, con dấu là chữ ký số. Trong blockchain thật, mỗi ví có một cặp khóa. Muốn chuyển tiền, em ký giao dịch bằng khóa riêng; cả mạng kiểm chữ ký bằng khóa công khai của em mà không cần biết khóa riêng. Địa chỉ ví mà em đưa cho người khác để nhận tiền cũng được tạo từ khóa công khai. Vì vậy khóa riêng phải giữ thật kín. |
| K07 | Màn 8 bắt đầu | Màn 8, "Lật thẻ tìm cặp khóa". Tí trộn bộ khuôn tập của chú Dũng. Em lật 2 thẻ mỗi lượt để ghép khuôn tập với mẫu công khai của nó. Khuôn 3 ghép với mẫu 10, vì 5 mũ 3 bằng 125, chia 23 dư 10. Khuôn 5 ghép với 20, khuôn 6 ghép với 8, khuôn 7 ghép với 17. Có nút máy tính mod để tính. Phần này liên quan tới blockchain ở chỗ: mỗi khóa riêng chỉ cho đúng một khóa công khai, và em luôn tính xuôi, không đoán ngược. |
| K08 | Màn 9, bước nạp trứng | Màn 9, "Bắn trứng khắc dấu". Trước mỗi đợt, em nạp trứng: chọn đúng mẫu công khai cho từng khóa riêng. Khóa 3 nạp trứng số 10, khóa 5 nạp 20, khóa 6 nạp 8. Cẩn thận nhãn bẫy là chính số khóa riêng. [SL: nhãn nhiễu] |
| K09 | Đợt bắn trứng bắt đầu | Em chọn loại trứng rồi bắn lên bàn; từ 3 quả cùng số chạm nhau thì vỡ, quả không còn nối lên trần thì rơi. Phần này liên quan tới blockchain ở chỗ: ai cũng tính được khóa công khai từ khóa riêng, nên ai cũng kiểm được chữ ký, nhưng chỉ người giữ khóa riêng mới tạo được chữ ký. |
| K10 | Chú Dũng trao Trang Sổ Vàng thứ ba | Chú Dũng trao Trang Sổ Vàng thứ ba. Không giả dấu được nữa, Tí chuyển sang trộn giao dịch ở Làng Bạc. |

---

## Làng Bạc — cây gộp sổ (cây Merkle)

| Mã | Bắt đầu khi trên màn hình… | Lời thuyết minh |
|---|---|---|
| B01 | Dịch chuyển tới cổng Làng Bạc, hộp thoại thầy Linh | Ở Làng Bạc, mỗi ngày có hàng trăm khoản bạc qua tay. Thầy Linh gộp từng cặp giao dịch lên cây đa, để chỉ cần nhìn một con số ở gốc là biết sổ có bị sửa hay không. |
| B02 | Nhặt thẻ "Em có biết?" đầu tiên của Làng Bạc | Bốn thẻ của làng nói rằng: một khối chứa rất nhiều giao dịch, cây Merkle gói tất cả thành một số gốc. Cách tạo cây là ghép từng cặp, rồi ghép tiếp các kết quả, theo công thức lấy số bên trái nhân 10 cộng số bên phải; ví dụ 2, 5, 3, 8 cho gốc 288. Cây giống bảng đấu loại trực tiếp: 16 lá cần 15 lần ghép. Và chỉ cần sửa một giao dịch là gốc đổi. |
| B03 | Trang bài học màn 10 mở, trạm Dễ | Màn 10, "Cây gộp sổ". Với độ khó dễ, em ghép hai giao dịch: lấy số bên trái nhân 10, cộng số bên phải. T1 là 3, T2 là 7, ghép T12 được 37. T3 là 5, T4 là 2, ghép T34 được 52. Cẩn thận câu T21: T2 đứng trái, 7 nhân 10 cộng 3 được 73, khác 37. Thứ tự ghép rất quan trọng. |
| B04 | Trạm Trung bình bắt đầu (cây 4 lá) | Với độ khó trung bình, em dựng cây từ 4 lá 4, 2, 6, 1: ghép được 42 và 61, rồi 42 nhân 10 cộng 61 được gốc 481. Sau đó Tí lén đổi T3 từ 6 thành 7: T34 thành 71, gốc thành 491. Em đi từ gốc xuống, chỉ soi nhánh nào khác: nhánh trái vẫn 42, nhánh phải đổi từ 61 thành 71, đi tiếp xuống là tìm ra T3. |
| B05 | Trạm Khó bắt đầu (cây 8 lá) | Với độ khó khó, cây 8 lá 3, 7, 5, 2, 6, 1, 4, 8 bị xé mất 6 ô. Ô T56 còn số 61, mà T5 là 6, nên lá T6 phải là 1. T12 là 37, T34 là 52, T78 là 48, T5 đến 8 là 61 nhân 10 cộng 48 được 658, gốc là 422 nhân 10 cộng 658 được 4878. Trong khay có 2 mảnh bẫy 25 và 84, là kết quả khi ghép ngược thứ tự. |
| B06 | Màn kết quả màn 10 hiện | Phần này liên quan tới blockchain ở chỗ: cây gộp sổ chính là cây Merkle, và số gốc là gốc Merkle. Trong blockchain thật, mỗi khối Bitcoin ghi gốc Merkle của mọi giao dịch trong khối. Nhờ vậy các node chỉ cần so một con số là biết khối có bị sửa không, và ví trên điện thoại có thể kiểm một giao dịch có nằm trong khối hay không mà không cần tải cả khối, chỉ cần vài con số trên đường từ lá lên gốc. |
| B07 | Màn 11 bắt đầu | Màn 11, "Ghép lá cây sổ". Em đổi chỗ 2 ô kề nhau để có từ 3 lá cùng loại thẳng hàng. Mỗi hàng nổ thì một lá bay lên lấp ô trống trên cây; hai ô cạnh nhau đầy thì gộp thành cành, đủ cành thì lên gốc. Lá giả của Tí chỉ mất khi có hàng nổ ngay sát bên. Phần này liên quan tới blockchain ở chỗ: lá gộp thành cành, cành gộp lên gốc, đúng cách cây Merkle được dựng từ dưới lên. |
| B08 | Màn 12 bắt đầu | Màn 12, "Leo bậc gỗ". Tí tráo lá T8 từ 8 thành 9, nên số gốc báo lệch. Em leo từ lá bị tráo lên gốc, mỗi tầng chọn đúng bậc ghép theo thứ tự trái rồi phải. Tầng 1: T7 là 4, T8 mới là 9, ghép 4 nhân 10 cộng 9 được 49, không phải 94. Tầng 2: T56 là 61, ghép 61 nhân 10 cộng 49 được 659. Tầng 3: T1 đến 4 là 422, ghép 422 nhân 10 cộng 659 được gốc mới 4879, khác gốc cũ 4878. |
| B09 | Leo tới gốc | Cây có 8 lá mà em chỉ cần leo 3 tầng. Phần này liên quan tới blockchain ở chỗ: đây chính là bằng chứng Merkle. Muốn chứng minh một giao dịch nằm trong khối, chỉ cần các số trên đường từ lá lên gốc. Cây có một triệu giao dịch cũng chỉ cần khoảng 20 tầng. |
| B10 | Cảnh cao trào hiện | Bị bắt ở mọi làng, Tí hiểu ra: sửa trang thì cả chuỗi lệch, gian thì mất cọc, giả dấu thì bị soi ra, tráo lá thì số gốc đổi. Hóa ra làm thật mới có lời. Thầy Linh trao Trang Sổ Vàng thứ tư. |
| B11 | Màn kết quả cuối hiện | Tóm lại, qua 4 làng các em đã gặp 4 ý chính của blockchain: các khối nối thành chuỗi nên khó sửa; nhiều node cùng giữ sổ và đồng thuận; khóa riêng và chữ ký số để biết ai là người ký; cây Merkle để kiểm nhanh hàng nghìn giao dịch. Chúc các em chơi vui và học tốt. |

---

## Số liệu khóa cứng trong bản demo

| Màn | Số liệu |
|---|---|
| Thẻ Em có biết | Theo đáp án trong `knowQuiz.ts` (Giấy: A, B, 44, C; Dệt: D, A, C, B; Khắc Dấu: A, 19, B, C; Bạc: C, 288, A, D). Bot luôn trả lời đúng |
| 1 Dễ | Bìa 10, nội dung 23, 45, 7, 88, 12 → 43, 31, 69, 26, 64 |
| 1 TB | Chuỗi của trạm Dễ; Tí đổi trang 2: 45 → 72 → mã 58, 23, 34, 80 |
| 1 Khó | Bìa 79; trang 1 nội dung 29 (mã 87); trang 2, 3, 4 nội dung 22, 18, 47; trang 2 bị đổi → 96, 10, 67 |
| 2 | Câu hỏi cuối vòng: mã trước 40, nội dung 25 → 5 (đáp án C; A 50, B 105, C 5, D 65) |
| 3 | Bìa 10; vòng 1 ghép 43, 31, 69; vòng 2 có trang giả (31, 50, 99) |
| 4 | Dễ: trang cuối 57; (57, 36, 50) → Đồng ý; (57, 36, 51) → Từ chối. Khó: 25, 18 → 68. Còn lại: Claude Code đặt, báo lại |
| 5 | 3 lượt câu hỏi: B2-03 (Từ chối), B2-04 (Đồng ý), B2-06 (đa số đồng ý) |
| 6 | 1 cổng; câu hỏi Claude Code chọn trong Bài 1–2, báo lại |
| 7 | Bảng khóa của spec 07 (em 12 → 18; An 15 → 19; Bình 17 → 15; Tí 13 → 21). Khó: tìm x từ 19 → 15 |
| 8 | Vòng 1: khuôn 3, 5, 6, 7 ↔ mẫu 10, 20, 8, 17 |
| 9 | Đợt 1: khóa 3, 5, 6 → trứng 10, 20, 8 |
| 10 | Dễ: 3, 7, 5, 2 → T12 37, T34 52, T21 73. TB: 4, 2, 6, 1 → 42, 61, 481; T3 6 → 7 → 71, 491. Khó: lá 3 7 5 2 6 1 4 8, ô ẩn T6, T12, T34, T78, T5-8, gốc → 1, 37, 52, 48, 658, 4878; mảnh bẫy 25, 84 |
| 11 | Vòng 1 (4 ô cây), seed cố định |
| 12 | Vòng 1: lá 3 7 5 2 6 1 4 8, T8 8 → 9: chọn 49 (bẫy 94), 659 (bẫy 551), 4879 (bẫy 7012) |

## Rút ngắn game phụ (chỉ trong bản demo)

| Màn | Bản thật | Bản demo |
|---|---|---|
| 2 | 4 vòng × 25 giây | 1 vòng 25 giây + 1 câu hỏi |
| 3 | 2 vòng (5 rồi 7 trang) | Vòng 1: 3 trang; vòng 2: 3 trang + 1 trang giả |
| 5 | 10 lượt câu hỏi | 3 lượt câu hỏi, chuột thường thưa hơn |
| 6 | 4 cổng | 1 cổng (6 khe) |
| 8 | 3 vòng | Vòng 1 (4 cặp) |
| 9 | 3 đợt | Đợt 1, ít trứng |
| 11 | 3 vòng | Vòng 1 (4 ô cây) |
| 12 | 3 vòng | Vòng 1 (8 lá), rồi cao trào |