const KEY = 'hkgh_settings_v1';

export const DEFAULTS = {
  sens: 1,            // độ nhạy chuột
  invertY: false,
  volume: 0.6,
  music: 0.5,
  quality: 'medium',  // low | medium | high
  fov: 55,
  difficulty: 'normal', // easy | normal | hard
  dmgNumbers: true,
  controlMode: 'mmo',   // mmo (góc trên cao, nút cảm ứng) | action (sau lưng, khoá chuột)
  style: 'bright',      // bright (tươi sáng, chibi) | realistic
};

export const DIFFICULTY = {
  easy: { label: 'Nhàn du', enemyDmg: 0.6, playerDmg: 1.25 },
  normal: { label: 'Giang hồ', enemyDmg: 1, playerDmg: 1 },
  hard: { label: 'Tuyệt đỉnh', enemyDmg: 1.45, playerDmg: 0.85 },
};

export const QUALITY = {
  low: { label: 'Thấp', pixelRatio: 0.75, shadow: 1024, grass: 1 },
  medium: { label: 'Vừa', pixelRatio: 1, shadow: 2048, grass: 2 },
  high: { label: 'Cao', pixelRatio: 1.5, shadow: 2048, grass: 3 },
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* chế độ riêng tư: bỏ qua */ }
}

// ───── hồ sơ người chơi (đăng nhập cục bộ) + bản lưu theo hồ sơ ─────
const PROFILES = 'hkgh_profiles_v1';
const CURRENT = 'hkgh_current_v1';

export function listProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES) || '[]'); } catch { return []; }
}

export function currentProfile() {
  try {
    const acc = localStorage.getItem(CURRENT);
    return listProfiles().find((p) => p.account === acc) || null;
  } catch { return null; }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tkgh:' + text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Đăng ký tài khoản cục bộ. Trả về lỗi (chuỗi) hoặc null. */
export async function register(account, password) {
  if (!/^[\p{L}\p{N}_ ]{3,16}$/u.test(account)) return 'Tài khoản 3–16 ký tự, không dấu câu.';
  if (password.length < 4) return 'Mật khẩu tối thiểu 4 ký tự.';
  if (listProfiles().some((p) => p.account === account)) return 'Tài khoản đã tồn tại.';
  saveProfile({ account, name: account, title: 'Bạch Vân đệ tử', pass: await sha256(password), hero: null, created: Date.now() });
  return null;
}

/** Đăng nhập: trả về hồ sơ hoặc chuỗi lỗi. */
export async function signIn(account, password) {
  const p = listProfiles().find((x) => x.account === account);
  if (!p) return 'Không tìm thấy tài khoản.';
  if (p.pass && p.pass !== (await sha256(password))) return 'Sai mật khẩu.';
  return saveProfile({ ...p, last: Date.now() });
}

export function guest() {
  const id = 'Khách_' + Math.random().toString(36).slice(2, 6);
  return saveProfile({ account: id, name: id, title: 'Lãng tử vô danh', guest: true, hero: null, created: Date.now() });
}

export function saveProfile(prof) {
  const list = listProfiles().filter((p) => p.account !== prof.account);
  list.unshift(prof);
  try {
    localStorage.setItem(PROFILES, JSON.stringify(list.slice(0, 8)));
    localStorage.setItem(CURRENT, prof.account);
  } catch { /* bỏ qua */ }
  return prof;
}

export function login(name, title) {
  const list = listProfiles().filter((p) => p.name !== name);
  const prof = { name, title, last: Date.now() };
  list.unshift(prof);
  try {
    localStorage.setItem(PROFILES, JSON.stringify(list.slice(0, 6)));
    localStorage.setItem(CURRENT, name);
  } catch { /* bỏ qua */ }
  return prof;
}

export function logout() { try { localStorage.removeItem(CURRENT); } catch { /* bỏ qua */ } }

const saveKey = (profile) => 'hkgh_save_v1:' + (profile?.account || profile?.name || '_');

export function loadSave(profile) {
  try { return JSON.parse(localStorage.getItem(saveKey(profile)) || 'null'); } catch { return null; }
}

export function writeSave(profile, data) {
  try { localStorage.setItem(saveKey(profile), JSON.stringify({ ...data, at: Date.now() })); } catch { /* bỏ qua */ }
}
