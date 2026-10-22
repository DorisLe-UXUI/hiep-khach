import { GEM_ITEMS } from '../game/gear.js';
import { LOOT_ITEMS } from '../game/loot.js';
// Bộ biểu tượng nét mảnh 24x24 (stroke = currentColor), dùng chung cho menu, HUD, hành trang.
const S = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

export const ICONS = {
  sword: S('<path d="M19 3l-9.5 9.5"/><path d="M19 3h2v2l-9.5 9.5"/><path d="M7.5 13.5l3 3"/><path d="M6 15l3 3"/><path d="M4.5 18.5l1 1"/><path d="M8 16l-4 4"/>'),
  dash: S('<path d="M3 12h11"/><path d="M3 8h7"/><path d="M3 16h7"/><path d="M14 6l7 6-7 6"/>'),
  palm: S('<path d="M8 13V5.5a1.5 1.5 0 013 0V11"/><path d="M11 10V4a1.5 1.5 0 013 0v7"/><path d="M14 10.5V6a1.5 1.5 0 013 0v7.5"/><path d="M8 12.5V9a1.5 1.5 0 00-3 0v4.5a7 7 0 0014 0"/><circle cx="20" cy="4" r="1.6"/><path d="M21.5 7.5l1 1"/>'),
  cloud: S('<path d="M6 18h11a4 4 0 00.5-7.97A6 6 0 006.2 11.1 3.5 3.5 0 006 18z"/><path d="M12 22v-4"/><path d="M9 21l1.5-2.5"/><path d="M15 21l-1.5-2.5"/>'),
  roll: S('<path d="M20 12a8 8 0 11-3-6.24"/><path d="M20 4v5h-5"/>'),
  potion: S('<path d="M9 3h6"/><path d="M10 3v5.5L5.6 16a3.5 3.5 0 003 5.5h6.8a3.5 3.5 0 003-5.5L14 8.5V3"/><path d="M7 15h10"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 7v10"/>'),
  scroll: S('<path d="M7 4h11a2 2 0 012 2v0a2 2 0 01-2 2h-1"/><path d="M17 8v10a2 2 0 01-2 2H6"/><path d="M6 20a2 2 0 01-2-2v-1h11v1a2 2 0 002 2"/><path d="M7 4a2 2 0 00-2 2v11"/><path d="M9 9h5M9 12h5"/>'),
  bag: S('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 12h6"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  keys: S('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>'),
  quill: S('<path d="M20 4c-7 0-12 5-13 13l-2 3"/><path d="M20 4c0 6-4 10-10 11"/><path d="M8 13l3 3"/>'),
  play: S('<path d="M7 4l13 8-13 8z"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  book: S('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/><path d="M8 7h7"/>'),
  map: S('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  door: S('<path d="M14 3H6v18h8"/><path d="M10 12h11"/><path d="M18 9l3 3-3 3"/>'),
  heart: S('<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/>'),
  qi: S('<circle cx="12" cy="12" r="8"/><path d="M12 4a4 4 0 010 8 4 4 0 000 8"/><circle cx="12" cy="8" r="1"/><circle cx="12" cy="16" r="1"/>'),
  wave: S('<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M9 10l3-6 3 6"/>'),
  star: S('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z"/>'),
  skull: S('<path d="M12 3a8 8 0 00-5 14.2V20h10v-2.8A8 8 0 0012 3z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 20v-2M14 20v-2"/>'),
  user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  check: S('<path d="M5 12l5 5 9-10"/>'),
  lock: S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
  lotus: S('<path d="M12 20c-4 0-8-2-9-6 3 0 5 1 6 2-1-3 0-7 3-10 3 3 4 7 3 10 1-1 3-2 6-2-1 4-5 6-9 6z"/>'),
  volume: S('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>'),
  eye: S('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  mouse: S('<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'),
  moon: S('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'),
};

import { GAME_ICONS } from './gameicons.js';

// gradient dùng chung cho icon (vàng kim, đỏ son, ngọc)
if (typeof document !== 'undefined' && !document.getElementById('gi-defs')) {
  document.body.insertAdjacentHTML('afterbegin', `<svg id="gi-defs" width="0" height="0" style="position:absolute">
    <defs>
      <linearGradient id="gi-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c8"/><stop offset=".45" stop-color="#f0c868"/><stop offset="1" stop-color="#a8742a"/></linearGradient>
      <linearGradient id="gi-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb0a0"/><stop offset=".5" stop-color="#e2463a"/><stop offset="1" stop-color="#8a1a14"/></linearGradient>
      <linearGradient id="gi-jade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8fff0"/><stop offset=".5" stop-color="#6fd0a8"/><stop offset="1" stop-color="#2a7a5c"/></linearGradient>
    </defs></svg>`);
}

/** Icon game-icons.net (nếu có) hoặc icon nét. */
export const icon = (name, cls = '') => {
  const d = GAME_ICONS[name];
  if (d) return `<i class="ico gi ${cls}"><svg viewBox="0 0 512 512"><path d="${d}"/></svg></i>`;
  return `<i class="ico ${cls}">${ICONS[name] || ''}</i>`;
};

/** Ảnh vật phẩm chụp từ model 3D (tools/thumbs.html) */
const THUMBS = new Set(['potion', 'qipill', 'herb', 'bounty', 'iron_sword', 'steel_sword', 'dao', 'bishui', 'cloth', 'leather', 'silk', 'charm', 'jade', 'gold', 'chest']);
export const itemIcon = (id, fallback = 'bag') => (GEM_ITEMS[id] ? `<span class="gem-ic l${GEM_ITEMS[id].lv}" style="--gc:${GEM_ITEMS[id].color}"><i></i><b>${GEM_ITEMS[id].lv}</b></span>` : THUMBS.has(id) || LOOT_ITEMS[id] ? `<img class="thumb-img" src="/assets/thumbs/${LOOT_ITEMS[id]?.thumb || id}.png" alt="" draggable="false" />` : icon(fallback));

/** Biểu tượng 3D (ảnh PNG trong suốt ở /assets/ui) */
export const uiImg = (id, cls = '') => `<img class="ui3d ${cls}" src="/assets/ui/${id}.png" alt="" draggable="false" />`;
