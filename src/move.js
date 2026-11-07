// Nhận bản lưu chuyển từ trang cũ (https://dorisle-uxui.github.io) sang tên miền mới.
// Chạy trước khi đọc cài đặt / hồ sơ / mã người chơi; mọi lỗi đều bỏ qua để không chặn boot.
import { STORE_PREFIX } from './settings.js';
import { decodePayload, filterPayload, MAX_TOTAL_BYTES } from '../tools/move/codec.mjs';

const OLD_ORIGIN = 'https://dorisle-uxui.github.io';
const MOVED_KEY = STORE_PREFIX + 'hk_moved';
const PROFILES_KEY = STORE_PREFIX + 'hkgh_profiles_v1';

function hasProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw == null) return false;
    const list = JSON.parse(raw || '[]');
    return !Array.isArray(list) || list.length > 0;
  } catch {
    return true;
  }
}

function applyKeys(keys) {
  for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
  try { localStorage.setItem(MOVED_KEY, String(Date.now())); } catch { /* bỏ qua */ }
}

function fromOldSite() {
  try {
    return new URL(document.referrer).origin === OLD_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Đọc #hkmove=... trên URL. Chỉ nhận khi được chuyển tới từ trang cũ và máy chưa có hồ sơ nào.
 * Trả về true nếu đã nhập bản lưu (để hiện thông báo sau khi vào menu).
 */
export async function importMovedSave() {
  try {
    const hash = location.hash;
    if (!hash.startsWith('#hkmove=')) return false;
    const encoded = hash.slice('#hkmove='.length);
    // bỏ mảnh neo ngay, giữ nguyên đường dẫn và query
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* bỏ qua */ }
    if (!fromOldSite()) return false;
    if (hasProfiles()) return false;
    const payload = await decodePayload(encoded);
    const data = filterPayload(payload, STORE_PREFIX);
    if (!data || !Object.keys(data.keys).length) return false;
    applyKeys(data.keys);
    return true;
  } catch {
    return false;
  }
}

/** Nhập tệp JSON tải từ trang cũ (nút "Nhập bản lưu" ở màn đăng nhập). */
export async function importSaveFile(file, { force = false } = {}) {
  try {
    if (!file || typeof file.text !== 'function') return { ok: false, error: 'Không đọc được tệp bản lưu.' };
    if (file.size > MAX_TOTAL_BYTES * 2) return { ok: false, error: 'Tệp bản lưu quá lớn.' };
    const text = await file.text();
    let payload;
    try { payload = JSON.parse(text); } catch { return { ok: false, error: 'Tệp bản lưu không hợp lệ.' }; }
    if (!force && hasProfiles()) return { ok: false, error: 'Máy này đã có hồ sơ. Cần xác nhận trước khi ghi đè.' };
    const data = filterPayload(payload, STORE_PREFIX);
    if (!data || !Object.keys(data.keys).length) return { ok: false, error: 'Bản lưu không có dữ liệu phù hợp.' };
    applyKeys(data.keys);
    return { ok: true, count: Object.keys(data.keys).length };
  } catch {
    return { ok: false, error: 'Không đọc được tệp bản lưu.' };
  }
}

/** Thông báo ngắn sau khi vào menu chính. */
export function showMovedNotice() {
  try {
    const el = document.createElement('div');
    el.textContent = 'Đã chuyển bản lưu từ trang cũ';
    el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99998;padding:10px 18px;border-radius:8px;background:rgba(20,14,8,.92);color:#f3e6c8;border:1px solid #c9a75a;font:600 14px/1.4 "Noto Serif",serif;box-shadow:0 6px 24px rgba(0,0,0,.5);opacity:0;transition:opacity .3s;pointer-events:none';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }, 4200);
  } catch { /* chỉ là thông báo */ }
}
