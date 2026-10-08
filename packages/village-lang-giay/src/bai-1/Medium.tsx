import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  FeedbackSheet,
  NumberInput,
  PortraitFrame,
  ReflectionQuestion,
  fmt,
  sound,
  starsFromMistakes,
  useSettings,
  type ChainPageData,
  type StationResult,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import {
  buildChain,
  firstInvalidIndex,
  pageCode,
  pickSafeContent,
  randomContents,
  randomGenesis,
  type Lesson1Data,
} from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';

const T = bai1Texts;

interface Feedback {
  isOpen: boolean;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

const toLogic = (pages: ChainPageData[]) => pages.map((p) => ({ content: p.content ?? 0, code: p.code ?? -1 }));

/** Trạm Trung bình: "{phanDien} sửa trộm sổ". Dùng chuỗi em vừa xây ở trạm Dễ (không có thì tạo ngẫu nhiên). */
export function Medium({ onComplete, saved }: { onComplete: (r: StationResult) => void; saved: Lesson1Data | null }) {
  const { settings } = useSettings();
  const reducedMotion = settings.reducedMotion;
  const rng = useRef(createMulberry32(Date.now())).current;
  const startTime = useRef(performance.now()).current;

  const isValidSaved = Boolean(
    saved &&
      saved.contents.length === 5 &&
      saved.codes.length === 5 &&
      saved.contents.every((c) => c >= 0 && c <= 99) &&
      saved.codes.every((c) => c >= 0 && c <= 99) &&
      firstInvalidIndex(saved.genesisCode, saved.contents.map((c, i) => ({ content: c, code: saved.codes[i] }))) === -1,
  );
  const isFromSaved = useRef(isValidSaved).current;
  const genesisCode = useRef(isValidSaved ? (saved as Lesson1Data).genesisCode : randomGenesis(rng)).current;
  const initialContents = useRef(isValidSaved ? [...(saved as Lesson1Data).contents] : randomContents(5, rng)).current;
  const initialCodes = useRef(isValidSaved ? [...(saved as Lesson1Data).codes] : buildChain(genesisCode, initialContents)).current;

  // Trang k (trang 2 hoặc trang 3) bị sửa trộm, độ chênh an toàn
  const tamperIndex = useRef(rng() < 0.5 ? 1 : 2).current;
  const originalOld = initialContents[tamperIndex];
  const tamperedNew = useRef(pickSafeContent(originalOld, rng)).current;

  const [isTampering, setIsTampering] = useState(!reducedMotion);
  const [pages, setPages] = useState<ChainPageData[]>(() => initialContents.map((c, i) => ({ content: c, code: initialCodes[i] })));
  const [fixedCount, setFixedCount] = useState(0);
  const [showFirstDomino, setShowFirstDomino] = useState(false);
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ isOpen: false, whatHappened: '' });
  const [showReflection, setShowReflection] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const codeId = useId();

  // Hoạt cảnh {phanDien} lẻn vào sửa; "Giảm chuyển động" thì sửa ngay.
  useEffect(() => {
    const apply = () => {
      setPages((prev) => {
        const next = [...prev];
        next[tamperIndex] = { content: tamperedNew, code: initialCodes[tamperIndex], struckContent: originalOld };
        return next;
      });
      setIsTampering(false);
    };
    if (reducedMotion) {
      apply();
      return;
    }
    const timer = setTimeout(() => {
      sound.playWrong();
      apply();
    }, GAME_CONFIG.lesson1.tamperAnimMs);
    return () => clearTimeout(timer);
  }, [reducedMotion, tamperIndex, tamperedNew, originalOld, initialCodes]);

  const currentFirstInvalid = firstInvalidIndex(genesisCode, toLogic(pages));

  useEffect(() => {
    if (!isTampering && currentFirstInvalid !== -1) codeInputRef.current?.focus();
  }, [isTampering, currentFirstInvalid]);

  const check = useCallback(() => {
    if (currentFirstInvalid === -1) return;
    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      setCodeError(T.de.maSaiKhoang);
      sound.playClick();
      return;
    }
    setCodeError(undefined);

    const prevCode = currentFirstInvalid === 0 ? genesisCode : (pages[currentFirstInvalid - 1].code as number);
    const content = pages[currentFirstInvalid].content as number;

    if (codeInput === pageCode(prevCode, content)) {
      sound.playCorrect();
      const updated = [...pages];
      updated[currentFirstInvalid] = { ...updated[currentFirstInvalid], code: codeInput };
      setPages(updated);
      setCodeInput(null);

      const newFixed = fixedCount + 1;
      setFixedCount(newFixed);
      const nextInvalid = firstInvalidIndex(genesisCode, toLogic(updated));
      // Lần domino đầu tiên: sửa xong trang k thì trang k+1 lệch
      setShowFirstDomino(newFixed === 1 && nextInvalid !== -1);
      if (nextInvalid === -1) setShowReflection(true);
    } else {
      sound.playWrong();
      setMistakes((m) => m + 1);
      const vars = { ma: codeInput, truoc: prevCode, nd: content, gapDoi: prevCode * 2 };
      setFeedback({
        isOpen: true,
        whatHappened: fmt(T.tb.sai1Chuyen, vars),
        whyHappened: fmt(T.tb.sai1ViSao, vars),
        howToFix: fmt(T.tb.sai1CachSua, vars),
      });
    }
  }, [currentFirstInvalid, codeInput, genesisCode, pages, fixedCount]);

  const finish = () => {
    sound.playClick();
    onComplete({
      stars: starsFromMistakes(mistakes),
      timeMs: Math.round(performance.now() - startTime),
      learned: T.tb.hocDuoc,
    });
  };

  const prevForInvalid = currentFirstInvalid <= 0 ? genesisCode : (pages[currentFirstInvalid - 1].code ?? 0);
  const contentForInvalid = currentFirstInvalid !== -1 ? pages[currentFirstInvalid].content : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl">{fmt(T.tb.tieuDe)}</h2>
        {isFromSaved && (
          <p className="inline-block rounded-full border-2 border-xanh-la-dam bg-xanh-la/15 px-3 py-1 text-sm font-semibold">
            <span aria-hidden="true">✨ </span>
            {T.tb.tuChuoiCu}
          </p>
        )}
      </div>

      {isTampering ? (
        <div className="animate-pulse space-y-3 rounded-bang border-2 border-do-son bg-do-son/10 p-6 text-center" role="status">
          <div className="flex justify-center">
            <PortraitFrame portrait="ti" size={96} />
          </div>
          <h3 className="text-lg text-do-son-dam">{fmt(T.tb.dangSua)}</h3>
          <p className="text-base">{fmt(T.tb.dangSuaChiTiet, { n: tamperIndex + 1 })}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-bang border-2 border-do-son bg-do-son/10 p-4">
          <PortraitFrame portrait="ti" size={72} />
          <div className="text-base">
            <span className="block font-bold text-do-son-dam">
              <span aria-hidden="true">✗ </span>
              {fmt(T.tb.daBiDoi, { n: tamperIndex + 1 })}
            </span>
            <span>
              {T.tb.soTrangDaSua} <strong className="text-lg text-muc-tim-dam">{fixedCount}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={currentFirstInvalid}
          activePageIndex={currentFirstInvalid !== -1 ? currentFirstInvalid : 0}
          isPageConfirmed={(idx) => (currentFirstInvalid === -1 ? true : idx < currentFirstInvalid)}
          isPageWillRecalc={(idx) => (currentFirstInvalid === -1 ? false : idx > currentFirstInvalid)}
          renderCodeSlot={(idx) =>
            idx !== currentFirstInvalid || isTampering ? undefined : (
              <div className="flex w-full flex-col items-center">
                <NumberInput
                  className="w-full"
                  id={codeId}
                  ref={codeInputRef}
                  value={codeInput}
                  showButtons={false}
                  placeholder={T.chung.khoangSo}
                  ariaLabel={fmt(T.de.nhanMaTrang, { n: idx + 1 })}
                  inputClassName="!h-10 !w-full !text-lg"
                  onChange={(v) => {
                    setCodeInput(v);
                    setCodeError(undefined);
                  }}
                  onEnter={check}
                  error={codeError}
                  autoFocus
                />
              </div>
            )
          }
        />
      </div>

      {showFirstDomino && currentFirstInvalid !== -1 && (
        <div className="flex items-center gap-3 rounded-bang border-2 border-muc-tim bg-muc-tim/10 p-4" role="status">
          <PortraitFrame portrait="bi" size={72} />
          <p className="text-base font-semibold">{fmt(T.tb.domino, { n: currentFirstInvalid + 1, truoc: currentFirstInvalid })}</p>
        </div>
      )}

      {!isTampering && currentFirstInvalid !== -1 && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <PortraitFrame portrait="bi" size={72} />
            <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
              <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">{fmt(T.tb.tinhLai, { n: currentFirstInvalid + 1 })}</span>
              <span className="font-display text-lg font-extrabold text-muc-tim-dam">
                {fmt(T.chung.congThucThe, { truoc: prevForInvalid, nd: contentForInvalid ?? 0 })}
              </span>
            </div>
          </div>
          <Button onClick={check}>{T.chung.capNhatMa}</Button>
        </div>
      )}

      {showReflection && (
        <div className="space-y-4">
          <ReflectionQuestion question={T.tb.cauHoi} options={T.tb.luaChon} explanation={T.tb.giaiThich} />
          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={finish}>
              {T.tb.xongTram}
            </Button>
          </div>
        </div>
      )}

      <FeedbackSheet
        isOpen={feedback.isOpen}
        isCorrect={false}
        whatHappened={feedback.whatHappened}
        whyHappened={feedback.whyHappened}
        howToFix={feedback.howToFix}
        onContinue={() => {
          setFeedback((f) => ({ ...f, isOpen: false }));
          codeInputRef.current?.focus();
        }}
        continueLabel={T.chung.thuLai}
      />
    </div>
  );
}
