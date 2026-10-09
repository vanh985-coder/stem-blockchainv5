import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { buildProgressTable, type ClassProgressRow } from '@so-chung/core/teacher/progress';
import { JoinCodeCard } from './JoinCodeCard';
import { ProgressTab } from './ProgressTab';
import { ResetPasswordModal } from './ResetPasswordModal';
import { StudentDetail } from './StudentDetail';

const rows: ClassProgressRow[] = [
  { student_id: 's1', display_name: 'Bình', level_id: 1, played: true, completed: true, stars: { de: 3, tb: 2, kho: 1 }, best_score: 0, updated_at: '2026-03-01T08:00:00Z', golden_pages: 1 },
  { student_id: 's2', display_name: 'An', level_id: null, played: null, completed: null, stars: null, best_score: null, updated_at: null, golden_pages: null },
];
const students = buildProgressTable(rows);
const render = (el: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);

describe('trang giáo viên (dựng tĩnh)', () => {
  it('bảng tiến độ: tên, 12 cột màn, ký hiệu sao, nút Xuất CSV; không có email', () => {
    const html = render(<ProgressTab students={students} className="10A1" onSelect={() => {}} />);
    expect(html).toContain('Bình');
    expect(html).toContain('★3 ★2 ★1');
    expect(html).toContain('Màn 12');
    expect(html).toContain('Xuất CSV');
    expect(html).toContain('Chưa xong Làng Dệt');
    expect(html).not.toContain('@');
  });

  it('lớp chưa có học sinh thì báo rõ', () => {
    expect(render(<ProgressTab students={[]} className="10A1" onSelect={() => {}} />)).toContain('Lớp chưa có học sinh');
  });

  it('mã lớp to kèm nút Sao chép và lời dặn', () => {
    const html = render(<JoinCodeCard code="AB12CD" />);
    expect(html).toContain('AB12CD');
    expect(html).toContain('Sao chép');
    expect(html).toContain('Học sinh vào Hồ sơ → Nhập mã lớp → Vào lớp.');
  });

  it('hộp đặt lại mật khẩu có nút Tạo ngẫu nhiên', () => {
    const html = render(<ResetPasswordModal studentId="s1" studentName="Bình" onClose={() => {}} />);
    expect(html).toContain('Đặt lại mật khẩu cho Bình');
    expect(html).toContain('Tạo ngẫu nhiên');
  });

  it('chi tiết học sinh: sao từng trạm', () => {
    const html = render(<StudentDetail student={students[1]} onClose={() => {}} />);
    expect(html).toContain('Chi tiết: Bình');
    expect(html).toContain('Dễ');
    expect(html).toContain('★3');
  });
});
