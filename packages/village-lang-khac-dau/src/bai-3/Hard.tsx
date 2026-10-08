import { useState, useRef, useEffect } from 'react';
import { Avatar, Button, Card, Modal, NumberInput, fmt, sound, useAuth, type StationResult, rich } from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';
import { formatNumber, formatDecimal, formatTime } from '@so-chung/core/lib/format';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { modPow, startBrute, stepBrute, ESTIMATES, type BruteState } from '@so-chung/core/lessons/bai-3/logic';

import { portraitOf } from './nguoi';

const T = bai3Texts.tramKho;

// 3 cấu hình cơ sở thử nghiệm brute force
const BASE_BRUTE_CONFIGS = [
  { id: 'c1', p: 101, g: 2, label: T.p101Nho },
  { id: 'c2', p: 1009, g: 11, label: T.p1009Vua },
  { id: 'c3', p: 1000003, g: 2, label: T.p1000003Lon },
];

export function Hard({ onComplete }: { onComplete: (r: StationResult) => void; onFail?: (tip: string) => void }) {
  const { profile } = useAuth();
  const myName = fmt('{Ten}', { ten: profile?.display_name });

  // Khởi tạo ngẫu nhiên khóa riêng cho 3 cấu hình lúc mount (1..p-2)
  const [bruteConfigs] = useState(() => {
    const rng = createMulberry32(Date.now());
    return BASE_BRUTE_CONFIGS.map((cfg) => {
      const priv = 1 + Math.floor(rng() * (cfg.p - 2));
      const target = modPow(cfg.g, priv, cfg.p);
      return {
        ...cfg,
        priv,
        target,
      };
    });
  });

  const startTimeRef = useRef(Date.now());
  const [part, setPart] = useState<1 | 2 | 3>(1);

  // ==========================================
  // PHẦN 1: DÒ KHÓA VỚI SỐ NHỎ (p=23, g=5)
  // An có khóa công khai = 19. Mục tiêu: tìm x sao cho 5^x mod 23 = 19
  // ==========================================
  const [p1InputX, setP1InputX] = useState<number>(1);
  const [p1History, setP1History] = useState<{ x: number; val: number; isMatch: boolean }[]>([]);
  const [p1Found, setP1Found] = useState<boolean>(false);
  const [p1AutoRunning, setP1AutoRunning] = useState<boolean>(false);
  const [p1ManualXs, setP1ManualXs] = useState<number[]>([]);
  const [p1Prediction, setP1Prediction] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const p1AutoTimerRef = useRef<number | null>(null);

  // Dọn dẹp timer
  useEffect(() => {
    return () => {
      if (p1AutoTimerRef.current !== null) {
        window.clearTimeout(p1AutoTimerRef.current);
      }
    };
  }, []);

  const testX = (xVal: number) => {
    const val = modPow(5, xVal, 23);
    const isMatch = val === 19;
    setP1History((prev) => [{ x: xVal, val, isMatch }, ...prev]);

    if (isMatch) {
      sound.playCorrect();
      setP1Found(true);
      setP1AutoRunning(false);
      if (p1AutoTimerRef.current !== null) {
        window.clearTimeout(p1AutoTimerRef.current);
      }
    } else {
      sound.playClick();
    }
  };

  const handleManualTry = () => {
    if (p1Found || p1InputX < 1 || p1InputX > 22) return;
    if (!p1ManualXs.includes(p1InputX)) {
      setP1ManualXs((prev) => [...prev, p1InputX]);
    }
    testX(p1InputX);
  };

  const handleAutoRun = () => {
    if (p1Found || p1AutoRunning || p1ManualXs.length < 3) return;
    setP1AutoRunning(true);

    let nextX = 1;
    // Bỏ qua những số đã thử
    const tested = new Set(p1History.map((h) => h.x));
    while (tested.has(nextX) && nextX <= 22) {
      nextX++;
    }

    const runStep = (curr: number) => {
      if (curr > 22) {
        setP1AutoRunning(false);
        return;
      }
      testX(curr);
      if (modPow(5, curr, 23) === 19) {
        return;
      }
      p1AutoTimerRef.current = window.setTimeout(() => {
        runStep(curr + 1);
      }, 120);
    };

    runStep(nextX);
  };

  // ==========================================
  // PHẦN 2: THỬ NGHIỆM BRUTE FORCE THỰC TẾ
  // ==========================================
  const [p2Step, setP2Step] = useState<'A' | 'B' | 'C'>('A');

  // Bước A: Em tự dò với p = 1.000.003
  const [p2ManualX, setP2ManualX] = useState<number | null>(null);
  const [p2History, setP2History] = useState<{ x: number; val: number; isMatch: boolean }[]>([]);
  const [p2GuessedCorrectly, setP2GuessedCorrectly] = useState(false);
  const [p2TimeLeft, setP2TimeLeft] = useState(300); // 5:00 = 300 giây
  const p2StartTimeRef = useRef<number>(0);
  const p2ElapsedSecRef = useRef<number>(0);
  const p2TimerRef = useRef<number | null>(null);

  // Timer đếm ngược 5:00 ở Bước A (dọn dẹp khi unmount, không side-effect trong setState updater)
  useEffect(() => {
    if (part === 2 && p2Step === 'A' && !p2GuessedCorrectly) {
      p2StartTimeRef.current = Date.now();
      p2TimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - p2StartTimeRef.current) / 1000);
        p2ElapsedSecRef.current = elapsed;
        const left = Math.max(0, 300 - elapsed);
        setP2TimeLeft(left);
        if (left <= 0) {
          if (p2TimerRef.current !== null) {
            clearInterval(p2TimerRef.current);
            p2TimerRef.current = null;
          }
          sound.playWrong();
          setP2Step('B');
        }
      }, 1000);

      return () => {
        if (p2TimerRef.current !== null) {
          clearInterval(p2TimerRef.current);
          p2TimerRef.current = null;
        }
      };
    }
  }, [part, p2Step, p2GuessedCorrectly]);

  // Bước A: Thử số x
  const handleP2Try = () => {
    if (p2ManualX === null || p2ManualX < 1 || p2ManualX > 1000001 || p2GuessedCorrectly) return;
    const target = bruteConfigs[2].target;
    const val = modPow(2, p2ManualX, 1000003);
    const isMatch = val === target;
    setP2History((prev) => [{ x: p2ManualX, val, isMatch }, ...prev]);

    if (isMatch) {
      if (p2TimerRef.current !== null) {
        clearInterval(p2TimerRef.current);
        p2TimerRef.current = null;
      }
      p2ElapsedSecRef.current = Math.max(1, Math.floor((Date.now() - p2StartTimeRef.current) / 1000));
      sound.playLevelComplete();
      setP2GuessedCorrectly(true);
    } else {
      sound.playClick();
    }
  };

  // Bước A: Bỏ cuộc
  const handleP2GiveUp = () => {
    if (p2TimerRef.current !== null) {
      clearInterval(p2TimerRef.current);
      p2TimerRef.current = null;
    }
    p2ElapsedSecRef.current = Math.max(1, Math.floor((Date.now() - p2StartTimeRef.current) / 1000));
    sound.playClick();
    setP2Step('B');
  };

  // Bước B: Tính toán số liệu N, T, H
  const formatElapsedDuration = (secs: number) => {
    if (secs < 60) return fmt(T.giay, { secs });
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? fmt(T.phutGiay, { m, s }) : fmt(T.phut, { m });
  };

  const calculateHInfo = (tries: number, elapsedSec: number) => {
    const TOTAL_KEYS = 1000001;
    if (tries === 0) {
      const assumedSec = TOTAL_KEYS * 5;
      const hours = assumedSec / 3600;
      const days = Math.round(hours / 24);
      return fmt(T.khoangGioNgay, { so: formatNumber(Math.round(hours)), days });
    }
    const speed = tries / Math.max(1, elapsedSec);
    const totalSecNeeded = TOTAL_KEYS / speed;
    const hours = totalSecNeeded / 3600;

    if (hours < 48) {
      return fmt(T.khoangGio, { so: formatNumber(Math.round(hours)) });
    }
    const days = hours / 24;
    if (days < 365) {
      return fmt(T.khoangNgayGio, { so: formatNumber(Math.round(days)), so2: formatNumber(Math.round(hours)) });
    }
    const years = days / 365.25;
    return fmt(T.khoangNamGio, { so: formatDecimal(Math.round(years * 10) / 10), so2: formatNumber(Math.round(hours)) });
  };

  // Bước C: Máy dò (3 cấu hình)
  const [selectedConfigIdx, setSelectedConfigIdx] = useState<number>(0);
  const [bruteState, setBruteState] = useState<BruteState | null>(null);
  const [bruteRunning, setBruteRunning] = useState<boolean>(false);
  const [bruteElapsedMs, setBruteElapsedMs] = useState<number>(0);
  const [bruteTriesPerSec, setBruteTriesPerSec] = useState<number>(0);
  const [hasRunP1M, setHasRunP1M] = useState<boolean>(false);
  const p1MStatsRef = useRef<{ elapsedMs: number; tries: number } | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const bruteStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleStartBrute = (configIdx: number) => {
    if (bruteRunning) return;
    setSelectedConfigIdx(configIdx);
    const cfg = bruteConfigs[configIdx];
    const initial = startBrute(cfg.p, cfg.g, cfg.target);
    setBruteState(initial);
    setBruteRunning(true);
    setBruteElapsedMs(0);
    setBruteTriesPerSec(0);

    sound.playClick();
    bruteStartTimeRef.current = performance.now();

    const loop = (state: BruteState) => {
      // Mỗi khung hình xử lý 50.000 phép tính
      const next = stepBrute(state, 50000);
      const now = performance.now();
      const elapsed = now - bruteStartTimeRef.current;
      setBruteElapsedMs(elapsed);
      if (elapsed > 0) {
        setBruteTriesPerSec(Math.round((next.tries / elapsed) * 1000));
      }
      setBruteState(next);

      if (next.found !== null) {
        sound.playCorrect();
        setBruteRunning(false);
        if (cfg.p === 1000003) {
          p1MStatsRef.current = { elapsedMs: elapsed, tries: next.tries };
          setHasRunP1M(true);
        }
      } else {
        rafIdRef.current = requestAnimationFrame(() => loop(next));
      }
    };

    rafIdRef.current = requestAnimationFrame(() => loop(initial));
  };

  // ==========================================
  // PHẦN 3: TÌNH HUỐNG MẤT KHÓA
  // ==========================================
  const [withdrawAttempted, setWithdrawAttempted] = useState(false);
  const [p3SelectedIdx, setP3SelectedIdx] = useState<number | null>(null);
  const [p3WrongAnswers, setP3WrongAnswers] = useState<number[]>([]);
  const [p3Feedback, setP3Feedback] = useState<string | null>(null);
  const [p3IsCorrect, setP3IsCorrect] = useState<boolean>(false);

  const P3_OPTIONS = [
    {
      id: 0,
      text: T.nganHang,
      isCorrect: false,
      wrongExplanation:
        T.blockchainKhongCoNganHang,
    },
    {
      id: 1,
      text: T.nguoiLapTrinhRaBlockchain,
      isCorrect: false,
      wrongExplanation:
        T.hoVietRaLuatChoi,
    },
    {
      id: 2,
      text: T.cacNodeTrongMang,
      isCorrect: false,
      wrongExplanation:
        T.cacNodeChiKiemTra,
    },
    {
      id: 3,
      text: T.khongAiCa,
      isCorrect: true,
      wrongExplanation: '',
    },
  ];

  const handleSelectP3Option = (idx: number) => {
    if (p3IsCorrect) return;
    const opt = P3_OPTIONS[idx];
    setP3SelectedIdx(idx);

    if (opt.isCorrect) {
      sound.playLevelComplete();
      setP3IsCorrect(true);
      setP3Feedback(null);

      // Đúng ngay lần đầu 3 sao, sai 1 lần 2 sao, sai nhiều hơn 1 sao.
      // Số lần sai đếm theo số lựa chọn sai đã bấm.
      const earnedStars =
        p3WrongAnswers.length === 0 ? 3 : p3WrongAnswers.length === 1 ? 2 : 1;
      const timeMs = Date.now() - startTimeRef.current;

      setTimeout(() => {
        onComplete({
          stars: earnedStars,
          timeMs,
          learned:
            T.phepToan5XMod,
        });
      }, 2500);
    } else {
      sound.playWrong();
      if (!p3WrongAnswers.includes(idx)) {
        setP3WrongAnswers((prev) => [...prev, idx]);
      }
      setP3Feedback(fmt(T.thuChonLaiXem, { wrongExplanation: opt.wrongExplanation }));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header chỉ số phần */}
      <div className="flex items-center justify-between bg-white/70 px-4 py-2.5 rounded-[16px] border-2 border-nau-go/30">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-muc-tim text-white flex items-center justify-center font-extrabold text-sm">
            {part}
          </span>
          <span className="font-display font-extrabold text-sm sm:text-base text-chu">
            {part === 1
              ? T.phan1DoKhoaRieng
              : part === 2
              ? fmt(T.phan2ThuNghiemThuc, { so: p2Step === 'A'
                    ? T.buocAEmTuDo
                    : p2Step === 'B'
                    ? T.buocBKetLuanSo
                    : T.buocCMayDoBitcoin })
              : T.phan3TinhHuongMat}
          </span>
        </div>
        <span className="text-sm font-bold text-do-son-dam bg-do-son/10 px-2.5 py-1 rounded-full">{T.tramKho}</span>
      </div>

      {/* ======================================================================= */}
      {/* PHẦN 1 */}
      {/* ======================================================================= */}
      {part === 1 && (
        <div className="space-y-4">
          <Card variant="paper" className="p-4 sm:p-5">
            <div className="flex items-start gap-3 mb-3">
              <Avatar portrait={portraitOf("ti")} size="sm" />
              <div>
                <h4 className="font-display font-extrabold text-base text-chu">{fmt(T.muonBeKhoaCua)}</h4>
                <p className="text-sm sm:text-sm text-nau-go-dam">{rich(T.bacAnCoKhoaCong)}</p>
              </div>
            </div>

            {/* Khối gợi ý cách dò ngược */}
            <div className="p-3.5 bg-white/60 rounded-[14px] border border-muc-tim/30 text-sm sm:text-sm text-chu space-y-2 mb-4">
              <div className="font-bold text-muc-tim-dam text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span>{' '}{fmt(T.goiYCachDoNguoc)}</div>
              <p className="leading-relaxed">{rich(T.chiBietMotDieuKhoa)}</p>
              <p className="leading-relaxed">{fmt(T.khongCoCachNaoTinh)}</p>
              <p className="leading-relaxed">{rich(T.vayChiConMotCach)}</p>
              <p className="leading-relaxed">{T.khoaRiengChiTu1}</p>

              <div className="pt-2 border-t border-muc-tim/30 flex items-center justify-between flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1ManualXs.length < 3}
                  onClick={() => {
                    sound.playClick();
                    setShowTableModal(true);
                  }}
                >{T.xemLaiBang5X}</Button>
                {p1ManualXs.length < 3 && (
                  <span className="text-sm text-nau-go-dam italic">{T.chiMoSauKhiEm}</span>
                )}
              </div>
            </div>

            {/* Bảng điều khiển thử số */}
            <div className="p-4 bg-white/60 rounded-[16px] border border-muc-tim/30 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-chu">{T.nhapSoX122}</span>
                  <input
                    type="number"
                    min={1}
                    max={22}
                    value={p1InputX}
                    disabled={p1Found || p1AutoRunning}
                    onChange={(e) => setP1InputX(parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-1.5 rounded-[10px] border-2 border-muc-tim font-mono font-bold text-center text-chu focus:outline-none"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={p1Found || p1AutoRunning}
                  onClick={handleManualTry}
                >{T.thuGiaTriX}</Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1Found || p1AutoRunning || p1ManualXs.length < 3}
                  onClick={handleAutoRun}
                >
                  {p1AutoRunning ? T.mayDangThu : T.deMayThuLanLuot}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1ManualXs.length < 3}
                  onClick={() => {
                    sound.playClick();
                    setShowTableModal(true);
                  }}
                >{T.xemLaiBang5X}</Button>
              </div>

              {/* Chú thích khi nút Để máy thử lần lượt còn khóa */}
              {p1ManualXs.length < 3 && !p1Found && (
                <div className="text-sm text-nau-go-dam font-medium flex items-center gap-1.5 bg-vang/15 p-2.5 rounded-[10px] border border-vang/60">
                  <span>💡</span>{' '}{fmt(T.emTuThuItNhat, { so: p1ManualXs.length })}</div>
              )}

              {p1Found && (
                <div className="p-3 bg-xanh-la-dam/15 border border-xanh-la-dam rounded-[12px] text-sm text-[#1C4D2E] space-y-1 animate-fadeIn">
                  <div className="font-extrabold text-sm text-xanh-la-dam flex items-center gap-1.5">
                    <span>🎉</span>{' '}{T.daTimRaKhoaRieng}</div>
                  <div>{rich(T.viTapHopSoChi)}</div>
                </div>
              )}
            </div>

            {/* Lịch sử các lần thử */}
            {p1History.length > 0 && (
              <div className="mt-4 pt-3 border-t border-giay">
                <div className="text-sm font-bold text-nau-go-dam mb-2 uppercase">{fmt(T.lichSuThuNghiemLan, { so: p1History.length })}</div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {p1History.map((h, i) => (
                    <div
                      key={i}
                      className={`
                        px-2.5 py-1 rounded-[8px] border text-sm font-mono font-bold flex items-center gap-1.5
                        ${
                          h.isMatch
                            ? 'bg-xanh-la-dam text-white border-xanh-la-dam'
                            : 'bg-white/70 text-nau-go-dam border-nau-go/30'
                        }
                      `}
                    >
                      <span>5^{h.x} mod 23 =</span>
                      <span>{h.val}</span>
                      <span>{h.isMatch ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Câu hỏi chuyển tiếp sau khi tìm ra 15 */}
            {p1Found && (
              <div className="mt-5 p-4 bg-white/70 rounded-[14px] border-2 border-muc-tim/30 space-y-3 animate-fadeIn">
                <div className="font-display font-bold text-sm text-chu">{T.voiP23ThiEm}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    T.vanTimDuocChiLau,
                    T.timDuocNeuDungMay,
                    T.lauToiMucCoiNhu,
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setP1Prediction(opt);
                      }}
                      className={`
                        p-2.5 rounded-[10px] border-2 font-display text-sm font-bold text-left transition-all cursor-pointer
                        ${
                          p1Prediction === opt
                            ? 'border-muc-tim bg-muc-tim/10 text-muc-tim-dam'
                            : 'border-nau-go/30 bg-white/60 hover:border-muc-tim/30 text-chu'
                        }
                      `}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {p1Prediction && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-giay animate-fadeIn">
                    <div className="text-sm font-bold text-muc-tim-dam flex items-center gap-1.5">
                      <span>👉</span>{' '}{T.emThuXemSao}</div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        sound.playClick();
                        setPart(2);
                        setP2Step('A');
                      }}
                    >{T.sangPhan2ThuVoi}</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================================= */}
      {/* PHẦN 2 */}
      {/* ======================================================================= */}
      {part === 2 && (
        <div className="space-y-6">
          {/* BƯỚC A: Em tự dò */}
          {p2Step === 'A' && (
            <Card variant="paper" className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-giay">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-muc-tim-dam bg-muc-tim/10 px-2 py-0.5 rounded-full">{T.buocAEmTuDo2}</span>
                    <span className="text-sm text-nau-go-dam">p = 1.000.003, g = 2</span>
                  </div>
                  <h4 className="font-display font-extrabold text-base sm:text-lg text-chu">{T.thuSucTimKhoaRieng}</h4>
                  <p className="text-sm sm:text-sm text-nau-go-dam">{rich(T.khoaCongKhaiCuaLa, { so: formatNumber(bruteConfigs[2].target) })}</p>
                </div>

                {/* Đồng hồ đếm ngược 5:00 hiện to */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#1C182B] text-white rounded-[16px] border border-white/10 shrink-0 min-w-[120px]">
                  <span className="text-sm text-[#A69EBF] uppercase font-bold tracking-wider">{T.thoiGianConLai}</span>
                  <span
                    className={`font-mono font-extrabold text-3xl sm:text-4xl ${
                      p2TimeLeft <= 30 ? 'text-red-300 animate-pulse' : 'text-vang'
                    }`}
                  >
                    {formatTime(p2TimeLeft)}
                  </span>
                </div>
              </div>

              {/* Ô NumberInput & Nút Thử */}
              <div className="p-4 bg-white/60 rounded-[16px] border border-muc-tim/30 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-sm font-bold text-chu block mb-1">{T.nhapSoX11}</label>
                    <NumberInput
                      value={p2ManualX}
                      onChange={(v) => setP2ManualX(v)}
                      min={1}
                      max={1000001}
                      showButtons={false}
                      placeholder={T.nhapSoX}
                      inputClassName="w-36 sm:w-44 text-base font-mono font-bold text-center"
                      disabled={p2GuessedCorrectly}
                      onEnter={handleP2Try}
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={
                      p2ManualX === null ||
                      p2ManualX < 1 ||
                      p2ManualX > 1000001 ||
                      p2GuessedCorrectly
                    }
                    onClick={handleP2Try}
                  >{T.thuGiaTriX}</Button>
                </div>

                {/* Thông báo nếu đoán trúng */}
                {p2GuessedCorrectly && (
                  <div className="p-3 bg-xanh-la-dam/15 border border-xanh-la-dam rounded-[12px] text-sm text-[#1C4D2E] space-y-2 animate-fadeIn">
                    <div className="font-display font-extrabold text-sm text-xanh-la-dam flex items-center gap-1.5">
                      <span>🎉</span>{' '}{T.emMayManThatXac}</div>
                    <div className="flex justify-end pt-1">
                      <Button variant="primary" size="sm" onClick={() => setP2Step('B')}>{T.xemKetLuanSoLieu}</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lịch sử 5 lần thử gần nhất */}
              {p2History.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-giay">
                  <div className="text-sm font-bold text-nau-go-dam flex items-center justify-between">
                    <span>{fmt(T.so5LanThuGanNhat, { so: p2History.length })}</span>
                  </div>
                  <div className="space-y-1">
                    {p2History.slice(0, 5).map((h, i) => (
                      <div
                        key={i}
                        className={`
                          px-3 py-1.5 rounded-[10px] border text-sm font-mono font-bold flex items-center justify-between
                          ${
                            h.isMatch
                              ? 'bg-xanh-la-dam/10 text-xanh-la-dam border-xanh-la-dam'
                              : 'bg-white/70 text-nau-go-dam border-nau-go/30'
                          }
                        `}
                      >
                        <span>
                          2^{formatNumber(h.x)} mod 1.000.003 = {formatNumber(h.val)}
                        </span>
                        <span className={h.isMatch ? 'text-xanh-la-dam' : 'text-do-son-dam'}>
                          {h.isMatch ? T.dung : T.sai}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nút bỏ cuộc hiện ngay từ đầu */}
              <div className="pt-2 flex justify-start">
                <Button variant="danger" size="sm" onClick={handleP2GiveUp}>{T.emThayViecNayLa}</Button>
              </div>
            </Card>
          )}

          {/* BƯỚC B: Kết luận từ số liệu của học sinh */}
          {p2Step === 'B' && (
            <Card variant="paper" className="p-5 sm:p-6 space-y-5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-sm font-bold text-muc-tim-dam bg-muc-tim/10 px-2 py-0.5 rounded-full inline-block mb-1">{T.buocBKetLuanTu}</div>
                  <h4 className="font-display font-extrabold text-lg text-chu">{T.thuBangTayTonBao}</h4>
                </div>
              </div>

              <div className="p-4 bg-white/60 rounded-[16px] border border-muc-tim/30 space-y-3">
                <p className="text-sm sm:text-base text-chu leading-relaxed">{rich(T.emDaThuLanTrong, { so: p2History.length, so2: formatElapsedDuration(p2ElapsedSecRef.current), so3: calculateHInfo(p2History.length, p2ElapsedSecRef.current) })}</p>

                {p1Prediction && (
                  <div className="pt-2 border-t border-muc-tim/30">
                    {p1Prediction === T.vanTimDuocChiLau ||
                    p1Prediction === T.timDuocNeuDungMay ? (
                      <p className="text-sm sm:text-sm text-nau-go-dam bg-vang/15 p-3 rounded-[12px] border border-vang/60 font-medium leading-relaxed">{rich(T.lucNayEmDoanLa, { p1Prediction })}</p>
                    ) : (
                      <p className="text-sm sm:text-sm text-xanh-la-dam bg-xanh-la/10 p-3 rounded-[12px] border border-[#BBF7D0] font-medium leading-relaxed">{rich(T.lucNayEmDaNhan, { p1Prediction })}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    sound.playClick();
                    setP2Step('C');
                  }}
                >{T.deMayThuXemNhanh}</Button>
              </div>
            </Card>
          )}

          {/* BƯỚC C: Máy dò & Bitcoin 256-bit */}
          {p2Step === 'C' && (
            <Card variant="paper" className="p-4 sm:p-5 space-y-5 animate-fadeIn">
              <div>
                <div className="text-sm font-bold text-muc-tim-dam bg-muc-tim/10 px-2 py-0.5 rounded-full inline-block mb-1">{T.buocCMayTinhThu}</div>
                <h4 className="font-display font-extrabold text-base sm:text-lg text-chu flex items-center gap-2">
                  <span>🚀</span>{' '}{T.thuNghiemTocDoDo}</h4>
                <p className="text-sm sm:text-sm text-nau-go-dam">{T.mayTinhCuaEmCo}</p>
              </div>

              {/* 3 Nút chọn cấu hình */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {bruteConfigs.map((cfg, idx) => (
                  <button
                    key={cfg.id}
                    type="button"
                    disabled={bruteRunning}
                    onClick={() => handleStartBrute(idx)}
                    className={`
                      p-3 rounded-[12px] border-2 text-left transition-all
                      ${
                        selectedConfigIdx === idx
                          ? 'border-muc-tim bg-muc-tim/10'
                          : 'border-nau-go/30 bg-white/70 hover:border-nau-go/40'
                      }
                      ${bruteRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="font-display font-extrabold text-sm text-chu">
                      {cfg.label}
                    </div>
                    <div className="text-sm text-nau-go-dam mt-0.5">{fmt(T.mucTieu, { so: formatNumber(cfg.target) })}</div>
                  </button>
                ))}
              </div>

              {/* Bảng tiến trình dò */}
              {bruteState && (
                <div className="p-4 bg-chu text-white rounded-[16px] space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-violet-200">{fmt(T.cauHinhP, { so: formatNumber(bruteState.p) })}</span>
                    <span className="font-mono font-bold text-vang">
                      {bruteRunning ? T.dangChay : T.hoanThanh}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#1C182B] h-3 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-muc-tim h-full transition-all duration-100"
                      style={{
                        width: `${Math.min(100, (bruteState.tries / bruteState.p) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm pt-1">
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-sm">{T.soPhepThu}</div>
                      <div className="font-mono font-extrabold text-sm text-white">
                        {formatNumber(bruteState.tries)}
                      </div>
                    </div>
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-sm">{T.thoiGian}</div>
                      <div className="font-mono font-extrabold text-sm text-[#4ADE80]">{rich(T.ms, { so: Math.round(bruteElapsedMs) })}</div>
                    </div>
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-sm">{T.tocDo}</div>
                      <div className="font-mono font-extrabold text-sm text-vang">
                        {formatNumber(bruteTriesPerSec)}/s
                      </div>
                    </div>
                  </div>

                  {bruteState.found !== null && (
                    <div className="p-2.5 bg-xanh-la-dam/20 border border-xanh-la-dam rounded-[10px] text-sm text-center text-[#4ADE80] font-bold">{fmt(T.timDuocKhoaRiengSau, { so: formatNumber(bruteState.found), so2: formatNumber(bruteState.tries), so3: Math.round(bruteElapsedMs) })}</div>
                  )}
                </div>
              )}

              {/* So sánh và Bảng Bitcoin 256-bit khi đã chạy p=1.000.003 */}
              {hasRunP1M && (
                <div className="space-y-4 pt-4 border-t border-nau-go/30 animate-fadeIn">
                  {/* So sánh thẳng giữa máy và việc học sinh vừa bỏ cuộc */}
                  {(() => {
                    const p1MStats = p1MStatsRef.current;
                    const elapsedMs = p1MStats ? p1MStats.elapsedMs : bruteElapsedMs;
                    const machineTries = p1MStats ? p1MStats.tries : (bruteState?.tries ?? 0);
                    const machineElapsedSec = elapsedMs / 1000;

                    const machineRate =
                      machineElapsedSec > 0 && machineTries > 0
                        ? machineTries / machineElapsedSec
                        : bruteTriesPerSec > 0
                        ? bruteTriesPerSec
                        : 0;

                    const studentTries = p2History.length;
                    const studentElapsedSec = Math.max(1, p2ElapsedSecRef.current);
                    // Dùng cùng giả định như bước B (5 giây mỗi lần thử -> tốc độ 0.2 lần/giây) khi N = 0
                    const studentRate = studentTries === 0 ? 0.2 : studentTries / studentElapsedSec;

                    let speedup: number | null = null;
                    if (machineRate > 0 && studentRate > 0) {
                      const rawRatio = machineRate / studentRate;
                      if (Number.isFinite(rawRatio) && rawRatio >= 1) {
                        speedup = Math.round(rawRatio);
                      }
                    }

                    const roundedMs = Math.round(elapsedMs);
                    const msDisplay = roundedMs > 0 ? fmt(T.soMs, { so: formatNumber(roundedMs) }) : T.duoiMotMs;

                    return (
                      <div className="p-3.5 bg-muc-tim/10 border-2 border-muc-tim rounded-[14px] text-sm sm:text-sm text-chu space-y-1.5">
                        <div className="font-display font-extrabold text-muc-tim-dam flex items-center gap-2">
                          <span>⚡</span>{' '}{T.soSanhThang}</div>
                        <p className="leading-relaxed">{rich(T.mayLamXongViecEm, { msDisplay })}{speedup !== null && speedup >= 1 && (
                            <>{' '}{rich(T.mayNhanhHonEmKhoang, { so: formatNumber(speedup) })}</>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  <h5 className="font-display font-extrabold text-sm sm:text-base text-chu flex items-center gap-2">
                    <span>🌌</span>{' '}{T.nhungBitcoinDungKhoa256}</h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-white/60 rounded-[12px] border border-muc-tim/30 space-y-1">
                      <div className="text-nau-go-dam font-medium">{T.tongSoKhaNang2}</div>
                      <div className="font-mono font-extrabold text-muc-tim-dam text-sm sm:text-base">
                        {ESTIMATES.totalPossibilities}
                      </div>
                      <div className="text-sm text-nau-go-dam">{T.lonHonToanBoSo}</div>
                    </div>

                    <div className="p-3 bg-do-son/10 rounded-[12px] border border-[#FCA5A5] space-y-1">
                      <div className="text-nau-go-dam font-medium">{fmt(T.sieuMayTinhThuLan, { supercomputerTriesPerSec: ESTIMATES.supercomputerTriesPerSec })}</div>
                      <div className="font-mono font-extrabold text-do-son-dam text-sm sm:text-base">{fmt(T.nam, { supercomputerYears: ESTIMATES.supercomputerYears })}</div>
                      <div className="text-sm text-[#7F1D1D]">{fmt(T.keCaThuatToanThong, { smartSteps: ESTIMATES.smartSteps, smartYears: ESTIMATES.smartYears, universeMultiplier: ESTIMATES.universeMultiplier })}</div>
                    </div>
                  </div>

                  {/* Thanh so sánh logarit */}
                  <div className="p-3.5 bg-white/70 rounded-[14px] border border-muc-tim/30 space-y-2.5">
                    <div className="text-sm font-bold text-nau-go-dam flex items-center justify-between">
                      <span>{T.thangSoSanhLogaritDo}</span>
                      <span className="font-mono text-muc-tim-dam text-sm">{T.quyMoSoMu}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="flex justify-between text-nau-go-dam mb-0.5">
                          <span>{T.so1ThuBangTay10}</span>
                          <span className="font-mono font-bold text-chu">{T.vaiGiaySo}</span>
                        </div>
                        <div className="w-full bg-giay h-2.5 rounded-full overflow-hidden border border-nau-go/30">
                          <div className="bg-[#2E90E8] h-full rounded-full" style={{ width: '4%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-nau-go-dam mb-0.5">
                          <span>{T.so2MayThuSoNho}</span>
                          <span className="font-mono font-bold text-xanh-la-dam">{rich(T.ms2, { so: Math.round(bruteElapsedMs) })}</span>
                        </div>
                        <div className="w-full bg-giay h-2.5 rounded-full overflow-hidden border border-nau-go/30">
                          <div className="bg-xanh-la-dam h-full rounded-full" style={{ width: '12%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-nau-go-dam mb-0.5">
                          <span>{T.so3BitcoinThuatToanThong}</span>
                          <span className="font-mono font-bold text-vang-dam">{fmt(T.namLanTuoiVuTru, { smartYears: ESTIMATES.smartYears, universeMultiplier: ESTIMATES.universeMultiplier })}</span>
                        </div>
                        <div className="w-full bg-giay h-2.5 rounded-full overflow-hidden border border-nau-go/30">
                          <div className="bg-vang-dam h-full rounded-full" style={{ width: '50%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-nau-go-dam mb-0.5">
                          <span>{T.so4ToanBoKhongGian}</span>
                          <span className="font-mono font-bold text-do-son-dam">{T.batKhaThiDoiVoi}</span>
                        </div>
                        <div className="w-full bg-giay h-2.5 rounded-full overflow-hidden border border-nau-go/30">
                          <div className="bg-do-son h-full rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Câu rút ra giữ nguyên */}
                  <div className="p-3 bg-muc-tim/10 rounded-[12px] border border-muc-tim/30 text-sm sm:text-sm text-muc-tim-dam font-bold text-center">{T.tinhXuoiMat1Giay}</div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        sound.playClick();
                        setPart(3);
                      }}
                    >{T.sangPhan3TinhHuong}</Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* PHẦN 3 */}
      {/* ======================================================================= */}
      {part === 3 && (
        <div className="space-y-6">
          <Card variant="paper" className="p-5">
            <h4 className="font-display font-extrabold text-base text-chu mb-2 flex items-center gap-2">
              <span>💨</span>{' '}{T.tinhHuongMatKhoaRieng}</h4>

            <div className="p-4 bg-vang/15 rounded-[14px] border border-vang/60 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="font-display font-bold text-sm text-nau-go-dam">{fmt(T.viCua50Xu, { myName })}</span>
                </div>
                <span className="text-sm bg-white/70 px-2 py-0.5 rounded-full border border-vang/60 font-mono font-bold text-nau-go-dam">{T.khoaCongKhai18}</span>
              </div>

              <p className="text-sm sm:text-sm text-nau-go-dam leading-relaxed mb-3">{rich(T.motConGioBatNgo)}</p>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    sound.playWrong();
                    setWithdrawAttempted(true);
                  }}
                >{T.thuRut50XuRa}</Button>

                {withdrawAttempted && (
                  <span className="text-sm font-bold text-do-son-dam animate-shake">{T.loiKhongTheKyGiao}</span>
                )}
              </div>
            </div>

            {/* Câu hỏi phản tư / suy ngẫm */}
            <div className="p-4 sm:p-5 bg-white/70 rounded-[16px] border-2 border-muc-tim/30 space-y-4">
              <div className="text-sm font-bold text-muc-tim-dam uppercase tracking-wider flex items-center gap-1.5">
                <span>💭</span>{' '}{T.cauHoiSuyNgam}</div>
              <p className="font-display font-bold text-sm sm:text-base text-chu">{T.aiCoTheGiupEm}</p>

              <div className="space-y-2.5">
                {P3_OPTIONS.map((opt, idx) => {
                  const isSelected = p3SelectedIdx === idx;
                  const isWrong = p3WrongAnswers.includes(idx);
                  const isCorrect = p3IsCorrect && idx === 3;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={p3IsCorrect}
                      onClick={() => handleSelectP3Option(idx)}
                      className={`
                        w-full text-left p-3 sm:p-3.5 rounded-[12px] border-2 transition-all font-medium text-sm sm:text-sm
                        flex items-center justify-between gap-3 cursor-pointer
                        ${
                          isCorrect
                            ? 'border-xanh-la-dam bg-xanh-la/10 text-xanh-la-dam'
                            : isSelected && !opt.isCorrect
                            ? 'border-do-son bg-do-son/10 text-do-son-dam'
                            : isWrong
                            ? 'border-[#FCA5A5] bg-do-son/10 text-do-son-dam'
                            : 'border-nau-go/30 bg-white/70 hover:border-muc-tim text-chu'
                        }
                        ${p3IsCorrect ? 'cursor-default' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${
                            isCorrect
                              ? 'border-xanh-la-dam bg-xanh-la-dam text-white'
                              : isWrong
                              ? 'border-do-son-dam bg-do-son-dam text-white'
                              : 'border-nau-go/40 text-nau-go-dam'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isCorrect && <span className="font-bold text-xanh-la-dam">{T.dung2}</span>}
                      {isWrong && !isCorrect && <span className="font-bold text-do-son-dam">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Lời giải thích khi chọn sai */}
              {!p3IsCorrect && p3Feedback && (
                <div className="p-3 bg-do-son/10 rounded-[12px] border border-[#FCA5A5] text-sm sm:text-sm text-do-son-dam leading-relaxed animate-fadeIn">
                  <div className="font-bold mb-0.5 flex items-center gap-1.5">
                    <span>✗</span>{' '}{T.chuaChinhXac}</div>
                  <p>{p3Feedback}</p>
                </div>
              )}

              {/* Lời giải thích cuối khi chọn đúng */}
              {p3IsCorrect && (
                <div className="p-3.5 bg-xanh-la/10 rounded-[12px] border-2 border-xanh-la-dam text-sm sm:text-sm text-[#166534] leading-relaxed space-y-2 animate-fadeIn">
                  <div className="font-bold text-sm text-xanh-la-dam flex items-center gap-1.5">
                    <span>🎉</span>{' '}{T.chinhXacKhongAiCa}</div>
                  <p>{T.trongMangPhiTapTrung}</p>
                  <div className="pt-2 border-t border-[#BBF7D0] flex items-center justify-between text-sm font-semibold text-xanh-la-dam">
                    <span>{' '}{fmt(T.soSaoDatDuoc, { so: fmt(T.soSao, { so: p3WrongAnswers.length === 0 ? 3 : p3WrongAnswers.length === 1 ? 2 : 1 }) })}</span>
                    <span>{T.dangHoanThanhBaiHoc}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal Bảng tra 5^x mod 23 */}
      <Modal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        title={T.bangTra5XMod}
        maxWidth="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-nau-go-dam">{rich(T.bangTinhSanKetQua)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-mono max-h-72 overflow-y-auto p-1">
            {Array.from({ length: 22 }, (_, i) => i + 1).map((x) => {
              const val = modPow(5, x, 23);
              const highlight = p1Found && val === 19;
              return (
                <div
                  key={x}
                  className={`p-2 rounded-[8px] border text-center transition-all ${
                    highlight
                      ? 'bg-muc-tim text-white border-muc-tim font-bold'
                      : 'bg-white/60 text-chu border-muc-tim/30'
                  }`}
                >
                  <div>5<sup>{x}</sup> mod 23 =</div>
                  <div className="text-sm font-extrabold">{val}</div>
                  {highlight && <div className="text-sm text-vang-dam">{fmt(T.cuaX, { x })}</div>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowTableModal(false)}>{T.dong}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
