import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCreatedClient, getSupabase, mayHaveSession, onClientCreated } from './client';
import { AUTH_CONFIG } from './config';

export type Role = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  username: string | null;
  role: Role;
  character_id: string;
}

export interface AuthState {
  /** Đã cấu hình Supabase (URL và khóa) */
  configured: boolean;
  /** Đang kiểm tra xem có phiên đăng nhập không */
  loading: boolean;
  /** Đã có phiên nhưng hồ sơ chưa đọc xong */
  profileLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Đọc lại hồ sơ (ví dụ sau khi đổi tên hiển thị) */
  refreshProfile: () => Promise<void>;
}

/** Chỉ để test: dựng AuthContext giả (hồ sơ học sinh, giáo viên, admin…). Code thường dùng useAuth(). */
export const AuthContext = createContext<AuthState>({
  configured: AUTH_CONFIG.configured,
  loading: false,
  profileLoading: false,
  session: null,
  profile: null,
  refreshProfile: async () => {},
});

/** Tối thiểu giữa hai lần tự đọc lại hồ sơ khi quay lại tab. */
const REFRESH_MIN_MS = 10_000;

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, role, character_id')
      .eq('id', userId)
      .maybeSingle();
    return error || !data ? null : (data as Profile);
  } catch {
    return null;
  }
}

/**
 * Theo dõi phiên đăng nhập. Thư viện Supabase chỉ được nạp khi có dấu hiệu đang đăng nhập (cookie phiên, hoặc quay về từ Google)
 * hoặc khi em bắt đầu đăng nhập/đăng ký; khách chưa đăng nhập không phải tải nó.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // userId mà việc đọc hồ sơ đã xong (kể cả khi đọc thất bại). Có phiên mà chưa xong = đang tải hồ sơ.
  const [profileDoneFor, setProfileDoneFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => AUTH_CONFIG.configured && mayHaveSession());

  useEffect(() => {
    if (!AUTH_CONFIG.configured) return;
    const unsubs: Array<() => void> = [];
    const attached = new WeakSet<SupabaseClient>();

    const attach = (client: SupabaseClient) => {
      if (attached.has(client)) return;
      attached.add(client);
      const { data } = client.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (!s) setProfile(null);
      });
      unsubs.push(() => data.subscription.unsubscribe());
      void client.auth.getSession().then(({ data: d }) => {
        setSession(d.session);
        setLoading(false);
      });
    };

    unsubs.push(onClientCreated(attach));
    const existing = getCreatedClient();
    if (existing) attach(existing);
    else if (mayHaveSession()) void getSupabase().catch(() => setLoading(false));
    else setLoading(false);

    return () => unsubs.forEach((u) => u());
  }, []);

  const userId = session?.user.id ?? null;

  // Có phiên mà hồ sơ chưa đọc xong thì coi là đang tải. Tính từ userId nên không có khoảng hở giữa
  // lúc có phiên và lúc bắt đầu đọc (khoảng hở đó từng làm /giao-vien đẩy admin về trang chủ).
  const profileLoading = userId !== null && profileDoneFor !== userId;

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(userId));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setProfileDoneFor(null);
      return;
    }
    void fetchProfile(userId).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setProfileDoneFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Vai trò có thể đổi sau khi đăng nhập (admin đổi trong Table Editor): đọc lại hồ sơ khi em quay lại tab.
  useEffect(() => {
    if (!userId) return;
    let last = Date.now();
    const again = () => {
      if (document.visibilityState === 'hidden' || Date.now() - last < REFRESH_MIN_MS) return;
      last = Date.now();
      void fetchProfile(userId).then((p) => {
        if (p) setProfile(p); // đọc lỗi thì giữ hồ sơ cũ
      });
    };
    document.addEventListener('visibilitychange', again);
    window.addEventListener('focus', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('focus', again);
    };
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({ configured: AUTH_CONFIG.configured, loading, profileLoading, session, profile, refreshProfile }),
    [loading, profileLoading, session, profile, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
