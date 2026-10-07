import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mascot } from '../components/ui/Mascot';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F6F5FB] flex items-center justify-center p-4">
      <Card variant="paper" className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Mascot mood="ngac_nhien" size="xl" />
        </div>

        <div>
          <span className="font-display font-black text-6xl text-[#5B3FD6] block">
            404
          </span>
          <h2 className="font-display font-bold text-2xl text-[#2A2340] mt-2">
            Trang sổ này không tồn tại
          </h2>
          <p className="text-sm text-[#6B6485] mt-2 leading-relaxed">
            Dường như trang sổ em tìm kiếm chưa từng được ghi lại hoặc đã chuyển sang một địa chỉ khác.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Button variant="primary" size="md" onClick={() => navigate('/')}>
            Quay về trang chủ
          </Button>
        </div>
      </Card>
    </div>
  );
};
