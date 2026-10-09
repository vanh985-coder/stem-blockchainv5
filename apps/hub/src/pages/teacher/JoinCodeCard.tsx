import { useEffect, useState } from 'react';
import { Button, Card } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';

const T = teacherTexts.lop;

/** Chép chữ vào bộ nhớ tạm; trả về true nếu được. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Nút sao chép, đổi chữ thành "Đã sao chép" trong giây lát; báo lỗi nếu trình duyệt không cho chép. */
export function CopyButton({ text, label, doneLabel, className }: { text: string; label: string; doneLabel: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <span className={className}>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => setState((await copyText(text)) ? 'done' : 'failed')}
      >
        {state === 'done' ? doneLabel : label}
      </Button>
      <span role="status" className="sr-only">
        {state === 'done' ? doneLabel : state === 'failed' ? T.khongSaoChep : ''}
      </span>
      {state === 'failed' && <span className="ml-2 text-sm font-semibold text-do-son-dam">{T.khongSaoChep}</span>}
    </span>
  );
}

/** Mã lớp 6 ký tự thật to, nút "Sao chép" và lời dặn cho học sinh. */
export function JoinCodeCard({ code, highlight = false }: { code: string; highlight?: boolean }) {
  return (
    <Card variant="elevated" active={highlight} className="space-y-3 text-center">
      <p className="text-base font-semibold">{T.maLop}</p>
      <p
        className="select-all font-display text-5xl font-extrabold tracking-[0.25em] text-muc-tim-dam sm:text-6xl"
        aria-label={`${T.maLop}: ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      <CopyButton text={code} label={T.saoChep} doneLabel={T.daSaoChep} />
      <p className="text-base">{T.huongDanMa}</p>
    </Card>
  );
}
