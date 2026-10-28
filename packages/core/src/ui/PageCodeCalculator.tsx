import { useId, useState } from 'react';
import { pageCodeCalculatorUi as T } from '../content/pageCodeCalculator';
import { fmt } from '../content/characters';
import { pageCode } from '../lib/chain';
import { parsePageCodeInput } from '../lib/pageCodeInput';

/** Manual scratch calculator: deliberately receives no values from the question. */
export function PageCodeCalculator() {
  const id = useId();
  const [xText, setX] = useState('');
  const [cText, setC] = useState('');
  const x = parsePageCodeInput(xText);
  const c = parsePageCodeInput(cText);
  const invalid = (xText.trim() !== '' && x === null) || (cText.trim() !== '' && c === null);
  return (
    <section aria-label={T.title} data-testid="page-code-calculator" className="w-full space-y-2 rounded-2xl border-[3px] border-nau-go bg-giay p-3">
      <h3 className="font-display font-extrabold">{T.title}</h3>
      <p className="text-sm font-bold">{T.formula}</p>
      <div className="grid grid-cols-2 gap-3">
        {([{ key: 'x', label: T.x, value: xText, set: setX }, { key: 'c', label: T.c, value: cText, set: setC }] as const).map((field) => (
          <div key={field.key}>
            <label htmlFor={`${id}-${field.key}`} className="block text-sm font-bold">{field.label}</label>
            <input id={`${id}-${field.key}`} data-testid={`page-code-${field.key}`} type="text" inputMode="numeric" autoComplete="off" value={field.value} onChange={(e) => field.set(e.target.value)} className="min-h-11 w-full rounded-xl border-2 border-nau-go bg-white px-3 py-1 font-display text-xl font-extrabold" />
          </div>
        ))}
      </div>
      <p role="status" aria-live="polite" data-testid="page-code-result" className="min-h-[1.5em] break-words font-display font-extrabold">
        {invalid ? <span className="text-sm text-do-son-dam">{T.error}</span> : x !== null && c !== null ? fmt(T.result, { x, c, y: pageCode(x, c) }) : null}
      </p>
    </section>
  );
}
