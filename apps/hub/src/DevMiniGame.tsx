import { MiniGameLevel, Panel } from '@so-chung/core';

/**
 * Trang thu /dev/minigame (chi co khi chay dev): thu khung MiniGameLevel voi mot "game" gia (cac nut ket thuc voi diem co san).
 * Vi du: /dev/minigame?level=2 (mac dinh man 2, moc 200/380/520).
 */
export default function DevMiniGame() {
  return (
    <main className="mx-auto min-h-screen max-w-[900px] p-4">
      <MiniGameLevel
        levelId={2}
        medals={[200, 380, 520]}
        renderGame={({ paused, attempt, onFinish }) => (
          <Panel className="space-y-3">
            <h1 className="text-2xl">Dev: game gia (lan {attempt})</h1>
            <p data-testid="paused">{paused ? 'PAUSED' : 'RUNNING'}</p>
            <div className="flex flex-wrap gap-2">
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
