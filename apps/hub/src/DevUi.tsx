import { useState, type ReactNode } from 'react';
import {
  AssetImage,
  Button,
  DialogueBox,
  FeedbackSheet,
  LevelComplete,
  LevelIntro,
  Panel,
  PORTRAIT_IDS,
  PortraitFrame,
  SettingsPanel,
  Stars,
  ui,
  type DialogueTurn,
} from '@so-chung/core';

const ICONS = ['ngoi-sao', 'trang-vang', 'tien-dong', 'tim', 'non-la', 'guoc-moc', 'tui-tien'] as const;

const TURNS: DialogueTurn[] = [
  { characterId: 'bacAn', text: ui.hoiThoaiMau.luot1 },
  { characterId: 'phanDien', text: ui.hoiThoaiMau.luot2 },
  { characterId: 'bi', text: ui.hoiThoaiMau.luot3 },
  { characterId: 'coChi', text: ui.hoiThoaiMau.luot4 },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

/** Trang xem mọi component giao diện chung, chỉ có khi chạy dev. */
export default function DevUi() {
  const [dialogueKey, setDialogueKey] = useState(0);
  const [dialogueState, setDialogueState] = useState<'dang-chay' | 'xong' | 'bo-qua'>('dang-chay');
  const [sheet, setSheet] = useState<'dung' | 'sai' | null>(null);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 pb-32">
      <h1 className="text-3xl">{ui.dev.uiTieuDe}</h1>

      <Section title={ui.dev.nut}>
        <Panel className="space-y-4">
          {(['primary', 'secondary', 'danger'] as const).map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <Button variant={v}>
                {v === 'primary' ? ui.dev.nutChinh : v === 'secondary' ? ui.dev.nutPhu : ui.dev.nutNguyHiem}
              </Button>
              <Button variant={v} disabled>
                {ui.dev.nutVoHieu}
              </Button>
              <Button variant={v} size="sm">
                {ui.dev.nutNho}
              </Button>
              <Button variant={v} size="lg">
                {ui.dev.nutTo}
              </Button>
            </div>
          ))}
        </Panel>
      </Section>

      <Section title={ui.dev.bang}>
        <Panel>
          <p>{ui.dev.bangNoiDung}</p>
        </Panel>
      </Section>

      <Section title={ui.dev.khungChanDung}>
        <div className="flex flex-wrap gap-3">
          {PORTRAIT_IDS.map((id) => (
            <PortraitFrame key={id} portrait={id} size={96} />
          ))}
          <PortraitFrame portrait="ba-cu" size={56} />
          <PortraitFrame portrait="nong-dan" size={56} />
        </div>
      </Section>

      <Section title={ui.dev.hoiThoai}>
        <DialogueBox
          key={dialogueKey}
          turns={TURNS}
          onFinish={() => setDialogueState('xong')}
          onSkip={() => setDialogueState('bo-qua')}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDialogueKey((k) => k + 1);
              setDialogueState('dang-chay');
            }}
          >
            {ui.dev.hoiThoaiLai}
          </Button>
          {dialogueState === 'xong' && <p>{ui.dev.hoiThoaiXong}</p>}
          {dialogueState === 'bo-qua' && <p>{ui.dev.hoiThoaiBoQua}</p>}
        </div>
      </Section>

      <Section title={ui.dev.phanHoi}>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => setSheet('dung')}>
            {ui.dev.moPhanHoiDung}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setSheet('sai')}>
            {ui.dev.moPhanHoiSai}
          </Button>
        </div>
        <FeedbackSheet
          isOpen={sheet !== null}
          isCorrect={sheet === 'dung'}
          whatHappened={ui.dev.phanHoiChuyenGi}
          whyHappened={ui.dev.phanHoiViSao}
          howToFix={sheet === 'sai' ? ui.dev.phanHoiCachSua : undefined}
          onContinue={() => setSheet(null)}
        />
      </Section>

      <Section title={ui.dev.gioiThieu}>
        <LevelIntro
          title={ui.dev.gioiThieuTieuDe}
          objective={ui.dev.gioiThieuMucTieu}
          tip={ui.dev.gioiThieuMeo}
          lessonName={ui.dev.gioiThieuTenBai}
          difficultyLabel={ui.dev.gioiThieuMuc}
          onStart={() => {}}
        />
      </Section>

      <Section title={ui.dev.hoanThanh}>
        <LevelComplete
          stars={2}
          xpGained={20}
          timeSpentSec={95}
          keyTakeaway={ui.dev.hoanThanhDieuHoc}
          reflectionQuestion={{
            question: ui.dev.hoanThanhCauHoi,
            options: [ui.dev.hoanThanhDapAn1, ui.dev.hoanThanhDapAn2],
          }}
          onPlayAgain={() => {}}
          onNextLevel={() => {}}
        />
      </Section>

      <Section title={ui.dev.sao}>
        <div className="flex flex-wrap items-center gap-6">
          <Stars earned={0} />
          <Stars earned={1} />
          <Stars earned={3} size="lg" />
        </div>
      </Section>

      <Section title={ui.dev.caiDat}>
        <SettingsPanel />
      </Section>

      <Section title={ui.dev.hangIcon}>
        <Panel className="flex flex-wrap items-end gap-4">
          {ICONS.map((name) => (
            <figure key={name} className="text-center text-xs">
              <AssetImage path={`ui/icons/${name}`} alt={name} className="size-16 object-contain" />
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </Panel>
      </Section>
    </main>
  );
}
