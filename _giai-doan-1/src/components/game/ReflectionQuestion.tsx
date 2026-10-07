import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { sound } from '../../lib/sound';

export interface ReflectionQuestionProps {
  question: string;
  options: string[];
  explanation?: string;
  onAnswered?: (selectedIdx: number) => void;
  className?: string;
}

export const ReflectionQuestion: React.FC<ReflectionQuestionProps> = ({
  question,
  options,
  explanation,
  onAnswered,
  className = '',
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (idx: number) => {
    if (submitted) return;
    sound.playClick();
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    sound.playClick();
    setSubmitted(true);
    onAnswered?.(selected);
  };

  return (
    <Card variant="paper" className={`p-5 ${className}`}>
      <div className="text-xs font-bold text-[#5B3FD6] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>💭</span> Câu hỏi suy ngẫm
      </div>
      <p className="font-display font-bold text-base text-[#2A2340] mb-4">
        {question}
      </p>

      <div className="space-y-2 mb-4">
        {options.map((opt, idx) => {
          const isChosen = selected === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={submitted}
              onClick={() => handleSelect(idx)}
              className={`
                w-full text-left p-3 rounded-[12px] border-2 transition-all font-medium text-sm
                flex items-center gap-3 cursor-pointer
                ${
                  isChosen
                    ? 'border-[#5B3FD6] bg-[#5B3FD6]/10 text-[#5B3FD6]'
                    : 'border-[#E3E0EE] bg-white hover:border-[#D0CCE0] text-[#2A2340]'
                }
                ${submitted ? 'cursor-default' : ''}
              `}
            >
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                  isChosen
                    ? 'border-[#5B3FD6] bg-[#5B3FD6] text-white'
                    : 'border-[#D0CCE0] text-[#6B6485]'
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <Button
          variant="purple"
          size="sm"
          disabled={selected === null}
          onClick={handleSubmit}
        >
          Chốt lựa chọn
        </Button>
      ) : (
        explanation && (
          <div className="p-3 bg-white rounded-[12px] border border-[#E3E0EE] text-xs sm:text-sm text-[#6B6485] leading-relaxed">
            <span className="font-bold text-[#2A2340]">Góc nhìn mở rộng: </span>
            {explanation}
          </div>
        )
      )}
    </Card>
  );
};
