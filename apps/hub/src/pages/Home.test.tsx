import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  AuthContext,
  ProgressContext,
  computeUnlock,
  decodeProgress,
  type AuthState,
  type Profile,
  type ProgressState,
  type Role,
} from '@so-chung/core';
import { Home } from './Home';
import Teacher from './Teacher';

const session = { user: { id: 'u-1' } } as unknown as AuthState['session'];
const profileOf = (role: Role): Profile => ({
  id: 'u-1',
  display_name: 'Lan',
  username: 'lan_01',
  role,
  character_id: 'hoc-sinh-nam',
});

const authOf = (over: Partial<AuthState>): AuthState => ({
  configured: true,
  loading: false,
  profileLoading: false,
  session: null,
  profile: null,
  refreshProfile: async () => {},
  ...over,
});

const progressOf = (goldenPages: number): ProgressState => ({
  mode: 'user',
  progress: decodeProgress(null),
  coins: 0,
  goldenPages,
  unlock: computeUnlock({ doneLevels: [] }),
  saving: false,
  synced: true,
  record: () => ({ coinsEarned: 0 }),
  saveNow: async () => 'saved',
  startGuest: () => {},
});

function render(ui: ReactElement, auth: AuthState, golden = 0): string {
  return renderToStaticMarkup(
    <AuthContext.Provider value={auth}>
      <ProgressContext.Provider value={progressOf(golden)}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ProgressContext.Provider>
    </AuthContext.Provider>,
  );
}

const TEACHER_LINK = 'href="/giao-vien"';

describe('Trang chủ "/" theo vai trò', () => {
  it('chưa đăng nhập: "Đăng nhập để chơi" và "Chơi thử"; không có "Chơi tiếp", không có "Trang giáo viên"', () => {
    const html = render(<Home />, authOf({}));
    expect(html).toContain('Đăng nhập để chơi');
    expect(html).toContain('Chơi thử');
    expect(html).not.toContain('Chơi tiếp');
    expect(html).not.toContain(TEACHER_LINK);
    expect(html).toContain('Đọc truyện');
    expect(html).toContain('Quyền riêng tư');
  });

  it('học sinh: "Chơi tiếp", tên, Trang Sổ Vàng x/4; không có "Trang giáo viên"', () => {
    const html = render(<Home />, authOf({ session, profile: profileOf('student') }), 2);
    expect(html).toContain('Chơi tiếp');
    expect(html).toContain('Chào Lan!');
    expect(html).toContain('Trang Sổ Vàng: 2/4');
    expect(html).not.toContain('Đăng nhập để chơi');
    expect(html).not.toContain(TEACHER_LINK);
  });

  it('giáo viên: có "Trang giáo viên" trỏ tới /giao-vien, và vẫn đủ "Chơi tiếp", tên, x/4', () => {
    const html = render(<Home />, authOf({ session, profile: profileOf('teacher') }), 1);
    expect(html).toContain(TEACHER_LINK);
    expect(html).toContain('Trang giáo viên');
    expect(html).toContain('Chơi tiếp');
    expect(html).toContain('Chào Lan!');
    expect(html).toContain('Trang Sổ Vàng: 1/4');
  });

  it('admin: có "Trang giáo viên" như giáo viên, và vẫn đủ "Chơi tiếp", tên, x/4', () => {
    const html = render(<Home />, authOf({ session, profile: profileOf('admin') }), 4);
    expect(html).toContain(TEACHER_LINK);
    expect(html).toContain('Chơi tiếp');
    expect(html).toContain('Chào Lan!');
    expect(html).toContain('Trang Sổ Vàng: 4/4');
  });

  it('hồ sơ chưa tải xong thì chưa hiện liên kết; tải xong (render lại) thì hiện ra', () => {
    const before = render(<Home />, authOf({ session, profile: null, profileLoading: true }));
    expect(before).not.toContain(TEACHER_LINK);
    expect(before).toContain('Chơi tiếp'); // nút vẫn dùng được trong lúc chờ
    const after = render(<Home />, authOf({ session, profile: profileOf('admin') }));
    expect(after).toContain(TEACHER_LINK);
  });

  it('đang kiểm tra phiên đăng nhập: chưa hiện nút nào (tránh nháy sai trạng thái)', () => {
    const html = render(<Home />, authOf({ loading: true }));
    expect(html).not.toContain('Đăng nhập để chơi');
    expect(html).not.toContain('Chơi tiếp');
  });
});

describe('/giao-vien dùng cùng điều kiện', () => {
  it('giáo viên và admin vào được', () => {
    for (const role of ['teacher', 'admin'] as const) {
      const html = render(<Teacher />, authOf({ session, profile: profileOf(role) }));
      expect(html, role).toContain('Đang làm');
    }
  });

  it('học sinh và khách không thấy nội dung (bị chuyển về trang chủ)', () => {
    expect(render(<Teacher />, authOf({ session, profile: profileOf('student') }))).not.toContain('Đang làm');
    expect(render(<Teacher />, authOf({}))).not.toContain('Đang làm');
  });

  it('có phiên nhưng hồ sơ chưa tải xong: chờ, không đẩy admin về trang chủ', () => {
    const html = render(<Teacher />, authOf({ session, profile: null, profileLoading: true }));
    expect(html).toContain('Đang tải');
    expect(html).not.toContain('Đang làm');
  });
});
