import { createContext, useContext, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';

interface TapOrDragContextValue {
  selectedId: string | null;
  selectItem: (id: string | null) => void;
  placeInSlot: (slotId: string) => void;
}

const TapOrDragContext = createContext<TapOrDragContextValue | null>(null);

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
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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

  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : {};

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
      ref={setNodeRef}
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
        isDragging ? 'z-50 scale-105 opacity-80 shadow-[0_6px_0_0_var(--color-nau-go)]' : '',
        isSelected ? 'ring-4 ring-muc-tim ring-offset-2' : '',
        disabled ? 'cursor-not-allowed opacity-50' : '',
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
