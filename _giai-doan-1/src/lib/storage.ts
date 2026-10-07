/**
 * Module lưu trữ an toàn bọc try/catch cho localStorage.
 * Nếu localStorage bị chặn (ví dụ chế độ ẩn danh hoặc hạn chế trình duyệt),
 * ứng dụng sẽ fallback về bộ nhớ RAM tạm thời và vẫn chạy bình thường.
 */

class SafeStorage {
  private memoryFallback: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback xuống memory
    }
    return this.memoryFallback.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback xuống memory
    }
    this.memoryFallback.set(key, value);
  }

  public removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Bỏ qua
    }
    this.memoryFallback.delete(key);
  }

  public clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Bỏ qua
    }
    this.memoryFallback.clear();
  }
}

export const safeStorage = new SafeStorage();
