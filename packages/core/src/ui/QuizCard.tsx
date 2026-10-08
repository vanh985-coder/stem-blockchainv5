import { useEffect, useId, useState } from 'react';
import { sound } from '../audio/sound';
import { fmt, type FmtVars } from '../content/characters';
import type { Question } from '../content/questions';
import { ui } from '../content/ui';
import { recordAnswer } from '../quiz/recordAnswer';
import { Button } from './Button';
import { Panel } from './Panel';

export interface QuizCardProps {
  question: Question;
  /** Gọi một lần ngay khi em chọn đáp án */
  onAnswer: (correct: boolean, questionId: string) => void;
  /** Có thì hiện nút "Câu tiếp theo" sau khi trả lời */
  onContinue?: () => void;
  continueLabel?: string;
  /** Biến cho fmt(), ví dụ { ten: 'Lan' } */
  vars?: FmtVars;
  /** Ví dụ "Câu 2/4", hiện phía trên câu hỏi */
  caption?: string;
  className?: string;
}

/** Thẻ câu hỏi: đáp án là nút (bấm bằng chuột, chạm hoặc bàn phím). Đúng/sai có biểu tượng và chữ, không chỉ màu. */
export function QuizCard({ question, onAnswer, onContinue, continueLabel, vars, caption, className = '' }: QuizCardProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const titleId = useId();
  const answered = chosen !== null;
  const correct = chosen === question.correctIndex;

  // Sang câu mới thì xóa lựa chọn cũ.
  useEffect(() => {
    setChosen(null);
  }, [question.id]);

  const choose = (index: number) => {
    if (answered) return;
    const ok = index === question.correctIndex;
    setChosen(index);
    if (ok) sound.playCorrect();
    else sound.playWrong();
    void recordAnswer({ questionId: question.id, correct: ok, chosenIndex: index });
    onAnswer(ok, question.id);
  };

  return (
    <Panel className={['w-full max-w-2xl', className].join(' ')} role="group" aria-labelledby={titleId}>
      {caption && <p className="mb-1 text-sm font-semibold text-nau-go-dam">{caption}</p>}
      <h2 id={titleId} className="mb-4 text-xl leading-snug sm:text-2xl">
        {fmt(question.text, vars)}
      </h2>

      <ul className="space-y-3">
        {question.options.map((option, i) => {
          const isRight = answered && i === question.correctIndex;
          const isWrongPick = answered && i === chosen && !isRight;
          const tone = isRight
            ? 'border-xanh-la-dam bg-xanh-la/20'
            : isWrongPick
              ? 'border-do-son-dam bg-do-son/15'
              : 'border-nau-go bg-giay hover:brightness-105';
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => choose(i)}
                className={[
                  'flex min-h-[52px] w-full items-center gap-3 rounded-nut border-2 px-4 py-3 text-left text-base font-semibold sm:text-lg',
                  'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim',
                  answered ? 'cursor-default' : 'cursor-pointer',
                  tone,
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-nau-go bg-white/70 font-display text-base font-extrabold"
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{fmt(option, vars)}</span>
                {isRight && (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-xanh-la-dam">
                    <span aria-hidden="true">✓</span> {ui.quiz.dapAnDung}
                  </span>
                )}
                {isWrongPick && (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-do-son-dam">
                    <span aria-hidden="true">✗</span> {ui.quiz.emChon}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-2xl border-2 p-4 ${correct ? 'border-xanh-la-dam bg-xanh-la/15' : 'border-do-son-dam bg-do-son/10'}`}
        >
          <p className={`flex items-center gap-2 font-display text-xl font-extrabold ${correct ? 'text-xanh-la-dam' : 'text-do-son-dam'}`}>
            <span
              aria-hidden="true"
              className={`grid size-7 place-items-center rounded-full text-base text-white ${correct ? 'bg-xanh-la-dam' : 'bg-do-son'}`}
            >
              {correct ? '✓' : '✗'}
            </span>
            {correct ? ui.quiz.dungRoi : ui.quiz.chuaDung}
          </p>
          {!correct && (
            <p className="mt-2 font-semibold">
              {ui.quiz.dapAnDungLa} {fmt(question.options[question.correctIndex], vars)}
            </p>
          )}
          <p className="mt-2 leading-relaxed">
            <span className="font-bold">{ui.quiz.giaiThich}</span>
            {fmt(question.explanation, vars)}
          </p>
          {onContinue && (
            <div className="mt-3 flex justify-end">
              <Button autoFocus onClick={onContinue}>
                {continueLabel ?? ui.quiz.cauTiep}
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
