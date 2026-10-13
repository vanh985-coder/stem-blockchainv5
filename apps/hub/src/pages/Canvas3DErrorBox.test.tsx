import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Canvas3DErrorBox } from '@so-chung/core/three/index';

describe('hộp "Cảnh 3D gặp lỗi"', () => {
  it('hiện tiêu đề, lời nhắn, nút "Tải lại" và "Bản đồ" (chữ lấy từ content/)', () => {
    const html = renderToStaticMarkup(<Canvas3DErrorBox />);
    expect(html).toContain('Cảnh 3D gặp lỗi');
    expect(html).toContain('Tải lại');
    expect(html).toContain('Bản đồ');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('{');
  });
});
