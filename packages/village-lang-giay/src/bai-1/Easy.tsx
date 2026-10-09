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
import { easyRound, pageCode, solutionSteps, type Lesson1Data } from '@so-chung/core/lessons/bai-1/logic';

const T = bai1Texts;

interface Feedback {
  isOpen: boolean;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

/**
 * Trạm Dễ: "Xây chuỗi 5 trang". Giữ nguyên luật, gợi ý và cách chấm sao của giai đoạn 1.
 * Nội dung 5 trang do máy chọn ngẫu nhiên (0–99) và hiện sẵn; em chỉ nhập mã trang.
 */
export function Easy({
  onComplete,
  onChainBuilt,
}: {
  onComplete: (r: StationResult) => void;
  /** Báo chuỗi em vừa xây để trạm Trung bình dùng lại */
  onChainBuilt: (data: Lesson1Data) => void;
}) {
  const startTime = useRef(performance.now()).current;
  const { genesisCode, contents } = useRef(easyRound(Date.now())).current;

  const [pages, setPages] = useState<ChainPageData[]>(() => contents.map((content) => ({ content, code: null })));
  const [activeIdx, setActiveIdx] = useState(0);
  const [codeVal, setCodeVal] = useState<number | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [pageMistakes, setPageMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, whatHappened: '' });

  const codeRef = useRef<HTMLInputElement>(null);
  const codeId = useId();

  const check = useCallback(() => {
    const content = contents[activeIdx];
    let bad = false;
    if (codeVal === null || codeVal < 0 || codeVal > 99) {
      setCodeError(T.de.maSaiKhoang);
      bad = true;
    } else setCodeError(undefined);
    if (bad) {
      sound.playClick();
      return;
    }

    const prevCode = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code as number);
    const expected = pageCode(prevCode, content);

    if (codeVal === expected) {
      sound.playCorrect();
      const updated = [...pages];
      updated[activeIdx] = { content, code: codeVal };
      setPages(updated);

      if (activeIdx < 4) {
        setActiveIdx(activeIdx + 1);
        setCodeVal(null);
        setPageMistakes(0);
        setCodeError(undefined);
      } else {
        // Xong cả 5 trang: lưu chuỗi cho trạm Trung bình, rồi báo kết quả.
        onChainBuilt({
          genesisCode,
          contents,
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
      const vars = { ma: codeVal as number, truoc: prevCode, nd: content };
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
        const steps = solutionSteps(prevCode, content);
        const v2 = { ...vars, gapDoi: steps.doubled, tong: steps.sum, ma: steps.code };
        setFeedback({
          isOpen: true,
          whatHappened: fmt(T.de.sai2Chuyen, v2),
          whyHappened: fmt(T.de.sai2ViSao, v2),
          howToFix: fmt(T.de.sai2CachSua, v2),
        });
      }
    }
  }, [contents, codeVal, activeIdx, genesisCode, pages, mistakes, pageMistakes, startTime, onChainBuilt, onComplete]);

  const prevForActive = activeIdx === 0 ? genesisCode : (pages[activeIdx - 1].code ?? 0);
  const formula = fmt(T.chung.congThucThe, { truoc: prevForActive, nd: contents[activeIdx] });

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
          renderCodeSlot={(idx) =>
            idx !== activeIdx ? undefined : (
              <div className="flex w-full flex-col items-center">
                <NumberInput
                  className="w-full"
                  id={codeId}
                  ref={codeRef}
                  autoFocus
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
