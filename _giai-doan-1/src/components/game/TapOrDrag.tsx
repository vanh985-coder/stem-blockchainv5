import React, { createContext, useContext, useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { sound } from '../../lib/sound';

interface TapOrDragContextValue {
  selectedId: string | null;
  selectItem: (id: string | null) => void;
  placeInSlot: (slotId: string) => void;
}

const TapOrDragContext = createContext<TapOrDragContextValue | null>(null);

export interface TapOrDragContainerProps {
  children: React.ReactNode;
  onDropOrPlace: (itemId: string, slotId: string) => void;
}

export const TapOrDragContainer: React.FC<TapOrDragContainerProps> = ({
  children,
  onDropOrPlace,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
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
};

export function useTapOrDrag(): TapOrDragContextValue {
  const ctx = useContext(TapOrDragContext);
  if (!ctx) {
    throw new Error('useTapOrDrag phải được bọc trong TapOrDragContainer');
  }
  return ctx;
}

/**
 * Thẻ có thể kéo thả HOẶC chạm chọn
 */
export interface DraggableProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const DraggableCard: React.FC<DraggableProps> = ({
  id,
  disabled = false,
  children,
  className = '',
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const { selectedId, selectItem } = useTapOrDrag();
  const isSelected = selectedId === id;

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : {};

  const handleTap = () => {
    if (disabled) return;
    if (isSelected) {
      selectItem(null); // Bỏ chọn
    } else {
      selectItem(id); // Chọn
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
        }
      }}
      className={`
        touch-none select-none transition-shadow cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-80 scale-105 shadow-sticker-lg z-50' : ''}
        ${isSelected ? 'ring-4 ring-[#5B3FD6] ring-offset-2 scale-102' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        focus-visible:outline-3 focus-visible:outline-[#5B3FD6]
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * Ô nhận thẻ (kéo vào thả HOẶC chạm vào để đặt)
 */
export interface DroppableProps {
  id: string;
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export const DroppableSlot: React.FC<DroppableProps> = ({
  id,
  children,
  placeholder,
  className = '',
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const { selectedId, placeInSlot } = useTapOrDrag();

  const handleTapSlot = () => {
    if (selectedId) {
      placeInSlot(id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleTapSlot}
      role="region"
      aria-label={placeholder || 'Ô đặt thẻ'}
      className={`
        relative rounded-[16px] border-2 border-dashed transition-all duration-150
        flex items-center justify-center p-3 select-none
        ${
          isOver
            ? 'border-[#1FAF5A] bg-[#1FAF5A]/10 scale-102 shadow-sticker'
            : selectedId
              ? 'border-[#5B3FD6] bg-[#5B3FD6]/5 cursor-pointer animate-pulse'
              : 'border-[#D0CCE0] bg-[#F6F5FB]'
        }
        ${className}
      `}
    >
      {children ? (
        children
      ) : (
        <span className="text-xs sm:text-sm font-semibold text-[#6B6485] text-center">
          {selectedId ? 'Chạm để đặt vào đây' : placeholder || 'Kéo hoặc chạm đặt vào đây'}
        </span>
      )}
    </div>
  );
};
