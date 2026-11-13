/** Dựng đề của chế độ trọn từ số liệu đầu vào (`data.ts`) bằng logic sẵn có của các bài. Hàm thuần, có test ở `data.test.ts`. */
import { buildChain } from '../../lib/chain';
import type { EasyData } from '../../lessons/bai-2/logic';
import type { TRON_DATA } from './data';

type Man4Easy = typeof TRON_DATA.man4.easy;

/** Màn 4 trạm Dễ: sổ 2 trang (mã trang cuối 57) và 5 vòng; cờ hợp lệ do `isValid` ghi theo kết quả logic (lưu ý: chỉ trang hợp lệ làm đổi mã trang cuối). */
export function tronEasyData(d: Man4Easy, isValidProposal: (last: number, p: { prevCode: number; content: number; code: number }) => string): EasyData {
  const codes = buildChain(d.startGenesis, [...d.startContents]);
  const startPages = [
    { prevCode: d.startGenesis, content: d.startContents[0], code: codes[0] },
    { prevCode: codes[0], content: d.startContents[1], code: codes[1] },
  ];
  let last = codes[1];
  const rounds = d.rounds.map((r) => {
    const ok = isValidProposal(last, { prevCode: last, content: r.content, code: r.code }) === 'ok';
    if (ok) last = r.code;
    return { sender: r.sender, content: r.content, code: r.code, isValid: ok };
  });
  return { startGenesis: d.startGenesis, startPages, rounds };
}
