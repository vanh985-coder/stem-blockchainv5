import { createContext, useContext } from 'react';
import type { QualityLevel } from './quality';

/**
 * Mức chất lượng đang dùng, cho các thành phần bên trong <Canvas> (R3F có cây React riêng nên context của trang
 * không tự chuyển vào; <Scene3D> đặt Provider này bên trong Canvas).
 */
export const QualityContext = createContext<QualityLevel>('medium');

export function useQualityLevel(): QualityLevel {
  return useContext(QualityContext);
}
