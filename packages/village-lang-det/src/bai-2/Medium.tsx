import { useMemo, useRef, useState } from 'react';
import {
  Button,
  FeedbackSheet,
  Hearts,
  MatXich,
  TrangSo,
  fmt,
  starsFromHearts,
  type StationResult,
} from '@so-chung/core';
import { bai2Texts } from '@so-chung/core/content/lessons/bai-2';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { explainCheck, generateMedium, type MediumPage, type MediumRound } from '@so-chung/core/lessons/bai-2/logic';
import { Chan, tenGiua } from './nguoi';

const T = bai2Texts;

interface Feedback {
  isOpen: boolean;
  isCorrect: boolean;
  whatHappened: string;
  whyHappened?: string;
}

/** Cột mắt xích nằm giữa hai trang trong hàng (đặt đè lên khe giữa các cột) */
const CHAIN_SLOT = 'pointer-events-none absolute -left-2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:-left-3';

/** Trạm Trung bình: "So sổ trước khi duyệt" (5 vòng, 3 tim). Giữ nguyên luật, phản hồi và cách chấm sao của giai đoạn 1. */
export function Medium({ onComplete, onFail }: { onComplete: (r: StationResult) => void; onFail: (tip: string) => void }) {
  const startTime = useRef(performance.now()).current;

  const gameData = useMemo(() => generateMedium(createMulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0)), []);

  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [myLedger, setMyLedger] = useState<MediumPage[]>(() => [...gameData.startPages]);
  // Chỉ sau khi em trả lời mới tô nổi chỗ khác nhau.
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, isCorrect: true, whatHappened: '' });

  // Hai hàng sổ cuộn ngang cùng nhau trên màn hình nhỏ
  const row1 = useRef<HTMLDivElement>(null);
  const row2 = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const syncScroll = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (syncing.current || !from || !to) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const currentRound: MediumRound | undefined = gameData.rounds[roundIndex];
  const myLast3 = myLedger.slice(-3);
  const myLastCode = myLast3[myLast3.length - 1].code;
  const senderName = currentRound ? tenGiua(currentRound.sender) : '';

  const handleDecision = (userAgreed: boolean) => {
    if (!currentRound || feedback.isOpen) return;
    setAnswered(true);
    const isCorrect = userAgreed === currentRound.isValid;
    let extraNote = '';
    if (!isCorrect) {
      setMistakes(mistakes + 1);
      setHearts(hearts - 1);
      extraNote = currentRound.isValid ? T.chung.mayDongY : T.chung.mayTuChoi;
    }

    let tamperedNote = '';
    if (currentRound.kind === 'tampered' && currentRound.tamperedIndex !== undefined && currentRound.oldContent !== undefined) {
      tamperedNote = fmt(T.tb.biSuaLen, {
        nguoi: senderName,
        cu: currentRound.oldContent,
        moi: currentRound.senderPages[currentRound.tamperedIndex].content,
      });
    }

    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: explainCheck(myLastCode, currentRound.proposal),
      whyHappened: [tamperedNote, extraNote].filter(Boolean).join(' ') || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    setAnswered(false);
    if (row1.current) row1.current.scrollLeft = 0;
    if (row2.current) row2.current.scrollLeft = 0;

    if (hearts <= 0) {
      onFail(T.tb.goiYThua);
      return;
    }

    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [...prev, currentRound.proposal]);
    }

    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      onComplete({
        stars: starsFromHearts(mistakes),
        timeMs: Math.round(performance.now() - startTime),
        learned: T.tb.hocDuoc,
      });
    }
  };

  if (!currentRound) return null;

  const basePageNum = myLedger.length - myLast3.length + 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* Vòng và tim */}
      <div className="flex items-center justify-between gap-2 rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="rounded-nut bg-muc-tim/15 px-3 py-1 font-display text-base font-extrabold text-muc-tim-dam">
            {fmt(T.chung.vong, { n: roundIndex + 1, tong: gameData.rounds.length })}
          </span>
          <span className="hidden text-sm text-nau-go-dam sm:inline">{T.tb.phu}</span>
        </div>
        <Hearts current={hearts} max={3} />
      </div>

      {/* Hàng 1: sổ của em (3 trang cuối + ô trống cho trang mới) */}
      <div className="rounded-bang border-2 border-nau-go/50 bg-white/60 p-3 sm:p-4">
        <h2 className="mb-2 flex items-center gap-2 border-b-2 border-nau-go/30 pb-2 text-lg">
          <span aria-hidden="true">📖</span> {T.tb.soCuaEm3}
        </h2>
        <div ref={row1} onScroll={() => syncScroll(row1.current, row2.current)} className="w-full overflow-x-auto py-3 sm:overflow-x-visible">
          <div className="grid w-full min-w-[620px] grid-cols-4 gap-4 sm:gap-6 lg:min-w-0">
            {myLast3.map((page, idx) => (
              <div key={idx} className="relative flex w-full items-center justify-center">
                {idx > 0 && (
                  <div className={CHAIN_SLOT}>
                    <MatXich size="sm" status={answered ? 'valid' : 'neutral'} />
                  </div>
                )}
                <TrangSo
                  size="xs"
                  pageNumber={basePageNum + idx}
                  prevCode={page.prevCode}
                  content={page.content}
                  pageCode={page.code}
                  isConfirmed={answered}
                />
              </div>
            ))}
            <div className="relative flex w-full items-center justify-center">
              <div className="flex min-h-[245px] w-[148px] select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-nau-go bg-giay/60 p-3 text-center sm:w-[176px]">
                <div className="mb-2 grid size-9 place-items-center rounded-full border-2 border-dashed border-nau-go text-base font-bold text-nau-go-dam" aria-hidden="true">
                  +
                </div>
                <span className="text-sm font-semibold italic leading-tight text-nau-go-dam">{T.tb.trangMoiSeODay}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2: sổ của người gửi (3 trang + trang mới đề xuất) */}
      <div className="rounded-bang border-2 border-muc-tim/40 bg-white/70 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-nau-go/30 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Chan id={currentRound.sender} size={40} />
            <h2 className="text-lg">{fmt(T.tb.soCua, { nguoi: senderName })}</h2>
          </div>
          {answered && (
            <span
              className={`whitespace-nowrap rounded-nut px-2 py-0.5 text-sm font-bold ${
                currentRound.isValid ? 'bg-xanh-la/15 text-xanh-la-dam' : 'bg-do-son/15 text-do-son-dam'
              }`}
            >
              {currentRound.isValid ? T.chung.hopLe : T.chung.khongHopLe}
            </span>
          )}
        </div>
        <div ref={row2} onScroll={() => syncScroll(row2.current, row1.current)} className="w-full overflow-x-auto py-3 sm:overflow-x-visible">
          <div className="grid w-full min-w-[620px] grid-cols-4 gap-4 sm:gap-6 lg:min-w-0">
            {currentRound.senderPages.map((page, idx) => {
              const isTampered = answered && currentRound.kind === 'tampered' && currentRound.tamperedIndex === idx;
              const isRecalc = answered && currentRound.kind === 'tampered' && Boolean(currentRound.recalcIndices?.includes(idx));
              return (
                <div key={idx} className="relative flex w-full items-center justify-center">
                  {idx > 0 && (
                    <div className={CHAIN_SLOT}>
                      <MatXich size="sm" status={answered ? (isTampered || isRecalc ? 'broken' : 'valid') : 'neutral'} />
                    </div>
                  )}
                  <TrangSo
                    size="xs"
                    pageNumber={basePageNum + idx}
                    prevCode={page.prevCode}
                    content={page.content}
                    pageCode={page.code}
                    isConfirmed={answered && !isTampered && !isRecalc}
                    isInvalid={isTampered || isRecalc}
                    struckContent={isTampered ? currentRound.oldContent : undefined}
                    invalidBadgeText={isTampered ? T.tb.nhanSuaLen : isRecalc ? T.tb.nhanMaLech : undefined}
                  />
                </div>
              );
            })}

            {/* Trang mới được đề xuất */}
            <div className="relative flex w-full items-center justify-center">
              <div className={CHAIN_SLOT}>
                <MatXich size="sm" status={answered ? (currentRound.isValid ? 'valid' : 'broken') : 'neutral'} />
              </div>
              <div className="relative flex justify-center">
                <div
                  className={`absolute -top-2.5 z-30 whitespace-nowrap rounded-nut px-2.5 py-0.5 text-xs font-extrabold text-white ${
                    answered ? (currentRound.isValid ? 'bg-xanh-la-dam' : 'bg-do-son-dam') : 'bg-muc-tim'
                  }`}
                >
                  {T.chung.trangMoi}
                </div>
                <div
                  className={`rounded-2xl ring-2 ${answered ? (currentRound.isValid ? 'ring-xanh-la-dam' : 'ring-do-son-dam') : 'ring-muc-tim'}`}
                >
                  <TrangSo
                    size="xs"
                    pageNumber={myLedger.length + 1}
                    prevCode={currentRound.proposal.prevCode}
                    content={currentRound.proposal.content}
                    pageCode={currentRound.proposal.code}
                    isConfirmed={answered && currentRound.isValid}
                    isInvalid={answered && !currentRound.isValid}
                    invalidBadgeText={
                      answered ? (currentRound.kind === 'wrong-code' ? T.tb.nhanMaSai : currentRound.kind === 'tampered' ? T.tb.nhanNoiSaiSo : undefined) : undefined
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Câu hỏi và nút biểu quyết */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
        <p className="text-center text-base sm:text-left">
          <strong>{T.tb.emHayKiemTra}</strong> {fmt(T.tb.cauHoiKiemTra, { nguoi: senderName })}
        </p>
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
          <Button size="md" fullWidth className="px-3! whitespace-nowrap sm:w-40" onClick={() => handleDecision(true)} disabled={feedback.isOpen}>
            <span aria-hidden="true">✓ </span>
            {T.chung.dongY}
          </Button>
          <Button variant="danger" size="md" fullWidth className="px-3! whitespace-nowrap sm:w-40" onClick={() => handleDecision(false)} disabled={feedback.isOpen}>
            <span aria-hidden="true">✗ </span>
            {T.chung.tuChoi}
          </Button>
        </div>
      </div>

      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={feedback.isCorrect}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        onContinue={handleContinue}
        continueLabel={hearts <= 0 ? T.chung.xemKetQua : T.chung.vongTiep}
      />
    </div>
  );
}
