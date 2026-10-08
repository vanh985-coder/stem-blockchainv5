export type { VillageModule, VillageId } from './village';
export { URLS, HUB_MAP_URL, VILLAGE_IDS, resolveUrls, levelUrl, hubMapUrl } from './config/urls';
export type { AppUrls, UrlEnv } from './config/urls';
export { LessonPlaceholder } from './ui/LessonPlaceholder';
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
export { DialogueBox } from './ui/DialogueBox';
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
export { recordLevelResult, doneLevels, withGoldenPages, unlockOf } from './progress/record';
export { encodeProgress, decodeProgress } from './progress/compact';
export type { Progress, LevelProgress, GameState, LevelResult, Stars as StarMap } from './progress/types';
export { LevelGuard } from './ui/LevelGuard';
export { guardedRoute } from './ui/guardedRoute';
export { STORY } from './content/story';
export type { StoryFrame } from './content/story';
export { BAN_DO_HOTSPOTS, formatHotspotsBlock } from './content/banDoHotspots';
export type { Hotspot } from './content/banDoHotspots';
