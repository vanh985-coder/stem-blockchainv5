import { onAnswer } from '../audio/answerSignal';

/** Owns only live events and its expiry timer; never caches an answer across lessons. */
export function praiseSession(show: (correct: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastCorrect: boolean | undefined;
  let lastTime = -Infinity;
  const unsubscribe = onAnswer(correct => {
    // Stations and FeedbackSheet may report the same answer, as in choiceReactions.
    const now = performance.now();
    if (correct === lastCorrect && now - lastTime < 250) return;
    lastCorrect = correct;
    lastTime = now;
    clearTimeout(timer);
    show(correct);
    if (correct) timer = setTimeout(() => show(false), 1800);
  }, true);
  return () => { unsubscribe(); clearTimeout(timer); };
}
