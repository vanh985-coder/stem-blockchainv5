import { useState } from 'react';
import { sound } from '../audio/sound';
import { ui } from '../content/ui';
import { Button } from './Button';
import { Panel } from './Panel';

export interface ReflectionQuestionProps {
  question: string;
  options: readonly string[];
  explanation?: string;
  onAnswered?: (selectedIdx: number) => void;
  className?: string;
}

/** Câu hỏi suy ngẫm cuối trạm: chọn gì cũng được, không tính điểm; chốt xong hiện lời giải thích. */
export function ReflectionQuestion({ question, options, explanation, onAnswered, className = '' }: ReflectionQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (selected === null) return;
    sound.playClick();
    setSubmitted(true);
    onAnswered?.(selected);
  };

  return (
    <Panel className={className}>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muc-tim-dam">
        <span aria-hidden="true">💭</span> {ui.suyNgam.tieuDe}
      </div>
      <p className="mb-4 font-display text-lg font-extrabold leading-snug">{question}</p>

      <div className="mb-4 space-y-2" role="radiogroup" aria-label={question}>
        {options.map((opt, idx) => {
          const chosen = selected === idx;
          return (
            <button
              key={idx}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={submitted}
              onClick={() => {
                if (submitted) return;
                sound.playClick();
                setSelected(idx);
              }}
              className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-nut border-2 p-3 text-left text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${
                chosen ? 'border-muc-tim bg-muc-tim/15' : 'border-nau-go bg-giay'
              } ${submitted ? 'cursor-default' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${
                  chosen ? 'border-muc-tim bg-muc-tim text-white' : 'border-nau-go'
                }`}
              >
                {chosen ? '✓' : String.fromCharCode(65 + idx)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <Button size="sm" disabled={selected === null} onClick={submit}>
          {ui.suyNgam.chot}
        </Button>
      ) : (
        explanation && (
          <div className="rounded-xl border-2 border-nau-go/50 bg-white/70 p-3 text-base leading-relaxed" role="status">
            <span className="font-bold">{ui.suyNgam.gocNhin}</span>
            {explanation}
          </div>
        )
      )}
    </Panel>
  );
}
