import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { layoutScale, pickDropSlot } from './dropTarget';

interface TapOrDragContextValue {
  selectedId: string | null;
  selectItem: (id: string | null) => void;
  placeInSlot: (slotId: string) => void;
}

const TapOrDragContext = createContext<TapOrDragContextValue | null>(null);

/**
 * Ô nhận do vị trí của CHIẾC LÁ (thẻ đang kéo), không do con trỏ: giao ≥ 30% diện tích thẻ hoặc tâm thẻ trong ô, chọn ô giao
 * nhiều nhất (`pickDropSlot`). Ô nào được chọn thì `isOver` của nó bật nên viền sáng khi thẻ đủ điều kiện thả.
 */
const byCardOverlap: CollisionDetection = ({ collisionRect, droppableRects, droppableContainers }) => {
  const slots = droppableContainers.flatMap((c) => {
    const r = droppableRects.get(c.id);
    return r ? [{ id: String(c.id), rect: { left: r.left, top: r.top, width: r.width, height: r.height } }] : [];
  });
  const id = pickDropSlot({ left: collisionRect.left, top: collisionRect.top, width: collisionRect.width, height: collisionRect.height }, slots);
  const container = id === null ? undefined : droppableContainers.find((c) => String(c.id) === id);
  return container ? [{ id: container.id, data: { droppableContainer: container } }] : [];
};

export interface TapOrDragContainerProps {
  children: ReactNode;
  onDropOrPlace: (itemId: string, slotId: string) => void;
}

/** Vùng cho phép kéo thả HOẶC chạm chọn rồi chạm ô đích (dùng được trên điện thoại và bàn phím). */
export function TapOrDragContainer({ children, onDropOrPlace }: TapOrDragContainerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id) {
      sound.playClick();
      onDropOrPlace(String(active.id), String(over.id));
    }
  };

  const selectItem = (id: string | null) => {
    sound.playClick();
    setSelectedId(id);
  };

  const placeInSlot = (slotId: string) => {
    if (!selectedId) return;
    sound.playClick();
    onDropOrPlace(selectedId, slotId);
    setSelectedId(null);
  };

  return (
    <TapOrDragContext.Provider value={{ selectedId, selectItem, placeInSlot }}>
      <DndContext sensors={sensors} collisionDetection={byCardOverlap} onDragEnd={handleDragEnd}>
        {children}
      </DndContext>
    </TapOrDragContext.Provider>
  );
}

export function useTapOrDrag(): TapOrDragContextValue {
  const ctx = useContext(TapOrDragContext);
  if (!ctx) throw new Error('useTapOrDrag must be used inside TapOrDragContainer');
  return ctx;
}

export interface DraggableProps {
  id: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

/** Thẻ có thể kéo thả HOẶC chạm chọn */
export function DraggableCard({ id, disabled = false, children, className = '' }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  const { selectedId, selectItem } = useTapOrDrag();
  const isSelected = selectedId === id;

  // Thẻ nằm trong khối được phóng (zoom của trang bài học): `transform` tính theo px bố cục nên bị nhân thêm hệ số phóng,
  // thẻ trôi xa con trỏ và khác chỗ dnd-kit dùng để xét ô nhận. Chia khoảng kéo cho hệ số đó để thẻ đi đúng theo con trỏ.
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const scale = useRef(1);
  useLayoutEffect(() => {
    const parent = nodeRef.current?.parentElement;
    if (isDragging && parent) scale.current = layoutScale(parent.getBoundingClientRect().width, parent.offsetWidth);
  }, [isDragging]);
  const k = scale.current;

  // Lá đang kéo to ra 5% bằng `scale(1.05)` TRONG chuỗi transform (sau translate). Trước đây lớp Tailwind `scale-105` dùng thuộc tính `scale` riêng,
  // áp lên cả translate3d nên khoảng kéo bị nhân thêm 1,05: lá trôi xa con trỏ 5% quãng đường (thả lệch ô).
  // Thẻ đang kéo không bắt con trỏ (pointer-events: none) để không che ô bên dưới.
  const style: CSSProperties = transform
    ? { transform: `translate3d(${transform.x / k}px, ${transform.y / k}px, 0)${isDragging ? ' scale(1.05)' : ''}`, zIndex: 50, pointerEvents: isDragging ? 'none' : undefined }
    : {};

  const handleTap = () => {
    if (disabled) return;
    selectItem(isSelected ? null : id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTap();
    }
  };

  return (
    <div
      ref={(el) => {
        nodeRef.current = el;
        setNodeRef(el);
      }}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleTap}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      onKeyDown={onKeyDown}
      className={[
        'touch-none select-none transition-shadow cursor-grab active:cursor-grabbing',
        isDragging ? 'z-50 opacity-80 shadow-[0_6px_0_0_var(--color-nau-go)]' : '',
        isSelected ? 'ring-4 ring-muc-tim ring-offset-2' : '',
        disabled ? 'cursor-default' : '',
        'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export interface DroppableProps {
  id: string;
  children?: ReactNode;
  placeholder?: string;
  className?: string;
}

/** Ô nhận thẻ (kéo vào thả HOẶC chạm vào để đặt) */
export function DroppableSlot({ id, children, placeholder, className = '' }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const { selectedId, placeInSlot } = useTapOrDrag();

  return (
    <div
      ref={setNodeRef}
      onClick={() => selectedId && placeInSlot(id)}
      role="region"
      aria-label={placeholder || ui.keoTha.oDatThe}
      className={[
        'relative flex select-none items-center justify-center rounded-[16px] border-2 border-dashed p-3 transition-all duration-150',
        isOver
          ? 'scale-[1.02] border-xanh-la-dam bg-xanh-la/10'
          : selectedId
            ? 'animate-pulse cursor-pointer border-muc-tim bg-muc-tim/5'
            : 'border-nau-go/60 bg-giay/60',
        className,
      ].join(' ')}
    >
      {children ? (
        children
      ) : (
        <span className="text-center text-sm font-semibold text-nau-go-dam">
          {selectedId ? ui.keoTha.chamDeDat : placeholder || ui.keoTha.keoHoacCham}
        </span>
      )}
    </div>
  );
}
