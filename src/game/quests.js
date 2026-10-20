/**
 * Nhiệm vụ + hội thoại. Mỗi NPC có hàm talk(game) trả về danh sách câu thoại theo tiến độ.
 * Trạng thái nhiệm vụ: undefined (chưa nhận) -> 'active' -> 'ready' (xong, chờ trả) -> 'done'.
 */
export const QUESTS = {
  bandits: {
    title: 'Diệt trừ Hắc Phong trại',
    giver: 'Lưu chưởng quỹ',
    steps: (q) => [
      `Hạ sơn tặc: ${Math.min(q.kills, 6)}/6`,
      q.boss ? 'Đã hạ Hắc Phong trại chủ Đồ Bá' : 'Hạ Hắc Phong trại chủ Đồ Bá (phía bắc trấn)',
    ],
    isReady: (q) => q.kills >= 6 && q.boss,
  },
  sword: {
    title: 'Thanh kiếm của phụ thân',
    giver: 'Lâm Uyển Nhi',
    steps: (q) => [q.found ? 'Đã tìm thấy Bích Thủy kiếm' : 'Tìm rương gỗ trong rừng trúc (tây bắc)'],
    isReady: (q) => q.found,
  },
};

export class QuestLog {
  constructor() {
    this.state = {};
    this.data = { bandits: { kills: 0, boss: false }, sword: { found: false } };
  }

  status(id) { return this.state[id]; }

  accept(id) { this.state[id] = 'active'; }

  refresh() {
    for (const id in QUESTS) {
      if (this.state[id] === 'active' && QUESTS[id].isReady(this.data[id])) this.state[id] = 'ready';
    }
  }

  complete(id) { this.state[id] = 'done'; }

  /** Dòng hiển thị bên phải màn hình. */
  tracker() {
    const out = [];
    for (const id in QUESTS) {
      const s = this.state[id];
      if (!s || s === 'done') continue;
      const q = QUESTS[id];
      const lines = s === 'ready' ? [`Quay về gặp ${q.giver}`] : q.steps(this.data[id]);
      out.push({ title: q.title, lines, ready: s === 'ready' });
    }
    return out;
  }

  journal() {
    const parts = [];
    for (const id in QUESTS) {
      const s = this.state[id];
      if (!s) continue;
      const q = QUESTS[id];
      const tag = s === 'done' ? ' (đã hoàn thành)' : s === 'ready' ? ' (chờ báo lại)' : '';
      parts.push(`<p><b>${q.title}</b>${tag}<br>${s === 'done' ? '' : q.steps(this.data[id]).join('<br>')}</p>`);
    }
    return parts.length ? parts.join('') : '<p>Chưa nhận nhiệm vụ nào. Hãy ghé Duyệt Lai khách điếm hỏi chuyện.</p>';
  }
}

/** Kịch bản thoại theo NPC. */
export const DIALOGUE = {
  innkeeper(game) {
    const s = game.quests.status('bandits');
    const n = 'Lưu chưởng quỹ';
    if (!s) return [
      [n, 'Khách quan, mời vào mời vào! Trà nóng, rượu ngon, phòng sạch, bổn điếm có đủ cả.'],
      [n, 'Có điều... dạo này trấn Thanh Phong không được yên. Bọn sơn tặc Hắc Phong trại ở rừng phía bắc ngày càng lộng hành.'],
      [n, 'Tháng trước chúng cướp sạch đoàn tiêu của Uy Viễn tiêu cục, tuần này lại bắt mất hai thôn dân lên núi.'],
      [n, 'Nhìn thanh kiếm bên hông khách quan, chắc hẳn là người trong võ lâm. Nếu khách quan chịu ra tay trừ hại cho dân lành...'],
      [n, 'Hạ sáu tên lâu la và tên trại chủ Đồ Bá, lão phu xin đem hết vốn liếng ra hậu tạ!', () => game.acceptQuest('bandits')],
    ];
    if (s === 'active') return [[n, 'Đường lên Hắc Phong trại cứ theo lối mòn phía đông trấn mà đi về hướng bắc. Khách quan bảo trọng!']];
    if (s === 'ready') return [
      [n, 'Trời ơi! Khách quan thật sự đã dẹp yên Hắc Phong trại rồi sao?!'],
      [n, 'Ân đức này cả trấn Thanh Phong không dám quên. Đây là cuốn "Thanh Phong kiếm phổ" do tổ tiên lão phu để lại, xin khách quan nhận cho.', () => game.completeQuest('bandits')],
    ];
    return [[n, 'Đại hiệp đến rồi! Tiểu nhị, mang bình rượu ngon nhất ra đây, hôm nay bổn điếm mời!']];
  },

  maiden(game) {
    const s = game.quests.status('sword');
    const n = 'Lâm Uyển Nhi';
    if (!s) return [
      [n, '...Ngươi là ai? À, xin lỗi, tiểu nữ thất lễ rồi.'],
      [n, 'Phụ thân tiểu nữ vốn là kiếm khách. Trước khi mất, người giấu thanh Bích Thủy kiếm trong một chiếc rương gỗ giữa rừng trúc phía tây bắc.'],
      [n, 'Nhưng giờ trong rừng có bọn sơn tặc qua lại, tiểu nữ không dám vào. Thiếu hiệp có thể giúp tiểu nữ mang thanh kiếm về không?', () => game.acceptQuest('sword')],
    ];
    if (s === 'active') return [[n, 'Rừng trúc ở phía tây bắc, đi theo lối mòn sau đình là tới. Thiếu hiệp cẩn thận bọn sơn tặc.']];
    if (s === 'ready') return [
      [n, 'Đây... đúng là Bích Thủy kiếm của phụ thân rồi!'],
      [n, 'Phụ thân từng dạy tiểu nữ khẩu quyết khinh công "Lăng Ba Vi Bộ". Thiếu hiệp tâm địa tốt, tiểu nữ xin truyền lại cho người.'],
      [n, '(Đã học Lăng Ba Vi Bộ: giữ Shift để chạy trên mặt nước, tốn nội lực.)', () => game.completeQuest('sword')],
    ];
    return [[n, 'Gió trên hồ Bích Thủy hôm nay thật dịu. Thiếu hiệp có muốn ngồi lại uống chén trà không?']];
  },

  villager(game) {
    const lines = [
      ['Thôn dân', 'Nghe nói Lưu chưởng quỹ đang tìm người dẹp bọn sơn tặc đấy.'],
      ['Thôn dân', 'Cô nương họ Lâm ngày nào cũng ra đình bên hồ ngồi một mình...'],
      ['Thôn dân', 'Rừng trúc tây bắc đẹp lắm, nhưng giờ chẳng ai dám vào.'],
    ];
    return [lines[Math.floor(Math.random() * lines.length)]];
  },
};
