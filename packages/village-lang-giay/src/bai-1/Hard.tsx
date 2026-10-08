import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  NumberInput,
  PortraitFrame,
  ReflectionQuestion,
  Toast,
  fmt,
  sound,
  type ChainPageData,
  type StationResult,
} from '@so-chung/core';
import { bai1Texts } from '@so-chung/core/content/lessons/bai-1';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import {
  buildChain,
  firstInvalidIndex,
  hardStars,
  pageCode,
  pagesToFix,
  pickSafeContent,
  randomContents,
  randomGenesis,
  spawnDelayMs,
} from '@so-chung/core/lessons/bai-1/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';

const T = bai1Texts;
const C = GAME_CONFIG.lesson1;

const toLogic = (pages: ChainPageData[]) => pages.map((p) => ({ content: p.content ?? 0, code: p.code ?? -1 }));

/** Đồng hồ đếm ngược: cập nhật bằng state riêng, dọn interval khi rời màn. */
function CountdownTimer({ durationMs, onTimeUp, isPaused }: { durationMs: number; onTimeUp: () => void; isPaused: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const endAt = useRef(performance.now() + durationMs);
  const fired = useRef(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const remain = Math.max(0, endAt.current - performance.now());
      setSecondsLeft(Math.ceil(remain / 1000));
      if (remain <= 0 && !fired.current) {
        fired.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  const low = secondsLeft <= 10;
  return (
    <div
      role="timer"
      aria-label={fmt(T.kho.thoiGianConLai, { s: secondsLeft })}
      className={`flex items-center gap-2 rounded-nut border-2 px-3.5 py-1.5 font-display text-xl font-extrabold ${
        low ? 'animate-pulse border-do-son bg-do-son/10 text-do-son-dam' : 'border-nau-go bg-giay text-muc-tim-dam'
      }`}
    >
      <span aria-hidden="true">⏱️</span>
      <span>{fmt(T.kho.giay, { s: secondsLeft })}</span>
    </div>
  );
}

/** Trạm Khó: "Cuộc đua với cả mạng lưới". Mạng thêm trang mới đều đặn, em sửa cho kịp; hết 60 giây thì tổng kết. */
export function Hard({ onComplete }: { onComplete: (r: StationResult) => void }) {
  const rng = useRef(createMulberry32(Date.now())).current;

  // Chuỗi gốc 6 trang của mạng lưới
  const genesisCode = useRef(randomGenesis(rng)).current;
  const initialContents = useRef(randomContents(C.hardStartPages, rng)).current;
  const initialCodes = useRef(buildChain(genesisCode, initialContents)).current;
  const origChain = useRef({ contents: [...initialContents], codes: [...initialCodes] });
  const networkAdded = useRef(0);

  // Sổ của em: trang 2 bị sửa trộm
  const tamperedContent = useRef(pickSafeContent(initialContents[C.hardTamperIndex], rng)).current;
  const [pages, setPages] = useState<ChainPageData[]>(() =>
    initialContents.map((c, i) => ({ content: i === C.hardTamperIndex ? tamperedContent : c, code: initialCodes[i] })),
  );
  const [fixedCount, setFixedCount] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const isFast = useRef(false);
  const [showFastToast, setShowFastToast] = useState(false);
  const [badgeScale, setBadgeScale] = useState(false);
  const [codeInput, setCodeInput] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnIndex = useRef(0);
  const timeUpRef = useRef(false);
  const codeId = useId();

  const currentFirstInvalid = firstInvalidIndex(genesisCode, toLogic(pages));
  const remaining = pagesToFix(currentFirstInvalid, pages.length);

  useEffect(() => {
    if (!isTimeUp && currentFirstInvalid !== -1) codeInputRef.current?.focus();
  }, [isTimeUp, currentFirstInvalid]);

  // Mạng thêm trang bằng chuỗi setTimeout (không dùng setInterval), dọn sạch khi rời màn.
  const scheduleNextSpawn = useCallback(() => {
    if (timeUpRef.current) return;
    const delay = spawnDelayMs(spawnIndex.current, isFast.current);
    spawnIndex.current += 1;
    spawnTimeout.current = setTimeout(() => {
      if (timeUpRef.current) return;
      const newContent = Math.floor(rng() * 100);
      const prev = origChain.current.codes[origChain.current.codes.length - 1];
      const newCode = pageCode(prev, newContent);
      origChain.current.contents.push(newContent);
      origChain.current.codes.push(newCode);
      networkAdded.current += 1;
      setPages((p) => [...p, { content: newContent, code: newCode }]);
      setBadgeScale(true);
      setTimeout(() => setBadgeScale(false), 300);
      scheduleNextSpawn();
    }, delay);
  }, [rng]);

  useEffect(() => {
    scheduleNextSpawn();
    return () => {
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    };
  }, [scheduleNextSpawn]);

  const handleTimeUp = useCallback(() => {
    sound.playWrong();
    timeUpRef.current = true;
    setIsTimeUp(true);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
  }, []);

  const check = useCallback(() => {
    if (isTimeUp || currentFirstInvalid === -1) return;
    if (codeInput === null || codeInput < 0 || codeInput > 99) {
      sound.playClick();
      return;
    }
    const prev = currentFirstInvalid === 0 ? genesisCode : (pages[currentFirstInvalid - 1].code as number);
    const content = pages[currentFirstInvalid].content as number;
    if (codeInput === pageCode(prev, content)) {
      sound.playCorrect();
      const updated = [...pages];
      updated[currentFirstInvalid] = { ...updated[currentFirstInvalid], code: codeInput };
      setPages(updated);
      setCodeInput(null);
      setFixedCount((n) => n + 1);
      if (firstInvalidIndex(genesisCode, toLogic(updated)) === -1) {
        // Sửa hết một lần: mạng tăng tốc lên 2 giây một trang
        setShowFastToast(true);
        isFast.current = true;
      }
    } else {
      // Sai: rung nhẹ, không trừ gì
      sound.playWrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  }, [isTimeUp, currentFirstInvalid, codeInput, genesisCode, pages]);

  const prevForInvalid = currentFirstInvalid <= 0 ? genesisCode : (pages[currentFirstInvalid - 1].code ?? 0);
  const contentForInvalid = currentFirstInvalid !== -1 ? pages[currentFirstInvalid].content : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4">
        <CountdownTimer durationMs={C.hardDurationMs} onTimeUp={handleTimeUp} isPaused={isTimeUp} />

        <div className="flex items-center gap-2" aria-live="polite">
          <span className="text-base font-bold text-nau-go-dam">{T.kho.conPhaiSua}</span>
          <span
            className={`inline-block font-display text-3xl font-extrabold text-do-son-dam transition-transform duration-200 ${
              badgeScale ? 'scale-125' : 'scale-100'
            }`}
          >
            {remaining}
          </span>
          <span className="text-sm font-semibold text-nau-go-dam">{T.kho.trang}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-nau-go-dam">{T.kho.daSua}</span>
          <span className="font-display text-3xl font-extrabold text-xanh-la-dam">{fixedCount}</span>
          <span className="text-sm font-semibold text-nau-go-dam">{T.kho.trang}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-bang border-2 border-nau-go/50 bg-white/50">
        <ChainStrip
          genesisCode={genesisCode}
          pages={pages}
          firstInvalidIndex={currentFirstInvalid}
          activePageIndex={currentFirstInvalid !== -1 ? currentFirstInvalid : pages.length - 1}
          slideInFromIndex={C.hardStartPages}
          isPageConfirmed={(idx) => (currentFirstInvalid === -1 ? true : idx < currentFirstInvalid)}
          isPageWillRecalc={(idx) => (currentFirstInvalid === -1 ? false : idx > currentFirstInvalid)}
          renderCodeSlot={(idx) =>
            idx !== currentFirstInvalid || isTimeUp ? undefined : (
              <div className={`flex w-full flex-col items-center ${shaking ? 'animate-shake' : ''}`}>
                <NumberInput
                  className="w-full"
                  id={codeId}
                  ref={codeInputRef}
                  value={codeInput}
                  showButtons={false}
                  placeholder={T.chung.khoangSo}
                  ariaLabel={fmt(T.de.nhanMaTrang, { n: idx + 1 })}
                  inputClassName="!h-10 !w-full !text-lg"
                  onChange={setCodeInput}
                  onEnter={check}
                  autoFocus
                />
              </div>
            )
          }
        />
      </div>

      {!isTimeUp && currentFirstInvalid !== -1 && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <PortraitFrame portrait="bi" size={72} />
            <div className="rounded-2xl border-2 border-nau-go/50 bg-giay p-3">
              <span className="mb-0.5 block text-sm font-semibold text-nau-go-dam">{fmt(T.chung.congThuc, { n: currentFirstInvalid + 1 })}</span>
              <span className="font-display text-lg font-extrabold text-muc-tim-dam">
                {fmt(T.chung.congThucThe, { truoc: prevForInvalid, nd: contentForInvalid ?? 0 })}
              </span>
            </div>
          </div>
          <Button onClick={check}>{T.chung.capNhatMa}</Button>
        </div>
      )}

      {isTimeUp && (
        <div className="space-y-6 rounded-bang border-2 border-nau-go/50 bg-white/60 p-4 sm:p-6">
          <h3 className="text-center text-3xl text-do-son-dam">{T.kho.hetGio}</h3>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border-2 border-xanh-la-dam bg-xanh-la/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetDaSua}</dt>
              <dd className="font-display text-3xl font-extrabold text-xanh-la-dam">{fixedCount}</dd>
            </div>
            <div className="rounded-2xl border-2 border-muc-tim bg-muc-tim/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetMangThem}</dt>
              <dd className="font-display text-3xl font-extrabold text-muc-tim-dam">{networkAdded.current}</dd>
            </div>
            <div className="rounded-2xl border-2 border-do-son bg-do-son/10 p-4 text-center">
              <dt className="mb-1 text-sm font-bold">{T.kho.tongKetConLech}</dt>
              <dd className="font-display text-3xl font-extrabold text-do-son-dam">{remaining}</dd>
            </div>
          </dl>

          <ReflectionQuestion question={T.kho.cauHoi} options={T.kho.luaChon} explanation={T.kho.giaiThich} />

          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={() => {
                sound.playClick();
                onComplete({ stars: hardStars(fixedCount), timeMs: C.hardDurationMs, learned: T.kho.hocDuoc });
              }}
            >
              {T.kho.xongTram}
            </Button>
          </div>
        </div>
      )}

      {showFastToast && <Toast message={T.kho.nhanQua} type="info" duration={3000} onClose={() => setShowFastToast(false)} />}
    </div>
  );
}
