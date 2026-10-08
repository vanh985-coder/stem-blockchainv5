import { setBeforeSignOut } from '../auth/api';
import { browserCookies } from './cookies';
import { ProgressManager, type KeyValueStore } from './manager';
import { supabaseRemote } from './remote';

/** localStorage thật, bọc try/catch (chế độ riêng tư hoặc bị chặn thì coi như không có). */
const browserStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // hết chỗ hoặc bị chặn: bỏ qua, vẫn đẩy lên server được
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // bỏ qua
    }
  },
};

/** Bản dùng chung của cả app. */
export const progressManager = new ProgressManager({ store: browserStore, cookies: browserCookies, remote: supabaseRemote });

// Trước khi thoát phiên: đẩy nốt (tối đa 3 giây), rồi xóa dữ liệu của người đó trên máy (spec 02 mục 4).
setBeforeSignOut(() => progressManager.prepareSignOut());

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void progressManager.notifyOnline());
}
