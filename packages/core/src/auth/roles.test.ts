import { describe, expect, it } from 'vitest';
import { canSeeTeacherPage } from './roles';

describe('canSeeTeacherPage', () => {
  it('giáo viên và admin thì được', () => {
    expect(canSeeTeacherPage('teacher')).toBe(true);
    expect(canSeeTeacherPage('admin')).toBe(true);
  });

  it('học sinh, chưa có hồ sơ, vai trò lạ thì không', () => {
    for (const r of ['student', null, undefined, '', 'Admin', 'superuser']) {
      expect(canSeeTeacherPage(r), String(r)).toBe(false);
    }
  });
});
