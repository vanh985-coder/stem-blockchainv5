import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TrangSo } from '../components/ui/TrangSo';
import { MatXich } from '../components/ui/MatXich';
import { Mascot } from '../components/ui/Mascot';
import { Tooltip } from '../components/ui/Tooltip';
import { Modal } from '../components/ui/Modal';
import { useProgress } from '../app/ProgressContext';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  isLessonUnlocked,
  isSummaryUnlocked,
  getNextStudyTarget,
} from '../lib/progress';
import { sound } from '../lib/sound';
import { formatNumber } from '../lib/format';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { progress, updateSettings, setName } = useProgress();

  const [soundActive, setSoundActive] = useState(sound.isEnabled());
  const [showWelcomeModal, setShowWelcomeModal] = useState(
    !progress.firstVisitDone && !progress.userName
  );
  const [inputName, setInputName] = useState('');

  // Prefetch bài học tiếp theo khi trình duyệt rảnh rỗi (requestIdleCallback)
  useEffect(() => {
    const target = getNextStudyTarget(progress);
    const prefetch = () => {
      switch (target.lessonId) {
        case 1:
          void import('../lessons/lesson1');
          break;
        case 2:
          void import('../lessons/lesson2');
          break;
        case 3:
          void import('../lessons/lesson3');
          break;
        case 4:
          void import('../lessons/lesson4');
          break;
        case 5:
          void import('../lessons/lesson5');
          break;
      }
    };

    if ('requestIdleCallback' in window) {
      const handle = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        prefetch
      );
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(prefetch, 800);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const toggleSound = () => {
    const newState = sound.toggle();
    setSoundActive(newState);
    updateSettings({ soundEnabled: newState });
  };

  const nextTarget = getNextStudyTarget(progress);
  const isAllComplete = isSummaryUnlocked(progress) && Boolean(progress.levels['5_hard']?.completed);

  // Xác định điểm dừng hiện tại (active node)
  const currentActiveIndex = isAllComplete ? 5 : nextTarget.lessonId - 1;

  const handleSaveName = (nameToSave: string) => {
    setName(nameToSave);
    setShowWelcomeModal(false);
  };

  // Các điểm dừng trên lộ trình Duolingo
  const roadmapItems = [
    ...GAME_CONFIG.lessons.map((lesson, idx) => {
      const unlocked = isLessonUnlocked(progress, lesson.id);
      const isCurrent = idx === currentActiveIndex;
      const easyKey = `${lesson.id}_easy`;
      const medKey = `${lesson.id}_medium`;
      const hardKey = `${lesson.id}_hard`;

      const easyStars = progress.levels[easyKey]?.stars ?? 0;
      const medStars = progress.levels[medKey]?.stars ?? 0;
      const hardStars = progress.levels[hardKey]?.stars ?? 0;

      return {
        id: lesson.id,
        title: lesson.title,
        shortTitle: lesson.shortTitle,
        color: lesson.accent,
        darkColor: lesson.darkAccent,
        unlocked,
        isCurrent,
        stars: [easyStars, medStars, hardStars],
        onClick: () => {
          if (unlocked) {
            sound.playClick();
            navigate(`/lesson/${lesson.id}`);
          }
        },
        lockMessage: `Hoàn thành Bài ${lesson.id - 1} để mở`,
      };
    }),
    {
      id: 6,
      title: 'Tổng kết & Chứng nhận',
      shortTitle: 'Tổng kết',
      color: '#FFC21A',
      darkColor: '#D9A000',
      unlocked: isSummaryUnlocked(progress),
      isCurrent: currentActiveIndex === 5,
      stars: [],
      onClick: () => {
        if (isSummaryUnlocked(progress)) {
          sound.playClick();
          navigate('/summary');
        }
      },
      lockMessage: 'Hoàn thành Bài 5 để mở Tổng kết',
    },
  ];

  // Độ lệch tọa độ ngang tạo đường uốn lượn (X offset)
  const xOffsets = [0, -42, 42, 0, -42, 0];

  return (
    <div className="min-h-screen bg-[#F6F5FB] flex flex-col selection:bg-[#5B3FD6]/20">
      {/* 1. Header đầu trang */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-[#E3E0EE] px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo Sổ Chung */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-[10px] bg-[#5B3FD6] flex items-center justify-center text-white shadow-sticker-sm">
              <span className="font-display font-black text-lg">S</span>
            </div>
            <div>
              <span className="font-display font-black text-xl text-[#5B3FD6] tracking-tight">
                Sổ Chung
              </span>
            </div>
          </div>

          {/* XP, Âm thanh & Cài đặt */}
          <div className="flex items-center gap-3">
            {/* Thẻ XP */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFBEB] rounded-full border border-[#FDE68A] text-[#D9A000] font-display font-black text-sm"
              title="Tổng điểm kinh nghiệm"
            >
              <span>⭐</span>
              <span>{formatNumber(progress.totalXp)} XP</span>
            </div>

            {/* Nút Âm thanh */}
            <button
              type="button"
              onClick={toggleSound}
              className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] hover:bg-[#E9E4FF] text-[#2A2340] flex items-center justify-center text-base transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
              aria-label={soundActive ? 'Tắt âm thanh' : 'Bật âm thanh'}
              title={soundActive ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundActive ? '🔊' : '🔇'}
            </button>

            {/* Nút Cài đặt */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                navigate('/settings');
              }}
              className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] hover:bg-[#E9E4FF] text-[#2A2340] flex items-center justify-center text-base transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
              aria-label="Mở Cài đặt"
              title="Cài đặt"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero ngắn & Màn mở đầu duy nhất: 3 trang sổ rơi xuống khớp mắt xích */}
      <section className="px-4 pt-8 pb-10 max-w-4xl mx-auto w-full text-center">
        <h1 className="font-display font-black text-3xl sm:text-4xl text-[#2A2340] mb-3 leading-tight">
          Blockchain, giải thích bằng một cuốn sổ
        </h1>
        <p className="text-base sm:text-lg text-[#6B6485] mb-6 max-w-xl mx-auto font-medium">
          5 bài, 15 thử thách nhỏ, mỗi bài khoảng 15 phút.
        </p>

        <div className="flex justify-center mb-8">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              const targetPath = nextTarget.isSummary
                ? '/summary'
                : `/lesson/${nextTarget.lessonId}`;
              navigate(targetPath);
            }}
            className="px-8 shadow-sticker text-base sm:text-lg"
          >
            {progress.totalXp > 0
              ? `Học tiếp Bài ${nextTarget.lessonId}`
              : 'Bắt đầu học'}
          </Button>
        </div>

        {/* Màn mở đầu dàn dựng: 3 trang sổ rơi xuống và mắt xích khớp vào nhau (khoảng 1.2s bằng CSS keyframes) */}
        <div className="relative py-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* Trang 1 */}
            <div className="hero-anim-page-1">
              <TrangSo
                size="sm"
                pageNumber={1}
                prevCode={10}
                content={23}
                pageCode={43}
                isConfirmed={true}
              />
            </div>

            {/* Mắt xích 1 nối Trang 1 và Trang 2 */}
            <div className="hero-anim-chain-1">
              <MatXich status="valid" size="md" />
            </div>

            {/* Trang 2 */}
            <div className="hero-anim-page-2">
              <TrangSo
                size="sm"
                pageNumber={2}
                prevCode={43}
                content={45}
                pageCode={31}
                isConfirmed={true}
              />
            </div>

            {/* Mắt xích 2 nối Trang 2 và Trang 3 */}
            <div className="hero-anim-chain-2">
              <MatXich status="valid" size="md" />
            </div>

            {/* Trang 3 */}
            <div className="hero-anim-page-3">
              <TrangSo
                size="sm"
                pageNumber={3}
                prevCode={31}
                content={7}
                pageCode={69}
                isConfirmed={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Lộ trình uốn lượn phong cách Duolingo với 6 điểm dừng */}
      <section className="flex-1 max-w-lg mx-auto w-full px-4 pb-16">
        <div className="text-center mb-8">
          <h2 className="font-display font-black text-2xl text-[#2A2340]">
            Lộ trình bài học
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6485]">
            Mỗi bài là một trang mở rộng của cuốn sổ chung
          </p>
        </div>

        {/* Cột lộ trình */}
        <div className="relative flex flex-col items-center gap-10 sm:gap-12 py-4">
          {roadmapItems.map((item, index) => {
            const xOffset = xOffsets[index % xOffsets.length];

            const buttonNode = (
              <div
                style={{ transform: `translateX(${xOffset}px)` }}
                className="relative flex flex-col items-center group transition-transform duration-200"
              >
                {/* Linh vật Bi đứng cạnh điểm dừng hiện tại kèm bong bóng thoại */}
                {item.isCurrent && (
                  <div className="absolute -top-16 -right-16 sm:-right-20 z-20 pointer-events-none hidden xs:block">
                    <Mascot
                      mood="vui"
                      size="sm"
                      speechBubble={`Tiếp tục ${item.shortTitle} nhé!`}
                    />
                  </div>
                )}

                {/* Nút tròn lớn kiểu 3D */}
                <button
                  type="button"
                  disabled={!item.unlocked}
                  onClick={item.onClick}
                  style={{
                    backgroundColor: item.unlocked ? item.color : '#E3E0EE',
                    borderColor: item.unlocked ? item.darkColor : '#D0CCE0',
                  }}
                  className={`
                    w-20 h-20 sm:w-22 sm:h-22 rounded-full border-b-6 flex flex-col items-center justify-center
                    transition-all duration-150 cursor-pointer shadow-sticker
                    focus-visible:outline-3 focus-visible:outline-[#5B3FD6] focus-visible:outline-offset-4
                    ${item.isCurrent ? 'animate-bounce shadow-sticker-lg' : ''}
                    ${item.unlocked ? 'active:translate-y-1 active:border-b-2 hover:scale-105' : 'cursor-not-allowed opacity-85'}
                  `}
                  aria-label={`${item.title} ${item.unlocked ? 'đã mở khóa' : 'đang khóa'}`}
                >
                  {item.unlocked ? (
                    <span className="font-display font-black text-2xl sm:text-3xl text-white drop-shadow-sm">
                      {item.id === 6 ? '🏆' : item.id}
                    </span>
                  ) : (
                    <span className="text-2xl text-[#6B6485]">🔒</span>
                  )}
                </button>

                {/* Tiêu đề dưới nút */}
                <span className="mt-2 font-display font-bold text-xs sm:text-sm text-[#2A2340] max-w-[130px] text-center leading-tight">
                  {item.title}
                </span>

                {/* 3 chấm / sao cho 3 mức (Dễ / Trung bình / Khó) */}
                {item.stars.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {item.stars.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className={`w-2.5 h-2.5 rounded-full ${
                          s > 0 ? 'bg-[#FFC21A]' : 'bg-[#E3E0EE]'
                        }`}
                        title={`Mức ${sIdx + 1}: ${s} sao`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );

            if (!item.unlocked) {
              return (
                <Tooltip key={item.id} content={item.lockMessage}>
                  {buttonNode}
                </Tooltip>
              );
            }

            return <React.Fragment key={item.id}>{buttonNode}</React.Fragment>;
          })}
        </div>
      </section>

      {/* 4. Modal chào mừng lần đầu vào web: hỏi "Tên em là gì?" */}
      <Modal
        isOpen={showWelcomeModal}
        onClose={() => handleSaveName('Em')}
        title="Chào mừng em đến với Sổ Chung!"
        maxWidth="sm"
        showCloseButton={false}
      >
        <div className="text-center space-y-4">
          <Mascot mood="vui" size="lg" className="mx-auto" />

          <div className="space-y-1">
            <h4 className="font-display font-bold text-lg text-[#2A2340]">
              Tên em là gì?
            </h4>
            <p className="text-xs text-[#6B6485]">
              Tên sẽ xuất hiện trong các cuộc trò chuyện cùng linh vật Bi và trên Chứng nhận khóa học.
            </p>
          </div>

          <input
            type="text"
            placeholder="Nhập tên em (ví dụ: An, Linh...)"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputName.trim()) {
                handleSaveName(inputName.trim());
              }
            }}
            className="w-full h-12 px-4 rounded-[14px] border-2 border-[#E3E0EE] font-display font-bold text-base text-[#2A2340] focus:border-[#5B3FD6] focus:outline-none"
            autoFocus
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => handleSaveName('Em')}
              className="text-xs font-bold text-[#6B6485] hover:text-[#2A2340] py-2 px-3 rounded-lg cursor-pointer"
            >
              Bỏ qua
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveName(inputName.trim() || 'Em')}
            >
              Bắt đầu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
