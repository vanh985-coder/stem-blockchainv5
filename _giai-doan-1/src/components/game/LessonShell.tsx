import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import { Modal } from '../ui/Modal';
import { LevelIntro } from './LevelIntro';
import { LevelComplete } from './LevelComplete';
import { LevelFailed } from './LevelFailed';
import { DidYouKnowModal, StoryCard } from './DidYouKnowModal';
import { useProgress } from '../../app/ProgressContext';
import { isLevelUnlocked, LevelId, Stars as StarsType } from '../../lib/progress';
import { GAME_CONFIG, LessonConfig } from '../../config/gameConfig';
import { sound } from '../../lib/sound';

export interface LevelResult {
  stars: 1 | 2 | 3;
  timeMs: number;
  learned?: string;
  reflection?: ReactNode;
}

export interface LevelProps {
  onComplete: (r: LevelResult) => void;
  onFail: (tip?: string) => void;
}

export interface LevelMetadata {
  title: string;
  objective: string;
  tip?: string;
}

export interface LessonShellProps {
  lessonId: number;
  storyCards?: StoryCard[];
  levelsMeta?: Partial<Record<LevelId, LevelMetadata>>;
  levels?: Record<LevelId, React.ComponentType<LevelProps>>;
  renderLevel?: (diff: LevelId, props: LevelProps) => ReactNode;
  children?: ReactNode | ((diff: LevelId, props: LevelProps) => ReactNode);
}

export const LessonShell: React.FC<LessonShellProps> = ({
  lessonId,
  storyCards = [],
  levelsMeta = {},
  levels,
  renderLevel,
  children,
}) => {
  const navigate = useNavigate();
  const { progress, completeLevel, markDidYouKnowSeen } = useProgress();

  const [activeDiff, setActiveDiff] = useState<LevelId | null>(null);
  const [stage, setStage] = useState<'intro' | 'playing' | 'completed' | 'failed'>('intro');
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [xpEarned, setXpEarned] = useState<number>(0);
  const [failedTip, setFailedTip] = useState<string | undefined>();
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const lessonConfig: LessonConfig | undefined = GAME_CONFIG.lessons.find(
    (l) => l.id === lessonId
  );

  const hasViewedStory = Boolean(progress.didYouKnowViewed[lessonId]);

  // Tự động mở Em có biết? khi lần đầu vào bài học
  useEffect(() => {
    if (!hasViewedStory && storyCards.length > 0) {
      setIsStoryModalOpen(true);
      markDidYouKnowSeen(lessonId);
    }
  }, [lessonId, hasViewedStory, storyCards.length, markDidYouKnowSeen]);

  const handleOpenStory = () => {
    sound.playClick();
    setIsStoryModalOpen(true);
    markDidYouKnowSeen(lessonId);
  };

  const handleBack = () => {
    sound.playClick();
    if (activeDiff !== null) {
      if (stage === 'playing') {
        setShowExitConfirm(true);
      } else {
        // Thoát về danh sách chọn mức
        setActiveDiff(null);
        setStage('intro');
      }
    } else {
      navigate('/');
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setActiveDiff(null);
    setStage('intro');
  };

  const handleSelectDifficulty = (diff: LevelId) => {
    sound.playClick();
    setActiveDiff(diff);
    setStage('intro');
  };

  const handleStartLevel = () => {
    sound.playClick();
    setStage('playing');
  };

  const handleComplete = (res: LevelResult) => {
    if (!activeDiff) return;
    const { xpGained } = completeLevel(lessonId, activeDiff, {
      stars: res.stars,
      timeMs: res.timeMs,
    });
    setXpEarned(xpGained);
    setLastResult(res);
    setStage('completed');
  };

  const handleFail = (tip?: string) => {
    setFailedTip(tip);
    setStage('failed');
  };

  const handlePlayAgain = () => {
    sound.playClick();
    setStage('playing');
  };

  const handleNextLevel = () => {
    sound.playClick();
    if (activeDiff === 'easy') {
      setActiveDiff('medium');
      setStage('intro');
    } else if (activeDiff === 'medium') {
      setActiveDiff('hard');
      setStage('intro');
    } else {
      setActiveDiff(null);
      setStage('intro');
    }
  };

  const difficulties: { key: LevelId; label: string; xp: number; desc: string }[] = [
    {
      key: 'easy',
      label: 'Dễ',
      xp: GAME_CONFIG.xp.easy,
      desc: 'Làm quen với khái niệm qua thử thách cơ bản.',
    },
    {
      key: 'medium',
      label: 'Trung bình',
      xp: GAME_CONFIG.xp.medium,
      desc: 'Tăng tốc tư duy với tình huống đa dạng hơn.',
    },
    {
      key: 'hard',
      label: 'Khó',
      xp: GAME_CONFIG.xp.hard,
      desc: 'Thử thách học sinh giỏi, đòi hỏi sự chính xác cao.',
    },
  ];

  const currentMeta: LevelMetadata = (activeDiff && levelsMeta[activeDiff]) || {
    title: `Màn ${lessonId}.${activeDiff === 'easy' ? 1 : activeDiff === 'medium' ? 2 : 3}: Thử thách mức ${activeDiff === 'easy' ? 'Dễ' : activeDiff === 'medium' ? 'Trung bình' : 'Khó'}`,
    objective: `Hoàn thành thử thách để nắm vững kiến thức ${lessonConfig?.shortTitle || ''}.`,
  };

  return (
    <div className="min-h-screen bg-[#F6F5FB] flex flex-col">
      {/* Header thanh điều hướng bài học */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-[#E3E0EE] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] hover:bg-[#E9E4FF] text-[#2A2340] flex items-center justify-center font-bold transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
              aria-label="Quay lại"
            >
              ←
            </button>
            <div>
              <h1 className="font-display font-black text-lg sm:text-xl text-[#2A2340]">
                {lessonConfig?.title || `Bài ${lessonId}`}
              </h1>
              {lessonConfig?.metaphor && (
                <p className="text-xs text-[#6B6485] hidden sm:block">
                  {lessonConfig.metaphor}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenStory}
              className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#5B3FD6] font-display font-bold text-xs sm:text-sm border border-[#C4B5FD] transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
            >
              <span>💡</span>
              <span>Em có biết?</span>
              {!hasViewedStory && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#E5484D] rounded-full ring-2 ring-white animate-ping" />
              )}
              {!hasViewedStory && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#E5484D] rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Thân bài học */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        {activeDiff === null ? (
          // 1. Màn hình chọn 3 mức Dễ / Trung bình / Khó
          <div className="max-w-2xl mx-auto space-y-6 pt-4 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <h2 className="font-display font-black text-2xl text-[#2A2340]">
                Chọn mức thử thách
              </h2>
              <p className="text-sm text-[#6B6485]">
                Vượt qua từng mức để mở khóa các thử thách tiếp theo nhé!
              </p>
            </div>

            <div className="grid gap-4">
              {difficulties.map((diff) => {
                const unlocked = isLevelUnlocked(progress, lessonId, diff.key);
                const levelKey = `${lessonId}_${diff.key}`;
                const levelData = progress.levels[levelKey];
                const stars = (levelData?.stars ?? 0) as StarsType;
                const completed = Boolean(levelData?.completed);

                return (
                  <Card
                    key={diff.key}
                    variant={unlocked ? 'interactive' : 'default'}
                    onClick={() => {
                      if (unlocked) {
                        handleSelectDifficulty(diff.key);
                      }
                    }}
                    className={`p-5 relative transition-all ${
                      !unlocked ? 'opacity-70 bg-[#F6F5FB]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              diff.key === 'easy'
                                ? 'bg-[#1FAF5A]/10 text-[#1FAF5A]'
                                : diff.key === 'medium'
                                  ? 'bg-[#2E90E8]/10 text-[#2E90E8]'
                                  : 'bg-[#5B3FD6]/10 text-[#5B3FD6]'
                            }`}
                          >
                            Mức {diff.label}
                          </span>
                          <span className="text-xs font-semibold text-[#FFC21A] bg-[#FFC21A]/10 px-2 py-0.5 rounded-full">
                            +{diff.xp} XP
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#6B6485]">
                          {diff.desc}
                        </p>

                        <div className="pt-1">
                          {completed ? (
                            <Stars earned={stars} max={3} size="sm" />
                          ) : unlocked ? (
                            <span className="text-xs text-[#1FAF5A] font-semibold">
                              Sẵn sàng thử thách
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B6485] font-medium">
                              🔒 Cần hoàn thành mức trước
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {unlocked ? (
                          <Button
                            variant={completed ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDifficulty(diff.key);
                            }}
                          >
                            {completed ? 'Chơi lại' : 'Bắt đầu'}
                          </Button>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E3E0EE] flex items-center justify-center text-lg text-[#6B6485]">
                            🔒
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : stage === 'intro' ? (
          // 2. LessonShell lo LevelIntro
          <LevelIntro
            lessonName={lessonConfig?.title}
            difficultyLabel={activeDiff === 'easy' ? 'Dễ' : activeDiff === 'medium' ? 'Trung bình' : 'Khó'}
            title={currentMeta.title}
            objective={currentMeta.objective}
            tip={currentMeta.tip}
            onStart={handleStartLevel}
          />
        ) : stage === 'completed' && lastResult ? (
          // 3. LessonShell lo LevelComplete
          <LevelComplete
            stars={lastResult.stars}
            xpGained={xpEarned}
            timeSpentSec={Math.round(lastResult.timeMs / 1000)}
            keyTakeaway={lastResult.learned || 'Em đã vượt qua thử thách này một cách xuất sắc!'}
            onPlayAgain={handlePlayAgain}
            onNextLevel={handleNextLevel}
            hasNextLevel={activeDiff !== 'hard'}
            nextLabel={
              activeDiff === 'hard'
                ? lessonId === 5
                  ? 'Sang Tổng kết'
                  : `Sang Bài ${lessonId + 1}`
                : undefined
            }
            nextLessonUrl={lessonId === 5 ? '#/summary' : `#/lesson/${lessonId + 1}`}
          />
        ) : stage === 'failed' ? (
          // 4. LessonShell lo LevelFailed
          <LevelFailed
            tip={failedTip || 'Hãy quan sát kỹ các dữ kiện và thử lại nhé!'}
            onRetry={handlePlayAgain}
            onExit={() => {
              setActiveDiff(null);
              setStage('intro');
            }}
          />
        ) : (
          // 5. Màn chơi chỉ lo gameplay (nhận onComplete và onFail)
          <div>
            {levels && activeDiff && levels[activeDiff]
              ? React.createElement(levels[activeDiff], { onComplete: handleComplete, onFail: handleFail })
              : renderLevel && activeDiff
                ? renderLevel(activeDiff, { onComplete: handleComplete, onFail: handleFail })
                : typeof children === 'function' && activeDiff
                  ? children(activeDiff, { onComplete: handleComplete, onFail: handleFail })
                  : (children as React.ReactNode)}
          </div>
        )}
      </main>

      {/* Modal Em có biết? */}
      <DidYouKnowModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        cards={storyCards}
        lessonTitle={`Em có biết? — ${lessonConfig?.shortTitle || ''}`}
      />

      {/* Hộp thoại xác nhận thoát màn chơi */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Thoát màn này?"
        maxWidth="sm"
      >
        <p className="text-sm text-[#6B6485] mb-6">
          Tiến độ của màn đang chơi sẽ không được lưu. Em có chắc muốn quay lại không?
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExitConfirm(false)}
          >
            Chơi tiếp
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmExit}
          >
            Thoát
          </Button>
        </div>
      </Modal>
    </div>
  );
};
