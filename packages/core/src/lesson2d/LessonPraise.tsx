import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { onAnswer } from '../audio/answerSignal';
import { lessonPraise } from '../content/lessonPraise';
import { useSettings } from '../settings/SettingsProvider';
import './lessonPraise.css';
import { praiseSession } from './praiseSession';

/** No replay: each answer replaces the previous short burst. */
export function LessonPraise({ onResult }: { onResult?: (correct: boolean) => void }) {
  const { settings } = useSettings();
  const callback = useRef(onResult);
  callback.current = onResult;
  const [event, setEvent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [systemReduced, setSystemReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(media.matches);
    media.addEventListener('change', change);
    change();
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const unsubscribe = onAnswer(correct => callback.current?.(correct));
    const dispose = praiseSession(correct => {
      setVisible(correct);
      if (!correct) return;
      setEvent(n => n + 1);
    });
    return () => { unsubscribe(); dispose(); };
  }, []);
  return <div className="lesson-praise" data-testid="lesson-praise" role="status" aria-live="polite" aria-atomic="true">
    {visible && <span key={event} data-event={event}>
      {lessonPraise[(event - 1) % lessonPraise.length]}
      {!settings.reducedMotion && !systemReduced && <span aria-hidden="true" className="lesson-fireworks">
        {Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--angle': `${i * 30}deg`, '--reach': `${20 + (i % 3) * 8}px`, '--origin': i < 12 ? '15%' : '85%', '--spark': ['#3FA34D', '#F2B33D', '#5B3FD6'][i % 3] } as CSSProperties} />)}
      </span>}
    </span>}
  </div>;
}
