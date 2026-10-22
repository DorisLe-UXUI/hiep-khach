import { VOICE_LINES } from './story/voice.js';
import { ZH_LINES } from './story/zh.js';

/**
 * Ngôn ngữ: Tiếng Việt / English / 中文 cho phụ đề thoại và giao diện. Giọng lồng tiếng luôn là tiếng Anh.
 * - Thoại: tra theo khoá của câu tiếng Việt gốc (voiceKey).
 * - Giao diện: dịch các chữ cố định theo từ điển UI, tự áp dụng cho phần tử mới (MutationObserver).
 */
export let LANG = 'vi';

export function voiceKey(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** Phụ đề của câu thoại theo ngôn ngữ hiện tại (null = giữ tiếng Việt) */
export function trLine(vi) {
  if (LANG === 'vi') return null;
  const k = voiceKey(vi);
  return LANG === 'en' ? VOICE_LINES[k]?.en || null : ZH_LINES[k] || null;
}
/** File giọng tiếng Anh của câu thoại */
export function voiceOf(vi, female) {
  const e = VOICE_LINES[voiceKey(vi)];
  if (!e) return null;
  return e.v || (female ? e.f : e.m) || null;
}

export const SPEAKER_NAMES = {
  en: { guard: 'Elder Wang', keeper: 'Innkeeper Liu', maiden: "Lin Wan'er", doba: 'Tu Ba', hanbang: 'Han Bing', villain: 'Murong Xue', captive: 'Captive', villager: 'Villager',
    merchant: 'Qian Duobao', smith: 'Iron Ox', apothecary: 'Su Ling', auctioneer: 'Old Jin', trainer: 'Instructor Li Hu', mentor: 'Xuanji Zi', herald: 'War Herald', fisher: 'Old Fisherman', matchmaker: 'Matchmaker Hong', steward: 'Steward' },
};

// ───────── từ điển giao diện: tiếng Việt → [English, 中文] ─────────
const UI = {
  'Tiếp tục': ['Continue', '繼續'], 'Hành trình mới': ['New Journey', '新的旅程'], 'Chọn chương': ['Chapters', '選擇章節'],
  'Nhân vật': ['Character', '角色'], 'Cài đặt': ['Settings', '設定'], 'Điều khiển': ['Controls', '操作說明'], 'Ghi công': ['Credits', '製作名單'],
  'Đăng nhập': ['Sign in', '登入'], 'ĐĂNG NHẬP': ['SIGN IN', '登入'], 'Đăng ký': ['Register', '註冊'], 'Tài khoản': ['Account', '帳號'], 'Mật khẩu': ['Password', '密碼'],
  'Nhập lại mật khẩu': ['Repeat password', '再次輸入密碼'], 'Lưu tài khoản': ['Remember me', '記住帳號'], 'Lưu trên máy này': ['Saved on this device', '儲存在本機'], 'Chơi ngay': ['Play as guest', '立即遊玩'],
  'Chọn môn phái': ['Choose your School', '選擇門派'], 'Tạo nhân vật': ['Create', '建立角色'], 'Lưu thay đổi': ['Save changes', '儲存變更'], 'Hiệp danh': ['Hero name', '俠名'], 'Nam': ['Male', '男'], 'Nữ': ['Female', '女'],
  'Hình tượng': ['Appearance', '形象'], 'Binh khí': ['Weapon', '兵器'], 'Thời trang': ['Outfit', '時裝'], 'Theo môn phái': ['School default', '門派預設'],
  'Kiếm Khách': ['Swordsman', '劍客'], 'Thương Khách': ['Spearman', '槍客'], 'Cung Thủ': ['Archer', '弓手'], 'Pháp Sư': ['Mage', '法師'], 'Đạo Sĩ': ['Taoist', '道士'],
  'Công': ['Attack', '攻擊'], 'Thủ': ['Defense', '防禦'], 'Tốc': ['Speed', '速度'], 'Tầm': ['Range', '射程'], 'Đòn thường': ['Basic attack', '普通攻擊'],
  'Tạm dừng': ['Paused', '暫停'], 'Quay lại': ['Back', '返回'], 'Về menu chính': ['Main menu', '返回主選單'], 'Trọng thương': ['Gravely wounded', '身受重傷'], 'Vận công tỉnh lại': ['Recover', '運功甦醒'],
  'Giang hồ truyền ngôn': ['Tales of the Jianghu', '江湖傳言'], 'Đang mài kiếm...': ['Sharpening swords...', '磨劍中……'], 'Space / E / Click để tiếp': ['Space / E / Click to continue', '空白鍵 / E / 點擊 繼續'],
  'Túi đồ': ['Bag', '背包'], 'Trang bị': ['Gear', '裝備'], 'Võ học': ['Skills', '武學'], 'Nhiệm vụ': ['Quests', '任務'], 'Bản đồ': ['Map', '地圖'], 'Chức năng': ['Menu', '功能'], 'Thêm': ['More', '更多'],
  'Kinh mạch': ['Meridians', '經脈'], 'Phúc lợi': ['Rewards', '福利'], 'Hoạt động': ['Events', '活動'], 'Xếp hạng': ['Ranking', '排行'], 'Bang hội': ['Guild', '幫會'], 'Tổ đội': ['Party', '組隊'],
  'Sản xuất': ['Crafting', '生產'], 'Ngự thú': ['Beasts', '御獸'], 'Bách quái': ['Bestiary', '百怪'], 'Sinh hoạt': ['Life skills', '生活'], 'Nhiệm Vụ': ['Quests', '任務'], 'Tổ Đội': ['Party', '組隊'],
  'Tất cả': ['All', '全部'], 'Khu vực': ['Area', '區域'], 'Bang Hội': ['Guild', '幫會'], 'Mua': ['Buy', '購買'], 'Bán': ['Sell', '出售'], 'Sử dụng': ['Use', '使用'], 'Cường hoá': ['Enhance', '強化'],
  'Thần binh': ['Arsenal', '神兵'], 'Bảo thạch': ['Gems', '寶石'], 'Danh hiệu': ['Titles', '稱號'], 'Thú cưỡi': ['Mounts', '坐騎'], 'Linh thú': ['Pets', '靈獸'],
  'Ngôn ngữ': ['Language', '語言'], 'Âm lượng': ['Volume', '音量'], 'Nhạc nền': ['Music', '音樂'], 'Lồng tiếng': ['Voice', '配音'], 'Chất lượng đồ hoạ': ['Graphics quality', '畫質'],
  'Thấp': ['Low', '低'], 'Vừa': ['Medium', '中'], 'Cao': ['High', '高'], 'Cáo từ': ['Farewell', '告辭'], 'Nói chuyện': ['Talk', '交談'], 'Tự tìm đường': ['Auto path', '自動尋路'],
  'Lực chiến': ['Power', '戰力'], 'Khí huyết': ['HP', '氣血'], 'Nội lực': ['MP', '內力'], 'Bạo kích': ['Crit', '暴擊'], 'Giảm sát thương': ['Damage reduction', '減傷'], 'Thân pháp': ['Agility', '身法'],
};
const REV = {}; // dịch ngược để đổi qua lại giữa các ngôn ngữ
for (const [vi, [en, zh]] of Object.entries(UI)) { REV[en] = vi; REV[zh] = vi; }

function translateNode(n) {
  if (n.nodeType === 3) {
    const raw = n.nodeValue, t = raw.trim();
    if (!t) return;
    const vi = UI[t] ? t : REV[t];
    if (!vi) return;
    const out = LANG === 'vi' ? vi : UI[vi][LANG === 'en' ? 0 : 1];
    if (out !== t) n.nodeValue = raw.replace(t, out);
  } else if (n.nodeType === 1) {
    if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.classList?.contains('no-i18n')) return;
    const ph = n.getAttribute?.('placeholder');
    if (ph) { const vi = UI[ph] ? ph : REV[ph]; if (vi) n.setAttribute('placeholder', LANG === 'vi' ? vi : UI[vi][LANG === 'en' ? 0 : 1]); }
    for (const c of n.childNodes) translateNode(c);
  }
}

let observer = null;
export function setLang(lang) {
  LANG = ['vi', 'en', 'zh'].includes(lang) ? lang : 'vi';
  document.documentElement.lang = LANG === 'zh' ? 'zh-Hant' : LANG;
  translateNode(document.body);
  observer ??= new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) translateNode(n); });
  observer.observe(document.body, { childList: true, subtree: true });
}
