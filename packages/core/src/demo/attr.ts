/** Thuộc tính đánh dấu cho bot demo: chỉ có ở bản build VITE_DEMO (bản thường không có thuộc tính nào, không có dấu vết demo trong HTML). */
import { DEMO_BUILD } from './config';

/** `data-demo="<giá trị>"` */
export const da = (value: string): Record<string, string> => (DEMO_BUILD ? { 'data-demo': value } : {});

/** `data-demo-<hậu tố>="<giá trị>"` (bỏ qua khi giá trị rỗng) */
export const dax = (suffix: string, value: string | undefined): Record<string, string> => (DEMO_BUILD && value !== undefined ? { ['data-demo-' + suffix]: value } : {});
