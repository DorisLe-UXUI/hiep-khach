import { icon, uiImg } from './icons.js';
import { DIFFICULTY, QUALITY, listProfiles, login } from '../settings.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LORE = [
  'Thanh Phong kiếm phái từng là đệ nhất kiếm phái vùng Giang Nam, nay chỉ còn lại tên một thị trấn.',
  'Huyết Ảnh chưởng: luyện thành thì chưởng lực có thể đánh nát tâm mạch, để lại dấu tay đỏ như máu đông.',
  'Lăng Ba Vi Bộ: bộ pháp khinh công cho phép lướt trên mặt nước như đi trên đất bằng.',
  'Đỡ đòn đúng hướng sẽ giảm gần hết sát thương, nhưng tốn thể lực.',
  'Liên chiêu 3 đòn: đòn thứ ba có thể đánh văng kẻ địch.',
  'Bấm Space hai lần để thi triển khinh công, giữ Space để lượn trên không.',
  'Kim sang dược (phím R) hồi khí huyết. Lưu chưởng quỹ luôn có hàng dự trữ.',
  'Người giang hồ nói: "Kiếm tại nhân tâm". Ai hiểu được câu này, kẻ đó mới là kiếm khách thật sự.',
];

export const SUMMARIES = {
  prologue: 'Tiêu Vân tới trấn Thanh Phong, lần theo nửa miếng ngọc bội mà sư phụ để lại trước khi chết.',
  c1: 'Tại Duyệt Lai khách điếm, Tiêu Vân đánh đuổi sơn tặc và biết tin về cái chết của Lâm Thiên Hải ba năm trước.',
  c2: 'Gặp Lâm Uyển Nhi, ghép lại câu chuyện của hai người thầy; tìm được Bích Thủy kiếm và bức thư nhắc tới Kiếm Mộ.',
  c3: 'Phá Hắc Phong trại, giải cứu dân lành; bức thư trong người Đồ Bá mang con dấu của Duyệt Lai khách điếm.',
  c4: 'Đêm trăng máu: Lưu chưởng quỹ thú tội; Tiêu Vân đánh lui Huyết Ảnh sát thủ, bảo vệ Uyển Nhi.',
  c5: 'Trên Kiếm Mộ, Tiêu Vân đối mặt Mộ Dung Huyết, đệ tử phản đồ của Thanh Phong kiếm phái.',
  epilogue: 'Gió đã yên trên hồ Bích Thủy.',
};

export class UI {
  constructor() {
    this.heroName = 'Tiêu Vân';
    this.loreI = 0;
    this.loreTimer = setInterval(() => this.nextLore(), 5200);
    this.nextLore();
    this.dialogActive = false;
    this._advance = null;
    this.panelStack = [];
    // nhấn phím chung cho hội thoại / dẫn truyện
    addEventListener('keydown', (e) => {
      if (this._advance && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) { e.preventDefault(); this._advance('next'); }
      if (this._advance && e.code === 'Escape') this._advance('skip');
      if (this._choose && /^Digit[1-4]$/.test(e.code)) this._choose(Number(e.code.slice(5)) - 1);
      if (e.code === 'Escape' && !$('panel').classList.contains('hidden')) { e.stopPropagation(); this.closePanel(); }
    }, true);
    $('narration').addEventListener('click', () => this._advance?.('next'));
    $('dialog').addEventListener('click', (e) => { if (!e.target.closest('#dlg-choices')) this._advance?.('next'); });
    document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => this.closePanel()));
    // icon cho nút menu
    const icons = { hero: 'm_hero', map: 'map', continue: 'm_continue', new: 'm_new', chapters: 'm_chapter', settings: 'settings', controls: 'm_controls', credits: 'quest', resume: 'm_continue', journal: 'm_chapter', inventory: 'bag', quit: 'more', retry: 'potion_red' };
    document.querySelectorAll('.mbtn').forEach((b) => b.insertAdjacentHTML('afterbegin', uiImg(icons[b.dataset.act] || 'title', 'mb-ic')));
  }

  nh(text) { return text.replaceAll('Tiêu Vân', this.heroName).replaceAll('Xiao Yun', this.heroName).replaceAll('蕭雲', this.heroName); }

  /** Đổi cách xưng hô khi nhân vật chính là nữ. */
  gender(text, isHero) {
    if (!this.female) return text;
    if (isHero) return text.replace(/\bTại hạ\b/g, 'Tiểu nữ').replace(/\btại hạ\b/g, 'tiểu nữ');
    return text.replace(/công tử/g, 'cô nương').replace(/Công tử/g, 'Cô nương').replace(/thiếu hiệp/g, 'nữ hiệp').replace(/Thiếu hiệp/g, 'Nữ hiệp')
      .replace(/khách quan/g, 'cô nương').replace(/Khách quan/g, 'Cô nương').replace(/đại hiệp/g, 'nữ hiệp').replace(/Đại hiệp/g, 'Nữ hiệp')
      .replace(/thằng nhãi/g, 'con nhãi').replace(/Ngươi là ai/g, 'Cô là ai');
  }

  // ───────── màn tải ─────────
  nextLore() {
    const el = $('load-lore');
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = LORE[this.loreI++ % LORE.length]; el.style.opacity = 1; }, 400);
  }

  progress(pct, text) {
    $('load-fill').style.width = pct + '%';
    $('load-pct').textContent = Math.round(pct) + '%';
    if (text) $('load-text').textContent = text;
  }

  async hideLoading() {
    clearInterval(this.loreTimer);
    await this.fade(true);
    $('loading').classList.add('hidden');
  }

  // ───────── đăng nhập ─────────
  login() {
    return new Promise((resolve) => {
      $('login').classList.remove('hidden');
      this.fade(false);
      const input = $('login-name');
      let title = 'Bạch Vân đệ tử';
      document.querySelectorAll('#login-titles .chip').forEach((c) => (c.onclick = () => {
        document.querySelectorAll('#login-titles .chip').forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
        title = c.dataset.title;
      }));
      const profiles = listProfiles();
      $('login-profiles').innerHTML = profiles.length
        ? '<div class="field"><span>Hồ sơ đã có</span></div>' + profiles.map((p, i) => `<button class="profile-row" data-i="${i}">${icon('user')}<b>${esc(p.name)}</b><small>${esc(p.title)}</small></button>`).join('')
        : '';
      $('login-profiles').querySelectorAll('.profile-row').forEach((b) => (b.onclick = () => done(profiles[b.dataset.i].name, profiles[b.dataset.i].title)));
      const done = (name, t) => {
        const prof = login(name, t);
        $('login').classList.add('hidden');
        resolve(prof);
      };
      const go = () => {
        const name = input.value.trim() || 'Tiêu Vân';
        done(name, title);
      };
      $('login-go').onclick = go;
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      setTimeout(() => input.focus(), 300);
    });
  }

  // ───────── menu chính ─────────
  showMenu(profile, save, chapters, handlers) {
    this.heroName = profile.name;
    $('menu').classList.remove('hidden');
    const b = (act) => document.querySelector(`#menu-buttons [data-act="${act}"]`);
    b('continue').disabled = !save;
    $('continue-info').textContent = save ? `${chapters[save.chapter]?.title || ''} · ${timeAgo(save.at)}` : '';
    b('new').disabled = false;
    b('chapters').disabled = false;
    b('continue').onclick = () => handlers.continue();
    b('new').onclick = () => handlers.newGame();
    b('chapters').onclick = () => this.openChapters(chapters, save?.unlocked ?? 0, handlers.chapter);
    b('hero').disabled = false;
    b('hero').onclick = () => handlers.hero();
    b('settings').onclick = () => this.openSettings(handlers.settings, handlers.onSettings);
    b('controls').onclick = () => this.openControls();
    b('credits').onclick = () => this.openCredits();
    $('menu-profile').innerHTML = `${handlers.avatar ? `<span class="av-framed"><img class="av-face" src="${handlers.avatar}" alt="" /><img class="av-frame" src="/assets/ui/frame.png" alt="" /></span>` : icon('user')}<span class="mp-info"><b>${esc(profile.name)}</b><small>${esc(profile.hero ? 'Môn phái: ' + (handlers.className || '') : profile.title)}</small></span><button id="switch-prof">Đăng xuất</button>`;
    // nút góc trên phải
    const mt = (k) => document.querySelector(`#menu-top [data-mt="${k}"]`);
    mt('settings').onclick = () => this.openSettings(handlers.settings, handlers.onSettings);
    mt('friends').onclick = () => handlers.ranking?.();
    mt('gift').onclick = () => handlers.welfare?.();
    mt('mail').onclick = () => handlers.mail?.();
    mt('mail').querySelector('.dot').classList.toggle('on', !!handlers.mailUnread?.());
    mt('gift').querySelector('.dot').classList.toggle('on', !!handlers.giftReady?.());
    $('switch-prof').onclick = () => handlers.switchProfile();
    setTimeout(() => document.querySelector('#menu-buttons .mbtn:not(:disabled)')?.focus(), 50);
  }

  hideMenu() { $('menu').classList.add('hidden'); }

  // ───────── bảng phụ ─────────
  openPanel(title, html) {
    if ($('panel').classList.contains('hidden')) this.sound?.('open');
    $('panel-title').textContent = title;
    $('panel-body').innerHTML = html;
    $('panel').classList.remove('hidden');
    return $('panel-body');
  }

  closePanel() { if (!$('panel').classList.contains('hidden')) this.sound?.('close'); $('panel').classList.add('hidden'); this.onPanelClose?.(); this.onPanelClose = null; }

  openChapters(chapters, unlocked, pick) {
    const body = this.openPanel('Chọn chương', `<div class="chapters">${chapters.map((c, i) => `
      <button class="ch-card" data-i="${i}" ${i > unlocked ? 'disabled' : ''}>
        ${icon(i > unlocked ? 'lock' : i < unlocked ? 'check' : 'play')}
        <div class="n">${c.title}</div><div class="t">${c.subtitle}</div>
        <div class="d">${i > unlocked ? 'Chưa mở khoá' : this.nh(SUMMARIES[c.id] || '')}</div>
      </button>`).join('')}</div>`);
    body.querySelectorAll('.ch-card').forEach((b) => (b.onclick = () => { this.closePanel(); pick(Number(b.dataset.i)); }));
  }

  openSettings(s, onChange) {
    const seg = (key, opts) => `<div class="seg" data-k="${key}">${Object.entries(opts).map(([v, o]) => `<button data-v="${v}" class="${s[key] === v ? 'on' : ''}">${o.label}</button>`).join('')}</div>`;
    const body = this.openPanel('Cài đặt', `
      <div class="set-row">${icon('compass')}<label>Kiểu điều khiển<small>MMO: nhìn chéo từ trên cao, joystick + nút chiêu, giữ chuột phải để xoay · Hành động: sau lưng, khoá chuột</small></label>${seg('controlMode', { mmo: { label: 'MMO' }, action: { label: 'Hành động' } })}</div>
      ${import.meta.env.VITE_LITE ? '' : `<div class="set-row">${icon('sparkles')}<label>Phong cách hình ảnh<small>Tươi sáng + chibi hoặc tả thực (đổi chibi cần tải lại)</small></label>${seg('style', { bright: { label: 'Tươi sáng' }, realistic: { label: 'Tả thực' } })}</div>`}
      <div class="set-row">${icon('mouse')}<label>Độ nhạy chuột<small>Tốc độ xoay góc nhìn</small></label><input type="range" min="0.3" max="2.5" step="0.05" value="${s.sens}" data-k="sens"></div>
      <div class="set-row">${icon('mouse')}<label>Đảo trục dọc</label><button class="toggle ${s.invertY ? 'on' : ''}" data-k="invertY"></button></div>
      <div class="set-row">${icon('eye')}<label>Góc nhìn (FOV)</label><input type="range" min="45" max="80" step="1" value="${s.fov}" data-k="fov"></div>
      <div class="set-row">${icon('compass')}<label>Ngôn ngữ<small>Phụ đề & giao diện · lồng tiếng tiếng Anh</small></label>${seg('lang', { vi: { label: 'Tiếng Việt' }, en: { label: 'English' }, zh: { label: '中文' } })}</div>
      <div class="set-row">${icon('volume')}<label>Âm lượng</label><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-k="volume"></div>
      <div class="set-row">${icon('book')}<label>Nhạc nền</label><input type="range" min="0" max="1" step="0.05" value="${s.music ?? 0.5}" data-k="music"></div>
      <div class="set-row">${icon('user')}<label>Lồng tiếng</label><input type="range" min="0" max="1" step="0.05" value="${s.voice ?? 0.9}" data-k="voice"></div>
      <div class="set-row">${icon('sun')}<label>Chất lượng đồ hoạ<small>Bóng đổ, độ nét, mật độ cỏ</small></label>${seg('quality', QUALITY)}</div>
      <div class="set-row">${icon('skull')}<label>Độ khó</label>${seg('difficulty', DIFFICULTY)}</div>
      <div class="set-row">${icon('star')}<label>Hiện số sát thương</label><button class="toggle ${s.dmgNumbers ? 'on' : ''}" data-k="dmgNumbers"></button></div>`);
    body.querySelectorAll('input[type=range]').forEach((r) => (r.oninput = () => { s[r.dataset.k] = Number(r.value); onChange(s); }));
    body.querySelectorAll('.toggle').forEach((t) => (t.onclick = () => { s[t.dataset.k] = !s[t.dataset.k]; t.classList.toggle('on'); onChange(s); }));
    body.querySelectorAll('.seg').forEach((g) => g.querySelectorAll('button').forEach((btn) => (btn.onclick = () => {
      s[g.dataset.k] = btn.dataset.v;
      g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === btn));
      onChange(s);
    })));
  }

  openControls() {
    const rows = [
      ['mouse', 'Xoay góc nhìn', ['Chuột']], ['dash', 'Di chuyển', ['W', 'A', 'S', 'D']], ['wave', 'Chạy nhanh / Lăng Ba Vi Bộ', ['Shift']],
      ['sword', 'Chém (liên chiêu 3 đòn)', ['Chuột trái']], ['shield', 'Đỡ đòn', ['Chuột phải']], ['roll', 'Lộn né', ['Ctrl']],
      ['cloud', 'Nhảy / Khinh công / Lượn', ['Space']], ['dash', 'Lướt Kiếm', ['Q']], ['palm', 'Chưởng Phong', ['F']],
      ['potion', 'Kim sang dược', ['R']], ['star', 'Bộc phát nộ khí', ['X']], ['user', 'Nói chuyện / Tương tác', ['E']], ['eye', 'Đổi góc nhìn sau lưng / trên cao', ['V']],
      ['scroll', 'Nhật ký giang hồ', ['J']], ['bag', 'Túi đồ & trang bị', ['I']], ['qi', 'Võ học', ['K']], ['map', 'Bản đồ giang hồ', ['M']], ['door', 'Tạm dừng', ['Esc']],
    ];
    this.openPanel('Điều khiển', `<div class="controls">${rows.map(([ic, t, keys]) => `<div class="ctl">${icon(ic)}<span>${t}</span><span class="k">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span></div>`).join('')}</div>`);
  }

  openCredits() {
    this.openPanel('Ghi công', `<div class="credits">
      <p><b>Thiên Kiếm Giang Hồ: Thanh Phong Kiếm Ký</b><br>Game hành động nhập vai 3D chạy trên trình duyệt, viết bằng Three.js.</p>
      <p><b>Nhân vật, trang phục, 89 động tác</b>: Quaternius, Universal Base Characters, Modular Character Outfits, Universal Animation Library 1 &amp; 2 (CC0).</p>
      <p><b>Mô hình đồ vật, cây cối, đá, chất liệu PBR, bầu trời HDRI</b>: Poly Haven (CC0).</p>
      <p><b>Kiến trúc cổ trang, rừng trúc, cỏ, mặt hồ, âm thanh</b>: dựng bằng mã nguồn.</p>
      <p><b>Biểu tượng giao diện</b>: game-icons.net (Lorc, Delapouite, Skoll, Felbrigg, Zeromancer, Faithtoken và cộng sự), giấy phép CC BY 3.0.</p>
      <p><b>Ngựa, chó đồng hành</b>: Quaternius Farm Animals (CC0). <b>Binh khí low-poly, đạo cụ</b>: Quaternius Medieval Weapons, Fantasy Props MegaKit (CC0).</p>
      <p><b>Phông chữ</b>: Noto Serif, Cormorant Garamond, Ma Shan Zheng (Google Fonts, OFL).</p></div>`);
  }

  openJournal(chapters, current, flags) {
    this.openPanel('Nhật ký giang hồ', chapters.slice(0, current + 1).map((c, i) => `
      <div class="journal-ch ${i === current ? 'current' : ''}"><h3><small>${c.title}</small>${c.subtitle}</h3><p>${this.nh(SUMMARIES[c.id] || '')}</p>
      ${i === 2 && flags.askedMaidenFight && current > 2 ? '<p>· Đã hỏi Uyển Nhi có biết võ công không.</p>' : ''}
      ${i === 3 && current > 3 ? `<p>· ${flags.sparedDoba ? 'Đã tha mạng cho Đồ Bá.' : 'Đã kết liễu Đồ Bá.'}</p>` : ''}
      ${i === 4 && current > 4 ? `<p>· ${flags.kindKeeper ? 'Khuyên giải Lưu chưởng quỹ bằng lòng bao dung.' : 'Ép Lưu chưởng quỹ khai bằng mũi kiếm.'}</p>` : ''}</div>`).join(''));
  }

  openInventory(g) {
    const p = g.player, u = g.unlocks;
    const skills = [
      ['sword', 'Thanh Phong kiếm pháp', 'Liên chiêu 3 đòn; đòn cuối đánh văng địch.' + (p.attackBonus ? ` (quyển thượng: công +${p.attackBonus})` : ''), true],
      ['dash', 'Lướt Kiếm (Q)', 'Lao tới chém xuyên qua kẻ địch, miễn sát thương khi đang lướt. 15 nội lực.', true],
      ['palm', 'Chưởng Phong (F)', 'Phóng luồng chưởng khí đánh văng địch từ xa. 20 nội lực.', true],
      ['cloud', 'Khinh công', 'Nhảy lần hai trên không, giữ Space để lượn. 8 nội lực.', true],
      ['wave', 'Lăng Ba Vi Bộ', 'Giữ Shift để lướt trên mặt nước. Tiêu hao nội lực.', !!u.waterRun],
    ];
    this.openPanel('Hành trang & võ học', `<div class="inv">
      <div class="stats">
        <div>${icon('heart')}Khí huyết<b>${Math.round(p.hp)} / ${p.maxHp}</b></div>
        <div>${icon('qi')}Nội lực<b>${Math.round(p.mp)} / ${p.maxMp}</b></div>
        <div>${icon('sword')}Công lực<b>${18 + p.attackBonus}</b></div>
        <div>${icon('potion')}Kim sang dược<b>× ${g.potions}</b></div>
        <div>${icon('lotus')}Ngọc bội Thanh Phong<b>${g.chapterIdx >= 4 ? 'Đã ghép đủ' : 'Một nửa'}</b></div>
        ${g.chapterIdx >= 2 ? `<div>${icon('scroll')}Thư Lâm Thiên Hải<b>1</b></div>` : ''}
      </div>
      <div class="skill-list">${skills.map(([ic, n, d, ok]) => `<div class="skill ${ok ? '' : 'locked'}"><div class="ic">${icon(ok ? ic : 'lock')}</div><div><b>${n}</b><p>${ok ? d : 'Chưa lĩnh ngộ.'}</p></div></div>`).join('')}</div>
    </div>`);
  }

  // ───────── chuyển cảnh ─────────
  fade(on) {
    $('fade').classList.toggle('on', on);
    return wait(650);
  }

  async narrate(lines) {
    const box = $('narr-text');
    $('narration').classList.remove('hidden');
    await this.fade(false);
    for (const l of lines) {
      box.innerHTML = `<div class="ln">${esc(this.nh(this.tr?.(l) ?? l))}</div>`;
      this.speak?.(l);
      const r = await new Promise((res) => (this._advance = res));
      if (r === 'skip') break;
    }
    this._advance = null;
    this.speak?.(null);
    await this.fade(true);
    $('narration').classList.add('hidden');
  }

  chapterCard(title, sub) {
    $('cc-title').textContent = title;
    $('cc-sub').textContent = sub;
    const el = $('chapter-card');
    el.classList.add('hidden');
    void el.offsetWidth; // chạy lại animation
    el.classList.remove('hidden');
    return wait(4200).then(() => el.classList.add('hidden'));
  }

  // ───────── hội thoại ─────────
  /** Hiện một câu thoại có hiệu ứng gõ chữ. Bấm lần đầu hiện hết, lần hai sang câu sau. */
  async line(name, portrait, text, narrator = false) {
    const d = $('dialog');
    d.classList.remove('hidden');
    d.classList.toggle('narrator', narrator);
    $('dlg-name').textContent = name;
    $('dlg-img').src = portrait || '';
    $('dlg-choices').innerHTML = '';
    $('dlg-hint').style.visibility = 'visible';
    const full = this.nh(text);
    const el = $('dlg-text');
    let i = 0, finished = false;
    const timer = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i >= full.length) { finished = true; clearInterval(timer); }
    }, 18);
    for (;;) {
      await new Promise((res) => (this._advance = res));
      if (!finished) { clearInterval(timer); finished = true; el.textContent = full; continue; }
      break;
    }
    this._advance = null;
  }

  choose(choices) {
    $('dlg-hint').style.visibility = 'hidden';
    const box = $('dlg-choices');
    box.innerHTML = choices.map((c, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(this.nh(c.text))}</span></button>`).join('');
    return new Promise((res) => {
      const pick = (i) => { if (!choices[i]) return; this._choose = null; box.innerHTML = ''; res(i); };
      this._choose = pick;
      box.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); pick(Number(b.dataset.i)); }));
    });
  }

  /** Banner tên vùng đất khi bước vào khu mới. */
  zoneBanner(z) {
    let el = document.getElementById('zone-banner');
    if (!el) { el = document.createElement('div'); el.id = 'zone-banner'; document.body.appendChild(el); }
    const lv = z.mobs ? '' : '';
    el.innerHTML = `<div class="zb-han">${z.han}</div><div class="zb-line"></div><div class="zb-name">${z.name}${lv}</div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  hideDialog() { $('dialog').classList.add('hidden'); }

  showPause(chapterLabel) { $('pause-chapter').textContent = chapterLabel; $('pause').classList.remove('hidden'); }
  hidePause() { $('pause').classList.add('hidden'); }
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function timeAgo(t) {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} giờ trước` : `${Math.round(h / 24)} ngày trước`;
}
