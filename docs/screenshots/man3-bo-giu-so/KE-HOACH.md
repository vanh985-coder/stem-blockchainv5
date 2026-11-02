# Kế hoạch bỏ đoạn giữ sổ Màn 3 "Ghép lại cuốn sổ" (02/11/2026)

- Giữ sổ không dùng chung với màn khác (chỉ nằm trong rebuild của Làng Giấy).
- Điểm tối đa mới: 230 điểm (Vòng 1: 100 điểm; Vòng 2: 130 điểm; cũ: 355 điểm).
- File logic/giao diện sửa: packages/village-lang-giay/src/rebuild/{rebuildConfig.ts, rebuildLogic.ts, rebuildBots.ts, rebuildHint.ts, rebuildLayout.ts, RebuildGame.tsx, RebuildCards.tsx, RebuildActors.tsx}, packages/village-lang-giay/src/pages/Man3.tsx.
- File chữ/hướng dẫn sửa: packages/core/src/content/{huongDanGame.ts, huongDan.ts, games.ts}, packages/core/src/ui/GuideArt.tsx, docs/specs/05-bai1-lang-giay.md.
- Hàm/thành phần bỏ: enterKeep, stepKeep, swapIntervalAt, swapSchedule, beginKeep, keepUnfixed, keepChainStatus, keepTimeLeft, keepHalf, makeFakeOf, makeDecoy, keepScoreNow, finishKeep, placeInSlot, binFromSlot, binFromTable, playKeep (bot), KeepChainRow, KeepWarm, ChainStatus, hàm vẽ ro-trang.
- File/test bỏ: xóa rebuildKeep.test.ts; bỏ block 'vòng 3: giữ sổ' ở rebuildLayout.test.ts; bỏ ca test giữ sổ ở rebuildLogic.test.ts, rebuildHint.test.ts, rebuildBalance.test.ts.
- Luồng chơi mới: Vòng 1 ghép 5 trang -> banner "Vòng 1 xong" -> "Vòng tiếp theo" -> Vòng 2 ghép 7 trang (bỏ trang giả vào rổ +30) -> ghép xong vào thẳng màn kết quả ("complete").
- Mốc điểm: Đồng = p25, Bạc = p75 bot trung bình, Vàng = 205 (tối đa 230 − 25 do p10 bot giỏi = 230).
- Kiểm tra: 4 lệnh pnpm (test, typecheck, check:text, build) và script man3-bo-giu-so-check.mjs.
