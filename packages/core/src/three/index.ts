/**
 * Lõi 3D (three, R3F, drei). Chỉ import file này ở trang 3D, qua React.lazy / import(), để three nằm ở chunk riêng
 * và không làm nặng trang đầu: `lazy(() => import('@so-chung/core/three/index'))`.
 * Phần không cần three (mức chất lượng, tên model) dùng được từ `@so-chung/core`.
 */
export { Scene3D } from './Scene3D';
export type { Scene3DProps } from './Scene3D';
export { CanvasErrorBoundary, Canvas3DErrorBox } from './CanvasErrorBoundary';
export { DynamicModel, DynamicBoxes } from './DynamicInstances';
export type { DynamicInstancesApi, DynamicBoxesApi, DynamicModelProps, DynamicBoxesProps } from './DynamicInstances';
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
export * from './collision';
export * from './playerMotion';
export * from './cameraRig';
export * from './interaction';
export * from './walkInput';
export * from './walkApi';
export { WalkWorld, WALK_PLAYER } from './WalkWorld';
export type { WalkWorldProps } from './WalkWorld';
export { WalkControls } from './WalkControls';
export type { WalkControlsProps } from './WalkControls';
export { DevWalk } from './DevWalk';
export * from './cameraCollision';
export * from './shadowFocus';
export { MarketPage } from './cho/MarketPage';
export { MarketScene } from './cho/MarketScene';
export type { MarketStats } from './StatsProbe';
export * from './cho/marketLayout';
export * from './cho/instanceSelect';
export { useWalkSession, detectLockMode } from './useWalkSession';
export type { WalkSession } from './useWalkSession';
export { WalkLockOverlay } from './WalkLockOverlay';
export { VillageScene } from './village/VillageScene';
export type { VillageSceneProps } from './village/VillageScene';
export * from './village/villageLayout';
export * from './village/villageQuest';

// Dựng game chạy (mốc 2, bước 11): đất, đồi, texture do code vẽ, nạp trước cảnh, số liệu hiệu năng
export { SceneWarmup } from './SceneWarmup';
export { StatsProbe } from './StatsProbe';
export { Hills, useImageTexture, useDispose } from './cho/MarketProcedural';
export { createGrassTexture, createPaddyTexture, createEdgeAlphaTexture } from './cho/marketTextures';
export { createHayStack } from './cho/marketGeometry';
