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

describe('P7a: Logic và cơ chế Màn 5 2D Đập chuột và Chuột câu hỏi', () => {
  it('phân biệt rõ ràng giữa chuột thường và chuột câu hỏi', () => {
    const s = createWhackGame(42);
    // Sinh các loại chuột thường
    const mThuong = spawnMouse(s, 'thuong', 0, 7.0);
    const mNhanh = spawnMouse(s, 'nhanh', 1, 7.0);
    const mDoiLan = spawnMouse(s, 'doiLan', 2, 7.0);
    const mTo = spawnMouse(s, 'to', 3, 7.0);

    expect(mThuong.kind).toBe('thuong');
    expect(mNhanh.kind).toBe('nhanh');
    expect(mDoiLan.kind).toBe('doiLan');
    expect(mTo.kind).toBe('to');
    expect(mTo.hits).toBe(2);

    // Chuột câu hỏi (boss) xuất hiện theo lịch trùm, không nằm trong mice thường
    expect(s.boss).toBeNull();
    // Gọi trùm xuất hiện ở giây 12
    callBoss(s);
    expect(s.boss).not.toBeNull();
    expect(s.boss?.index).toBe(0);
    expect(s.phase).toBe('bossRun');
  });

  it('đập chuột thường chỉ tính 1 lần, chuột to cần 2 cú đập', () => {
    const s = createWhackGame(100);
    const mThuong = spawnMouse(s, 'thuong', 0, 7.5); // Nằm trong vùng đập [6.5, 9.0]
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
      expect(hitTo1[0].killed).toBe(false); // Chưa chết sau hit 1
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
    // Con cao hơn vẫn còn
    expect(s.mice.some((m) => m.id === mCao.id)).toBe(true);
  });

  it('chuột câu hỏi kích hoạt quiz, trả lời đúng xóa 2 vết mực và tính điểm theo giây', () => {
    const s = createWhackGame(300);
    s.ink = 3; // Giả lập đang có 3 vết mực

    // Tiến tới lúc trùm vào vùng quiz
    toQuiz(s);
    expect(s.phase).toBe('quiz');

    // Trả lời đúng khi còn 8 giây
    const events = answerBoss(s, 'correct', 8);
    expect(events.some((e) => e.type === 'bossAnswer')).toBe(true);
    // Xóa 2 vết mực: 3 - 2 = 1
    expect(s.ink).toBe(1);
    expect(s.stats.bossCorrect).toBe(1);
    // Điểm thưởng: 100 + 5 * 8 = 140
    expect(s.score).toBe(bossPoints(8));
    expect(s.phase).toBe('play');
    expect(s.bossesDone).toBe(1);
  });

  it('chuột câu hỏi trả lời sai hoặc hết giờ bị phạt thêm 1 vết mực', () => {
    const s = createWhackGame(400);
    s.ink = 2;

    toQuiz(s);
    expect(s.phase).toBe('quiz');

    // Trả lời sai
    answerBoss(s, 'wrong', 0);
    expect(s.ink).toBe(3); // 2 + 1 = 3
    expect(s.stats.bossCorrect).toBe(0);
    expect(s.phase).toBe('play');
  });

  it('tạm dừng (khi mở hộp ?): chuột và đồng hồ đứng yên hoàn toàn', () => {
    const s = createWhackGame(500);
    spawnMouse(s, 'thuong', 0, 3.0);

    const initialPos = s.mice[0].pos;
    const initialClock = s.clock;

    // Tick khi paused = true (mở hộp ?)
    const events = tickWhack(s, 2.0, true);
    expect(events).toHaveLength(0);
    expect(s.mice[0].pos).toBe(initialPos); // Chuột không di chuyển
    expect(s.clock).toBe(initialClock); // Đồng hồ không tăng
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
    // Cho 1 chuột lọt qua đáy làn (pos = 10)
    spawnMouse(s, 'thuong', 0, 9.99);
    const events = stepWhack(s, 0.1);

    expect(s.ink).toBe(8);
    expect(s.phase).toBe('ended');
    expect(s.ended).toBe('ink');
    expect(events.some((e) => e.type === 'end' && e.reason === 'ink')).toBe(true);
  });
});
