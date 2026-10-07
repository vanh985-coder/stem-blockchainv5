import React, { useState, useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { LevelProps } from '../../components/game/LessonShell';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { NumberInput } from '../../components/ui/NumberInput';
import { TrangSo } from '../../components/ui/TrangSo';
import { DidYouKnowModal } from '../../components/game/DidYouKnowModal';
import { ReflectionQuestion } from '../../components/game/ReflectionQuestion';
import { ChainStrip, ChainPageData } from '../../components/game/ChainStrip';
import {
  PlayerId,
  Truth,
  Vote,
  settleRound,
  updateBeliefs,
  tiDecide,
  botVote,
  chiCreate,
  makeCheatPage,
  hardStars,
  TiDecisionReason,
  HistoryItem,
  summarizePlayer,
} from './bots';
import { pageCode, buildChain } from '../../lib/chain';
import { explainCheck, Proposal } from './logic';
import { hardStoryCard } from './content';
import { createMulberry32 } from '../../lib/rng';
import { sound } from '../../lib/sound';
import { useProgress } from '../../app/ProgressContext';
import { GAME_CONFIG } from '../../config/gameConfig';
import { formatNumber } from '../../lib/format';

const CFG = GAME_CONFIG.lesson2.hard;

const CHARACTER_NAMES: Record<PlayerId, string> = {
  em: 'Em',
  binh: 'Bình 🐢',
  chi: 'Chi 🐇',
  ti: 'Tí 🦊',
};

const TI_BUBBLES: Record<TiDecisionReason, string> = {
  first: 'Thử lòng mọi người xem sao!',
  ev: 'Hình như mọi người dễ dãi… thử gian xem!',
  gamble: 'Tí tính rồi thấy khó lọt, nhưng cứ liều một lần!',
  honest: 'Tí tính rồi: gian thì dễ mất cọc, thôi làm thật!',
};

export const Hard: React.FC<LevelProps> = ({ onComplete }) => {
  const { progress, setLessonData } = useProgress();
  const reducedMotion = progress.settings.reducedMotion;
  const userName = progress.userName || 'Em';

  const startTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const timersRef = useRef<number[]>([]);

  // PRNG với seed
  const rngRef = useRef<() => number>(() => Math.random());

  // Thẻ 5 (Đặt cọc) modal
  const [isHardStoryOpen, setIsHardStoryOpen] = useState(false);

  // Điểm số và niềm tin
  const [scores, setScores] = useState<Record<PlayerId, number>>({
    em: CFG.startStake,
    binh: CFG.startStake,
    chi: CFG.startStake,
    ti: CFG.startStake,
  });

  const [beliefs, setBeliefs] = useState<Record<'em' | 'binh' | 'chi', [number, number]>>({
    em: [CFG.tiPriors.em[0], CFG.tiPriors.em[1]],
    binh: [CFG.tiPriors.binh[0], CFG.tiPriors.binh[1]],
    chi: [CFG.tiPriors.chi[0], CFG.tiPriors.chi[1]],
  });

  // Sổ chung
  const [genesisCode, setGenesisCode] = useState<number>(10);
  const [ledgerPages, setLedgerPages] = useState<
    (ChainPageData & { isInvalid?: boolean })[]
  >([]);

  // Lượt chơi hiện tại (0..7)
  const [turnIndex, setTurnIndex] = useState<number>(0);

  // Phiếu bầu của lượt hiện tại (ref để tránh render 2 lần trong StrictMode)
  const votesRef = useRef<Partial<Record<PlayerId, Vote>>>({});

  // Lịch sử các vòng để hiển thị tóm tắt cuối game
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [emAgreedCheat, setEmAgreedCheat] = useState<boolean>(false);

  // Trạng thái của lượt chơi hiện tại
  const [turnState, setTurnState] = useState<{
    creator: PlayerId;
    content: number;
    truth: Truth;
    proposal: Proposal;
    tiReason?: TiDecisionReason;
    stage: 'creator-choice' | 'voting' | 'revealed' | 'skipped';
    votes: Partial<Record<PlayerId, Vote>>;
    botThinking: Partial<Record<PlayerId, boolean>>;
    deltas?: Record<PlayerId, number>;
  } | null>(null);

  // Modal xác nhận ghi gian cho Em
  const [showCheatConfirm, setShowCheatConfirm] = useState(false);

  // Nhập mã cho Em khi ghi trang thật
  const [emInputCode, setEmInputCode] = useState<number | null>(null);
  const [emInputAttempts, setEmInputAttempts] = useState<number>(0);
  const [emInputError, setEmInputError] = useState<string | null>(null);

  // Bong bóng suy nghĩ của Tí
  const [tiThought, setTiThought] = useState<string | null>(null);

  // Màn kết thúc
  const [gameFinished, setGameFinished] = useState(false);
  const [reflectionAnswered, setReflectionAnswered] = useState(false);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const addTimer = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      if (isMountedRef.current) fn();
    }, ms);
    timersRef.current.push(t);
  };

  // Khởi tạo màn chơi lần đầu
  useEffect(() => {
    const seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    rngRef.current = createMulberry32(seed);

    const gen = 10 + Math.floor(rngRef.current() * 80);
    const c1 = 1 + Math.floor(rngRef.current() * 99);
    const c2 = 1 + Math.floor(rngRef.current() * 99);
    const codes = buildChain(gen, [c1, c2]);

    setGenesisCode(gen);
    setLedgerPages([
      { content: c1, code: codes[0], isInvalid: false },
      { content: c2, code: codes[1], isInvalid: false },
    ]);

    // Kiểm tra cờ hardCardSeen trong progress
    const lessonData = (progress.lessonData?.lesson2 as Record<string, unknown>) || {};
    if (!lessonData.hardCardSeen) {
      setIsHardStoryOpen(true);
      setLessonData('lesson2', { ...lessonData, hardCardSeen: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lấy mã trang cuối hiện tại của sổ chung
  const getLastLedgerCode = (): number => {
    if (ledgerPages.length === 0) return genesisCode;
    const last = ledgerPages[ledgerPages.length - 1];
    return last.code ?? genesisCode;
  };

  // Bắt đầu một lượt chơi
  const startTurn = (index: number) => {
    votesRef.current = {};
    if (index >= CFG.order.length) {
      setGameFinished(true);
      setTurnState(null);
      return;
    }

    const creator = CFG.order[index] as PlayerId;
    const lastCode = getLastLedgerCode();
    const content = 1 + Math.floor(rngRef.current() * 99);

    // Kiểm tra cọc đủ 30 điểm không
    if (scores[creator] < CFG.deposit) {
      setHistory((h) => [...h, { creator, skipped: true }]);
      setTurnState({
        creator,
        content,
        truth: 'valid',
        proposal: { prevCode: lastCode, content, code: pageCode(lastCode, content) },
        stage: 'skipped',
        votes: {},
        botThinking: {},
      });
      return;
    }

    if (creator === 'em') {
      setEmInputCode(null);
      setEmInputAttempts(0);
      setEmInputError(null);
      setTurnState({
        creator,
        content,
        truth: 'valid',
        proposal: { prevCode: lastCode, content, code: 0 },
        stage: 'creator-choice',
        votes: {},
        botThinking: {},
      });
    } else {
      // Bot tạo trang
      let truth: Truth = 'valid';
      let proposal: Proposal;
      let reason: TiDecisionReason | undefined = undefined;

      if (creator === 'binh') {
        truth = 'valid';
        proposal = { prevCode: lastCode, content, code: pageCode(lastCode, content) };
      } else if (creator === 'chi') {
        const res = chiCreate(pageCode(lastCode, content), rngRef.current);
        truth = res.truth;
        proposal = { prevCode: lastCode, content, code: res.code };
      } else {
        // creator === 'ti'
        const isFirstTurn = index === 2; // Tí tạo trang lần đầu ở index 2
        const decision = tiDecide({ isFirstTurn, beliefs, rng: rngRef.current, cfg: CFG });
        reason = decision.reason;
        if (decision.cheat) {
          truth = 'cheat';
          proposal = makeCheatPage(lastCode, content, rngRef.current, 'Tí');
        } else {
          truth = 'valid';
          proposal = { prevCode: lastCode, content, code: pageCode(lastCode, content) };
        }
      }

      setTurnState({
        creator,
        content,
        truth,
        proposal,
        tiReason: reason,
        stage: 'voting',
        votes: {},
        botThinking: {},
      });
    }
  };

  // Tự khởi động lượt đầu khi sổ chung đã sẵn sàng
  useEffect(() => {
    if (ledgerPages.length > 0 && turnState === null && !gameFinished) {
      startTurn(0);
    }
  }, [ledgerPages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Em chọn ghi trang thật
  const handleEmSubmitHonest = () => {
    if (!turnState || turnState.creator !== 'em') return;
    const lastCode = getLastLedgerCode();
    const correct = pageCode(lastCode, turnState.content);

    if (emInputCode === null || isNaN(emInputCode) || emInputCode < 0 || emInputCode > 99) {
      setEmInputError('Mã trang là số từ 0 đến 99');
      return;
    }

    if (emInputCode !== correct) {
      const attempts = emInputAttempts + 1;
      setEmInputAttempts(attempts);
      sound.playWrong();
      if (attempts >= 2) {
        setEmInputError(
          `Mã này chưa đúng, em kiểm tra lại nhé. Gợi ý: (${lastCode} × 2 + ${turnState.content}) mod 100 = ?`
        );
      } else {
        setEmInputError('Mã này chưa đúng, em kiểm tra lại nhé');
      }
      return;
    }

    // Nhập đúng
    sound.playCorrect();
    setEmInputError(null);
    const proposal: Proposal = {
      prevCode: lastCode,
      content: turnState.content,
      code: correct,
    };

    setTurnState((prev) =>
      prev
        ? {
            ...prev,
            truth: 'valid',
            proposal,
            stage: 'voting',
            votes: {},
            botThinking: {},
          }
        : null
    );

    // Bắt đầu bot bỏ phiếu
    runBotVotesForEm(proposal, 'valid');
  };

  // Em xác nhận ghi trang gian
  const handleConfirmCheat = () => {
    setShowCheatConfirm(false);
    if (!turnState || turnState.creator !== 'em') return;

    sound.playClick();
    const lastCode = getLastLedgerCode();
    const proposal = makeCheatPage(lastCode, turnState.content, rngRef.current, userName);

    setTurnState((prev) =>
      prev
        ? {
            ...prev,
            truth: 'cheat',
            proposal,
            stage: 'voting',
            votes: {},
            botThinking: {},
          }
        : null
    );

    runBotVotesForEm(proposal, 'cheat');
  };

  // 3 bot bỏ phiếu cho đề xuất của Em
  const runBotVotesForEm = (proposal: Proposal, truth: Truth) => {
    const bots: ('binh' | 'ti' | 'chi')[] = ['binh', 'ti', 'chi'];

    // Lần lượt từng bot suy nghĩ và bỏ phiếu
    bots.forEach((bot, idx) => {
      const thinkMs = 400 + Math.random() * 500;
      addTimer(() => {
        setTurnState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            botThinking: { ...prev.botThinking, [bot]: true },
          };
        });

        addTimer(() => {
          const vote = botVote(bot, truth, rngRef.current);
          votesRef.current[bot] = vote;

          setTurnState((prev) => {
            if (!prev) return null;
            const nextVotes = { ...prev.votes, [bot]: vote };
            return {
              ...prev,
              botThinking: { ...prev.botThinking, [bot]: false },
              votes: nextVotes,
            };
          });

          // Khi bot cuối cùng bỏ phiếu xong
          if (idx === bots.length - 1) {
            addTimer(() => {
              reveal('em', truth, proposal);
            }, 300);
          }
        }, thinkMs);
      }, idx * 600);
    });
  };

  // Em bỏ phiếu cho đề xuất của Bot
  const handleEmVote = (vote: Vote) => {
    if (!turnState || turnState.creator === 'em' || turnState.stage !== 'voting') return;
    if (turnState.votes.em) return; // Đã vote rồi

    sound.playClick();
    if (vote === 'agree' && turnState.truth === 'cheat') {
      setEmAgreedCheat(true);
    }

    votesRef.current.em = vote;

    setTurnState((prev) =>
      prev
        ? {
            ...prev,
            votes: { ...prev.votes, em: vote },
          }
        : null
    );

    const creator = turnState.creator;
    const truth = turnState.truth;
    const proposal = turnState.proposal;
    const tiReason = turnState.tiReason;

    // Sau khi em bỏ phiếu, các bot còn lại bắt đầu suy nghĩ và bỏ phiếu
    const otherBots = (['binh', 'chi', 'ti'] as const).filter((b) => b !== creator);

    otherBots.forEach((bot, idx) => {
      const thinkMs = 400 + Math.random() * 500;
      addTimer(() => {
        setTurnState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            botThinking: { ...prev.botThinking, [bot]: true },
          };
        });

        addTimer(() => {
          const bVote = botVote(bot, truth, rngRef.current);
          votesRef.current[bot] = bVote;

          setTurnState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              botThinking: { ...prev.botThinking, [bot]: false },
              votes: { ...prev.votes, [bot]: bVote },
            };
          });

          if (idx === otherBots.length - 1) {
            addTimer(() => {
              reveal(creator, truth, proposal, tiReason);
            }, 300);
          }
        }, thinkMs);
      }, idx * 600);
    });
  };

  // Lật mở kết quả lượt chơi
  function reveal(
    creator: PlayerId,
    truth: Truth,
    proposal: Proposal,
    tiReason?: TiDecisionReason
  ) {
    const votes = { ...votesRef.current };
    const res = settleRound(creator, truth, votes, CFG);

    setScores((s) => ({
      em: s.em + res.deltas.em,
      binh: s.binh + res.deltas.binh,
      chi: s.chi + res.deltas.chi,
      ti: s.ti + res.deltas.ti,
    }));

    if (truth === 'cheat') {
      setBeliefs((b) => updateBeliefs(b, votes));
    }

    if (res.accepted) {
      setLedgerPages((l) => [
        ...l,
        {
          content: proposal.content,
          code: proposal.code,
          isInvalid: truth !== 'valid',
        },
      ]);
    }

    setHistory((h) => [
      ...h,
      {
        creator,
        truth,
        accepted: res.accepted,
        deltas: res.deltas,
      },
    ]);

    if (res.accepted) sound.playCorrect();
    else sound.playWrong();

    setTiThought(creator === 'ti' && tiReason ? TI_BUBBLES[tiReason] : null);

    setTurnState((r) => (r ? { ...r, stage: 'revealed', deltas: res.deltas } : null));
  }

  // Sang lượt tiếp theo
  const handleNextTurn = () => {
    setTiThought(null);
    const nextTurn = turnIndex + 1;
    setTurnIndex(nextTurn);
    startTurn(nextTurn);
  };

  // Hoàn thành toàn bài sau khi trả lời câu hỏi suy ngẫm
  const handleFinishLevel = () => {
    const timeMs = Date.now() - startTimeRef.current;
    const stars = hardStars(scores, emAgreedCheat);
    onComplete({
      stars,
      timeMs,
      learned:
        'Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi. Gian lận thì lỗ hơn làm thật.',
    });
  };

  const currentCreator = turnState ? turnState.creator : (CFG.order[turnIndex] as PlayerId);
  const lastLedgerCode = getLastLedgerCode();

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col gap-5">
        {/* 1. Header: Vòng chơi, nút Em có biết? và Bảng điểm 4 Avatar trên một hàng */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-[#E3E0EE] shadow-sticker-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-xs sm:text-sm text-[#5B3FD6] bg-[#5B3FD6]/10 px-3 py-1 rounded-full">
                Lượt {Math.min(turnIndex + 1, 8)} / 8
              </span>
              <span className="text-xs text-[#6B6485] hidden sm:inline">
                Proof of Stake: Đặt cọc 30 điểm để tạo trang
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHardStoryOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[#5B3FD6]/10 hover:bg-[#5B3FD6]/20 text-[#5B3FD6] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>💡</span> Em có biết?
            </button>
          </div>

          {/* Bảng điểm 4 Avatar trên một hàng (vừa màn 360px) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 pt-2 border-t border-[#E3E0EE]">
            {(['em', 'binh', 'chi', 'ti'] as const).map((playerId) => {
              const delta = turnState?.deltas ? turnState.deltas[playerId] : undefined;
              const isCreator = currentCreator === playerId;

              return (
                <div
                  key={playerId}
                  className={`
                    relative flex flex-col items-center p-1.5 sm:p-2.5 rounded-xl border-2 transition-all
                    ${
                      isCreator
                        ? 'border-[#5B3FD6] bg-[#5B3FD6]/5 shadow-sticker-sm ring-2 ring-[#5B3FD6]/20'
                        : 'border-[#E3E0EE] bg-white'
                    }
                  `}
                >
                  <Avatar
                    character={playerId}
                    size="sm"
                    customName={playerId === 'em' ? userName : undefined}
                  />
                  <div className="font-display font-black text-xs sm:text-sm text-[#2A2340] mt-1 truncate max-w-full">
                    {playerId === 'em' ? userName : CHARACTER_NAMES[playerId].split(' ')[0]}
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#5B3FD6]">
                    {formatNumber(scores[playerId])} đ
                  </div>

                  {/* Nhãn người tạo trang */}
                  {isCreator && (
                    <span className="text-[9px] font-bold text-white bg-[#5B3FD6] px-1.5 py-0.2 rounded-full mt-0.5 whitespace-nowrap">
                      Tạo trang
                    </span>
                  )}

                  {/* Hiệu ứng điểm bay lơ lửng khi có delta */}
                  {delta !== undefined && delta !== 0 && (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: -18, scale: 1.1 }}
                      transition={{ duration: reducedMotion ? 0.1 : 0.4 }}
                      className={`
                        absolute -top-3 px-1.5 py-0.5 rounded-full font-black text-xs shadow-sticker-sm pointer-events-none z-20
                        ${
                          delta > 0
                            ? 'bg-[#1FAF5A] text-white'
                            : 'bg-[#E5484D] text-white'
                        }
                      `}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </m.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Sổ chung (ChainStrip): Bìa + 2 trang ban đầu + các trang đã được duyệt */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-[#E3E0EE] shadow-sticker-sm">
          <div className="flex items-center justify-between mb-1 px-1">
            <h2 className="font-display font-black text-sm text-[#2A2340] flex items-center gap-1.5">
              <span>📚</span> Sổ chung của cả mạng lưới
            </h2>
            <span className="text-xs text-[#6B6485]">
              Mã trang cuối: <strong className="text-[#5B3FD6]">{lastLedgerCode}</strong>
            </span>
          </div>

          <ChainStrip
            genesisCode={genesisCode}
            pages={ledgerPages}
            firstInvalidIndex={-1}
            activePageIndex={ledgerPages.length - 1}
            isPageConfirmed={() => true}
            isPageInvalid={(idx) => Boolean(ledgerPages[idx]?.isInvalid)}
            getPageInvalidBadgeText={(idx) =>
              ledgerPages[idx]?.isInvalid ? 'Trang sai đã lọt vào sổ chung' : undefined
            }
          />
        </div>

        {/* 3. Khu vực chơi chính của lượt hiện tại */}
        {!gameFinished && turnState && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#5B3FD6]/30 shadow-sticker flex flex-col gap-4">
            {/* Lượt bị bỏ qua do không đủ cọc */}
            {turnState.stage === 'skipped' ? (
              <div className="text-center py-6 flex flex-col items-center gap-3">
                <Avatar character={turnState.creator} size="md" showName />
                <div className="font-display font-black text-lg text-[#E5484D]">
                  Không đủ điểm cọc để tạo trang!
                </div>
                <p className="text-sm text-[#6B6485] max-w-md">
                  {CHARACTER_NAMES[turnState.creator]} chỉ còn {scores[turnState.creator]} điểm (cần
                  tối thiểu 30 điểm cọc). Lượt này được bỏ qua.
                </p>
                <Button variant="primary" size="md" onClick={handleNextTurn} className="mt-2">
                  Sang lượt tiếp theo →
                </Button>
              </div>
            ) : turnState.creator === 'em' ? (
              /* LƯỢT EM TẠO TRANG */
              <div>
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#E3E0EE]">
                  <Avatar character="em" size="sm" />
                  <div>
                    <span className="text-xs font-bold text-[#5B3FD6]">Lượt của em</span>
                    <h3 className="font-display font-black text-base text-[#2A2340]">
                      Em là người tạo trang số {ledgerPages.length + 1}!
                    </h3>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F5FB] border border-[#E3E0EE] text-xs sm:text-sm mb-4 space-y-1">
                  <div>
                    Mã trang cuối của sổ chung: <strong className="text-base text-[#5B3FD6]">{lastLedgerCode}</strong>
                  </div>
                  <div>
                    Nội dung được giao: <strong className="text-base text-[#2A2340]">{turnState.content}</strong>
                  </div>
                </div>

                {turnState.stage === 'creator-choice' && (
                  <div className="flex flex-col gap-4">
                    <div className="text-sm font-semibold text-[#2A2340]">
                      Em muốn ghi trang này như thế nào?
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Lựa chọn 1: Ghi trang thật */}
                      <div className="p-4 rounded-xl border-2 border-[#1FAF5A] bg-[#1FAF5A]/5 flex flex-col justify-between gap-3">
                        <div>
                          <div className="font-display font-black text-base text-[#1FAF5A] mb-1">
                            Ghi trang thật
                          </div>
                          <p className="text-xs text-[#6B6485] leading-relaxed">
                            Tự tính đúng mã trang. Nếu được duyệt: nhận lại 30 điểm cọc + thưởng 10 điểm (+10).
                          </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[#1FAF5A]/20">
                          <label className="text-xs font-bold text-[#2A2340] block">
                            Mã trang mới
                          </label>
                          <div className="flex items-center gap-2">
                            <NumberInput
                              value={emInputCode}
                              onChange={setEmInputCode}
                              min={0}
                              max={99}
                              error={emInputError || undefined}
                              placeholder="0–99"
                              className="w-32"
                            />
                            <Button variant="primary" size="md" onClick={handleEmSubmitHonest}>
                              Gửi trang
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Lựa chọn 2: Ghi trang gian */}
                      <div className="p-4 rounded-xl border-2 border-[#E5484D] bg-[#E5484D]/5 flex flex-col justify-between gap-3">
                        <div>
                          <div className="font-display font-black text-base text-[#E5484D] mb-1">
                            Ghi trang gian (tự cộng 40 điểm)
                          </div>
                          <p className="text-xs text-[#6B6485] leading-relaxed">
                            Cố tình ghi sai để kiếm lời. Nếu lọt: +40 điểm. Nếu bị phát hiện: mất trắng 30 điểm cọc (-30).
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="md"
                          onClick={() => setShowCheatConfirm(true)}
                          className="w-full"
                        >
                          Ghi trang gian
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Khu vực bot đang bỏ phiếu cho trang của Em */}
                {(turnState.stage === 'voting' || turnState.stage === 'revealed') && (
                  <div className="mt-4 pt-4 border-t border-[#E3E0EE]">
                    <div className="text-xs font-bold text-[#6B6485] mb-3">
                      Các node khác đang bỏ phiếu cho trang của em
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(['binh', 'ti', 'chi'] as const).map((bot) => {
                        const isThinking = turnState.botThinking[bot];
                        const vote = turnState.votes[bot];

                        return (
                          <div
                            key={bot}
                            className="p-3 rounded-xl border border-[#E3E0EE] bg-[#F6F5FB] flex flex-col items-center gap-1.5"
                          >
                            <Avatar character={bot} size="sm" showName />
                            <div className="h-6 flex items-center justify-center">
                              {isThinking ? (
                                <span className="text-xs text-[#6B6485] animate-pulse">
                                  Đang tính...
                                </span>
                              ) : vote ? (
                                <span
                                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                    vote === 'agree'
                                      ? 'bg-[#1FAF5A]/10 text-[#1FAF5A]'
                                      : 'bg-[#E5484D]/10 text-[#E5484D]'
                                  }`}
                                >
                                  {vote === 'agree' ? '✓ Đồng ý' : '✗ Từ chối'}
                                </span>
                              ) : (
                                <span className="text-xs text-[#8C827A]">Chờ lượt...</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LƯỢT BOT TẠO TRANG */
              <div>
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#E3E0EE]">
                  <Avatar character={turnState.creator} size="sm" />
                  <div>
                    <span className="text-xs font-bold text-[#5B3FD6]">
                      Lượt của {CHARACTER_NAMES[turnState.creator]}
                    </span>
                    <h3 className="font-display font-black text-base text-[#2A2340]">
                      {CHARACTER_NAMES[turnState.creator]} vừa đề xuất một trang mới!
                    </h3>
                  </div>
                </div>

                {/* Thẻ đề xuất của bot */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 my-2">
                  <div className="shrink-0">
                    <TrangSo
                      size="sm"
                      pageNumber={ledgerPages.length + 1}
                      prevCode={turnState.proposal.prevCode}
                      content={turnState.proposal.content}
                      pageCode={turnState.proposal.code}
                      isConfirmed={false}
                    />
                  </div>

                  <div className="flex flex-col gap-3 max-w-sm w-full">
                    <div className="p-3 rounded-xl bg-[#F6F5FB] border border-[#E3E0EE] text-xs text-[#2A2340] space-y-1">
                      <div>
                        Mã trang trước (theo sổ người gửi): <strong>{turnState.proposal.prevCode}</strong>
                      </div>
                      <div>
                        Nội dung: <strong>{turnState.proposal.content}</strong>
                      </div>
                      <div>
                        Mã trang: <strong>{turnState.proposal.code}</strong>
                      </div>
                      <div className="pt-1 mt-1 border-t border-[#E3E0EE] text-[#5B3FD6]">
                        Mã trang cuối trong sổ của em: <strong>{lastLedgerCode}</strong>
                      </div>
                      {turnState.proposal.note && (
                        <div className="text-[#E5484D] font-bold">
                          Ghi chú: {turnState.proposal.note}
                        </div>
                      )}
                    </div>

                    {/* Em bỏ phiếu trước */}
                    {turnState.stage === 'voting' && !turnState.votes.em && (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-[#2A2340]">
                          Em bỏ phiếu cho trang này:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => handleEmVote('agree')}
                            className="shadow-sticker"
                          >
                            ✓ Đồng ý
                          </Button>
                          <Button
                            variant="danger"
                            size="md"
                            onClick={() => handleEmVote('reject')}
                            className="shadow-sticker"
                          >
                            ✗ Từ chối
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Các bot bỏ phiếu sau khi Em đã bỏ phiếu */}
                {turnState.votes.em && (
                  <div className="mt-4 pt-4 border-t border-[#E3E0EE]">
                    <div className="text-xs font-bold text-[#6B6485] mb-3">Kết quả bỏ phiếu</div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {(['em', 'binh', 'chi', 'ti'] as const)
                        .filter((p) => p !== turnState.creator)
                        .map((voter) => {
                          const isThinking = turnState.botThinking[voter];
                          const vote = turnState.votes[voter];

                          return (
                            <div
                              key={voter}
                              className="p-3 rounded-xl border border-[#E3E0EE] bg-[#F6F5FB] flex flex-col items-center gap-1.5"
                            >
                              <Avatar
                                character={voter}
                                size="sm"
                                customName={voter === 'em' ? userName : undefined}
                                showName
                              />
                              <div className="h-6 flex items-center justify-center">
                                {isThinking ? (
                                  <span className="text-xs text-[#6B6485] animate-pulse">
                                    Đang tính...
                                  </span>
                                ) : vote ? (
                                  <span
                                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                      vote === 'agree'
                                        ? 'bg-[#1FAF5A]/10 text-[#1FAF5A]'
                                        : 'bg-[#E5484D]/10 text-[#E5484D]'
                                    }`}
                                  >
                                    {vote === 'agree' ? '✓ Đồng ý' : '✗ Từ chối'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#8C827A]">Chờ...</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PHẦN LẬT MỞ SỰ THẬT */}
            {turnState.stage === 'revealed' && (
              <div className="mt-4 p-4 rounded-xl bg-[#F6F5FB] border-2 border-[#5B3FD6]/30 animate-in fade-in flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#2A2340]">Sự thật:</span>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        turnState.truth === 'valid'
                          ? 'bg-[#1FAF5A]/10 text-[#1FAF5A]'
                          : turnState.truth === 'miscalc'
                            ? 'bg-[#F59E0B]/10 text-[#D97706]'
                            : 'bg-[#E5484D]/10 text-[#E5484D]'
                      }`}
                    >
                      {turnState.truth === 'valid'
                        ? '✓ Trang thật'
                        : turnState.truth === 'miscalc'
                          ? '⚠️ Trang tính nhầm'
                          : turnState.proposal.type === 'A'
                            ? '✗ Trang gian (mã trang trước không khớp)'
                            : '✗ Trang gian (mã trang bịa)'}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-[#6B6485]">
                    {explainCheck(lastLedgerCode, turnState.proposal)}
                  </span>
                </div>

                {/* Bong bóng suy nghĩ của Tí */}
                {tiThought && (
                  <div className="p-3 rounded-lg bg-[#FFF0ED] border border-[#E5484D]/30 flex items-center gap-2 text-xs text-[#E5484D]">
                    <span className="text-base">🦊</span>
                    <span>
                      <strong>Tí nghĩ thầm:</strong> &ldquo;{tiThought}&rdquo;
                    </span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="md" onClick={handleNextTurn}>
                    {turnIndex + 1 < 8 ? 'Lượt tiếp theo →' : 'Xem tổng kết ván đấu →'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Màn kết thúc ván đấu & Câu hỏi suy ngẫm */}
        {gameFinished && (
          <div className="bg-white rounded-2xl p-5 sm:p-7 border-2 border-[#5B3FD6] shadow-sticker flex flex-col gap-6 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#5B3FD6] mb-1">
                Kết thúc 8 lượt chơi!
              </h2>
              <p className="text-sm text-[#6B6485]">
                Bảng xếp hạng điểm số cọc cuối cùng của các thành viên trong mạng lưới:
              </p>
            </div>

            {/* Bảng xếp hạng 4 người */}
            <div className="space-y-2">
              {(['em', 'binh', 'chi', 'ti'] as PlayerId[])
                .slice()
                .sort((a, b) => scores[b] - scores[a])
                .map((p, rank) => {
                  const isEm = p === 'em';
                  return (
                    <div
                      key={p}
                      className={`
                        flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-all
                        ${
                          isEm
                            ? 'border-[#5B3FD6] bg-[#5B3FD6]/10 shadow-sticker-sm'
                            : 'border-[#E3E0EE] bg-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-display font-black text-base text-[#6B6485] w-6">
                          #{rank + 1}
                        </span>
                        <Avatar
                          character={p}
                          size="sm"
                          customName={isEm ? userName : undefined}
                          showName
                        />
                      </div>
                      <div className="font-display font-black text-lg sm:text-xl text-[#5B3FD6]">
                        {formatNumber(scores[p])} điểm
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Dòng tóm tắt từng người lấy từ lịch sử */}
            <div className="p-4 rounded-xl bg-[#F6F5FB] border border-[#E3E0EE] text-xs sm:text-sm text-[#2A2340] space-y-1.5">
              <div className="font-bold text-[#5B3FD6] mb-1">📋 Tóm tắt ván đấu:</div>
              <div>• {summarizePlayer(history, 'em', userName)}</div>
              <div>• {summarizePlayer(history, 'binh', 'Bình')}</div>
              <div>• {summarizePlayer(history, 'chi', 'Chi')}</div>
              <div>• {summarizePlayer(history, 'ti', 'Tí')}</div>
            </div>

            {/* Hai bài học cốt lõi */}
            <div className="p-4 rounded-xl bg-[#1FAF5A]/10 border border-[#1FAF5A]/30 text-xs sm:text-sm text-[#1FAF5A] font-semibold space-y-1">
              <div>✨ Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi.</div>
              <div>✨ Gian lận thì lỗ hơn làm thật.</div>
            </div>

            {/* Câu hỏi suy ngẫm */}
            <ReflectionQuestion
              question="Vì sao càng về sau Tí càng ít gian lận?"
              options={[
                'Vì Tí tính ra gian thì dễ mất cọc, làm thật mới có lời.',
                'Vì Tí hết điểm cọc.',
                'Vì luật cấm Tí gian lận.',
              ]}
              explanation="Tí nhớ ai hay từ chối trang gian. Khi thấy trang gian khó lọt, Tí tính ra gian thì dễ mất 30 điểm cọc, còn làm thật chắc chắn được +10, nên Tí chọn làm thật."
              onAnswered={() => setReflectionAnswered(true)}
            />

            {reflectionAnswered && (
              <div className="flex justify-center pt-2">
                <Button variant="primary" size="lg" onClick={handleFinishLevel} className="shadow-sticker">
                  Hoàn thành thử thách
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal xác nhận ghi gian cho Em */}
        <Modal
          isOpen={showCheatConfirm}
          onClose={() => setShowCheatConfirm(false)}
          title="Ghi trang gian?"
          maxWidth="sm"
        >
          <div className="text-xs sm:text-sm text-[#6B6485] mb-4 leading-relaxed">
            Nếu bị phát hiện, em sẽ mất ngay <strong className="text-[#E5484D]">30 điểm cọc</strong>. Em có chắc chắn muốn mạo hiểm không?
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowCheatConfirm(false)}>
              Thôi, ghi trang thật
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCheat}>
              Vẫn ghi gian
            </Button>
          </div>
        </Modal>

        {/* Modal Thẻ 5: Đặt cọc (Proof of Stake) */}
        <DidYouKnowModal
          isOpen={isHardStoryOpen}
          onClose={() => setIsHardStoryOpen(false)}
          cards={[hardStoryCard]}
          lessonTitle="Em có biết? — Đặt cọc (Proof of Stake)"
        />
      </div>
    </LazyMotion>
  );
};
