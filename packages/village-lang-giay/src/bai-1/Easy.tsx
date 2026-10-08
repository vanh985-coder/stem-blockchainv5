import { useCallback, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  FeedbackSheet,
  NumberInput,
  PortraitFrame,
  fmt,
  sound,
  starsFromMistakes,
  type ChainPageData,
  type StationResult,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { pageCode, randomGenesis, solutionSteps, type Lesson1Data } from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';

const T = bai1Texts;
const EMPTY_PAGES = (): ChainPageData[] => Array.from({ length: 5 }, () => ({ content: null, code: null }));

interface Feedback {
  isOpen: boolean;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

/** Trạm Dễ: "Xây chuỗi 5 trang". Giữ nguyên luật, gợi ý và cách chấm sao của giai đoạn 1. */
export function Easy({
  onComplete,
  onChainBuilt,
}: {
  onComplete: (r: StationResult) => void;
  /** Báo chuỗi em vừa xây để trạm Trung bình dùng lại */
  onChainBuilt: (data: Lesson1Data) => void;
}) {
  const rng = useRef(createMulberry32(Date.now())).current;
  const startTime = useRef(performance.now()).current;
  const genesisCode = useRef(randomGenesis(rng)).current;

  const [pages, setPages] = useState<ChainPageData[]>(EMPTY_PAGES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [contentVal, setContentVal] = useState<number | null>(null);
  const [codeVal, setCodeVal] = useState<number | null>(null);
  const [contentError, setContentError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [pageMistakes, setPageMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, whatHappened: '' });

  const codeRef = useRef<HTMLInputElement>(null);
  const contentId = useId();
  const codeId = useId();

  // Chọn giúp em một số ngẫu nhiên 0–99
  const pickRandom = useCallback(() => {
    sound.playClick();
    setContentVal(Math.floor(rng() * 100));
    setContentError(undefined);
    codeRef.current?.focus();
  }, [rng]);

  const check = useCallback(() => {
    let bad = false;
    if (contentVal === null || contentVal < 0 || contentVal > 99) {
      setContentError(T.de.noiDungSai);
      bad = true;
    } else setContentError(undefined);
    if (codeVal === null || codeVal < 0 || codeVal > 99) {
      setCodeError(T.de.maSaiKhoang);
      bad = true;
    } else setCodeError(undefined);
    if (bad) {
      sound.playClick();
      return;
    }

    const prevCode = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code as number);
    const expected = pageCode(prevCode, contentVal as number);

    if (codeVal === expected) {
      sound.playCorrect();
      const updated = [...pages];
      updated[activeIdx] = { content: contentVal, code: codeVal };
      setPages(updated);

      if (activeIdx < 4) {
        setActiveIdx(activeIdx + 1);
        setContentVal(null);
        setCodeVal(null);
        setPageMistakes(0);
        setContentError(undefined);
        setCodeError(undefined);
      } else {
        // Xong cả 5 trang: lưu chuỗi cho trạm Trung bình, rồi báo kết quả.
        onChainBuilt({
          genesisCode,
          contents: updated.map((p) => p.content as number),
          codes: updated.map((p) => p.code as number),
        });
        onComplete({
          stars: starsFromMistakes(mistakes),
          timeMs: Math.round(performance.now() - startTime),
          learned: T.de.hocDuoc,
        });
      }
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      const n = pageMistakes + 1;
      setPageMistakes(n);
      const vars = { ma: codeVal as number, truoc: prevCode, nd: contentVal as number };
      if (n === 1) {
        // Sai lần 1: gợi ý công thức đã thế số, chưa có kết quả
        setFeedback({
          isOpen: true,
          whatHappened: fmt(T.de.sai1Chuyen, vars),
          whyHappened: fmt(T.de.sai1ViSao, vars),
          howToFix: fmt(T.de.sai1CachSua, vars),
        });
      } else {
        // Sai lần 2 trở đi: lời giải từng bước
        const steps = solutionSteps(prevCode, contentVal as number);
        const v2 = { ...vars, gapDoi: steps.doubled, tong: steps.sum, ma: steps.code };
        setFeedback({
          isOpen: true,
          whatHappened: fmt(T.de.sai2Chuyen, v2),
          whyHappened: fmt(T.de.sai2ViSao, v2),
          howToFix: fmt(T.de.sai2CachSua, v2),
        });
      }
    }
  }, [contentVal, codeVal, activeIdx, genesisCode, pages, mistakes, pageMistakes, startTime, onChainBuilt, onComplete]);

  const prevForActive = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code ?? 0);
  const formula =
    contentVal !== null
      ? fmt(T.chung.congThucThe, { truoc: prevForActive, nd: contentVal })
      : fmt(T.chung.congThucChuaCoNoiDung, { truoc: prevForActive });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl">{T.de.tieuDe}</h2>
        <p className="text-base">
          {T.de.dangLam} <strong className="text-muc-tim-dam">{fmt(T.de.tenTrang, { n: activeIdx + 1 })}</strong> — {T.de.huongDan}
        </p>
      </div>

      <div className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={-1}
          activePageIndex={activeIdx}
          isPageConfirmed={(idx) => idx < activeIdx}
          isPageDimmed={(idx) => idx > activeIdx}
          renderContentSlot={(idx) =>
            idx !== activeIdx ? undefined : (
              <div className="flex flex-col items-center gap-1">
                <NumberInput
                  className="w-full"
                  id={contentId}
                  value={contentVal}
                  showButtons={false}
                  placeholder={T.chung.khoangSo}
                  ariaLabel={fmt(T.de.nhanNoiDung, { n: activeIdx + 1 })}
                  inputClassName="!h-10 !w-full !text-lg"
                  onChange={(v) => {
                    setContentVal(v);
                    setContentError(undefined);
                  }}
                  onEnter={() => codeRef.current?.focus()}
                  error={contentError}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={pickRandom}
                  className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-muc-tim-dam underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
                >
                  <span aria-hidden="true">🎲&nbsp;</span>
                  {T.de.chonGiup}
                </button>
              </div>
            )
          }
          renderCodeSlot={(idx) =>
            idx !== activeIdx ? undefined : (
              <div className="flex w-full flex-col items-center">
                <NumberInput
                  className="w-full"
                  id={codeId}
                  ref={codeRef}
                  value={codeVal}
                  showButtons={false}
                  placeholder={T.chung.khoangSo}
                  ariaLabel={fmt(T.de.nhanMaTrang, { n: activeIdx + 1 })}
                  inputClassName="!h-10 !w-full !text-lg"
                  onChange={(v) => {
                    setCodeVal(v);
                    setCodeError(undefined);
                  }}
                  onEnter={check}
                  error={codeError}
                />
              </div>
            )
          }
        />
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <PortraitFrame portrait="bi" size={72} />
          <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
            <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">
              <span aria-hidden="true">💡 </span>
              {fmt(T.chung.congThuc, { n: activeIdx + 1 })}
            </span>
            <span className="font-display text-lg font-extrabold text-muc-tim-dam">{formula}</span>
          </div>
        </div>
        <Button onClick={check}>{T.de.kiemTra}</Button>
      </div>

      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={false}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((f) => ({ ...f, isOpen: false }));
          codeRef.current?.focus();
        }}
        continueLabel={T.chung.thuLai}
      />
    </div>
  );
}
