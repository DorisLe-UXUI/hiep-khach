import { PLACES } from '../world/layout.js';

/**
 * KỲ DUYÊN: nhiệm vụ phụ kể chuyện riêng của các nhân vật phụ, chạy song song truyện chính.
 * Mỗi nhiệm vụ: giver (NPC giao), unlock(g), offer(g) lời mời, steps giống chương truyện
 * (objective, marker, enter, done, talk), reward(g) khi xong. Tiến độ lưu ở g.sys.s.side.
 * Quái của nhiệm vụ phụ có nhóm 'sq_<id>', đếm riêng nên không mất khi đổi chương.
 */
const P = PLACES;
const near = (g, x, z, r = 6) => Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < r;
const ICE = { x: -40, z: -245 }, LAKE_SHORE = { x: -112, z: 138 };
const npcAt = (id) => (g) => { const n = g.npc(id); return n && !n.hidden ? { x: n.pos.x, z: n.pos.z } : null; };
const unlocked = (n) => (g) => g.unlockedChapter >= n;

/** NPC riêng của Kỳ duyên: chỉ hiện khi câu chuyện cho phép */
export const STORY_NPCS = [
  { id: 'tieuho', look: 'tieuho', name: 'Lưu Tiểu Hổ', han: '劉小虎', x: P.inn.x + 8, z: P.inn.z - 1, yaw: -0.4, show: (g) => g.unlockedChapter >= 6 },
  { id: 'fisher', look: 'boss', name: 'Ngư phủ Đồ Bá', han: '漁夫屠霸', x: P.pavilion.x + 10, z: P.pavilion.z + 13, yaw: -2.2, show: (g) => g.unlockedChapter >= 6 && !!g.flags.sparedDoba },
  { id: 'hanxue_npc', look: 'hanxue', name: 'Hàn Tuyết', han: '寒雪', speaker: 'hanxue', x: ICE.x + 4, z: ICE.z + 50, yaw: Math.PI, show: (g) => g.unlockedChapter >= 8 && !!g.flags.sparedHanxue && g.chapter?.id !== 'c6' },
  { id: 'honglian_npc', look: 'honglian', name: 'Hồng Liên', han: '紅蓮', speaker: 'honglian', x: P.gate.x - 6, z: P.gate.z - 4, yaw: 0.6, show: (g) => g.unlockedChapter >= 9 && !!(g.flags.sparedHonglian || g.flags.jailedHonglian) && !['c7', 'c8'].includes(g.chapter?.id) },
];
export const STORY_SPEAKERS = {
  tieuho: { name: 'Lưu Tiểu Hổ', han: '劉小虎', look: 'tieuho' },
  fisher: { name: 'Ngư phủ Đồ Bá', han: '漁夫屠霸', look: 'boss' },
};

export const SIDE_QUESTS = [
  // ───── 1. Vương lão bá: thanh kiếm năm xưa ─────
  {
    id: 'oldsword',
    name: 'Thanh kiếm của lão gác cổng',
    han: '舊劍',
    giver: 'guard',
    unlock: unlocked(4),
    summary: 'Vương lão bá từng là ngoại môn đệ tử Thanh Phong kiếm phái. Thanh kiếm cũ của ông bị bỏ lại ở tàn tích Hắc Phong trại.',
    offer: () => [
      ['guard', 'Thiếu hiệp, lão già này giấu ngươi một chuyện. Năm xưa lão cũng mặc áo Thanh Phong kiếm phái. Ngoại môn thôi, quét sân, gánh nước.'],
      ['guard', 'Đêm kiếm phái tan rã, lão bỏ chạy. Thanh kiếm sư phụ ban, lão vứt lại trong núi, giờ chỗ đó thành Hắc Phong trại.'],
      ['guard', 'Lão không dám xin. Chỉ là... trước khi xuống lỗ, lão muốn cầm nó thêm một lần.'],
    ],
    steps: [
      {
        objective: (g, q) => `Dẹp tàn dư sơn tặc ở tàn tích Hắc Phong trại (${q.kills('sq_oldsword')}/3)`,
        marker: (g, q) => q.nearestOf('sq_oldsword') || { x: P.camp.x, z: P.camp.z + 10 },
        enter: (g, q) => q.spawnN('sq_oldsword', 3, (i) => g.spawn(i === 2 ? 'bandit2' : 'bandit', P.camp.x - 6 + i * 6, P.camp.z + 12, { group: 'sq_oldsword', weapon: 'axe', hp: 160, dmg: 14, aggro: 25 })),
        done: (g, q) => q.kills('sq_oldsword') >= 3,
      },
      {
        objective: () => 'Tìm thanh kiếm cũ trong đại sảnh trại',
        marker: () => ({ x: P.camp.x, z: P.camp.z - 6 }),
        done: (g) => near(g, P.camp.x, P.camp.z - 6, 5),
      },
      {
        objective: () => 'Mang kiếm về cho Vương lão bá',
        marker: npcAt('guard'),
        talk: {
          guard: (g, q) => [
            ['guard', '(hai tay run run đón lấy) ...Gỉ hết rồi. Ha, như lão vậy.'],
            ['guard', 'Thiếu hiệp có biết vì sao kiếm phái tan không? Không phải vì kẻ thù. Mà vì ba sư huynh đệ giỏi nhất cãi nhau về một câu hỏi.'],
            ['guard', '"Kiếm để làm gì?" Lý Mộ Bạch nói: để bảo vệ. Lâm Thiên Hải nói: để giữ đạo. Mộ Dung Huyết nói: để không ai bắt nạt được mình nữa.'],
            ['guard', 'Sư phụ chọn hai người đầu. Người thứ ba... thiếu hiệp biết rồi đấy.'],
            ['guard', 'Thanh kiếm này, thiếu hiệp giữ lấy. Lão già không cần nó để nhớ nữa.'],
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.rpg.points += 2; g.player.attackBonus += 3; g.rpg.apply(true); g.toast('Kỳ duyên hoàn thành · Điểm võ học +2 · Công +3', 4); },
  },

  // ───── 2. Lưu Tiểu Hổ muốn học kiếm ─────
  {
    id: 'tieuho',
    name: 'Tiểu Hổ học kiếm',
    han: '小虎學劍',
    giver: 'tieuho',
    unlock: unlocked(6),
    summary: 'Con trai Lưu chưởng quỹ được cứu khỏi Kiếm Mộ, giờ nằng nặc đòi bái Tiêu Vân làm sư phụ.',
    offer: () => [
      ['tieuho', 'Đại hiệp! Đại hiệp! Ta là Tiểu Hổ đây, người cứu ta ở Kiếm Mộ đó!'],
      ['tieuho', 'Ta muốn học kiếm! Để lần sau có kẻ bắt cha ta, ta tự đánh được!'],
      ['tieuho', 'Cha nói phải có Linh chi thảo bồi bổ gân cốt mới học võ được. Đại hiệp hái giúp ta năm cây nhé?'],
    ],
    steps: [
      {
        objective: (g) => `Hái Linh chi thảo cho Tiểu Hổ (${Math.min(5, g.rpg.bag.herb || 0)}/5)`,
        marker: npcAt('tieuho'),
        talk: {
          tieuho: (g, q) => ((g.rpg.bag.herb || 0) >= 5 ? [
            ['tieuho', 'Năm cây! Đủ rồi! Cha ơi, sắc thuốc cho con!'],
            { run: () => { g.rpg.remove('herb', 5); q.advance(); } },
          ] : [['tieuho', `Mới có ${g.rpg.bag.herb || 0} cây thôi... Linh chi thảo mọc ngoài đồng, phát sáng xanh xanh ấy!`]]),
        },
      },
      {
        objective: () => 'Nói chuyện với Tiểu Hổ',
        marker: npcAt('tieuho'),
        talk: {
          tieuho: (g, q) => [
            ['tieuho', '(uống xong bát thuốc, mặt nhăn như khỉ) Đắng quá! Giờ dạy ta chiêu mạnh nhất đi!'],
            ['keeper', '(từ trong quầy) Tiểu Hổ! Đừng làm phiền đại hiệp!'],
            {
              choice: [
                { text: 'Dạy Thanh Phong kiếm pháp: "Chiêu đầu tiên là học cách không rút kiếm."', then: () => { g.karma(1); g.flag('taughtTieuho'); return [
                  ['tieuho', '"Không rút kiếm"? Thế thì học kiếm làm gì?'],
                  ['hero', 'Để khi buộc phải rút, ngươi biết vì sao mình rút.'],
                  ['tieuho', '...Ta không hiểu. Nhưng ta sẽ nhớ!'],
                ]; } },
                { text: 'Khuyên nó ở lại: "Giữ quán cho cha ngươi. Giang hồ không thiếu kiếm khách, thiếu người nấu cơm ngon."', then: () => { g.flag('tieuhoCook'); return [
                  ['tieuho', '(phụng phịu) ...Thôi được. Nhưng ta sẽ nấu món ngon nhất trấn, để đại hiệp về là có ăn!'],
                  ['keeper', '(lau nước mắt) Đa tạ đại hiệp...'],
                ]; } },
              ],
            },
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.rpg.add('hotpot', 2); g.rpg.add('mooncake', 3); g.rpg.addGold?.(200); g.toast('Kỳ duyên hoàn thành · Lẩu thập cẩm ×2 · Bánh trung thu ×3 · 200 lượng', 4); },
  },

  // ───── 3. Ngư phủ Đồ Bá ─────
  {
    id: 'fisher',
    name: 'Lưới cá của Đồ Bá',
    han: '屠霸之網',
    giver: 'fisher',
    unlock: (g) => g.unlockedChapter >= 6 && !!g.flags.sparedDoba,
    summary: 'Đồ Bá được tha mạng, nay làm ngư phủ bên hồ. Nhưng yêu quái dưới nước không để ai yên.',
    offer: () => [
      ['fisher', '(gãi đầu) Ân nhân... Đồ Bá ta giờ chỉ biết quăng lưới. Nhưng lũ Ngư Tinh ở bờ hồ phía bắc xé hết lưới rồi.'],
      ['fisher', 'Ta muốn tự đánh, nhưng... ta thề với ngươi không cầm đao nữa. Đồ Bá nói là giữ.'],
    ],
    steps: [
      {
        objective: (g, q) => `Diệt yêu quái nước ở bờ hồ Bích Thủy (${q.kills('sq_fisher')}/5)`,
        marker: (g, q) => q.nearestOf('sq_fisher') || LAKE_SHORE,
        enter: (g, q) => q.spawnN('sq_fisher', 5, (i) => g.spawnMonster(i % 2 ? 'ngutinh' : 'ech', LAKE_SHORE.x - 8 + i * 4, LAKE_SHORE.z + (i % 2 ? 4 : -4), { group: 'sq_fisher', aggro: 20 })),
        done: (g, q) => q.kills('sq_fisher') >= 5,
      },
      {
        objective: () => 'Quay lại gặp Đồ Bá',
        marker: npcAt('fisher'),
        talk: {
          fisher: (g, q) => [
            ['fisher', 'Ha! Lưới lành rồi, cá về rồi! Ân nhân, ta nợ ngươi hai lần.'],
            ['fisher', 'Có chuyện này ta chưa kể. Hồi còn làm trại chủ, vàng Huyết Ảnh Môn trả ta... thỏi nào cũng còn hơi nóng, như vừa lấy ra từ lò.'],
            ['fisher', 'Có kẻ đúc vàng ngay trong núi lửa. Hỏa Diệm Sơn. Lúc đó ta không nghĩ gì, giờ nghĩ lại mới rợn.'],
            ['fisher', 'Đây, con Kim lý ngư này may mắn lắm. Cầm lấy.'],
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.rpg.add('goldfish', 1); g.rpg.add('fried_fish', 3); g.karma(1); g.toast('Kỳ duyên hoàn thành · Kim lý ngư · Cá chiên giòn ×3', 4); },
  },

  // ───── 4. Hàn Tuyết: mộ phần tỷ tỷ ─────
  {
    id: 'hanxue',
    name: 'Mộ phần tỷ tỷ',
    han: '姊之墓',
    giver: 'hanxue_npc',
    unlock: (g) => g.unlockedChapter >= 8 && !!g.flags.sparedHanxue,
    summary: 'Hàn Tuyết muốn chôn thanh kiếm của Hàn Băng bên hồ Bích Thủy, nơi tỷ tỷ nàng ngã xuống.',
    offer: (g) => [
      ['hanxue', g.flags.hanxueAlly ? 'Trận Hỏa Diệm Sơn xong rồi. Ta còn một việc.' : 'Lại là ngươi.'],
      ['hanxue', 'Tỷ tỷ chết bên hồ Bích Thủy, xác bị Huyết Ảnh Môn vứt xuống nước. Ta chỉ còn thanh kiếm của tỷ ấy.'],
      ['hanxue', 'Ta muốn chôn nó ở Vọng Nguyệt đình. Nhưng tàn dư Huyết Ảnh vẫn rình ở đó, chúng muốn lấy lại kiếm.'],
    ],
    steps: [
      {
        objective: () => 'Tới Vọng Nguyệt đình',
        marker: () => P.pavilion,
        done: (g) => near(g, P.pavilion.x, P.pavilion.z, 14),
      },
      {
        objective: (g, q) => `Đánh lui sát thủ Huyết Ảnh phục kích (${q.kills('sq_hanxue')}/4)`,
        marker: (g, q) => q.nearestOf('sq_hanxue') || P.pavilion,
        enter: (g, q) => { q.spawnN('sq_hanxue', 4, (i) => g.spawn('assassin', P.pavilion.x + 10 * Math.cos(i * 1.6), P.pavilion.z + 10 * Math.sin(i * 1.6), { group: 'sq_hanxue', weapon: 'sword', hp: 320, dmg: 24, aggro: 60 })); g.say('hanxue', 'Chúng tới rồi. Đừng để chúng chạm vào kiếm!'); },
        done: (g, q) => q.kills('sq_hanxue') >= 4,
      },
      {
        objective: () => 'Quay về Hàn Băng Cốc gặp Hàn Tuyết',
        marker: npcAt('hanxue_npc'),
        talk: {
          hanxue_npc: (g, q) => [
            ['hanxue', 'Ta đã chôn kiếm dưới gốc liễu sau đình. Đứng đó, ta mới nhớ ra lần cuối tỷ ấy cười là khi nào.'],
            ['hanxue', 'Năm ta bảy tuổi, hàn độc phát lần đầu. Tỷ tỷ cõng ta đi ba ngày tuyết tới Huyết Ảnh Môn xin thuốc. Từ hôm đó tỷ ấy không cười nữa.'],
            ['hanxue', 'Trong đốc kiếm có cuộn giấy này. Nhật ký của tỷ ấy. Ngươi đọc đi, ta... không đọc được.'],
            ['hero', '(Dòng cuối cùng: "Đêm nay ta tới Vọng Nguyệt đình. Nếu gặp truyền nhân Thanh Phong, có lẽ ta sẽ được nghỉ.")'],
            ['hanxue', '...Cảm ơn ngươi. Vì đã cho tỷ ấy nghỉ.'],
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.rpg.add('gem_def_4', 1); g.rpg.add('gem_atk_3', 1); g.karma(1); g.toast('Kỳ duyên hoàn thành · Tử ngọc cấp 4 · Hồng ngọc cấp 3', 4); },
  },

  // ───── 5. Hồng Liên: chữ đầu tiên ─────
  {
    id: 'honglian',
    name: 'Chữ đầu tiên',
    han: '第一個字',
    giver: 'honglian_npc',
    unlock: (g) => g.unlockedChapter >= 9 && !!(g.flags.sparedHonglian || g.flags.jailedHonglian),
    summary: 'Hồng Liên chưa từng viết tên mình. Nàng nhờ Tiêu Vân mang bút mực và một chút gì đó cho lũ trẻ ở biên trấn.',
    offer: (g) => [
      ['honglian', g.flags.jailedHonglian ? '(sau song sắt tạm ở cổng trấn) Quan phủ cho ta ra quét đường mỗi sáng. Cũng hay.' : 'Đừng nhìn ta như thế. Ta không tới để giết ai.'],
      ['honglian', 'Ta biết hai mươi bảy cách giết người bằng một ngón tay. Nhưng ta không biết viết tên mình.'],
      ['honglian', 'Lũ trẻ ở biên trấn đói lắm. Mang cho ta hai lồng bánh bao và một bộ trà sứ. Ta đổi với lão đồ nho lấy bút mực.'],
    ],
    steps: [
      {
        objective: (g) => `Mang Lồng bánh bao ×2 (${Math.min(2, g.rpg.bag.steamer || 0)}/2) và Bộ trà sứ ×1 (${Math.min(1, g.rpg.bag.tea_set || 0)}/1)`,
        marker: npcAt('honglian_npc'),
        talk: {
          honglian_npc: (g, q) => ((g.rpg.bag.steamer || 0) >= 2 && (g.rpg.bag.tea_set || 0) >= 1 ? [
            ['honglian', '(nhận lấy, im lặng rất lâu) ...Ngươi mang thật à.'],
            { run: () => { g.rpg.remove('steamer', 2); g.rpg.remove('tea_set', 1); q.advance(); } },
          ] : [['honglian', 'Bánh bao mua ở tiệm Duyệt Lai. Bộ trà sứ... yêu quái hay cướp của thương nhân, đánh chúng mà lấy.']]),
        },
      },
      {
        objective: () => 'Trò chuyện với Hồng Liên',
        marker: npcAt('honglian_npc'),
        talk: {
          honglian_npc: (g, q) => [
            ['honglian', '(trên đất, nét chữ xiêu vẹo: 紅蓮) Hồng... Liên. Là phụ thân đặt. Ông ấy nói hoa sen mọc từ bùn mà không nhiễm bùn.'],
            ['honglian', 'Buồn cười không? Ông ấy đặt tên đó cho ta, rồi dạy ta lội bùn cả đời.'],
            {
              choice: [
                { text: '"Tên đẹp. Giờ cô có thể tự chọn sẽ mọc lên thế nào."', then: () => { g.karma(1); return [['honglian', '...Ngươi nói chuyện y như lão già Lý Mộ Bạch trong lời phụ thân kể. Phụ thân ghét ông ta nhất. Có lẽ vì ông ta đúng.']]; } },
                { text: '"Mộ Dung Huyết không xứng làm cha."', then: () => [['honglian', '(cười nhạt) Ông ấy cứu ta khỏi chết đói. Ngươi không hiểu được đâu. Nhưng... có lẽ ngươi cũng không sai.']] },
              ],
            },
            ['honglian', 'Cầm lấy. Huyết Ảnh tâm pháp, quyển cuối. Ta xé phần hại người rồi, chỉ còn phần dưỡng khí. Đừng để ai dùng nó như phụ thân.'],
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.player.storyMp += 40; g.player.storyHp += 40; g.rpg.apply(true); g.toast('Kỳ duyên hoàn thành · Huyết Ảnh tâm pháp (dưỡng khí) · Khí huyết +40 · Nội lực +40', 4); },
  },

  // ───── 6. Kiếm phổ tàn trang ─────
  {
    id: 'pages',
    name: 'Thanh Phong kiếm phổ tàn trang',
    han: '劍譜殘頁',
    giver: 'keeper',
    unlock: unlocked(3),
    summary: 'Kiếm phổ của sư tổ bị xé làm mười hai trang, rải khắp vùng đất. Gom đủ để biết toàn bộ câu chuyện.',
    offer: () => [
      ['keeper', 'Đại hiệp, có chuyện này lão nghe các khách thương kể. Ngày kiếm phái tan, sư tổ xé kiếm phổ làm mười hai trang, ném theo gió.'],
      ['keeper', 'Người ta nói trang giấy vẫn còn, phát sáng như ánh trăng ở những nơi không ngờ tới. Đại hiệp đi khắp nơi, để ý giúp lão nhé.'],
    ],
    steps: [
      {
        objective: (g) => `Tìm kiếm phổ tàn trang khắp bản đồ (${g.lore?.count() || 0}/12) · trang phát sáng trắng`,
        marker: (g) => g.lore?.nearest() || null,
        done: (g) => (g.lore?.count() || 0) >= 12,
      },
      {
        objective: () => 'Mang đủ 12 trang về cho Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        talk: {
          keeper: (g, q) => [
            ['keeper', '(xếp mười hai trang lên bàn, tay run run) Ghép lại rồi... nhưng sao lại...'],
            ['hero', '(Mười hai trang ghép lại, mặt sau là một bức tranh: ba thiếu niên cầm kiếm đứng dưới gốc tùng, cười rất tươi.)'],
            ['hero', '(Bên dưới có dòng chữ của sư tổ: "Kiếm phổ dạy được chiêu thức. Không dạy được lòng người. Ba đứa, ta xin lỗi.")'],
            ['keeper', '...Hoá ra thứ ai cũng tranh giành, chỉ là một lời xin lỗi.'],
            { run: () => q.advance() },
          ],
        },
      },
    ],
    reward: (g) => { g.flag('loreComplete'); g.player.attackBonus += 8; g.player.storyHp += 80; g.rpg.points += 3; g.rpg.apply(true); g.toast('<b>Thanh Phong kiếm phổ</b> đã hoàn chỉnh · Công +8 · Khí huyết +80 · Điểm võ học +3', 6); },
  },
];
export const SIDE_BY_ID = Object.fromEntries(SIDE_QUESTS.map((q) => [q.id, q]));

export class SideQuests {
  constructor(g) { this.g = g; this._t = 0; }
  get s() {
    const s = this.g.sys.s;
    s.side ??= { active: {}, done: [], kills: {} };
    return s.side;
  }
  /** API cho kịch bản của một nhiệm vụ cụ thể */
  api(id) {
    const self = this, g = this.g;
    return {
      kills: (group) => self.s.kills[group] || 0,
      advance: () => self.advance(id),
      nearestOf: (group) => g.nearestOf(group),
      spawnN: (group, n, fn) => {
        const alive = g.enemies.filter((e) => !e.dead && e.group === group).length;
        const need = n - (self.s.kills[group] || 0) - alive;
        for (let i = 0; i < need; i++) fn(i);
      },
    };
  }
  available(q) { return !this.s.done.includes(q.id) && !(q.id in this.s.active) && q.unlock(this.g); }
  step(id) { return SIDE_BY_ID[id]?.steps[this.s.active[id]]; }

  /** Thoại khi bấm nói chuyện với NPC: bước đang làm, hoặc lời mời nhận nhiệm vụ */
  talkFor(npcId) {
    for (const id of Object.keys(this.s.active)) {
      const t = this.step(id)?.talk?.[npcId];
      if (t) return t(this.g, this.api(id));
    }
    for (const q of SIDE_QUESTS) {
      if (q.giver !== npcId || !this.available(q)) continue;
      return [...q.offer(this.g), { choice: [
        { text: `Nhận Kỳ duyên: ${q.name}`, then: () => { this.accept(q.id); } },
        { text: 'Để sau', then: () => null },
      ] }];
    }
    return null;
  }
  accept(id) {
    const q = SIDE_BY_ID[id];
    this.s.active[id] = 0;
    this.g.toast(`<span class="han">奇緣</span> Nhận Kỳ duyên <b>${q.name}</b>`, 3);
    this.g.mhud?.log('system', `Nhận Kỳ duyên <b class="cp">${q.name}</b>`);
    this.g.audio?.chime?.();
    this.enter(id);
  }
  enter(id) { this.step(id)?.enter?.(this.g, this.api(id)); }
  advance(id) {
    const q = SIDE_BY_ID[id];
    this.s.active[id]++;
    if (this.s.active[id] >= q.steps.length) return this.complete(id);
    this.g.audio?.chime?.();
    this.enter(id);
  }
  complete(id) {
    const q = SIDE_BY_ID[id];
    delete this.s.active[id];
    this.s.done.push(id);
    q.reward(this.g);
    this.g.rpg.gainExp(250 + this.s.done.length * 80);
    this.g.mhud?.log('system', `Hoàn thành Kỳ duyên <b class="cp">${q.name}</b>`);
    this.g.refreshStoryNpcs?.();
    this.g.save();
  }
  onKill(e) { if (String(e.group || '').startsWith('sq_')) this.s.kills[e.group] = (this.s.kills[e.group] || 0) + 1; }
  /** sau khi đổi chương (địch bị dọn): sinh lại quái nhiệm vụ còn thiếu */
  reenter() { for (const id of Object.keys(this.s.active)) this.enter(id); }
  update(dt) {
    this._t -= dt;
    if (this._t > 0 || this.g.dialogOpen) return;
    this._t = 0.25;
    for (const id of Object.keys(this.s.active)) {
      const st = this.step(id);
      if (st?.done?.(this.g, this.api(id))) this.advance(id);
    }
  }
  /** dòng hiện trên bảng theo dõi */
  tracker() {
    return Object.keys(this.s.active).map((id) => ({ id, name: SIDE_BY_ID[id].name, text: this.step(id)?.objective(this.g, this.api(id)) || '' }));
  }
  marker() {
    for (const id of Object.keys(this.s.active)) {
      try { const m = this.step(id)?.marker?.(this.g, this.api(id)); if (m) return m; } catch {}
    }
    return null;
  }
}
