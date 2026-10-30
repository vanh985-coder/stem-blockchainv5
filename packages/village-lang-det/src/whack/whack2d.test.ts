import { describe, expect, it } from 'vitest';
import { WHACK_SPEC } from './whackConfig';
import {
  answerBoss,
  bossClock,
  bossPoints,
  collectCoin,
  createWhackGame,
  hitLane,
  inZone,
  lowestInZone,
  spawnMouse,
  stepWhack,
  tickWhack,
  type WhackEvent,
  type WhackState,
} from './whackLogic';

function callBoss(s: WhackState): WhackEvent[] {
  s.ticks = Math.round(bossClock(s.bossesDone) / WHACK_SPEC.tick) - 1;
  return stepWhack(s, WHACK_SPEC.tick);
}

function toQuiz(s: WhackState): void {
  callBoss(s);
  stepWhack(s, WHACK_SPEC.boss.runSeconds + 0.1);
}

describe('P7b: Hoàn thiện và kiểm logic lối chơi Màn 5 2D', () => {
  it('phân biệt rõ ràng giữa chuột thường và chuột câu hỏi', () => {
    const s = createWhackGame(42);
    const mThuong = spawnMouse(s, 'thuong', 0, 7.0);
    const mNhanh = spawnMouse(s, 'nhanh', 1, 7.0);
    const mDoiLan = spawnMouse(s, 'doiLan', 2, 7.0);
    const mTo = spawnMouse(s, 'to', 3, 7.0);

    expect(mThuong.kind).toBe('thuong');
    expect(mNhanh.kind).toBe('nhanh');
    expect(mDoiLan.kind).toBe('doiLan');
    expect(mTo.kind).toBe('to');
    expect(mTo.hits).toBe(2);

    expect(s.boss).toBeNull();
    callBoss(s);
    expect(s.boss).not.toBeNull();
    expect(s.boss?.index).toBe(0);
    expect(s.phase).toBe('bossRun');
  });

  it('đập chuột thường chỉ tính 1 lần, chuột to cần 2 cú đập riêng biệt', () => {
    const s = createWhackGame(100);
    const mThuong = spawnMouse(s, 'thuong', 0, 7.5);
    expect(inZone(mThuong)).toBe(true);

    // Cú đập 1: trúng và hạ chuột thường
    const res1 = hitLane(s, 0);
    expect(res1[0].type).toBe('hit');
    if (res1[0].type === 'hit') {
      expect(res1[0].killed).toBe(true);
      expect(res1[0].points).toBe(WHACK_SPEC.points.thuong);
    }
    expect(s.mice.find((m) => m.id === mThuong.id)).toBeUndefined();

    // Chuột to: cần 2 cú đập
    const mTo = spawnMouse(s, 'to', 1, 7.5);
    const hitTo1 = hitLane(s, 1);
    expect(hitTo1[0].type).toBe('hit');
    if (hitTo1[0].type === 'hit') {
      expect(hitTo1[0].killed).toBe(false);
      expect(mTo.hits).toBe(1);
      expect(mTo.freeze).toBeGreaterThan(0);
    }

    // Hit 2: hạ gục
    const hitTo2 = hitLane(s, 1);
    expect(hitTo2[0].type).toBe('hit');
    if (hitTo2[0].type === 'hit') {
      expect(hitTo2[0].killed).toBe(true);
      expect(hitTo2[0].points).toBe(WHACK_SPEC.points.to);
    }
    expect(s.mice.find((m) => m.id === mTo.id)).toBeUndefined();
  });

  it('khi có 2 chuột cùng làn, cú đập luôn trúng con thấp nhất (gần sổ hơn)', () => {
    const s = createWhackGame(200);
    const mCao = spawnMouse(s, 'thuong', 2, 7.0);
    const mThap = spawnMouse(s, 'thuong', 2, 8.5);

    expect(lowestInZone(s, 2)?.id).toBe(mThap.id);

    const res = hitLane(s, 2);
    expect(res[0].type).toBe('hit');
    if (res[0].type === 'hit') {
      expect(res[0].mouse.id).toBe(mThap.id);
    }
    expect(s.mice.some((m) => m.id === mCao.id)).toBe(true);
  });

  it('chuột vừa ra khỏi vùng đập (pos > 9.0) thì đập bị hụt, lọt tới sổ bị phạt mực', () => {
    const s = createWhackGame(250);
    const mQua = spawnMouse(s, 'thuong', 1, 9.2); // Đã vượt qua zoneEnd 9.0
    expect(inZone(mQua)).toBe(false);

    // Đập làn 1: không có chuột trong vùng đập -> miss
    const res = hitLane(s, 1);
    expect(res[0].type).toBe('miss');
    expect(s.mice.find((m) => m.id === mQua.id)).toBeDefined();

    // Chuột trôi tiếp tới pos >= 10 -> leak (+1 mực)
    const initialInk = s.ink;
    stepWhack(s, 0.5);
    expect(s.ink).toBe(initialInk + 1);
    expect(s.mice.find((m) => m.id === mQua.id)).toBeUndefined();
  });

  it('chuột đổi làn nhảy sang làn kề ở pos = 5.0 và vào vùng đập của làn mới', () => {
    const s = createWhackGame(280);
    const mDoi = spawnMouse(s, 'doiLan', 0, 4.8);
    expect(mDoi.lane).toBe(0);

    // Di chuyển qua mốc 5.0
    stepWhack(s, 0.1);
    expect(mDoi.lane).toBe(1); // Đã đổi sang làn 1
    expect(mDoi.changed).toBe(true);

    // Khi vào vùng đập làn 1, đập làn 1 trúng
    mDoi.pos = 7.5;
    const res = hitLane(s, 1);
    expect(res[0].type).toBe('hit');
    if (res[0].type === 'hit') {
      expect(res[0].killed).toBe(true);
    }
  });

  it('chuột câu hỏi kích hoạt quiz, trả lời đúng xóa 2 vết mực và tính điểm theo giây', () => {
    const s = createWhackGame(300);
    s.ink = 3;

    toQuiz(s);
    expect(s.phase).toBe('quiz');

    const events = answerBoss(s, 'correct', 8);
    expect(events.some((e) => e.type === 'bossAnswer')).toBe(true);
    expect(s.ink).toBe(1); // 3 - 2 = 1
    expect(s.stats.bossCorrect).toBe(1);
    expect(s.score).toBe(bossPoints(8));
    expect(s.phase).toBe('play');
    expect(s.bossesDone).toBe(1);
  });

  it('chuột câu hỏi trả lời sai hoặc hết giờ bị phạt thêm 1 vết mực', () => {
    const s = createWhackGame(400);
    s.ink = 2;

    toQuiz(s);
    expect(s.phase).toBe('quiz');

    answerBoss(s, 'wrong', 0);
    expect(s.ink).toBe(3);
    expect(s.stats.bossCorrect).toBe(0);
    expect(s.phase).toBe('play');
  });

  it('chuột câu hỏi hết giờ (timeout) bị phạt 1 vết mực như trả lời sai', () => {
    const s = createWhackGame(450);
    s.ink = 1;

    toQuiz(s);
    expect(s.phase).toBe('quiz');

    answerBoss(s, 'timeout', 0);
    expect(s.ink).toBe(2);
    expect(s.phase).toBe('play');
  });

  it('đo trực tiếp: khi tạm dừng, vị trí chuột và đồng hồ đứng yên tuyệt đối; unpause chạy tiếp không nhảy thời gian', () => {
    const s = createWhackGame(500);
    const m = spawnMouse(s, 'thuong', 0, 3.0);

    const initialPos = m.pos;
    const initialClock = s.clock;

    // Đo trong lúc paused = true
    const events = tickWhack(s, 1.5, true);
    expect(events).toHaveLength(0);
    expect(m.pos).toBe(initialPos); // Đứng yên 100%
    expect(s.clock).toBe(initialClock);

    // Unpause: chạy tiếp 0.1s
    tickWhack(s, 0.1, false);
    expect(m.pos).toBeGreaterThan(initialPos);
    expect(s.clock).toBeCloseTo(initialClock + 0.1, 2);
  });

  it('nhặt tiền đồng cộng điểm và cộng xu', () => {
    const s = createWhackGame(600);
    s.coin = { lane: 2, pos: 5.0, life: 3.0 };

    const initialScore = s.score;
    const initialCoins = s.coins;

    const events = collectCoin(s);
    expect(events[0].type).toBe('coinTaken');
    expect(s.score).toBe(initialScore + WHACK_SPEC.coin.points);
    expect(s.coins).toBe(initialCoins + WHACK_SPEC.coin.xu);
    expect(s.coin).toBeNull();
  });

  it('kết thúc ván khi dính đủ 8 vết mực (ink)', () => {
    const s = createWhackGame(700);
    s.ink = 7;
    spawnMouse(s, 'thuong', 0, 9.99);
    const events = stepWhack(s, 0.1);

    expect(s.ink).toBe(8);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('ink');
    expect(events.some((e) => e.type === 'end' && e.reason === 'ink')).toBe(true);
  });

  it('hoàn thành trọn ván khi vượt qua đủ 10 lượt trùm (complete)', () => {
    const s = createWhackGame(800);
    s.bossesDone = 9; // Đang ở trùm cuối (thứ 10)

    toQuiz(s);
    expect(s.phase).toBe('quiz');

    // Trả lời câu thứ 10
    const events = answerBoss(s, 'correct', 5);
    expect(s.bossesDone).toBe(10);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('complete');
    expect(events.some((e) => e.type === 'end' && e.reason === 'complete')).toBe(true);
  });
});
