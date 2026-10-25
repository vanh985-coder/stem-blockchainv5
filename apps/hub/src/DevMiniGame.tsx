import { GAMES, MiniGameLevel, Panel, type ScorePart } from '@so-chung/core';

/**
 * Trang thu /dev/minigame (chi co khi chay dev): thu khung MiniGameLevel voi mot "game" gia (cac nut ket thuc voi diem co san).
 * Vi du: /dev/minigame?level=9 (the bat dau cua man 9; mac dinh man 2; moc 200/380/520).
 */
/** Dong diem mau (chu ASCII, do dai nhu that) de thu man ket qua o dien thoai ngang. */
const PARTS_5: ScorePart[] = [
  { label: 'Vong 1 (so lan sai)', count: 1, points: 90 },
  { label: 'Vong 2 (so lan sai)', count: 0, points: 100 },
  { label: 'Vong 2: bo dung trang gia vao ro', count: 1, points: 30 },
  { label: 'Vong 3 (so lan sai)', count: 1, points: 90 },
  { label: 'Vong 3: bo dung trang gia vao ro', count: 1, points: 30 },
];
const PARTS_4: ScorePart[] = [
  { label: 'Trang so nhat duoc', count: 42, points: 420 },
  { label: 'Tien dong', count: 34, points: 34 },
  { label: 'Quang duong chay (met)', count: 1080, points: 108 },
  { label: 'Cau hoi tra loi dung', count: 4, points: 120 },
];

/** Game duoc chon bang ?level=N (N co trong GAMES: 2, 3, 5, 6, 8, 9, 12); khong hop le thi man 2. */
function levelFromUrl(): number {
  const n = Number(new URLSearchParams(window.location.search).get('level'));
  return GAMES[n] ? n : 2;
}

export default function DevMiniGame() {
  return (
    <main className="mx-auto min-h-screen max-w-[900px] p-4">
      <MiniGameLevel
        levelId={levelFromUrl()}
        medals={[200, 380, 520]}
        renderGame={({ paused, attempt, onFinish }) => (
          <Panel className="space-y-3">
            <h1 className="text-2xl">Dev: game gia (lan {attempt})</h1>
            <p data-testid="paused">{paused ? 'PAUSED' : 'RUNNING'}</p>
            <div className="flex flex-wrap gap-2">
              <button className="min-h-11 rounded-nut border-2 border-nau-go px-3" data-testid="ket-thuc-5-dong" onClick={() => onFinish(340, PARTS_5)}>
                Ket thuc 340 diem, 5 dong
              </button>
              <button className="min-h-11 rounded-nut border-2 border-nau-go px-3" data-testid="ket-thuc-4-dong" onClick={() => onFinish(682, PARTS_4)}>
                Ket thuc 682 diem, 4 dong
              </button>
              {[0, 100, 250, 400, 600].map((score) => (
                <button key={score} className="min-h-11 rounded-nut border-2 border-nau-go px-3" onClick={() => onFinish(score)}>
                  Ket thuc {score} diem
                </button>
              ))}
            </div>
          </Panel>
        )}
      />
    </main>
  );
}
