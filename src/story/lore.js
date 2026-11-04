import * as THREE from 'three';
import { PLACES } from '../world/layout.js';

/**
 * Thanh Phong kiếm phổ tàn trang: 12 trang rải khắp bản đồ, mỗi trang kể một đoạn lịch sử
 * của kiếm phái và những người trong truyện. Tới gần là nhặt; đã nhặt lưu ở g.sys.s.lore.
 */
const P = PLACES;
export const LORE = [
  { at: [P.square.x + 18, P.square.z - 14], title: 'Sư tổ Thanh Phong Tử', text: 'Bốn mươi năm trước, Thanh Phong Tử dựng kiếm phái bên hồ Bích Thủy. Ông nhận đệ tử không xem gia thế, chỉ hỏi một câu: "Ngươi cầm kiếm để làm gì?"' },
  { at: [P.gate.x - 14, P.gate.z + 8], title: 'Ba đứa trẻ dưới gốc tùng', text: 'Ba đệ tử giỏi nhất: Lý Mộ Bạch trầm tĩnh, Lâm Thiên Hải cương trực, Mộ Dung Huyết thông minh nhất. Mùa đông năm ấy, ba đứa trẻ còn chia nhau một chiếc bánh nướng dưới gốc tùng.' },
  { at: [P.pavilion.x - 4, P.pavilion.z - 12], title: 'Câu hỏi không lời đáp', text: '"Kiếm để bảo vệ", Mộ Bạch đáp. "Kiếm để giữ đạo", Thiên Hải đáp. Mộ Dung Huyết im lặng rất lâu, rồi nói: "Kiếm để không ai bắt nạt được con nữa." Sư phụ không nói gì, chỉ thở dài.' },
  { at: [P.bamboo.x + 30, P.bamboo.z + 20], title: 'Đứa trẻ bị bắt nạt', text: 'Mộ Dung Huyết vốn là con của một tội thần, cả nhà bị lưu đày. Lúc vào kiếm phái, trên lưng hắn còn những vết roi. Hắn học kiếm nhanh hơn ai hết, như thể sợ một ngày lại bị đuổi đi.' },
  { at: [P.camp.x - 30, P.camp.z + 30], title: 'Huyết Ảnh chưởng', text: 'Trong tàng kinh các có một quyển sách bị niêm phong: Huyết Ảnh chưởng, hút tinh huyết người khác để tăng công lực. Sư tổ niêm phong nó vì một lý do: chưởng này mạnh lên theo lòng hận của người luyện.' },
  { at: [P.tomb.x + 20, P.tomb.z + 26], title: 'Đêm trục xuất', text: 'Mộ Dung Huyết mười chín tuổi bị phát hiện lén luyện Huyết Ảnh chưởng. Hôm đó tuyết rơi. Lý Mộ Bạch quỳ xin sư phụ tha cho sư đệ. Sư phụ vẫn đuổi. Mộ Dung Huyết không ngoái lại.' },
  { at: [-78, -18], title: 'Ngọc bội tách đôi', text: 'Trước khi mất, sư tổ bẻ miếng ngọc bội Thanh Phong làm đôi, trao cho hai đệ tử còn lại. "Khi nào hai đứa còn tin nhau, Kiếm Mộ sẽ mở." Hai người chia tay ở cổng núi, hẹn mười năm gặp lại.' },
  { at: [150, 70], title: 'Lời hẹn không thành', text: 'Mười năm sau, Lâm Thiên Hải về hồ Bích Thủy lập gia đình, Lý Mộ Bạch lên Bạch Vân sơn ở ẩn. Cả hai đều không tới chỗ hẹn. Mỗi người đều nghĩ người kia đã quên.' },
  { at: [-112, 150], title: 'Hai tỷ muội họ Hàn', text: 'Ở Hàn Băng Cốc có hai tỷ muội mồ côi. Cô em mắc hàn độc từ nhỏ. Người duy nhất có thuốc giải là Huyết Ảnh Môn. Cô chị đổi mười năm tự do lấy mạng sống của em.' },
  { at: [150, -90], title: 'Đóa sen trong bùn', text: 'Năm đói kém, Mộ Dung Huyết nhặt một bé gái trong đống xác ở biên trấn. Hắn đặt tên nàng là Hồng Liên. Đó là lần duy nhất người ta thấy hắn khóc.' },
  { at: [-40, -200], title: 'Người chưởng quỹ', text: 'Lưu Đại Phúc chưa từng cầm kiếm. Ba năm làm tai mắt cho kẻ ác, đêm nào ông cũng thắp hương xin lỗi Lâm đại hiệp. Ông không biết rằng người chết không cần lời xin lỗi, người sống mới cần.' },
  { at: [200, -160], title: 'Trang cuối', text: 'Trang cuối kiếm phổ không có chiêu thức. Chỉ có nét chữ run run của sư tổ lúc lâm chung: "Kiếm tại nhân tâm. Tâm chính, kiếm chính. Ta dạy được kiếm, không dạy được tâm. Ba đứa, ta xin lỗi."' },
  // Hồi IV: "Vô Diện thủ ký", mấy trang Lâm Thiên Hải viết trong ba năm ẩn mặt (hiện sau Chương Thập Tam)
  { req: 16, at: [P.inn.x - 12, P.inn.z - 9], title: 'Vô Diện thủ ký · Hầm rượu', text: 'Ngày thứ nhất: sư huynh sẽ tới. Ngày thứ ba: đường Bạch Vân sơn xa, sư huynh sẽ tới. Ngày thứ năm: ta khắc vạch lên tường để đếm. Ngày thứ bảy: ta không khắc nữa.' },
  { req: 16, at: [162, 84], title: 'Vô Diện thủ ký · Thanh kiếm gỗ', text: 'Tay phải ta không cầm nổi thép nữa, chưởng độc ăn vào gân. Ta gọt một thanh kiếm gỗ. Thanh Phong Phất Liễu dùng kiếm gỗ vẫn giết được người. Sư phụ, người nói đúng: kiếm không ở trong tay.' },
  { req: 16, at: [-92, 122], title: 'Vô Diện thủ ký · Đứa trẻ thứ nhất', text: 'Đứa đầu tiên ta nhặt ở bờ hồ, mặt bỏng giống ta. Nó sợ nhìn nước. Ta làm cho nó một chiếc mặt nạ, rồi làm cho mình một chiếc. Đêm ấy nó ngủ được. Ta thì không.' },
  { req: 16, at: [P.tomb.x - 16, P.tomb.z + 12], title: 'Vô Diện thủ ký · Chén trà thứ hai', text: 'Ngày nào ta cũng pha hai chén. Uyển Nhi thích trà hoa nhài, sư huynh thích trà đặc không đường. Ta không biết vì sao ta pha chén của sư huynh, mà không dám pha chén của con gái mình.' },
];

export class Lore {
  constructor(g) { this.g = g; this.items = []; this.t = 0; }
  get got() { const s = this.g.sys.s; s.lore ??= []; return s.lore; }
  count() { return this.got.length; }
  /** số trang của 12 trang kiếm phổ gốc (Kỳ duyên tàn trang chỉ tính 12 trang này) */
  countBase() { return this.got.filter((i) => !LORE[i]?.req).length; }
  /** trang mở theo tiến độ truyện (req = chỉ số chương đã mở) */
  open(i) { return (LORE[i].req || 0) <= (this.g.unlockedChapter || 0); }

  async build() {
    const g = this.g;
    const mat = new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe8a0, emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide });
    const rod = new THREE.MeshStandardMaterial({ color: 0x7a4a20, roughness: 0.5, emissive: 0x3a2008 });
    // quầng sáng cộng màu thay đèn điểm (12 đèn điểm làm nặng mọi shader và dịch lại khi nhặt trang)
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const cg = c.getContext('2d'), gr = cg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(0.35, 'rgba(255,225,150,.35)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
    cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64);
    const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    LORE.forEach((L, i) => {
      const [x, z] = L.at;
      // cuộn giấy nhỏ: tờ giấy cong + hai trục gỗ, lơ lửng phát sáng
      const grp = new THREE.Group();
      const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16, 1, true, 0, Math.PI * 1.3), mat);
      paper.rotation.z = Math.PI / 2;
      grp.add(paper);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8), rod);
      r.rotation.z = Math.PI / 2;
      grp.add(r);
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(2.2);
      grp.add(glow);
      const y = g.terrain.heightAt(x, z) + 1.1;
      grp.position.set(x, y, z);
      grp.userData = { i, base: y };
      grp.visible = !this.got.includes(i) && this.open(i);
      g.scene.add(grp);
      this.items.push(grp);
    });
  }

  nearest() {
    const p = this.g.player.pos;
    let best = null, bd = 1e9;
    for (const it of this.items) {
      if (!it.visible) continue;
      const d = it.position.distanceTo(p);
      if (d < bd) { bd = d; best = { x: it.position.x, z: it.position.z }; }
    }
    return best;
  }

  update(dt) {
    const g = this.g, p = g.player.pos;
    this.t += dt;
    for (const it of this.items) {
      if (!it.visible) {
        // trang Hồi IV hiện ra khi truyện tới nơi
        if (LORE[it.userData.i].req && !this.got.includes(it.userData.i) && this.open(it.userData.i)) it.visible = true;
        continue;
      }
      it.rotation.y += dt * 1.2;
      it.position.y = it.userData.base + Math.sin(this.t * 2 + it.userData.i) * 0.15;
      if (Math.random() < 0.08) g.fx?.sparkle?.(it.position, 0xfff0c0);
      if (!g.dialogOpen && it.position.distanceTo(p) < 2.2) this.collect(it);
    }
  }

  collect(it) {
    const g = this.g, i = it.userData.i, L = LORE[i];
    it.visible = false;
    if (!this.got.includes(i)) this.got.push(i);
    g.audio?.chime?.();
    g.fx?.burst?.(it.position.clone(), 0xfff0c0, 30);
    if (L.req) {
      const n = this.got.filter((k) => LORE[k]?.req).length, total = LORE.filter((x) => x.req).length;
      g.dialog([
        ['Vô Diện thủ ký', `(${L.title.split(' · ')[1]}) ${L.text}`],
        { run: () => { g.toast(`<span class="han">手記</span> Vô Diện thủ ký <b>${n}/${total}</b>`, 2.5); if (n === total) { g.player.storyHp += 50; g.player.storyMp += 50; g.rpg.points += 1; g.rpg.apply(true); g.toast('Đã đọc trọn Vô Diện thủ ký · Khí huyết +50 · Nội lực +50 · Điểm võ học +1', 4); } g.save(); } },
      ]);
      return;
    }
    g.dialog([
      ['Kiếm phổ tàn trang', `(Trang ${i + 1}/12 · ${L.title}) ${L.text}`],
      { run: () => { g.toast(`<span class="han">殘頁</span> Kiếm phổ tàn trang <b>${this.countBase()}/12</b>`, 2.5); if (this.countBase() === 6) { g.rpg.points += 1; g.toast('Đã gom 6 trang · Điểm võ học +1', 3); } g.save(); } },
    ]);
  }
}
