import * as THREE from 'three';
import { PLACES } from '../world/layout.js';

/**
 * HỒI IV · VÔ DIỆN LÂU (無面樓)
 *
 * Nửa năm sau khi Tư Đồ Phong ngã xuống, các chưởng môn từng quỳ dưới cờ Võ Lâm Minh lần lượt chết,
 * trên mặt mỗi xác phủ một chiếc mặt nạ trắng, vết thương là Thanh Phong kiếm pháp.
 * Kẻ đứng sau là Lâm Thiên Hải, phụ thân Uyển Nhi, người cả giang hồ tưởng đã chết ba năm trước.
 * Hồi này cũng trả lời câu hỏi Tiêu Vân chưa từng hỏi: chàng là ai, và vì sao sư phụ nhận nuôi chàng.
 *
 * Cờ (flags): sparedQi / jailedQi / killedQi · toldWaner / hidLetter · thienhaiRedeemed / thienhaiJudged / killedThienhai · adoptedQi
 */
const P = PLACES;
const near = (g, x, z, r = 6) => Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < r;
const at = (place) => () => ({ x: place.x, z: place.z });
const npcAt = (id) => (g) => { const n = g.npc(id); return n ? { x: n.pos.x, z: n.pos.z } : null; };
const killed = (g, group, n) => g.killCount(group) >= n;
const off = (c, dx, dz) => ({ x: c.x + dx, z: c.z + dz });
// quái Hồi IV theo cấp người chơi (tối thiểu 40) để truyện không bị "đi dạo"
const lvOf = (g, plus = 1) => Math.max(40, g.rpg.level + plus);

const VILLAGE = { x: 150, z: 70 };            // Đồi Gió: tàn tích Tiêu gia thôn
const CLUES = [off(VILLAGE, -9, 6), off(VILLAGE, 10, -3), off(VILLAGE, 0, -14)];
const TOMB_GATE = { x: P.tomb.x + 14, z: P.tomb.z + 30 };

/** Tàn tích Tiêu gia thôn trên Đồi Gió: tường cháy, giếng cạn, 37 tấm bia (dựng một lần, ở lại sau Hồi IV). */
export function ensureRuins(g) {
  if (g._tieuRuins) return;
  const grp = new THREE.Group();
  const char = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.85 });
  const h = (x, z) => g.terrain.heightAt(x, z);
  const box = (mat, w, hh, d, x, z, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, h(x, z) + hh / 2 - 0.1, z); m.rotation.set(0, ry, rz); m.castShadow = m.receiveShadow = true; grp.add(m); return m;
  };
  // ba nền nhà cháy: tường gãy khúc + cột xém
  [[CLUES[0], 0.2], [off(VILLAGE, 14, 9), -0.5], [off(VILLAGE, -14, -8), 0.9]].forEach(([c, ry]) => {
    const fx = Math.cos(ry), fz = Math.sin(ry);
    box(char, 5, 1.6, 0.35, c.x - fz * 2.4, c.z + fx * 2.4, ry);
    box(char, 2.6, 2.4, 0.35, c.x + fz * 2.4 - fx, c.z - fx * 2.4 - fz, ry);
    box(char, 0.35, 1.1, 4.2, c.x - fx * 2.4, c.z - fz * 2.4, ry);
    box(wood, 0.3, 3.2, 0.3, c.x + fx * 2.3, c.z + fz * 2.3, ry, 0.25);
    box(wood, 3.6, 0.25, 0.25, c.x, c.z, ry + 0.7, 0.08);
  });
  // giếng cạn
  const w = CLUES[1], ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.9, 16, 1, true), stone);
  ring.material = stone.clone(); ring.material.side = THREE.DoubleSide;
  ring.position.set(w.x, h(w.x, w.z) + 0.4, w.z); grp.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(w.x, h(w.x, w.z) + 0.3, w.z); grp.add(hole);
  box(wood, 0.2, 1.8, 0.2, w.x - 1.2, w.z, 0); box(wood, 0.2, 1.4, 0.2, w.x + 1.2, w.z, 0, -0.3);
  // 37 tấm bia họ Tiêu, xếp ba hàng
  const b = CLUES[2];
  for (let i = 0; i < 37; i++) {
    const row = Math.floor(i / 13), col = i % 13;
    box(stone, 0.7, 1.1 + (i % 3) * 0.12, 0.18, b.x - 9 + col * 1.5, b.z - 3 - row * 2, 0.05 * ((i * 7) % 5 - 2));
  }
  g.scene.add(grp);
  g._tieuRuins = grp;
}

export const ACT4_SPEAKERS = {
  thienhai: { name: 'Vô Diện Lâu chủ', han: '無面樓主', look: 'thienhai' },
  thienhai2: { name: 'Lâm Thiên Hải', han: '林天海', look: 'thienhai' },
  tieuthat: { name: 'Tiểu Thất', han: '小七', look: 'tieuthat' },
  oldwoman: { name: 'Lão bà giữ mộ', han: '守墓婆婆', look: 'villagerF' },
  nhidien: { name: 'Nhị Diện', han: '二面', look: 'wumian' },
  letter: { name: 'Thư chưa gửi', han: '未寄之書', look: 'guard' },
};

const vodien = (g, group, pts, c, opts = {}) => pts.forEach(([dx, dz], i) =>
  g.spawn('vodien', c.x + dx, c.z + dz, { group, aggro: 45, lv: lvOf(g), name: opts.names?.[i] || 'Vô Diện sát thủ' }));

export const ACT4 = [
  // ═════════════════════════════ HỒI IV · VÔ DIỆN LÂU ═════════════════════════════
  {
    id: 'c12',
    han: '第十二章',
    hanSub: '白面',
    title: 'Chương Thập Nhị',
    subtitle: 'Mặt nạ trắng',
    time: 'night',
    bg: 'town',
    spawn: { x: P.square.x, z: P.square.z + 26, yaw: Math.PI },
    narration: (g) => [
      'Nửa năm sau đêm ở tổng đàn Võ Lâm Minh.',
      'Chưởng môn Không Động chết trong thư phòng. Rồi tới trưởng lão Nga Mi. Rồi bang chủ Cái Bang. Mười một người, mười một đêm.',
      'Trên mặt mỗi xác phủ một chiếc mặt nạ trắng trơn, không mắt, không miệng. Vết thương chỉ có một: một đường kiếm mảnh như lá liễu.',
      'Thanh Phong Phất Liễu. Cả giang hồ biết, người cuối cùng còn dùng kiếm pháp ấy tên là Tiêu Vân.',
      g.flags.tookSeat ? 'Mười một người chết, đều là người từng phản đối vị Minh chủ mới.' : 'Mười một người chết, đều là người từng quỳ dưới lá cờ của Tư Đồ Phong.',
    ],
    steps: [
      {
        objective: () => 'Về Duyệt Lai khách điếm hỏi Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        talk: {
          keeper: (g) => [
            ['keeper', '(vội đóng cửa sổ) Đại hiệp! Sao người còn vào trấn? Ngoài kia người ta dán cáo thị bắt người rồi!'],
            ['hero', 'Ta không giết họ.'],
            ['keeper', 'Lão biết, lão biết. Nhưng giang hồ không cần biết. Giang hồ chỉ cần một cái tên để chửi.'],
            ['hero', 'Chưởng quỹ có nghe gì về những chiếc mặt nạ?'],
            ['keeper', '(tay lại run như ngày đầu gặp) ...Mặt nạ trắng. Vô Diện. Người ta đồn có một toà lâu không ai tìm thấy, nuôi toàn trẻ mồ côi, dạy chúng giết người mà không để lộ mặt.'],
            ['keeper', 'Còn một chuyện... lão giữ ba năm nay rồi.'],
            ['keeper', 'Đêm Lâm đại hiệp mất, người của Minh tới khiêng quan tài đi chôn, không cho ai nhìn mặt. Lão phụ khiêng một góc.'],
            ['keeper', 'Quan tài ấy... nhẹ lắm, đại hiệp ạ. Nhẹ như không có ai bên trong.'],
            ['hero', '(Tiêu Vân im lặng rất lâu.)'],
            { run: (g) => { g.next(); } },
          ],
        },
      },
      {
        objective: (g) => `Đuổi đám Vô Diện đang lùng sục trong trấn (${g.killCount('vd1')}/5)`,
        marker: (g) => g.nearestOf('vd1') || P.square,
        enter: (g) => {
          vodien(g, 'vd1', [[-10, 8], [10, 8], [-14, -6], [14, -6], [0, -14]], P.square);
          g.say('maiden', 'Công tử! Có người đeo mặt nạ trắng trên mái nhà!');
          g.tip('Vô Diện dùng chính kiếm pháp Thanh Phong · Né chiêu (Space) rồi phản đòn', 5);
        },
        done: (g) => killed(g, 'vd1', 5),
      },
      {
        objective: () => 'Dồn kẻ đeo mặt nạ cuối cùng vào góc quảng trường',
        marker: () => off(P.square, 0, -22),
        done: (g) => near(g, P.square.x, P.square.z - 22, 7),
      },
      {
        objective: () => 'Quyết định số phận đứa trẻ',
        marker: () => off(P.square, 0, -22),
        enter: (g) => g.dialog([
          ['hero', '(Kẻ cuối cùng ngã xuống, mặt nạ lăn ra. Bên dưới là một đứa trẻ chưa quá mười hai tuổi, cổ tay gầy như que củi.)'],
          ['tieuthat', '(lùi sát vào tường, vẫn giơ kiếm) Đừng lại gần! Ta... ta là Thất Diện! Ta giết người rồi đó!'],
          ['hero', 'Ngươi tên gì?'],
          ['tieuthat', '...Không có tên. Trong lâu không ai có tên. Lâu chủ gọi ta là số bảy.'],
          ['tieuthat', 'Lâu chủ cho ăn, dạy kiếm, cho mặt nạ. Có mặt nạ thì không ai thấy mình khóc.'],
          ['tieuthat', 'Lâu chủ nói người là đệ tử của kẻ phản bội. Nói người là kẻ cuối cùng phải chết.'],
          ['maiden', '(chạy tới, thở dốc) Công tử... nó chỉ là một đứa trẻ.'],
          { choice: [
            { text: 'Cất kiếm, đưa nó một cái bánh bao: "Ngươi đi đi. Đừng đeo mặt nạ nữa."', then: (g) => { g.flag('sparedQi'); g.karma(2); return [
              ['tieuthat', '(nhìn cái bánh rất lâu, rồi giật lấy, bỏ chạy. Tới đầu ngõ, nó dừng lại.)'],
              ['tieuthat', 'Mặt nạ của ta... có vẽ đường về lâu ở mặt trong. Ta không cần nó nữa.'],
            ]; } },
            { text: 'Giao nó cho Hội Nghị Giang Hồ xét xử', then: (g) => { g.flag('jailedQi'); return [
              ['tieuthat', '(không chống cự, chỉ cười nhạt) Giống hệt lời Lâu chủ nói. Người lớn nào cũng thế.'],
              ['maiden', '(nhặt chiếc mặt nạ lên) Mặt trong có vẽ một con đường... dẫn tới Đồi Gió.'],
            ]; } },
            { text: 'Một kiếm: "Kẻ giết người, tuổi nào cũng là kẻ giết người."', then: (g) => { g.flag('killedQi'); g.karma(-3); return [
              ['hero', '(Đứa trẻ ngã xuống không một tiếng kêu. Nó nhỏ hơn Tiểu Hổ.)'],
              ['maiden', '(quay mặt đi, rất lâu sau mới nói) ...Mặt nạ của nó có vẽ đường tới Đồi Gió.'],
            ]; } },
          ] },
          ['hero', '(Trên bản đồ vẽ vội bằng than, Đồi Gió được đánh dấu bằng một chữ: 蕭. Tiêu.)'],
          { run: (g) => g.finishChapter() },
        ]),
      },
    ],
  },

  {
    id: 'c13',
    han: '第十三章',
    hanSub: '故鄉',
    title: 'Chương Thập Tam',
    subtitle: 'Cố hương',
    time: 'dawn',
    bg: 'town',
    spawn: { x: VILLAGE.x - 30, z: VILLAGE.z + 40, yaw: Math.PI * 0.8 },
    narration: () => [
      'Đồi Gió. Từ bé, mỗi lần đi ngang chân đồi, sư phụ đều xuống ngựa, đi bộ, không nói một lời.',
      'Tiêu Vân từng hỏi vì sao. Sư phụ chỉ đáp: "Có những nơi phải đi chậm."',
      'Trên đỉnh đồi có một ngôi làng cháy rụi đã hai mươi năm. Cỏ mọc kín nền nhà. Không ai còn nhớ tên làng.',
    ],
    steps: [
      {
        objective: () => 'Lên tàn tích ngôi làng trên Đồi Gió',
        marker: at(VILLAGE),
        enter: (g) => { ensureRuins(g); g.storyAlly('maiden', 'maiden', 'Lâm Uyển Nhi', 'dagger', { hp: 1100, atk: 48, color: 0xffb0d0 }); },
        done: (g) => near(g, VILLAGE.x, VILLAGE.z, 16),
      },
      {
        objective: () => 'Xem xét căn nhà cháy đầu làng',
        marker: () => CLUES[0],
        done: (g) => near(g, CLUES[0].x, CLUES[0].z, 4),
        enter: (g) => g.tip('Theo dấu chỉ đường, đi tới từng chỗ để xem xét', 4),
      },
      {
        objective: () => 'Xem xét giếng cạn giữa làng',
        marker: () => CLUES[1],
        enter: (g) => g.dialog([
          ['hero', '(Trên khung cửa cháy đen còn khắc chiều cao một đứa trẻ, từng năm một. Vạch cuối cùng ghi: "Vân nhi, hai tuổi".)'],
          ['maiden', 'Vân nhi...'],
          ['hero', '(Tiêu Vân đặt tay lên vạch khắc. Nó vừa tới đầu gối chàng.)'],
        ]),
        done: (g) => near(g, CLUES[1].x, CLUES[1].z, 4),
      },
      {
        objective: () => 'Tới hàng bia mộ cuối làng',
        marker: () => CLUES[2],
        enter: (g) => g.dialog([
          ['hero', '(Giếng cạn, sâu chừng hai trượng. Dưới đáy có một chiếc giỏ tre mục, và một chiếc khoá trường mệnh bằng bạc đã đen.)'],
          ['hero', '(Mặt sau khoá khắc chữ: 蕭. Tiêu Vân sờ lên cổ. Chàng cũng có một sợi dây đỏ, từ bé đã đeo, mà không biết vì sao.)'],
        ]),
        done: (g) => near(g, CLUES[2].x, CLUES[2].z, 5),
      },
      {
        objective: () => 'Nói chuyện với lão bà giữ mộ',
        marker: () => CLUES[2],
        enter: (g) => g.dialog([
          ['oldwoman', '(Một bà lão lưng còng đang quét lá trước ba mươi bảy tấm bia, tấm nào cũng khắc họ Tiêu.) Lại có người tới à. Hai mươi năm nay, chỉ có một người hay tới.'],
          ['oldwoman', 'Một kiếm khách áo trắng. Năm nào cũng tới đúng ngày rằm tháng chạp, thắp ba mươi bảy nén hương, rồi ngồi tới sáng.'],
          ['hero', 'Bà có biết... đêm làng cháy, chuyện gì đã xảy ra?'],
          ['oldwoman', 'Một gã thiếu niên tóc trắng, tay đỏ như máu. Hắn đi tìm một thứ gì đó, không tìm được, thì giết. Phía sau hắn có một người áo trắng cưỡi ngựa đứng xa xa nhìn, không xuống ngựa.'],
          ['oldwoman', 'Nửa đêm, kiếm khách áo trắng kia mới tới. Tới muộn. Ông ấy lật từng xác lên tìm, tới giếng thì nghe tiếng trẻ con khóc.'],
          ['oldwoman', 'Ông ấy ôm đứa bé ra, quỳ trước làng, nói một câu lão nhớ tới giờ: "Ta tới muộn. Phần đời còn lại của ta, nợ đứa trẻ này."'],
          ['hero', '(Tiêu Vân không nói được gì. Uyển Nhi lặng lẽ nắm lấy tay chàng.)'],
          ['oldwoman', 'Sáng hôm sau còn một người nữa tới. Một kiếm khách áo xanh, quỳ ở đây khóc như con nít. Ông ta với người áo trắng cãi nhau to lắm, rồi mỗi người một ngả.'],
          ['maiden', '(khẽ) ...Phụ thân tiểu nữ hay mặc áo xanh.'],
          { run: (g) => g.next() },
        ]),
      },
      {
        objective: (g) => `Vô Diện mai phục! Hạ đám sát thủ (${g.killCount('vd2')}/5)`,
        marker: (g) => g.nearestOf('vd2') || VILLAGE,
        enter: (g) => {
          vodien(g, 'vd2', [[-12, 10], [12, 10], [-14, -8], [14, -8], [0, 16]], VILLAGE);
          g.say('nhidien', 'Lâu chủ đoán không sai. Kẻ phản bội nào rồi cũng quay về chỗ mình đã phản bội.');
        },
        done: (g) => killed(g, 'vd2', 5),
      },
      {
        objective: () => 'Đánh bại Nhị Diện',
        marker: (g) => g.nearestOf('nhidien') || VILLAGE,
        enter: (g) => g.dialog([
          ['nhidien', '(Một kẻ cao gầy, mặt nạ trắng có hai vạch đỏ, bước ra từ sau hàng bia.) Thanh Phong Hiệp. Ngươi biết vì sao làng này cháy không?'],
          ['nhidien', 'Vì sư phụ ngươi. Lý Mộ Bạch giấu nửa kiếm phổ ở đây, nhờ một nhà họ Tiêu giữ hộ. Huyết Ảnh tới tìm, không thấy, thì đốt cả làng.'],
          ['nhidien', 'Lâu chủ nói: Lý Mộ Bạch nhận nuôi ngươi không phải vì thương. Mà vì hắn mắc nợ.'],
          ['hero', '(Bàn tay cầm kiếm của Tiêu Vân run lên.)'],
          { run: (g) => g.spawn('wumian', VILLAGE.x, VILLAGE.z - 6, { group: 'nhidien', boss: true, name: 'Nhị Diện', lv: lvOf(g, 3), aggro: 90 }) },
        ]),
        done: (g) => killed(g, 'nhidien', 1),
      },
      {
        objective: () => 'Nghe lời trăng trối của Nhị Diện',
        marker: () => VILLAGE,
        enter: (g) => g.dialog([
          ['nhidien', '(Mặt nạ vỡ. Một gương mặt hai mươi tuổi, chi chít sẹo bỏng.) Ta... cũng là người làng bên. Cũng cháy cùng đêm đó.'],
          ['nhidien', 'Lâu chủ nhặt ta về. Ông ấy nói: giang hồ không thấy mặt chúng ta, thì chúng ta cũng không cần mặt.'],
          ['hero', 'Lâu chủ của ngươi là ai?'],
          ['nhidien', '(cười, máu trào ra) Người ngươi gặp hôm Đại Hội. Kẻ dùng Thanh Phong Phất Liễu. Ngươi tưởng đó là Lâu chủ sao? Đó chỉ là... Nhất Diện.'],
          ['nhidien', 'Lâu chủ thật... cầm nửa kia của kiếm pháp. Hỏi lão chưởng quỹ đi. Lão ta... giữ một lá thư...'],
          ['maiden', 'Lá thư...? Lưu bá bá?'],
          { choice: [
            { text: 'Chôn Nhị Diện cạnh hàng bia làng', then: (g) => { g.karma(1); g.flag('buriedNhidien'); return [['hero', '(Ba mươi tám nấm mộ. Tiêu Vân khắc lên tấm bia mới: "Không tên. Người làng bên.")']]; } },
            { text: 'Bỏ đi, không ngoái lại', then: () => [['maiden', '(Uyển Nhi đứng lại một lúc, đặt chiếc mặt nạ vỡ lên ngực hắn, rồi chạy theo.)']] },
          ] },
          { run: (g) => { g.rpg.points += 1; g.toast('Thân thế được hé lộ · Điểm võ học +1', 3.5); g.finishChapter(); } },
        ]),
      },
    ],
  },

  {
    id: 'c14',
    han: '第十四章',
    hanSub: '未寄之書',
    title: 'Chương Thập Tứ',
    subtitle: 'Lá thư chưa gửi',
    time: 'dawn2',
    bg: 'lake',
    spawn: { x: P.inn.x, z: P.inn.z + 18, yaw: Math.PI },
    narration: () => [
      'Lưu Đại Phúc ba năm nay đêm nào cũng thắp một nén hương sau bếp. Không bài vị, không tên.',
      'Đêm nay, lần đầu tiên ông không thắp. Ông ngồi chờ Tiêu Vân, trên bàn đặt một phong thư đã ố vàng, dấu niêm còn nguyên.',
    ],
    steps: [
      {
        objective: () => 'Nói chuyện với Lưu chưởng quỹ',
        marker: npcAt('keeper'),
        talk: {
          keeper: (g) => [
            ['keeper', '(quỳ sụp xuống) Đại hiệp, lão có tội.'],
            ['keeper', 'Ba năm trước, Lâm đại hiệp bị Huyết Ảnh chưởng đánh trọng thương, trốn vào hầm rượu của lão. Mặt ông ấy... không còn ra mặt người nữa.'],
            ['keeper', 'Ông ấy viết lá thư này, nhờ lão gửi lên Bạch Vân sơn cho Lý đại hiệp. Ông ấy nói: "Sư huynh sẽ tới. Sư huynh chưa từng thất hẹn."'],
            ['keeper', 'Nhưng người của Minh chủ đã đứng ở cửa. Họ nói, thư mà tới Bạch Vân sơn, thì con lão, Tiểu Hổ, sẽ không thấy mặt trời ngày mai.'],
            ['keeper', 'Lão không dám đốt. Cũng không dám gửi. Ba năm... ba năm lão giữ nó dưới bài vị không tên ấy.'],
            ['keeper', 'Bảy ngày sau, Lâm đại hiệp biến mất khỏi hầm rượu. Minh chủ cho khiêng một cỗ quan tài rỗng ra chôn, rồi tuyên bố ông ấy đã chết.'],
            { choice: [
              { text: 'Đỡ ông dậy: "Ông cũng chỉ là một người cha."', then: (g) => { g.karma(1); return [['keeper', '(khóc không thành tiếng) Đại hiệp...']]; } },
              { text: '"Ba năm. Một lá thư có thể cứu một mạng người, và ông giữ nó ba năm."', then: () => [['keeper', '(cúi gằm mặt) ...Lão biết. Lão biết.']] },
            ] },
            ['hero', '(Tiêu Vân cầm lấy lá thư. Nét chữ ngoài phong bì giống hệt bức thư trong rương ở rừng trúc: "Gửi Mộ Bạch sư huynh.")'],
            { run: (g) => g.next() },
          ],
        },
      },
      {
        objective: () => 'Mở lá thư ở Vọng Nguyệt đình',
        marker: () => off(P.pavilion, 4, 0),
        done: (g) => near(g, P.pavilion.x + 4, P.pavilion.z, 7),
      },
      {
        objective: () => 'Đọc thư',
        marker: () => P.pavilion,
        enter: (g) => g.dialog([
          ['letter', '"Sư huynh. Đệ biết huynh còn giận chuyện ở Đồi Gió. Đệ cũng giận. Hai mươi năm rồi, đệ vẫn giận."'],
          ['letter', '"Nhưng đệ sai. Huynh không giấu kiếm phổ ở làng họ Tiêu. Là đệ. Đệ nhờ họ giữ, rồi đệ sợ, đệ bỏ đi trước. Huynh nhận lỗi thay đệ, nuôi đứa bé thay đệ."'],
          ['letter', '"Kẻ cưỡi ngựa trắng đêm ấy là Tư Đồ Phong. Đệ có chứng cứ. Đệ bị trúng chưởng, không đi được nữa."'],
          ['letter', '"Nếu huynh còn nhớ cây tùng, nhớ chiếc bánh nướng ba đứa chia nhau, thì tới tìm đệ. Đệ đợi ở hầm rượu Duyệt Lai. Đệ đợi tới khi huynh tới."'],
          ['letter', '"Nếu đệ không đợi được, xin huynh chăm sóc Uyển Nhi. Đừng cho nó cầm kiếm. Thiên Hải."'],
          ['hero', '(Gió hồ lật trang thư. Mặt sau còn một dòng, nét chữ khác, run hơn, như viết thêm sau nhiều ngày chờ: "Huynh không tới.")'],
          ['hero', '(Tiêu Vân gấp lá thư lại. Phía sau lưng chàng, Uyển Nhi đang mang trà ra.)'],
          { choice: [
            { text: 'Đưa lá thư cho Uyển Nhi: "Phụ thân cô nương... có thể vẫn còn sống."', then: (g) => { g.flag('toldWaner'); g.karma(1); return [
              ['maiden', '(đọc tới đâu, tay run tới đó. Chén trà rơi xuống sàn đình, vỡ.)'],
              ['maiden', 'Ba năm... con thắp hương cho một cỗ quan tài rỗng ba năm...'],
              ['maiden', '(lau nước mắt, giọng bỗng cứng lại) Nếu phụ thân là Lâu chủ Vô Diện... thì con phải là người đứng trước mặt người. Không phải công tử.'],
            ]; } },
            { text: 'Giấu lá thư đi: "Không có gì. Chỉ là chuyện cũ của sư phụ."', then: (g) => { g.flag('hidLetter'); g.karma(-1); return [
              ['maiden', '(nhìn chàng một lúc lâu) ...Vâng. Công tử uống trà đi, kẻo nguội.'],
              ['hero', '(Nàng không hỏi thêm. Nhưng tối đó, lần đầu tiên, nàng pha trà quên bỏ hoa nhài.)'],
            ]; } },
          ] },
          { run: (g) => g.next() },
        ]),
      },
      {
        objective: (g) => `Vô Diện tập kích Duyệt Lai! Bảo vệ khách điếm (${g.killCount('vd3')}/7)`,
        marker: (g) => g.nearestOf('vd3') || P.inn,
        enter: (g) => {
          vodien(g, 'vd3', [[-10, 14], [10, 14], [-16, 4], [16, 4], [-8, 22], [8, 22], [0, 26]], P.inn);
          g.say('keeper', 'Đại hiệp! Chúng tới vì lão! Tên lão... chắc là cái tên cuối cùng trong danh sách!');
          g.tip('Vô Diện nhắm vào Lưu chưởng quỹ · Dùng tuyệt kỹ diện rộng khi bị vây', 5);
        },
        done: (g) => killed(g, 'vd3', 7),
      },
      {
        objective: () => 'Hỏi đường tới Vô Diện Lâu',
        marker: npcAt('keeper'),
        enter: (g) => {
          const l = [['keeper', '(run rẩy bước ra khỏi quầy) Lão... lão còn sống...']];
          if (g.flags.sparedQi) l.push(
            ['tieuthat', '(Một bóng nhỏ trèo xuống từ mái hiên, không đeo mặt nạ.) Lâu không ở Đồi Gió đâu. Đồi Gió chỉ là cái bẫy.'],
            ['tieuthat', 'Lâu ở dưới Kiếm Mộ. Trong hang băng sau tấm bia lớn. Lâu chủ nói, đó là nơi duy nhất trên đời ông ấy còn muốn canh giữ.'],
            ['tieuthat', '...Người cho ta bánh bao. Ta trả lại người con đường.'],
          );
          else if (g.flags.hanxueAlly) l.push(['hanxue', '(Hàn Tuyết bước vào, rũ tuyết trên vai) Hang băng sau Kiếm Mộ có người ở. Ba tháng nay, khói bếp bay lên mỗi sáng, và không ai trong Hàn Băng Cốc dám lại gần.']);
          else if (g.flags.sparedHonglian) l.push(['honglian', '(Một mũi tên cắm vào cột, buộc theo mảnh giấy) "Dưới Kiếm Mộ. Hang băng. Lần này không phải trả nợ. Chỉ là ta cũng ghét mặt nạ." Hồng Liên.']);
          else l.push(['keeper', 'Sổ sách của Minh chủ... lão từng chép giùm. Có một khoản tiền gạo gửi đều mỗi tháng tới "hang băng sau Kiếm Mộ". Người nhận không có tên.']);
          l.push(
            g.flags.toldWaner ? ['maiden', 'Kiếm Mộ... nơi phụ thân và sư bá chôn kiếm phổ. Con đi cùng công tử. Lần này, con không đứng sau nữa.'] : ['maiden', '(khẽ) Công tử lại sắp đi đâu đó một mình, phải không?'],
            { run: (g) => g.finishChapter() },
          );
          g.dialog(l);
        },
      },
    ],
  },

  {
    id: 'c15',
    han: '第十五章',
    hanSub: '雙玉',
    title: 'Chương Thập Ngũ',
    subtitle: 'Song ngọc hợp bích',
    time: 'night',
    bg: 'ice',
    spawn: { x: P.tomb.x + 24, z: P.tomb.z + 64, yaw: Math.PI },
    narration: (g) => [
      'Kiếm Mộ về đêm. Hàng nghìn thanh kiếm cắm trên sườn núi, trăng rọi xuống như một rừng sương bạc.',
      'Sau tấm bia lớn, nơi năm xưa khắc tám chữ "Kiếm tại nhân tâm", có một khe đá chưa từng ai để ý. Gió từ trong đó thổi ra, ấm, và có mùi trà.',
      g.flags.toldWaner ? 'Uyển Nhi đi trước Tiêu Vân một bước. Trên cổ nàng, nửa miếng ngọc bội của phụ thân lắc lư theo nhịp chân.' : 'Uyển Nhi vẫn đi theo. Nàng không hỏi vì sao lại là Kiếm Mộ. Tiêu Vân cũng không nói.',
    ],
    steps: [
      {
        objective: () => 'Tới cửa hang sau Kiếm Mộ',
        marker: () => TOMB_GATE,
        enter: (g) => {
          g.storyAlly('maiden', 'maiden', 'Lâm Uyển Nhi', 'dagger', { hp: 1300, atk: 54, color: 0xffb0d0 });
          if (g.flags.hanxueAlly) g.storyAlly('hanxue', 'hanxue', 'Hàn Tuyết', 'sword', { hp: 1500, atk: 60, color: 0xbfe6ff });
        },
        done: (g) => near(g, TOMB_GATE.x, TOMB_GATE.z, 12),
      },
      {
        objective: (g) => `Phá vòng canh Vô Diện (${g.killCount('vd4')}/8)`,
        marker: (g) => g.nearestOf('vd4') || P.tomb,
        enter: (g) => {
          vodien(g, 'vd4', [[-10, 8], [10, 8], [-16, -2], [16, -2], [-8, -12], [8, -12], [-4, 16], [4, 16]], TOMB_GATE);
          g.say('maiden', g.flags.toldWaner ? 'Các em! Bỏ kiếm xuống! Ta là con gái của Lâu chủ!' : 'Toàn là trẻ con... công tử, xin ra tay nhẹ thôi.');
        },
        done: (g) => killed(g, 'vd4', 8),
      },
      {
        objective: () => 'Đánh bại Nhất Diện, kẻ gác cửa',
        marker: (g) => g.nearestOf('nhatdien') || TOMB_GATE,
        enter: (g) => g.dialog([
          ['wumian', '(Kẻ đeo mặt nạ trắng trơn bước ra. Cùng dáng đứng, cùng thế kiếm như ở Võ Lâm Đại Hội.)'],
          ['hero', 'Ngươi chưa chết?'],
          ['wumian', 'Kẻ chết trên đài hôm ấy là Nhất Diện thứ hai. Ta là Nhất Diện thứ nhất. Trong lâu, mặt nạ luôn có người đeo tiếp.'],
          ['wumian', 'Lâu chủ đang pha trà. Ông ấy dặn: nếu người tới được đây, thì để người vào. Nhưng ta muốn thử trước.'],
          { run: (g) => g.spawn('wumian', TOMB_GATE.x, TOMB_GATE.z - 8, { group: 'nhatdien', boss: true, name: 'Nhất Diện', lv: lvOf(g, 4), aggro: 90 }) },
        ]),
        done: (g) => killed(g, 'nhatdien', 1),
      },
      {
        objective: () => 'Vào hang, gặp Vô Diện Lâu chủ',
        marker: () => P.tomb,
        done: (g) => near(g, P.tomb.x, P.tomb.z, 10),
      },
      {
        objective: () => 'Đối mặt Vô Diện Lâu chủ',
        marker: () => P.tomb,
        enter: (g) => g.dialog([
          ['thienhai', '(Một người áo xanh đã bạc màu ngồi trước bàn đá. Chiếc mặt nạ trắng che kín cả mặt. Trên bàn có hai chén trà. Một chén đã nguội.)'],
          ['thienhai', 'Ngồi đi. Chén đó ta pha cho sư huynh. Ba năm rồi, ngày nào cũng pha một chén. Ngươi uống thay hắn đi.'],
          ['hero', 'Lâm sư thúc.'],
          ['thienhai', '(im lặng rất lâu) ...Mộ Bạch dạy ngươi gọi ta như thế à.'],
          ['thienhai', 'Mười một người. Ai cũng từng nhận vàng của Tư Đồ Phong. Ai cũng biết chuyện Đồi Gió, chuyện Bạch Vân sơn. Ai cũng im lặng. Ta chỉ trả lại cho họ sự im lặng ấy.'],
          ['thienhai', 'Còn ngươi. Ngươi là đứa bé dưới giếng. Mộ Bạch nhận ngươi, mà không thèm tới hầm rượu cứu ta. Ngươi nói ta nghe xem, như vậy là công bằng sao?'],
          ...(g.flags.toldWaner ? [
            ['maiden', '(bước lên, gỡ nửa miếng ngọc bội trên cổ) Phụ thân.'],
            ['thienhai', '(chén trà trong tay ông khựng lại) ...Uyển Nhi. Ta đã dặn không ai được để con tới đây.'],
            ['maiden', 'Sư bá không thất hẹn. Lá thư của phụ thân chưa từng tới Bạch Vân sơn. Lưu bá bá giữ nó ba năm, vì Minh chủ dọa giết Tiểu Hổ.'],
            ['maiden', '(đặt lá thư lên bàn đá) Sư bá chết mà vẫn nghĩ phụ thân đã quên lời hẹn dưới cây tùng. Phụ thân sống ba năm mà vẫn nghĩ sư bá bỏ rơi người.'],
            ['thienhai', '(hai tay run rẩy mở lá thư, rồi đọc dòng chữ cuối do chính mình viết: "Huynh không tới.")'],
            ['thienhai', '...Hắn không biết. Hắn... không hề biết.'],
          ] : [
            ['hero', '(Tiêu Vân đặt lá thư lên bàn đá, dấu niêm còn nguyên.) Sư phụ chưa từng nhận được nó.'],
            ['thienhai', '(nhìn nét chữ của chính mình, rất lâu) ...Ngươi nói dối.'],
            ['hero', 'Lưu chưởng quỹ giữ nó ba năm. Người của Tư Đồ Phong đứng ở cửa.'],
            ['thienhai', '...Vậy ra, ba năm ta căm hận một người... không hề biết ta còn sống.'],
          ]),
          ['thienhai', '(Ông đứng dậy, rút kiếm. Đó là một thanh kiếm gỗ, mài sắc như thép.) Nhưng mười một người đã chết. Lũ trẻ trong lâu đã cầm kiếm. Ta không quay lại được nữa.'],
          ['thienhai', 'Truyền nhân của Mộ Bạch. Cho ta xem kiếm của sư huynh lần cuối. Nửa kiếm phổ của hắn, đấu với nửa kiếm phổ của ta.'],
          { run: (g) => g.spawn('thienhai', P.tomb.x, P.tomb.z - 6, { group: 'thienhai', boss: true, name: 'Vô Diện Lâu chủ · Lâm Thiên Hải', lv: lvOf(g, 6), aggro: 120 }) },
        ]),
        done: (g) => killed(g, 'thienhai', 1),
      },
      {
        objective: () => 'Quyết định số phận Lâm Thiên Hải',
        marker: () => P.tomb,
        enter: (g) => {
          const canRedeem = g.flags.toldWaner || g.flags.sparedQi || g.karmaVal >= 4;
          g.dialog([
            ['thienhai2', '(Mặt nạ vỡ làm đôi. Dưới đó là một gương mặt cháy sém, chỉ còn đôi mắt là của người xưa.) Thanh Phong Phất Liễu... Mộ Bạch dạy ngươi tốt lắm. Tốt hơn ta dạy lũ trẻ.'],
            ['hero', '(Tiêu Vân lấy ra nửa ngọc bội của sư phụ. Uyển Nhi đặt nửa kia cạnh bên.)'],
            ['hero', '(Hai mảnh ngọc vừa chạm nhau, tấm bia lớn rung lên. Phía sau dòng chữ "Kiếm tại nhân tâm", một ngăn đá nhỏ trượt ra.)'],
            ['hero', '(Bên trong là mảnh ngọc thứ ba, nhỏ hơn, chưa từng được trao. Dưới mảnh ngọc có một tờ giấy, nét chữ sư tổ:)'],
            ['hero', '"Cho Huyết nhi. Khi nào nó quay về, hai sư huynh hãy trao cho nó. Ngọc Thanh Phong vốn là ba mảnh. Ta chỉ dám bẻ hai."'],
            ['thienhai2', '(bật cười, rồi bật khóc) Sư phụ... người đợi hắn quay về. Còn chúng con... chẳng ai đợi ai cả.'],
            { choice: [
              ...(canRedeem ? [{ text: 'Trao ông mảnh ngọc thứ ba: "Sư thúc, vẫn còn người đợi người."', then: (g) => { g.flag('thienhaiRedeemed'); g.karma(2); return [
                ['thienhai2', '(nắm mảnh ngọc rất lâu, rồi quay sang Uyển Nhi) ...Con lớn rồi. Ta còn nhớ con lúc bằng cái bàn này.'],
                ['maiden', '(ôm chầm lấy ông) Phụ thân về nhà đi. Nhà vẫn còn. Trà vẫn còn.'],
                ['thienhai2', 'Ta sẽ tự tới Hội Nghị Giang Hồ, nhận tội với mười một nhà. Lũ trẻ trong lâu... Tiêu Vân, ngươi cho chúng một cái tên được không?'],
              ]; } }] : []),
              { text: 'Giao ông cho Hội Nghị Giang Hồ xét xử', then: (g) => { g.flag('thienhaiJudged'); g.karma(1); return [
                ['thienhai2', '(gật đầu, đưa hai tay ra) Công bằng. Mộ Bạch cũng sẽ làm thế.'],
                ['maiden', g.flags.toldWaner ? '(cắn môi tới bật máu) ...Con sẽ đi cùng phụ thân. Tới đâu cũng đi cùng.' : '(sững người) Công tử... người là... phụ thân?'],
              ]; } },
              { text: 'Một kiếm: "Mười một mạng người. Nợ máu trả bằng máu."', then: (g) => { g.flag('killedThienhai'); g.karma(-3); return [
                ['thienhai2', '(không tránh, chỉ nhìn Uyển Nhi) ...Đừng cầm kiếm, con.'],
                ['maiden', '(Uyển Nhi không khóc. Nàng nhặt nửa miếng ngọc bội của phụ thân lên, đi ra khỏi hang, không ngoái lại.)'],
              ]; } },
            ] },
            { run: (g) => { g.rpg.points += 2; g.player.attackBonus += 6; g.rpg.apply(true); g.path?.addMerit?.(600); g.toast('Ngộ ra <b>Thanh Phong Quy Nhất</b> · Điểm võ học +2 · Công +6', 5); g.finishChapter(); } },
          ]);
        },
      },
    ],
  },

  // ───────────────────────────── VĨ THANH HỒI IV ─────────────────────────────
  {
    id: 'epilogue4',
    han: '尾聲',
    hanSub: '有名',
    title: 'Vĩ Thanh · Hồi IV',
    subtitle: 'Những cái tên',
    time: 'sunrise',
    bg: 'lake',
    spawn: { x: P.pavilion.x + 6, z: P.pavilion.z + 2, yaw: -Math.PI / 2 },
    narration: (g) => {
      const f = g.flags, l = [];
      if (f.thienhaiRedeemed) {
        l.push('Lâm Thiên Hải tự tới Hội Nghị Giang Hồ, quỳ trước mười một nhà suốt ba ngày. Có nhà tha, có nhà không. Ông nhận hết.');
        l.push('Người ta nói ông được tha tội chết, nhưng phải giữ Kiếm Mộ tới cuối đời. Ông bảo, đó vốn là việc ông muốn làm.');
        l.push('Chiều nào cũng có hai chén trà trên bàn đá trong hang. Giờ thì không chén nào nguội nữa: Uyển Nhi lên thăm mỗi tuần.');
      } else if (f.thienhaiJudged) {
        l.push('Hội Nghị Giang Hồ xử Lâm Thiên Hải giam trọn đời ở Thiếu Thất sơn. Ông không kêu oan một lời.');
        l.push('Uyển Nhi mỗi tháng lên núi một lần, mang theo trà hoa nhài. Lính canh bảo, đó là ngày duy nhất ông chịu nói chuyện.');
      } else if (f.killedThienhai) {
        l.push('Vô Diện Lâu tan. Mười một nhà mở tiệc ăn mừng, gửi thiệp mời Tiêu Vân. Chàng không tới.');
        l.push('Uyển Nhi rời trấn Thanh Phong vào một buổi sáng không ai nhớ. Trên bàn đình chỉ để lại một chén trà, và nửa miếng ngọc bội.');
      }
      l.push('Ba mươi hai đứa trẻ trong Vô Diện Lâu được đưa về trấn Thanh Phong. Lưu Đại Phúc mở cửa khách điếm cho chúng ăn ở, không lấy một đồng.');
      if (f.sparedQi) { l.push('Đứa trẻ số bảy xin theo Tiêu Vân học kiếm. Chàng đặt cho nó cái tên đầu tiên trong đời: Tiêu Thất. Như năm xưa có người đã đặt tên cho chàng.'); }
      else if (f.jailedQi) l.push('Đứa trẻ số bảy được thả khỏi ngục khi Vô Diện Lâu tan. Nó không đi theo ai, chỉ ngày ngày ra Đồi Gió quét lá cùng bà lão giữ mộ.');
      else if (f.killedQi) l.push('Trong ba mươi hai cái tên được khắc lên bia ở Đồi Gió, có một chỗ để trống. Tiêu Vân không biết nên khắc gì vào đó.');
      l.push('Tiêu Vân dựng thêm một tấm bia trên Đồi Gió: "Tiêu gia thôn". Ba mươi tám nấm mộ, giờ đã có tên làng.');
      l.push(g.karmaVal >= 4 ? 'Kiếm tại nhân tâm. Có những vết thương không lành, nhưng có thể được gọi tên.' : g.karmaVal <= -3 ? 'Kiếm tại nhân tâm. Kẻ cầm kiếm đã quen với im lặng, như những chiếc mặt nạ năm nào.' : 'Kiếm tại nhân tâm. Mặt nạ rơi rồi, người còn lại phải tự nhận ra mình.');
      return l;
    },
    steps: [
      {
        objective: () => 'Tự do ngao du giang hồ',
        marker: () => null,
        enter: (g) => {
          const f = g.flags;
          const name = f.thienhaiRedeemed ? 'Song ngọc hợp bích' : f.thienhaiJudged ? 'Công đạo không mặt nạ' : 'Một chén trà nguội';
          g.flag('act4Done');
          ensureRuins(g);
          if (f.sparedQi) g.flag('adoptedQi');
          g.toast(`<b>HOÀN · HỒI IV</b><br>Kết cục: <b>${name}</b><br><span class="sm">Đạo tâm ${g.karmaVal >= 0 ? '+' : ''}${g.karmaVal}</span>`, 9);
          g.sys.checkAchievements?.();
          g.save();
        },
        talk: {
          maiden: (g) => [
            g.flags.killedThienhai ? ['maiden', '(Một cô nương lạ đang dọn đình) Lâm cô nương đi rồi. Cô ấy dặn, nếu công tử tới, thì nói rằng... trà trong bình vẫn còn.']
              : g.flags.thienhaiRedeemed ? ['maiden', 'Sáng nay phụ thân gửi xuống một hũ trà, kèm một câu: "Pha cho thằng nhóc của Mộ Bạch một chén." Công tử, ngồi đi.']
              : ['maiden', 'Tháng này con lên Thiếu Thất sơn rồi. Phụ thân hỏi thăm công tử. Lần đầu tiên người gọi công tử là "Vân nhi".'],
            ['maiden', 'Đêm qua trên Kiếm Mộ hiện ra một bậc thang ánh sáng xuyên mây. Người ta gọi là Thiên Thê. Nghe nói sư bá năm xưa đã leo tới tầng thứ một trăm...'],
            { choice: [
              { text: 'Bước lên Thiên Thê (Hồi V · 100 tầng, tới cấp 1999)', then: (g) => { g.finishChapter(); } },
              { text: 'Để sau.', then: () => [['maiden', 'Khi nào công tử muốn leo, cứ nói với tiểu nữ.']] },
            ] },
          ],
          keeper: (g) => [['keeper', g.flags.sparedQi ? 'Tiểu Thất với Tiểu Hổ lại đánh nhau sau bếp rồi! Đại hiệp, người dạy đồ đệ kiểu gì thế!' : 'Lũ trẻ ăn khoẻ lắm, đại hiệp. Nhưng lão chưa bao giờ thấy khách điếm vui như bây giờ.']],
        },
      },
    ],
  },
];
