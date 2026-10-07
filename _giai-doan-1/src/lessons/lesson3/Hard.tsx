import React, { useState, useRef, useEffect } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { useProgress } from '../../app/ProgressContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { sound } from '../../lib/sound';
import { formatNumber, formatDecimal, formatTime } from '../../lib/format';
import {
  modPow,
  startBrute,
  stepBrute,
  BruteState,
  ESTIMATES,
} from './logic';
import { Modal } from '../../components/ui/Modal';
import { NumberInput } from '../../components/ui/NumberInput';
import { createMulberry32 } from '../../lib/rng';

// 3 cấu hình cơ sở thử nghiệm brute force
const BASE_BRUTE_CONFIGS = [
  { id: 'c1', p: 101, g: 2, label: 'p = 101 (Nhỏ)' },
  { id: 'c2', p: 1009, g: 11, label: 'p = 1.009 (Vừa)' },
  { id: 'c3', p: 1000003, g: 2, label: 'p = 1.000.003 (Lớn)' },
];

export const Hard: React.FC<LevelProps> = ({ onComplete }) => {
  const { progress } = useProgress();
  const myName = progress?.userName || 'Em';

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
    if (secs < 60) return `${secs} giây`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
  };

  const calculateHInfo = (tries: number, elapsedSec: number) => {
    const TOTAL_KEYS = 1000001;
    if (tries === 0) {
      const assumedSec = TOTAL_KEYS * 5;
      const hours = assumedSec / 3600;
      const days = Math.round(hours / 24);
      return `khoảng ${formatNumber(Math.round(hours))} giờ (~${days} ngày)`;
    }
    const speed = tries / Math.max(1, elapsedSec);
    const totalSecNeeded = TOTAL_KEYS / speed;
    const hours = totalSecNeeded / 3600;

    if (hours < 48) {
      return `khoảng ${formatNumber(Math.round(hours))} giờ`;
    }
    const days = hours / 24;
    if (days < 365) {
      return `khoảng ${formatNumber(Math.round(days))} ngày (~${formatNumber(Math.round(hours))} giờ)`;
    }
    const years = days / 365.25;
    return `khoảng ${formatDecimal(Math.round(years * 10) / 10)} năm (~${formatNumber(Math.round(hours))} giờ)`;
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
      text: 'Ngân hàng',
      isCorrect: false,
      wrongExplanation:
        'Blockchain không có ngân hàng nào đứng giữa. Không ai giữ sổ hộ em, nên cũng không ai mở khóa hộ em được.',
    },
    {
      id: 1,
      text: 'Người lập trình ra blockchain',
      isCorrect: false,
      wrongExplanation:
        'Họ viết ra luật chơi rồi thôi. Họ cũng không có khóa riêng của em, và không có cửa sau nào để lấy tiền trong ví người khác.',
    },
    {
      id: 2,
      text: 'Các node trong mạng',
      isCorrect: false,
      wrongExplanation:
        'Các node chỉ kiểm tra chữ ký có hợp lệ không. Không có chữ ký thì mọi node đều từ chối, dù có bao nhiêu node đi nữa.',
    },
    {
      id: 3,
      text: 'Không ai cả',
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
            'Phép toán 5^x mod p là hàm một chiều: tính xuôi dễ, giải ngược cực khó (bài toán logarit rời rạc). Mất khóa riêng là mất tiền vĩnh viễn!',
        });
      }, 2500);
    } else {
      sound.playWrong();
      if (!p3WrongAnswers.includes(idx)) {
        setP3WrongAnswers((prev) => [...prev, idx]);
      }
      setP3Feedback(`${opt.wrongExplanation} Thử chọn lại xem.`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header chỉ số phần */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-[16px] border-2 border-[#E3E0EE] shadow-sticker-sm">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#5B3FD6] text-white flex items-center justify-center font-black text-xs">
            {part}
          </span>
          <span className="font-display font-black text-sm sm:text-base text-[#2A2340]">
            {part === 1
              ? 'Phần 1: Dò khóa riêng với số nhỏ (p = 23)'
              : part === 2
              ? `Phần 2: Thử nghiệm thực tế ${
                  p2Step === 'A'
                    ? '(Bước A: Em tự dò)'
                    : p2Step === 'B'
                    ? '(Bước B: Kết luận số liệu)'
                    : '(Bước C: Máy dò & Bitcoin)'
                }`
              : 'Phần 3: Tình huống mất khóa riêng'}
          </span>
        </div>
        <span className="text-xs font-bold text-[#E5484D] bg-[#FFF0ED] px-2.5 py-1 rounded-full">
          Màn 3.3: Khó
        </span>
      </div>

      {/* ======================================================================= */}
      {/* PHẦN 1 */}
      {/* ======================================================================= */}
      {part === 1 && (
        <div className="space-y-4">
          <Card variant="paper" className="p-4 sm:p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🦊</span>
              <div>
                <h4 className="font-display font-black text-base text-[#2A2340]">
                  Tí muốn bẻ khóa của An!
                </h4>
                <p className="text-xs sm:text-sm text-[#6B6485]">
                  An có khóa công khai là <strong className="text-[#5B3FD6]">19</strong>.
                  Công thức tính là:{' '}
                  <span className="font-mono font-bold text-[#5B3FD6] bg-[#EDE9FE] px-1.5 py-0.5 rounded">
                    5^x mod 23 = 19
                  </span>
                  . Liệu Tí có tìm được <strong>khóa riêng x</strong> bằng cách thử lần lượt các số không?
                </p>
              </div>
            </div>

            {/* Khối gợi ý cách dò ngược */}
            <div className="p-3.5 bg-[#FAF9FF] rounded-[14px] border border-[#DDD6FE] text-xs sm:text-sm text-[#2A2340] space-y-2 mb-4">
              <div className="font-bold text-[#5B3FD6] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span> Gợi ý cách Tí dò ngược:
              </div>
              <p className="leading-relaxed">
                Tí chỉ biết một điều: <strong>khóa công khai = 5<sup>khóa riêng</sup> mod 23</strong>, và khóa công khai của An là <strong>19</strong>.
              </p>
              <p className="leading-relaxed">
                Tí không có cách nào tính ngược. Công thức chỉ chạy được một chiều: có khóa riêng thì tính ra khóa công khai, còn ngược lại thì không có phép tính nào cả.
              </p>
              <p className="leading-relaxed">
                Vậy Tí chỉ còn một cách: đoán. Đoán một số x, tính 5<sup>x</sup> mod 23, xem có ra 19 không. Không ra thì đoán số khác.
              </p>
              <p className="leading-relaxed">
                Khóa riêng chỉ từ 1 đến 22, nên nhiều nhất 22 lần đoán là ra. Em thử xem mất mấy lần.
              </p>

              <div className="pt-2 border-t border-[#DDD6FE]/60 flex items-center justify-between flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1ManualXs.length < 3}
                  onClick={() => {
                    sound.playClick();
                    setShowTableModal(true);
                  }}
                >
                  📖 Xem lại bảng 5^x mod 23
                </Button>
                {p1ManualXs.length < 3 && (
                  <span className="text-[11px] text-[#6B6485] italic">
                    (Chỉ mở sau khi em tự thử ít nhất 3 số)
                  </span>
                )}
              </div>
            </div>

            {/* Bảng điều khiển thử số */}
            <div className="p-4 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2A2340]">Nhập số x (1..22):</span>
                  <input
                    type="number"
                    min={1}
                    max={22}
                    value={p1InputX}
                    disabled={p1Found || p1AutoRunning}
                    onChange={(e) => setP1InputX(parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-1.5 rounded-[10px] border-2 border-[#5B3FD6] font-mono font-bold text-center text-[#2A2340] focus:outline-none"
                  />
                </div>

                <Button
                  variant="purple"
                  size="sm"
                  disabled={p1Found || p1AutoRunning}
                  onClick={handleManualTry}
                >
                  Thử giá trị x
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1Found || p1AutoRunning || p1ManualXs.length < 3}
                  onClick={handleAutoRun}
                >
                  {p1AutoRunning ? 'Máy đang thử...' : '⚡ Để máy thử lần lượt'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={p1ManualXs.length < 3}
                  onClick={() => {
                    sound.playClick();
                    setShowTableModal(true);
                  }}
                >
                  📖 Xem lại bảng 5^x mod 23
                </Button>
              </div>

              {/* Chú thích khi nút Để máy thử lần lượt còn khóa */}
              {p1ManualXs.length < 3 && !p1Found && (
                <div className="text-xs text-[#B45309] font-medium flex items-center gap-1.5 bg-[#FFFBEB] p-2.5 rounded-[10px] border border-[#FDE68A]">
                  <span>💡</span> Em tự thử ít nhất 3 số đã nhé (đã thử {p1ManualXs.length}/3 số khác nhau).
                </div>
              )}

              {p1Found && (
                <div className="p-3 bg-[#1FAF5A]/15 border border-[#1FAF5A] rounded-[12px] text-xs text-[#1C4D2E] space-y-1 animate-fadeIn">
                  <div className="font-black text-sm text-[#1FAF5A] flex items-center gap-1.5">
                    <span>🎉</span> ĐÃ TÌM RA KHÓA RIÊNG: x = 15!
                  </div>
                  <div>
                    Vì tập hợp số chỉ từ 1 đến 22, ta chỉ cần thử tối đa <strong>22 lần</strong> là chắc chắn tìm ra. Nhưng nếu số cực lớn thì sao?
                  </div>
                </div>
              )}
            </div>

            {/* Lịch sử các lần thử */}
            {p1History.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#F0EEF8]">
                <div className="text-xs font-bold text-[#6B6485] mb-2 uppercase">
                  Lịch sử thử nghiệm ({p1History.length} lần thử):
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {p1History.map((h, i) => (
                    <div
                      key={i}
                      className={`
                        px-2.5 py-1 rounded-[8px] border text-xs font-mono font-bold flex items-center gap-1.5
                        ${
                          h.isMatch
                            ? 'bg-[#1FAF5A] text-white border-[#1FAF5A]'
                            : 'bg-white text-[#6B6485] border-[#E3E0EE]'
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
              <div className="mt-5 p-4 bg-white rounded-[14px] border-2 border-[#DDD6FE] space-y-3 animate-fadeIn">
                <div className="font-display font-bold text-sm text-[#2A2340]">
                  🤔 Với p = 23 thì em dò ra khóa riêng khá nhanh. Nếu p là một số rất lớn, em còn tìm được khóa riêng từ khóa công khai không?
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'Vẫn tìm được, chỉ lâu hơn chút',
                    'Tìm được nếu dùng máy tính mạnh',
                    'Lâu tới mức coi như không tìm được',
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setP1Prediction(opt);
                      }}
                      className={`
                        p-2.5 rounded-[10px] border-2 font-display text-xs font-bold text-left transition-all cursor-pointer
                        ${
                          p1Prediction === opt
                            ? 'border-[#5B3FD6] bg-[#EDE9FE] text-[#5B3FD6] shadow-sticker-sm'
                            : 'border-[#E3E0EE] bg-[#FAF9FF] hover:border-[#DDD6FE] text-[#2A2340]'
                        }
                      `}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {p1Prediction && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#F0EEF8] animate-fadeIn">
                    <div className="text-xs font-bold text-[#5B3FD6] flex items-center gap-1.5">
                      <span>👉</span> Em thử xem sao.
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        sound.playClick();
                        setPart(2);
                        setP2Step('A');
                      }}
                    >
                      Sang phần 2: Thử với số lớn ➔
                    </Button>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#F0EEF8]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                      Bước A: Em tự dò
                    </span>
                    <span className="text-xs text-[#6B6485]">p = 1.000.003, g = 2</span>
                  </div>
                  <h4 className="font-display font-black text-base sm:text-lg text-[#2A2340]">
                    Thử sức tìm khóa riêng bằng tay
                  </h4>
                  <p className="text-xs sm:text-sm text-[#6B6485]">
                    Khóa công khai của An là <strong className="text-[#5B3FD6] font-mono">{formatNumber(bruteConfigs[2].target)}</strong>. Tìm khóa riêng x sao cho{' '}
                    <span className="font-mono font-bold text-[#5B3FD6] bg-[#EDE9FE] px-1.5 py-0.5 rounded">
                      2^x mod 1.000.003 = {formatNumber(bruteConfigs[2].target)}
                    </span>.
                  </p>
                </div>

                {/* Đồng hồ đếm ngược 5:00 hiện to */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#1C182B] text-white rounded-[16px] border border-white/10 shrink-0 min-w-[120px]">
                  <span className="text-[10px] text-[#A69EBF] uppercase font-bold tracking-wider">
                    Thời gian còn lại
                  </span>
                  <span
                    className={`font-mono font-black text-3xl sm:text-4xl ${
                      p2TimeLeft <= 30 ? 'text-[#E5484D] animate-pulse' : 'text-[#FFC21A]'
                    }`}
                  >
                    {formatTime(p2TimeLeft)}
                  </span>
                </div>
              </div>

              {/* Ô NumberInput & Nút Thử */}
              <div className="p-4 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#2A2340] block mb-1">
                      Nhập số x (1..1.000.001):
                    </label>
                    <NumberInput
                      value={p2ManualX}
                      onChange={(v) => setP2ManualX(v)}
                      min={1}
                      max={1000001}
                      showButtons={false}
                      placeholder="Nhập số x..."
                      inputClassName="w-36 sm:w-44 text-base font-mono font-bold text-center"
                      disabled={p2GuessedCorrectly}
                      onEnter={handleP2Try}
                    />
                  </div>

                  <Button
                    variant="purple"
                    size="md"
                    disabled={
                      p2ManualX === null ||
                      p2ManualX < 1 ||
                      p2ManualX > 1000001 ||
                      p2GuessedCorrectly
                    }
                    onClick={handleP2Try}
                  >
                    Thử giá trị x
                  </Button>
                </div>

                {/* Thông báo nếu đoán trúng */}
                {p2GuessedCorrectly && (
                  <div className="p-3 bg-[#1FAF5A]/15 border border-[#1FAF5A] rounded-[12px] text-xs text-[#1C4D2E] space-y-2 animate-fadeIn">
                    <div className="font-display font-black text-sm text-[#1FAF5A] flex items-center gap-1.5">
                      <span>🎉</span> Em may mắn thật! Xác suất trúng mỗi lần thử chỉ là 1 trên 1.000.001.
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button variant="primary" size="sm" onClick={() => setP2Step('B')}>
                        Xem kết luận số liệu ➔
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lịch sử 5 lần thử gần nhất */}
              {p2History.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#F0EEF8]">
                  <div className="text-xs font-bold text-[#6B6485] flex items-center justify-between">
                    <span>5 lần thử gần nhất (Tổng số lần đã thử: {p2History.length}):</span>
                  </div>
                  <div className="space-y-1">
                    {p2History.slice(0, 5).map((h, i) => (
                      <div
                        key={i}
                        className={`
                          px-3 py-1.5 rounded-[10px] border text-xs font-mono font-bold flex items-center justify-between
                          ${
                            h.isMatch
                              ? 'bg-[#1FAF5A]/10 text-[#1FAF5A] border-[#1FAF5A]'
                              : 'bg-white text-[#6B6485] border-[#E3E0EE]'
                          }
                        `}
                      >
                        <span>
                          2^{formatNumber(h.x)} mod 1.000.003 = {formatNumber(h.val)}
                        </span>
                        <span className={h.isMatch ? 'text-[#1FAF5A]' : 'text-[#E5484D]'}>
                          {h.isMatch ? '✓ Đúng' : '✗ Sai'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nút bỏ cuộc hiện ngay từ đầu */}
              <div className="pt-2 flex justify-start">
                <Button variant="danger" size="sm" onClick={handleP2GiveUp}>
                  🏳️ Em thấy việc này là không thể — bỏ cuộc
                </Button>
              </div>
            </Card>
          )}

          {/* BƯỚC B: Kết luận từ số liệu của học sinh */}
          {p2Step === 'B' && (
            <Card variant="paper" className="p-5 sm:p-6 space-y-5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2 py-0.5 rounded-full inline-block mb-1">
                    Bước B: Kết luận từ số liệu của em
                  </div>
                  <h4 className="font-display font-black text-lg text-[#2A2340]">
                    Thử bằng tay tốn bao nhiêu thời gian?
                  </h4>
                </div>
              </div>

              <div className="p-4 bg-[#FAF9FF] rounded-[16px] border border-[#DDD6FE] space-y-3">
                <p className="text-sm sm:text-base text-[#2A2340] leading-relaxed">
                  Em đã thử <strong>{p2History.length} lần</strong> trong{' '}
                  <strong>{formatElapsedDuration(p2ElapsedSecRef.current)}</strong>. Với p = 1.000.003
                  có <strong>1.000.001</strong> khóa riêng có thể. Cứ tốc độ này, để thử hết em cần{' '}
                  <strong className="text-[#5B3FD6] font-mono">
                    {calculateHInfo(p2History.length, p2ElapsedSecRef.current)}
                  </strong>
                  , không nghỉ.
                </p>

                {p1Prediction && (
                  <div className="pt-2 border-t border-[#DDD6FE]/60">
                    {p1Prediction === 'Vẫn tìm được, chỉ lâu hơn chút' ||
                    p1Prediction === 'Tìm được nếu dùng máy tính mạnh' ? (
                      <p className="text-xs sm:text-sm text-[#B45309] bg-[#FFFBEB] p-3 rounded-[12px] border border-[#FDE68A] font-medium leading-relaxed">
                        💡 Lúc nãy em đoán là <em>"{p1Prediction}"</em>. Giờ em thấy thế nào?
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-[#15803D] bg-[#F0FDF4] p-3 rounded-[12px] border border-[#BBF7D0] font-medium leading-relaxed">
                        💡 Lúc nãy em đã nhận định rất chuẩn xác: <em>"{p1Prediction}"</em>!
                      </p>
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
                >
                  Để máy thử xem nhanh hơn bao nhiêu ➔
                </Button>
              </div>
            </Card>
          )}

          {/* BƯỚC C: Máy dò & Bitcoin 256-bit */}
          {p2Step === 'C' && (
            <Card variant="paper" className="p-4 sm:p-5 space-y-5 animate-fadeIn">
              <div>
                <div className="text-xs font-bold text-[#5B3FD6] bg-[#EDE9FE] px-2 py-0.5 rounded-full inline-block mb-1">
                  Bước C: Máy tính thử sức
                </div>
                <h4 className="font-display font-black text-base sm:text-lg text-[#2A2340] flex items-center gap-2">
                  <span>🚀</span> Thử nghiệm tốc độ dò khóa ngay trên trình duyệt
                </h4>
                <p className="text-xs sm:text-sm text-[#6B6485]">
                  Máy tính của em có thể thử hàng chục nghìn phép tính mỗi giây. Hãy thử bẻ khóa với các kích thước số khác nhau:
                </p>
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
                          ? 'border-[#5B3FD6] bg-[#EDE9FE]/50 shadow-sticker-sm'
                          : 'border-[#E3E0EE] bg-white hover:border-[#D0CCE0]'
                      }
                      ${bruteRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="font-display font-black text-xs text-[#2A2340]">
                      {cfg.label}
                    </div>
                    <div className="text-[11px] text-[#6B6485] mt-0.5">
                      Mục tiêu: {formatNumber(cfg.target)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Bảng tiến trình dò */}
              {bruteState && (
                <div className="p-4 bg-[#2A2340] text-white rounded-[16px] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#DDD6FE]">
                      Cấu hình: p = {formatNumber(bruteState.p)}
                    </span>
                    <span className="font-mono font-bold text-[#FFC21A]">
                      {bruteRunning ? 'Đang chạy...' : 'Hoàn thành!'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#1C182B] h-3 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-[#5B3FD6] h-full transition-all duration-100"
                      style={{
                        width: `${Math.min(100, (bruteState.tries / bruteState.p) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-[10px]">Số phép thử</div>
                      <div className="font-mono font-black text-sm text-white">
                        {formatNumber(bruteState.tries)}
                      </div>
                    </div>
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-[10px]">Thời gian</div>
                      <div className="font-mono font-black text-sm text-[#4ADE80]">
                        {Math.round(bruteElapsedMs)} ms
                      </div>
                    </div>
                    <div className="p-2 bg-[#1C182B] rounded-[10px]">
                      <div className="text-[#A69EBF] text-[10px]">Tốc độ</div>
                      <div className="font-mono font-black text-sm text-[#FFC21A]">
                        {formatNumber(bruteTriesPerSec)}/s
                      </div>
                    </div>
                  </div>

                  {bruteState.found !== null && (
                    <div className="p-2.5 bg-[#1FAF5A]/20 border border-[#1FAF5A] rounded-[10px] text-xs text-center text-[#4ADE80] font-bold">
                      ✓ Tìm được khóa riêng {formatNumber(bruteState.found)} sau {formatNumber(bruteState.tries)} lần thử, mất {Math.round(bruteElapsedMs)} ms
                    </div>
                  )}
                </div>
              )}

              {/* So sánh và Bảng Bitcoin 256-bit khi đã chạy p=1.000.003 */}
              {hasRunP1M && (
                <div className="space-y-4 pt-4 border-t border-[#E3E0EE] animate-fadeIn">
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
                    const msDisplay = roundedMs > 0 ? `${formatNumber(roundedMs)} ms` : '< 1 ms';

                    return (
                      <div className="p-3.5 bg-[#5B3FD6]/10 border-2 border-[#5B3FD6] rounded-[14px] text-xs sm:text-sm text-[#2A2340] space-y-1.5">
                        <div className="font-display font-black text-[#5B3FD6] flex items-center gap-2">
                          <span>⚡</span> So sánh thẳng:
                        </div>
                        <p className="leading-relaxed">
                          Máy làm xong việc em vừa bỏ cuộc trong khoảng{' '}
                          <strong>{msDisplay}</strong>.
                          {speedup !== null && speedup >= 1 && (
                            <>
                              {' '}Máy nhanh hơn em khoảng{' '}
                              <strong>{formatNumber(speedup)} lần</strong>.
                            </>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  <h5 className="font-display font-black text-sm sm:text-base text-[#2A2340] flex items-center gap-2">
                    <span>🌌</span> Nhưng Bitcoin dùng khóa 256-bit!
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#FAF9FF] rounded-[12px] border border-[#DDD6FE] space-y-1">
                      <div className="text-[#6B6485] font-medium">Tổng số khả năng (2²⁵⁶):</div>
                      <div className="font-mono font-black text-[#5B3FD6] text-sm sm:text-base">
                        {ESTIMATES.totalPossibilities}
                      </div>
                      <div className="text-[11px] text-[#A69EBF]">
                        Lớn hơn toàn bộ số hạt nguyên tử trong vũ trụ quan sát được (~10⁸⁰)!
                      </div>
                    </div>

                    <div className="p-3 bg-[#FFF0ED] rounded-[12px] border border-[#FCA5A5] space-y-1">
                      <div className="text-[#6B6485] font-medium">
                        Siêu máy tính thử {ESTIMATES.supercomputerTriesPerSec} lần/giây:
                      </div>
                      <div className="font-mono font-black text-[#E5484D] text-sm sm:text-base">
                        {ESTIMATES.supercomputerYears} năm
                      </div>
                      <div className="text-[11px] text-[#7F1D1D]">
                        Kể cả thuật toán thông minh nhất ({ESTIMATES.smartSteps} bước) cũng cần{' '}
                        {ESTIMATES.smartYears} năm (gấp {ESTIMATES.universeMultiplier} lần tuổi vũ trụ)!
                      </div>
                    </div>
                  </div>

                  {/* Thanh so sánh logarit */}
                  <div className="p-3.5 bg-white rounded-[14px] border border-[#DDD6FE] space-y-2.5">
                    <div className="text-xs font-bold text-[#6B6485] flex items-center justify-between">
                      <span>Thang so sánh logarit (Độ khó theo lũy thừa 10):</span>
                      <span className="font-mono text-[#5B3FD6] text-[11px]">Quy mô số mũ</span>
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <div className="flex justify-between text-[#6B6485] mb-0.5">
                          <span>1. Thử bằng tay: ~10⁰ – 10¹ số</span>
                          <span className="font-mono font-bold text-[#2A2340]">Vài giây / số</span>
                        </div>
                        <div className="w-full bg-[#F6F5FB] h-2.5 rounded-full overflow-hidden border border-[#E3E0EE]">
                          <div className="bg-[#2E90E8] h-full rounded-full" style={{ width: '4%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[#6B6485] mb-0.5">
                          <span>2. Máy thử số nhỏ p ≈ 10⁶:</span>
                          <span className="font-mono font-bold text-[#1FAF5A]">~{Math.round(bruteElapsedMs)} ms</span>
                        </div>
                        <div className="w-full bg-[#F6F5FB] h-2.5 rounded-full overflow-hidden border border-[#E3E0EE]">
                          <div className="bg-[#1FAF5A] h-full rounded-full" style={{ width: '12%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[#6B6485] mb-0.5">
                          <span>3. Bitcoin thuật toán thông minh (2¹²⁸ ≈ 10³⁸ bước):</span>
                          <span className="font-mono font-bold text-[#D9A000]">{ESTIMATES.smartYears} năm ({ESTIMATES.universeMultiplier} lần tuổi vũ trụ)</span>
                        </div>
                        <div className="w-full bg-[#F6F5FB] h-2.5 rounded-full overflow-hidden border border-[#E3E0EE]">
                          <div className="bg-[#D9A000] h-full rounded-full" style={{ width: '50%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[#6B6485] mb-0.5">
                          <span>4. Toàn bộ không gian khóa Bitcoin (2²⁵⁶ ≈ 1,16 × 10⁷⁷):</span>
                          <span className="font-mono font-bold text-[#E5484D]">Bất khả thi đối với vũ trụ</span>
                        </div>
                        <div className="w-full bg-[#F6F5FB] h-2.5 rounded-full overflow-hidden border border-[#E3E0EE]">
                          <div className="bg-[#E5484D] h-full rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Câu rút ra giữ nguyên */}
                  <div className="p-3 bg-[#EDE9FE] rounded-[12px] border border-[#DDD6FE] text-xs sm:text-sm text-[#5B3FD6] font-bold text-center">
                    💡 Tính xuôi mất 1 giây, tính ngược mất lâu hơn cả tuổi vũ trụ. Đó là lý do khóa công khai được phép công khai.
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        sound.playClick();
                        setPart(3);
                      }}
                    >
                      Sang phần 3: Tình huống mất khóa ➔
                    </Button>
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
            <h4 className="font-display font-black text-base text-[#2A2340] mb-2 flex items-center gap-2">
              <span>💨</span> Tình huống: Mất khóa riêng là mất vĩnh viễn
            </h4>

            <div className="p-4 bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="font-display font-bold text-sm text-[#92400E]">
                    Ví của {myName}: 50 xu
                  </span>
                </div>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-[#FDE68A] font-mono font-bold text-[#D9A000]">
                  Khóa công khai: 18
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#92400E] leading-relaxed mb-3">
                Một cơn gió bất ngờ thổi bay tờ giấy ghi <strong>Khóa riêng 12</strong> của em xuống cống nước sâu và biến mất hoàn toàn!
              </p>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    sound.playWrong();
                    setWithdrawAttempted(true);
                  }}
                >
                  💸 Thử rút 50 xu ra tiêu
                </Button>

                {withdrawAttempted && (
                  <span className="text-xs font-bold text-[#E5484D] animate-shake">
                    ✗ Lỗi: Không thể ký giao dịch vì thiếu khóa riêng!
                  </span>
                )}
              </div>
            </div>

            {/* Câu hỏi phản tư / suy ngẫm */}
            <div className="p-4 sm:p-5 bg-white rounded-[16px] border-2 border-[#DDD6FE] space-y-4">
              <div className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider flex items-center gap-1.5">
                <span>💭</span> Câu hỏi suy ngẫm
              </div>
              <p className="font-display font-bold text-sm sm:text-base text-[#2A2340]">
                Ai có thể giúp em lấy lại số tiền này nếu em làm mất khóa riêng?
              </p>

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
                        w-full text-left p-3 sm:p-3.5 rounded-[12px] border-2 transition-all font-medium text-xs sm:text-sm
                        flex items-center justify-between gap-3 cursor-pointer
                        ${
                          isCorrect
                            ? 'border-[#1FAF5A] bg-[#F0FDF4] text-[#15803D]'
                            : isSelected && !opt.isCorrect
                            ? 'border-[#E5484D] bg-[#FFF0ED] text-[#E5484D]'
                            : isWrong
                            ? 'border-[#FCA5A5] bg-[#FFF0ED]/40 text-[#991B1B]'
                            : 'border-[#E3E0EE] bg-white hover:border-[#5B3FD6] text-[#2A2340]'
                        }
                        ${p3IsCorrect ? 'cursor-default' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCorrect
                              ? 'border-[#1FAF5A] bg-[#1FAF5A] text-white'
                              : isWrong
                              ? 'border-[#E5484D] bg-[#E5484D] text-white'
                              : 'border-[#D0CCE0] text-[#6B6485]'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isCorrect && <span className="font-bold text-[#1FAF5A]">✓ Đúng!</span>}
                      {isWrong && !isCorrect && <span className="font-bold text-[#E5484D]">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Lời giải thích khi chọn sai */}
              {!p3IsCorrect && p3Feedback && (
                <div className="p-3 bg-[#FFF0ED] rounded-[12px] border border-[#FCA5A5] text-xs sm:text-sm text-[#991B1B] leading-relaxed animate-fadeIn">
                  <div className="font-bold mb-0.5 flex items-center gap-1.5">
                    <span>✗</span> Chưa chính xác:
                  </div>
                  <p>{p3Feedback}</p>
                </div>
              )}

              {/* Lời giải thích cuối khi chọn đúng */}
              {p3IsCorrect && (
                <div className="p-3.5 bg-[#F0FDF4] rounded-[12px] border-2 border-[#1FAF5A] text-xs sm:text-sm text-[#166534] leading-relaxed space-y-2 animate-fadeIn">
                  <div className="font-bold text-sm text-[#1FAF5A] flex items-center gap-1.5">
                    <span>🎉</span> CHÍNH XÁC: Không ai cả — số tiền bị kẹt vĩnh viễn!
                  </div>
                  <p>
                    Trong mạng phi tập trung blockchain, không có ngân hàng hay tổng đài để "quên mật khẩu". Quyền sở hữu phụ thuộc 100% vào khóa riêng. Mất khóa riêng đồng nghĩa với mất quyền kiểm soát số tiền vĩnh viễn!
                  </p>
                  <div className="pt-2 border-t border-[#BBF7D0] flex items-center justify-between text-xs font-semibold text-[#15803D]">
                    <span>⭐ Số sao đạt được: {p3WrongAnswers.length === 0 ? '3 sao' : p3WrongAnswers.length === 1 ? '2 sao' : '1 sao'}</span>
                    <span>Đang hoàn thành bài học...</span>
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
        title="Bảng tra 5^x mod 23 (x = 1..22)"
        maxWidth="md"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#6B6485]">
            Bảng tính sẵn kết quả phép tính <strong>5<sup>x</sup> mod 23</strong> tương ứng với từng khóa riêng từ 1 đến 22:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono max-h-72 overflow-y-auto p-1">
            {Array.from({ length: 22 }, (_, i) => i + 1).map((x) => {
              const val = modPow(5, x, 23);
              const highlight = p1Found && val === 19;
              return (
                <div
                  key={x}
                  className={`p-2 rounded-[8px] border text-center transition-all ${
                    highlight
                      ? 'bg-[#5B3FD6] text-white border-[#5B3FD6] font-bold shadow-sticker-sm'
                      : 'bg-[#FAF9FF] text-[#2A2340] border-[#DDD6FE]'
                  }`}
                >
                  <div>5<sup>{x}</sup> mod 23 =</div>
                  <div className="text-sm font-black">{val}</div>
                  {highlight && <div className="text-[10px] text-[#FFC21A]">🎯 Của An (x={x})</div>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowTableModal(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
