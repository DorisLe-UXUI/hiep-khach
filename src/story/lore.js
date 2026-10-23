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
];

export class Lore {
  constructor(g) { this.g = g; this.items = []; this.t = 0; }
  get got() { const s = this.g.sys.s; s.lore ??= []; return s.lore; }
  count() { return this.got.length; }

  async build() {
    const g = this.g;
    const mat = new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe8a0, emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide });
    const rod = new THREE.MeshStandardMaterial({ color: 0x7a4a20, roughness: 0.5 });
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
      const light = new THREE.PointLight(0xffe8b0, 3, 6);
      light.position.y = 0.3;
      grp.add(light);
      const y = g.terrain.heightAt(x, z) + 1.1;
      grp.position.set(x, y, z);
      grp.userData = { i, base: y };
      grp.visible = !this.got.includes(i);
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
      if (!it.visible) continue;
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
    g.dialog([
      ['Kiếm phổ tàn trang', `(Trang ${i + 1}/12 · ${L.title}) ${L.text}`],
      { run: () => { g.toast(`<span class="han">殘頁</span> Kiếm phổ tàn trang <b>${this.count()}/12</b>`, 2.5); if (this.count() === 6) { g.rpg.points += 1; g.toast('Đã gom 6 trang · Điểm võ học +1', 3); } g.save(); } },
    ]);
  }
}
