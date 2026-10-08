import React from 'react';
import { Avatar, DraggableCard } from '@so-chung/core';
import { bai3Texts } from '@so-chung/core/content/lessons/bai-3';
import { PEOPLE, DIRECTORY_KEYS } from '@so-chung/core/lessons/bai-3/logic';
import { portraitOf, tenNhan } from './nguoi';

const T = bai3Texts.danhba;

export interface DanhBaProps {
  highlightIndex?: number | null;
  highlightKey?: number | null;
  selectedKey?: number | null;
  onSelectKey?: (key: number) => void;
  userName?: string;
  interactive?: boolean;
  enableDrag?: boolean;
  compact?: boolean;
  className?: string;
}

export const DanhBa: React.FC<DanhBaProps> = ({
  highlightIndex = null,
  highlightKey = null,
  selectedKey = null,
  onSelectKey,
  userName,
  interactive = false,
  enableDrag = false,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-white/70 rounded-[18px] border-2 border-nau-go/30 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-giay">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📖</span>
          <div>
            <h3 className="font-display font-extrabold text-base sm:text-lg text-chu leading-tight">{T.t01}</h3>
            <p className="text-sm text-nau-go-dam">{T.t02}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-sm font-bold bg-muc-tim/10 text-muc-tim-dam shrink-0">{T.t03}</span>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {PEOPLE.map((person, idx) => {
          const isHighlighted =
            highlightIndex === idx || highlightKey === person.publicKey;
          const isSelected = selectedKey === person.publicKey;

          return (
            <div
              key={person.id}
              onClick={() => {
                if (interactive && onSelectKey) {
                  onSelectKey(person.publicKey);
                }
              }}
              className={`
                flex items-center justify-between p-2.5 sm:p-3 rounded-[14px] border-2 transition-all duration-150 min-h-[56px]
                ${
                  isSelected
                    ? 'border-muc-tim bg-muc-tim/50 ring-2 ring-muc-tim/40 shadow-xs'
                    : isHighlighted
                    ? 'border-muc-tim bg-muc-tim/5 ring-2 ring-muc-tim/30 animate-pulse'
                    : 'border-giay bg-white/60 hover:border-nau-go/40'
                }
                ${interactive ? 'cursor-pointer active:scale-98' : ''}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar portrait={portraitOf(person.id)} size="sm" />
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-chu truncate">
                    {tenNhan(person.id, userName)}
                  </div>
                  <div className="text-sm text-nau-go-dam">{T.t07}</div>
                </div>
              </div>

              {enableDrag ? (
                <DraggableCard
                  id={`key-${person.publicKey}`}
                  className="shrink-0"
                >
                  <div
                    className={`
                      font-mono font-extrabold text-xl min-h-[40px] min-w-[48px] px-3.5 py-1 rounded-[10px] border-2 transition-all cursor-grab active:cursor-grabbing flex items-center justify-center
                      ${
                        isSelected || isHighlighted
                          ? 'bg-muc-tim text-white border-muc-tim ring-2 ring-muc-tim/10 shadow-xs'
                          : 'bg-white/70 text-muc-tim-dam border-nau-go/30 hover:border-muc-tim shadow-xs'
                      }
                    `}
                    title={T.t08}
                  >
                    {person.publicKey}
                  </div>
                </DraggableCard>
              ) : (
                <div
                  className={`
                    font-mono font-extrabold text-xl min-h-[40px] min-w-[48px] px-3.5 py-1 rounded-[10px] border-2 shrink-0 flex items-center justify-center
                    ${
                      isSelected || isHighlighted
                        ? 'bg-muc-tim text-white border-muc-tim'
                        : 'bg-white/70 text-muc-tim-dam border-nau-go/30'
                    }
                  `}
                >
                  {person.publicKey}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export { DIRECTORY_KEYS };
