import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TrangSo } from '../components/ui/TrangSo';
import { MatXich } from '../components/ui/MatXich';
import { Mascot, MascotMood } from '../components/ui/Mascot';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Hearts } from '../components/ui/Hearts';
import { Stars } from '../components/ui/Stars';
import { NumberInput } from '../components/ui/NumberInput';
import { Tooltip } from '../components/ui/Tooltip';
import { FeedbackSheet } from '../components/game/FeedbackSheet';
import { DidYouKnowModal } from '../components/game/DidYouKnowModal';
import { TapOrDragContainer, DraggableCard, DroppableSlot } from '../components/game/TapOrDrag';
import { sound } from '../lib/sound';

export const UiGallery: React.FC = () => {
  const navigate = useNavigate();

  // State cho các component tương tác mẫu
  const [stampConfirmed, setStampConfirmed] = useState(true);
  const [chainStatus, setChainStatus] = useState<'valid' | 'broken'>('valid');
  const [currentMascotMood, setCurrentMascotMood] = useState<MascotMood>('vui');
  const [numValue, setNumValue] = useState<number | null>(42);
  const [progressVal, setProgressVal] = useState(65);
  const [heartCount, setHeartCount] = useState(3);
  const [starCount, setStarCount] = useState(2);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isFeedbackCorrect, setIsFeedbackCorrect] = useState(true);

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // Kéo thả demo
  const [dragSlot, setDragSlot] = useState<string | null>(null);

  const handleDropOrPlace = (itemId: string, slotId: string) => {
    setDragSlot(`Thẻ "${itemId}" đã đặt vào ${slotId}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F5FB] p-4 sm:p-8 font-body">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E3E0EE]">
          <div>
            <h1 className="font-display font-black text-3xl text-[#5B3FD6]">
              Thư viện Giao diện (UI Gallery)
            </h1>
            <p className="text-sm text-[#6B6485]">
              Kiểm tra toàn bộ design system "Vở ô ly & Mực tím", component và hiệu ứng
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
            <Button
              variant="purple"
              size="sm"
              onClick={() => navigate('/dev/self-test')}
            >
              Xem Self-Test
            </Button>
          </div>
        </div>

        {/* 1. TrangSo (Thẻ trang sổ ô ly có lề đỏ & con dấu) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#2A2340]">
              1. Thẻ trang sổ (TrangSo) — Điểm nhấn thiết kế
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStampConfirmed(!stampConfirmed)}
            >
              {stampConfirmed ? 'Bỏ đóng dấu' : 'Đóng dấu trang'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 items-start">
            {/* Trang sổ hợp lệ đã đóng dấu */}
            <div>
              <div className="text-xs font-semibold text-[#6B6485] mb-2">Đã xác nhận (Có con dấu xoay)</div>
              <TrangSo
                pageNumber={3}
                content="Bình chuyển 15 xu cho Chi"
                pageCode="8391"
                prevCode="4012"
                isConfirmed={stampConfirmed}
              />
            </div>

            {/* Trang sổ chưa đóng dấu */}
            <div>
              <div className="text-xs font-semibold text-[#6B6485] mb-2">Đang biên soạn (Chưa chốt)</div>
              <TrangSo
                pageNumber={4}
                content="Chi nhận 15 xu từ Bình"
                pageCode="---"
                prevCode="8391"
                isConfirmed={false}
              />
            </div>

            {/* Trang sổ bị sửa đổi sai lệch */}
            <div>
              <div className="text-xs font-semibold text-[#6B6485] mb-2">Bị sai lệch (Viền đỏ bút cô)</div>
              <TrangSo
                pageNumber={2}
                content="Tí tự ý đổi: 1000 xu!"
                pageCode="9999"
                prevCode="1042"
                isInvalid={true}
              />
            </div>
          </div>
        </section>

        {/* 2. Mắt xích (MatXich) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#2A2340]">
              2. Mắt xích SVG (MatXich)
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setChainStatus(chainStatus === 'valid' ? 'broken' : 'valid')
              }
            >
              Đổi trạng thái ({chainStatus === 'valid' ? 'Gãy đôi' : 'Nối liền'})
            </Button>
          </div>

          <Card className="flex flex-wrap items-center gap-8 p-6 bg-white">
            <div className="text-center space-y-2">
              <MatXich status="valid" size="lg" />
              <div className="text-xs font-bold text-[#1FAF5A]">Hợp lệ (Nối liền)</div>
            </div>

            <div className="text-center space-y-2">
              <MatXich status="broken" size="lg" />
              <div className="text-xs font-bold text-[#E5484D]">Bị gãy (Tách đôi)</div>
            </div>

            <div className="text-center space-y-2">
              <MatXich status={chainStatus} size="lg" />
              <div className="text-xs font-bold text-[#5B3FD6]">Chuyển động tương tác</div>
            </div>
          </Card>
        </section>

        {/* 3. Nút bấm 3D */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            3. Nút kiểu 3D (Viền dưới 4px, nhấn lún 2px)
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary">Bắt đầu (Chính)</Button>
            <Button variant="secondary">Quay lại (Phụ)</Button>
            <Button variant="danger">Thử lại (Nguy hiểm)</Button>
            <Button variant="purple">Đóng dấu trang</Button>
            <Button variant="yellow">Xem gợi ý</Button>
            <Button variant="ghost">Nút tối giản</Button>
            <Tooltip content="Hoàn thành Bài 1 để mở">
              <Button variant="primary" disabled>
                Đã khóa (Xem tooltip)
              </Button>
            </Tooltip>
          </div>
        </section>

        {/* 4. Linh vật Bi (5 biểu cảm) */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            4. Linh vật Bi (5 biểu cảm qua SVG)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {(['vui', 'suy_nghi', 'buon', 'an_mung', 'ngac_nhien'] as MascotMood[]).map(
              (mood) => (
                <Card
                  key={mood}
                  variant={currentMascotMood === mood ? 'interactive' : 'default'}
                  onClick={() => {
                    sound.playClick();
                    setCurrentMascotMood(mood);
                  }}
                  className="text-center p-4 cursor-pointer"
                >
                  <Mascot mood={mood} size="md" className="mx-auto" />
                  <span className="font-display font-bold text-sm text-[#2A2340] block mt-2">
                    {mood}
                  </span>
                </Card>
              )
            )}
          </div>
        </section>

        {/* 5. Nhân vật phụ */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            5. Nhân vật phụ khóa học
          </h2>
          <div className="flex flex-wrap gap-6 items-center">
            <Avatar character="ti" size="lg" showName />
            <Avatar character="binh" size="lg" showName />
            <Avatar character="chi" size="lg" showName />
            <Avatar character="an" size="lg" showName />
            <Avatar character="dung" size="lg" showName />
            <Avatar character="bi" size="lg" showName />
          </div>
        </section>

        {/* 6. Trợ năng kéo thả / chạm chọn chạm đặt */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            6. Kéo thả & Chạm chọn chạm đặt (TapOrDrag)
          </h2>
          <Card className="p-6 bg-white space-y-4">
            <p className="text-xs sm:text-sm text-[#6B6485]">
              Học sinh có thể <b>kéo thả chuột/chạm vuốt</b> HOẶC <b>chạm vào thẻ để chọn rồi chạm vào ô để đặt</b>.
            </p>

            <TapOrDragContainer onDropOrPlace={handleDropOrPlace}>
              <div className="flex flex-wrap gap-4 mb-4">
                <DraggableCard id="GiaoDichA">
                  <div className="p-3 bg-white border-2 border-[#5B3FD6] rounded-[14px] font-display font-bold text-xs text-[#5B3FD6] shadow-sticker-sm">
                    Giao dịch A: 50k
                  </div>
                </DraggableCard>
                <DraggableCard id="GiaoDichB">
                  <div className="p-3 bg-white border-2 border-[#1FAF5A] rounded-[14px] font-display font-bold text-xs text-[#1FAF5A] shadow-sticker-sm">
                    Giao dịch B: 20k
                  </div>
                </DraggableCard>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DroppableSlot id="O-Trang-1" placeholder="Ô Trang Sổ 1" className="min-h-[80px]" />
                <DroppableSlot id="O-Trang-2" placeholder="Ô Trang Sổ 2" className="min-h-[80px]" />
              </div>
            </TapOrDragContainer>

            {dragSlot && (
              <div className="text-xs font-bold text-[#1FAF5A] bg-[#1FAF5A]/10 p-2.5 rounded-[10px]">
                ✓ {dragSlot}
              </div>
            )}
          </Card>
        </section>

        {/* 7. Tiện ích & Trợ năng */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            7. Tiện ích điều khiển & Trợ năng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="space-y-3">
              <span className="text-xs font-semibold text-[#6B6485] block">
                NumberInput 3D
              </span>
              <NumberInput
                value={numValue}
                onChange={setNumValue}
                min={0}
                max={100}
              />
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B6485]">Thanh tiến độ</span>
                <span className="text-xs font-bold text-[#1FAF5A]">{progressVal}%</span>
              </div>
              <ProgressBar current={progressVal} max={100} />
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setProgressVal(Math.max(0, progressVal - 20))}>-20%</Button>
                <Button variant="secondary" size="sm" onClick={() => setProgressVal(Math.min(100, progressVal + 20))}>+20%</Button>
              </div>
            </Card>

            <Card className="space-y-3">
              <span className="text-xs font-semibold text-[#6B6485] block">Tim & Sao</span>
              <div className="space-y-2">
                <Hearts current={heartCount} max={3} />
                <Stars earned={starCount} max={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setHeartCount(heartCount > 0 ? heartCount - 1 : 3)}>Đổi tim</Button>
                <Button variant="secondary" size="sm" onClick={() => setStarCount((starCount + 1) % 4)}>Đổi sao</Button>
              </div>
            </Card>
          </div>
        </section>

        {/* 8. Kiểm tra FeedbackSheet và Modal */}
        <section className="space-y-4 pb-12">
          <h2 className="font-display font-bold text-xl text-[#2A2340]">
            8. Thử nghiệm Phản hồi & Hộp truyện
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              onClick={() => {
                setIsFeedbackCorrect(true);
                setIsFeedbackOpen(true);
              }}
            >
              Mở Feedback Đúng (Xanh)
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsFeedbackCorrect(false);
                setIsFeedbackOpen(true);
              }}
            >
              Mở Feedback Sai (Đỏ)
            </Button>
            <Button
              variant="purple"
              onClick={() => setIsStoryModalOpen(true)}
            >
              Mở hộp "Em có biết?" mẫu
            </Button>
          </div>
        </section>
      </div>

      {/* Sheet phản hồi */}
      <FeedbackSheet
        isOpen={isFeedbackOpen}
        isCorrect={isFeedbackCorrect}
        whatHappened={
          isFeedbackCorrect
            ? 'Mã trang mới đã được tính chính xác và khớp với nội dung!'
            : 'Mã trang không khớp vì nội dung trang đã bị thay đổi trái phép.'
        }
        whyHappened={
          isFeedbackCorrect
            ? 'Hàm băm tạo ra con số đại diện tất định từ từng chữ cái trong trang.'
            : 'Mỗi thay đổi dù nhỏ nhất cũng làm thay đổi toàn bộ mã băm phía sau.'
        }
        howToFix={
          !isFeedbackCorrect
            ? 'Hãy kiểm tra lại nội dung trang trước và tính lại mã trang.'
            : undefined
        }
        onContinue={() => setIsFeedbackOpen(false)}
      />

      {/* Modal Em có biết? mẫu */}
      <DidYouKnowModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        cards={[
          {
            title: 'Khối đầu tiên: Khối Genesis',
            text: 'Trang đầu tiên của cuốn sổ không có trang nào đi trước, nên mã trang trước thường được gán là 0.',
            example: 'Khối Genesis của Bitcoin ra đời vào ngày 3/1/2009.',
          },
          {
            title: 'Mực tím không thể tẩy xóa',
            text: 'Dữ liệu khi đã chốt vào sổ chung thì không ai có thể xóa đi, chỉ có thể ghi thêm trang mới để sửa sai.',
            example: 'Giống như bút mực viết vào vở ô ly, mọi dấu vết đều được lưu giữ trung thực.',
          },
        ]}
      />
    </div>
  );
};
