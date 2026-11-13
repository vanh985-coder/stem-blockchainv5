import { useProgress } from '@react-three/drei';
import { LoadingScreen } from '../ui/LoadingScreen';

/**
 * Màn chờ của khung 3D và 2.5D: là màn chờ chung (`LoadingScreen`) phủ lên khung cha, tiến độ lấy từ `useProgress` của drei
 * (đo mọi file mà LoadingManager đang tải: model, texture). Tên màn (nếu có) lấy từ `LoadingTitleProvider` của khung màn chơi.
 */
export function SceneLoading({ shown }: { shown: boolean }) {
  const progress = useProgress((s) => s.progress);
  return <LoadingScreen shown={shown} fullScreen={false} percent={progress} testId="man-cho-tai-canh" />;
}
