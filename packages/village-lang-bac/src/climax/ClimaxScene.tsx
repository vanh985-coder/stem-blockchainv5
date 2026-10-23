import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoldenPagesRow, VnDialog, climaxUi, useAuth, useProgress, useSettings, type VnTurn } from '@so-chung/core';
import { Actor25D, Character, Scene25D, type ClipName, type PoseRequest } from '@so-chung/core/three/index';
import { climaxMotion, climaxSteps, finishLabelOf, type ClimaxMotion, type ClimaxStep, type ClimaxTurn } from './climaxFlow';

/** Nền: gốc đa của Làng Bạc (ảnh có sẵn của bài học 10). */
const BACKGROUND = 'scenes/bai-hoc-lang-bac';
/** Chân nhân vật trên nền đất và chiều cao trên khung (đơn vị cảnh; khung cao 9): từ trái sang phải thầy Linh, cụ Bình, học sinh, {phanDien}. */
const FEET_Y = -3.5;
const SPOTS = { thayLinh: { x: -3.4, h: 3.5 }, cuBinh: { x: -1.3, h: 3.3 }, student: { x: 1.2, h: 3.4 }, ti: { x: 3.5, h: 3.2 } } as const;
/** {phanDien} cúi đầu (tư thế sad dài 1 giây): lặp lại mỗi chừng này (ms) cho tới hết lượt; "Giảm chuyển động" thì chỉ cúi một lần. */
const BOW_EVERY_MS = 1400;

const STUDENT_CLIPS: readonly ClipName[] = ['idle'];
const TI_CLIPS: readonly ClipName[] = ['idle', 'cheer'];

/**
 * Cảnh 3D nhỏ dưới gốc đa (Scene25D): học sinh và {phanDien} là model có xương (idle; {phanDien} cúi đầu bằng tư thế sad, nhảy cẫng bằng clip cheer), cụ Bình và thầy Linh là nhân vật
 * không xương (nhún nhẹ, nghiêng đầu khi nói; spec 03 mục 3.4).
 */
function ClimaxStage({ motion, reduced }: { motion: ClimaxMotion; reduced: boolean }) {
  const [bowN, setBowN] = useState(0);
  useEffect(() => {
    if (!motion.tiBow) return;
    setBowN((n) => n + 1);
    if (reduced) return;
    const t = setInterval(() => setBowN((n) => n + 1), BOW_EVERY_MS);
    return () => clearInterval(t);
  }, [motion.tiBow, reduced]);
  const [cheerN, setCheerN] = useState(0);
  useEffect(() => {
    if (motion.tiCheer) setCheerN((n) => n + 1);
  }, [motion.tiCheer]);
  const pose = useMemo<PoseRequest | undefined>(() => (motion.tiBow && bowN > 0 ? { name: 'sad', n: bowN } : undefined), [motion.tiBow, bowN]);

  return (
    <Scene25D background={BACKGROUND} className="rounded-2xl">
      <Actor25D x={SPOTS.thayLinh.x} y={FEET_Y} height={SPOTS.thayLinh.h}>
        <Character id="characters/thay-linh" mood={motion.talking === 'thayLinh' ? 'talking' : 'idle'} />
      </Actor25D>
      <Actor25D x={SPOTS.cuBinh.x} y={FEET_Y} height={SPOTS.cuBinh.h}>
        <Character id="characters/cu-binh" mood={motion.talking === 'cuBinh' ? 'talking' : 'idle'} />
      </Actor25D>
      <Actor25D x={SPOTS.student.x} y={FEET_Y} height={SPOTS.student.h}>
        <Character id="characters/hoc-sinh-nam" animation="idle" clips={STUDENT_CLIPS} />
      </Actor25D>
      <Actor25D x={SPOTS.ti.x} y={FEET_Y} height={SPOTS.ti.h}>
        <Character id="characters/ti" animation={motion.tiCheer ? 'cheer' : 'idle'} trigger={cheerN} returnTo="idle" clips={TI_CLIPS} pose={pose} />
      </Actor25D>
    </Scene25D>
  );
}

function toVnTurn(t: ClimaxTurn, reduced: boolean): VnTurn {
  return {
    speaker: t.speaker,
    portrait: t.portrait,
    image: t.image,
    text: t.text,
    mood: t.mood,
    extra:
      t.pagesRow || t.note ? (
        <>
          {t.pagesRow && <GoldenPagesRow arriving={3} reducedMotion={reduced} />}
          {t.note && (
            <p className="mt-2 text-center font-display text-xl font-extrabold" data-testid="hoi-lang-sap-mo">
              {t.note}
            </p>
          )}
        </>
      ) : undefined,
  };
}

export interface ClimaxSceneProps {
  /** Có trao Trang Sổ Vàng thứ tư ở bước d không (không khi tài khoản đã có trang từ luật mốc 1; xem lại thì có) */
  award: boolean;
  /** Em bấm xem lại ở màn kết quả (không ghi cờ "đã chiếu") */
  replay: boolean;
  /** Hết cảnh hay bấm "Bỏ qua": sang màn kết quả */
  onDone: () => void;
}

/**
 * Cảnh cao trào sau màn 12 (spec 08): ảnh truyện số 10, dưới gốc đa (3D), ảnh truyện số 11, thầy Linh trao Trang Sổ Vàng thứ tư. Mọi bước đều có "Bỏ qua" (kết thúc cả cảnh).
 * Hết cảnh hay bỏ qua đều ghi cờ `climaxSeen` (lần sau không tự chạy); xem lại thì không ghi.
 */
export function ClimaxScene({ award, replay, onDone }: ClimaxSceneProps) {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { markClimaxSeen } = useProgress();
  const reduced = settings.reducedMotion;
  const ten = profile?.display_name ?? '';
  const steps = useMemo(() => climaxSteps({ ten, award }), [ten, award]);
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const step: ClimaxStep = steps[index];

  const finish = useCallback(() => {
    if (!replay) markClimaxSeen();
    onDone();
  }, [markClimaxSeen, onDone, replay]);
  const next = useCallback(() => {
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setTurn(0);
    } else finish();
  }, [index, steps.length, finish]);

  const turns = useMemo(() => step.turns.map((t) => toVnTurn(t, reduced)), [step, reduced]);
  const finishLabel = finishLabelOf(index, steps.length, replay);

  if (!step.scene) {
    // ảnh truyện: hộp thoại kiểu visual novel phủ cả màn hình, nền là chính ảnh làm mờ
    return <VnDialog key={step.id} turns={turns} onFinish={next} onSkip={finish} finishLabel={finishLabel} background={step.turns[0].image ?? ''} label={climaxUi.khung} />;
  }
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-chu p-2 sm:p-4" data-testid="canh-cao-trao" data-step={step.id}>
      {/* Cảnh nhỏ ở trên (cao tối đa 34% màn hình, tỉ lệ 16:9), hộp lời ở dưới; màn thấp (điện thoại ngang, cao ≤ 500px) thì đặt cạnh nhau: cảnh 40%, hộp lời 60% */}
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-3 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:gap-2">
        <div
          className="relative aspect-video w-[var(--cw)] shrink-0 overflow-hidden rounded-2xl border-4 border-nau-go [@media(max-height:500px)]:w-[40%]"
          style={{ '--cw': 'min(100%, calc(34vh * 16 / 9))' } as React.CSSProperties}
        >
          <ClimaxStage motion={climaxMotion(step, turn)} reduced={reduced} />
        </div>
        <div className="w-full max-w-[960px] [@media(max-height:500px)]:w-[60%]">
          <VnDialog key={step.id} turns={turns} onFinish={next} onSkip={finish} finishLabel={finishLabel} onTurnChange={setTurn} />
        </div>
      </div>
    </div>
  );
}
