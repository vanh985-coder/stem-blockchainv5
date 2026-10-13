import { Component, type ErrorInfo, type ReactNode } from 'react';
import { HUB_MAP_URL } from '../config/urls';
import { ui } from '../content/ui';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { logCanvasError } from './canvasLog';

/** Hộp báo lỗi trên nền giấy dó: "Cảnh 3D gặp lỗi" với nút "Tải lại" và "Bản đồ". */
export function Canvas3DErrorBox({ onReload = () => window.location.reload(), onMap = () => window.location.assign(HUB_MAP_URL), className = '' }: { onReload?: () => void; onMap?: () => void; className?: string }) {
  return (
    <div role="alert" className={`grid size-full place-items-center bg-giay p-4 ${className}`}>
      <Panel className="w-full max-w-md space-y-4 text-center">
        <h2 className="text-2xl">{ui.loi3D.tieuDe}</h2>
        <p>{ui.loi3D.moTa}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={onReload}>
            {ui.loi3D.taiLai}
          </Button>
          <Button size="lg" variant="secondary" onClick={onMap}>
            {ui.loi3D.banDo}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

interface Props {
  children: ReactNode;
  /** Thay cho hộp báo lỗi mặc định (khung 3D trang bài học: null = chỉ ẩn khung) */
  fallback?: ReactNode | ((error: unknown) => ReactNode);
  /** Báo cho nơi gọi (ví dụ ẩn khung) */
  onError?: (error: unknown) => void;
  /** Hộp báo lỗi phủ kín cả màn hình (trang 3D toàn màn hình có lớp HUD và lớp "Bấm để điều khiển" nằm trên cảnh, nếu không phủ thì chặn mất nút) */
  covers?: boolean;
}

/**
 * Lớp chặn lỗi quanh một Canvas 3D. R3F ném lại lỗi dựng cảnh lên cây React phía trên Canvas nên bắt được ở đây: thay vì trang trắng, hiện hộp báo lỗi
 * (hoặc `fallback`), ghi lỗi ra console. Bọc ngoài Canvas, không bọc trong.
 */
export class CanvasErrorBoundary extends Component<Props, { error: unknown; failed: boolean }> {
  state = { error: null as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    logCanvasError(error, info);
    this.props.onError?.(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const f = this.props.fallback;
    if (f === undefined) return <Canvas3DErrorBox className={this.props.covers ? 'fixed inset-0 z-[100]' : ''} />;
    return typeof f === 'function' ? f(this.state.error) : f;
  }
}
