import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { sound } from '../audio/sound';
import { fmt } from '../content/characters';
import { knowQuizUi, type KnowQuiz } from '../content/knowQuiz';
import { knowScrollUi } from '../content/knowScrolls';
import { ui } from '../content/ui';
import { canCollect, chooseOption, initialQuizState, submitQuiz, typeAnswer } from '../lib/knowQuiz';
import type { StoryCard } from '../lessons/types';
import { Button } from './Button';
import { Panel } from './Panel';

export interface KnowQuizDialogProps {
  /** Thẻ (đã sửa theo P6) và câu hỏi của thẻ */
  card: StoryCard;
  quiz: KnowQuiz;
  /** Thẻ thứ mấy (từ 0) trong tổng số thẻ nhặt được của làng */
  index: number;
  total: number;
  /** 'collect': vừa nhặt cuộn, trả lời một lần rồi bấm "Cất vào sổ"; 'review': thẻ đã nhặt, chỉ xem lại (không trả lời lại) */
  mode: 'collect' | 'review';
  /** Chỉ chế độ 'collect': bấm "Cất vào sổ" sau khi đã trả lời. Đây là CHỖ DUY NHẤT ghi cờ nhặt thẻ; đóng trước đó (Esc, bấm ra ngoài, nút Đóng) thì thẻ chưa được nhặt. */
  onCollect?: () => void;
  /** Đóng hộp mà không cất thẻ (Esc, bấm ra ngoài, nút Đóng) */
  onClose: () => void;
}

/** Chặn Enter lặp: nút "Cất vào sổ" (vẫn nhận tiêu điểm) bỏ qua cú bấm xảy ra trong từng này mili giây kể từ lúc hiện đáp án, để cú Enter nộp câu trả lời không đồng thời cất thẻ. So theo THỜI ĐIỂM của sự kiện (không dùng đồng hồ hẹn giờ, vì máy chậm có thể trễ hẹn giờ). */
const SAVE_GUARD_MS = 400;
/** Cú chạm mở hộp (nút bàn tay dùng `pointerdown`) sinh thêm một cú `click` sau khi nhấc tay, rơi đúng vào hộp vừa hiện (chọn nhầm phương án, bấm nhầm nút, hoặc đóng hộp). Bỏ qua mọi cú bấm trong từng này mili giây đầu. */
const OPEN_GUARD_MS = 450;

/**
 * Hộp thẻ "Em có biết?" có câu hỏi (P6b), MỘT hộp cho cả luồng: đọc nội dung, xem ví dụ, trả lời (ABCD hoặc điền số), xem giải thích, "Cất vào sổ". Trả lời MỘT lần: sau khi nộp, lựa chọn bị khóa
 * và hiện đáp án đúng cùng giải thích dù đúng hay sai, rồi được cất thẻ. Không điểm, xu, sao, tim. Không lưu đáp án. Chữ lấy từ content/ (`knowQuiz.ts`, `knowScrolls.ts`, `ui.ts`), cỡ chữ theo rem
 * (theo "Chữ to"), không hiệu ứng chuyển động (hợp "Giảm chuyển động"). Cuộn được khi nội dung dài (điện thoại ngang).
 */
export function KnowQuizDialog({ card, quiz, index, total, mode, onCollect, onClose }: KnowQuizDialogProps) {
  const review = mode === 'review';
  const [s, setS] = useState(initialQuizState);
  const collected = useRef(false);
  /** Lúc hộp hiện (cùng đồng hồ với `event.timeStamp`) và lúc hiện đáp án */
  const openedAt = useRef(performance.now());
  const feedbackAt = useRef(Number.POSITIVE_INFINITY);
  const root = useRef<HTMLDivElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const qid = useId();
  const showAnswer = review || s.phase === 'feedback';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // vừa mở: đưa tiêu điểm vào hộp để bàn phím (Tab, Esc) dùng được ngay
  useEffect(() => {
    root.current?.focus();
  }, []);
  // chặn cú click ma của cú chạm mở hộp (và mọi cú bấm quá sớm)
  const swallowEarlyClick = (e: MouseEvent) => {
    if (e.timeStamp - openedAt.current >= OPEN_GUARD_MS) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // báo kết quả bằng cơ chế phản hồi chung của game (âm đúng/sai, theo cài đặt âm thanh; phát tín hiệu onAnswer như mọi chỗ em trả lời): một lần cho mỗi lượt trả lời
  const answered = s.result?.correct ?? null;
  useEffect(() => {
    if (review || answered === null) return;
    if (answered) sound.playCorrect();
    else sound.playWrong();
  }, [answered, review]);

  // vừa nộp: cuộn tới phần phản hồi, đưa tiêu điểm vào nút "Cất vào sổ"; ghi lúc hiện đáp án (chặn Enter lặp)
  useEffect(() => {
    if (s.phase !== 'feedback' || review) return;
    feedbackAt.current = performance.now();
    feedback.current?.scrollIntoView({ block: 'nearest' });
    saveBtn.current?.focus();
  }, [s.phase, review]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (review) return;
    setS((cur) => submitQuiz(cur, quiz));
  };

  const collect = (e: MouseEvent) => {
    if (review || collected.current || !canCollect(s) || e.timeStamp - feedbackAt.current < SAVE_GUARD_MS) return;
    collected.current = true;
    onCollect?.();
  };

  const reminder = s.reminder === 'chuaChon' ? knowQuizUi.nhacChuaChon : s.reminder === 'trong' ? knowQuizUi.nhacTrong : s.reminder === 'dinhDang' ? knowQuizUi.nhacDinhDang : null;
  const correctText = quiz.kind === 'abcd' ? `${knowQuizUi.chuCai[quiz.correct]}. ${fmt(quiz.options[quiz.correct])}` : String(quiz.answer);
  const chosen = s.result && quiz.kind === 'abcd' ? Number(s.result.given) : null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-chu/40 p-4" onClickCapture={swallowEarlyClick} onClick={onClose} data-walk-ui data-testid="the-co-cau-hoi" data-mode={mode}>
      <Panel role="dialog" aria-modal="true" aria-label={fmt(knowQuizUi.hopThe, { so: index + 1 })} className="m-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div ref={root} tabIndex={-1} className="space-y-3 outline-none">
          <p className="text-sm font-bold uppercase tracking-wider text-nau-go-dam">
            {ui.baiHoc.emCoBiet} · {fmt(ui.baiHoc.theSo, { n: index + 1, tong: total })}
          </p>
          <h2 className="text-2xl">{fmt(card.title)}</h2>
          <p className="text-lg leading-relaxed" data-testid="the-noi-dung">
            {fmt(card.text)}
          </p>
          {card.example && (
            <p className="rounded-xl border-2 border-vang bg-vang/15 p-3 text-base" data-testid="the-vi-du">
              {fmt(card.example)}
            </p>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-3 border-t-2 border-nau-go/40 pt-3" data-testid="the-cau-hoi" data-phase={review ? 'review' : s.phase}>
            {review && <p className="text-sm font-semibold text-nau-go-dam">{knowQuizUi.xemLai}</p>}
            <p id={qid} className="text-lg font-bold leading-snug">
              {knowQuizUi.cauHoi}: {fmt(quiz.question)}
            </p>

            {quiz.kind === 'abcd' ? (
              <fieldset className="space-y-2" aria-labelledby={qid} disabled={showAnswer}>
                <legend className="sr-only">{knowQuizUi.chonDapAn}</legend>
                {quiz.options.map((opt, i) => {
                  const isCorrect = showAnswer && i === quiz.correct;
                  const isWrongPick = showAnswer && !review && chosen === i && i !== quiz.correct;
                  const picked = s.choice === i;
                  return (
                    <label
                      key={i}
                      className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border-2 p-2.5 text-base leading-snug has-[:disabled]:cursor-default has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-muc-tim ${
                        isCorrect ? 'border-[4px] border-xanh-la-dam bg-xanh-la/15' : isWrongPick ? 'border-[4px] border-dashed border-do-son-dam bg-do-son/10' : picked ? 'border-[4px] border-muc-tim bg-muc-tim/10' : 'border-nau-go/60 bg-white/60'
                      }`}
                      data-testid={`dap-an-${i}`}
                    >
                      <input type="radio" name={`${qid}-dap-an`} className="sr-only" checked={picked} onChange={() => setS((cur) => chooseOption(cur, i))} />
                      <span className="font-display font-extrabold" aria-hidden="true">
                        {knowQuizUi.chuCai[i]}.
                      </span>
                      <span className="flex-1">
                        <span className="sr-only">{knowQuizUi.chuCai[i]}. </span>
                        {fmt(opt)}
                        {isCorrect && (
                          <strong className="mt-1 block text-sm text-xanh-la-dam">
                            <span aria-hidden="true">✓ </span>
                            {knowQuizUi.nhanDapAnDung}
                          </strong>
                        )}
                        {isWrongPick && (
                          <strong className="mt-1 block text-sm text-do-son-dam">
                            <span aria-hidden="true">✗ </span>
                            {knowQuizUi.nhanEmChon}
                          </strong>
                        )}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="space-y-1">
                {!review && (
                  <>
                    <label htmlFor={`${qid}-so`} className="block text-base font-semibold">
                      {knowQuizUi.nhapSo}
                    </label>
                    <input
                      id={`${qid}-so`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      maxLength={12}
                      value={s.text}
                      readOnly={showAnswer}
                      aria-invalid={reminder !== null && s.reminder !== 'chuaChon'}
                      aria-describedby={reminder ? `${qid}-nhac` : undefined}
                      onChange={(e) => setS((cur) => typeAnswer(cur, e.target.value))}
                      className="min-h-11 w-40 rounded-xl border-[3px] border-nau-go bg-white px-3 text-xl font-bold read-only:bg-white/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                      data-testid="o-nhap-so"
                    />
                  </>
                )}
              </div>
            )}

            {reminder && (
              <p id={`${qid}-nhac`} role="alert" className="rounded-xl border-2 border-do-son bg-do-son/10 p-2 text-base font-semibold text-do-son-dam" data-testid="nhac-tra-loi">
                {reminder}
              </p>
            )}

            {!review && s.phase === 'ask' && (
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onClose} data-testid="nut-dong">
                  {ui.baiHoc.dong}
                </Button>
                <Button type="submit" size="sm" data-testid="nut-kiem-tra">
                  {knowQuizUi.kiemTra}
                </Button>
              </div>
            )}
          </form>

          {showAnswer && (
            <div ref={feedback} role="status" aria-live="polite" className="space-y-2 rounded-xl border-2 border-nau-go/60 bg-white/70 p-3" data-testid="phan-hoi">
              {!review && s.result && (
                <p className={`text-xl font-extrabold ${s.result.correct ? 'text-xanh-la-dam' : 'text-do-son-dam'}`} data-testid="ket-qua" data-correct={s.result.correct ? 'true' : 'false'}>
                  <span aria-hidden="true">{s.result.correct ? '✓ ' : '✗ '}</span>
                  {s.result.correct ? knowQuizUi.dung : knowQuizUi.sai}
                </p>
              )}
              {!review && s.result && quiz.kind === 'number' && <p className="text-base">{fmt(knowQuizUi.emNhap, { so: s.result.given })}</p>}
              {!review && chosen !== null && quiz.kind === 'abcd' && <p className="text-base">{fmt(knowQuizUi.emChon, { dapAn: `${knowQuizUi.chuCai[chosen]}. ${fmt(quiz.options[chosen])}` })}</p>}
              <p className="text-base font-bold" data-testid="dap-an-dung">
                {fmt(knowQuizUi.dapAnDung, { dapAn: correctText })}
              </p>
              <p className="text-base leading-relaxed" data-testid="giai-thich">
                <strong>{knowQuizUi.giaiThich}: </strong>
                {fmt(quiz.explanation)}
              </p>
              {!review && <p className="text-sm font-semibold text-nau-go-dam">{knowQuizUi.vanNhanThe}</p>}
            </div>
          )}

          {showAnswer && (
            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} autoFocus={review} data-testid="nut-dong">
                {ui.baiHoc.dong}
              </Button>
              {!review && (
                <Button type="button" size="sm" ref={saveBtn} onClick={collect} data-testid="nut-cat-vao-so">
                  {knowScrollUi.catVaoSo}
                </Button>
              )}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
