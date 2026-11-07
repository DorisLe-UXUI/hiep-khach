import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TOTAL_BYTES,
  collectKeys,
  decodePayload,
  encodePayload,
  filterPayload,
  keyAllowed,
} from './codec.mjs';

const pack = (keys, extra = {}) => ({ v: 1, at: 1700000000000, keys, ...extra });

function fakeStorage(entries) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
  };
}

test('mã hoá rồi giải mã: giữ nguyên dữ liệu', async () => {
  const payload = pack({
    hkgh_profiles_v1: '[{"account":"Khách_ab12","name":"Khách_ab12"}]',
    hkgh_settings_v1: '{"volume":0.6}',
    'hkgh_save_v1:Khách_ab12': '{"chapter":3,"hp":120}',
    hk_pid: '123e4567-e89b-12d3-a456-426614174000',
    hk_bg: 'lake',
  });
  const enc = await encodePayload(payload);
  assert.ok(enc.tag === 'z' || enc.tag === 'r');
  assert.match(enc.encoded, /^[zr]\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodePayload(enc.encoded), payload);
});

test('giải mã được gói JSON thô (không nén)', async () => {
  const payload = pack({ hk_bg: 'town' });
  const raw = 'r.' + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  assert.deepEqual(await decodePayload(raw), payload);
});

test('lọc theo tiền tố: bản chính không lấy khoá dev_, bản dev chỉ lấy dev_', () => {
  const payload = pack({
    hkgh_profiles_v1: '[]',
    hkgh_settings_v1: '{}',
    dev_hkgh_profiles_v1: '[]',
    dev_hkgh_settings_v1: '{}',
    hk_pid: 'abcdefgh-1234-5678-9012-abcdefghijkl',
    dev_hk_pid: 'abcdefgh-1234-5678-9012-abcdefghijkl',
    hk_bg: 'town',
    dev_hk_bg: 'lake',
  });
  const prod = filterPayload(payload, '');
  assert.deepEqual(Object.keys(prod.keys).sort(), ['hk_bg', 'hk_pid', 'hkgh_profiles_v1', 'hkgh_settings_v1']);
  const dev = filterPayload(payload, 'dev_');
  assert.deepEqual(Object.keys(dev.keys).sort(), ['dev_hk_bg', 'dev_hk_pid', 'dev_hkgh_profiles_v1', 'dev_hkgh_settings_v1']);
});

test('khoá lạ, giá trị không phải chuỗi và khoá sai dạng bị bỏ', () => {
  const data = filterPayload(pack({
    hkgh_profiles_v1: '[]',
    'hkgh_bad-key': 'x',
    hk_online: 'https://evil.example',
    'hkgh_settings_v1': 42,
    evil: 'x',
  }), '');
  assert.deepEqual(data.keys, { hkgh_profiles_v1: '[]' });
});

test('mã người chơi sai định dạng bị bỏ, hk_pid hợp lệ được giữ', () => {
  assert.deepEqual(filterPayload(pack({ hk_pid: 'bad', hk_bg: 'town' }), '').keys, { hk_bg: 'town' });
  const good = 'A1b2C3d4-e5f6-7890-abcd-ef1234567890';
  assert.deepEqual(filterPayload(pack({ hk_pid: good }), '').keys, { hk_pid: good });
});

test('gói quá 5 MB bị từ chối', () => {
  assert.equal(filterPayload(pack({ hkgh_save_v1: 'x'.repeat(MAX_TOTAL_BYTES + 1) }), ''), null);
});

test('sai phiên bản hoặc sai cấu trúc bị từ chối', () => {
  assert.equal(filterPayload({ v: 2, keys: { hk_bg: 'town' } }, ''), null);
  assert.equal(filterPayload({ v: 1 }, ''), null);
  assert.equal(filterPayload({ v: 1, keys: [] }, ''), null);
  assert.equal(filterPayload(null, ''), null);
});

test('lấy khoá từ localStorage đúng tiền tố', () => {
  const storage = fakeStorage({
    hkgh_profiles_v1: '[]',
    'hkgh_save_v1:Tieu Van': '{}',
    dev_hkgh_profiles_v1: '[]',
    hk_bg: 'town',
    hk_online: 'x',
    hk_pid: 'abcdefgh-1234-5678-9012-abcdefghijkl',
  });
  assert.deepEqual(Object.keys(collectKeys(storage, '')).sort(), ['hk_bg', 'hk_pid', 'hkgh_profiles_v1', 'hkgh_save_v1:Tieu Van']);
  assert.deepEqual(Object.keys(collectKeys(storage, 'dev_')), ['dev_hkgh_profiles_v1']);
});

test('khoá bản lưu theo hồ sơ được nhận, nhưng không nhận khoá ngoài phạm vi', () => {
  assert.equal(keyAllowed('hkgh_save_v1:Khách_ab12'), true);
  assert.equal(keyAllowed('hkgh_save_v1:'), false);
  assert.equal(keyAllowed('dev_hkgh_save_v1:Tieu Van', 'dev_'), true);
  assert.equal(keyAllowed('hk_online'), false);
});
