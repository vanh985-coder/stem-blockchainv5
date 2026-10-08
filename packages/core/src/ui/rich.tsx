import { Fragment, type ReactNode } from 'react';
import { fmt, type FmtVars } from '../content/characters';

/** Một đoạn của chuỗi có đánh dấu: chữ thường, **đậm**, ~~nghiêng~~, ^^chỉ số trên^^ */
export type RichNode = string | { mark: 'b' | 'i' | 'sup'; children: RichNode[] };

const MARKS = [
  ['**', 'b'],
  ['~~', 'i'],
  ['^^', 'sup'],
] as const;

/**
 * Hàm thuần: tách chuỗi có đánh dấu thành cây. Các dấu lồng nhau được (ví dụ "**5^^x^^ mod 23**").
 * Dấu không có dấu đóng thì giữ nguyên là chữ thường.
 */
export function parseRich(text: string): RichNode[] {
  const out: RichNode[] = [];
  let i = 0;
  let plain = '';
  const flush = () => {
    if (plain) out.push(plain);
    plain = '';
  };
  while (i < text.length) {
    const hit = MARKS.find(([m]) => text.startsWith(m, i));
    if (hit) {
      const [m, mark] = hit;
      const end = text.indexOf(m, i + m.length);
      if (end > i + m.length) {
        flush();
        out.push({ mark, children: parseRich(text.slice(i + m.length, end)) });
        i = end + m.length;
        continue;
      }
    }
    plain += text[i];
    i++;
  }
  flush();
  return out;
}

function render(nodes: RichNode[]): ReactNode {
  return nodes.map((n, idx) => {
    if (typeof n === 'string') return <Fragment key={idx}>{n}</Fragment>;
    const inner = render(n.children);
    if (n.mark === 'b') return <strong key={idx}>{inner}</strong>;
    if (n.mark === 'i') return <em key={idx}>{inner}</em>;
    return <sup key={idx}>{inner}</sup>;
  });
}

/**
 * Dựng một câu trọn vẹn từ content/: thay chỗ giữ tên bằng fmt() rồi đổi dấu đánh dấu thành chữ đậm, nghiêng, chỉ số trên.
 * Dùng chung cho mọi bài để không phải cắt câu thành mảnh quanh thẻ <strong>.
 */
export function rich(text: string, vars?: FmtVars): ReactNode {
  return render(parseRich(fmt(text, vars)));
}
