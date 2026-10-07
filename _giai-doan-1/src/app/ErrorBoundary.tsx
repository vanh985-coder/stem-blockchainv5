import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../components/ui/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Sổ Chung ErrorBoundary]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 bg-white rounded-[20px] border-2 border-[#E5484D] shadow-sticker text-center space-y-4">
            <div className="w-14 h-14 bg-[#FFF0ED] text-[#E5484D] rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h3 className="font-display font-bold text-xl text-[#2A2340]">
              {this.props.fallbackTitle || 'Bài này gặp lỗi'}
            </h3>
            <p className="text-sm text-[#6B6485] leading-relaxed">
              Đã xảy ra sự cố ngoài dự kiến trong khi tải nội dung bài học. Hãy nhấn nút bên dưới để tải lại bài nhé!
            </p>
            {this.state.error && (
              <pre className="text-xs bg-[#F6F5FB] p-3 rounded-[10px] text-[#E5484D] overflow-x-auto text-left max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <div className="pt-2">
              <Button variant="danger" size="sm" onClick={this.handleReload}>
                Tải lại bài
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
