// Bố cục bản đồ (đơn vị: mét). x đông-tây, z bắc(-)/nam(+).
export const WORLD_SIZE = 800;
export const WATER_LEVEL = -0.6;

export const PLACES = {
  spawn: { x: 30, z: 128 },
  square: { x: 30, z: 40, r: 26 },          // quảng trường Thanh Phong trấn
  inn: { x: 30, z: 6 },                       // khách điếm Duyệt Lai
  gate: { x: 30, z: 98 },                     // cổng trấn
  lake: { x: -125, z: 50, r: 62 },            // hồ Bích Thủy
  pavilion: { x: -56, z: 52 },                // đình ven hồ
  camp: { x: 48, z: -200, r: 38 },            // Hắc Phong trại
  bamboo: { x: -150, z: -105, r: 48 },        // rừng trúc
  chest: { x: -168, z: -118 },
  tomb: { x: -222, z: -205 },                 // Kiếm Mộ trên núi tây
  cages: [[30, -186], [66, -186]],            // lồng giam trong trại
  home: { x: -28, z: 116 },                   // gia viên
  battle: { x: 132, z: 150 },                 // chiến trường
};

/** Các vùng san phẳng: [x, z, bán kính, độ cao, độ mềm biên] */
export const FLATTEN = [
  [PLACES.square.x, PLACES.square.z + 15, 78, 4.0, 28],
  [PLACES.pavilion.x, PLACES.pavilion.z, 16, 1.0, 14],
  [PLACES.camp.x, PLACES.camp.z, 46, null, 22],
  [PLACES.chest.x, PLACES.chest.z, 8, null, 10],
  [PLACES.tomb.x, PLACES.tomb.z, 30, null, 26],
  [PLACES.home.x, PLACES.home.z, 16, null, 14],
  [PLACES.battle.x, PLACES.battle.z, 30, 4.5, 20],
];

/** Đường đất: polyline, mỗi điểm [x, z]; width (m) */
export const PATHS = [
  { width: 5, pts: [[30, 160], [30, 128], [30, 98], [30, 70], [30, 40]] },
  { width: 4, pts: [[30, 40], [0, 46], [-30, 52], [-50, 52]] },
  { width: 4, pts: [[30, 40], [72, 38], [96, -10], [92, -70], [70, -130], [54, -168], [48, -200]] },
  { width: 3, pts: [[-30, 52], [-60, 10], [-90, -40], [-130, -85], [-160, -112]] },
  { width: 3, pts: [[-160, -112], [-180, -140], [-196, -165], [-212, -185], [-222, -205]] },
];

/** Nhà dân trong trấn: x, z, rộng, sâu, hướng (rad) */
export const HOUSES = [
  [-8, 26, 9, 7, Math.PI / 2],
  [68, 22, 10, 7, -Math.PI / 2],
  [-6, 64, 9, 7, Math.PI / 2],
  [70, 62, 9, 8, -Math.PI / 2],
  [8, 86, 8, 6, 0],
  [54, 86, 8, 6, 0],
];
