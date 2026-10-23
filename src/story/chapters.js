import { PLACES } from '../world/layout.js';

/**
 * CỐT TRUYỆN: "Thanh Phong Kiếm Ký"
 *
 * Tiêu Vân, đệ tử duy nhất của Bạch Vân lão nhân Lý Mộ Bạch, xuống núi tìm kẻ đã giết sư phụ
 * bằng "Huyết Ảnh chưởng". Manh mối duy nhất: nửa miếng ngọc bội sư phụ nắm chặt lúc lâm chung.
 * Dấu vết dẫn tới trấn Thanh Phong bên hồ Bích Thủy...
 *
 * Mỗi chương gồm các bước (step). Bước có:
 *   objective(g) -> chuỗi mục tiêu,   marker(g) -> {x,z} hoặc null,
 *   enter(g)    -> khi bắt đầu bước (sinh địch, đổi cảnh...),
 *   talk        -> { npcId: (g) => lines } hội thoại riêng của bước,
 *   interact    -> { id: (g) => void } tương tác đồ vật,
 *   done(g)     -> true khi hoàn thành (kiểm tra mỗi frame).
 * Dòng thoại: ['speaker', 'văn bản'] | { choice: [{ text, then: (g) => lines | void }] } | { run: (g) => void }
 */

export const SPEAKERS = {
  hero: { name: 'Tiêu Vân', han: '蕭雲', look: 'hero' },
  guard: { name: 'Vương lão bá', han: '王老伯', look: 'guard' },
  keeper: { name: 'Lưu Đại Phúc', han: '劉大福', look: 'innkeeper' },
  maiden: { name: 'Lâm Uyển Nhi', han: '林婉兒', look: 'maiden' },
  doba: { name: 'Đồ Bá', han: '屠霸', look: 'boss' },
  hanbang: { name: 'Hàn Băng', han: '寒冰', look: 'hanbang' },
  villain: { name: 'Mộ Dung Huyết', han: '慕容血', look: 'villain' },
  captive: { name: 'Thôn dân bị bắt', han: '村民', look: 'villagerF' },
  villager: { name: 'Thôn dân', han: '村民', look: 'villagerM' },
  hanxue: { name: 'Hàn Tuyết', han: '寒雪', look: 'hanxue' },
  honglian: { name: 'Hồng Liên', han: '紅蓮', look: 'honglian' },
  huyetma: { name: 'Huyết Ma', han: '血魔', look: 'huyetma' },
};

// vùng đất Hồi II (trùng khu săn quái trong bestiary.js)
const ICE = { x: -40, z: -245 }, VALLEY = { x: 150, z: -120 }, FIRE = { x: 215, z: -215 };
const off = (c, dx, dz) => ({ x: c.x + dx, z: c.z + dz });
const ACT2_FLAGS = ['sparedHanxue', 'killedHanxue', 'hanxueAlly', 'savedChild', 'chasedHonglian', 'sparedHonglian', 'jailedHonglian', 'absorbed', 'destroyedOrb', 'tookOrb', 'restoredAll', 'villagersSaved', 'altarDone0', 'altarDone1', 'altarDone2'];

const P = PLACES;
const near = (g, x, z, r = 6) => Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < r;
const at = (place) => (g) => ({ x: place.x, z: place.z });
const npcAt = (id) => (g) => { const n = g.npc(id); return n ? { x: n.pos.x, z: n.pos.z } : null; };
const killed = (g, group, n) => g.killCount(group) >= n;

export const CHAPTERS = [
  // ───────────────────────────── MỞ ĐẦU ─────────────────────────────
  {
    id: 'prologue',
    han: '序章',
    hanSub: '煙雨舊路',
    title: 'Khúc Dạo Đầu',
    subtitle: 'Mưa bụi trên đường cũ',
    time: 'dawn',
    spawn: { x: P.spawn.x, z: P.spawn.z + 20, yaw: Math.PI },
    narration: [
      'Năm Thiên Hựu thứ mười hai. Giang hồ tưởng như yên ả, nhưng máu vẫn chảy ngầm dưới lớp sương mù.',
      'Trên đỉnh Bạch Vân sơn, một đêm mưa gió, kiếm khách Lý Mộ Bạch ngã xuống. Trên ngực ông in một dấu chưởng đỏ thẫm như máu đông.',
      'Huyết Ảnh chưởng. Môn võ công tà đạo đã tuyệt tích từ ba mươi năm trước.',
      'Đệ tử duy nhất của ông, Tiêu Vân, chỉ tìm thấy trong tay sư phụ nửa miếng ngọc bội khắc hai chữ "Thanh Phong".',
      'Ba tháng ròng rã truy tìm, mọi dấu vết đều dẫn về một trấn nhỏ bên hồ Bích Thủy...',
    ],
    steps: [
      {
        objective: () => 'Đi tới cổng trấn Thanh Phong',
        marker: at(P.gate),
        enter: (g) => g.tip('W A S D để di chuyển · Chuột để xoay góc nhìn · Shift để chạy nhanh'),
        done: (g) => near(g, P.gate.x, P.gate.z, 10),
      },
      {
        objective: () => 'Nói chuyện với lão gác cổng',
        marker: npcAt('guard'),
        enter: (g) => g.tip('Lại gần người khác và bấm E để nói chuyện'),
        talk: {
          guard: () => [
            ['guard', 'Khụ khụ... Người lạ? Trời còn chưa sáng hẳn mà công tử đã tới, chắc đi đường xa lắm.'],
            ['hero', 'Lão bá, tại hạ là Tiêu Vân, từ Bạch Vân sơn tới. Muốn hỏi thăm một chuyện.'],
            ['hero', 'Lão bá có từng thấy miếng ngọc bội nào giống thế này không?'],
            ['guard', '(nheo mắt) Ngọc bích... chữ "Thanh Phong"... Lão già rồi, mắt kém lắm. Nhưng cái tên thì quen.'],
            ['guard', 'Trấn này đặt tên theo một kiếm phái đã tan rã từ lâu. Thanh Phong kiếm phái. Năm xưa có hai vị sư huynh đệ nổi danh nhất...'],
            ['guard', 'Thôi, chuyện cũ nhắc làm gì. Công tử muốn hỏi chuyện giang hồ thì vào Duyệt Lai khách điếm, Lưu chưởng quỹ biết hết mọi tin tức trong vùng.'],
            ['guard', 'À, cẩn thận. Dạo này bọn sơn tặc Hắc Phong trại hay xuống trấn quấy nhiễu lắm.'],
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: () => 'Tới Duyệt Lai khách điếm',
        marker: at({ x: P.inn.x, z: P.inn.z + 8 }),
        done: (g) => near(g, P.inn.x, P.inn.z + 4, 9),
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG NHẤT ─────────────────────────────
  {
    id: 'c1',
    han: '第一章',
    hanSub: '悅來客棧',
    title: 'Chương Nhất',
    subtitle: 'Duyệt Lai khách điếm',
    time: 'morning',
    spawn: { x: P.inn.x, z: P.inn.z + 14, yaw: Math.PI },
    steps: [
      {
        objective: () => 'Nói chuyện với Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        talk: {
          keeper: () => [
            ['keeper', 'Khách quan, mời vào mời vào! Trà nóng, rượu ngon, phòng sạch, bổn điếm có đủ cả!'],
            ['hero', 'Một bình trà. Và một câu hỏi.'],
            ['keeper', 'Hà hà, trà thì có ngay. Còn câu hỏi... tùy khách quan hỏi gì.'],
            ['hero', 'Huyết Ảnh chưởng. Chưởng quỹ có nghe ai nhắc tới bốn chữ này chưa?'],
            ['keeper', '(tay run, làm đổ chén trà) Kh-khách quan đừng đùa. Môn võ công ấy tuyệt tích ba mươi năm rồi...'],
            ['keeper', 'Lão phu chỉ là kẻ buôn bán, không biết gì về chuyện chém giết đâu!'],
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: (g) => `Đánh đuổi sơn tặc quấy phá quảng trường (${g.killCount('square')}/3)`,
        marker: at(P.square),
        enter: (g) => {
          g.toast('Có tiếng la hét ngoài quảng trường!');
          g.say('villager', 'Cứu với! Sơn tặc! Bọn Hắc Phong trại lại xuống cướp rồi!');
          g.spawn('bandit', P.square.x - 4, P.square.z + 2, { group: 'square', aggro: 60, weapon: 'axe' });
          g.spawn('bandit', P.square.x + 3, P.square.z - 3, { group: 'square', aggro: 60, weapon: 'machete' });
          g.spawn('bandit2', P.square.x + 6, P.square.z + 5, { group: 'square', aggro: 60, weapon: 'saber' });
          g.tip('Chuột trái: chém, bấm liên tiếp ra liên chiêu 3 đòn · Chuột phải: đỡ đòn · Ctrl: lộn né', 8);
        },
        done: (g) => killed(g, 'square', 3),
      },
      {
        objective: () => 'Quay lại gặp Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        enter: (g) => g.tip('R: uống Kim sang dược để hồi khí huyết', 5),
        talk: {
          keeper: () => [
            ['keeper', 'Thiếu hiệp! Ơn cứu mạng của thiếu hiệp, cả trấn Thanh Phong xin ghi lòng!'],
            ['keeper', 'Bọn Hắc Phong trại do tên Đồ Bá cầm đầu, sào huyệt ở khu rừng phía bắc. Chúng cướp bóc đã ba năm nay mà quan phủ chẳng làm gì.'],
            ['hero', 'Ba năm... cũng là lúc nào?'],
            ['keeper', 'Ơ... cũng là năm Lâm đại hiệp bên hồ qua đời. Lâm Thiên Hải, kiếm khách cuối cùng của Thanh Phong kiếm phái.'],
            ['keeper', 'Người ta đồn ông ấy chết vì... (hạ giọng) một chưởng đỏ như máu.'],
            ['hero', '...!'],
            ['keeper', 'Con gái ông, Lâm Uyển Nhi, ngày nào cũng ngồi ở Vọng Nguyệt đình bên hồ. Cô ấy cũng đeo một nửa miếng ngọc bội giống của thiếu hiệp đấy.'],
            ['keeper', 'Đây, mấy bình Kim sang dược, lão phu biếu thiếu hiệp phòng thân.'],
            { run: (g) => { g.addPotions(3); g.toast('Nhận 3 bình <b>Kim sang dược</b>'); g.finishChapter(); } },
          ],
        },
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG NHỊ ─────────────────────────────
  {
    id: 'c2',
    han: '第二章',
    hanSub: '望月亭',
    title: 'Chương Nhị',
    subtitle: 'Vọng Nguyệt đình',
    time: 'morning',
    spawn: { x: P.square.x - 20, z: P.square.z + 6, yaw: -Math.PI / 2 },
    steps: [
      {
        objective: () => 'Tìm Lâm Uyển Nhi ở Vọng Nguyệt đình bên hồ',
        marker: npcAt('maiden'),
        talk: {
          maiden: () => [
            ['maiden', '...Công tử đứng sau lưng tiểu nữ đã lâu. Có chuyện gì sao?'],
            ['hero', 'Cô nương thứ lỗi. Tại hạ thấy miếng ngọc bội cô nương đeo...'],
            ['hero', '(lấy ra nửa miếng ngọc) ...dường như là nửa còn lại của miếng này.'],
            ['maiden', '(sững người) Cái này... sao công tử lại có?! Phụ thân nói nửa kia nằm trong tay sư bá, Bạch Vân lão nhân!'],
            ['hero', 'Lý Mộ Bạch là sư phụ của tại hạ. Ba tháng trước người bị giết. Bằng Huyết Ảnh chưởng.'],
            ['maiden', '(mắt đỏ hoe) Giống hệt phụ thân... Ba năm trước, người cũng chết với dấu chưởng đỏ trên ngực.'],
            ['maiden', 'Trước khi mất, phụ thân giấu thanh Bích Thủy kiếm cùng một bức thư trong chiếc rương gỗ ở rừng trúc tây bắc. Người dặn chỉ khi nào gặp được truyền nhân của sư bá mới được mở ra.'],
            ['maiden', 'Nhưng giờ trong rừng có thám báo của Hắc Phong trại. Tiểu nữ không vào được.'],
            {
              choice: [
                { text: '"Để tại hạ đi. Cô nương chờ ở đây."', then: () => [['maiden', 'Đa tạ công tử. Xin hãy cẩn thận.']] },
                { text: '"Cô nương có biết võ công không? Đi cùng sẽ nguy hiểm."', then: (g) => { g.flag('askedMaidenFight'); return [['maiden', 'Tiểu nữ có học chút khinh công của phụ thân, nhưng kiếm pháp thì... Thôi, xin nhờ cả vào công tử.']]; } },
              ],
            },
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: () => 'Tới rừng trúc phía tây bắc',
        marker: at(P.bamboo),
        enter: (g) => {
          g.spawn('bandit', P.chest.x + 6, P.chest.z + 5, { group: 'scouts', weapon: 'saber' });
          g.spawn('bandit2', P.chest.x - 5, P.chest.z + 8, { group: 'scouts', weapon: 'axe' });
          g.spawn('bandit', P.bamboo.x + 18, P.bamboo.z + 16, { group: 'scouts', weapon: 'machete', patrol: [[P.bamboo.x + 25, P.bamboo.z + 22], [P.bamboo.x + 5, P.bamboo.z + 30]] });
          g.tip('Q: Lướt Kiếm (15 nội lực) · F: Chưởng Phong (20 nội lực) · Space 2 lần: khinh công', 8);
        },
        done: (g) => near(g, P.bamboo.x, P.bamboo.z, P.bamboo.r),
      },
      {
        objective: (g) => `Hạ thám báo Hắc Phong trại (${g.killCount('scouts')}/3)`,
        marker: (g) => g.nearestOf('scouts') || at(P.chest)(g),
        done: (g) => killed(g, 'scouts', 3),
      },
      {
        objective: () => 'Mở rương gỗ giữa rừng trúc',
        marker: at(P.chest),
        interact: {
          chest: (g) => g.openChest(() => g.dialog([
            ['hero', '(Trong rương là một thanh kiếm trong như nước hồ, kèm một phong thư đã ố vàng.)'],
            ['hero', '"Sư huynh Mộ Bạch. Nếu thư này tới tay huynh, đệ đã không còn trên đời."'],
            ['hero', '"Kẻ luyện Huyết Ảnh chưởng đã trở lại. Hắn muốn Thanh Phong kiếm phổ mà sư phụ để lại ở Kiếm Mộ."'],
            ['hero', '"Hai nửa ngọc bội hợp lại chính là chìa khoá. Tuyệt đối đừng để hắn có được..."'],
            ['hero', '(Thư dừng ở đó, vết mực loang như bị nước mắt, hay máu, làm nhoè.)'],
            { run: (g) => { g.toast('Nhận <b>Bích Thủy kiếm</b> và <b>thư của Lâm Thiên Hải</b><br><span class="sm">Mở Hành trang (I) để trang bị</span>'); g.next(); } },
          ])),
        },
      },
      {
        objective: () => 'Mang Bích Thủy kiếm về cho Lâm Uyển Nhi',
        marker: npcAt('maiden'),
        talk: {
          maiden: () => [
            ['maiden', 'Bích Thủy kiếm... đúng là kiếm của phụ thân rồi!'],
            ['hero', 'Còn bức thư này. Cô nương nên đọc.'],
            ['maiden', '(đọc xong, run rẩy) Kiếm Mộ... là nơi chôn kiếm của các đời chưởng môn Thanh Phong kiếm phái, trên núi phía tây.'],
            ['maiden', 'Công tử, kẻ thù của chúng ta là một. Tiểu nữ không giỏi kiếm, nhưng có thể truyền lại cho công tử khinh công gia truyền: Lăng Ba Vi Bộ.'],
            { run: (g) => { g.unlock('waterRun'); g.player.storyMp += 30; g.rpg.apply(true); g.toast('Lĩnh ngộ <b>Lăng Ba Vi Bộ</b><br><span class="sm">Giữ Shift để chạy trên mặt nước · Nội lực +30</span>', 6); } },
            ['maiden', 'Bọn Hắc Phong trại không tự nhiên mà xuất hiện đúng năm phụ thân mất. Có kẻ đứng sau chúng.'],
            ['hero', 'Vậy thì tại hạ sẽ tới hỏi thẳng tên Đồ Bá.'],
            { run: (g) => g.finishChapter() },
          ],
        },
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG TAM ─────────────────────────────
  {
    id: 'c3',
    han: '第三章',
    hanSub: '黑風寨',
    title: 'Chương Tam',
    subtitle: 'Hắc Phong trại',
    time: 'noon',
    spawn: { x: 92, z: -40, yaw: Math.PI },
    steps: [
      {
        objective: () => 'Tiến về Hắc Phong trại ở phía bắc',
        marker: at({ x: P.camp.x, z: P.camp.z + 45 }),
        enter: (g) => {
          g.spawn('bandit', 90, -70, { group: 'road', weapon: 'machete', patrol: [[92, -55], [88, -95]] });
          g.spawn('bandit2', 76, -118, { group: 'road', weapon: 'axe' });
        },
        done: (g) => near(g, P.camp.x, P.camp.z + 40, 16),
      },
      {
        objective: (g) => `Đánh tan sơn tặc trong trại (${g.killCount('camp')}/8)`,
        marker: (g) => g.nearestOf('camp') || at(P.camp)(g),
        enter: (g) => {
          const C = P.camp;
          const list = [[-4, 4, 'axe'], [5, 3, 'machete'], [-15, -8, 'saber'], [16, -10, 'axe'], [-4, 34, 'saber'], [4, 34, 'machete'], [-12, 16, 'axe'], [12, 18, 'saber']];
          list.forEach(([dx, dz, w], i) => g.spawn(i % 3 === 2 ? 'bandit2' : 'bandit', C.x + dx, C.z + dz, { group: 'camp', weapon: w }));
          g.toast('Hắc Phong trại');
        },
        done: (g) => killed(g, 'camp', 8),
      },
      {
        objective: (g) => `Giải cứu thôn dân bị giam (${g.count('freed')}/2)`,
        marker: (g) => g.nextCage(),
        enter: (g) => g.showCaptives(true),
        interact: { cage: (g, id) => g.freeCaptive(id) },
        done: (g) => g.count('freed') >= 2,
      },
      {
        objective: () => 'Hạ trại chủ Đồ Bá',
        marker: (g) => g.nearestOf('doba'),
        enter: (g) => {
          g.spawn('boss', g.spots.bossHall.x, g.spots.bossHall.z, { group: 'doba', boss: true, name: 'Hắc Phong trại chủ · Đồ Bá', hp: 520, dmg: 18, aggro: 30 });
          g.say('doba', 'Thằng nhãi nào dám phá trại của Đồ Bá ta?! Lên đây chịu chết!');
        },
        done: (g) => killed(g, 'doba', 1),
      },
      {
        objective: () => 'Tra hỏi Đồ Bá',
        marker: (g) => g.dobaSpot,
        enter: (g) => g.dialog([
          ['doba', '(quỳ gối, máu trào khoé miệng) Khục... được lắm... Đồ Bá ta tung hoành ba năm, hôm nay thua dưới tay một thằng nhãi...'],
          ['hero', 'Ai đứng sau ngươi? Kẻ nào luyện Huyết Ảnh chưởng?'],
          ['doba', 'Ha... ha... Ngươi nghĩ ta biết mặt hắn sao? Chỉ có thư... và vàng. Rất nhiều vàng.'],
          ['doba', 'Hắn trả tiền để bọn ta giữ chân dân trấn, canh chừng con nhỏ họ Lâm... và tìm nửa miếng ngọc bội còn lại.'],
          ['doba', 'Thư ở trong ngực ta. Đọc đi, rồi ngươi sẽ biết... trấn Thanh Phong này chẳng có ai sạch sẽ cả.'],
          {
            choice: [
              { text: 'Tha mạng: "Cút khỏi Thanh Phong, đừng bao giờ quay lại."', then: (g) => { g.flag('sparedDoba'); g.karma(1); return [['doba', '...Ngươi tha cho ta? Hừ, giang hồ còn loại người ngốc như ngươi sao. Được... món nợ này, Đồ Bá ta nhớ.']]; } },
              { text: 'Kết liễu: "Ba năm máu của dân lành, ngươi trả bằng mạng."', then: (g) => { g.flag('killedDoba'); g.karma(-1); return [['hero', '(Một nhát kiếm. Gió thổi qua trại, lạnh như đêm sư phụ mất.)']]; } },
            ],
          },
          ['hero', '(Phong thư đóng dấu son đỏ. Hình con dấu là ba chữ: "Duyệt Lai điếm".)'],
          ['hero', '"...Đêm rằm, đưa con bé họ Lâm tới Vọng Nguyệt đình. Nửa ngọc bội của nó là của ta. Hàn Băng sẽ tới nhận người."'],
          ['hero', 'Lưu chưởng quỹ...!'],
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG TỨ ─────────────────────────────
  {
    id: 'c4',
    han: '第四章',
    hanSub: '血月之夜',
    title: 'Chương Tứ',
    subtitle: 'Đêm trăng máu',
    time: 'night',
    spawn: { x: P.inn.x, z: P.inn.z + 20, yaw: Math.PI },
    narration: [
      'Khi Tiêu Vân quay về, trăng rằm đã lên cao, đỏ quạch như nhuốm máu.',
      'Trấn Thanh Phong im ắng đến lạ. Đèn lồng Duyệt Lai khách điếm vẫn sáng...',
    ],
    steps: [
      {
        objective: () => 'Đối chất Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        talk: {
          keeper: () => [
            ['keeper', 'Thiếu hiệp! Thiếu hiệp về rồi! Hắc Phong trại thế nào...'],
            ['hero', '(đặt phong thư lên bàn) Con dấu này. Giải thích đi.'],
            ['keeper', '(mặt cắt không còn giọt máu) ...'],
            {
              choice: [
                { text: 'Rút kiếm: "Nói thật, hoặc đầu lìa khỏi cổ."', then: (g) => { g.flag('threatKeeper'); g.karma(-1); return [['keeper', 'Đừng! Đừng! Lão phu nói! Lão phu nói hết!']]; } },
                { text: 'Bình tĩnh: "Lão không phải người xấu. Ai ép lão?"', then: (g) => { g.flag('kindKeeper'); g.karma(1); return [['keeper', '(nước mắt chảy dài) Thiếu hiệp... ba năm nay chưa ai hỏi lão câu đó...']]; } },
              ],
            },
            ['keeper', 'Ba năm trước, Huyết Ảnh Môn bắt con trai lão. Chúng bắt lão làm tai mắt, chuyển thư cho Hắc Phong trại, báo tin về Lâm gia...'],
            ['keeper', 'Đêm Lâm đại hiệp mất, chính lão đã... đã nói cho chúng biết ông ấy ở một mình bên hồ.'],
            ['keeper', 'Kẻ cầm đầu tên là Mộ Dung Huyết. Đêm nay hắn sai Hàn Băng, sát thủ số một của hắn, tới Vọng Nguyệt đình bắt Uyển Nhi!'],
            ['hero', 'Uyển Nhi!'],
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: () => 'Chạy tới Vọng Nguyệt đình, bảo vệ Uyển Nhi!',
        marker: npcAt('maiden'),
        enter: (g) => {
          g.toast('Nhanh lên! Huyết Ảnh sát thủ đã tới hồ Bích Thủy');
          g.tip('Giữ Shift để chạy trên mặt nước (Lăng Ba Vi Bộ) và đi tắt qua hồ', 6);
        },
        done: (g) => near(g, P.pavilion.x, P.pavilion.z, 26),
      },
      {
        objective: (g) => `Hạ Huyết Ảnh sát thủ (${g.killCount('assassins')}/5)`,
        marker: (g) => g.nearestOf('assassins'),
        enter: (g) => {
          const pv = P.pavilion;
          [[8, 6], [-6, 12], [10, -8], [-4, -12], [16, 2]].forEach(([dx, dz]) => g.spawn('assassin', pv.x + dx, pv.z + dz, { group: 'assassins', weapon: 'sword', aggro: 60 }));
          g.say('maiden', 'Công tử! Cẩn thận, chúng đông lắm!');
        },
        done: (g) => killed(g, 'assassins', 5),
      },
      {
        objective: () => 'Đánh bại Tả sứ Hàn Băng',
        marker: (g) => g.nearestOf('hanbang'),
        enter: (g) => {
          g.spawn('hanbang', P.pavilion.x + 14, P.pavilion.z - 6, { group: 'hanbang', boss: true, name: 'Huyết Ảnh Tả sứ · Hàn Băng', hp: 620, dmg: 17, aggro: 80, speed: 6.2, weapon: 'sword' });
          g.say('hanbang', 'Truyền nhân của Lý Mộ Bạch? Hay lắm. Môn chủ sẽ vui khi nhận được cả hai nửa ngọc bội.');
        },
        done: (g) => killed(g, 'hanbang', 1),
      },
      {
        objective: () => 'Nói chuyện với Uyển Nhi',
        marker: npcAt('maiden'),
        talk: {
          maiden: (g) => [
            ['maiden', 'Công tử... công tử không sao chứ?'],
            ['hero', 'Không sao. Còn cô nương?'],
            ['maiden', g.flags.askedMaidenFight ? 'Tiểu nữ... lần đầu tiên thấy người ta chém giết. Công tử hỏi tiểu nữ có biết võ không, giờ tiểu nữ mới hiểu vì sao.' : 'Tiểu nữ không sao. Chỉ là... lần đầu thấy cảnh này.'],
            ['maiden', 'Lúc nãy Hàn Băng nói "cả hai nửa ngọc bội". Công tử, chúng ta thử ghép lại xem.'],
            ['hero', '(Hai nửa ngọc bội vừa khớp, ánh trăng xuyên qua, in lên mặt đá một tấm bản đồ: con đường từ rừng trúc lên núi phía tây, tận cùng là chữ "Mộ".)'],
            ['maiden', 'Kiếm Mộ... Thanh Phong kiếm phổ nằm ở đó. Mộ Dung Huyết chắc chắn sẽ tới đó trước bình minh.'],
            ['hero', 'Vậy thì tại hạ sẽ đợi hắn ở đó.'],
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: () => 'Ghé khách điếm chuẩn bị trước khi lên núi',
        marker: npcAt('keeper'),
        talk: {
          keeper: (g) => [
            ['keeper', g.flags.kindKeeper ? 'Thiếu hiệp... lão phu không biết lấy gì chuộc tội. Xin nhận lấy những thứ này.' : 'Lão phu... lão phu biết thiếu hiệp không tha thứ. Nhưng xin nhận những thứ này.'],
            ['keeper', 'Đây là quyển thượng Thanh Phong kiếm phổ, Lâm đại hiệp gửi lão giữ hộ năm xưa. Và đây, Kim sang dược, bao nhiêu lão có.'],
            { run: (g) => { g.player.attackBonus += 8; g.player.storyHp += 40; g.rpg.apply(true); g.addPotions(4); g.toast('Lĩnh ngộ <b>Thanh Phong kiếm pháp · quyển thượng</b><br><span class="sm">Công +8 · Khí huyết +40 · Kim sang dược +4</span>', 6); } },
            ['keeper', 'Nếu... nếu thiếu hiệp gặp con trai lão trên đó, nó tên Lưu Tiểu Hổ...'],
            ['hero', 'Tại hạ sẽ nhớ.'],
            { run: (g) => g.finishChapter() },
          ],
        },
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG NGŨ ─────────────────────────────
  {
    id: 'c5',
    han: '第五章',
    hanSub: '劍冢',
    title: 'Chương Ngũ',
    subtitle: 'Kiếm Mộ',
    time: 'dawn2',
    spawn: { x: P.bamboo.x - 10, z: P.bamboo.z - 30, yaw: Math.PI },
    narration: [
      'Trước bình minh. Sương núi dày đặc như sữa.',
      'Con đường đá cũ dẫn lên Kiếm Mộ đã bị cỏ dại phủ kín. Hai bên đường, những thanh kiếm gỉ sét cắm nghiêng ngả, như những người lính gác chưa bao giờ rời vị trí.',
    ],
    steps: [
      {
        objective: () => 'Leo lên Kiếm Mộ',
        marker: at(P.tomb),
        enter: (g) => g.tip('Space 2 lần để khinh công, giữ Space để lượn', 5),
        done: (g) => near(g, P.tomb.x, P.tomb.z, 30),
      },
      {
        objective: (g) => `Hạ hộ vệ Huyết Ảnh Môn (${g.killCount('guards')}/5)`,
        marker: (g) => g.nearestOf('guards'),
        enter: (g) => {
          const T = P.tomb;
          [[-8, 10], [8, 10], [-12, -4], [12, -4], [0, 16]].forEach(([dx, dz]) => g.spawn('assassin', T.x + dx, T.z + dz, { group: 'guards', weapon: 'sword', hp: 110, dmg: 14 }));
        },
        done: (g) => killed(g, 'guards', 5),
      },
      {
        objective: () => 'Đối mặt Mộ Dung Huyết',
        marker: (g) => g.nearestOf('villain') || at(P.tomb)(g),
        enter: (g) => g.dialog([
          ['villain', 'Vỗ tay. Vỗ tay. Truyền nhân của Lý Mộ Bạch, quả nhiên không làm ta thất vọng.'],
          ['hero', 'Mộ Dung Huyết. Ngươi giết sư phụ ta, giết Lâm đại hiệp, chỉ vì một quyển kiếm phổ?'],
          ['villain', '"Chỉ vì"? Ha ha ha! Ngươi có biết ta là ai không? Ta từng là đệ tử thứ ba của Thanh Phong kiếm phái!'],
          ['villain', 'Sư phụ truyền kiếm phổ cho Lý Mộ Bạch và Lâm Thiên Hải, còn ta, kẻ có thiên phú nhất, bị đuổi khỏi môn phái vì "tâm thuật bất chính"!'],
          ['villain', 'Ba mươi năm ta luyện Huyết Ảnh chưởng trong bóng tối. Hôm nay, ta lấy lại thứ thuộc về ta.'],
          ['hero', 'Thứ thuộc về ngươi chỉ có một: món nợ máu.'],
          { run: (g) => g.spawn('villain', P.tomb.x, P.tomb.z - 8, { group: 'villain', boss: true, name: 'Huyết Ảnh Môn chủ · Mộ Dung Huyết', hp: 1100, dmg: 22, aggro: 100, speed: 6, weapon: 'sword', caster: true }) },
        ]),
        done: (g) => killed(g, 'villain', 1),
      },
      {
        objective: () => 'Mở Kiếm Mộ',
        marker: at(P.tomb),
        enter: (g) => g.dialog([
          ['villain', '(gục xuống bên tấm bia đá) Khục... Thanh Phong kiếm pháp... thì ra... không cần kiếm phổ...'],
          ['villain', 'Lý Mộ Bạch... huynh lại thắng ta... lần nữa...'],
          ['hero', '(Hai nửa ngọc bội đặt vào khe trên tấm bia. Đá nứt ra. Bên trong không có kiếm phổ, chỉ có tám chữ khắc sâu:)'],
          ['hero', '"Kiếm tại nhân tâm. Tâm chính, kiếm chính."'],
          ['hero', '(Phía sau bia, trong một hang đá nhỏ, một thiếu niên bị trói. Trên áo thêu chữ "Lưu".)'],
          ['hero', 'Ngươi là Lưu Tiểu Hổ? Đi thôi. Cha ngươi đang đợi.'],
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  // ───────────────────────────── VĨ THANH ─────────────────────────────
  {
    id: 'epilogue',
    han: '尾聲',
    hanSub: '清風',
    title: 'Vĩ Thanh',
    subtitle: 'Gió Thanh Phong',
    time: 'sunrise',
    spawn: { x: P.pavilion.x + 6, z: P.pavilion.z + 2, yaw: -Math.PI / 2 },
    narration: (g) => [
      'Mặt trời lên trên hồ Bích Thủy. Lần đầu tiên sau ba năm, trấn Thanh Phong thức dậy không có tiếng la hét.',
      'Lưu Đại Phúc ôm con trai khóc như một đứa trẻ. Duyệt Lai khách điếm treo biển nghỉ ba ngày, mở tiệc mời cả trấn.',
      g.flags.sparedDoba ? 'Có người kể rằng ở một làng chài xa xôi phía nam, có gã to con mặt sẹo tên Đồ Bá, nay chỉ chuyên đi đánh cá, chưa từng cướp của ai.' : 'Hắc Phong trại bị san phẳng. Trên nền cũ, dân trấn trồng một rừng đào.',
      'Còn Tiêu Vân và Lâm Uyển Nhi, người ta thấy họ ngồi ở Vọng Nguyệt đình mỗi chiều, pha trà, luyện kiếm, và nhìn gió thổi trên mặt hồ.',
      'Giang hồ vẫn còn đó. Nhưng ít nhất ở nơi này, gió đã yên.',
    ],
    steps: [
      {
        objective: () => 'Tự do ngao du giang hồ',
        marker: () => null,
        enter: (g) => { g.toast('<b>HOÀN</b><br><span class="sm">Cảm ơn đã chơi Thiên Kiếm Giang Hồ: Thanh Phong Kiếm Ký</span>', 8); g.save(); },
        talk: {
          maiden: () => [
            ['maiden', 'Trà vừa pha xong, công tử. Hôm nay gió trên hồ thật dịu.'],
            ['hero', 'Ừ. Thật dịu.'],
            ['maiden', '...Nhưng sáng nay có người đưa tới phong thư này. Mực đỏ, lạnh như băng.'],
            ['hero', '(Trên giấy chỉ có một dòng: "Kiếm Mộ trống không. Huyết chưa cạn.")'],
            {
              choice: [
                { text: 'Lên đường tới Hàn Băng Cốc (bắt đầu Hồi II)', then: (g) => { g.finishChapter(); } },
                { text: 'Để sau, hôm nay chỉ muốn uống trà', then: () => [['maiden', 'Vậy công tử cứ nghỉ ngơi. Khi nào sẵn sàng, tiểu nữ đợi ở đây.']] },
              ],
            },
          ],
          keeper: () => [['keeper', 'Đại hiệp! Hôm nay bổn điếm mời, ăn bao nhiêu cũng được! Tiểu Hổ, mang rượu ra đây!']],
        },
      },
    ],
  },
  // ═════════════════════════════ HỒI II: HUYẾT ẢNH DƯ ÂM ═════════════════════════════
  // Đạo tâm (g.karmaVal): dương = Chính, âm = Tà. Các lựa chọn ở đây quyết định ai đứng cạnh Tiêu Vân ở trận cuối
  // và kết cục của Vĩ Thanh Hồi II.

  // ───────────────────────────── CHƯƠNG LỤC ─────────────────────────────
  {
    id: 'c6',
    han: '第六章',
    hanSub: '寒冰谷',
    title: 'Chương Lục',
    subtitle: 'Hàn Băng Cốc',
    time: 'morning',
    bg: 'ice',
    spawn: { x: ICE.x, z: ICE.z + 58, yaw: Math.PI },
    narration: (g) => [
      'Ba tháng sau trận Kiếm Mộ. Thanh Phong yên bình đến mức người ta quên cả sợ hãi.',
      g.flags.sparedDoba
        ? 'Rồi một sáng, gã đánh cá mặt sẹo Đồ Bá lặn lội lên trấn, quỳ trước Vọng Nguyệt đình: "Ân nhân, ta trả nợ đây. Xác Mộ Dung Huyết bị khiêng về phía nam, tới Hàn Băng Cốc."'
        : 'Rồi một sáng, người canh mộ chạy xuống trấn, mặt cắt không còn giọt máu: "Xác Mộ Dung Huyết... biến mất rồi! Dấu chân đi về phía nam."',
      'Trên nền tuyết dẫn vào Hàn Băng Cốc, có những dấu chân, và một vệt máu đông lại thành băng.',
      'Lần này, Lâm Uyển Nhi không chịu ở lại.',
    ],
    steps: [
      {
        objective: () => 'Theo vệt máu vào Hàn Băng Cốc',
        marker: () => ICE,
        enter: (g) => {
          // chơi lại Hồi II: xoá lựa chọn cũ, trả đạo tâm về lúc mới vào Hồi II (không cày điểm Chính/Tà)
          if (g.flags.karmaAct2Base != null) g.flags.karma = g.flags.karmaAct2Base;
          else g.flags.karmaAct2Base = g.flags.karma || 0;
          for (const k of ACT2_FLAGS) delete g.flags[k];
          g.storyAlly('maiden', 'maiden', 'Lâm Uyển Nhi', 'dagger', { hp: 520, atk: 22, color: 0xffb0d0 });
          g.say('maiden', 'Công tử, máu này lạnh như băng... là nội công của Hàn Băng. Nhưng nàng ta đã chết rồi mà?');
          g.tip('Uyển Nhi đồng hành cùng ngươi trong Hồi II · Quái băng có thể làm ngươi Băng giá (chậm 45%)', 7);
        },
        done: (g) => near(g, ICE.x, ICE.z, 30),
      },
      {
        objective: (g) => `Dẹp yêu quái băng tuyết chặn đường (${g.killCount('ice')}/6)`,
        marker: (g) => g.nearestOf('ice') || ICE,
        enter: (g) => {
          [['tuyetnhan', 10, 8], ['tuyetnhan', -12, 6], ['bangling', 6, -10], ['bangling', -8, -12], ['uhon', 16, -2], ['uhon', -16, -4]]
            .forEach(([id, dx, dz]) => g.spawnMonster(id, ICE.x + dx, ICE.z + dz, { group: 'ice', aggro: 30 }));
        },
        done: (g) => killed(g, 'ice', 6),
      },
      {
        objective: () => 'Đánh bại người con gái áo trắng',
        marker: (g) => g.nearestOf('hanxue') || ICE,
        enter: (g) => g.dialog([
          ['hanxue', 'Đứng lại. Ngươi là Tiêu Vân, kẻ đã giết tỷ tỷ ta bên hồ Bích Thủy?'],
          ['hero', 'Hàn Băng là tỷ tỷ của cô nương?'],
          ['hanxue', 'Ta là Hàn Tuyết. Tỷ tỷ bán mạng cho Huyết Ảnh Môn mười năm, chỉ để đổi lấy thuốc giải hàn độc cho ta.'],
          ['hanxue', 'Giờ tỷ ấy chết, Huyết Ảnh Môn cũng chẳng thèm nhặt xác. Chúng chỉ lo khiêng cái xác của Mộ Dung Huyết đi qua đây.'],
          ['maiden', 'Cô nương, Tiêu công tử không phải kẻ...'],
          ['hanxue', 'Câm miệng! Nợ máu phải trả bằng máu. Rút kiếm đi!'],
          { run: (g) => g.spawn('hanxue', ICE.x, ICE.z - 6, { group: 'hanxue', boss: true, name: 'Hàn Băng Cốc chủ · Hàn Tuyết', hp: 1500, dmg: 24, aggro: 80, speed: 6.6, weapon: 'sword' }) },
        ]),
        done: (g) => killed(g, 'hanxue', 1),
      },
      {
        objective: () => 'Quyết định số phận Hàn Tuyết',
        marker: () => ICE,
        enter: (g) => g.dialog([
          ['hanxue', '(quỳ trên tuyết, kiếm gãy làm đôi) ...Giết đi. Tỷ tỷ chờ ta đã lâu.'],
          ['maiden', 'Công tử...'],
          {
            choice: [
              { text: 'Tha: "Tỷ tỷ cô chọn con đường đó. Cô thì vẫn còn chọn được."', then: (g) => { g.flag('sparedHanxue'); g.karma(2); return [
                ['hanxue', '...Ngươi ngốc thật. Cũng ngốc như tỷ tỷ ta.'],
                ['hanxue', 'Chúng khiêng xác hắn tới Yêu Ma Cốc. Hữu sứ Hồng Liên đang dựng tế đàn, bắt dân làng làm "Huyết Hồn Tế" để gọi hắn sống lại.'],
                ['hanxue', 'Cầm lấy Băng Tâm Ngọc. Đeo nó, hàn khí không xâm được ngươi.'],
                { run: (g) => { g.rpg.add('gem_def_3', 1); g.rpg.add('gem_hp_3', 1); g.toast('Nhận <b>Tử ngọc cấp 3</b> và <b>Lục ngọc cấp 3</b>', 3); } },
              ]; } },
              { text: 'Kết liễu: "Kẻ cầm kiếm với ta, không để lại hậu hoạ."', then: (g) => { g.flag('killedHanxue'); g.karma(-2); return [
                ['hero', '(Kiếm lướt qua. Tuyết trắng nhuộm đỏ, rồi lại phủ trắng như chưa từng có gì.)'],
                ['maiden', '(lùi lại một bước, không nói gì)'],
                ['hero', '(Trong ngực áo nàng có một tấm bản đồ đánh dấu Yêu Ma Cốc, và thanh Hàn Tuyết kiếm còn lạnh buốt.)'],
                { run: (g) => { g.player.attackBonus += 6; g.rpg.apply(true); g.toast('Thu <b>Hàn Tuyết kiếm</b> · Công +6', 3); } },
              ]; } },
              ...(g.karmaVal >= 1 ? [{ text: '(Chính khí ≥ 1) "Cùng ta đòi nợ kẻ thật sự hại tỷ tỷ cô."', then: (g) => { g.flag('sparedHanxue'); g.flag('hanxueAlly'); g.karma(3); return [
                ['hanxue', '(ngẩng lên, nhìn rất lâu) ...Huyết Ảnh Môn. Đúng vậy, chúng mới là kẻ đáng chết.'],
                ['hanxue', 'Được. Kiếm của Hàn Tuyết, từ nay theo ngươi tới Hỏa Diệm Sơn.'],
                ['maiden', '(mỉm cười) Thêm một người, đường xa bớt lạnh.'],
                { run: (g) => { g.rpg.add('gem_def_3', 1); g.toast('<b>Hàn Tuyết</b> sẽ đồng hành ở trận cuối · Nhận <b>Tử ngọc cấp 3</b>', 4); } },
              ]; } }] : []),
            ],
          },
          ['maiden', 'Yêu Ma Cốc... nghe nói chim bay qua cũng không dám hót.'],
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG THẤT ─────────────────────────────
  {
    id: 'c7',
    han: '第七章',
    hanSub: '妖魔谷',
    title: 'Chương Thất',
    subtitle: 'Yêu Ma Cốc',
    time: 'night',
    bg: 'valley',
    spawn: { x: VALLEY.x, z: VALLEY.z + 62, yaw: Math.PI },
    narration: [
      'Yêu Ma Cốc về đêm. Sương tím bò sát mặt đất như những ngón tay.',
      'Trên ba ngọn đồi quanh thung lũng, ba tế đàn đang cháy lửa đỏ. Mỗi tế đàn trói ba thôn dân.',
      'Khi cả ba ngọn lửa hợp làm một, "Huyết Hồn Tế" sẽ hoàn thành.',
    ],
    steps: [
      {
        objective: () => 'Lẻn vào Yêu Ma Cốc',
        marker: () => VALLEY,
        enter: (g) => {
          for (const k of ['altarDone0', 'altarDone1', 'altarDone2', 'villagersSaved']) delete g.flags[k];
          g.storyAlly('maiden', 'maiden', 'Lâm Uyển Nhi', 'dagger', { hp: 560, atk: 24, color: 0xffb0d0 });
          g.say('maiden', 'Ba ngọn lửa kia... phải dập trước khi chúng hợp làm một!');
        },
        done: (g) => near(g, VALLEY.x, VALLEY.z + 20, 26),
      },
      ...[['đông', 24, 6], ['tây', -24, 4], ['nam', 2, -26]].map(([dir, dx, dz], i) => ({
        objective: (g) => `Phá tế đàn phía ${dir} (${Math.min(2, g.killCount('altar' + i))}/2 hộ đàn) · còn ${3 - i} tế đàn`,
        marker: () => off(VALLEY, dx, dz),
        enter: (g) => {
          const a = off(VALLEY, dx, dz);
          g.vfx?.pillar?.(g.v3(a.x, g.terrain.heightAt(a.x, a.z), a.z), 0xff2040, 7);
          g.spawnMonster(['tieuman', 'chutinh', 'cuongthi'][i], a.x + 3, a.z + 2, { group: 'altar' + i, aggro: 40 });
          g.spawnMonster(['phapsu', 'tieuman', 'phapsu'][i], a.x - 3, a.z - 2, { group: 'altar' + i, aggro: 40 });
        },
        done: (g) => killed(g, 'altar' + i, 2) && near(g, VALLEY.x + dx, VALLEY.z + dz, 8),
        // giải cứu thôn dân ở tế đàn, tế đàn thứ hai có lựa chọn
        after: i,
      })).map((st) => {
        const i = st.after;
        delete st.after;
        const done = st.done;
        st.done = (g) => {
          if (!done(g) || g.flags['altarDone' + i]) return false;
          g.flags['altarDone' + i] = true;
          const a = off(VALLEY, [24, -24, 2][i], [6, 4, -26][i]);
          g.vfx?.shockwave?.(g.v3(a.x, g.terrain.heightAt(a.x, a.z), a.z), 0x80d0ff, 8);
          g.flags.villagersSaved = (g.flags.villagersSaved || 0) + 3;
          if (i === 1) g.dialog([
            ['captive', 'Đại hiệp! Cứu với... con bé nhà tôi bị trúng tà khí, sắp không qua khỏi rồi!'],
            ['hero', '(Phía xa, một bóng áo đỏ đang bỏ chạy về tế đàn cuối cùng.)'],
            {
              choice: [
                { text: 'Dừng lại truyền nội lực cứu đứa bé', then: (g) => { g.karma(1); g.flag('savedChild'); g.player.mp = Math.max(0, g.player.mp - g.player.maxMp * 0.6); return [['captive', 'Con bé thở lại rồi! Ơn này đời đời không quên!'], ['maiden', 'Công tử... đúng là công tử.']]; } },
                { text: 'Đuổi theo bóng áo đỏ, cứu một người để mất tất cả thì vô ích', then: (g) => { g.karma(-1); g.flag('chasedHonglian'); return [['hero', '(Sau lưng vang lên tiếng khóc. Tiêu Vân không quay đầu.)']]; } },
              ],
            },
            { run: (g) => g.next() },
          ]);
          return i !== 1;
        };
        return st;
      }),
      {
        objective: () => 'Đánh bại Huyết Ảnh Hữu sứ Hồng Liên',
        marker: (g) => g.nearestOf('honglian') || VALLEY,
        enter: (g) => g.dialog([
          ['honglian', 'Ba tế đàn của ta... ngươi phá cả ba. Truyền nhân Thanh Phong, ngươi phiền thật đấy.'],
          ['hero', 'Hồng Liên. Ngươi gọi xác chết dậy để làm gì?'],
          ['honglian', '"Xác chết"? Đó là phụ thân ta.'],
          ['maiden', '...Mộ Dung Huyết có con gái?'],
          ['honglian', 'Ông ấy nhặt ta trong đống xác chết đói, dạy ta Huyết Ảnh chưởng trước cả khi dạy ta viết chữ. Ta là thanh kiếm ông ấy rèn ra.'],
          ['honglian', 'Huyết Hồn Tế chỉ là mồi lửa. Xác ông ấy đã được đưa lên Hỏa Diệm Sơn. Ở đó có Huyết Phách, viên tinh huyết của ba trăm năm Huyết Ảnh Môn.'],
          ['honglian', 'Nhưng ngươi sẽ không sống để tới đó.'],
          { run: (g) => g.spawn('honglian', VALLEY.x, VALLEY.z - 4, { group: 'honglian', boss: true, name: 'Huyết Ảnh Hữu sứ · Hồng Liên', hp: g.flags.chasedHonglian ? 1700 : 2000, dmg: 27, aggro: 80, speed: 6.4, weapon: 'sword', caster: true }) },
        ]),
        done: (g) => killed(g, 'honglian', 1),
      },
      {
        objective: () => 'Quyết định số phận Hồng Liên',
        marker: () => VALLEY,
        enter: (g) => g.dialog([
          ['honglian', '(máu chảy từ khoé miệng, cười) Hà... thanh kiếm gãy rồi. Phụ thân sẽ thất vọng lắm.'],
          ['maiden', 'Công tử, Huyết Ảnh chưởng của nàng ta... nội lực ấy có thể hút sang người khác. Phụ thân từng nói vậy.'],
          {
            choice: [
              { text: 'Tha: "Cô không phải thanh kiếm. Đi đi, sống cho mình một lần."', then: (g) => { g.flag('sparedHonglian'); g.karma(2); return [
                ['honglian', '(sững sờ) ...Chưa ai nói với ta câu đó.'],
                ['honglian', 'Hỏa Diệm Sơn, đỉnh phía đông. Huyết Phách cần ánh bình minh mới thức tỉnh. Ngươi còn một đêm.'],
              ]; } },
              { text: 'Giải nàng về quan phủ Thanh Phong', then: (g) => { g.flag('jailedHonglian'); g.karma(1); return [
                ['honglian', 'Song sắt à... cũng được. Ít nhất trong đó không ai bắt ta giết người.'],
              ]; } },
              { text: 'Hút nội lực Huyết Ảnh của nàng', then: (g) => { g.flag('absorbed'); g.karma(-3); return [
                ['hero', '(Bàn tay áp lên đan điền nàng. Một luồng nhiệt đỏ như máu tràn vào kinh mạch, nóng rát, ngọt ngào.)'],
                ['honglian', '(gục xuống, tóc bạc trắng trong chớp mắt) ...Ngươi... rồi sẽ giống ông ấy...'],
                ['maiden', '(run giọng) Công tử... mắt công tử... vừa đỏ lên...'],
                { run: (g) => { g.player.attackBonus += 14; g.player.storyHp += 60; g.rpg.apply(true); g.toast('Hấp thu <b>Huyết Ảnh nội lực</b> · Công +14 · Khí huyết +60<br><span class="sm">Tà khí xâm nhập kinh mạch...</span>', 5); } },
              ]; } },
            ],
          },
          ['hero', 'Hỏa Diệm Sơn. Kết thúc chuyện này thôi.'],
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  // ───────────────────────────── CHƯƠNG BÁT ─────────────────────────────
  {
    id: 'c8',
    han: '第八章',
    hanSub: '火焰山',
    title: 'Chương Bát',
    subtitle: 'Hỏa Diệm Sơn',
    time: 'dawn2',
    bg: 'fire',
    spawn: { x: FIRE.x - 10, z: FIRE.z + 55, yaw: Math.PI },
    narration: (g) => [
      'Hỏa Diệm Sơn. Đá dưới chân nóng như than, gió thổi tới mang mùi lưu huỳnh và máu.',
      g.karmaVal >= 3 ? 'Dọc đường, dân các làng được cứu kéo nhau tiễn Tiêu Vân. Có bà lão dúi vào tay chàng nắm cơm còn ấm.'
        : g.karmaVal <= -3 ? 'Dọc đường, dân làng thấy Tiêu Vân thì đóng cửa. Họ thì thầm về một kiếm khách mắt đỏ, đi tới đâu máu đổ tới đó.'
        : 'Dọc đường, chẳng ai nói gì. Giang hồ chỉ nhớ người thắng, không nhớ người tốt.',
      'Trên đỉnh núi, một viên ngọc đỏ treo lơ lửng giữa không trung, đập như một trái tim.',
    ],
    steps: [
      {
        objective: () => 'Leo lên Hỏa Diệm Sơn',
        marker: () => FIRE,
        enter: (g) => {
          g.storyAlly('maiden', 'maiden', 'Lâm Uyển Nhi', 'dagger', { hp: 640, atk: 28, color: 0xffb0d0 });
          if (g.flags.hanxueAlly) {
            g.storyAlly('hanxue', 'hanxue', 'Hàn Tuyết', 'sword', { hp: 900, atk: 40, color: 0xbfe6ff });
            g.say('hanxue', 'Ta tới rồi. Đừng hỏi vì sao, cứ đánh đi.');
          }
          g.tip('Quái lửa có thể làm ngươi Bỏng · Lăn né đòn cảnh báo đỏ của boss để tránh Choáng', 7);
        },
        done: (g) => near(g, FIRE.x, FIRE.z, 28),
      },
      {
        objective: (g) => `Hạ hộ pháp Huyết Ảnh canh giữ đỉnh núi (${g.killCount('fireguards')}/6)`,
        marker: (g) => g.nearestOf('fireguards') || FIRE,
        enter: (g) => {
          [[10, 8], [-10, 8], [14, -6], [-14, -6]].forEach(([dx, dz]) => g.spawn('assassin', FIRE.x + dx, FIRE.z + dz, { group: 'fireguards', weapon: 'sword', hp: 260, dmg: 22, aggro: 60 }));
          g.spawnMonster('xichma', FIRE.x + 4, FIRE.z + 14, { group: 'fireguards', aggro: 60 });
          g.spawnMonster('hoaquy', FIRE.x - 4, FIRE.z + 14, { group: 'fireguards', aggro: 60 });
          if (g.flags.sparedHonglian) setTimeout(() => g.say('honglian', '(từ trên vách đá) Bên trái có bẫy lửa. Đi lối phải. ...Coi như ta trả nợ.'), 3000);
        },
        done: (g) => killed(g, 'fireguards', 6),
      },
      {
        objective: () => 'Đánh bại Huyết Ma',
        marker: (g) => g.nearestOf('huyetma') || FIRE,
        enter: (g) => g.dialog([
          ['huyetma', '(Viên ngọc đỏ vỡ tan. Từ ngọn lửa, một bóng người bước ra, da đỏ như dung nham.)'],
          ['huyetma', 'Tiêu Vân. Ta nằm dưới đất ba tháng, nghe ngươi đi từng bước tới đây.'],
          g.karmaVal <= -3
            ? ['huyetma', 'Ta ngửi thấy mùi Huyết Ảnh trên người ngươi. Ngươi hút nội lực của con gái ta, phải không? Ha ha ha! Lý Mộ Bạch ơi, xem đệ tử của huynh kìa!']
            : ['huyetma', 'Ngươi tha cho kẻ thù, cứu lũ dân đen. Lý Mộ Bạch dạy đệ tử thật giống hắn: ngu ngốc đến chết.'],
          ['hero', 'Lần trước ngươi thua ở Kiếm Mộ. Lần này, sẽ không có lần sau.'],
          ['maiden', '(siết chặt dao găm) Vì phụ thân, vì sư bá. Công tử, tiểu nữ ở ngay đây.'],
          { run: (g) => g.spawn('huyetma', FIRE.x, FIRE.z - 6, { group: 'huyetma', boss: true, name: 'Huyết Ma · Mộ Dung Huyết', hp: g.flags.hanxueAlly ? 3800 : 3400, dmg: 32, aggro: 100, speed: 6.4, weapon: 'golden', caster: true, scale: 1.3 }) },
        ]),
        done: (g) => killed(g, 'huyetma', 1),
      },
      {
        objective: () => 'Quyết định số phận Huyết Phách',
        marker: () => FIRE,
        enter: (g) => g.dialog([
          ['huyetma', '(tan dần thành tro) Huyết Phách... vỡ rồi... nhưng tinh huyết vẫn còn... kẻ nào cầm nó... sẽ là ta tiếp theo...'],
          ['hero', '(Giữa đống tro, một giọt máu đỏ rực đọng lại, nóng hổi, như đang chờ đợi.)'],
          {
            choice: [
              { text: 'Phá huỷ tinh huyết: "Huyết Ảnh Môn kết thúc ở đây."', then: (g) => { g.flag('destroyedOrb'); g.karma(2); return [['hero', '(Một kiếm. Giọt máu bốc thành khói đỏ, gió núi thổi đi mất.)']]; } },
              { text: 'Hấp thu tinh huyết: "Sức mạnh không có thiện ác. Chỉ có kẻ dùng nó."', then: (g) => { g.flag('tookOrb'); g.karma(-5); return [
                ['hero', '(Giọt máu tan vào lòng bàn tay. Cả ngọn núi như run lên.)'],
                ['maiden', 'Công tử... không...!'],
                { run: (g) => { g.player.attackBonus += 20; g.player.storyHp += 120; g.rpg.apply(true); g.toast('Hấp thu <b>Huyết Phách</b> · Công +20 · Khí huyết +120', 5); } },
              ]; } },
              ...(g.karmaVal >= 4 ? [{ text: '(Chính khí ≥ 4) Dùng tinh huyết trả lại sinh khí cho những người bị tế', then: (g) => { g.flag('restoredAll'); g.karma(3); return [
                ['hero', '(Tiêu Vân dồn toàn bộ nội lực đẩy tinh huyết tan thành mưa đỏ. Mưa rơi khắp Yêu Ma Cốc, Hàn Băng Cốc...)'],
                ['maiden', 'Công tử, nhìn kìa! Những người bị hút sinh khí... họ đang tỉnh lại!'],
                { run: (g) => { g.player.storyMp += 60; g.rpg.apply(true); g.toast('<b>Phổ độ chúng sinh</b> · Nội lực +60', 5); } },
              ]; } }] : []),
            ],
          },
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  // ───────────────────────────── VĨ THANH HỒI II ─────────────────────────────
  {
    id: 'epilogue2',
    han: '尾聲',
    hanSub: '正邪一念',
    title: 'Vĩ Thanh · Hồi II',
    subtitle: 'Chính tà một niệm',
    time: 'sunrise',
    bg: 'town',
    spawn: { x: P.pavilion.x + 6, z: P.pavilion.z + 2, yaw: -Math.PI / 2 },
    narration: (g) => {
      const k = g.karmaVal;
      const lines = [];
      if (g.flags.tookOrb) {
        lines.push('Người ta kể, từ ngày ấy giang hồ có thêm một kiếm khách mắt đỏ, kiếm pháp vô địch, không ai dám gọi tên.');
        lines.push('Lâm Uyển Nhi vẫn ngồi ở Vọng Nguyệt đình mỗi chiều, pha hai chén trà. Một chén luôn nguội lạnh.');
        lines.push('Chính tà chỉ cách nhau một niệm. Có những bước đi, không quay đầu được nữa.');
      } else if (k >= 4) {
        lines.push(g.flags.restoredAll ? 'Mưa đỏ trên Hỏa Diệm Sơn trả lại sinh khí cho chín mươi chín người. Họ gọi nó là "trận mưa của Thanh Phong".' : 'Huyết Ảnh Môn ba trăm năm, tan thành tro trên Hỏa Diệm Sơn.');
        if (g.flags.hanxueAlly) lines.push('Hàn Tuyết trở về Hàn Băng Cốc, dựng mộ cho tỷ tỷ, và mở một y quán chữa hàn độc cho người nghèo.');
        if (g.flags.sparedHonglian) lines.push('Có người thấy một cô gái áo đỏ dạy chữ cho lũ trẻ ở làng biên giới. Nàng không bao giờ nhắc tới võ công.');
        lines.push('Võ lâm tôn Tiêu Vân là "Thanh Phong Hiệp". Chàng chỉ cười, rồi về hồ Bích Thủy pha trà với Uyển Nhi.');
        lines.push('Kiếm tại nhân tâm. Tâm chính, kiếm chính.');
      } else if (k <= -3) {
        lines.push('Huyết Ảnh Môn sụp đổ. Nhưng giang hồ không nhớ ơn kẻ giết nó, chỉ sợ hãi.');
        lines.push('Lâm Uyển Nhi tiễn Tiêu Vân ở đầu trấn: "Công tử thắng rồi. Nhưng tiểu nữ không còn nhận ra công tử nữa."');
        lines.push('Kẻ diệt ma, cẩn thận kẻo thành ma.');
      } else {
        lines.push('Huyết Ảnh Môn không còn. Thanh Phong lại yên bình, như chưa từng có gì xảy ra.');
        lines.push('Tiêu Vân không phải thánh nhân, cũng chẳng phải ma đầu. Chỉ là một kiếm khách đã làm điều mình cho là đúng.');
        lines.push('Còn đúng hay sai... để gió trên hồ Bích Thủy trả lời.');
      }
      return lines;
    },
    steps: [
      {
        objective: () => 'Tự do ngao du giang hồ',
        marker: () => null,
        enter: (g) => {
          const k = g.karmaVal;
          g.flag(g.flags.tookOrb ? 'endingMa' : k >= 4 ? 'endingHiep' : k <= -3 ? 'endingTa' : 'endingThuong');
          const name = g.flags.tookOrb ? 'Huyết Ma tái thế' : k >= 4 ? 'Thanh Phong Hiệp' : k <= -3 ? 'Kẻ diệt ma' : 'Gió lặng';
          g.toast(`<b>HOÀN · HỒI II</b><br>Kết cục: <b>${name}</b><br><span class="sm">Đạo tâm ${k >= 0 ? '+' : ''}${k} · Chọn chương để thử con đường khác</span>`, 9);
          g.sys.checkAchievements?.();
          g.save();
        },
        talk: {
          maiden: (g) => [g.flags.tookOrb ? ['maiden', '...Trà nguội rồi, công tử.'] : ['maiden', 'Trà vừa pha xong. Lần này, chúng ta thật sự được nghỉ ngơi rồi.']],
          keeper: () => [['keeper', 'Đại hiệp về rồi! Tiểu Hổ, mang rượu Nữ Nhi Hồng ra đây!']],
        },
      },
    ],
  },

];

/** Thoại mặc định khi bước hiện tại không có thoại riêng. */
export const AMBIENT = {
  guard: () => [['guard', 'Cứ đi thẳng là tới quảng trường. Khách điếm ở phía bắc quảng trường.']],
  keeper: () => [['keeper', 'Khách quan cứ tự nhiên. Cần Kim sang dược thì nói với lão một tiếng.'], { run: (g) => { if (g.potions < 2) { g.addPotions(2 - g.potions); g.toast('Lưu chưởng quỹ bổ sung Kim sang dược'); } } }],
  maiden: () => [['maiden', 'Gió trên hồ hôm nay thật lạnh...']],
  villager: (g) => {
    const l = [
      'Nghe nói ngày xưa trấn mình có cả một kiếm phái đấy, giờ chỉ còn cái tên.',
      'Cô nương họ Lâm ngày nào cũng ra đình bên hồ ngồi một mình...',
      'Rừng trúc tây bắc đẹp lắm, nhưng giờ chẳng ai dám vào.',
      'Đêm rằm tháng này trăng đỏ lắm, người già bảo là điềm gở.',
    ];
    // dân trấn bàn tán theo đạo tâm của người chơi
    const k = g?.flags?.karma || 0;
    if (k >= 3) l.push('Tiêu đại hiệp đó! Người tha cả kẻ thù, cả trấn ai cũng kính.', 'Mua gì cứ nói, đại hiệp mua thì lão bớt cho!');
    if (k <= -3) l.push('(thì thầm) Đừng nhìn vào mắt hắn... nghe nói hắn giết người không chớp mắt.', 'Giá hôm nay tăng rồi, khách quan thông cảm...');
    return [['villager', l[Math.floor(Math.random() * l.length)]]];
  },
  captive: () => [['captive', 'Đa tạ đại hiệp! Đa tạ đại hiệp!']],
};
