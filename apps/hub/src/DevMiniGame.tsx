import { DEV_PARTS_4, DEV_PARTS_5, GAMES, MiniGameLevel, Panel, climaxUi, devMiniGameText, fmt } from '@so-chung/core';

/**
 * Trang thu /dev/minigame (chi co khi chay dev): thu khung MiniGameLevel voi mot "game" gia (cac nut ket thuc voi diem co san).
 * Vi du: /dev/minigame?level=9 (the bat dau cua man 9; mac dinh man 2; moc 200/380/520). Them &finale=1 de man ket qua co nut thu tu "Xem lai canh cuoi" nhu man 12 that.
 */
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
        finale={new URLSearchParams(window.location.search).get('finale') ? { auto: false, replayLabel: climaxUi.xemLai, render: ({ onDone }) => <button onClick={onDone}>Done</button> } : undefined}
        renderGame={({ paused, attempt, onFinish }) => (
          <Panel className="space-y-3">
            <h1 className="text-2xl">{fmt(devMiniGameText.tieuDe, { so: attempt })}</h1>
            <p data-testid="paused">{paused ? 'PAUSED' : 'RUNNING'}</p>
            <div className="flex flex-wrap gap-2">
              <button className="min-h-11 rounded-nut border-2 border-nau-go px-3" data-testid="ket-thuc-5-dong" onClick={() => onFinish(340, DEV_PARTS_5)}>
                {devMiniGameText.ketThuc5}
              </button>
              <button className="min-h-11 rounded-nut border-2 border-nau-go px-3" data-testid="ket-thuc-4-dong" onClick={() => onFinish(682, DEV_PARTS_4)}>
                {devMiniGameText.ketThuc4}
              </button>
              {[0, 100, 250, 400, 600].map((score) => (
                <button key={score} className="min-h-11 rounded-nut border-2 border-nau-go px-3" onClick={() => onFinish(score)}>
                  {fmt(devMiniGameText.ketThucDiem, { so: score })}
                </button>
              ))}
            </div>
          </Panel>
        )}
      />
    </main>
  );
}
