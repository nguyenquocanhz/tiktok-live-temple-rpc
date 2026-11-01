/**
 * Kinh Tụng Tập Thể — văn bản phiên âm Hán Việt truyền thống, chia dòng ngắn cho chữ chạy kiểu karaoke.
 * Mỗi buổi tụng luôn kết thúc bằng bài Hồi Hướng.
 */
const SUTRAS = [
  {
    key: 'batNha',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    lines: [
      'Ma Ha Bát Nhã Ba La Mật Đa Tâm Kinh.',
      'Quán Tự Tại Bồ Tát, hành thâm Bát Nhã Ba La Mật Đa thời,',
      'chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.',
      'Xá Lợi Tử, sắc bất dị không, không bất dị sắc,',
      'sắc tức thị không, không tức thị sắc, thọ tưởng hành thức diệc phục như thị.',
      'Xá Lợi Tử, thị chư pháp không tướng, bất sanh bất diệt,',
      'bất cấu bất tịnh, bất tăng bất giảm.',
      'Thị cố không trung vô sắc, vô thọ tưởng hành thức,',
      'vô nhãn nhĩ tỷ thiệt thân ý, vô sắc thanh hương vị xúc pháp,',
      'vô nhãn giới nãi chí vô ý thức giới.',
      'Vô vô minh diệc vô vô minh tận, nãi chí vô lão tử, diệc vô lão tử tận.',
      'Vô khổ tập diệt đạo, vô trí diệc vô đắc, dĩ vô sở đắc cố.',
      'Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố, tâm vô quái ngại,',
      'vô quái ngại cố, vô hữu khủng bố, viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn.',
      'Tam thế chư Phật, y Bát Nhã Ba La Mật Đa cố,',
      'đắc A Nậu Đa La Tam Miệu Tam Bồ Đề.',
      'Cố tri Bát Nhã Ba La Mật Đa, thị đại thần chú, thị đại minh chú,',
      'thị vô thượng chú, thị vô đẳng đẳng chú, năng trừ nhất thiết khổ, chân thật bất hư.',
      'Cố thuyết Bát Nhã Ba La Mật Đa chú, tức thuyết chú viết:',
      'Yết đế, yết đế, ba la yết đế, ba la tăng yết đế, Bồ đề tát bà ha.'
    ]
  },
  {
    key: 'niemPhat',
    title: 'Niệm Hồng Danh Đức Phật A Di Đà',
    lines: [
      'Nam Mô Tây Phương Cực Lạc Thế Giới,',
      'Đại Từ Đại Bi, A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô Quán Thế Âm Bồ Tát.',
      'Nam Mô Đại Thế Chí Bồ Tát.',
      'Nam Mô Thanh Tịnh Đại Hải Chúng Bồ Tát.'
    ]
  },
  {
    key: 'vangSanh',
    title: 'Chú Vãng Sanh',
    lines: [
      'Bạt Nhất Thiết Nghiệp Chướng Căn Bản Đắc Sanh Tịnh Độ Đà La Ni.',
      'Nam mô a di đa bà dạ, đa tha già đa dạ,',
      'đa địa dạ tha, a di rị đô bà tỳ,',
      'a di rị đa tất đam bà tỳ,',
      'a di rị đa tỳ ca lan đế, a di rị đa tỳ ca lan đa,',
      'già di nị, già già na, chỉ đa ca lệ, ta bà ha.',
      'Nam mô a di đa bà dạ, đa tha già đa dạ,',
      'đa địa dạ tha, a di rị đô bà tỳ,',
      'a di rị đa tất đam bà tỳ,',
      'a di rị đa tỳ ca lan đế, a di rị đa tỳ ca lan đa,',
      'già di nị, già già na, chỉ đa ca lệ, ta bà ha.'
    ]
  }
];

const DEDICATION_LINES = [
  'Nguyện đem công đức này, hướng về khắp tất cả,',
  'đệ tử và chúng sanh, đều trọn thành Phật đạo.'
];

// Ngày vía A Di Đà ưu tiên niệm Phật; các ngày khác xoay vòng theo thứ tự
const FESTIVAL_PREFERRED_SUTRA = {
  viaADiDa: 'niemPhat',
  vuLan: 'vangSanh'
};

function pickSutra(round, festivalKey) {
  const preferred = FESTIVAL_PREFERRED_SUTRA[festivalKey];
  if (!preferred) {
    return SUTRAS[round % SUTRAS.length];
  }
  if (round % 2 === 0) {
    return SUTRAS.find((s) => s.key === preferred);
  }
  const others = SUTRAS.filter((s) => s.key !== preferred);
  return others[Math.floor(round / 2) % others.length];
}

// Ước lượng thời gian đọc một dòng (giây) khi chưa có âm thanh thật
function estimateLineSeconds(line) {
  return Math.max(2.5, line.length * 0.09);
}

module.exports = { SUTRAS, DEDICATION_LINES, pickSutra, estimateLineSeconds };
