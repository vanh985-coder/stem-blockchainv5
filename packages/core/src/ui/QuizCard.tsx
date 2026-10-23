import { useEffect, useId, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { fmt, type FmtVars } from '../content/characters';
import type { Question } from '../content/questions';
import { ui } from '../content/ui';
import { recordAnswer } from '../quiz/recordAnswer';
import { choiceReactions } from '../three/choiceReactions';
import { useChoiceHandlers } from '../three/useReaction';
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
  /** Màn đang hỏi (1 đến 12), ghi vào quiz_answers; 0 hoặc không có = thử thách cuối */
  levelId?: number;
  /** Ví dụ "Câu 2/4", hiện phía trên câu hỏi */
  caption?: string;
  /** Gọn (cột hẹp cạnh một cảnh, ví dụ lượt trùm của màn 5): chữ, nút và khoảng cách nhỏ hơn */
  compact?: boolean;
  className?: string;
}

/** Màn hình thấp (cao tối đa 520 px, điện thoại nằm ngang): thẻ câu hỏi dùng kiểu gọn để vừa khung */
function useShortScreen(): boolean {
  const query = '(max-height: 520px)';
  const [short, setShort] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const sync = () => setShort(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return short;
}

/** Thẻ câu hỏi: đáp án là nút (bấm bằng chuột, chạm hoặc bàn phím). Đúng/sai có biểu tượng và chữ, không chỉ màu. */
export function QuizCard({ question, onAnswer, onContinue, continueLabel, vars, caption, levelId, compact = false, className = '' }: QuizCardProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const titleId = useId();
  const answered = chosen !== null;
  // chiều cao màn hình ngắn (điện thoại nằm ngang): dùng kiểu gọn như `compact`
  const short = useShortScreen();
  const tight = compact || short;
  const correct = chosen === question.correctIndex;

  // Phát sự kiện cho nhân vật 3D (rê/focus, chọn, kết quả); khung 3D ở trang bài học chỉ nghe kho này.
  const reactions = useChoiceHandlers();
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (choiceReactions.getState().locked) choiceReactions.reset();
    };
  }, []);

  // Sang câu mới thì xóa lựa chọn cũ.
  useEffect(() => {
    setChosen(null);
    pending.current = false;
  }, [question.id]);

  const reveal = (index: number) => {
    const ok = index === question.correctIndex;
    setChosen(index);
    if (ok) sound.playCorrect();
    else sound.playWrong();
    void recordAnswer({ questionId: question.id, correct: ok, chosenIndex: index, levelId });
    onAnswer(ok, question.id);
  };

  const choose = (index: number, el: HTMLElement) => {
    if (answered || pending.current) return;
    pending.current = true;
    // Chạm thì nhân vật chỉ 0,3 giây rồi mới hiện kết quả; chuột và bàn phím hiện ngay.
    void reactions.select(el).then(() => {
      pending.current = false;
      if (alive.current) reveal(index);
    });
  };

  return (
    <Panel className={['flex max-h-full min-h-0 w-full max-w-2xl flex-col', tight ? '!p-2' : '', className].join(' ')} role="group" aria-labelledby={titleId}>
      {/* Thân: câu hỏi và đáp án giữ nguyên chỗ, phần giải thích cuộn khi dài; chật quá (cả hai không đủ chỗ) thì cả thân cuộn. Nút "tiếp" nằm ngoài thân, luôn thấy ở đáy bảng. */}
      <div className="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <div className="shrink-0">
          {caption && <p className="mb-1 text-sm font-semibold text-nau-go-dam">{caption}</p>}
          <h2 id={titleId} className={tight ? `mb-1.5 text-[0.95rem] font-bold leading-snug ${answered ? 'line-clamp-2' : ''}` : 'mb-4 text-xl leading-snug sm:text-2xl'}>
            {fmt(question.text, vars)}
          </h2>

          <ul className={`${tight ? 'space-y-1' : 'space-y-3'} ${answered && tight ? 'hidden' : ''}`}>
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
                    {...reactions.bindChoice()}
                    onClick={(e) => choose(i, e.currentTarget)}
                    className={[
                      tight ? 'flex min-h-11 w-full items-center gap-2 rounded-nut border-2 px-2 py-1.5 text-left text-sm font-semibold' : 'flex min-h-[52px] w-full items-center gap-3 rounded-nut border-2 px-4 py-3 text-left text-base font-semibold sm:text-lg',
                      'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim',
                      answered ? 'cursor-default' : 'cursor-pointer',
                      tone,
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid shrink-0 place-items-center rounded-full border-2 border-nau-go bg-white/70 font-display font-extrabold ${tight ? 'size-6 text-sm' : 'size-8 text-base'}`}
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
        </div>

        {answered && (
          <div
            role="status"
            aria-live="polite"
            className={`flex flex-auto flex-col rounded-2xl border-2 ${tight ? 'mt-2 min-h-[5.5rem] p-2 text-sm' : 'mt-4 min-h-[10rem] p-4'} ${correct ? 'border-xanh-la-dam bg-xanh-la/15' : 'border-do-son-dam bg-do-son/10'}`}
          >
            <p className={`flex shrink-0 items-center gap-2 font-display font-extrabold ${tight ? 'text-base' : 'text-xl'} ${correct ? 'text-xanh-la-dam' : 'text-do-son-dam'}`}>
              <span
                aria-hidden="true"
                className={`grid size-7 place-items-center rounded-full text-base text-white ${correct ? 'bg-xanh-la-dam' : 'bg-do-son'}`}
              >
                {correct ? '✓' : '✗'}
              </span>
              {correct ? ui.quiz.dungRoi : ui.quiz.chuaDung}
            </p>
            <div className="mt-2 min-h-0 flex-auto overflow-y-auto" data-testid="quiz-giai-thich" tabIndex={0}>
              {(!correct || tight) && (
                <p className="font-semibold">
                  {ui.quiz.dapAnDungLa} {fmt(question.options[question.correctIndex], vars)}
                </p>
              )}
              <p className={`${correct && !tight ? '' : 'mt-2 '}leading-relaxed`}>
                <span className="font-bold">{ui.quiz.giaiThich}</span>
                {fmt(question.explanation, vars)}
              </p>
            </div>
          </div>
        )}
      </div>

      {answered && onContinue && (
        <div className="mt-2 flex shrink-0 justify-end" data-testid="quiz-tiep">
          <Button autoFocus size={tight ? 'sm' : undefined} className={tight ? 'min-h-11' : undefined} onClick={onContinue}>
            {continueLabel ?? ui.quiz.cauTiep}
          </Button>
        </div>
      )}
    </Panel>
  );
}
