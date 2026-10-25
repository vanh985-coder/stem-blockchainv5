import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Button, chickenUi, fmt, plainPower, rich } from '@so-chung/core';
import { ModCalculator } from '../ui/ModCalculator';
import { MEDICINE_COLORS } from './chickenLayout';
import { loadComplete, type ChickenState, type DropResult } from './chickenLogic';

export interface ChickenLoadProps {
  state: ChickenState;
  reduced: boolean;
  /** Nạp nhãn `labelId` vào thuốc `medicine` (luật ở `dropLabel`; bên ngoài phát âm thanh). */
  onDrop: (labelId: number, medicine: number) => DropResult;
  onStart: () => void;
}

type Msg = { kind: 'dung'; x: number; y: number } | { kind: 'sai' } | { kind: 'chon' } | { kind: 'xong' } | null;
interface Drag {
  id: number;
  /** Tâm chip theo điểm ảnh, tính từ góc trên trái của bảng nạp đạn */
  x: number;
  y: number;
  /** Đang bay về khay (thả sai): có chuyển động mượt trừ khi "Giảm chuyển động" */
  returning: boolean;
}

/** Quãng (điểm ảnh) con trỏ phải đi xa mới tính là kéo (còn lại là chạm) */
const DRAG_SLOP = 6;

/**
 * Bước "Nạp đạn" (spec 07, màn 9), chỉ tính XUÔI (khuôn x → mẫu công khai 5^x mod 23): bảng 3 đến 4 lọ "Thuốc x" và khay nhãn (nhãn đúng lẫn nhãn nhiễu). Kéo nhãn thả vào lọ; hoặc chạm nhãn rồi chạm lọ
 * (điện thoại, chuột); hoặc bàn phím: Tab chọn nhãn, phím 1 đến 4 đưa vào lọ. Nạp sai thì nhãn bật về khay và hiện "Chưa đúng…". Có nút Máy tính mod. Đủ nhãn thì mở nút "Bắt đầu đợt n".
 * Lớp phủ trên cảnh 2.5D: chỉ viền và nền phẳng (không bóng, không lọc).
 */
export function ChickenLoad({ state, reduced, onDrop, onStart }: ChickenLoadProps) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chips = useRef(new Map<number, HTMLButtonElement>());
  const press = useRef<{ id: number; sx: number; sy: number; pointer: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const timer = useRef(0);

  const load = state.loads[state.round];
  const keys = state.spec.rounds[state.round].keys;
  const complete = loadComplete(state);
  const tray = load.labels.filter((l) => !l.placed);
  const labelById = (id: number | null) => (id === null ? undefined : load.labels.find((l) => l.id === id));

  // Đợt mới (đổi `round`): dọn lựa chọn và thông báo
  useEffect(() => {
    setSelected(null);
    setMsg(null);
    setCalcOpen(false);
    setDrag(null);
  }, [state.round, state]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const wiggle = (id: number) => {
    const el = chips.current.get(id);
    if (!el || reduced || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'ease-out' });
  };

  const drop = useCallback(
    (labelId: number, medicine: number, from?: { x: number; y: number }) => {
      const r = onDrop(labelId, medicine);
      if (r.ok) {
        setSelected(null);
        setMsg(loadComplete(state) ? { kind: 'xong' } : { kind: 'dung', x: keys[medicine], y: r.label.value });
        setDrag(null);
      } else if (r.why === 'bounce') {
        setMsg({ kind: 'sai' });
        setSelected(null);
        const target = chips.current.get(labelId)?.getBoundingClientRect();
        const box = root.current?.getBoundingClientRect();
        if (from && target && box && !reduced) {
          // nhãn bay về khay rồi mới hiện lại
          setDrag({ id: labelId, x: from.x, y: from.y, returning: false });
          window.requestAnimationFrame(() => setDrag({ id: labelId, x: target.left + target.width / 2 - box.left, y: target.top + target.height / 2 - box.top, returning: true }));
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            setDrag(null);
            wiggle(labelId);
          }, 280);
        } else {
          setDrag(null);
          wiggle(labelId);
        }
      } else {
        setDrag(null);
      }
      bump();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDrop, state, keys, reduced],
  );

  // Phím 1 đến 4: đưa nhãn đang chọn (hay nhãn đang có tiêu điểm) vào lọ tương ứng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        setSelected(null);
        return;
      }
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (!m) return;
      const n = Number(m[1]) - 1;
      if (n >= keys.length) return;
      e.preventDefault();
      const focused = t?.closest?.('[data-label]');
      const fromFocus = focused ? Number(focused.getAttribute('data-label')) : null;
      const id = selected ?? fromFocus;
      if (id === null) return setMsg({ kind: 'chon' });
      drop(id, n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys.length, selected, drop]);

  const relative = (clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    return { x: clientX - (box?.left ?? 0), y: clientY - (box?.top ?? 0) };
  };

  const onChipDown = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    if (e.button !== 0) return;
    press.current = { id, sx: e.clientX, sy: e.clientY, pointer: e.pointerId, dragging: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onChipMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || p.pointer !== e.pointerId) return;
    if (!p.dragging && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < DRAG_SLOP) return;
    p.dragging = true;
    setSelected(p.id);
    setDrag({ ...relative(e.clientX, e.clientY), id: p.id, returning: false });
  };
  const onChipUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || p.pointer !== e.pointerId) return;
    press.current = null;
    if (!p.dragging) return; // chạm: để onClick chọn nhãn
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el instanceof HTMLElement && el.dataset.jar !== undefined) as HTMLElement | undefined;
    if (hit?.dataset.jar !== undefined) drop(p.id, Number(hit.dataset.jar), relative(e.clientX, e.clientY));
    else setDrag(null);
  };

  const msgText =
    msg === null
      ? complete
        ? fmt(chickenUi.napXong, { so: state.round + 1 })
        : ''
      : msg.kind === 'dung'
        ? fmt(chickenUi.napDung, { x: msg.x, y: msg.y })
        : msg.kind === 'sai'
          ? chickenUi.napSai
          : msg.kind === 'chon'
            ? chickenUi.napChonTruoc
            : fmt(chickenUi.napXong, { so: state.round + 1 });
  const bad = msg?.kind === 'sai';
  const picked = labelById(selected);

  return (
    <div ref={root} className="absolute inset-x-[1.5%] inset-y-[2%] z-10 flex flex-col gap-1.5 rounded-2xl border-[3px] border-nau-go bg-giay p-2" role="group" aria-label={fmt(chickenUi.napTieuDe, { so: state.round + 1, max: state.spec.rounds.length })} data-testid="nap-dan" data-round={state.round}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-extrabold leading-tight sm:text-lg" data-testid="nap-tieu-de">
            {fmt(chickenUi.napTieuDe, { so: state.round + 1, max: state.spec.rounds.length })}
          </h2>
          <p className="text-sm leading-snug">{rich(chickenUi.napHuongDan)}</p>
        </div>
        <div className="h-11 w-[13.5rem] shrink-0" />
      </div>

      <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }} data-testid="lo-thuoc">
        {keys.map((x, i) => {
          const placed = labelById(load.slots[i]);
          return (
            <button
              key={x}
              type="button"
              data-jar={i}
              data-testid="lo"
              data-filled={placed ? 'yes' : 'no'}
              aria-label={placed ? fmt(chickenUi.loCoNhan, { x, y: placed.value }) : fmt(chickenUi.loTrongDoc, { x, so: i + 1 })}
              aria-keyshortcuts={String(i + 1)}
              disabled={!!placed}
              onClick={() => {
                if (placed) return;
                if (selected === null) return setMsg({ kind: 'chon' });
                drop(selected, i);
              }}
              className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border-[3px] bg-white text-left outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${placed ? 'border-xanh-la' : picked ? 'border-muc-tim' : 'border-nau-go'}`}
            >
              <span className="flex items-center gap-1.5 border-b-2 border-nau-go bg-giay px-2 py-1 font-display text-sm font-extrabold sm:text-base">
                <span className="size-3.5 shrink-0 rounded-full border-2 border-nau-go" style={{ background: MEDICINE_COLORS[i] }} aria-hidden="true" />
                <span>{fmt(chickenUi.thuoc, { x })}</span>
                <span className="ml-auto rounded border border-nau-go px-1 text-sm leading-none" aria-hidden="true">
                  {i + 1}
                </span>
              </span>
              <span className="grid flex-1 place-items-center p-1">
                {placed ? (
                  <span className="grid min-h-11 min-w-14 place-items-center rounded-xl border-[3px] border-xanh-la bg-giay px-3 font-display text-xl font-extrabold text-xanh-la-dam" data-testid="nhan-da-nap">
                    {placed.value}
                  </span>
                ) : (
                  <span className="grid min-h-11 w-full place-items-center rounded-xl border-2 border-dashed border-nau-go px-1 text-center text-sm leading-tight">{chickenUi.loTrong}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2" role="group" aria-label={chickenUi.khayDoc} data-testid="khay-nhan">
        <span className="shrink-0 font-display text-sm font-extrabold">{chickenUi.khay}</span>
        <div className="flex min-h-12 flex-1 flex-wrap items-center gap-2 rounded-xl border-2 border-nau-go bg-white/70 px-2 py-1">
          {tray.map((l) => {
            const hidden = drag !== null && drag.id === l.id;
            return (
              <button
                key={l.id}
                ref={(el) => {
                  if (el) chips.current.set(l.id, el);
                  else chips.current.delete(l.id);
                }}
                type="button"
                data-label={l.id}
                data-testid="nhan"
                data-kind={l.kind}
                data-value={l.value}
                aria-label={selected === l.id ? fmt(chickenUi.nhanChon, { y: l.value }) : fmt(chickenUi.nhanDoc, { y: l.value })}
                aria-pressed={selected === l.id}
                onFocus={() => setSelected(l.id)}
                onClick={() => {
                  if (suppressClick.current) return;
                  setSelected(l.id); // bỏ chọn bằng Escape (nhấn chuột đã làm nhãn có tiêu điểm, tức đã chọn, nên không đổi qua lại)
                }}
                onPointerDown={(e) => onChipDown(e, l.id)}
                onPointerMove={onChipMove}
                onPointerUp={onChipUp}
                onPointerCancel={() => {
                  press.current = null;
                  setDrag(null);
                }}
                style={{ touchAction: 'none', visibility: hidden ? 'hidden' : 'visible' }}
                className={`min-h-11 min-w-14 cursor-grab select-none rounded-xl border-[3px] bg-giay px-3 font-display text-xl font-extrabold outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${selected === l.id ? 'border-muc-tim bg-white' : 'border-nau-go'}`}
              >
                {l.value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p role="status" aria-live="polite" className={`min-w-0 flex-1 rounded-xl border-2 px-2 py-1 text-sm font-bold leading-snug ${msgText === '' ? 'invisible' : bad ? 'border-do-son bg-white text-do-son-dam' : 'border-xanh-la bg-white text-xanh-la-dam'}`} data-testid="nap-thong-bao" data-kind={msg?.kind ?? (complete ? 'xong' : 'none')}>
          <span className="sr-only">{plainPower(msgText)}</span>
          <span aria-hidden="true">{rich(msgText || ' ')}</span>
        </p>
        <Button size="md" className="min-h-11 shrink-0" disabled={!complete} data-testid="nut-bat-dau-dot" onClick={onStart}>
          {fmt(chickenUi.batDau, { so: state.round + 1 })}
        </Button>
      </div>

      <ModCalculator open={calcOpen} onOpenChange={setCalcOpen} className="absolute right-14 top-2 z-30" />

      {drag && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-20 grid min-h-11 min-w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-[3px] border-muc-tim bg-white px-3 font-display text-xl font-extrabold"
          style={{ left: drag.x, top: drag.y, transition: drag.returning && !reduced ? 'left 0.26s ease-out, top 0.26s ease-out' : undefined }}
          data-testid="nhan-keo"
        >
          {labelById(drag.id)?.value}
        </span>
      )}
    </div>
  );
}
