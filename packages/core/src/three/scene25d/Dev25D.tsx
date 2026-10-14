import { useState } from 'react';
import { Character } from '../Character';
import { QUALITY_CHOICES, type QualityChoice } from '../quality';
import { Actor25D, Scene25D, type Sprite25D } from './Scene25D';
import type { FrameMode } from './layout25d';

/**
 * Trang thu /dev/25d (chi co khi chay dev): thu Scene25D voi anh nen man 3, vai hinh roi, hoc sinh va Ti dung o hai lop khac nhau.
 * Doi co khung bang cac nut (gia lap cua so hep, dien thoai ngang, dien thoai doc); ?q=low|medium|high de chon muc chat luong.
 * Chu tren trang nay chi la chu thu nghiem cua lap trinh vien, khong den tay hoc sinh.
 */

interface SizePreset {
  id: string;
  label: string;
  /** null = chiem het phan con lai cua trang */
  size: { width: number; height: number } | null;
  allowPortrait?: boolean;
}

const PRESETS: readonly SizePreset[] = [
  { id: 'full', label: 'Full window', size: null },
  { id: '1280', label: '16:9 1280x720', size: { width: 1280, height: 720 } },
  { id: 'narrow', label: 'Narrow 560x420', size: { width: 560, height: 420 } },
  { id: 'phone-land', label: 'Phone landscape 844x390', size: { width: 844, height: 390 } },
  { id: 'phone-port', label: 'Phone portrait 390x844', size: { width: 390, height: 844 } },
  { id: 'phone-port-ok', label: 'Phone portrait + allowPortrait', size: { width: 390, height: 844 }, allowPortrait: true },
];

/** Hinh roi thu: ro trang gia o goc phai (lop sau nhan vat), mot ro nho o lop truoc che ban chan Ti, mot hinh o lop xa. */
const SPRITES: readonly Sprite25D[] = [
  { key: 'ro', asset: 'sprites/man-03-ghep-so/ro-trang-gia', x: 5.6, y: -2.5, layer: 'back', height: 2.6 },
  { key: 'ro-truoc', asset: 'sprites/man-03-ghep-so/ro-trang-gia', x: 0.9, y: -3.9, layer: 'front', height: 1.5 },
  { key: 'cot', asset: 'sprites/man-06-dieu/cot-tre', x: -5.2, y: 0.4, layer: 'far', height: 4.2, opacity: 0.9 },
];

export function Dev25D() {
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const q = params.get('q');
  const quality: QualityChoice | undefined = QUALITY_CHOICES.includes(q as QualityChoice) ? (q as QualityChoice) : undefined;
  const [presetId, setPresetId] = useState('full');
  const [mode, setMode] = useState<FrameMode | null>(null);
  const [ready, setReady] = useState(false);
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  return (
    <main className="flex h-screen flex-col gap-2 bg-neutral-200 p-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {PRESETS.map((p) => (
          <button key={p.id} data-testid={`preset-${p.id}`} className={`min-h-9 rounded border px-2 ${p.id === presetId ? 'border-black bg-black text-white' : 'border-black bg-white'}`} onClick={() => setPresetId(p.id)}>
            {p.label}
          </button>
        ))}
        <span data-testid="mode">mode: {mode ?? '-'}</span>
        <span data-testid="ready">{ready ? 'ready' : 'loading'}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="bg-black" style={preset.size ? { width: preset.size.width, height: preset.size.height } : { width: '100%', height: '100%' }} data-testid="host">
          <Scene25D
            key={preset.id}
            background="scenes/man-03-xuong-giay"
            sprites={SPRITES}
            allowPortrait={preset.allowPortrait}
            quality={quality}
            onModeChange={setMode}
            onReady={() => setReady(true)}
            overlay={<div className="absolute left-2 top-2 rounded bg-white/80 px-2 py-1 text-xs">HTML overlay: score 120 | hearts 3</div>}
          >
            <Actor25D x={-6.2} y={-3.9} layer="actorsBack" height={3.8} facing="right">
              <Character id="characters/bac-an" animation="idle" />
            </Actor25D>
            <Actor25D x={-1.6} y={-3.9} layer="actors" height={3.6}>
              <Character id="characters/hoc-sinh-nam" animation="idle" />
            </Actor25D>
            <Actor25D x={0.4} y={-3.9} layer="actorsFront" height={3.6} facing="left">
              <Character id="characters/ti" animation="idle" />
            </Actor25D>
          </Scene25D>
        </div>
      </div>
    </main>
  );
}
