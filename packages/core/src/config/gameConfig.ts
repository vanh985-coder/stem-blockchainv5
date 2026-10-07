/**
 * Cấu hình số liệu của 4 bài học (chuyển nguyên từ giai đoạn 1: lesson1 … lesson4).
 * Không chép phần appName/xp/stars/gameplay/registry (thuộc tiến độ và giao diện, làm ở bước sau) và Bài 5.
 */
export const GAME_CONFIG = {
  lesson1: {
    multiplier: 2,
    genesisMin: 10,
    genesisMax: 89,
    easyPages: 5,
    mediumPages: 5,
    hardStartPages: 6,
    hardTamperIndex: 1, // index 0-based: 1 = "trang 2"
    tamperAnimMs: 2000,
    hardDurationMs: 60000,
    spawnStartMs: 6000,
    spawnStepMs: 300,
    spawnMinMs: 3000,
    spawnFastMs: 2000,
    hardStars: { three: 8, two: 4 },
  },
  lesson2: {
    easy: {
      rounds: 5,
      hearts: 3,
      validCountOptions: [2, 3],
      wrongOffsets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20],
    },
    medium: {
      rounds: 5,
      hearts: 3,
      pagesShown: 3,
    },
    hard: {
      startStake: 100,
      deposit: 30,
      acceptThreshold: 2,
      creatorValidAccepted: 10, // lãi ròng, đã tính nhận lại cọc
      creatorCheatAccepted: 40,
      creatorMiscalcAccepted: 0,
      creatorInvalidRejected: -30,
      voterCorrect: 2,
      voterAgreeInvalid: -15,
      order: ['em', 'binh', 'ti', 'chi', 'em', 'binh', 'ti', 'chi'],
      chiMiscalcRate: 0.3,
      chiMiscalcMax: 9,
      chiRushRate: 0.25,
      tiPriors: { em: [1, 2], binh: [1, 4], chi: [1, 2] },
      tiGambleRate: 0.15,
      botThinkMs: [400, 900],
      contentMin: 1,
      contentMax: 99,
    },
  },
  lesson3: {
    p: 23,
    g: 5,
    q: 22,
    people: [
      { id: 'em', privateKey: 12, publicKey: 18 },
      { id: 'an', privateKey: 15, publicKey: 19 },
      { id: 'binh', privateKey: 17, publicKey: 15 },
      { id: 'chi', privateKey: 19, publicKey: 7 },
      { id: 'dung', privateKey: 21, publicKey: 14 },
      { id: 'ti', privateKey: 13, publicKey: 21 },
    ],
    stranger: { privateKey: 16, publicKey: 3 },
    bruteConfigs: [
      { p: 101, g: 2 },
      { p: 1009, g: 11 },
      { p: 1000003, g: 2 },
    ],
    verifyScanDelayMs: 150,
    hardAutoStepMs: 120,
    hardBudgetPerFrame: 50000,
  },
  lesson4: {
    leafMin: 1,
    leafMax: 9,
    easyQuestionsCount: 5,
    hiddenCount: 6,
    distractorCount: 2,
    tamperStepDelayMs: 600,
    cardMergeDelayMs: 400,
  },
} as const;
