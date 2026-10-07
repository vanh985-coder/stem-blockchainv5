import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useProgress } from '../app/ProgressContext';
import { sound } from '../lib/sound';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { progress, updateSettings, setName: setProgressName, resetProgress } = useProgress();

  const [name, setName] = useState(progress.userName || '');
  const [nameSaved, setNameSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setProgressName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleConfirmReset = () => {
    resetProgress();
    setShowResetConfirm(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F6F5FB] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b-2 border-[#E3E0EE] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-[#F6F5FB] border border-[#E3E0EE] hover:bg-[#E9E4FF] text-[#2A2340] flex items-center justify-center font-bold transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-[#5B3FD6]"
              aria-label="Quay lại trang chủ"
            >
              ←
            </button>
            <h1 className="font-display font-black text-xl text-[#2A2340]">Cài đặt</h1>
          </div>
        </div>
      </header>

      {/* Nội dung cài đặt */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* 1. Đổi tên học sinh */}
        <Card variant="default">
          <h3 className="font-display font-bold text-lg text-[#2A2340] mb-2">
            Thông tin người học
          </h3>
          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên em..."
              className="flex-1 h-12 px-4 rounded-[14px] border-2 border-[#E3E0EE] font-display font-bold text-[#2A2340] focus:border-[#5B3FD6] focus:outline-none"
            />
            <Button variant="primary" size="sm" type="submit">
              {nameSaved ? 'Đã lưu ✓' : 'Lưu tên'}
            </Button>
          </form>
        </Card>

        {/* 2. Trải nghiệm & Hiển thị */}
        <Card variant="default" className="space-y-4">
          <h3 className="font-display font-bold text-lg text-[#2A2340]">
            Trải nghiệm & Trợ năng
          </h3>

          {/* Âm thanh */}
          <div className="flex items-center justify-between py-2 border-b border-[#E9E4FF]">
            <div>
              <div className="font-display font-bold text-sm text-[#2A2340]">
                Hiệu ứng âm thanh
              </div>
              <div className="text-xs text-[#6B6485]">
                Phát âm thanh khi trả lời đúng, sai và hoàn thành màn
              </div>
            </div>
            <input
              type="checkbox"
              checked={progress.settings.soundEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                sound.setEnabled(checked);
                updateSettings({ soundEnabled: checked });
              }}
              className="w-6 h-6 rounded accent-[#5B3FD6] cursor-pointer"
            />
          </div>

          {/* Giảm chuyển động */}
          <div className="flex items-center justify-between py-2 border-b border-[#E9E4FF]">
            <div>
              <div className="font-display font-bold text-sm text-[#2A2340]">
                Giảm chuyển động
              </div>
              <div className="text-xs text-[#6B6485]">
                Tắt bớt các hiệu ứng chuyển động trang trí cho người dùng nhạy cảm
              </div>
            </div>
            <input
              type="checkbox"
              checked={progress.settings.reducedMotion}
              onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              className="w-6 h-6 rounded accent-[#5B3FD6] cursor-pointer"
            />
          </div>

          {/* Chữ to (trình chiếu) */}
          <div className="flex items-center justify-between py-2 border-b border-[#E9E4FF]">
            <div>
              <div className="font-display font-bold text-sm text-[#2A2340]">
                Chữ to (trình chiếu lớp học)
              </div>
              <div className="text-xs text-[#6B6485]">
                Tăng cỡ chữ toàn màn hình lên 125% khi chiếu màn hình lớn
              </div>
            </div>
            <input
              type="checkbox"
              checked={progress.settings.presentationFont}
              onChange={(e) => updateSettings({ presentationFont: e.target.checked })}
              className="w-6 h-6 rounded accent-[#5B3FD6] cursor-pointer"
            />
          </div>

          {/* Chế độ giáo viên */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-display font-bold text-sm text-[#2A2340]">
                Chế độ giáo viên
              </div>
              <div className="text-xs text-[#6B6485]">
                Mở khóa tất cả 5 bài và trang Tổng kết để dễ dàng giảng dạy
              </div>
            </div>
            <input
              type="checkbox"
              checked={progress.settings.teacherMode}
              onChange={(e) => updateSettings({ teacherMode: e.target.checked })}
              className="w-6 h-6 rounded accent-[#5B3FD6] cursor-pointer"
            />
          </div>
        </Card>

        {/* 3. Vùng nguy hiểm: Xóa tiến độ */}
        <Card variant="default" className="border-red-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-[#E5484D]">
                Xóa toàn bộ tiến độ
              </h3>
              <p className="text-xs text-[#6B6485]">
                Xóa sạch sao, kinh nghiệm XP và lịch sử học tập trên thiết bị này.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
            >
              Xóa tiến độ
            </Button>
          </div>
        </Card>
      </main>

      {/* Hộp thoại xác nhận xóa tiến độ */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Xóa toàn bộ tiến độ?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#6B6485] leading-relaxed">
            Hành động này không thể hoàn tác. Mọi điểm XP, sao và dữ liệu bài học sẽ được đặt lại về ban đầu.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResetConfirm(false)}
            >
              Giữ lại
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReset}
            >
              Xóa tiến độ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
