// Nhận bản lưu chuyển từ trang cũ (https://dorisle-uxui.github.io) sang tên miền mới.
// Chạy trước khi đọc cài đặt / hồ sơ / mã người chơi; mọi lỗi đều bỏ qua để không chặn boot.
import { STORE_PREFIX } from './settings.js';
import { decodePayload, filterPayload, MAX_TOTAL_BYTES } from '../tools/move/codec.mjs';

const OLD_ORIGIN = 'https://dorisle-uxui.github.io';
const MOVED_KEY = STORE_PREFIX + 'hk_moved';
const PROFILES_KEY = STORE_PREFIX + 'hkgh_profiles_v1';
const CURRENT_KEY = STORE_PREFIX + 'hkgh_current_v1';
const SAVE_PREFIX = STORE_PREFIX + 'hkgh_save_v1:';
const PID_KEY = STORE_PREFIX + 'hk_pid';
const NOTICE_KEY = STORE_PREFIX + 'hk_moved_notice';
const LOADING_BACKGROUNDS = ['town', 'bamboo', 'lake', 'valley', 'ice', 'fire'];

/** Trang nhập thủ công của bản cũ (bản dev nằm trong thư mục con /dev/). */
export function oldManualUrl(prefix = STORE_PREFIX) {
  return OLD_ORIGIN + '/hiep-khach/' + (prefix === 'dev_' ? 'dev/' : '') + '#stay';
}

function manualLink(text) {
  const a = document.createElement('a');
  a.href = oldManualUrl();
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

export function hasProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw == null) return false;
    const list = JSON.parse(raw || '[]');
    return !Array.isArray(list) || list.length > 0;
  } catch {
    return true;
  }
}

function hasMoved() {
  try { return localStorage.getItem(MOVED_KEY) != null; } catch { return false; }
}

function applyLoadingBackground() {
  try {
    const bg = localStorage.getItem(STORE_PREFIX + 'hk_bg');
    if (!LOADING_BACKGROUNDS.includes(bg)) return;
    const el = document.querySelector('#loading .brand-bg');
    if (el) el.style.backgroundImage = 'url(/brand/bg_' + bg + '.jpg)';
  } catch { /* chỉ là nền trang tải */ }
}

function applyKeys(keys) {
  const entries = Object.entries(keys);
  const ordered = [
    // bản lưu theo hồ sơ trước
    ...entries.filter(([k]) => k.startsWith(SAVE_PREFIX)),
    // cài đặt / nền / mã người chơi
    ...entries.filter(([k]) => !k.startsWith(SAVE_PREFIX) && k !== PROFILES_KEY && k !== CURRENT_KEY),
    // danh sách hồ sơ và hồ sơ hiện tại sau cùng
    ...entries.filter(([k]) => k === PROFILES_KEY),
    ...entries.filter(([k]) => k === CURRENT_KEY),
  ];
  const written = [];
  for (const [k, v] of ordered) {
    let prev = null;
    try { prev = localStorage.getItem(k); } catch { /* coi như chưa có */ }
    try {
      localStorage.setItem(k, v);
      written.push([k, prev]);
    } catch {
      for (let i = written.length - 1; i >= 0; i--) {
        const [wk, wv] = written[i];
        try {
          if (wv == null) localStorage.removeItem(wk);
          else localStorage.setItem(wk, wv);
        } catch { /* cố hết sức */ }
      }
      return false;
    }
  }
  try { localStorage.setItem(MOVED_KEY, String(Date.now())); } catch { /* bỏ qua */ }
  applyLoadingBackground();
  return true;
}

function fromOldSite() {
  try {
    const ref = new URL(document.referrer);
    // Safari/iOS (và Firefox khi khác trang) chỉ gửi gốc trang ('/') dù trang cũ xin gửi đủ đường dẫn: nhận '/'
    // hoặc đúng thư mục /hiep-khach/; một thư mục khác trên cùng tên miền (dự án GitHub Pages khác) thì từ chối
    return ref.origin === OLD_ORIGIN && (ref.pathname === '/' || ref.pathname.startsWith('/hiep-khach/'));
  } catch {
    return false;
  }
}

/** Đọc #hkmove=... trên URL. Chỉ nhận khi được chuyển tới từ trang cũ và máy chưa có hồ sơ nào. */
export async function importMovedSave() {
  let encoded;
  try {
    const hash = location.hash;
    if (!hash.startsWith('#hkmove=')) return { status: 'none' };
    encoded = hash.slice('#hkmove='.length);
    // bỏ mảnh neo ngay, giữ nguyên đường dẫn và query; dữ liệu chỉ còn trong bộ nhớ
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* bỏ qua */ }
  } catch {
    return { status: 'none' };
  }
  // máy đã chuyển/đã có hồ sơ: không tự nhập lại
  if (hasProfiles() || hasMoved()) return { status: 'skipped' };
  if (!fromOldSite()) return { status: 'failed' };
  try {
    const payload = await decodePayload(encoded);
    const data = filterPayload(payload, STORE_PREFIX);
    if (!data || !Object.keys(data.keys).length) return { status: 'failed' };
    return applyKeys(data.keys) ? { status: 'imported' } : { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
}

function profileList(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function mergeProfiles(deviceRaw, fileRaw) {
  const merged = [];
  const index = new Map();
  const keyOf = (p) => String(p?.account ?? p?.name ?? '');
  // hồ sơ trong tệp đứng trước (saveProfile chỉ giữ 8 hồ sơ đầu: không để hồ sơ vừa nhập bị cắt mất), rồi tới hồ sơ
  // chỉ có trên máy; trùng tài khoản thì lấy bản trong tệp
  for (const p of [...profileList(fileRaw), ...profileList(deviceRaw)]) {
    const k = keyOf(p);
    if (index.has(k)) continue;
    index.set(k, merged.length);
    merged.push(p);
  }
  return merged;
}

/** Nhập tệp JSON tải từ trang cũ (nút "Nhập bản lưu" ở màn đăng nhập). */
/**
 * confirmPid(): tệp có mã người chơi mà máy chưa có (cảnh báo tệp do người khác gửi); huỷ = không nhập.
 * choosePid(): máy đã có mã người chơi khác mã trong tệp; true = dùng mã trong tệp, mặc định giữ mã của máy.
 */
export async function importSaveFile(file, { force = false, confirmPid = null, choosePid = null } = {}) {
  try {
    if (!file || typeof file.text !== 'function') return { ok: false, error: 'Không đọc được tệp bản lưu.' };
    if (file.size > MAX_TOTAL_BYTES * 2) return { ok: false, error: 'Tệp bản lưu quá lớn.' };
    const text = await file.text();
    let payload;
    try { payload = JSON.parse(text); } catch { return { ok: false, error: 'Tệp bản lưu không hợp lệ.' }; }
    const hadProfiles = hasProfiles();
    if (!force && hadProfiles) return { ok: false, error: 'Máy này đã có hồ sơ. Cần xác nhận trước khi ghi đè.' };
    const data = filterPayload(payload, STORE_PREFIX);
    if (!data || !Object.keys(data.keys).length) return { ok: false, error: 'Bản lưu không có dữ liệu phù hợp.' };
    const ask = async (fn) => { if (typeof fn !== 'function') return false; try { return !!(await fn()); } catch { return false; } };
    const filePid = data.keys[PID_KEY];
    let devicePid = null;
    try { devicePid = localStorage.getItem(PID_KEY); } catch { /* coi như chưa có */ }
    if (filePid && filePid !== devicePid) {
      if (!hadProfiles || !devicePid) {
        // máy chưa có mã: dùng mã trong tệp, nhưng cảnh báo tệp do người khác gửi có thể chiếm bạc chợ
        if (!(await ask(confirmPid))) return { ok: false, cancelled: true };
      } else if (!(await ask(choosePid))) {
        // máy đã có mã khác: mặc định giữ mã của máy (tệp lạ không thay được mã người chơi)
        delete data.keys[PID_KEY];
      }
    }
    if (force && hadProfiles) {
      // giữ hồ sơ chỉ có trên máy, cập nhật hồ sơ trùng tài khoản bằng bản trong tệp
      if (data.keys[PROFILES_KEY] !== undefined) {
        data.keys[PROFILES_KEY] = JSON.stringify(mergeProfiles(localStorage.getItem(PROFILES_KEY), data.keys[PROFILES_KEY]));
      }
    }
    if (!applyKeys(data.keys)) return { ok: false, error: 'Không ghi được bản lưu (bộ nhớ thiết bị có thể đã đầy).' };
    return { ok: true, count: Object.keys(data.keys).length };
  } catch {
    return { ok: false, error: 'Không đọc được tệp bản lưu.' };
  }
}

/** Đặt cờ một lần để hiện thông báo sau khi tải lại trang. */
export function queueMovedNotice() {
  try { localStorage.setItem(NOTICE_KEY, '1'); } catch { /* bỏ qua */ }
}

/** Đọc và xoá cờ thông báo (chỉ hiện một lần). */
export function consumeMovedNotice() {
  try {
    if (localStorage.getItem(NOTICE_KEY) !== '1') return false;
    localStorage.removeItem(NOTICE_KEY);
    return true;
  } catch {
    return false;
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

/** Thông báo khi tự động chuyển bản lưu thất bại (không im lặng). */
export function showMoveFailedNotice() {
  try {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:99998;box-sizing:border-box;width:min(460px,92vw);padding:12px 16px;border-radius:8px;background:rgba(32,14,8,.95);color:#f3e6c8;border:1px solid #c96a4a;font:600 14px/1.5 "Noto Serif",serif;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    const text = document.createElement('div');
    text.appendChild(document.createTextNode('Chuyển bản lưu tự động không thành công. Hãy mở '));
    text.appendChild(manualLink('trang nhập thủ công của trang cũ'));
    text.appendChild(document.createTextNode(', bấm "Tải bản lưu", rồi vào đây chọn "Nhập bản lưu".'));
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Đã hiểu';
    close.style.cssText = 'margin-top:10px;padding:5px 14px;border:1px solid #c9a75a;border-radius:4px;background:transparent;color:#f0c46a;font:600 13px "Noto Serif",serif;cursor:pointer';
    close.onclick = () => el.remove();
    el.appendChild(text);
    el.appendChild(close);
    document.body.appendChild(el);
  } catch { /* chỉ là thông báo */ }
}

/** Thông báo khi máy đã có bản lưu nên không tự nhập từ mảnh URL (không tự gộp). */
export function showMovedSkippedNotice() {
  try {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:99998;box-sizing:border-box;width:min(460px,92vw);padding:12px 16px;border-radius:8px;background:rgba(20,24,14,.95);color:#f3e6c8;border:1px solid #c9a75a;font:600 14px/1.5 "Noto Serif",serif;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    const text = document.createElement('div');
    text.appendChild(document.createTextNode('Máy này đã có bản lưu tại đây. Để mang bản lưu từ trang cũ sang, hãy mở '));
    text.appendChild(manualLink('trang nhập thủ công của trang cũ'));
    text.appendChild(document.createTextNode(', bấm "Tải bản lưu", rồi chọn "Nhập bản lưu" ở màn đăng nhập.'));
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Đã hiểu';
    close.style.cssText = 'margin-top:10px;padding:5px 14px;border:1px solid #c9a75a;border-radius:4px;background:transparent;color:#f0c46a;font:600 13px "Noto Serif",serif;cursor:pointer';
    close.onclick = () => el.remove();
    el.appendChild(text);
    el.appendChild(close);
    document.body.appendChild(el);
  } catch { /* chỉ là thông báo */ }
}
