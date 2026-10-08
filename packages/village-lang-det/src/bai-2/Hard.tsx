import { useEffect, useRef, useState } from 'react';
import {
  Button,
  ChainStrip,
  NumberInput,
  Panel,
  ReflectionQuestion,
  TrangSo,
  fmt,
  sound,
  useAuth,
  type ChainPageData,
  type StationResult,
} from '@so-chung/core';
import { bai2Texts } from '@so-chung/core/content/lessons/bai-2';
import { GAME_CONFIG } from '@so-chung/core/config/gameConfig';
import { buildChain, pageCode } from '@so-chung/core/lib/chain';
import { formatNumber } from '@so-chung/core/lib/format';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import {
  botVote,
  chiCreate,
  hardStars,
  makeCheatPage,
  settleRound,
  summarizePlayer,
  tiDecide,
  updateBeliefs,
  type HistoryItem,
  type PlayerId,
  type TiDecisionReason,
  type Truth,
  type Vote,
} from '@so-chung/core/lessons/bai-2/bots';
import { explainCheck, type Proposal } from '@so-chung/core/lessons/bai-2/logic';
import { Chan, tenGiua, tenNguoiChoi, type BotId } from './nguoi';

const T = bai2Texts.kho;
const CFG = GAME_CONFIG.lesson2.hard;
const PLAYERS: readonly PlayerId[] = ['em', 'binh', 'chi', 'ti'];
const LAST_TURN = CFG.order.length;

type TurnStage = 'creator-choice' | 'voting' | 'revealed' | 'skipped';

interface TurnState {
  creator: PlayerId;
  /** Số trang đang được đề xuất (cố định trong cả lượt, dù trang được ghi vào sổ rồi) */
  pageNo: number;
  content: number;
  truth: Truth;
  proposal: Proposal;
  tiReason?: TiDecisionReason;
  stage: TurnStage;
  votes: Partial<Record<PlayerId, Vote>>;
  botThinking: Partial<Record<PlayerId, boolean>>;
  deltas?: Record<PlayerId, number>;
}

type LedgerPage = ChainPageData & { isInvalid?: boolean };

/** Ô một phiếu bầu: "Đang tính...", "✓ Đồng ý", "✗ Từ chối" hoặc chữ chờ */
function VoteChip({ id, name, thinking, vote, waitText }: { id: PlayerId; name: string; thinking?: boolean; vote?: Vote; waitText: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-nau-go/40 bg-giay/80 p-2 sm:p-3">
      <Chan id={id} size={44} />
      <div className="font-display text-sm font-extrabold">{name}</div>
      <div className="flex h-6 items-center justify-center">
        {thinking ? (
          <span className="animate-pulse text-sm text-nau-go-dam">{T.dangTinh}</span>
        ) : vote ? (
          <span
            className={`rounded-nut px-2 py-0.5 text-sm font-extrabold ${
              vote === 'agree' ? 'bg-xanh-la/15 text-xanh-la-dam' : 'bg-do-son/15 text-do-son-dam'
            }`}
          >
            {vote === 'agree' ? T.daDongY : T.daTuChoi}
          </span>
        ) : (
          <span className="text-sm text-nau-go-dam">{waitText}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Trạm Khó: "Đặt cọc để được ghi sổ" (8 lượt, chơi với 3 bot). Giữ nguyên luật điểm, hành vi bot và cách chấm sao của giai đoạn 1.
 * Hai luật quan trọng: phiếu của bot chỉ hiện SAU khi em đã bỏ phiếu; {phanDien} luôn gian ở lượt tạo trang đầu tiên.
 */
export function Hard({ onComplete }: { onComplete: (r: StationResult) => void }) {
  const { profile } = useAuth();
  const playerName = profile?.display_name;
  const nameOf = (id: PlayerId) => tenNguoiChoi(id, playerName);

  const startTime = useRef(performance.now()).current;
  const mounted = useRef(true);
  const timers = useRef<number[]>([]);

  // Đề của lượt chơi này: bộ sinh số ngẫu nhiên, mã bìa và 2 trang đầu của sổ chung
  const [initial] = useState(() => {
    const rng = createMulberry32((Date.now() ^ (Math.random() * 0x100000000)) >>> 0);
    const genesis = 10 + Math.floor(rng() * 80);
    const c1 = 1 + Math.floor(rng() * 99);
    const c2 = 1 + Math.floor(rng() * 99);
    const codes = buildChain(genesis, [c1, c2]);
    const pages: LedgerPage[] = [
      { content: c1, code: codes[0], isInvalid: false },
      { content: c2, code: codes[1], isInvalid: false },
    ];
    return { rng, genesis, pages };
  });
  const rngRef = useRef(initial.rng);
  const genesisCode = initial.genesis;

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
  const [ledgerPages, setLedgerPages] = useState<LedgerPage[]>(initial.pages);
  const [turnIndex, setTurnIndex] = useState(0);
  // Phiếu của lượt hiện tại (ref để các hàm hẹn giờ luôn đọc bản mới nhất)
  const votesRef = useRef<Partial<Record<PlayerId, Vote>>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [emAgreedCheat, setEmAgreedCheat] = useState(false);
  const [turnState, setTurnState] = useState<TurnState | null>(null);
  const [showCheatConfirm, setShowCheatConfirm] = useState(false);
  const [emInputCode, setEmInputCode] = useState<number | null>(null);
  const [emInputAttempts, setEmInputAttempts] = useState(0);
  const [emInputError, setEmInputError] = useState<string | null>(null);
  const [tiThought, setTiThought] = useState<string | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [reflectionAnswered, setReflectionAnswered] = useState(false);

  // Rời trạm thì hủy mọi hẹn giờ của bot
  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      pending.forEach((t) => clearTimeout(t));
    };
  }, []);

  const addTimer = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      if (mounted.current) fn();
    }, ms);
    timers.current.push(t);
  };

  const thinkMs = () => CFG.botThinkMs[0] + Math.random() * (CFG.botThinkMs[1] - CFG.botThinkMs[0]);

  const lastLedgerCode = ledgerPages.length === 0 ? genesisCode : (ledgerPages[ledgerPages.length - 1].code ?? genesisCode);

  /** Bắt đầu một lượt chơi */
  const startTurn = (index: number) => {
    votesRef.current = {};
    if (index >= LAST_TURN) {
      setGameFinished(true);
      setTurnState(null);
      return;
    }

    const creator = CFG.order[index] as PlayerId;
    const lastCode = lastLedgerCode;
    const content = 1 + Math.floor(rngRef.current() * 99);
    const pageNo = ledgerPages.length + 1;

    // Không đủ 30 điểm cọc thì bỏ lượt
    if (scores[creator] < CFG.deposit) {
      setHistory((h) => [...h, { creator, skipped: true }]);
      setTurnState({
        creator,
        pageNo,
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
        pageNo,
        content,
        truth: 'valid',
        proposal: { prevCode: lastCode, content, code: 0 },
        stage: 'creator-choice',
        votes: {},
        botThinking: {},
      });
      return;
    }

    // Bot tạo trang
    let truth: Truth = 'valid';
    let proposal: Proposal;
    let reason: TiDecisionReason | undefined;

    if (creator === 'binh') {
      proposal = { prevCode: lastCode, content, code: pageCode(lastCode, content) };
    } else if (creator === 'chi') {
      const res = chiCreate(pageCode(lastCode, content), rngRef.current);
      truth = res.truth;
      proposal = { prevCode: lastCode, content, code: res.code };
    } else {
      // {phanDien}: lượt tạo trang đầu tiên luôn gian, các lượt sau tự tính kỳ vọng
      const isFirstTurn = index === CFG.order.indexOf('ti');
      const decision = tiDecide({ isFirstTurn, beliefs, rng: rngRef.current, cfg: CFG });
      reason = decision.reason;
      if (decision.cheat) {
        truth = 'cheat';
        proposal = makeCheatPage(lastCode, content, rngRef.current, tenGiua('ti'));
      } else {
        proposal = { prevCode: lastCode, content, code: pageCode(lastCode, content) };
      }
    }

    setTurnState({ creator, pageNo, content, truth, proposal, tiReason: reason, stage: 'voting', votes: {}, botThinking: {} });
  };

  // Lượt đầu tiên bắt đầu ngay khi vào trạm
  useEffect(() => {
    startTurn(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Lần lượt từng bot "đang tính…" rồi bỏ phiếu; bot cuối bỏ xong thì lật mở sự thật */
  const runBots = (bots: BotId[], truth: Truth, onAllVoted: () => void) => {
    bots.forEach((bot, idx) => {
      addTimer(() => {
        setTurnState((prev) => (prev ? { ...prev, botThinking: { ...prev.botThinking, [bot]: true } } : null));
        addTimer(() => {
          const vote = botVote(bot, truth, rngRef.current);
          votesRef.current[bot] = vote;
          setTurnState((prev) =>
            prev ? { ...prev, botThinking: { ...prev.botThinking, [bot]: false }, votes: { ...prev.votes, [bot]: vote } } : null,
          );
          if (idx === bots.length - 1) addTimer(onAllVoted, 300);
        }, thinkMs());
      }, idx * 600);
    });
  };

  /** Em chọn ghi trang thật */
  const handleEmSubmitHonest = () => {
    if (!turnState || turnState.creator !== 'em') return;
    const lastCode = lastLedgerCode;
    const correct = pageCode(lastCode, turnState.content);

    if (emInputCode === null || isNaN(emInputCode) || emInputCode < 0 || emInputCode > 99) {
      setEmInputError(T.maSaiKhoang);
      return;
    }

    if (emInputCode !== correct) {
      const attempts = emInputAttempts + 1;
      setEmInputAttempts(attempts);
      sound.playWrong();
      // Sai lần 2 trở đi: hiện gợi ý công thức đã thế số (không tính là lỗi)
      setEmInputError(attempts >= 2 ? fmt(T.maChuaDungGoiY, { x: lastCode, nd: turnState.content }) : T.maChuaDung);
      return;
    }

    sound.playCorrect();
    setEmInputError(null);
    const proposal: Proposal = { prevCode: lastCode, content: turnState.content, code: correct };
    setTurnState((prev) => (prev ? { ...prev, truth: 'valid', proposal, stage: 'voting', votes: {}, botThinking: {} } : null));
    runBots(['binh', 'ti', 'chi'], 'valid', () => reveal('em', 'valid', proposal));
  };

  /** Em xác nhận ghi trang gian */
  const handleConfirmCheat = () => {
    setShowCheatConfirm(false);
    if (!turnState || turnState.creator !== 'em') return;
    sound.playClick();
    const proposal = makeCheatPage(lastLedgerCode, turnState.content, rngRef.current, nameOf('em'));
    setTurnState((prev) => (prev ? { ...prev, truth: 'cheat', proposal, stage: 'voting', votes: {}, botThinking: {} } : null));
    runBots(['binh', 'ti', 'chi'], 'cheat', () => reveal('em', 'cheat', proposal));
  };

  /** Em bỏ phiếu cho trang của bot. Các bot còn lại CHỈ bắt đầu tính sau khi em đã bỏ phiếu. */
  const handleEmVote = (vote: Vote) => {
    if (!turnState || turnState.creator === 'em' || turnState.stage !== 'voting') return;
    if (turnState.votes.em) return;

    sound.playClick();
    if (vote === 'agree' && turnState.truth === 'cheat') setEmAgreedCheat(true);

    votesRef.current.em = vote;
    setTurnState((prev) => (prev ? { ...prev, votes: { ...prev.votes, em: vote } } : null));

    const { creator, truth, proposal, tiReason } = turnState;
    const otherBots = (['binh', 'chi', 'ti'] as const).filter((b) => b !== creator);
    runBots(otherBots, truth, () => reveal(creator, truth, proposal, tiReason));
  };

  /** Lật mở kết quả lượt chơi */
  function reveal(creator: PlayerId, truth: Truth, proposal: Proposal, tiReason?: TiDecisionReason) {
    const votes = { ...votesRef.current };
    const res = settleRound(creator, truth, votes, CFG);

    setScores((s) => ({
      em: s.em + res.deltas.em,
      binh: s.binh + res.deltas.binh,
      chi: s.chi + res.deltas.chi,
      ti: s.ti + res.deltas.ti,
    }));

    if (truth === 'cheat') setBeliefs((b) => updateBeliefs(b, votes));

    if (res.accepted) {
      setLedgerPages((l) => [...l, { content: proposal.content, code: proposal.code, isInvalid: truth !== 'valid' }]);
    }

    setHistory((h) => [...h, { creator, truth, accepted: res.accepted, deltas: res.deltas }]);

    if (res.accepted) sound.playCorrect();
    else sound.playWrong();

    // Bong bóng suy nghĩ của {phanDien}: chỉ hiện SAU khi đã bỏ phiếu và lật mở
    setTiThought(creator === 'ti' && tiReason ? fmt(T.nghi[tiReason]) : null);
    setTurnState((r) => (r ? { ...r, stage: 'revealed', deltas: res.deltas } : null));
  }

  const handleNextTurn = () => {
    setTiThought(null);
    const next = turnIndex + 1;
    setTurnIndex(next);
    startTurn(next);
  };

  const handleFinish = () => {
    onComplete({
      stars: hardStars(scores, emAgreedCheat),
      timeMs: Math.round(performance.now() - startTime),
      learned: bai2Texts.kho.hocDuoc,
    });
  };

  const currentCreator = turnState ? turnState.creator : (CFG.order[turnIndex] as PlayerId);
  const truthLabel = (t: TurnState) =>
    t.truth === 'valid' ? T.trangThat : t.truth === 'miscalc' ? T.trangNham : t.proposal.type === 'A' ? T.gianKhongKhop : T.gianMaBia;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {/* Lượt chơi và bảng điểm 4 người trên một hàng */}
      <div className="flex flex-col gap-3 rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="rounded-nut bg-muc-tim/15 px-3 py-1 font-display text-sm font-extrabold text-muc-tim-dam">
            {fmt(T.luot, { n: Math.min(turnIndex + 1, LAST_TURN), tong: LAST_TURN })}
          </span>
          <span className="hidden text-sm text-nau-go-dam sm:inline">{T.phu}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 border-t-2 border-nau-go/30 pt-3 sm:gap-3">
          {PLAYERS.map((id) => {
            const delta = turnState?.deltas?.[id];
            const isCreator = currentCreator === id && !gameFinished;
            return (
              <div
                key={id}
                className={`relative flex flex-col items-center rounded-2xl border-2 p-1.5 sm:p-2.5 ${
                  isCreator ? 'border-muc-tim bg-muc-tim/10 ring-2 ring-muc-tim/30' : 'border-nau-go/40 bg-white/70'
                }`}
              >
                <Chan id={id} size={44} />
                <div className="mt-1 max-w-full truncate font-display text-sm font-extrabold">{nameOf(id)}</div>
                <div className="text-sm font-bold text-muc-tim-dam">{fmt(T.diem, { so: formatNumber(scores[id]) })}</div>
                {isCreator && (
                  <span className="mt-0.5 whitespace-nowrap rounded-nut bg-muc-tim px-1.5 text-xs font-bold text-white">{T.taoTrang}</span>
                )}
                {delta !== undefined && delta !== 0 && (
                  <span
                    className={`animate-score-pop pointer-events-none absolute -top-3 z-20 rounded-nut px-1.5 py-0.5 text-sm font-extrabold text-white ${
                      delta > 0 ? 'bg-xanh-la-dam' : 'bg-do-son-dam'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sổ chung của cả mạng lưới */}
      <div className="rounded-bang border-2 border-nau-go/50 bg-white/60 p-3">
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <h2 className="flex items-center gap-1.5 text-base">
            <span aria-hidden="true">📚</span> {T.soChungTieuDe}
          </h2>
          <span className="text-sm">
            {T.maCuoi} <strong className="text-muc-tim-dam">{lastLedgerCode}</strong>
          </span>
        </div>
        <ChainStrip
          genesisCode={genesisCode}
          pages={ledgerPages}
          firstInvalidIndex={-1}
          activePageIndex={ledgerPages.length - 1}
          isPageConfirmed={() => true}
          isPageInvalid={(idx) => Boolean(ledgerPages[idx]?.isInvalid)}
          getPageInvalidBadgeText={(idx) => (ledgerPages[idx]?.isInvalid ? T.trangSaiLot : undefined)}
        />
      </div>

      {/* Lượt chơi hiện tại */}
      {!gameFinished && turnState && (
        <div className="flex flex-col gap-4 rounded-bang border-2 border-muc-tim/40 bg-white/70 p-3 sm:p-5">
          {turnState.stage === 'skipped' ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Chan id={turnState.creator} size={64} />
              <div className="font-display text-xl font-extrabold text-do-son-dam">{T.khongDuCoc}</div>
              <p className="max-w-md text-base">
                {fmt(T.khongDuCocChiTiet, { nguoi: nameOf(turnState.creator), diem: scores[turnState.creator] })}
              </p>
              <Button onClick={handleNextTurn}>{T.sangLuotTiep}</Button>
            </div>
          ) : turnState.creator === 'em' ? (
            /* Lượt em tạo trang */
            <div>
              <div className="mb-4 flex items-center gap-3 border-b-2 border-nau-go/30 pb-3">
                <Chan id="em" size={44} />
                <div>
                  <span className="text-sm font-bold text-muc-tim-dam">{T.luotCuaEm}</span>
                  <h3 className="text-lg">{fmt(T.emTaoTrang, { n: turnState.pageNo })}</h3>
                </div>
              </div>

              <div className="mb-4 space-y-1 rounded-2xl border-2 border-nau-go/40 bg-giay p-3 text-base">
                <div>
                  {T.maCuoiSoChung} <strong className="text-lg text-muc-tim-dam">{lastLedgerCode}</strong>
                </div>
                <div>
                  {T.noiDungDuocGiao} <strong className="text-lg">{turnState.content}</strong>
                </div>
              </div>

              {turnState.stage === 'creator-choice' && (
                <div className="flex flex-col gap-3">
                  <div className="text-base font-semibold">{T.emMuonGhi}</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Ghi trang thật */}
                    <div className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-xanh-la-dam bg-xanh-la/10 p-4">
                      <div>
                        <div className="mb-1 font-display text-lg font-extrabold text-xanh-la-dam">{T.ghiThat}</div>
                        <p className="text-sm leading-relaxed">{T.ghiThatMoTa}</p>
                      </div>
                      <div className="space-y-2 border-t-2 border-xanh-la-dam/30 pt-2">
                        <div className="text-sm font-bold">{T.maTrangMoi}</div>
                        <div className="flex flex-wrap items-start gap-2">
                          <NumberInput
                            value={emInputCode}
                            onChange={(v) => {
                              setEmInputCode(v);
                              setEmInputError(null);
                            }}
                            onEnter={handleEmSubmitHonest}
                            min={0}
                            max={99}
                            showButtons={false}
                            error={emInputError || undefined}
                            placeholder="0–99"
                            ariaLabel={T.maTrangMoi}
                          />
                          <Button size="sm" onClick={handleEmSubmitHonest}>
                            {T.guiTrang}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Ghi trang gian */}
                    <div className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-do-son-dam bg-do-son/10 p-4">
                      <div>
                        <div className="mb-1 font-display text-lg font-extrabold text-do-son-dam">{T.ghiGianTieuDe}</div>
                        <p className="text-sm leading-relaxed">{T.ghiGianMoTa}</p>
                      </div>
                      <Button variant="danger" size="sm" fullWidth onClick={() => setShowCheatConfirm(true)}>
                        {T.nutGhiGian}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {(turnState.stage === 'voting' || turnState.stage === 'revealed') && (
                <div className="mt-4 border-t-2 border-nau-go/30 pt-4">
                  <div className="mb-3 text-sm font-bold text-nau-go-dam">{T.nodeBoPhieuChoEm}</div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(['binh', 'ti', 'chi'] as const).map((bot) => (
                      <VoteChip
                        key={bot}
                        id={bot}
                        name={nameOf(bot)}
                        thinking={turnState.botThinking[bot]}
                        vote={turnState.votes[bot]}
                        waitText={T.choLuot}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Lượt bot tạo trang */
            <div>
              <div className="mb-4 flex items-center gap-3 border-b-2 border-nau-go/30 pb-3">
                <Chan id={turnState.creator} size={44} />
                <div>
                  <span className="text-sm font-bold text-muc-tim-dam">{fmt(T.luotCua, { nguoi: nameOf(turnState.creator) })}</span>
                  <h3 className="text-lg">{fmt(T.deXuat, { nguoi: nameOf(turnState.creator) })}</h3>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
                <TrangSo
                  size="sm"
                  pageNumber={turnState.pageNo}
                  prevCode={turnState.proposal.prevCode}
                  content={turnState.proposal.content}
                  pageCode={turnState.proposal.code}
                  isConfirmed={false}
                />
                <div className="flex w-full max-w-sm flex-col gap-3">
                  <div className="space-y-1 rounded-2xl border-2 border-nau-go/40 bg-giay p-3 text-base">
                    <div>
                      {T.maTruocTheoSo} <strong>{turnState.proposal.prevCode}</strong>
                    </div>
                    <div>
                      {T.noiDung} <strong>{turnState.proposal.content}</strong>
                    </div>
                    <div>
                      {T.maTrang} <strong>{turnState.proposal.code}</strong>
                    </div>
                    <div className="mt-1 border-t-2 border-nau-go/30 pt-1 text-muc-tim-dam">
                      {T.maCuoiTrongSoEm} <strong>{lastLedgerCode}</strong>
                    </div>
                    {turnState.proposal.note && (
                      <div className="font-bold text-do-son-dam">{fmt(T.ghiChu, { loi: turnState.proposal.note })}</div>
                    )}
                  </div>

                  {/* Em bỏ phiếu trước; chưa có phiếu của em thì chưa có phiếu nào của bot */}
                  {turnState.stage === 'voting' && !turnState.votes.em && (
                    <div className="flex flex-col gap-2">
                      <div className="text-base font-bold">{T.emBoPhieu}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="md" className="px-3! whitespace-nowrap" onClick={() => handleEmVote('agree')}>
                          <span aria-hidden="true">✓ </span>
                          {bai2Texts.chung.dongY}
                        </Button>
                        <Button variant="danger" size="md" className="px-3! whitespace-nowrap" onClick={() => handleEmVote('reject')}>
                          <span aria-hidden="true">✗ </span>
                          {bai2Texts.chung.tuChoi}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {turnState.votes.em && (
                <div className="mt-4 border-t-2 border-nau-go/30 pt-4">
                  <div className="mb-3 text-sm font-bold text-nau-go-dam">{T.ketQuaBoPhieu}</div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {PLAYERS.filter((p) => p !== turnState.creator).map((voter) => (
                      <VoteChip
                        key={voter}
                        id={voter}
                        name={nameOf(voter)}
                        thinking={turnState.botThinking[voter]}
                        vote={turnState.votes[voter]}
                        waitText={bai2Texts.kho.choLuot}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lật mở sự thật */}
          {turnState.stage === 'revealed' && (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-muc-tim/40 bg-giay p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">{T.suThat}</span>
                  <span
                    className={`rounded-nut px-2.5 py-1 text-sm font-extrabold ${
                      turnState.truth === 'valid'
                        ? 'bg-xanh-la/15 text-xanh-la-dam'
                        : turnState.truth === 'miscalc'
                          ? 'bg-vang/30 text-vang-dam'
                          : 'bg-do-son/15 text-do-son-dam'
                    }`}
                  >
                    {truthLabel(turnState)}
                  </span>
                </div>
                <span className="text-sm font-bold text-nau-go-dam">{explainCheck(lastLedgerCode, turnState.proposal)}</span>
              </div>

              {tiThought && (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-do-son/40 bg-do-son/10 p-3 text-base">
                  <Chan id="ti" size={44} />
                  <span>
                    <strong>{fmt(T.nghiTham, { nguoi: nameOf('ti') })}</strong> “{tiThought}”
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button onClick={handleNextTurn}>{turnIndex + 1 < LAST_TURN ? T.luotTiep : T.xemTongKet}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kết thúc ván đấu và câu hỏi suy ngẫm */}
      {gameFinished && (
        <div className="flex flex-col gap-5 rounded-bang border-2 border-muc-tim bg-white/80 p-4 sm:p-6">
          <div className="text-center">
            <h2 className="mb-1 text-2xl text-muc-tim-dam sm:text-3xl">{T.ketThuc}</h2>
            <p className="text-base">{T.bangXepHang}</p>
          </div>

          <ol className="space-y-2">
            {PLAYERS.slice()
              .sort((a, b) => scores[b] - scores[a])
              .map((p, rank) => (
                <li
                  key={p}
                  className={`flex items-center justify-between rounded-2xl border-2 p-3 ${
                    p === 'em' ? 'border-muc-tim bg-muc-tim/10' : 'border-nau-go/40 bg-white/70'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 font-display text-lg font-extrabold text-nau-go-dam">#{rank + 1}</span>
                    <Chan id={p} size={44} />
                    <span className="truncate font-display text-base font-extrabold">{nameOf(p)}</span>
                  </div>
                  <div className="whitespace-nowrap font-display text-lg font-extrabold text-muc-tim-dam">
                    {fmt(T.diemSo, { so: formatNumber(scores[p]) })}
                  </div>
                </li>
              ))}
          </ol>

          <div className="space-y-1.5 rounded-2xl border-2 border-nau-go/40 bg-giay p-4 text-base">
            <div className="mb-1 font-bold text-muc-tim-dam">
              <span aria-hidden="true">📋 </span>
              {T.tomTat}
            </div>
            {PLAYERS.map((p) => (
              <div key={p}>• {summarizePlayer(history, p, nameOf(p))}</div>
            ))}
          </div>

          <div className="space-y-1 rounded-2xl border-2 border-xanh-la-dam/40 bg-xanh-la/10 p-4 text-base font-semibold text-xanh-la-dam">
            <div>
              <span aria-hidden="true">✨ </span>
              {T.baiHoc1}
            </div>
            <div>
              <span aria-hidden="true">✨ </span>
              {T.baiHoc2}
            </div>
          </div>

          <ReflectionQuestion
            question={fmt(T.suyNgam.cauHoi)}
            options={T.suyNgam.dapAn.map((o) => fmt(o))}
            explanation={fmt(T.suyNgam.giaiThich)}
            onAnswered={() => setReflectionAnswered(true)}
          />

          {reflectionAnswered && (
            <div className="flex justify-center pt-1">
              <Button size="lg" autoFocus onClick={handleFinish}>
                {bai2Texts.chung.xongTram}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Hộp xác nhận ghi trang gian */}
      {showCheatConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-chu/40 p-4" onClick={() => setShowCheatConfirm(false)}>
          <Panel
            role="dialog"
            aria-modal="true"
            aria-label={T.hopThoaiTieuDe}
            className="w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl">{T.hopThoaiTieuDe}</h2>
            <p className="text-base leading-relaxed">
              {T.hopThoaiTruoc}
              <strong className="text-do-son-dam">{T.hopThoaiNhan}</strong>
              {T.hopThoaiSau}
            </p>
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button variant="secondary" size="sm" autoFocus onClick={() => setShowCheatConfirm(false)}>
                {T.thoiGhiThat}
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmCheat}>
                {T.vanGhiGian}
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
