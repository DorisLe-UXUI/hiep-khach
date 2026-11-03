import { LANG } from '../i18n.js';

// Mục tiêu nhiệm vụ → [tiếng Anh, tiếng Trung]. Số trong câu thay bằng '#', điền lại theo thứ tự.
const OBJ = {
  'Đi tới cổng trấn Thanh Phong': ['Walk to the gate of Pure Wind Town', '前往清風鎮鎮門'],
  'Nói chuyện với lão gác cổng': ['Talk to the old gatekeeper', '與守門老伯交談'],
  'Tới Duyệt Lai khách điếm': ['Go to the Welcome Inn', '前往悅來客棧'],
  'Nói chuyện với Lưu chưởng quỹ': ['Talk to Innkeeper Liu', '與劉掌櫃交談'],
  'Đánh đuổi sơn tặc quấy phá quảng trường (#/#)': ['Drive off the bandits in the square (#/#)', '趕走廣場上鬧事的山賊（#/#）'],
  'Quay lại gặp Lưu chưởng quỹ': ['Go back to Innkeeper Liu', '回去找劉掌櫃'],
  'Tìm Lâm Uyển Nhi ở Vọng Nguyệt đình bên hồ': ["Find Lin Wan'er at the Moonwatch Pavilion by the lake", '到湖邊望月亭找林婉兒'],
  'Tới rừng trúc phía tây bắc': ['Go to the bamboo forest in the northwest', '前往西北竹林'],
  'Hạ thám báo Hắc Phong trại (#/#)': ['Defeat the Black Wind scouts (#/#)', '擊敗黑風寨探子（#/#）'],
  'Mở rương gỗ giữa rừng trúc': ['Open the wooden chest in the bamboo forest', '打開竹林中的木箱'],
  'Mang Bích Thủy kiếm về cho Lâm Uyển Nhi': ["Bring the Jade Water Sword back to Lin Wan'er", '把碧水劍帶回給林婉兒'],
  'Tiến về Hắc Phong trại ở phía bắc': ['Head north to the Black Wind Camp', '向北前往黑風寨'],
  'Đánh tan sơn tặc trong trại (#/#)': ['Rout the bandits in the camp (#/#)', '擊潰寨中山賊（#/#）'],
  'Giải cứu thôn dân bị giam (#/#)': ['Free the captive villagers (#/#)', '救出被關押的村民（#/#）'],
  'Hạ trại chủ Đồ Bá': ['Defeat the camp chief Tu Ba', '擊敗寨主屠霸'],
  'Tra hỏi Đồ Bá': ['Question Tu Ba', '審問屠霸'],
  'Tìm thanh kiếm cũ trong đại sảnh trại': ['Find the old sword in the camp hall', '在寨中大廳找到舊劍'],
  'Đối chất Lưu chưởng quỹ': ['Confront Innkeeper Liu', '與劉掌櫃對質'],
  'Chạy tới Vọng Nguyệt đình, bảo vệ Uyển Nhi!': ["Run to the Moonwatch Pavilion and protect Wan'er!", '趕往望月亭，保護婉兒！'],
  'Hạ Huyết Ảnh sát thủ (#/#)': ['Defeat the Blood Shadow assassins (#/#)', '擊敗血影殺手（#/#）'],
  'Đánh bại Tả sứ Hàn Băng': ['Defeat the Left Envoy Han Bing', '擊敗左使寒冰'],
  'Nói chuyện với Uyển Nhi': ["Talk to Wan'er", '與婉兒交談'],
  'Ghé khách điếm chuẩn bị trước khi lên núi': ['Stop at the inn to prepare before the climb', '上山前先到客棧準備'],
  'Leo lên Kiếm Mộ': ['Climb to the Sword Tomb', '登上劍冢'],
  'Hạ hộ vệ Huyết Ảnh Môn (#/#)': ['Defeat the Blood Shadow guards (#/#)', '擊敗血影門護衛（#/#）'],
  'Mở Kiếm Mộ': ['Open the Sword Tomb', '開啟劍冢'],
  'Đối mặt Mộ Dung Huyết': ['Face Murong Xue', '直面慕容血'],
  'Tự do ngao du giang hồ': ['Roam the jianghu freely', '自由遨遊江湖'],
  'Theo vệt máu vào Hàn Băng Cốc': ['Follow the blood trail into Frost Valley', '循血跡進入寒冰谷'],
  'Dẹp yêu quái băng tuyết chặn đường (#/#)': ['Clear the ice monsters blocking the way (#/#)', '清除擋路的冰雪妖怪（#/#）'],
  'Đánh bại người con gái áo trắng': ['Defeat the woman in white', '擊敗白衣女子'],
  'Quyết định số phận Hàn Tuyết': ['Decide the fate of Han Xue', '決定寒雪的命運'],
  'Lẻn vào Yêu Ma Cốc': ['Sneak into Demon Valley', '潛入妖魔谷'],
  'Phá tế đàn phía đông (#/# hộ đàn) · còn # tế đàn': ['Destroy the east altar (#/# guardians) · # altars left', '摧毀東面祭壇（#/# 護壇）· 剩 # 座祭壇'],
  'Phá tế đàn phía tây (#/# hộ đàn) · còn # tế đàn': ['Destroy the west altar (#/# guardians) · # altars left', '摧毀西面祭壇（#/# 護壇）· 剩 # 座祭壇'],
  'Phá tế đàn phía nam (#/# hộ đàn) · còn # tế đàn': ['Destroy the south altar (#/# guardians) · # altars left', '摧毀南面祭壇（#/# 護壇）· 剩 # 座祭壇'],
  'Đánh bại Huyết Ảnh Hữu sứ Hồng Liên': ['Defeat Hong Lian, Right Envoy of the Blood Shadow', '擊敗血影右使紅蓮'],
  'Trò chuyện với Hồng Liên': ['Talk with Hong Lian', '與紅蓮交談'],
  'Quyết định số phận Hồng Liên': ['Decide the fate of Hong Lian', '決定紅蓮的命運'],
  'Leo lên Hỏa Diệm Sơn': ['Climb Flame Mountain', '登上火焰山'],
  'Hạ hộ pháp Huyết Ảnh canh giữ đỉnh núi (#/#)': ['Defeat the Blood Shadow wardens on the summit (#/#)', '擊敗守護山頂的血影護法（#/#）'],
  'Đánh bại Huyết Ma': ['Defeat the Blood Fiend', '擊敗血魔'],
  'Quyết định số phận Huyết Phách': ['Decide the fate of Xue Po', '決定血魄的命運'],
  'Hái Linh chi thảo cho Tiểu Hổ (#/#)': ['Pick Lingzhi herbs for Xiaohu (#/#)', '為小虎採靈芝草（#/#）'],
  'Nói chuyện với Tiểu Hổ': ['Talk to Xiaohu', '與小虎交談'],
  'Mang Lồng bánh bao ×# (#/#) và Bộ trà sứ ×# (#/#)': ['Bring Bun Steamer ×# (#/#) and Porcelain Tea Set ×# (#/#)', '帶來包子蒸籠 ×#（#/#）和瓷茶具 ×#（#/#）'],
  'Tìm kiếm phổ tàn trang khắp bản đồ (#/#) · trang phát sáng trắng': ['Find the lost manual pages across the map (#/#) · pages glow white', '在地圖各處尋找劍譜殘頁（#/#）· 殘頁發出白光'],
  'Mang đủ # trang về cho Lưu chưởng quỹ': ['Bring all # pages to Innkeeper Liu', '把 # 頁全部交給劉掌櫃'],
  'Tới Vọng Nguyệt đình': ['Go to the Moonwatch Pavilion', '前往望月亭'],
  'Mang kiếm về cho Vương lão bá': ['Bring the sword back to Elder Wang', '把劍帶回給王老伯'],
  'Quay về Hàn Băng Cốc gặp Hàn Tuyết': ['Return to Frost Valley to see Han Xue', '回寒冰谷見寒雪'],
  'Tới Võ Lâm Đại Hội ở đông nam trấn': ['Go to the Martial Assembly southeast of town', '前往鎮東南的武林大會'],
  'Ra mắt Minh chủ Tư Đồ Phong': ['Meet Alliance Leader Situ Feng', '拜見盟主司徒鋒'],
  'Luận võ: đánh bại các cao thủ (#/#)': ['Tournament: defeat the masters (#/#)', '論武：擊敗各派高手（#/#）'],
  'Chung kết: đánh bại Vô Diện': ['Final: defeat the Faceless', '決賽：擊敗無面'],
  'Nói chuyện với Minh chủ': ['Talk to the Alliance Leader', '與盟主交談'],
  'Leo lên Kiếm Mộ kiểm tra kiếm phổ': ['Climb to the Sword Tomb and check the manual', '登上劍冢查看劍譜'],
  'Hạ đám hắc y nhân đang đào mộ (#/#)': ['Defeat the men in black robbing the tomb (#/#)', '擊敗盜墓的黑衣人（#/#）'],
  'Tra hỏi hắc y nhân còn sống': ['Question the surviving man in black', '審問倖存的黑衣人'],
  'Tới tổng đàn Võ Lâm Minh (Hắc Phong trại cũ)': ['Go to the Alliance headquarters (the old Black Wind Camp)', '前往武林盟總壇（舊黑風寨）'],
  'Phá vòng Minh vệ (#/#)': ['Break through the Alliance guards (#/#)', '突破盟衛（#/#）'],
  'Đánh bại Tư Đồ Phong': ['Defeat Situ Feng', '擊敗司徒鋒'],
  'Quyết định số phận Võ Lâm Minh': ['Decide the fate of the Martial Alliance', '決定武林盟的命運'],
  'Quay lại gặp Đồ Bá': ['Go back to Tu Ba', '回去找屠霸'],
};

/** Dịch câu mục tiêu theo ngôn ngữ đang chọn (giữ nguyên nếu chưa có bản dịch). */
export function trObjective(t) {
  if (!t || LANG === 'vi') return t;
  const nums = t.match(/\d+/g) || [];
  const row = OBJ[t.replace(/\d+/g, '#')];
  if (!row) return t;
  let k = 0;
  return row[LANG === 'en' ? 0 : 1].replace(/#/g, () => nums[k++] ?? '');
}
