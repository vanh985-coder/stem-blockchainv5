export type { VillageModule, VillageId } from './village';
export { URLS, HUB_MAP_URL, MERGED, VILLAGE_IDS, resolveUrls, levelUrl, gateUrl, hubMapUrl, hubPageUrl } from './config/urls';
export type { AppUrls, UrlEnv } from './config/urls';
export { VillageApp } from './ui/VillageApp';
export { ExternalRedirect } from './ui/ExternalRedirect';
export { lazyRoute } from './ui/lazyRoute';
export { asset, loadManifest, useManifest, ASSETS_URL } from './assets/store';
export { lookupAsset, hasAsset, normalizeAssetPath, resolveAssetsUrl } from './assets/manifest';
export type { Manifest, ManifestEntry } from './assets/manifest';
export { AssetImage } from './assets/AssetImage';
export { Portrait, PORTRAIT_IDS } from './assets/Portrait';
export type { PortraitId } from './assets/Portrait';
export { BiAvatar } from './assets/BiAvatar';
export { StarIcon, STAR_ICON_PATH } from './assets/StarIcon';
export { fmt, makeFmt, formatText, characterNames, speakerLabel, capitalize, CHARACTERS, CHARACTER_IDS, phanDien } from './content/characters';
export type { CharacterId, CharacterInfo, FmtVars, NameTable } from './content/characters';
export { ui } from './content/ui';
export { SettingsProvider, useSettings } from './settings/SettingsProvider';
export { SETTINGS_KEY } from './settings/settings';
export type { Settings } from './settings/settings';
export { Button } from './ui/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './ui/Button';
export { Panel } from './ui/Panel';
export { PortraitFrame } from './ui/PortraitFrame';
export { Hearts } from './ui/Hearts';
export { Card } from './ui/Card';
export { rich } from './ui/rich';
export { ProgressBar } from './ui/ProgressBar';
export { Modal } from './ui/Modal';
export { Avatar } from './ui/Avatar';
export { TapOrDragContainer, DraggableCard, DroppableSlot, useTapOrDrag } from './ui/TapOrDrag';
export { LevelFailed } from './ui/LevelFailed';
export { DialogueBox, toVnTurns } from './ui/DialogueBox';
export { withMoods } from './lesson2d/flow';
export { VnDialog, PORTRAIT_SIZE_WIDE, PORTRAIT_SIZE_NARROW } from './ui/VnDialog';
export { NenTrangTri } from './ui/NenTrangTri';
export type { NenTrangTriProps } from './ui/NenTrangTri';
export { PAGE_THEME, VILLAGE_THEME, THEME_GRADIENT, THEME_FADE_MS, STORY_IMAGE_OPACITY, storyTheme } from './content/nenTrangTri';
export type { NenTheme, PageKey } from './content/nenTrangTri';
export type { VnTurn, VnDialogProps } from './ui/VnDialog';
export type { DialogueTurn, DialogueBoxProps } from './ui/DialogueBox';
export { BottomSheet } from './ui/BottomSheet';
export { Stars } from './ui/Stars';
export { FeedbackSheet } from './ui/FeedbackSheet';
export type { FeedbackSheetProps } from './ui/FeedbackSheet';
export { LevelIntro } from './ui/LevelIntro';
export type { LevelIntroProps, MascotMood } from './ui/LevelIntro';
export { LevelComplete } from './ui/LevelComplete';
export type { LevelCompleteProps } from './ui/LevelComplete';
export { SettingsPanel } from './ui/SettingsPanel';
export { sound } from './audio/sound';
export { QuizCard } from './ui/QuizCard';
export type { QuizCardProps } from './ui/QuizCard';
export { QUESTIONS, FINAL_CHALLENGE_IDS, finalChallengeQuestions, questionById } from './content/questions';
export type { Question, QuizBai } from './content/questions';
export { pickQuestions } from './quiz/pickQuestions';
export type { PickParams } from './quiz/pickQuestions';
export { recordAnswer } from './quiz/recordAnswer';
export { LEVELS, VILLAGE_ORDER, levelById, levelsOfVillage } from './content/levels';
export { medalOf, gameResultOf, summarizeGame } from './games/medals';
export { GAMES, gameUi, runnerUi, runnerScoreLabels, rebuildUi } from './content/games';
export type { GameText } from './content/games';
export { MiniGameLevel } from './ui/MiniGameLevel';
export type { MiniGameLevelProps, MiniGameRenderProps, ScorePart } from './ui/MiniGameLevel';
export type { Medal, MedalThresholds } from './games/medals';
export type { LevelDef, LevelKind, LevelStatus } from './content/levels';
export { computeUnlock } from './progress/unlock';
export type { LevelState, LevelUnlock, UnlockInput, UnlockResult } from './progress/unlock';
export { AuthProvider, AuthContext, useAuth } from './auth/AuthProvider';
export { canSeeTeacherPage } from './auth/roles';
export type { AuthState, Profile, Role } from './auth/AuthProvider';
export { accountRoutes } from './auth/routes';
export { AccountBar } from './auth/AccountBar';
export {
  signUpUsername,
  signInUsername,
  signInGoogle,
  signOut,
  updateDisplayName,
  joinClass,
  setBeforeSignOut,
} from './auth/api';
export type { AuthResult, BeforeSignOutHook } from './auth/api';
export { mapAuthError } from './auth/errors';
export type { AuthErrorContext } from './auth/errors';
export {
  validateUsername,
  validateDisplayName,
  validatePassword,
  normalizeUsername,
  cleanDisplayName,
  usernameToEmail,
} from './auth/validate';
export type { ValidationResult } from './auth/validate';
export { readAuthConfig, AUTH_CONFIG } from './auth/config';
export { safeNext, loginPathFor } from './auth/redirect';
export { ProgressProvider, ProgressContext, useProgress } from './progress/ProgressProvider';
export type { ProgressState } from './progress/ProgressProvider';
export { GuestBar } from './ui/GuestBar';
export { progressManager } from './progress/singleton';
export { mergeProgress } from './progress/merge';
export { shouldShowIntro, hasSeenIntro, introTasks, goldenPageNumber, shouldShowScene, hasSeenScene, shouldShowGolden, pendingGateOpening } from './progress/villageIntro';
export type { IntroTask } from './progress/villageIntro';
export { VILLAGE_INTRO, villageIntroTexts } from './content/villageIntro';
export { recordLevelResult, doneLevels, withGoldenPages, unlockOf } from './progress/record';
export { encodeProgress, decodeProgress } from './progress/compact';
export type { Progress, LevelProgress, GameState, LevelResult, Stars as StarMap } from './progress/types';
export { LevelGuard } from './ui/LevelGuard';
export { guardedRoute } from './ui/guardedRoute';
export { STORY } from './content/story';
export type { StoryFrame } from './content/story';
export { BAN_DO_HOTSPOTS, formatHotspotsBlock } from './content/banDoHotspots';
export type { Hotspot } from './content/banDoHotspots';
export { NumberInput } from './ui/NumberInput';
export { MatXich } from './ui/MatXich';
export { TrangSo } from './ui/TrangSo';
export { ChainStrip } from './ui/ChainStrip';
export type { ChainPageData } from './ui/ChainStrip';
export { ReflectionQuestion } from './ui/ReflectionQuestion';
export { Toast } from './ui/Toast';
export { LessonPage2D } from './lesson2d/LessonPage2D';
export type { LessonPage2DProps, StationDef } from './lesson2d/LessonPage2D';
export { GoldenPageScene } from './lesson2d/GoldenPageScene';
export { STATION_ORDER } from './lesson2d/types';
export type { StationId, StationResult, StationMeta, LessonContent, LessonDialogue, GoldenAward, Moment } from './lesson2d/types';
export { momentBeforeStation, dialogueFor, goldenPageAwarded, lessonStars, applyStationResult } from './lesson2d/flow';
export type { DialogueTurn as DialogueTurnType } from './ui/DialogueBox';
export { starsFromMistakes, starsFromHearts } from './lessons/stars';
// Mức chất lượng 3D và tên model: hàm thuần, không kéo three vào trang đầu. Lõi 3D nằm ở '@so-chung/core/three/index' (lazy).
export {
  QUALITY_LEVELS,
  QUALITY_CHOICES,
  QUALITY_TABLE,
  FPS_MIN,
  FPS_WINDOW_MS,
  autoQuality,
  resolveQuality,
  effectiveDpr,
  lodDistance,
  lowerQuality,
  shouldDowngrade,
  createFpsTracker,
  isQualityChoice,
} from './three/quality';
export type { QualityLevel, QualityChoice, QualityParams, DeviceInfo, FpsTracker } from './three/quality';
export { LOD_SUFFIX, modelPath, lodId } from './three/modelIds';
