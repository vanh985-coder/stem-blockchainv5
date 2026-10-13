import { VillageScene } from '@so-chung/core/three/index';
import { LANG_GIAY_LAYOUT } from './layout';

/** Cảnh Làng Giáy 3D (route `/lang/lang-giay`): dùng cảnh làng chung của core với bố cục của làng này. Tải lười cùng lõi 3D. */
export default function LangGiayScene() {
  return <VillageScene input={LANG_GIAY_LAYOUT} />;
}
