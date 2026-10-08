import { pageCode, buildChain, isSafeDelta } from '../../lib/chain';
import { GAME_CONFIG } from '../../config/gameConfig';
import { formatNumber } from '../../lib/format';
import { fmt } from '../../content/characters';
import { bai2Logic } from '../../content/lessons/bai-2';

export type Proposal = {
  prevCode: number;
  content: number;
  code: number;
  note?: string;
  type?: 'A' | 'B';
};

export type ProposalStatus = 'ok' | 'prev-mismatch' | 'wrong-code';

/**
 * Kiểm tra tính hợp lệ của trang đề xuất:
 * - prevCode !== myLastCode -> 'prev-mismatch' (kiểm trước)
 * - code !== pageCode(prevCode, content) -> 'wrong-code'
 * - còn lại -> 'ok'
 */
export function isValidProposal(myLastCode: number, p: Proposal): ProposalStatus {
  if (p.prevCode !== myLastCode) {
    return 'prev-mismatch';
  }
  if (p.code !== pageCode(p.prevCode, p.content)) {
    return 'wrong-code';
  }
  return 'ok';
}

/**
 * Câu phản hồi có phép tính dùng dấu × và định dạng chuẩn:
 * - prev-mismatch: "Mã trang trước ghi là 62, nhưng trang cuối trong sổ của em là 57, không khớp, nên Từ chối."
 * - wrong-code: "(57 × 2 + 36) mod 100 = 50, không khớp với 53, nên Từ chối."
 * - ok: "(57 × 2 + 36) mod 100 = 50, khớp với 50, nên Đồng ý."
 */
export function explainCheck(myLastCode: number, p: Proposal): string {
  const status = isValidProposal(myLastCode, p);
  if (status === 'prev-mismatch') {
    return fmt(bai2Logic.truocKhongKhop, { truoc: formatNumber(p.prevCode), cuoi: formatNumber(myLastCode) });
  }
  const correct = pageCode(p.prevCode, p.content);
  if (status === 'wrong-code') {
    return fmt(bai2Logic.maSai, {
      truoc: formatNumber(p.prevCode),
      nd: formatNumber(p.content),
      dung: formatNumber(correct),
      ma: formatNumber(p.code),
    });
  }
  return fmt(bai2Logic.maDung, { truoc: formatNumber(p.prevCode), nd: formatNumber(p.content), ma: formatNumber(p.code) });
}

/**
 * Sinh mã sai: correct ± offset trong offsets, kết quả nằm trong [0, 99] (KHÔNG quay vòng mod).
 * Chỉ chọn trong các cặp (dấu, offset) hợp lệ.
 */
export function wrongCode(
  correct: number,
  rng: () => number,
  offsets: readonly number[] = GAME_CONFIG.lesson2.easy.wrongOffsets
): number {
  const candidates: number[] = [];
  for (const offset of offsets) {
    if (correct + offset <= 99) {
      candidates.push(correct + offset);
    }
    if (correct - offset >= 0) {
      candidates.push(correct - offset);
    }
  }

  if (candidates.length === 0) {
    return correct === 0 ? 1 : correct - 1;
  }

  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx];
}

export type EasyRound = {
  sender: 'binh' | 'chi' | 'ti';
  content: number;
  code: number;
  isValid: boolean;
};

export type EasyData = {
  startGenesis: number;
  startPages: { prevCode: number; content: number; code: number }[];
  rounds: EasyRound[];
};

/**
 * Sinh đề cho màn Dễ:
 * - Sổ ban đầu: mã bìa ngẫu nhiên 10–89 và 2 trang, dùng buildChain.
 * - Người gửi luân phiên Bình, Chi, Tí, Bình, Chi.
 * - Chọn ngẫu nhiên 2 hoặc 3 vòng hợp lệ, xáo vị trí.
 * - Mã của mỗi vòng tính theo X LÚC ĐÓ. X chỉ đổi sau vòng hợp lệ.
 */
export function generateEasy(rng: () => number): EasyData {
  const startGenesis = 10 + Math.floor(rng() * 80); // 10..89
  const startContents = [
    1 + Math.floor(rng() * 99),
    1 + Math.floor(rng() * 99),
  ];
  const startCodes = buildChain(startGenesis, startContents);
  const startPages = [
    { prevCode: startGenesis, content: startContents[0], code: startCodes[0] },
    { prevCode: startCodes[0], content: startContents[1], code: startCodes[1] },
  ];

  let currentLastCode = startCodes[1];
  const senders: ('binh' | 'chi' | 'ti')[] = ['binh', 'chi', 'ti', 'binh', 'chi'];

  // Chọn ngẫu nhiên 2 hoặc 3 vòng hợp lệ
  const validCount = rng() < 0.5 ? 2 : 3;
  const isValids: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    isValids.push(i < validCount);
  }
  // Xáo vị trí
  for (let i = isValids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = isValids[i];
    isValids[i] = isValids[j];
    isValids[j] = temp;
  }

  const rounds: EasyRound[] = [];
  for (let i = 0; i < 5; i++) {
    const sender = senders[i];
    const isValid = isValids[i];
    const content = 1 + Math.floor(rng() * 99);
    const correctCode = pageCode(currentLastCode, content);

    let code: number;
    if (isValid) {
      code = correctCode;
      currentLastCode = code; // Trang hợp lệ được thêm vào sổ
    } else {
      code = wrongCode(correctCode, rng);
      // Trang sai thì không thêm, currentLastCode giữ nguyên
    }

    rounds.push({ sender, content, code, isValid });
  }

  return { startGenesis, startPages, rounds };
}

export type MediumRoundKind = 'valid' | 'wrong-code' | 'tampered';

export type MediumPage = {
  prevCode: number;
  content: number;
  code: number;
};

export type MediumRound = {
  sender: 'binh' | 'chi' | 'ti';
  kind: MediumRoundKind;
  senderPages: MediumPage[];
  proposal: Proposal;
  tamperedIndex?: number;
  oldContent?: number;
  recalcIndices?: number[];
  isValid: boolean;
};

export type MediumData = {
  startGenesis: number;
  startPages: MediumPage[];
  rounds: MediumRound[];
};

/**
 * Sinh đề cho màn Trung bình:
 * - 5 vòng: đúng 2 'valid', ít nhất 1 'wrong-code', ít nhất 1 'tampered', vòng 5 ngẫu nhiên 'wrong-code' hoặc 'tampered'.
 * - Người gửi luân phiên Bình, Chi, Tí, Bình, Chi.
 * - Sổ em lúc đầu: 3 trang. Mỗi vòng lấy 3 trang cuối của em. Sổ em chỉ thêm trang ở vòng valid.
 * - 'tampered': sửa nội dung 1 trang thỏa isSafeDelta, tính lại mã từ trang đó trở đi.
 */
export function generateMedium(rng: () => number): MediumData {
  const startGenesis = 10 + Math.floor(rng() * 80);
  const startContents = [
    1 + Math.floor(rng() * 99),
    1 + Math.floor(rng() * 99),
    1 + Math.floor(rng() * 99),
  ];
  const startCodes = buildChain(startGenesis, startContents);
  const myLedger: MediumPage[] = [
    { prevCode: startGenesis, content: startContents[0], code: startCodes[0] },
    { prevCode: startCodes[0], content: startContents[1], code: startCodes[1] },
    { prevCode: startCodes[1], content: startContents[2], code: startCodes[2] },
  ];

  const fifthKind: MediumRoundKind = rng() < 0.5 ? 'wrong-code' : 'tampered';
  const kinds: MediumRoundKind[] = ['valid', 'valid', 'wrong-code', 'tampered', fifthKind];
  // Xáo thứ tự
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = kinds[i];
    kinds[i] = kinds[j];
    kinds[j] = temp;
  }

  const senders: ('binh' | 'chi' | 'ti')[] = ['binh', 'chi', 'ti', 'binh', 'chi'];
  const rounds: MediumRound[] = [];

  for (let i = 0; i < 5; i++) {
    const sender = senders[i];
    const kind = kinds[i];
    const myLast3 = myLedger.slice(-3);
    const myLastCode = myLast3[myLast3.length - 1].code;
    const content = 1 + Math.floor(rng() * 99);

    if (kind === 'valid') {
      const prevCode = myLastCode;
      const code = pageCode(prevCode, content);
      const senderPages: MediumPage[] = myLast3.map((p) => ({ ...p }));
      const proposal: Proposal = { prevCode, content, code };
      myLedger.push({ prevCode, content, code });
      rounds.push({
        sender,
        kind,
        senderPages,
        proposal,
        isValid: true,
      });
    } else if (kind === 'wrong-code') {
      const prevCode = myLastCode;
      const correctCode = pageCode(prevCode, content);
      const code = wrongCode(correctCode, rng);
      const senderPages: MediumPage[] = myLast3.map((p) => ({ ...p }));
      const proposal: Proposal = { prevCode, content, code };
      rounds.push({
        sender,
        kind,
        senderPages,
        proposal,
        isValid: false,
      });
    } else {
      // tampered
      const senderPages: MediumPage[] = myLast3.map((p) => ({ ...p }));
      const j = Math.floor(rng() * 3);
      const oldContent = senderPages[j].content;
      let newContent = 1 + Math.floor(rng() * 99);
      while (!isSafeDelta(oldContent, newContent)) {
        newContent = 1 + Math.floor(rng() * 99);
      }
      senderPages[j] = { ...senderPages[j], content: newContent };

      // Tính lại mã từ trang j trở đi
      const recalcIndices: number[] = [];
      for (let k = j; k < senderPages.length; k++) {
        const prev = k === 0 ? senderPages[0].prevCode : senderPages[k - 1].code;
        senderPages[k] = {
          ...senderPages[k],
          prevCode: prev,
          code: pageCode(prev, senderPages[k].content),
        };
        recalcIndices.push(k);
      }

      const senderLastCode = senderPages[senderPages.length - 1].code;
      const prevCode = senderLastCode;
      const code = pageCode(prevCode, content);
      const proposal: Proposal = { prevCode, content, code };

      rounds.push({
        sender,
        kind,
        senderPages,
        proposal,
        tamperedIndex: j,
        oldContent,
        recalcIndices,
        isValid: false,
      });
    }
  }

  return {
    startGenesis,
    startPages: myLedger.slice(0, 3),
    rounds,
  };
}
