/**
 * Bước 1 của xuất Excel lời thoại (docs/LOI-THOAI-NHAN-VAT.xlsx): gom lời nhân vật từ content/ và gán nơi dùng theo mã gọi thật.
 * Chỉ chạy khi có biến môi trường EXPORT_LOI_THOAI (đường dẫn file JSON đầu ra), nên `pnpm test` bình thường bỏ qua.
 * Chạy cả hai bước bằng `node scripts/export-loi-thoai.mjs`. KHÔNG sửa lời thoại hay logic game ở đây.
 * Mọi chữ lấy thẳng từ content (không chép lại); chỗ dùng, điều kiện, thứ tự là siêu dữ liệu viết tay, đối chiếu với mã gọi ghi ở cột "src".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_IDS, fmt, speakerLabel, phanDien } from '../packages/core/src/content/characters';
import { BI_NHAC_HOI_SAP_MO, BI_NHAC_LAI, BI_NHAC_NHIEM, MARKET_TALKERS, NHIEM_VU, NHIEM_VU_HOI_SAP_MO } from '../packages/core/src/content/dialogues';
import { STORY } from '../packages/core/src/content/story';
import { VILLAGE_SCENE } from '../packages/core/src/content/villageScene';
import { VILLAGE_INTRO, villageIntroTexts } from '../packages/core/src/content/villageIntro';
import { villageKnowCards } from '../packages/core/src/content/villageCards';
import { climaxUi } from '../packages/core/src/content/climax';
import { knowScrollUi } from '../packages/core/src/content/knowScrolls';
import { LEVELS, VILLAGE_ORDER, levelById } from '../packages/core/src/content/levels';
import { ui } from '../packages/core/src/content/ui';
import { lessonPraise } from '../packages/core/src/content/lessonPraise';
import { climbUi, rebuildUi } from '../packages/core/src/content/games';
import { bai1Lesson, bai1Texts } from '../packages/core/src/content/lessons/bai-1';
import { bai2Lesson, bai2Texts } from '../packages/core/src/content/lessons/bai-2';
import { bai3Lesson, bai3Texts } from '../packages/core/src/content/lessons/bai-3';
import { bai4Lesson, bai4Texts } from '../packages/core/src/content/lessons/bai-4';

const OUT = process.env.EXPORT_LOI_THOAI;
const run = OUT ? describe : describe.skip;

const TRAM = ui.baiHoc.tram; // { de, tb, kho }
const LANG = ui.lang; // tên 4 làng
const FILES = {
  dlg: 'packages/core/src/content/dialogues.ts',
  story: 'packages/core/src/content/story.ts',
  scene: 'packages/core/src/content/villageScene.ts',
  intro: 'packages/core/src/content/villageIntro.ts',
  climax: 'packages/core/src/content/climax.ts',
  scroll: 'packages/core/src/content/knowScrolls.ts',
  uits: 'packages/core/src/content/ui.ts',
  games: 'packages/core/src/content/games.ts',
  world: 'packages/core/src/three/world/WorldPage.tsx',
  lesson: 'packages/core/src/lesson2d/LessonPage2D.tsx',
};

const main = [];
const unused = [];
const unclear = [];

/** Thêm một lượt nói. `nv` là CharacterId hoặc nhãn riêng ("Lời dẫn truyện", "Biển gỗ"). */
function add(list, o) {
  const level = o.man ? levelById(o.man) : undefined;
  list.push({
    nv: CHARACTER_IDS.includes(o.nv) ? speakerLabel(o.nv) : o.nv,
    nvId: CHARACTER_IDS.includes(o.nv) ? o.nv : '',
    lang: o.lang ?? (level ? LANG[level.lang] : ''),
    man: o.man ?? null,
    manTen: level ? level.ten : '',
    canh: o.canh ?? '',
    dk: o.dk ?? '',
    thuTu: o.thuTu ?? '',
    text: o.text,
    key: o.key,
    src: o.src,
    note: o.note ?? '',
  });
}

/** Chuỗi lượt nói liên tiếp trong cùng một hộp thoại. */
function turns(list, base, items) {
  items.forEach((it, i) => add(list, { ...base, ...it, thuTu: `${i + 1}/${items.length}` }));
}

const villageName = (v) => LANG[v];
const worldVillageOrder = VILLAGE_ORDER;

function build() {
  // ---------------------------------------------------------------- 1. Truyện mở đầu, kết thúc (trang /truyen)
  const STORY_SRC = `${FILES.story} STORY; hiện qua apps/hub/src/pages/Story.tsx (VnDialog, 14 ảnh liên tiếp)`;
  const storyArea = (n) => (n <= 5 ? 'Câu chuyện mở đầu' : n <= 9 ? 'Câu chuyện: giới thiệu bốn làng' : n <= 11 ? 'Câu chuyện: cao trào' : 'Câu chuyện kết thúc');
  for (const f of STORY) {
    add(main, {
      nv: 'Lời dẫn truyện',
      lang: storyArea(f.n),
      canh: `Ảnh truyện ${f.n}/14 (${f.image})`,
      dk: 'Trang /truyen: lần đầu vào game (cổng đọc truyện bắt buộc, RequireStory) hoặc khi chọn "Đọc lại truyện" ở menu chợ / trang chủ. Cả 14 ảnh hiện liên tiếp.',
      thuTu: `${f.n}/14`,
      text: f.text,
      key: `STORY[${f.n - 1}].text`,
      src: STORY_SRC,
      note: f.n === 4 ? 'Lời dẫn có chứa lời Bi trong ngoặc kép (Bi nói với học sinh).' : f.n === 11 ? 'Lời dẫn có chứa lời của phản diện trong ngoặc kép.' : f.n === 14 ? 'Lời dẫn có chứa câu cô giáo hỏi (cô giáo không phải nhân vật có chân dung).' : '',
    });
  }

  // ---------------------------------------------------------------- 2. Chợ phiên
  const huong = ['bắc', 'nam', 'tây', 'đông'];
  MARKET_TALKERS.forEach((t, k) => {
    turns(main, {
      nv: t.speaker,
      lang: 'Chợ phiên (thế giới mở /cho)',
      canh: `Người dân đi lại số ${k + 1} (đường phía ${huong[k]} của chợ)`,
      dk: 'Đứng gần người đó rồi bấm E (hoặc nút bàn tay trên điện thoại); 3 câu hiện nối tiếp trong một hộp thoại, người đó dừng lại nghe.',
      src: `${FILES.dlg} MARKET_TALKERS[${k}]; gọi ở ${FILES.world} interact() nhánh t.kind === 'villager' (index ${k})`,
    }, t.lines.map((text, i) => ({ text, key: `MARKET_TALKERS[${k}].lines[${i}]` })));
  });

  const nvChoCanh = 'Bi nhắc nhiệm vụ (nói chuyện với Bi ở chợ)';
  const choDk = (k) => `Đứng ở chợ (ngoài làng), bấm E ở Bi khi em đang có ${k} Trang Sổ Vàng.`;
  for (let k = 0; k <= 3; k += 1) {
    turns(main, {
      nv: 'bi',
      lang: 'Chợ phiên (thế giới mở /cho)',
      canh: nvChoCanh,
      dk: choDk(k),
      src: `${FILES.dlg} BI_NHAC_NHIEM[${k}] + BI_NHAC_LAI + NHIEM_VU[${k}]; chọn câu bởi marketQuest.ts biQuestLine/questLine; gọi ở ${FILES.world} interact() (nhánh cuối, ngoài làng)`,
    }, [
      { text: BI_NHAC_NHIEM[k], key: `BI_NHAC_NHIEM[${k}]` },
      { text: BI_NHAC_LAI, key: 'BI_NHAC_LAI', note: `Mẫu có biến. {nd} = dòng nhiệm vụ NHIEM_VU[${k}]: "${NHIEM_VU[k]}" ({bacAn}, {cuBinh}, {chuDung}, {thayLinh} là tên nhân vật, xem sheet Nhân vật).` },
    ]);
  }
  turns(main, {
    nv: 'bi',
    lang: 'Chợ phiên (thế giới mở /cho)',
    canh: nvChoCanh,
    dk: 'Đứng ở chợ, bấm E ở Bi khi em đã có đủ 4 Trang Sổ Vàng. Hội làng chưa ra mắt (config/festival.ts FESTIVAL_LAUNCHED = false) nên Bi nói câu "sắp mở".',
    src: `${FILES.dlg} BI_NHAC_HOI_SAP_MO + BI_NHAC_LAI + NHIEM_VU_HOI_SAP_MO; marketQuest.ts biQuestLine/questLine (nhánh launched = false)`,
  }, [
    { text: BI_NHAC_HOI_SAP_MO, key: 'BI_NHAC_HOI_SAP_MO' },
    { text: BI_NHAC_LAI, key: 'BI_NHAC_LAI', note: `Mẫu có biến. {nd} = NHIEM_VU_HOI_SAP_MO: "${NHIEM_VU_HOI_SAP_MO}"` },
  ]);

  // Bi trong làng (chung cho cả 4 làng)
  const inVillage = 'Trong làng (cả 4 làng, mẫu chung)';
  add(main, {
    nv: 'bi', lang: inVillage, canh: 'Bi nhắc việc tiếp theo trong làng',
    dk: 'Đứng trong làng, em đã đọc đủ thẻ "Em có biết?" của làng (hoặc là giáo viên), còn màn chưa xong: bấm E ở Bi.',
    text: ui.langScene.biNhacMan, key: 'ui.langScene.biNhacMan',
    src: `${FILES.uits} langScene.biNhacMan; ${FILES.world} interact() nhánh cuối (inside && nextBoard !== null)`,
    note: 'Mẫu có biến: {lang} = tên làng (Làng Giấy…), {bien} = chữ trên biển của màn tiếp theo (levels.ts, cột "bien").',
  });
  add(main, {
    nv: 'bi', lang: inVillage, canh: 'Bi báo xong cả làng',
    dk: 'Đứng trong làng, đã đọc đủ thẻ, xong hết màn của làng: bấm E ở Bi.',
    text: ui.langScene.biNhacXong, key: 'ui.langScene.biNhacXong',
    src: `${FILES.uits} langScene.biNhacXong; ${FILES.world} interact() nhánh cuối (nextBoard === null)`,
    note: 'Mẫu có biến: {lang} = tên làng.',
  });
  add(main, {
    nv: 'bi', lang: inVillage, canh: 'Bi gợi ý khu có thẻ "Em có biết?" chưa nhặt',
    dk: 'Đứng trong làng còn thẻ "Em có biết?" chưa nhặt (làng đặt thẻ rải ngoài đường): bấm E ở Bi. Câu này thay cho câu nhắc màn.',
    text: knowScrollUi.biGoiY, key: 'knowScrollUi.biGoiY',
    src: `${FILES.scroll} biGoiY; ${FILES.world} interact() nhánh cuối (l.inside && l.gated)`,
    note: 'Mẫu có biến: {con} = số thẻ còn lại, {khu} = tên khu có thẻ gần nhất (knowScrollUi.khu: xưởng làm giấy, đình làng, cái ao làng, chợ làng, bãi phơi vải, xóm khung cửi, ao nhuộm, chợ vải, xưởng khắc dấu, đình làng, trạm đưa thư, bãi đá, quầy đổi bạc, bến sông, nhà giữ sổ, ao sen).',
  });
  add(main, {
    nv: 'bi', lang: inVillage, canh: 'Bi báo màn đang khóa (bấm vào biển gỗ còn mờ)',
    dk: 'Đứng trước biển gỗ của màn chưa mở (phải xong màn trước trong làng), bấm E vào biển. Giáo viên không bị chặn.',
    text: ui.moKhoa.hoanThanh, key: 'ui.moKhoa.hoanThanh',
    src: `${FILES.uits} moKhoa.hoanThanh; ${FILES.world} interact() nhánh board (state = locked)`,
    note: 'Mẫu có biến: {so} = số màn phải xong trước, {man} = tên màn đó. Câu này còn hiện làm dòng chữ (không phải lời Bi) ở bảng làng trên /ban-do và LevelGuard.',
  });

  // ---------------------------------------------------------------- 3. Từng làng
  worldVillageOrder.forEach((v, vi) => {
    const L = villageName(v);
    const scene = VILLAGE_SCENE[v];
    const intro = VILLAGE_INTRO[v];
    const ids = LEVELS.filter((l) => l.lang === v).map((l) => l.id);

    // 3a. giới thiệu làng trên /ban-do
    const cards = villageKnowCards(v);
    const introTurns = [
      ...intro.turns.map((text, i) => ({ text, key: `VILLAGE_INTRO['${v}'].turns[${i}]`, note: i === 0 ? 'Lượt đầu nhân vật tươi cười (mood vui).' : '' })),
      ...cards.map((c, i) => ({
        text: `${fmt(knowScrollUi.banDoThe, { n: i + 1, tong: cards.length })}. ${c.title}. ${c.text}`,
        key: `bai${vi + 1}Lesson.emCoBiet[${i}] (qua knowScrollUi.banDoThe)`,
        note: 'Thẻ "Em có biết?" do người dẫn đọc ở lượt riêng; ghép từ: nhãn "Em có biết? · Thẻ n/tổng" + tiêu đề thẻ + nội dung thẻ.' + (c.example ? ` Kèm khung ví dụ (không phải lời nói): ${c.example}` : ''),
      })),
      { text: villageIntroTexts.lanCuoi.replace('{so}', String(vi + 1)), key: 'villageIntroTexts.lanCuoi', note: `Mẫu: {so} = số Trang Sổ Vàng của làng (ở đây ${vi + 1}). Kèm danh sách 3 nhiệm vụ của làng (không phải lời nói).` },
    ];
    turns(main, {
      nv: intro.guide, lang: L, canh: 'Giới thiệu làng trên bản đồ /ban-do',
      dk: 'Lần đầu bấm vào làng này trên trang /ban-do (VillageIntro). Có nút Bỏ qua.',
      src: `${FILES.intro} VILLAGE_INTRO['${v}'] + villageIntroTexts.lanCuoi; apps/hub/src/ban-do/VillageIntro.tsx`,
    }, introTurns);

    // 3b. cảnh mở đầu làng (thế giới)
    const frame = STORY.find((s) => s.n === scene.storyFrame);
    add(main, {
      nv: 'Lời dẫn truyện', lang: L, canh: 'Cảnh mở đầu làng (ảnh truyện)',
      dk: 'Lần đầu bước qua cổng vào làng (thế giới /cho, sau khi ảnh truyện mở đầu đã đọc).',
      thuTu: '1/2', text: frame.text, key: `STORY[${frame.n - 1}].text`,
      src: `${FILES.scene} VILLAGE_SCENE['${v}'].storyFrame = ${frame.n}; three/world/sceneTurns.ts openingSceneTurns; ${FILES.world} (shouldShowScene)`,
    });
    add(main, {
      nv: scene.guide, lang: L, canh: 'Cảnh mở đầu làng (lời người dẫn)',
      dk: 'Ngay sau ảnh truyện của cảnh mở đầu, lần đầu bước qua cổng làng.',
      thuTu: '2/2', text: scene.opening, key: `VILLAGE_SCENE['${v}'].opening`,
      src: `${FILES.scene} VILLAGE_SCENE['${v}'].opening; three/world/sceneTurns.ts openingSceneTurns; ${FILES.world}`,
    });

    // 3c. người dẫn nhắc việc (bấm E)
    const topicDk = {
      lesson: 'Chưa làm màn nào của làng: màn mở tiếp theo là bài học (biển đầu).',
      game1: 'Màn mở tiếp theo là game thứ nhất của làng (biển thứ hai).',
      game2: 'Màn mở tiếp theo là game thứ hai của làng (biển thứ ba).',
      done: 'Đã xong cả làng (không còn màn mở).',
    };
    const topicTen = { lesson: 'bài học', game1: `game 1 (màn ${ids[1]})`, game2: `game 2 (màn ${ids[2]})`, done: 'đã xong cả làng' };
    for (const topic of ['lesson', 'game1', 'game2', 'done']) {
      add(main, {
        nv: scene.guide, lang: L, canh: `Người dẫn nhắc việc tiếp theo: ${topicTen[topic]}`,
        dk: `Trong làng, bấm E ở người dẫn. ${topicDk[topic]}`,
        text: scene.guideNext[topic], key: `VILLAGE_SCENE['${v}'].guideNext.${topic}`,
        src: `${FILES.scene} guideNext.${topic}; three/village/villageQuest.ts guideTopic/nextLevel; ${FILES.world} interact() nhánh guide`,
      });
    }

    // 3d. bài học (màn đầu của làng)
    const lessonId = ids[0];
    const lessons = [bai1Lesson, bai2Lesson, bai3Lesson, bai4Lesson][vi];
    const texts = [bai1Texts, bai2Texts, bai3Texts, bai4Texts][vi];
    const lf = `packages/core/src/content/lessons/bai-${vi + 1}.ts`;
    const dlg = lessons.dialogue;
    const moments = [
      ['dauBai', 'Lời trước Trạm Dễ (đầu bài)', 'Vào màn học, trước Trạm Dễ.'],
      ['truocTb', 'Lời trước Trạm Trung bình', 'Sau khi xong Trạm Dễ, trước Trạm Trung bình.'],
      ['truocKho', 'Lời trước Trạm Khó', 'Sau khi xong Trạm Trung bình, trước Trạm Khó.'],
      ['cuoiBai', 'Lời cuối bài', 'Xong Trạm Khó, trước màn "Hoàn thành".'],
    ];
    for (const [mk, canh, dk] of moments) {
      const list = dlg[mk];
      list.forEach((t, i) => {
        add(main, {
          nv: t.characterId, man: lessonId, canh, dk, thuTu: `${i + 1}/${list.length}`,
          text: t.text, key: `bai${vi + 1}Lesson.dialogue.${mk}[${i}].text`,
          src: `${lf} dialogue.${mk}; ${FILES.lesson} (stage dialogue, DialogueBox); lesson2d/flow.ts momentBeforeStation`,
          note: mk === 'cuoiBai' || (mk === 'dauBai' && i === 0) ? 'Nhân vật tươi cười (mood vui, lesson2d/flow.ts withMoods).' : '',
        });
        if (t.aside) {
          add(main, {
            nv: t.aside.characterId, man: lessonId, canh, dk, thuTu: `${i + 1}/${list.length} (kèm)`,
            text: t.aside.text, key: `bai${vi + 1}Lesson.dialogue.${mk}[${i}].aside.text`,
            src: `${lf} dialogue.${mk}; ui/DialogueBox.tsx (aside)`,
            note: 'Nhân vật phụ xuất hiện cùng lượt nói (chân dung riêng) với lượt liền trước.',
          });
        }
      });
    }
    if (lessons.twist) {
      lessons.twist.forEach((t, i) => add(main, {
        nv: t.characterId, man: lessonId, canh: 'Trạm Trung bình: lúc phản diện tráo giao dịch',
        dk: 'Trạm Trung bình, ở phần "à ra thế": ngay lúc số gốc đổi do {phanDien} sửa một lá (trạm gọi onTwist, hộp twist mở).',
        thuTu: `${i + 1}/${lessons.twist.length}`, text: t.text, key: `bai${vi + 1}Lesson.twist[${i}].text`,
        src: `${lf} twist; ${FILES.lesson} (onTwist → TwistDialog)`,
      }));
    }
    // Mẹo từ Bi
    for (const st of ['de', 'tb', 'kho']) {
      const m = lessons.stations[st];
      if (!m.meo) continue;
      add(main, {
        nv: 'bi', man: lessonId, canh: `Trạm ${TRAM[st]}: thẻ giới thiệu trạm (Mẹo từ Bi)`,
        dk: `Trước khi bắt đầu Trạm ${TRAM[st]} (LevelIntro). Hiện sau nhãn "Mẹo từ Bi:".`,
        text: m.meo, key: `bai${vi + 1}Lesson.stations.${st}.meo`,
        src: `${lf} stations.${st}.meo; ui/LevelIntro.tsx (ui.gioiThieu.meoTuBi); ${FILES.lesson}`,
        note: `Tiêu đề trạm: "${m.tieuDe}".`,
      });
    }
    // Hết tim (chỉ Bài 2 Trạm Dễ, Trung bình gọi onFail)
    if (vi === 1) {
      for (const st of ['de', 'tb']) {
        const tip = texts[st].goiYThua;
        add(main, {
          nv: 'bi', man: lessonId, canh: `Trạm ${TRAM[st]}: bảng "Hết tim mất rồi!" (lời động viên)`,
          dk: `Hết 3 tim ở Trạm ${TRAM[st]}. Bảng hiện chân dung Bi cùng lời động viên.`,
          text: ui.hetTim.loiDongVien, key: 'ui.hetTim.loiDongVien',
          src: `${FILES.uits} hetTim.loiDongVien; ui/LevelFailed.tsx (PortraitFrame bi); ${FILES.lesson} stage 'failed'; bai-2/${st === 'de' ? 'Easy' : 'Medium'}.tsx onFail`,
          thuTu: '1/2', note: 'Chỉ Bài 2 (Trạm Dễ và Trung bình) gọi onFail trong 4 bài học.',
        });
        add(main, {
          nv: 'bi', man: lessonId, canh: `Trạm ${TRAM[st]}: bảng "Hết tim mất rồi!" (mẹo lượt sau)`,
          dk: `Cùng bảng hết tim, dưới nhãn "Mẹo cho lượt chơi sau".`,
          text: tip, key: `bai2Texts.${st}.goiYThua`,
          src: `packages/core/src/content/lessons/bai-2.ts ${st}.goiYThua; ui/LevelFailed.tsx tip`,
          thuTu: '2/2',
        });
      }
    }
    // Trong trạm
    if (vi === 0) {
      add(main, {
        nv: 'bi', man: lessonId, canh: 'Trạm Trung bình: hộp "domino" (giải thích)',
        dk: 'Trạm Trung bình: ngay sau lần sửa đúng mã trang đầu tiên mà vẫn còn trang lệch (showFirstDomino).',
        text: bai1Texts.tb.domino, key: 'bai1Texts.tb.domino',
        src: 'packages/core/src/content/lessons/bai-1.ts tb.domino; packages/village-lang-giay/src/bai-1/Medium.tsx (PortraitFrame bi, showFirstDomino)',
        note: 'Mẫu có biến: {n} = số trang đang lệch, {truoc} = số trang đứng trước nó.',
      });
    }
    if (vi === 1) {
      const reasonDk = {
        first: 'Lượt đầu tiên của {phanDien} (luôn gian lận).',
        ev: 'Tính ra gian lận có lợi (kỳ vọng > 10).',
        gamble: 'Gian lận liều (xác suất 15% khi không có lợi).',
        honest: 'Làm thật.',
      };
      for (const r of ['first', 'ev', 'gamble', 'honest']) {
        add(main, {
          nv: 'phanDien', man: lessonId, canh: 'Trạm Khó: bong bóng "Tí nghĩ thầm"',
          dk: `Trạm Khó, lượt do {phanDien} tạo trang, SAU khi em đã bỏ phiếu và trang được lật. Lý do: ${reasonDk[r]}`,
          text: bai2Texts.kho.nghi[r], key: `bai2Texts.kho.nghi.${r}`,
          src: 'packages/core/src/content/lessons/bai-2.ts kho.nghi; packages/village-lang-det/src/bai-2/Hard.tsx setTiThought (tiReason); lessons/bai-2/bots.ts tiDecide',
          note: 'Hiện kèm nhãn "{nguoi} nghĩ thầm:" (bai2Texts.kho.nghiTham). Lời viết ngôi thứ ba nhưng hiện như suy nghĩ của {phanDien}.',
        });
      }
    }
    if (vi === 3) {
      add(main, {
        nv: 'phanDien', man: lessonId, canh: 'Trạm Trung bình, phần C: khoảnh khắc "à ra thế"',
        dk: 'Trạm Trung bình: sau khi dựng đúng gốc cây 4 giao dịch (phase_c), {phanDien} nói trước khi em soi tìm lá bị sửa.',
        text: bai4Texts.tramTb.tinhNghichToVuaLen, key: 'bai4Texts.tramTb.tinhNghichToVuaLen',
        src: 'packages/core/src/content/lessons/bai-4.ts tinhNghichToVuaLen; packages/village-lang-bac/src/bai-4/Medium.tsx (Avatar ti, phase_c)',
        note: 'Chữ có ký hiệu đậm ** ** của rich(); khi hiện thì bỏ ký hiệu và in đậm chữ "tinh nghịch".',
      });
    }

    // 3e. trao Trang Sổ Vàng (hai nơi)
    if (lessons.award) {
      lessons.award.loi.forEach((t, i) => add(main, {
        nv: t.characterId, man: lessonId, canh: 'Trao Trang Sổ Vàng trên trang bài học (GoldenPageScene)',
        dk: `Lưu kết quả bài học làm số Trang Sổ Vàng tăng lên tới trang thứ ${vi + 1} (goldenPageAwarded: lần đầu nhận trang của làng, tức bài học là màn cuối em hoàn thành của làng; học lại thì không có). Nhân vật tươi cười.`,
        thuTu: `${i + 1}/${lessons.award.loi.length}`, text: t.text, key: `bai${vi + 1}Lesson.award.loi[${i}].text`,
        src: `${lf} award; lesson2d/GoldenPageScene.tsx; ${FILES.lesson} (awardNow = goldenPageAwarded)`,
        note: `Chú thích cảnh (không phải lời nói): "${lessons.award.chuThich}"`,
      }));
    }
    if (scene.award) {
      const total = scene.award.loi.length;
      scene.award.loi.forEach((text, i) => add(main, {
        nv: scene.guide, lang: L, canh: 'Trao Trang Sổ Vàng ở cảnh làng (thế giới 3D)',
        dk: `Vào làng khi em đã có Trang Sổ Vàng thứ ${vi + 1} mà chưa xem cảnh trao (shouldShowGolden; giáo viên không chiếu). Nhân vật tươi cười, hàng Trang Sổ Vàng hiện ở lượt đầu.`,
        thuTu: `${i + 1}/${total}`, text, key: `VILLAGE_SCENE['${v}'].award.loi[${i}]`,
        src: `${FILES.scene} award; ${FILES.world} (useEffect cảnh trao trang, GoldenPagesRow)`,
      }));
    } else {
      // Làng Bạc không có cảnh trao ở làng: ghi vào sheet Phạm vi (ghi chú cố định ở Python)
    }
  });

  // ---------------------------------------------------------------- 4. Màn 3 (Làng Giấy, ghép sổ)
  const m3 = {
    man: 3,
    srcBase: `${FILES.games} rebuildUi; packages/village-lang-giay/src/rebuild/RebuildGame.tsx (speak → BiSay)`,
  };
  const r3 = (key, canh, dk, extra = {}) =>
    add(main, { nv: extra.nv ?? 'bi', man: 3, canh, dk, text: rebuildUi[key], key: `rebuildUi.${key}`, src: `${m3.srcBase}${extra.where ? `; ${extra.where}` : ''}`, note: extra.note ?? '' });
  const bubble = 'Bong bóng lời Bi ở dải giữa màn';
  r3('biSaiMaTruoc', bubble, 'Em đặt thẻ vào chuỗi nhưng mã trang trước không khớp trang cuối của chuỗi (vòng 1, 2 và cả đoạn giữ sổ). Mất 1 tim.', { where: 'doPlace / doKeepPlace' });
  r3('biTrangGia', bubble, 'Vòng 2: em đặt nhầm trang giả của {phanDien} vào chuỗi. Mất 1 tim.', { where: 'doPlace', note: 'Mẫu có {phanDien}.' });
  r3('biBatDuoc', bubble, 'Vòng 2: em bỏ đúng trang giả vào rổ.', { where: 'doBin', note: 'Mẫu có biến: {so} = điểm thưởng (30).' });
  r3('biTrangThat', bubble, 'Em bỏ nhầm trang thật vào rổ (vòng 2 và cả đoạn giữ sổ). Mất 1 tim.', { where: 'doBin / doKeepBin' });
  r3('biDuChuoi', bubble, 'Vòng 1: em ghép đủ chuỗi 5 trang. Vòng 2 không nói câu này vì vào thẳng đoạn giữ sổ.', { where: 'doPlace (roundDone && !keep)' });
  r3('biHetTim', bubble, 'Em hết tim (ở vòng nào cũng vậy).', { where: 'hitHeartsOut' });
  r3('biNhetTrang', bubble, 'Vòng 2: ngay sau khi {phanDien} nhét thêm trang giả vào xấp giấy (cảnh phản diện chạy vào).', { where: 'hoạt cảnh villain' });
  add(main, {
    nv: 'phanDien', man: 3, canh: bubble, dk: 'Vòng 2: lúc {phanDien} chạy vào, vừa tới sân (trước khi thả trang giả).',
    text: rebuildUi.phanDienCuoi, key: 'rebuildUi.phanDienCuoi', src: `${m3.srcBase}; hoạt cảnh villain (speak(phanDienCuoi, 'tin'))`,
    note: 'Nội dung là lời của {phanDien} (content ghi "Lời của {phanDien} khi nhét trang giả"), nhưng khung hiển thị dùng chung bong bóng có chân dung Bi.',
  });
  add(main, {
    nv: 'bacAn', man: 3, canh: 'Thẻ giới thiệu đoạn "Giữ sổ" (cuối vòng 2)',
    dk: 'Vòng 2: ngay sau khi ghép xong chuỗi 7 trang, thẻ "Giữ sổ" hiện trong dải giữa; Bác An động viên và hồi đủ 3 tim.',
    text: rebuildUi.bacAnDongVien, key: 'rebuildUi.bacAnDongVien', src: `${m3.srcBase}; RebuildGame.tsx dòng data-testid="bac-an-dong-vien"`,
    note: 'Câu có chữ "Bác An:" và dấu ngoặc kép nằm sẵn trong nội dung.',
  });
  r3('biDaBat', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Bỏ đúng trang giả (bị tráo) vào rổ.', { where: 'doKeepBin' });
  r3('biSuaXong', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Đặt đúng trang thật vào ô trống mà chuỗi vẫn còn chỗ lệch khác.', { where: 'doKeepPlace', note: 'Mẫu có biến: {diem} = điểm nhận được.' });
  r3('biChuoiDungLai', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Đặt đúng trang thật và cả chuỗi đúng trở lại.', { where: 'doKeepPlace' });
  r3('biOCoTrang', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Em bấm đặt thẻ vào ô đang có trang.', { where: 'doKeepPlace' });
  r3('biLechQua', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Chuỗi lệch quá nhiều (tràn ngưỡng). Mất 1 tim.', { where: 'handleKeepEvents (overflow)', note: 'Mẫu có {phanDien}.' });
  r3('biGoiYTrai', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Một trang bị tráo đã quá 10 giây mà chưa được sửa, trang đó nằm nửa bên trái chuỗi.', { where: 'handleKeepEvents (hint)' });
  r3('biGoiYPhai', 'Đoạn "Giữ sổ": bong bóng lời Bi', 'Một trang bị tráo đã quá 10 giây mà chưa được sửa, trang đó nằm nửa bên phải chuỗi.', { where: 'handleKeepEvents (hint)' });

  // ---------------------------------------------------------------- 5. Màn 12 (Làng Bạc, leo cây)
  add(main, {
    nv: 'bi', man: 12, canh: 'Hộp giải thích lần đầu vào màn', dk: 'Lần đầu vào màn 12 (chưa từng xem mẹo màn này). Có nút "Em hiểu rồi".',
    text: climbUi.biGocCay, key: 'climbUi.biGocCay', src: `${FILES.games} climbUi.biGocCay; packages/village-lang-bac/src/climb/ClimbGame.tsx (tip, BiAvatar)`,
  });
  add(main, {
    nv: 'bi', man: 12, canh: 'Màn hết tim', dk: 'Em hết tim: hộp kết thúc có chân dung Bi và nút "Xem kết quả".',
    text: climbUi.biGiup, key: 'climbUi.biGiup', src: `${FILES.games} climbUi.biGiup; ClimbGame.tsx (banner kind lost)`,
  });

  // ---------------------------------------------------------------- 6. Cao trào sau màn 12
  const climaxBase = { lang: 'Làng Bạc', man: 12, dk: 'Sau màn 12, khi em đủ điều kiện xem cảnh cuối (hoặc bấm "Xem cảnh cuối" / "Xem lại cảnh cuối"). Có nút Bỏ qua.' };
  const cSrc = (extra) => `${FILES.climax} climaxUi; packages/village-lang-bac/src/climax/climaxFlow.ts climaxSteps${extra ? `; ${extra}` : ''}`;
  for (const [n, canh, thuTu] of [[10, 'Cảnh cao trào, bước a (ảnh truyện 10)', '1/1'], [11, 'Cảnh cao trào, bước c (ảnh truyện 11)', '1/1']]) {
    const f = STORY.find((s) => s.n === n);
    add(main, { nv: 'Lời dẫn truyện', ...climaxBase, canh, thuTu, text: f.text, key: `STORY[${n - 1}].text`, src: cSrc(`STORY[${n - 1}] dùng lại từ /truyen`) });
  }
  turns(main, { ...climaxBase, canh: 'Cảnh cao trào, bước b (dưới gốc đa)', src: cSrc() }, [
    { nv: 'phanDien', text: climaxUi.loiPhanDien, key: 'climaxUi.loiPhanDien', note: '{phanDien} cúi đầu khi nói.' },
    { nv: 'cuBinh', text: climaxUi.loiCuBinh, key: 'climaxUi.loiCuBinh' },
    { nv: 'phanDien', text: climaxUi.loiPhanDienCoA, key: 'climaxUi.loiPhanDienCoA', note: 'Tươi cười (mood vui), nhảy cẫng.' },
  ]);
  turns(main, { ...climaxBase, canh: 'Cảnh cao trào, bước d (trao Trang Sổ Vàng thứ tư)', dk: climaxBase.dk + ' Bước d chỉ có khi Trang Sổ Vàng thứ tư chưa có trước ván này, hoặc khi xem lại.', src: cSrc() }, [
    { nv: 'thayLinh', text: climaxUi.traoTrang, key: 'climaxUi.traoTrang', note: 'Chú thích có chân dung thầy Linh (không ghi tên người nói); đi kèm hàng 4 Trang Sổ Vàng. Có thể là lời dẫn chứ không phải lời nói.' },
    { nv: 'bi', text: climaxUi.biDuTrangChuanBi, key: 'climaxUi.biDuTrangChuanBi', note: `Hội làng chưa ra mắt (FESTIVAL_LAUNCHED = false) nên dùng câu này; kèm dòng chữ đậm bên dưới: "${climaxUi.hoiLangSapMo}" (không phải lời nói).` },
  ]);

  // ---------------------------------------------------------------- 7. Chưa dùng / chưa triển khai
  add(unused, {
    nv: 'bi', lang: 'Chợ phiên', canh: 'Cổng làng đóng', dk: 'Bấm E ở cổng làng đang đóng. Từ P3a cả 4 cổng mở từ đầu nên không bao giờ xảy ra.',
    text: ui.cho.congDong, key: 'ui.cho.congDong', src: `${FILES.uits} cho.congDong; ${FILES.world} interact() nhánh gate (worldTargets chỉ tạo đích cho cổng đóng)`,
    note: 'Lý do chưa dùng: cổng luôn mở (unlock.ts từ P3a). Chữ vẫn giữ trong mã.',
  });
  add(unused, {
    nv: 'bi', lang: 'Chợ phiên', canh: 'Nhiệm vụ khi hội làng đã ra mắt', dk: 'Em có đủ 4 Trang Sổ Vàng và FESTIVAL_LAUNCHED = true. Chưa bật.',
    text: BI_NHAC_NHIEM[4], key: 'BI_NHAC_NHIEM[4]', src: `${FILES.dlg} BI_NHAC_NHIEM[4]; marketQuest.ts biQuestLine`,
    note: 'Lý do: hội làng chưa ra mắt (bước H1, spec 10). Hiện dùng BI_NHAC_HOI_SAP_MO thay thế.',
  });
  add(unused, {
    nv: 'bi', lang: 'Chợ phiên', canh: 'Bi nhắc lại nhiệm vụ khi hội làng đã ra mắt', dk: 'Như dòng trên (lượt hai của Bi).',
    text: BI_NHAC_LAI, key: 'BI_NHAC_LAI + NHIEM_VU[4]', src: `${FILES.dlg} NHIEM_VU[4]`,
    note: `Mẫu có biến. {nd} = "${NHIEM_VU[4]}" (chưa dùng vì hội làng chưa ra mắt).`,
  });
  add(unused, {
    nv: 'bi', lang: 'Làng Bạc', man: 12, canh: 'Cao trào bước d khi hội làng đã ra mắt', dk: 'FESTIVAL_LAUNCHED = true.',
    text: climaxUi.biDuTrang, key: 'climaxUi.biDuTrang', src: `${FILES.climax} biDuTrang; climaxFlow.ts (nhánh festivalLaunched)`,
    note: 'Lý do: hội làng chưa ra mắt; hiện dùng biDuTrangChuanBi.',
  });
  add(unused, {
    nv: 'bi', lang: 'Chợ phiên', canh: 'Hiệu ứng mở cổng (then gỗ và dây đỏ rơi)', dk: 'Sau khi nhận Trang Sổ Vàng và tới gần cổng làng kế tiếp lần đầu. Đã tắt: GATE_OPENING_CEREMONY = false.',
    text: BI_NHAC_NHIEM[1], key: 'BI_NHAC_NHIEM[1..3] + BI_NHAC_LAI qua nhánh onGateFallen', src: `${FILES.world} onGateFallen (seq 'talk'); marketQuest.ts GATE_OPENING_CEREMONY`,
    note: 'Cùng câu với lời Bi nhắc nhiệm vụ ở chợ (đang dùng), nhưng nhánh hiệu ứng mở cổng đã tắt từ P3a. Liệt kê một dòng đại diện.',
  });
  add(unused, {
    nv: 'bi', lang: 'Trong làng (mẫu chung)', canh: 'Biển "sắp ra mắt"', dk: 'Bấm E vào biển của màn có status "coming-soon". Hiện cả 12 màn đều "ready".',
    text: ui.langScene.bienSapRaMat, key: 'ui.langScene.bienSapRaMat', src: `${FILES.uits} langScene.bienSapRaMat; ${FILES.world} interact() nhánh board`,
    note: 'Mẫu có biến: {bien} = chữ trên biển.',
  });

  // ---------------------------------------------------------------- 8. Không rõ người nói / không phải lời nhân vật
  add(unclear, {
    nv: 'Biển gỗ', lang: 'Trong làng (cả 4 làng)', canh: 'Biển gỗ báo chưa đủ thẻ "Em có biết?"',
    dk: 'Bấm E vào biển của màn đang mở khi chưa đọc đủ thẻ "Em có biết?" của làng. Hộp thoại ghi tên người nói là "Biển gỗ".',
    text: knowScrollUi.bienBao, key: 'knowScrollUi.bienBao', src: `${FILES.scroll} bienBao, bienNguoiNoi; ${FILES.world} interact() nhánh board`,
    note: 'Người nói là vật (biển gỗ), không phải nhân vật. Mẫu có biến: {n} = số thẻ đã nhặt, {tong} = tổng số thẻ của làng.',
  });
  add(unclear, {
    nv: '(Tí hoặc Bi?)', lang: 'Làng Giấy', man: 3, canh: 'Thẻ "Giữ sổ" (cuối vòng 2)', dk: 'Cùng thẻ với lời Bác An động viên ở sheet Lời thoại.',
    text: rebuildUi.giuSoLoi, key: 'rebuildUi.giuSoLoi', src: `${FILES.games} rebuildUi.giuSoLoi; RebuildGame.tsx (thẻ intro)`,
    note: 'Đoạn hướng dẫn luật của đoạn giữ sổ, không ghi người nói. Mẫu có biến: {giay} = số giây giữ sổ (45), {nhanh} = ngưỡng sửa nhanh (giây).',
  });
  add(unclear, {
    nv: '(không ghi người nói)', lang: 'Làng Giấy', man: 1, canh: 'Trạm Trung bình: chú thích cạnh chân dung Tí', dk: 'Hoạt cảnh {phanDien} lén sửa sổ (có chân dung Tí).',
    text: `${bai1Texts.tb.dangSua} / ${bai1Texts.tb.dangSuaChiTiet} / ${bai1Texts.tb.daBiDoi}`, key: 'bai1Texts.tb.dangSua; dangSuaChiTiet; daBiDoi',
    src: 'packages/core/src/content/lessons/bai-1.ts tb; packages/village-lang-giay/src/bai-1/Medium.tsx',
    note: 'Viết ngôi thứ ba ("{phanDien} đang lén sửa sổ…"): là lời mô tả, không phải lời Tí nói nên không đưa vào sheet Lời thoại.',
  });
  add(unclear, {
    nv: '(không ghi người nói)', lang: 'Cả 4 làng', canh: 'Câu khen sau khi trả lời đúng', dk: 'Hộp khen nhỏ sau câu trả lời đúng ở trạm bài học.',
    text: lessonPraise.join(' / '), key: 'lessonPraise[0..2]', src: 'packages/core/src/content/lessonPraise.ts; lesson2d/LessonPraise.tsx',
    note: 'Không có chân dung hay tên người nói; coi như thông báo hệ thống.',
  });
  add(unclear, {
    nv: '(không ghi người nói)', lang: 'Màn 12', man: 12, canh: 'Bong bóng "Ngõ cụt!" / "Hụt rồi, em canh lại nhé."', dk: 'Khi nhảy hụt hoặc vào ngõ cụt khi leo cây.',
    text: `${climbUi.nguCut} / ${climbUi.truot}`, key: 'climbUi.nguCut; climbUi.truot', src: 'packages/village-lang-bac/src/climb/ClimbGame.tsx (setSay)',
    note: 'Bong bóng không có chân dung, không ghi người nói.',
  });
  add(unclear, {
    nv: '(không ghi người nói)', lang: 'Cả 4 làng', canh: 'Mục tiêu của em (LevelIntro)', dk: 'Thẻ giới thiệu trạm, cạnh chân dung Bi nhưng dưới nhãn "Mục tiêu của em:".',
    text: 'Xem trường "mucTieu" ở mỗi trạm của 4 bài học (ví dụ bai1Lesson.stations.de.mucTieu).', key: 'bai[1-4]Lesson.stations.*.mucTieu', src: 'ui/LevelIntro.tsx',
    note: 'Là mô tả nhiệm vụ, không phải lời Bi (chỉ "Mẹo từ Bi" được tính là lời Bi). Không liệt kê từng câu.',
  });
}

/** Giải thích biến: khóa → nghĩa. Biến nào xuất hiện trong lời thoại mà không có ở đây thì test báo lỗi. */
function variables() {
  const names = {};
  for (const id of CHARACTER_IDS) if (id !== 'hocSinh') names[id] = CHARACTERS[id].name;
  const v = [
    ['ten', 'Tên học sinh (người chơi). Chơi thử chưa có tên thì hiện "em". {Ten} là cùng giá trị nhưng viết hoa chữ đầu.'],
    ['Ten', 'Như {ten} nhưng viết hoa chữ đầu (đầu câu).'],
    ...CHARACTER_IDS.filter((id) => id !== 'hocSinh').map((id) => [id, `Tên nhân vật "${id}", hiện tại là "${CHARACTERS[id].name}" (content/characters.ts, bảng CHARACTERS). Đổi tên chỉ sửa ở đó.`]),
    ['nd', 'Dòng nhiệm vụ hiện tại (NHIEM_VU[k] đã thay tên), ví dụ "Đến Làng Giấy ở phía bắc gặp bác An."'],
    ['lang', 'Tên làng, ví dụ "Làng Giấy".'],
    ['bien', 'Chữ trên biển gỗ của màn (levels.ts, cột bien), ví dụ "Học cùng bác An".'],
    ['so', 'Một số do game điền vào (số màn, điểm thưởng, số Trang Sổ Vàng…); nghĩa cụ thể xem cột Ghi chú của từng dòng.'],
    ['man', 'Tên màn (levels.ts, cột ten).'],
    ['con', 'Số thẻ "Em có biết?" còn chưa nhặt trong làng.'],
    ['khu', 'Tên khu của làng có thẻ gần nhất chưa nhặt (knowScrollUi.khu).'],
    ['n', 'Một số do game điền vào: thứ tự trang / số thẻ / số trang đã nhặt; nghĩa cụ thể xem cột Ghi chú.'],
    ['tong', 'Tổng số thẻ "Em có biết?" của làng.'],
    ['truoc', 'Số thứ tự hoặc mã của trang đứng trước; nghĩa cụ thể xem cột Ghi chú.'],
    ['diem', 'Số điểm nhận được ở lần thao tác đó.'],
    ['giay', 'Số giây của đoạn giữ sổ (45 giây, REBUILD_KEEP.seconds).'],
    ['nhanh', 'Ngưỡng giây "sửa nhanh" của đoạn giữ sổ (REBUILD_KEEP.fastWithin).'],
    ['nguoi', 'Tên người đang nghĩ thầm (ví dụ "Tí") ở bong bóng suy nghĩ Bài 2.'],
  ];
  return { v, names };
}

run('xuất lời thoại ra JSON', () => {
  it('gom lời thoại, gán nơi dùng và ghi file JSON', () => {
    build();
    const { v: vars, names } = variables();
    const known = new Set(vars.map(([k]) => k));
    const unknown = new Set();
    const all = [...main, ...unused, ...unclear];
    for (const r of all) for (const m of r.text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)) if (!known.has(m[1])) unknown.add(m[1]);
    expect([...unknown]).toEqual([]); // mọi biến trong lời thoại phải được giải thích

    // STT và tham chiếu chéo: cùng người nói + cùng chữ ở nhiều nơi thì liệt kê đủ nơi dùng
    main.forEach((r, i) => { r.stt = i + 1; });
    const byText = new Map();
    for (const r of main) {
      const k = `${r.nv}\u0000${r.text}`;
      if (!byText.has(k)) byText.set(k, []);
      byText.get(k).push(r);
    }
    for (const group of byText.values()) {
      if (group.length < 2) continue;
      for (const r of group) {
        const others = group.filter((o) => o !== r).map((o) => `STT ${o.stt}: ${[o.lang, o.man ? `màn ${o.man}` : '', o.canh].filter(Boolean).join(' / ')}`);
        r.also = others.join('\n');
      }
    }
    unused.forEach((r, i) => { r.stt = i + 1; });
    unclear.forEach((r, i) => { r.stt = i + 1; });

    const characters = CHARACTER_IDS.map((id) => {
      const rowsOf = main.filter((r) => r.nvId === id);
      return {
        id,
        name: CHARACTERS[id].name,
        label: speakerLabel(id),
        portrait: CHARACTERS[id].portrait,
        placeholder: id === 'hocSinh' ? '{ten}' : `{${id}}`,
        count: rowsOf.length,
        places: [...new Set(rowsOf.map((r) => r.lang))].join('; '),
      };
    });
    const out = {
      generatedFrom: 'content/ + mã gọi (xem cột src)',
      phanDien,
      rows: main,
      unused,
      unclear,
      characters,
      variables: vars.map(([k, d]) => ({ key: k, meaning: d, usedIn: main.filter((r) => r.text.includes(`{${k}}`)).map((r) => r.stt) })),
      names,
      counts: {
        rows: main.length,
        byCharacter: Object.fromEntries(characters.map((c) => [c.id, c.count])),
        narration: main.filter((r) => !r.nvId).length,
        unused: unused.length,
        unclear: unclear.length,
      },
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
    expect(main.length).toBeGreaterThan(100);
  });
});
