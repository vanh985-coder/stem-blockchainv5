/**
 * Lõi 3D (three, R3F, drei). Chỉ import file này ở trang 3D, qua React.lazy / import(), để three nằm ở chunk riêng
 * và không làm nặng trang đầu: `lazy(() => import('@so-chung/core/three/index'))`.
 * Phần không cần three (mức chất lượng, tên model) dùng được từ `@so-chung/core`.
 */
export { Scene3D } from './Scene3D';
export type { Scene3DProps } from './Scene3D';
export { Model, useModel } from './Model';
export type { ModelProps, ModelLod, UsedModel } from './Model';
export { preloadModel, createPlaceholder } from './modelLoader';
export type { ModelData } from './modelLoader';
export { LoadingScreen } from './LoadingScreen';
export { BlobShadow } from './BlobShadow';
export { QualityContext, useQualityLevel } from './QualityContext';
export { useQuality } from './useQuality';
export { DevModelViewer } from './DevModelViewer';
export { Sky } from './Sky';
export { DayLight } from './DayLight';
export * from './quality';
export * from './modelIds';
export * from './skyLayout';
