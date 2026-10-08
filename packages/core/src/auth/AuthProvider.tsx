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

const AuthContext = createContext<AuthState>({
  configured: AUTH_CONFIG.configured,
  loading: false,
  profileLoading: false,
  session: null,
  profile: null,
  refreshProfile: async () => {},
});

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
  const [profileLoading, setProfileLoading] = useState(false);
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
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    void fetchProfile(userId).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setProfileLoading(false);
    });
    return () => {
      cancelled = true;
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
