/**
 * Lịch Âm Việt Nam (múi giờ UTC+7) & Ngày Lễ Phật Giáo
 * - Thuật toán đổi Dương lịch -> Âm lịch theo Hồ Ngọc Đức (thiên văn, có tháng nhuận)
 * - Danh sách ngày lễ: Tết, Rằm/Mùng Một, Phật Đản, Vu Lan, Vía Quan Âm, Vía A Di Đà...
 */
const VN_TZ = 7;
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const MONTH_NAMES = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'];

function jdFromDate(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k, tz) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return Math.floor(Jd1 + C1 - deltat + 0.5 + tz / 24);
}

function getSunLongitude(jdn, tz) {
  const T = (jdn - 2451545.5 - tz / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

function getLunarMonth11(yy, tz) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, tz);
  if (getSunLongitude(nm, tz) >= 9) {
    nm = getNewMoonDay(k - 1, tz);
  }
  return nm;
}

function getLeapMonthOffset(a11, tz) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

function solarToLunar(dd, mm, yy, tz = VN_TZ) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, tz);
  }
  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }
  const day = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) {
      month = diff + 10;
      if (diff === leapMonthDiff) leap = true;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { day, month, year: lunarYear, leap };
}

function canChiYear(lunarYear) {
  return `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;
}

// Ngày Dương lịch hiện tại theo giờ Việt Nam (không phụ thuộc múi giờ của máy chủ)
function vnSolarParts(date = new Date()) {
  const d = new Date(date.getTime() + VN_TZ * 3600 * 1000);
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

// theme: quyết định màu sắc & trang trí trên sân khấu; major: ngày lễ lớn (mưa hoa sen định kỳ)
const FESTIVALS = {
  tet: { name: 'Tết Nguyên Đán', greeting: 'Chúc mừng năm mới, nguyện cầu một năm an khang thịnh vượng', multiplier: 3, theme: 'tet', major: true },
  giaoThua: { name: 'Đêm Giao Thừa', greeting: 'Tiễn năm cũ, đón năm mới, nguyện cầu quốc thái dân an', multiplier: 3, theme: 'tet', major: true },
  nguyenTieu: { name: 'Rằm Tháng Giêng — Tết Nguyên Tiêu', greeting: 'Lễ Phật quanh năm không bằng rằm tháng Giêng', multiplier: 3, theme: 'ram', major: true },
  viaQuanAmDan: { name: 'Vía Quan Thế Âm Bồ Tát Đản Sanh', greeting: 'Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát', multiplier: 2, theme: 'quanam', major: false },
  phatDan: { name: 'Đại Lễ Phật Đản', greeting: 'Kính mừng ngày Đức Phật đản sanh, ánh sáng từ bi lan tỏa muôn nơi', multiplier: 3, theme: 'phatdan', major: true },
  viaQuanAmDao: { name: 'Vía Quan Thế Âm Bồ Tát Thành Đạo', greeting: 'Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát', multiplier: 2, theme: 'quanam', major: false },
  vuLan: { name: 'Đại Lễ Vu Lan Báo Hiếu', greeting: 'Mùa Vu Lan báo hiếu, nguyện cầu cha mẹ hiện tiền an vui, cửu huyền thất tổ siêu sanh', multiplier: 3, theme: 'vulan', major: true },
  viaQuanAmXuatGia: { name: 'Vía Quan Thế Âm Bồ Tát Xuất Gia', greeting: 'Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát', multiplier: 2, theme: 'quanam', major: false },
  haNguyen: { name: 'Rằm Tháng Mười — Tết Hạ Nguyên', greeting: 'Rằm tháng Mười, nguyện cầu mùa màng sung túc, gia đạo bình an', multiplier: 2, theme: 'ram', major: false },
  viaADiDa: { name: 'Vía Đức Phật A Di Đà', greeting: 'Kính mừng ngày vía Đức Từ Phụ A Di Đà, nguyện cầu chúng sanh vãng sanh Cực Lạc', multiplier: 3, theme: 'amitabha', major: true },
  thanhDao: { name: 'Lễ Phật Thích Ca Thành Đạo', greeting: 'Kính mừng ngày Đức Phật thành đạo dưới cội Bồ Đề', multiplier: 2, theme: 'phatdan', major: false },
  ram: { name: 'Ngày Rằm', greeting: 'Ngày rằm thanh tịnh, thành tâm lễ Phật cầu an', multiplier: 2, theme: 'ram', major: false },
  mungMot: { name: 'Ngày Mùng Một', greeting: 'Mùng một đầu tháng, thành tâm lễ Phật cầu may mắn bình an', multiplier: 2, theme: 'ram', major: false }
};

// Ngày lễ cố định theo Âm lịch (tháng nhuận chỉ tính Rằm & Mùng Một)
const FIXED_LUNAR_FESTIVALS = [
  { month: 1, days: [1, 2, 3], key: 'tet' },
  { month: 1, days: [15], key: 'nguyenTieu' },
  { month: 2, days: [19], key: 'viaQuanAmDan' },
  { month: 4, days: [15], key: 'phatDan' },
  { month: 6, days: [19], key: 'viaQuanAmDao' },
  { month: 7, days: [15], key: 'vuLan' },
  { month: 9, days: [19], key: 'viaQuanAmXuatGia' },
  { month: 10, days: [15], key: 'haNguyen' },
  { month: 11, days: [17], key: 'viaADiDa' },
  { month: 12, days: [8], key: 'thanhDao' }
];

function findFestivalKey(lunar, tomorrowLunar) {
  if (!lunar.leap) {
    const fixed = FIXED_LUNAR_FESTIVALS.find((f) => f.month === lunar.month && f.days.includes(lunar.day));
    if (fixed) return fixed.key;
    if (lunar.month === 12 && tomorrowLunar.month === 1 && tomorrowLunar.day === 1) return 'giaoThua';
  }
  if (lunar.day === 15) return 'ram';
  if (lunar.day === 1) return 'mungMot';
  return null;
}

function formatLunarLabel(lunar) {
  const monthName = MONTH_NAMES[lunar.month - 1];
  return `${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''} năm ${canChiYear(lunar.year)} (tháng ${monthName})`;
}

/**
 * Lấy thông tin lịch âm & ngày lễ hôm nay.
 * @param {Date} date
 * @param {string} overrideKey - ép một ngày lễ (để xem trước / chạy thử trên Admin)
 */
function getCalendarInfo(date = new Date(), overrideKey = '') {
  const solar = vnSolarParts(date);
  const lunar = solarToLunar(solar.day, solar.month, solar.year);
  const t = vnSolarParts(new Date(date.getTime() + 24 * 3600 * 1000));
  const tomorrowLunar = solarToLunar(t.day, t.month, t.year);

  const key = overrideKey && FESTIVALS[overrideKey] ? overrideKey : findFestivalKey(lunar, tomorrowLunar);
  const festival = key ? { key, ...FESTIVALS[key], overridden: Boolean(overrideKey && FESTIVALS[overrideKey]) } : null;

  return {
    solar,
    solarLabel: `${solar.day}/${solar.month}/${solar.year}`,
    lunar: { ...lunar, canChi: canChiYear(lunar.year) },
    lunarLabel: formatLunarLabel(lunar),
    festival,
    multiplier: festival ? festival.multiplier : 1
  };
}

module.exports = { solarToLunar, canChiYear, getCalendarInfo, FESTIVALS };
