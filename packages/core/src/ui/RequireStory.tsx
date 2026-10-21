import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { canSeeTeacherPage } from '../auth/roles';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';
import { storyGate, type StoryGate } from '../progress/storyFlags';

/**
 * Có phải đọc cốt truyện trước khi vào chợ không (bước X1): 'wait' khi chưa biết (đang tải phiên, hồ sơ hay tiến độ), 'read' khi phải đọc, 'ok' khi không phải (giáo viên, đã đọc, hoặc đã có tiến độ từ trước).
 * Quyết định bằng hàm thuần `storyGate`.
 */
export function useStoryGate(): StoryGate {
  const { loading, profileLoading, profile } = useAuth();
  const { mode, synced, progress } = useProgress();
  return storyGate({ mode, synced, authLoading: loading || profileLoading, isTeacher: canSeeTeacherPage(profile?.role), progress });
}

/**
 * Bọc trang /cho: chưa đọc truyện thì chuyển về /truyen (không tải trang 3D); chưa biết thì chờ; được vào thì dựng `children`.
 */
export function RequireStory({ children }: { children: ReactNode }) {
  const gate = useStoryGate();
  if (gate === 'wait') return <p className="p-6">{ui.chung.dangTai}</p>;
  if (gate === 'read') return <Navigate to="/truyen" replace />;
  return <>{children}</>;
}
