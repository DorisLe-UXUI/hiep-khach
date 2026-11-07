// Mã hoá / giải mã gói bản lưu chuyển từ trang cũ sang tên miền mới.
// Dùng chung cho src/move.js (nhập) và tools/move/move.test.mjs; trang redirect.html chép lại
// phần mã hoá bằng script nội tuyến để chạy độc lập, không cần bước build.

export const KEY_RE = /^(dev_)?(hkgh_[A-Za-z0-9_]+|hk_bg|hk_pid)$/;
// bản lưu theo hồ sơ có dạng hkgh_save_v1:<tài khoản>; tài khoản có thể có dấu cách / chữ có dấu
export const SAVE_KEY_RE = /^(dev_)?hkgh_save_v1:[^\u0000-\u001f]{1,64}$/;
export const PID_RE = /^[a-z0-9-]{8,40}$/i;
export const MAX_ENCODED_BYTES = 1.5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

const utf8 = new TextEncoder();

export function keyAllowed(key, prefix = '') {
  if (typeof key !== 'string') return false;
  if (!KEY_RE.test(key) && !SAVE_KEY_RE.test(key)) return false;
  return prefix ? key.startsWith(prefix) : !key.startsWith('dev_');
}

/** Lấy các khoá localStorage thuộc bản build này. */
export function collectKeys(storage, prefix = '') {
  const keys = {};
  if (!storage) return keys;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!keyAllowed(k, prefix)) continue;
      const v = storage.getItem(k);
      if (typeof v === 'string') keys[k] = v;
    }
  } catch { /* chế độ riêng tư: coi như không có khoá */ }
  return keys;
}

/**
 * Kiểm tra và lọc gói bản lưu. Trả về {v, at, keys} hoặc null nếu sai phiên bản / quá lớn / sai cấu trúc.
 * Khoá lạ, giá trị không phải chuỗi và mã người chơi sai định dạng bị bỏ qua.
 */
export function filterPayload(payload, prefix = '') {
  if (!payload || typeof payload !== 'object' || payload.v !== 1) return null;
  const source = payload.keys;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const keys = {};
  let total = 0;
  for (const [k, v] of Object.entries(source)) {
    if (!keyAllowed(k, prefix)) continue;
    if (typeof v !== 'string') continue;
    if (k === prefix + 'hk_pid' && !PID_RE.test(v)) continue;
    total += utf8.encode(k).length + utf8.encode(v).length;
    if (total > MAX_TOTAL_BYTES) return null;
    keys[k] = v;
  }
  return { v: 1, at: payload.at, keys };
}

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(text) {
  let s = String(text).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('no DecompressionStream');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Trả về {tag, data, encoded, json}; tag 'z' là deflate-raw, 'r' là JSON thô. */
export async function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const raw = utf8.encode(json);
  let tag = 'r', bytes = raw;
  try {
    const z = await deflateRaw(raw);
    if (z) { tag = 'z'; bytes = z; }
  } catch { /* không nén được: dùng JSON thô */ }
  const data = bytesToB64url(bytes);
  const encoded = tag + '.' + data;
  return { tag, data, encoded, size: encoded.length, json };
}

export async function decodePayload(encoded) {
  if (typeof encoded !== 'string' || encoded.length < 3 || encoded[1] !== '.') throw new Error('gói bản lưu sai định dạng');
  const tag = encoded[0];
  if (tag !== 'z' && tag !== 'r') throw new Error('gói bản lưu sai định dạng');
  let bytes = b64urlToBytes(encoded.slice(2));
  if (tag === 'z') bytes = await inflateRaw(bytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}
