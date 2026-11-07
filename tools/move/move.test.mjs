import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import vm from 'node:vm';
import {
  MAX_ENCODED_CHARS,
  MAX_TOTAL_BYTES,
  collectKeys,
  decodePayload,
  encodePayload,
  filterPayload,
  keyAllowed,
} from './codec.mjs';

// src/move.js đọc STORE_PREFIX từ import.meta.env của Vite; thay settings.js bằng bản rút gọn cho Node.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/src/settings.js')) {
      return { format: 'module', source: 'export const STORE_PREFIX = "";', shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const move = await import('../../src/move.js');

const pack = (keys, extra = {}) => ({ v: 1, at: 1700000000000, keys, ...extra });
const OLD_REF = 'https://dorisle-uxui.github.io/hiep-khach/';

function fakeStorage(entries) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
  };
}

function localStore(entries = {}, fail = null) {
  const map = new Map(Object.entries(entries));
  const calls = [];
  return {
    calls,
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (fail && fail(k, v)) throw new Error('quota');
      map.set(k, String(v));
      calls.push(k);
    },
    removeItem(k) { map.delete(k); calls.push('remove:' + k); },
    dump() { return Object.fromEntries(map); },
  };
}

function installDom({ hash = '', referrer = '', entries = {}, fail = null } = {}) {
  const storage = localStore(entries, fail);
  const style = {};
  const created = [];
  const bodyChildren = [];
  const node = () => ({
    style: {},
    children: [],
    textContent: '',
    type: '',
    href: '',
    rel: '',
    target: '',
    appendChild(child) { this.children.push(child); return child; },
    append(child) { this.children.push(child); return child; },
    remove() {},
  });
  globalThis.__replaced = null;
  globalThis.localStorage = storage;
  globalThis.location = { hash, pathname: '/game', search: '?x=1' };
  globalThis.history = { replaceState: (...args) => { globalThis.__replaced = args; } };
  globalThis.document = {
    referrer,
    querySelector: (sel) => (sel === '#loading .brand-bg' ? { style } : null),
    createElement: () => { const el = node(); created.push(el); return el; },
    createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
    body: { appendChild: (el) => { bodyChildren.push(el); return el; } },
  };
  globalThis.requestAnimationFrame = (fn) => fn();
  return { storage, style, created, bodyChildren };
}

function noticeText(el) {
  if (!el) return '';
  return (el.textContent || '') + (el.children || []).map(noticeText).join('');
}

function noticeLink(el) {
  if (!el) return null;
  if (el.href) return el;
  for (const child of el.children || []) {
    const found = noticeLink(child);
    if (found) return found;
  }
  return null;
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

test('từ chối chuỗi mã hoá dài quá 64000 ký tự trước khi giải mã', async () => {
  await assert.rejects(decodePayload('r.' + 'A'.repeat(MAX_ENCODED_CHARS)), /quá lớn/);
});

test('giải nén theo từng khối và dừng khi vượt quá 5 MB', async () => {
  const enc = await encodePayload(pack({ hkgh_settings_v1: 'x'.repeat(MAX_TOTAL_BYTES + 1024) }));
  await assert.rejects(decodePayload(enc.encoded), /quá lớn/);
});

test('regex khoá dựng theo tiền tố bất kỳ, không chỉ dev_', () => {
  const payload = pack({
    'foo_hkgh_profiles_v1': '[]',
    'foo_hk_bg': 'lake',
    'dev_hk_bg': 'town',
  });
  assert.deepEqual(Object.keys(filterPayload(payload, 'foo_').keys).sort(), ['foo_hk_bg', 'foo_hkgh_profiles_v1']);
  assert.equal(keyAllowed('foo_hk_bg', 'foo_'), true);
  assert.equal(keyAllowed('foo_hk_bg', ''), false);
  assert.equal(keyAllowed('dev_hk_bg', 'dev_'), true);
  assert.equal(keyAllowed('dev_hk_bg', ''), false);
});

test('tự nhập bản lưu từ mảnh #hkmove và áp lại nền trang tải', async () => {
  const payload = pack({
    'hkgh_save_v1:Khách_ab12': '{"chapter":3}',
    hkgh_settings_v1: '{"volume":0.6}',
    hk_bg: 'lake',
    hk_pid: '123e4567-e89b-12d3-a456-426614174000',
    hkgh_profiles_v1: '[{"account":"Khách_ab12"}]',
    hkgh_current_v1: 'Khách_ab12',
  });
  const encoded = (await encodePayload(payload)).encoded;
  const { storage, style } = installDom({ hash: '#hkmove=' + encoded, referrer: OLD_REF });

  const r = await move.importMovedSave();
  assert.equal(r.status, 'imported');
  const dump = storage.dump();
  assert.equal(dump['hkgh_save_v1:Khách_ab12'], '{"chapter":3}');
  assert.equal(dump.hkgh_settings_v1, '{"volume":0.6}');
  assert.equal(dump.hk_bg, 'lake');
  assert.equal(dump.hk_pid, '123e4567-e89b-12d3-a456-426614174000');
  assert.equal(dump.hkgh_profiles_v1, '[{"account":"Khách_ab12"}]');
  assert.equal(dump.hkgh_current_v1, 'Khách_ab12');
  assert.ok(dump.hk_moved);
  assert.equal(style.backgroundImage, 'url(/brand/bg_lake.jpg)');
  assert.deepEqual(globalThis.__replaced, [null, '', '/game?x=1']);

  const order = (k) => storage.calls.indexOf(k);
  assert.ok(order('hkgh_save_v1:Khách_ab12') < order('hkgh_settings_v1'));
  assert.ok(order('hkgh_settings_v1') < order('hkgh_profiles_v1'));
  assert.ok(order('hkgh_profiles_v1') < order('hkgh_current_v1'));
  assert.ok(order('hkgh_current_v1') < order('hk_moved'));
});

test('không tự nhập lại khi đã có hk_moved hoặc đã có hồ sơ', async () => {
  const encoded = (await encodePayload(pack({
    'hkgh_save_v1:x': '{}',
    hkgh_profiles_v1: '[{"account":"x"}]',
  }))).encoded;
  let { storage } = installDom({
    hash: '#hkmove=' + encoded,
    referrer: OLD_REF,
    entries: { hk_moved: '1' },
  });
  assert.deepEqual(await move.importMovedSave(), { status: 'skipped' });
  assert.equal(storage.dump()['hkgh_save_v1:x'], undefined);

  ({ storage } = installDom({
    hash: '#hkmove=' + encoded,
    referrer: OLD_REF,
    entries: { hkgh_profiles_v1: '[{"account":"old"}]' },
  }));
  assert.deepEqual(await move.importMovedSave(), { status: 'skipped' });
  assert.equal(storage.dump()['hkgh_save_v1:x'], undefined);
});

test('mảnh lỗi hoặc sai nguồn: báo thất bại nhưng vẫn xoá mảnh URL', async () => {
  let { storage } = installDom({ hash: '#hkmove=bad', referrer: OLD_REF });
  assert.deepEqual(await move.importMovedSave(), { status: 'failed' });
  assert.deepEqual(storage.dump(), {});
  assert.deepEqual(globalThis.__replaced, [null, '', '/game?x=1']);

  const encoded = (await encodePayload(pack({ hk_bg: 'lake' }))).encoded;
  ({ storage } = installDom({ hash: '#hkmove=' + encoded, referrer: 'https://evil.example' }));
  assert.deepEqual(await move.importMovedSave(), { status: 'failed' });
  assert.equal(storage.dump().hk_bg, undefined);
  assert.deepEqual(globalThis.__replaced, [null, '', '/game?x=1']);
});

test('chỉ nhận referrer từ đúng thư mục /hiep-khach/ của trang cũ', async () => {
  const encoded = (await encodePayload(pack({ hk_bg: 'lake' }))).encoded;
  for (const referrer of ['https://dorisle-uxui.github.io/', 'https://dorisle-uxui.github.io/other-repo/']) {
    const { storage } = installDom({ hash: '#hkmove=' + encoded, referrer });
    assert.deepEqual(await move.importMovedSave(), { status: 'failed' });
    assert.equal(storage.dump().hk_bg, undefined);
    assert.deepEqual(globalThis.__replaced, [null, '', '/game?x=1']);
  }
});

test('nhập tệp khi máy đã có hồ sơ: giữ hk_pid của máy và gộp danh sách hồ sơ', async () => {
  const oldPid = '11111111-1111-1111-1111-111111111111';
  const newPid = '22222222-2222-2222-2222-222222222222';
  const deviceProfiles = [
    { account: 'old-only', name: 'Old' },
    { account: 'same', name: 'device' },
  ];
  const fileProfiles = [
    { account: 'same', name: 'file' },
    { account: 'new', name: 'New' },
  ];
  const { storage } = installDom({
    entries: { hkgh_profiles_v1: JSON.stringify(deviceProfiles), hkgh_current_v1: 'same', hk_pid: oldPid },
  });
  const payload = pack({
    hkgh_profiles_v1: JSON.stringify(fileProfiles),
    hkgh_current_v1: 'new',
    hk_pid: newPid,
    'hkgh_save_v1:new': '{}',
    hkgh_settings_v1: '{}',
  });
  const r = await move.importSaveFile({ size: 1000, text: async () => JSON.stringify(payload) }, { force: true });
  assert.equal(r.ok, true);
  const dump = storage.dump();
  assert.equal(dump.hk_pid, oldPid);
  assert.equal(dump.hkgh_current_v1, 'new');
  assert.equal(dump['hkgh_save_v1:new'], '{}');
  const merged = JSON.parse(dump.hkgh_profiles_v1);
  assert.deepEqual(merged.map((p) => p.account).sort(), ['new', 'old-only', 'same']);
  assert.equal(merged.find((p) => p.account === 'old-only').name, 'Old');
  assert.equal(merged.find((p) => p.account === 'same').name, 'file');
  assert.equal(merged.find((p) => p.account === 'new').name, 'New');
});

test('tệp có hk_pid khi máy chưa có hồ sơ: chỉ nhập sau khi xác nhận', async () => {
  const pid = '33333333-3333-3333-3333-333333333333';
  const payload = pack({ hk_pid: pid, 'hkgh_save_v1:x': '{}' });
  const file = { size: 1000, text: async () => JSON.stringify(payload) };

  let { storage } = installDom();
  let asked = 0;
  let r = await move.importSaveFile(file, { confirmPid: () => { asked++; return false; } });
  assert.equal(r.ok, false);
  assert.equal(r.cancelled, true);
  assert.equal(asked, 1);
  assert.deepEqual(storage.dump(), {});

  ({ storage } = installDom());
  r = await move.importSaveFile(file, { confirmPid: () => { asked++; return true; } });
  assert.equal(r.ok, true);
  assert.equal(storage.dump().hk_pid, pid);
});

test('máy đã có hồ sơ thì không hỏi lại về hk_pid trong tệp', async () => {
  const { storage } = installDom({ entries: { hkgh_profiles_v1: '[{"account":"old"}]' } });
  const payload = pack({ hk_pid: '44444444-4444-4444-4444-444444444444' });
  let asked = false;
  const r = await move.importSaveFile(
    { size: 1000, text: async () => JSON.stringify(payload) },
    { force: true, confirmPid: () => { asked = true; return false; } },
  );
  assert.equal(r.ok, true);
  assert.equal(asked, false);
  assert.equal(storage.dump().hk_pid, undefined);
});

test('không ghi đè khi chưa xác nhận', async () => {
  const { storage } = installDom({ entries: { hkgh_profiles_v1: '[{"account":"old"}]' } });
  const payload = pack({ hkgh_profiles_v1: '[{"account":"new"}]' });
  const r = await move.importSaveFile({ size: 1000, text: async () => JSON.stringify(payload) });
  assert.equal(r.ok, false);
  assert.equal(storage.dump().hkgh_profiles_v1, '[{"account":"old"}]');
});

test('nhập tệp lỗi giữa chừng: hoàn tác mọi khoá đã ghi, không đặt hk_moved', async () => {
  const { storage } = installDom({
    entries: { hkgh_settings_v1: 'old', hk_bg: 'town' },
    fail: (k) => k === 'hkgh_current_v1',
  });
  const payload = pack({
    'hkgh_save_v1:new': '{}',
    hkgh_settings_v1: 'new',
    hk_bg: 'lake',
    hkgh_profiles_v1: '[{"account":"new"}]',
    hkgh_current_v1: 'new',
  });
  const r = await move.importSaveFile({ size: 1000, text: async () => JSON.stringify(payload) }, { force: true });
  assert.equal(r.ok, false);
  const dump = storage.dump();
  assert.equal(dump.hkgh_settings_v1, 'old');
  assert.equal(dump.hk_bg, 'town');
  assert.equal(dump['hkgh_save_v1:new'], undefined);
  assert.equal(dump.hkgh_profiles_v1, undefined);
  assert.equal(dump.hkgh_current_v1, undefined);
  assert.equal(dump.hk_moved, undefined);
});

test('cờ thông báo sau khi tải lại chỉ hiện một lần', () => {
  const { storage } = installDom();
  move.queueMovedNotice();
  assert.equal(storage.dump().hk_moved_notice, '1');
  assert.equal(move.consumeMovedNotice(), true);
  assert.equal(move.consumeMovedNotice(), false);
});

test('hasProfiles dùng chung cho nhập tệp và tự nhập', () => {
  installDom();
  assert.equal(move.hasProfiles(), false);
  installDom({ entries: { hkgh_profiles_v1: '[]' } });
  assert.equal(move.hasProfiles(), false);
  installDom({ entries: { hkgh_profiles_v1: '[{"account":"a"}]' } });
  assert.equal(move.hasProfiles(), true);
});

const SCRIPT = fileURLToPath(new URL('./make_redirect.mjs', import.meta.url));
const tmpOut = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hkmove-')), 'out.html');

test('make_redirect điền một lượt, thoát ký tự JS và không để lại placeholder', () => {
  const out = tmpOut();
  execFileSync(process.execPath, [SCRIPT, 'https://example.com/?a=1&b=2', 'dev_', out]);
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes('var TARGET = "https://example.com/?a=1\\u0026b=2";'));
  assert.ok(html.includes('var PREFIX = "dev_";'));
  assert.ok(!html.includes('__TARGET__'));
  assert.ok(!html.includes('__PREFIX__'));
});

test('make_redirect từ chối địa chỉ không https và tiền tố lạ', () => {
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, 'http://example.com/', '', tmpOut()]));
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, 'https://example.com/', 'x_', tmpOut()]));
});

test('make_redirect không thay placeholder nằm trong địa chỉ đích (một lượt)', () => {
  const out = tmpOut();
  execFileSync(process.execPath, [SCRIPT, 'https://example.com/__PREFIX__?x=1', 'dev_', out]);
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes('var TARGET = "https://example.com/__PREFIX__?x=1";'));
  assert.ok(html.includes('var PREFIX = "dev_";'));
});

test('thông báo thất bại và bỏ qua có link nhập thủ công đúng bản', () => {
  assert.equal(move.oldManualUrl(''), 'https://dorisle-uxui.github.io/hiep-khach/#stay');
  assert.equal(move.oldManualUrl('dev_'), 'https://dorisle-uxui.github.io/hiep-khach/dev/#stay');

  let { created } = installDom();
  move.showMoveFailedNotice();
  let link = noticeLink(created[0]);
  assert.equal(link.href, move.oldManualUrl());
  assert.match(noticeText(created[0]), /trang nhập thủ công/);
  assert.match(noticeText(created[0]), /Tải bản lưu/);

  ({ created } = installDom());
  move.showMovedSkippedNotice();
  link = noticeLink(created[0]);
  assert.equal(link.href, move.oldManualUrl());
  assert.match(noticeText(created[0]), /đã có bản lưu/);
  assert.match(noticeText(created[0]), /Nhập bản lưu/);
});

function runRedirect(search, hash) {
  const out = tmpOut();
  execFileSync(process.execPath, [SCRIPT, 'https://example.com/', '', out]);
  const html = fs.readFileSync(out, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const els = {
    go: {},
    msg: { textContent: '' },
    big: { hidden: true },
    'big-msg': { textContent: '' },
    dl: {},
    'dl-mini': {},
  };
  const replaced = [];
  const sandbox = {
    document: {
      getElementById: (id) => els[id],
      createElement: () => ({ style: {}, click() {}, remove() {} }),
      body: { appendChild() {} },
    },
    localStorage: { length: 0, key: () => null, getItem: () => null },
    location: { search, hash, replace: (url) => replaced.push(url) },
    URLSearchParams,
    setTimeout,
  };
  vm.runInNewContext(script, sandbox);
  return { els, replaced };
}

test('redirect.html ở #stay hoặc ?stay hiện tải bản lưu, không chuyển hướng', () => {
  for (const [search, hash] of [['', '#stay'], ['?stay', '']]) {
    const { els, replaced } = runRedirect(search, hash);
    assert.deepEqual(replaced, []);
    assert.equal(els.big.hidden, false);
    assert.match(els.msg.textContent, /nhập thủ công/);
    assert.equal(els.go.href, 'https://example.com/');
  }
});

test('redirect.html không có #stay/?stay thì vẫn chuyển hướng tự động', () => {
  const { els, replaced } = runRedirect('', '');
  assert.deepEqual(replaced, ['https://example.com/']);
  assert.equal(els.big.hidden, true);
});
