import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LevelProps } from '../../components/game/LessonShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BanCoVong } from './BanCoVong';
import {
  Owner,
  AttackMove,
  DefenseMove,
  frontier,
  recoverable,
  resolve,
  countH,
  attackKind,
  defenseKind,
  hardStars,
  addPiece,
  removePieceAt,
} from './logic';
import {
  Habits,
  initialHabits,
  decayHabits,
  recordHabit,
  decideBot,
  botLine,
} from './bot';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32 } from '../../lib/rng';
import { sound } from '../../lib/sound';
import { getLessonData, setLessonData } from '../../lib/progress';

interface RoundHistory {
  round: number;
  attack: AttackMove;
  defense: DefenseMove;
  hackerCount: number;
  captured: number[];
  recovered: number | null;
}

export const Hard: React.FC<LevelProps> = ({ onComplete }) => {
  const startTimeRef = useRef<number>(Date.now());
  const rngRef = useRef<() => number>(null as unknown as () => number);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setTrackedTimeout = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== t);
      fn();
    }, ms);
    timersRef.current.push(t);
    return t;
  };

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // Màn hình bắt đầu hay bàn chơi: 'lobby' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');

  // Cấu hình trước ván
  const [studentRole, setStudentRole] = useState<'H' | 'D'>('H');
  const [difficulty, setDifficulty] = useState<'smart' | 'medium'>('smart');

  // Thế cờ hiện tại: 10 node
  // Khởi tạo: Hacker (đỏ) bắt đầu với N1, N2 (index 0, 1); còn lại là của Người bảo vệ (index 2..9)
  const [owner, setOwner] = useState<Owner[]>([
    'H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D',
  ]);
  const [round, setRound] = useState<number>(1);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [maxHackerNodes, setMaxHackerNodes] = useState<number>(2);

  // Thói quen của người chơi
  const [habits, setHabits] = useState<Habits>(initialHabits);

  // Lựa chọn của học sinh ở round hiện tại
  const [selectedAttacks, setSelectedAttacks] = useState<number[]>([]);
  const [selectedShields, setSelectedShields] = useState<number[]>([]);
  const [selectedRecover, setSelectedRecover] = useState<number | null>(null);
  const [defenderMode, setDefenderMode] = useState<'protect' | 'recover'>('protect');

  // Tiến trình round: 'choosing' | 'thinking' | 'reveal' | 'roundSummary'
  const [roundPhase, setRoundPhase] = useState<
    'choosing' | 'thinking' | 'reveal' | 'roundSummary'
  >('choosing');

  // Dữ liệu đối chiếu reveal
  const [revealData, setRevealData] = useState<{
    attacks: number[];
    shields: number[];
    recoveredNode: number | null;
    changedNodes: number[];
  } | null>(null);
  const [roundSummaryText, setRoundSummaryText] = useState<string>('');
  const [botSpeech, setBotSpeech] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  // Thẻ "ngộ ra" lúc kết thúc: trạng thái lật thẻ 1, 2, 3
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
  });

  const botRole: 'H' | 'D' = studentRole === 'H' ? 'D' : 'H';
  const hackerCount = countH(owner);

  // Node hợp lệ để người chơi bấm chọn
  const selectableNodes = useMemo(() => {
    if (roundPhase !== 'choosing') return [];
    if (studentRole === 'H') {
      return frontier(owner);
    }
    // studentRole === 'D'
    if (defenderMode === 'protect') {
      return frontier(owner);
    }
    return recoverable(owner);
  }, [roundPhase, studentRole, defenderMode, owner]);

  // Bắt đầu ván mới
  const handleStartGame = () => {
    sound.playClick();
    const rng = createMulberry32(Date.now() >>> 0);
    rngRef.current = rng;

    // Đọc habits từ lưu trữ, decay 0.8
    const saved = getLessonData<{ habits?: Habits }>('lesson5')?.habits;
    const currentHabits = saved || initialHabits();
    const decayed = decayHabits(currentHabits, GAME_CONFIG.lesson5.habitDecay);
    setHabits(decayed);
    setLessonData('lesson5', { habits: decayed });

    setOwner(['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D']);
    setRound(1);
    setHistory([]);
    setMaxHackerNodes(2);
    setSelectedAttacks([]);
    setSelectedShields([]);
    setSelectedRecover(null);
    setDefenderMode('protect');
    setRoundPhase('choosing');
    setRevealData(null);
    setRoundSummaryText('');
    setBotSpeech('');
    setGameState('playing');
  };

  // Đổi vai chơi lại
  const handleSwitchRole = () => {
    sound.playClick();
    setStudentRole((r) => (r === 'H' ? 'D' : 'H'));
    setGameState('lobby');
  };

  // Âm thanh khi đặt quân (dựa trên so sánh độ dài, updater giữ hoàn toàn thuần)
  const prevAttacksLenRef = useRef(0);
  useEffect(() => {
    if (selectedAttacks.length > prevAttacksLenRef.current) {
      sound.playClick();
    }
    prevAttacksLenRef.current = selectedAttacks.length;
  }, [selectedAttacks.length]);

  const prevShieldsLenRef = useRef(0);
  useEffect(() => {
    if (selectedShields.length > prevShieldsLenRef.current) {
      sound.playClick();
    }
    prevShieldsLenRef.current = selectedShields.length;
  }, [selectedShields.length]);

  const prevRecoverRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedRecover !== null && selectedRecover !== prevRecoverRef.current) {
      sound.playClick();
    }
    prevRecoverRef.current = selectedRecover;
  }, [selectedRecover]);

  // Chạm vào node trên bàn cờ
  const handleNodeClick = (nodeIndex: number) => {
    if (roundPhase !== 'choosing') return;

    if (studentRole === 'H') {
      setSelectedAttacks((prev) => addPiece(prev, nodeIndex, selectableNodes));
    } else {
      // studentRole === 'D'
      if (defenderMode === 'protect') {
        setSelectedShields((prev) => addPiece(prev, nodeIndex, selectableNodes));
      } else {
        // recover
        if (selectableNodes.includes(nodeIndex)) {
          setSelectedRecover(nodeIndex);
        }
      }
    }
  };

  // Gỡ quân qua khay chip
  const handleRemoveAttackChip = (indexInArray: number) => {
    sound.playClick();
    setSelectedAttacks((prev) => removePieceAt(prev, indexInArray));
  };

  const handleRemoveShieldChip = (indexInArray: number) => {
    sound.playClick();
    setSelectedShields((prev) => removePieceAt(prev, indexInArray));
  };

  const handleRemoveRecoverChip = () => {
    sound.playClick();
    setSelectedRecover(null);
  };

  const isSelectionComplete = useMemo(() => {
    if (studentRole === 'H') return selectedAttacks.length === 2;
    if (defenderMode === 'protect') return selectedShields.length === 2;
    return selectedRecover !== null;
  }, [studentRole, defenderMode, selectedAttacks.length, selectedShields.length, selectedRecover]);

  // Chốt lựa chọn và thực thi vòng đấu
  const handleCommitMove = () => {
    if (!isSelectionComplete || roundPhase !== 'choosing') return;
    sound.playClick();

    // 1. Chuyển sang phase bot suy nghĩ
    setRoundPhase('thinking');

    // Chuẩn bị nước đi của học sinh
    let studentMove: AttackMove | DefenseMove;
    if (studentRole === 'H') {
      studentMove = [selectedAttacks[0], selectedAttacks[1]] as AttackMove;
    } else {
      if (defenderMode === 'protect') {
        studentMove = {
          kind: 'protect',
          shields: [selectedShields[0], selectedShields[1]],
        } as DefenseMove;
      } else {
        studentMove = {
          kind: 'recover',
          node: selectedRecover!,
        } as DefenseMove;
      }
    }

    // 2. setTimeout(0) -> Gọi decideBot CHỈ với owner, round, habits hiện tại
    // TUYỆT ĐỐI KHÔNG truyền studentMove vào bot!
    setTrackedTimeout(() => {
      const rng = rngRef.current || createMulberry32(Date.now() >>> 0);
      const t0 = performance.now();

      const botDecision = decideBot({
        owner,
        round,
        maxRounds: GAME_CONFIG.lesson5.hardMaxRounds,
        botRole,
        difficulty,
        habits,
        rng,
      });

      const elapsed = performance.now() - t0;
      if (import.meta.env.DEV && elapsed > 30) {
        console.warn(`[decideBot] Thời gian tính toán vượt 30ms: ${elapsed.toFixed(1)}ms`);
      }

      // 3. Thời gian bot suy nghĩ từ thinkMinMs..thinkMaxMs (600..900ms)
      const thinkMs =
        GAME_CONFIG.lesson5.thinkMinMs +
        Math.floor(
          rng() *
            (GAME_CONFIG.lesson5.thinkMaxMs - GAME_CONFIG.lesson5.thinkMinMs + 1)
        );

      setTrackedTimeout(() => {
        // 4. REVEAL
        const attack: AttackMove =
          studentRole === 'H'
            ? (studentMove as AttackMove)
            : (botDecision.move as AttackMove);
        const defense: DefenseMove =
          studentRole === 'D'
            ? (studentMove as DefenseMove)
            : (botDecision.move as DefenseMove);

        const newOwner = resolve(owner, attack, defense);

        // Tìm các node bị chiếm hoặc phục hồi
        const changedNodes: number[] = [];
        const captured: number[] = [];
        let recovered: number | null = null;

        for (let i = 0; i < 10; i++) {
          if (owner[i] !== newOwner[i]) {
            changedNodes.push(i);
            if (newOwner[i] === 'H') {
              captured.push(i);
            }
          }
        }
        if (defense.kind === 'recover') {
          recovered = defense.node;
        }

        // Tạo dòng tóm tắt
        const summaryParts: string[] = [];
        if (captured.length > 0) {
          summaryParts.push(
            `${captured.map((n) => `N${n + 1}`).join(', ')} bị chiếm!`
          );
        }
        if (defense.kind === 'protect') {
          const uniqueShields = Array.from(new Set(defense.shields));
          summaryParts.push(
            `${uniqueShields.map((n) => `N${n + 1}`).join(', ')} được bảo vệ.`
          );
        } else if (recovered !== null) {
          summaryParts.push(`N${recovered + 1} được phục hồi.`);
        }
        if (summaryParts.length === 0) {
          summaryParts.push('Không có node nào đổi chủ.');
        }
        const summaryText = summaryParts.join(' ');

        setRevealData({
          attacks: [attack[0], attack[1]],
          shields: defense.kind === 'protect' ? [defense.shields[0], defense.shields[1]] : [],
          recoveredNode: defense.kind === 'recover' ? defense.node : null,
          changedNodes,
        });
        setRoundSummaryText(summaryText);
        setRoundPhase('reveal');
        sound.playWhoosh();

        // 5. Sau animation reveal (revealAnimMs = 800ms)
        setTrackedTimeout(() => {
          // Ghi nhận thói quen nước của học sinh SAU KHI reveal
          const studentKind =
            studentRole === 'H'
              ? attackKind(studentMove as AttackMove)
              : defenseKind(studentMove as DefenseMove);

          const nextHabits = recordHabit(habits, studentRole, studentKind);
          setHabits(nextHabits);
          setLessonData('lesson5', { habits: nextHabits });

          const newHCount = countH(newOwner);
          const nextMaxH = Math.max(maxHackerNodes, newHCount);
          setMaxHackerNodes(nextMaxH);

          // Kiểm tra kết thúc game
          const isGameOver =
            newHCount >= GAME_CONFIG.lesson5.hardWinNodes ||
            newHCount === 0 ||
            round >= GAME_CONFIG.lesson5.hardMaxRounds;

          // Tạo lời thoại cho bot
          const speech = botLine(
            {
              botRole,
              ownerAfter: newOwner,
              isGameOver,
              botMove: botDecision.move,
              reason: botDecision.reason,
              exploitedKind: botDecision.exploitedKind,
              exploitedProb: botDecision.exploitedProb,
            },
            rng
          );
          setBotSpeech(speech);

          // Cập nhật lịch sử
          const histItem: RoundHistory = {
            round,
            attack,
            defense,
            hackerCount: newHCount,
            captured,
            recovered,
          };
          setHistory((prev) => [...prev, histItem]);
          setOwner(newOwner);
          setRoundPhase('roundSummary');

          if (isGameOver) {
            setGameState('gameover');
            if (
              (studentRole === 'H' && newHCount >= 6) ||
              (studentRole === 'D' &&
                (newHCount === 0 ||
                  (round >= GAME_CONFIG.lesson5.hardMaxRounds && newHCount < 6)))
            ) {
              sound.playCorrect();
            } else {
              sound.playWrong();
            }
          }
        }, GAME_CONFIG.lesson5.revealAnimMs);
      }, thinkMs);
    }, 0);
  };

  // Sang round tiếp theo
  const handleNextRound = () => {
    sound.playClick();
    setRound((r) => r + 1);
    setSelectedAttacks([]);
    setSelectedShields([]);
    setSelectedRecover(null);
    setRevealData(null);
    setRoundSummaryText('');
    setBotSpeech('');
    setRoundPhase('choosing');
  };

  // Xác định người thắng cuộc
  const winner: 'H' | 'D' = useMemo(() => {
    if (hackerCount >= 6) return 'H';
    if (hackerCount === 0) return 'D';
    return 'D'; // Hết 6 round mà H < 6 -> Defender thắng
  }, [hackerCount]);

  const handleFinishHard = () => {
    sound.playClick();
    const finalStars = hardStars({
      studentRole,
      winner,
      roundsPlayed: history.length,
      maxHackerNodes,
    });
    const timeMs = Date.now() - startTimeRef.current;
    onComplete({
      stars: finalStars,
      timeMs,
      learned:
        'Ai nắm hơn một nửa sức mạnh mạng thì lấn át được phần còn lại, nên mạng càng phân tán càng an toàn.',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* ========================================================
          MÀN HÌNH BẮT ĐẦU: CHỌN VAI, ĐỘ KHÓ, VÀ THẺ LUẬT 4 DÒNG
         ======================================================== */}
      {gameState === 'lobby' && (
        <Card variant="paper" className="p-5 sm:p-6 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-display font-black text-2xl text-[#2A2340]">
              Cuộc chiến 51% — Bàn cờ 10 Node
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6485]">
              Thử thách chiến thuật bí mật giữa Hacker và Người bảo vệ mạng lưới.
            </p>
          </div>

          {/* Chọn vai */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#6B6485] block">
              Chọn vai chơi của em
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStudentRole('H');
                }}
                className={`p-3.5 rounded-[14px] border-2 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  studentRole === 'H'
                    ? 'border-[#E5484D] bg-[#FFF5F5] text-[#E5484D] shadow-sticker-sm'
                    : 'border-[#E3E0EE] bg-white text-[#2A2340] hover:border-[#D0CCE0]'
                }`}
              >
                <span>😈</span>
                <span>Em làm Hacker</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStudentRole('D');
                }}
                className={`p-3.5 rounded-[14px] border-2 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  studentRole === 'D'
                    ? 'border-[#2E90E8] bg-[#E9F3FF] text-[#2E90E8] shadow-sticker-sm'
                    : 'border-[#E3E0EE] bg-white text-[#2A2340] hover:border-[#D0CCE0]'
                }`}
              >
                <span>🛡️</span>
                <span>Em làm Người bảo vệ</span>
              </button>
            </div>
          </div>

          {/* Chọn độ khó của Bot */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#6B6485] block">
              Độ khó Bot
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setDifficulty('smart');
                }}
                className={`p-3 rounded-[12px] border-2 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  difficulty === 'smart'
                    ? 'border-[#5B3FD6] bg-[#EDE9FE] text-[#5B3FD6] shadow-sticker-sm'
                    : 'border-[#E3E0EE] bg-white text-[#6B6485]'
                }`}
              >
                <span>🧠</span>
                <span>Bot khôn (mặc định)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setDifficulty('medium');
                }}
                className={`p-3 rounded-[12px] border-2 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  difficulty === 'medium'
                    ? 'border-[#5B3FD6] bg-[#EDE9FE] text-[#5B3FD6] shadow-sticker-sm'
                    : 'border-[#E3E0EE] bg-white text-[#6B6485]'
                }`}
              >
                <span>⚖️</span>
                <span>Bot vừa</span>
              </button>
            </div>
          </div>

          {/* Thẻ luật 4 dòng theo quy định */}
          <div className="bg-[#FAF9FF] p-4 sm:p-5 rounded-[16px] border border-[#DDD6FE] space-y-2.5">
            <span className="text-xs font-bold text-[#5B3FD6] block">
              📜 Luật chơi 4 dòng
            </span>
            <ol className="space-y-2 text-xs sm:text-sm text-[#2A2340] list-decimal list-inside leading-relaxed font-medium">
              <li>
                10 node xếp vòng tròn. Hacker (đỏ) bắt đầu với N1, N2; còn lại là của Người bảo vệ (xanh).
              </li>
              <li>
                Node sáng là node xanh cách vùng đỏ tối đa 2 bước. Mỗi round hai bên chọn bí mật cùng lúc: Hacker đặt 2 ⚔️ vào node sáng; Người bảo vệ đặt 2 🛡️ vào node sáng, hoặc 🔄 lấy lại 1 node đỏ nằm sát vùng xanh.
              </li>
              <li>
                Được dồn 2 quân vào 1 node. Node nào ⚔️ nhiều hơn 🛡️ thì bị chiếm.
              </li>
              <li>
                Hacker giữ 6/10 node (hơn 51%) là thắng. Hết {GAME_CONFIG.lesson5.hardMaxRounds} round mà chưa đủ thì Người bảo vệ thắng.
              </li>
            </ol>
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="primary" size="lg" onClick={handleStartGame}>
              Bắt đầu
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================
          BÀN CHƠI GAMEPLAY CHÍNH
         ======================================================== */}
      {gameState === 'playing' && (
        <div className="space-y-4">
          {/* Thanh trạng thái: Round, tỉ lệ Hacker, và thước đo */}
          <Card variant="paper" className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#5B3FD6]">
                  Round {round}/{GAME_CONFIG.lesson5.hardMaxRounds}
                </span>
                <span className="text-xs text-[#6B6485]">
                  {studentRole === 'H' ? 'Em: Hacker 😈' : 'Em: Người bảo vệ 🛡️'}
                </span>
              </div>
              <span className="font-display font-black text-sm text-[#2A2340]">
                Hacker: {hackerCount}/10 ({hackerCount * 10}%)
              </span>
            </div>

            {/* Thước đo có vạch 50% và vạch thắng 60% */}
            <div className="relative w-full h-5 bg-[#E3E0EE] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-[#E5484D] rounded-full transition-all duration-300"
                style={{ width: `${hackerCount * 10}%` }}
              />
              {/* Vạch 50% */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#2A2340] z-10 opacity-70"
                style={{ left: '50%' }}
                title="Mốc 50%"
              />
              {/* Vạch 60% */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#E5484D] z-10"
                style={{ left: '60%' }}
                title="Mốc 60% thắng"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#6B6485]">
              <span>0%</span>
              <span className="font-bold text-[#2A2340]">50%</span>
              <span className="font-bold text-[#E5484D]">60% (Thắng)</span>
              <span>100%</span>
            </div>
          </Card>

          {/* Băng rôn cảnh báo theo yêu cầu */}
          {hackerCount === 5 && (
            <div className="p-3 bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] text-xs sm:text-sm text-[#92400E] font-bold text-center animate-pulse">
              ⚠️ Hacker đang kiểm soát 50% mạng! Đã thắng chưa? Chưa, cần hơn một nửa.
            </div>
          )}

          {/* Bàn cờ SVG vòng tròn 10 node */}
          <Card variant="paper" className="p-4 sm:p-5 flex flex-col items-center">
            <BanCoVong
              owner={owner}
              selectableNodes={selectableNodes}
              playerRole={studentRole}
              selectedUnits={{
                attacks: selectedAttacks,
                shields: selectedShields,
                recoveredNode: selectedRecover,
              }}
              onNodeClick={handleNodeClick}
              revealData={revealData}
              disabled={roundPhase !== 'choosing'}
            />

            {/* Khay chip gỡ quân bên dưới bàn cờ */}
            {roundPhase === 'choosing' && (
              <div className="w-full mt-4 pt-3 border-t border-[#E3E0EE] flex flex-col items-center gap-3">
                {studentRole === 'D' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDefenderMode('protect');
                        setSelectedShields([]);
                        setSelectedRecover(null);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        defenderMode === 'protect'
                          ? 'bg-[#2E90E8] text-white shadow-sticker-sm'
                          : 'bg-[#F6F5FB] text-[#6B6485] border border-[#E3E0EE]'
                      }`}
                    >
                      🛡️ Bảo vệ (2 khiên)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDefenderMode('recover');
                        setSelectedShields([]);
                        setSelectedRecover(null);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        defenderMode === 'recover'
                          ? 'bg-[#5B3FD6] text-white shadow-sticker-sm'
                          : 'bg-[#F6F5FB] text-[#6B6485] border border-[#E3E0EE]'
                      }`}
                    >
                      🔄 Phục hồi (1 node)
                    </button>
                  </div>
                )}

                {/* Danh sách chip quân đã đặt */}
                <div className="flex flex-wrap items-center justify-center gap-2 min-h-[36px]">
                  {studentRole === 'H' &&
                    selectedAttacks.map((nodeIdx, idx) => (
                      <button
                        key={`atk-chip-${idx}`}
                        type="button"
                        onClick={() => handleRemoveAttackChip(idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5F5] border border-[#E5484D] text-[#E5484D] font-mono font-bold text-xs hover:bg-[#FFE5E5] transition-colors cursor-pointer"
                        title="Chạm để gỡ quân"
                      >
                        <span>⚔️ N{nodeIdx + 1}</span>
                        <span className="text-[10px] opacity-70">✕</span>
                      </button>
                    ))}

                  {studentRole === 'D' &&
                    defenderMode === 'protect' &&
                    selectedShields.map((nodeIdx, idx) => (
                      <button
                        key={`shield-chip-${idx}`}
                        type="button"
                        onClick={() => handleRemoveShieldChip(idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9F3FF] border border-[#2E90E8] text-[#2E90E8] font-mono font-bold text-xs hover:bg-[#D5E9FF] transition-colors cursor-pointer"
                        title="Chạm để gỡ khiên"
                      >
                        <span>🛡️ N{nodeIdx + 1}</span>
                        <span className="text-[10px] opacity-70">✕</span>
                      </button>
                    ))}

                  {studentRole === 'D' &&
                    defenderMode === 'recover' &&
                    selectedRecover !== null && (
                      <button
                        type="button"
                        onClick={handleRemoveRecoverChip}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] border border-[#5B3FD6] text-[#5B3FD6] font-mono font-bold text-xs hover:bg-[#DDD6FE] transition-colors cursor-pointer"
                        title="Chạm để hủy phục hồi"
                      >
                        <span>🔄 N{selectedRecover + 1}</span>
                        <span className="text-[10px] opacity-70">✕</span>
                      </button>
                    )}

                  {!isSelectionComplete && (
                    <span className="text-xs text-[#6B6485] italic">
                      {studentRole === 'H'
                        ? `Hãy chọn ${2 - selectedAttacks.length} node xanh đang sáng để tấn công`
                        : defenderMode === 'protect'
                          ? 'Chọn 2 trong các node đang sáng để bảo vệ (có thể dồn 2 khiên vào 1 node).'
                          : 'Hãy chọn 1 node đỏ đang sáng để phục hồi'}
                    </span>
                  )}
                </div>

                {/* Nút Chốt lựa chọn */}
                <div className="pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!isSelectionComplete}
                    onClick={handleCommitMove}
                  >
                    Chốt lựa chọn
                  </Button>
                </div>
              </div>
            )}

            {/* Trạng thái Bot đang suy nghĩ */}
            {roundPhase === 'thinking' && (
              <div className="py-4 flex items-center gap-2 text-[#5B3FD6] font-display font-bold text-sm animate-pulse">
                <span>🤖</span>
                <span>Bot đang suy nghĩ…</span>
              </div>
            )}

            {/* Dòng tóm tắt & Lời thoại sau reveal */}
            {(roundPhase === 'reveal' || roundPhase === 'roundSummary') && (
              <div className="w-full mt-4 space-y-3 animate-in fade-in">
                {roundSummaryText && (
                  <div className="p-3 bg-[#FAF9FF] rounded-[12px] border border-[#DDD6FE] text-center text-xs sm:text-sm font-bold text-[#2A2340]">
                    {roundSummaryText}
                  </div>
                )}

                {botSpeech && (
                  <div className="p-3 bg-[#F6F5FB] rounded-[14px] border border-[#E3E0EE] flex items-start gap-2.5 text-xs sm:text-sm text-[#2A2340]">
                    <span className="text-lg">🤖</span>
                    <div className="flex-1">
                      <span className="text-[11px] font-bold text-[#6B6485] block mb-0.5">
                        Bot nói:
                      </span>
                      <p className="font-semibold italic">"{botSpeech}"</p>
                    </div>
                  </div>
                )}

                {roundPhase === 'roundSummary' && (
                  <div className="flex justify-center pt-2">
                    <Button variant="primary" size="md" onClick={handleNextRound}>
                      Tiếp tục round {round + 1}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Lịch sử từng round (có thể thu gọn) */}
          {history.length > 0 && (
            <Card variant="paper" className="p-4">
              <button
                type="button"
                onClick={() => setShowHistory((s) => !s)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#6B6485] cursor-pointer"
              >
                <span>📜 Lịch sử các round ({history.length})</span>
                <span>{showHistory ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 divide-y divide-[#E3E0EE] pt-1">
                  {history.map((h) => (
                    <div
                      key={`hist-${h.round}`}
                      className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#2A2340] gap-1"
                    >
                      <span className="font-bold text-[#5B3FD6]">
                        Round {h.round}
                      </span>
                      <span>
                        ⚔️ N{h.attack[0] + 1}+N{h.attack[1] + 1} ·{' '}
                        {h.defense.kind === 'protect'
                          ? `🛡️ N${h.defense.shields[0] + 1}+N${h.defense.shields[1] + 1}`
                          : `🔄 N${h.defense.node + 1}`}
                      </span>
                      <span className="text-[#6B6485]">
                        Hacker: {h.hackerCount}/10
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          KẾT THÚC VÁN: THỐNG KÊ & 3 THẺ NGỘ RA
         ======================================================== */}
      {gameState === 'gameover' && (
        <Card variant="paper" className="p-5 sm:p-6 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="text-4xl">
              {winner === studentRole ? '🏆' : '🛡️'}
            </div>
            <h3 className="font-display font-black text-2xl text-[#2A2340]">
              {winner === 'H'
                ? 'Hacker đã chiếm 60% mạng lưới!'
                : 'Người bảo vệ đã giữ vững an toàn mạng lưới!'}
            </h3>
            <p className="text-sm font-semibold text-[#5B3FD6]">
              {winner === studentRole
                ? 'Em đã chiến thắng ván cờ!'
                : 'Bot đã giành chiến thắng lần này.'}
            </p>
          </div>

          {/* Bảng thống kê từng round */}
          <div className="bg-[#FAF9FF] p-4 rounded-[16px] border border-[#DDD6FE] space-y-3">
            <span className="text-xs font-bold text-[#5B3FD6] block">
              Thống kê trận đấu
            </span>
            <div className="space-y-1.5 text-xs text-[#2A2340]">
              {history.map((h) => (
                <div
                  key={`stat-${h.round}`}
                  className="flex items-center justify-between py-1 border-b border-[#E3E0EE] last:border-none"
                >
                  <span className="font-bold">Round {h.round}:</span>
                  <span>
                    Chiếm được: {h.captured.length > 0 ? h.captured.map((n) => `N${n + 1}`).join(', ') : '0'}
                  </span>
                  <span>
                    Lấy lại: {h.recovered !== null ? `N${h.recovered + 1}` : '0'}
                  </span>
                  <span className="font-bold text-[#E5484D]">
                    Hacker: {h.hackerCount}/10
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 thẻ "Ngộ ra" chạm để lật xem đáp án */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#6B6485] block">
              💡 3 điều ngộ ra (chạm thẻ để xem giải thích)
            </span>

            {/* Thẻ 1 */}
            <div
              onClick={() => {
                sound.playClick();
                setFlippedCards((p) => ({ ...p, 1: !p[1] }));
              }}
              className="p-3.5 rounded-[14px] border-2 border-[#DDD6FE] bg-white hover:border-[#5B3FD6] cursor-pointer transition-all space-y-1 shadow-sticker-sm"
            >
              <div className="font-display font-bold text-xs sm:text-sm text-[#5B3FD6] flex items-center justify-between">
                <span>1. Vì sao 5/10 node chưa đủ?</span>
                <span className="text-xs text-[#6B6485]">
                  {flippedCards[1] ? '▲ Đóng' : '▼ Chạm xem'}
                </span>
              </div>
              {flippedCards[1] && (
                <p className="text-xs sm:text-sm text-[#2A2340] pt-1 font-medium leading-relaxed border-t border-[#F0EEF8]">
                  Vì 5/10 = 50%, chưa vượt quá một nửa. Trong blockchain, phải nắm hơn 50% tổng sức mạnh mới lấn át được các node còn lại!
                </p>
              )}
            </div>

            {/* Thẻ 2 */}
            <div
              onClick={() => {
                sound.playClick();
                setFlippedCards((p) => ({ ...p, 2: !p[2] }));
              }}
              className="p-3.5 rounded-[14px] border-2 border-[#DDD6FE] bg-white hover:border-[#5B3FD6] cursor-pointer transition-all space-y-1 shadow-sticker-sm"
            >
              <div className="font-display font-bold text-xs sm:text-sm text-[#5B3FD6] flex items-center justify-between">
                <span>2. Ở mức Dễ, Hacker thắng chỉ với 3 node; ở đây cần 6. Vì sao?</span>
                <span className="text-xs text-[#6B6485]">
                  {flippedCards[2] ? '▲ Đóng' : '▼ Chạm xem'}
                </span>
              </div>
              {flippedCards[2] && (
                <p className="text-xs sm:text-sm text-[#2A2340] pt-1 font-medium leading-relaxed border-t border-[#F0EEF8]">
                  Ở đây mọi node mạnh như nhau (mỗi node 10%). Điều quyết định luôn là tổng sức mạnh vượt quá 50%.
                </p>
              )}
            </div>

            {/* Thẻ 3 */}
            <div
              onClick={() => {
                sound.playClick();
                setFlippedCards((p) => ({ ...p, 3: !p[3] }));
              }}
              className="p-3.5 rounded-[14px] border-2 border-[#DDD6FE] bg-white hover:border-[#5B3FD6] cursor-pointer transition-all space-y-1 shadow-sticker-sm"
            >
              <div className="font-display font-bold text-xs sm:text-sm text-[#5B3FD6] flex items-center justify-between">
                <span>3. Khi một bên nắm phần lớn mạng, điều gì nguy hiểm?</span>
                <span className="text-xs text-[#6B6485]">
                  {flippedCards[3] ? '▲ Đóng' : '▼ Chạm xem'}
                </span>
              </div>
              {flippedCards[3] && (
                <p className="text-xs sm:text-sm text-[#2A2340] pt-1 font-medium leading-relaxed border-t border-[#F0EEF8]">
                  Họ có thể chặn giao dịch và cố đảo ngược các giao dịch gần đây, nhưng vẫn không lấy được tiền trong ví người khác.
                </p>
              )}
            </div>
          </div>

          {/* Nút hành động cuối */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleSwitchRole}
              fullWidth
              className="sm:w-auto"
            >
              Đổi vai chơi lại
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleFinishHard}
              fullWidth
              className="sm:w-auto"
            >
              Tiếp tục
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
