import { GAME_CONFIG } from '../config/gameConfig';

export const MOD = 100;

export function pageCode(
  prevCode: number,
  content: number,
  multiplier: number = GAME_CONFIG.lesson1.multiplier
): number {
  return (((prevCode * multiplier + content) % MOD) + MOD) % MOD;
}

export function buildChain(
  genesisCode: number,
  contents: number[],
  multiplier: number = GAME_CONFIG.lesson1.multiplier
): number[] {
  const codes: number[] = [];
  let prev = genesisCode;
  for (const c of contents) {
    prev = pageCode(prev, c, multiplier);
    codes.push(prev);
  }
  return codes;
}

export function isSafeDelta(
  oldContent: number,
  newContent: number,
  multiplier: number = GAME_CONFIG.lesson1.multiplier
): boolean {
  const d = (((newContent - oldContent) % MOD) + MOD) % MOD;
  if (d === 0) return false;
  let x = d;
  for (let j = 0; j < 12; j++) {
    x = (x * multiplier) % MOD;
    if (x === 0) return false;
  }
  return true;
}
