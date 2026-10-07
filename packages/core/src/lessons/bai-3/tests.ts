// Unit tests cho Bài 3: Khóa riêng & khóa công khai
import {
  P,
  G,
  modPow,
  publicKey,
  hash,
  sign,
  verify,
  signUnique,
  findSigner,
  PEOPLE,
  STRANGER,
  DIRECTORY_KEYS,
  generateMedium,
  startBrute,
  stepBrute,
} from './logic';
import { createMulberry32 } from '../../lib/rng';

export const tests: { name: string; expected: unknown; actual: () => unknown }[] = [
  {
    name: 'L3.T1: Bảng tra publicKey(x) cho x = 1..22',
    expected: [5, 2, 10, 4, 20, 8, 17, 16, 11, 9, 22, 18, 21, 13, 19, 3, 15, 6, 7, 12, 14, 1],
    actual: () => {
      const res: number[] = [];
      for (let x = 1; x <= 22; x++) {
        res.push(publicKey(x));
      }
      return res;
    },
  },
  {
    name: 'L3.T2: publicKey(12) === 18 và publicKey(15) === 19',
    expected: [18, 19],
    actual: () => [publicKey(12), publicKey(15)],
  },
  {
    name: 'L3.T3: sign(12, "Chuyển 3 xu cho An", 5) === { r: 20, s: 1 }',
    expected: { r: 20, s: 1 },
    actual: () => sign(12, 'Chuyển 3 xu cho An', 5),
  },
  {
    name: 'L3.T4: verify với các khóa (18: true, 21: false, 19: false)',
    expected: [true, false, false],
    actual: () => {
      const sig = { r: 20, s: 1 };
      const msg = 'Chuyển 3 xu cho An';
      return [
        verify(18, msg, sig),
        verify(21, msg, sig),
        verify(19, msg, sig),
      ];
    },
  },
  {
    name: 'L3.T5: hash = 0 và sign với k=14 khớp cả 7 khóa (lý do cần signUnique)',
    expected: { hashVal: 0, matchCount: 7 },
    actual: () => {
      const msg = 'Chuyển 3 xu cho An';
      // Với k = 14: r = 5^14 mod 23 = 13.
      const r = modPow(G, 14, P);
      const e = hash(msg, r);
      const sig = sign(12, msg, 14);
      const all7 = [18, 19, 15, 7, 14, 21, 3];
      const matches = all7.filter((y) => verify(y, msg, sig));
      return { hashVal: e, matchCount: matches.length };
    },
  },
  {
    name: 'L3.T6: Mọi PEOPLE có publicKey đúng theo bảng và publicKey(16) === 3',
    expected: true,
    actual: () => {
      const peopleOk = PEOPLE.every((p) => publicKey(p.privateKey) === p.publicKey);
      const strangerOk = publicKey(STRANGER.privateKey) === STRANGER.publicKey;
      return peopleOk && strangerOk;
    },
  },
  {
    name: 'L3.T7: Dễ phần 2: publicKey của 3,5,6,7,9 = 10,20,8,17,11 và 16,9 không thuộc đáp án',
    expected: { keys: [10, 20, 8, 17, 11], distractorsValid: false },
    actual: () => {
      const keys = [3, 5, 6, 7, 9].map(publicKey);
      const distractorsValid = keys.includes(16) || keys.includes(9);
      return { keys, distractorsValid };
    },
  },
  {
    name: 'L3.T8: signUnique với 50 seed: chữ ký chỉ khớp đúng khóa 18',
    expected: true,
    actual: () => {
      const msg = 'Chuyển 3 xu cho An';
      for (let seed = 1; seed <= 50; seed++) {
        const rng = createMulberry32(seed);
        const sig = signUnique(12, msg, DIRECTORY_KEYS, rng);
        const matches = DIRECTORY_KEYS.filter((y) => verify(y, msg, sig));
        if (matches.length !== 1 || matches[0] !== 18) {
          return false;
        }
      }
      return true;
    },
  },
  {
    name: 'L3.T9: generateMedium với 200 seed: 4 giao dịch, đúng 2 giả, đúng luật',
    expected: true,
    actual: () => {
      let seenTi = false;
      let seenStranger = false;

      const candidateKeys = [...DIRECTORY_KEYS, STRANGER.publicKey]; // [18, 19, 15, 7, 14, 21, 3]

      for (let seed = 1; seed <= 200; seed++) {
        const rng = createMulberry32(seed);
        const txs = generateMedium(rng, 'Em');

        // a. Đúng 4 tx, người gửi là ['an', 'binh', 'chi', 'dung'], đúng 2 isFake
        if (txs.length !== 4) return { error: 'txs.length !== 4', seed };
        const senders = txs.map((t) => t.senderId).sort();
        if (senders.join(',') !== 'an,binh,chi,dung') return { error: 'senders mismatch', seed, senders };
        const fakeTxs = txs.filter((t) => t.isFake);
        const realTxs = txs.filter((t) => !t.isFake);
        if (fakeTxs.length !== 2 || realTxs.length !== 2) return { error: 'fake/real count mismatch', seed };

        // Mọi giao dịch đều phải có attachedKey
        for (const t of txs) {
          if (t.attachedKey === undefined) return { error: 'missing attachedKey', seed, t };
        }

        // b. Tx giả: attachedKey có tồn tại và bằng khóa công khai của kẻ mạo danh (21 hoặc 3);
        // verify(attachedKey) = true; verify(directoryKey của senderId) = false;
        // findSigner(message, sig, [...DIRECTORY_KEYS, 3]) trả về [attachedKey].
        for (const ft of fakeTxs) {
          if (ft.attachedKey === undefined) return { error: 'fake missing attachedKey', seed, ft };
          if (ft.attachedKey !== 21 && ft.attachedKey !== 3) return { error: 'fake attachedKey not 21 or 3', seed, ft };
          if (ft.attachedKey === 21) seenTi = true;
          if (ft.attachedKey === 3) seenStranger = true;

          if (!verify(ft.attachedKey, ft.message, ft.sig)) return { error: 'fake verify(attachedKey) !== true', seed, ft };

          const claimedPerson = PEOPLE.find((p) => p.id === ft.senderId)!;
          if (verify(claimedPerson.publicKey, ft.message, ft.sig)) return { error: 'fake verify(claimedPerson) === true', seed, ft };

          const signers = findSigner(ft.message, ft.sig, candidateKeys);
          if (signers.length !== 1 || signers[0] !== ft.attachedKey) return { error: 'fake findSigner mismatch', seed, ft, signers };
        }

        // c. Tx thật: findSigner(message, sig, [...DIRECTORY_KEYS, 3]) trả về [claimedPerson.publicKey];
        // thẻ thật có attachedKey bằng đúng khóa danh bạ của người gửi.
        for (const rt of realTxs) {
          const claimedPerson = PEOPLE.find((p) => p.id === rt.senderId)!;
          const signers = findSigner(rt.message, rt.sig, candidateKeys);
          if (signers.length !== 1 || signers[0] !== claimedPerson.publicKey) return { error: 'real findSigner mismatch', seed, rt, signers };

          if (rt.attachedKey !== claimedPerson.publicKey) return { error: 'real attachedKey mismatch', seed, rt };
        }
      }

      // d. Qua 200 seed, cả 2 kẻ mạo danh (Tí 21 và người lạ 3) đều phải xuất hiện.
      if (!seenTi || !seenStranger) {
        return {
          error: 'variety not met',
          seenTi,
          seenStranger,
        };
      }

      return true;
    },
  },
  {
    name: 'L3.T10: stepBrute cho các cấu hình (p=23, p=101, p=1.000.003)',
    expected: { found23: 15, found101: 77, found1M: 999999 },
    actual: () => {
      // 1. p = 23, g = 5, target = 19
      let s23 = startBrute(23, 5, 19);
      s23 = stepBrute(s23, 100);

      // 2. p = 101, g = 2, target = modPow(2, 77, 101)
      const target101 = modPow(2, 77, 101);
      let s101 = startBrute(101, 2, target101);
      s101 = stepBrute(s101, 200);

      // 3. p = 1.000.003, g = 2, priv = 999.999
      const p1M = 1000003;
      const target1M = modPow(2, 999999, p1M);
      let s1M = startBrute(p1M, 2, target1M);
      // stepBrute với budget 100.000 mỗi lần cho đến khi tìm ra
      while (s1M.found === null && s1M.tries < p1M) {
        s1M = stepBrute(s1M, 100000);
      }

      return {
        found23: s23.found,
        found101: s101.found,
        found1M: s1M.found,
      };
    },
  },
];
