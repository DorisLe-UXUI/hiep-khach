/** Danh hiệu: mở khoá theo thành tích, đeo 1 danh hiệu để nhận chỉ số. */
export const TITLES = [
  { id: 'newbie', name: 'Giang hồ tân tú', han: '江湖新秀', color: '#c8c8c8', cond: () => true, req: 'Có sẵn', stats: { hp: 20 } },
  { id: 'slayer', name: 'Bách nhân trảm', han: '百人斬', color: '#6fd86a', cond: (s) => s.stats.kills >= 100, req: 'Hạ 100 kẻ địch', stats: { atk: 4 } },
  { id: 'reaper', name: 'Thiên nhân địch', han: '千人敵', color: '#4aa8ff', cond: (s) => s.stats.kills >= 1000, req: 'Hạ 1000 kẻ địch', stats: { atk: 12, crit: 0.02 } },
  { id: 'combo', name: 'Liên hoàn kiếm', han: '連環劍', color: '#4aa8ff', cond: (s) => (s.stats.bestCombo || 0) >= 50, req: 'Đạt liên kích 50', stats: { crit: 0.04 } },
  { id: 'hunter', name: 'Liệp ma nhân', han: '獵魔人', color: '#c070ff', cond: (s) => (s.stats.elites || 0) >= 10, req: 'Hạ 10 quái tinh anh', stats: { atk: 8, hp: 80 } },
  { id: 'collector', name: 'Thần binh chủ', han: '神兵主', color: '#ffa030', cond: (s) => (s.stats.legend || 0) >= 1, req: 'Sở hữu trang bị Truyền thuyết', stats: { atk: 10, def: 0.03 } },
  { id: 'fisher', name: 'Ngư ông', han: '漁翁', color: '#6fd86a', cond: (s) => (s.stats.life || 0) >= 20, req: 'Thu hoạch 20 lần sinh hoạt', stats: { mp: 40 } },
  { id: 'rich', name: 'Phú giáp nhất phương', han: '富甲一方', color: '#ffd27a', cond: (s, g) => g.rpg.gold >= 3000, req: 'Có 3000 lượng bạc', stats: { hp: 60, mp: 30 } },
  { id: 'master', name: 'Chân truyền đệ tử', han: '真傳弟子', color: '#c070ff', cond: (s) => s.master && s.master.done.length >= 4, req: 'Xuất sư', stats: { atk: 6, mp: 30 } },
  { id: 'tamer', name: 'Ngự thú sư', han: '御獸師', color: '#6fd86a', cond: (s) => (s.stats.tamed || 0) >= 3, req: 'Thu phục 3 thú hoang', stats: { hp: 50, atk: 3 } },
  { id: 'beastking', name: 'Bách thú vương', han: '百獸王', color: '#ffa030', cond: (s) => (s.stats.beasts || 0) >= 10, req: 'Sở hữu 10 thú', stats: { atk: 10, spd: 0.04, hp: 100 } },
  { id: 'fury', name: 'Nộ hải cuồng đao', han: '怒海狂刀', color: '#ff6a5a', cond: (s) => (s.stats.bursts || 0) >= 20, req: 'Bộc phát nộ khí 20 lần', stats: { atk: 8, spd: 0.03 } },
];
