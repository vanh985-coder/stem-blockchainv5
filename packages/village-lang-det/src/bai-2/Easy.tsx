import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import { formatNumber } from '@so-chung/core/lib/format';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { generateEasy, explainCheck, type Proposal } from '@so-chung/core/lessons/bai-2/logic';
import { Chan, tenNhan } from './nguoi';

const T = bai2Texts;

interface Feedback {
  isOpen: boolean;
  isCorrect: boolean;
  whatHappened: string;
  whyHappened?: string;
}

/** Trạm Dễ: "Duyệt trang mới" (5 vòng, 3 tim). Giữ nguyên luật, phản hồi và cách chấm sao của giai đoạn 1. */
export function Easy({ onComplete, onFail }: { onComplete: (r: StationResult) => void; onFail: (tip: string) => void }) {
  const startTime = useRef(performance.now()).current;

  const gameData = useMemo(() => generateEasy(createMulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0)), []);

  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  // Sổ của em bắt đầu bằng 2 trang mẫu; luôn đi theo quyết định đúng của đa số.
  const [myLedger, setMyLedger] = useState<{ prevCode: number; content: number; code: number }[]>(() => [...gameData.startPages]);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, isCorrect: true, whatHappened: '' });

  // Màn hẹp: cuộn dải sổ tới trang cuối (trang mới nhất) cho dễ thấy
  const ledgerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ledgerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [myLedger.length]);

  const currentRound = gameData.rounds[roundIndex];
  const lastPage = myLedger[myLedger.length - 1];
  const lastCodeX = lastPage ? lastPage.code : gameData.startGenesis;

  const currentProposal: Proposal = useMemo(
    () => ({ prevCode: lastCodeX, content: currentRound ? currentRound.content : 0, code: currentRound ? currentRound.code : 0 }),
    [lastCodeX, currentRound],
  );

  const handleDecision = (userAgreed: boolean) => {
    if (!currentRound || feedback.isOpen) return;
    const isCorrect = userAgreed === currentRound.isValid;
    let extraNote = '';
    if (!isCorrect) {
      setMistakes(mistakes + 1);
      setHearts(hearts - 1);
      extraNote = currentRound.isValid ? T.chung.mayDongY : T.chung.mayTuChoi;
    }
    setFeedback({
      isOpen: true,
      isCorrect,
      whatHappened: explainCheck(lastCodeX, currentProposal),
      whyHappened: extraNote || undefined,
    });
  };

  const handleContinue = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));

    if (hearts <= 0) {
      onFail(T.de.goiYThua);
      return;
    }

    if (currentRound && currentRound.isValid) {
      setMyLedger((prev) => [...prev, { prevCode: lastCodeX, content: currentRound.content, code: currentRound.code }]);
    }

    if (roundIndex + 1 < gameData.rounds.length) {
      setRoundIndex((prev) => prev + 1);
    } else {
      onComplete({
        stars: starsFromHearts(mistakes),
        timeMs: Math.round(performance.now() - startTime),
        learned: T.de.hocDuoc,
      });
    }
  };

  if (!currentRound) return null;

  const visiblePages = myLedger.slice(-2);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Vòng chơi và tim */}
      <div className="flex items-center justify-between gap-2 rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="rounded-nut bg-muc-tim/15 px-3 py-1 font-display text-base font-extrabold text-muc-tim-dam">
            {fmt(T.chung.vong, { n: roundIndex + 1, tong: gameData.rounds.length })}
          </span>
          <span className="hidden text-sm text-nau-go-dam sm:inline">{T.de.phu}</span>
        </div>
        <Hearts current={hearts} max={3} />
      </div>

      {/* "Sổ của em": 2 trang cuối, làm nổi mã trang cuối X */}
      <div className="rounded-bang border-2 border-nau-go/50 bg-white/60 p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg">
            <span aria-hidden="true">📖</span> {T.chung.soCuaEm}
          </h2>
          <div className="inline-flex items-center gap-1.5 rounded-nut border-2 border-muc-tim/40 bg-muc-tim/10 px-3 py-1 text-sm font-bold text-muc-tim-dam">
            <span>{T.de.maCuoiX}</span>
            <span className="font-display text-base font-extrabold underline">{formatNumber(lastCodeX)}</span>
          </div>
        </div>
        <div ref={ledgerRef} className="overflow-x-auto py-2">
          <div className="mx-auto flex w-max items-center gap-2">
            {visiblePages.map((page, idx) => {
              const pageNum = myLedger.length - visiblePages.length + idx + 1;
              const isLast = idx === visiblePages.length - 1;
              return (
                <Fragment key={pageNum}>
                  {idx > 0 && <MatXich size="sm" status="valid" />}
                  <div className={isLast ? 'rounded-2xl ring-2 ring-muc-tim' : ''}>
                    <TrangSo size="xs" pageNumber={pageNum} prevCode={page.prevCode} content={page.content} pageCode={page.code} isConfirmed />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trang mới do người trong làng gửi */}
      <div className="rounded-bang border-2 border-muc-tim/40 bg-white/70 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3 border-b-2 border-nau-go/30 pb-3">
          <Chan id={currentRound.sender} size={56} />
          <div className="min-w-0">
            <div className="text-sm text-nau-go-dam">{T.de.nguoiGui}</div>
            <div className="font-display text-base font-extrabold">
              {tenNhan(currentRound.sender)} {T.de.guiTrang}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <TrangSo
            size="sm"
            pageNumber={myLedger.length + 1}
            prevCode={currentProposal.prevCode}
            content={currentProposal.content}
            pageCode={currentProposal.code}
            isConfirmed={false}
          />
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="rounded-2xl border-2 border-nau-go/40 bg-giay p-3 text-base leading-relaxed">
              <div className="mb-1 font-bold text-muc-tim-dam">
                <span aria-hidden="true">🔍 </span>
                {T.de.cachKiemTra}
              </div>
              <div>{fmt(T.de.buoc1, { x: lastCodeX })}</div>
              <div className="mt-1">{fmt(T.de.buoc2, { x: lastCodeX, nd: currentRound.content })}</div>
              <div className="mt-1">{fmt(T.de.buoc3, { ma: currentRound.code })}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button size="md" className="px-3! whitespace-nowrap" onClick={() => handleDecision(true)} disabled={feedback.isOpen}>
                <span aria-hidden="true">✓ </span>
                {T.chung.dongY}
              </Button>
              <Button variant="danger" size="md" className="px-3! whitespace-nowrap" onClick={() => handleDecision(false)} disabled={feedback.isOpen}>
                <span aria-hidden="true">✗ </span>
                {T.chung.tuChoi}
              </Button>
            </div>
          </div>
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
