// Logic toán và các hàm tạo đề cho Bài 3: Khóa riêng & khóa công khai
// Hàm thuần túy, không import React. Mọi hàm ngẫu nhiên nhận rng: () => number

export const P = 23, G = 5, Q = 22;

export function modPow(base: number, exp: number, mod: number): number {
  let r = 1; base %= mod; if (base < 0) base += mod;
  while (exp > 0) {
    if (exp & 1) r = (r * base) % mod;
    base = (base * base) % mod;
    exp = Math.floor(exp / 2);
  }
  return r;
}
// Lưu ý: dùng Math.floor thay vì >> để modPow dùng được cho p = 1.000.003 (mọi tích < 10^12).

export const publicKey = (x: number) => modPow(G, x, P);

export function hash(message: string, r: number): number {
  const msg = message.normalize('NFC');
  let h = r;
  Array.from(msg).forEach((ch, i) => { h += ch.codePointAt(0)! * (i + 1); });
  return h % Q;
}

export type Signature = { r: number; s: number };

export function sign(x: number, message: string, k: number): Signature {
  const r = modPow(G, k, P);
  const e = hash(message, r);
  return { r, s: (k + x * e) % Q };
}

export function verify(y: number, message: string, sig: Signature): boolean {
  const e = hash(message, sig.r);
  return modPow(G, sig.s, P) === (sig.r * modPow(y, e, P)) % P;
}

// Chữ ký "chỉ khớp đúng một khóa". BẮT BUỘC dùng cho mọi chữ ký hiển thị.
// (Với k = 14 và câu "Chuyển 3 xu cho An", e = 0 nên chữ ký khớp MỌI khóa; vì vậy phải thử lại.)
export function signUnique(x: number, message: string, candidateKeys: number[], rng: () => number): Signature {
  const own = publicKey(x);
  let last: Signature | null = null;
  for (let t = 0; t < 50; t++) {
    const k = 1 + Math.floor(rng() * 21); // 1..21
    const sig = sign(x, message, k);
    last = sig;
    const matches = Array.from(new Set([...candidateKeys, own])).filter(y => verify(y, message, sig));
    if (matches.length === 1 && matches[0] === own) return sig;
  }
  // Dự phòng (gần như không xảy ra): duyệt k = 1..21 theo thứ tự
  for (let k = 1; k <= 21; k++) {
    const sig = sign(x, message, k);
    const matches = Array.from(new Set([...candidateKeys, own])).filter(y => verify(y, message, sig));
    if (matches.length === 1 && matches[0] === own) return sig;
  }
  return last!;
}

// Dữ liệu nhân vật (dùng thống nhất cả bài):
export const PEOPLE = [
  { id: 'em',   privateKey: 12, publicKey: 18 },
  { id: 'an',   privateKey: 15, publicKey: 19 },
  { id: 'binh', privateKey: 17, publicKey: 15 },
  { id: 'chi',  privateKey: 19, publicKey: 7  },
  { id: 'dung', privateKey: 21, publicKey: 14 },
  { id: 'ti',   privateKey: 13, publicKey: 21 },
] as const;

export const STRANGER = { privateKey: 16, publicKey: 3 } as const; // khóa lạ, KHÔNG có trong danh bạ
export const DIRECTORY_KEYS = [18, 19, 15, 7, 14, 21];

// Tìm các khóa công khai khớp chữ ký
export function findSigner(message: string, sig: Signature, keys: number[]): number[] {
  return keys.filter((y) => verify(y, message, sig));
}

export type MediumTx = {
  id: string;
  senderId: 'an' | 'binh' | 'chi' | 'dung';
  amount: number;
  message: string;
  sig: Signature;
  attachedKey?: number;
  isFake: boolean;
  signerKey: number;
};

// Tạo 4 giao dịch cho Mức Trung bình
export function generateMedium(rng: () => number, userName: string): MediumTx[] {
  const senders: ('an' | 'binh' | 'chi' | 'dung')[] = ['an', 'binh', 'chi', 'dung'];
  // Xáo trộn thứ tự người gửi
  for (let i = senders.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [senders[i], senders[j]] = [senders[j], senders[i]];
  }

  // Chọn đúng 2 giao dịch là giả
  const fakeFlags = [true, true, false, false];
  for (let i = fakeFlags.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fakeFlags[i], fakeFlags[j]] = [fakeFlags[j], fakeFlags[i]];
  }

  const candidateKeys = [...DIRECTORY_KEYS, STRANGER.publicKey];

  return senders.map((senderId, idx) => {
    const amount = 1 + Math.floor(rng() * 20); // 1..20
    const message = `Chuyển ${amount} xu cho ${userName || 'Em'}`;
    const isFake = fakeFlags[idx];

    if (isFake) {
      // Kẻ mạo danh: Tí (13/21) hoặc khóa lạ (16/3)
      const isTi = rng() < 0.5;
      const impostor = isTi
        ? { privateKey: 13, publicKey: 21 }
        : { privateKey: STRANGER.privateKey, publicKey: STRANGER.publicKey };

      const sig = signUnique(impostor.privateKey, message, candidateKeys, rng);

      return {
        id: `tx-${idx}-${senderId}-${isFake ? 'fake' : 'real'}`,
        senderId,
        amount,
        message,
        sig,
        attachedKey: impostor.publicKey,
        isFake: true,
        signerKey: impostor.publicKey,
      };
    } else {
      // Giao dịch thật: người gửi ký bằng khóa riêng của mình
      const person = PEOPLE.find((p) => p.id === senderId)!;
      const sig = signUnique(person.privateKey, message, candidateKeys, rng);

      return {
        id: `tx-${idx}-${senderId}-${isFake ? 'fake' : 'real'}`,
        senderId,
        amount,
        message,
        sig,
        attachedKey: person.publicKey,
        isFake: false,
        signerKey: person.publicKey,
      };
    }
  });
}

// Thuật toán Brute force dò khóa dạng bước
export type BruteState = {
  p: number;
  g: number;
  target: number;
  x: number;
  cur: number;
  tries: number;
  found: number | null;
};

export function startBrute(p: number, g: number, target: number): BruteState {
  return { p, g, target, x: 0, cur: 1, tries: 0, found: null };
}

export function stepBrute(state: BruteState, budget: number): BruteState {
  if (state.found !== null) return state;
  let { p, g, target, x, cur, tries } = state;
  let steps = 0;
  while (steps < budget && x < p) {
    x++;
    cur = (cur * g) % p;
    tries++;
    steps++;
    if (cur === target) {
      return { p, g, target, x, cur, tries, found: x };
    }
  }
  return { p, g, target, x, cur, tries, found: null };
}

// Hằng số ước tính lý thuyết (dùng hiển thị ở Mức Khó)
export const ESTIMATES = {
  totalPossibilities: '1,16 × 10^77',
  supercomputerTriesPerSec: '10^18',
  supercomputerYears: '3,7 × 10^51',
  smartSteps: '2^128',
  smartYears: '1,1 × 10^13',
  universeAgeYears: '13,8 tỷ',
  universeMultiplier: 780,
} as const;
