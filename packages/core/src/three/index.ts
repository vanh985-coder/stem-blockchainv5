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
export { Character } from './Character';
export type { CharacterProps, CharacterInfo, PoseRequest } from './Character';
export { Bi } from './Bi';
export type { BiProps } from './Bi';
export { Villager } from './Villager';
export type { VillagerProps } from './Villager';
export { DevCharacterGroup } from './DevCharacterGroup';
export { QualityContext, useQualityLevel } from './QualityContext';
export { useQuality } from './useQuality';
export { DevModelViewer } from './DevModelViewer';
export { Sky } from './Sky';
export { DayLight } from './DayLight';
export * from './quality';
export * from './modelIds';
export * from './skyLayout';
export * from './clips';
export * from './clipConfig';
export * from './clipPlayback';
export * from './modelSizes';
export * from './staticMotion';
export * from './wander';
export * from './biMotion';
export * from './poses';
export * from './choiceReactions';
export { PoseLayer } from './PoseLayer';
export { ReactionStage } from './ReactionStage';
export type { ReactionStageProps } from './ReactionStage';
export { useReaction, useChoiceHandlers, rectOf } from './useReaction';
export type { ChoiceHandlers } from './useReaction';
export { modelCacheStats } from './modelLoader';
