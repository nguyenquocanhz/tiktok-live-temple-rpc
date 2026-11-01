const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
const { getCalendarInfo, FESTIVALS } = require('./lunar');
const { SUTRAS, DEDICATION_LINES, pickSutra, estimateLineSeconds } = require('./chants');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TTS_CACHE_DIR = path.join(DATA_DIR, 'tts-cache');
const STATE_FILE = path.join(DATA_DIR, 'merit-state.json');

fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

// ============================================================================
// 1. BỘ 18 QUẺ LINH XĂM CHÙA LINH ỨNG (FORTUNE STICKS DECK)
// ============================================================================
const FORTUNE_DECK = [
  {
    number: 1,
    rank: 'Thượng Thượng Cát',
    title: 'Nhật Xuất Đông Phương — Mặt Trời Mọc Phương Đông',
    poem: 'Đông phương nhật xuất chiếu Càn Khôn\nHoa nở đầy cành rạng sắc xuân\nCông danh tài lộc đều viên mãn\nGia đạo bình an phúc lộc tồn.',
    meaning: 'Mọi sự mưu cầu đều đại cát đại lợi. Công việc hanh thông, quý nhân phù trợ, gia đình hòa thuận ấm êm.',
    ttsSummary: 'Quẻ số 1, Thượng Thượng Cát, Nhật Xuất Đông Phương. Mọi sự mưu cầu đều đại cát đại lợi, công danh tài lộc viên mãn, quý nhân phù trợ.'
  },
  {
    number: 8,
    rank: 'Thượng Cát',
    title: 'Kim Liên Khai Nở — Sen Vàng Tỏa Ngát',
    poem: 'Sen vàng nở rộ giữa hồ trong\nHương thơm lan tỏa khắp non sông\nLòng thành thắp nén nhang cầu nguyện\nTrời Phật chứng tri thỏa ước mong.',
    meaning: 'Tâm thiện lành ắt gặp phước báu. Cầu tài đắc tài, cầu bình an đắc bình an, bệnh tật tiêu trừ.',
    ttsSummary: 'Quẻ số 8, Thượng Cát, Kim Liên Khai Nở. Tâm thiện lành ắt gặp phước báu, cầu tài đắc tài, cầu bình an đắc bình an.'
  },
  {
    number: 12,
    rank: 'Đại Cát',
    title: 'Long Vân Tương Hội — Rồng Mây Gặp Gỡ',
    poem: 'Rồng thiêng gặp hội tầng mây xanh\nVượt Vũ Môn Quan rạng rỡ danh\nThí chủ kiên tâm hành thiện đạo\nPhúc dày lộc vượng khắp gia đình.',
    meaning: 'Thời vận đang lên mạnh mẽ. Thi cử đỗ đạt, kinh doanh phát đạt, gặp cơ hội lớn đổi đời.',
    ttsSummary: 'Quẻ số 12, Đại Cát, Long Vân Tương Hội. Thời vận đang lên mạnh mẽ, thi cử đỗ đạt, kinh doanh phát đạt.'
  },
  {
    number: 18,
    rank: 'Thượng Cát',
    title: 'Xuân Phong Đắc Ý — Gió Xuân Thuận Buồm',
    poem: 'Thuận buồm xuôi gió vượt trùng khơi\nBến giác bình yên nắng rạng ngời\nTài lộc dồi dào nhân duyên tốt\nBốn mùa hưng thịnh rộn niềm vui.',
    meaning: 'Đi xa gặp may, buôn bán thuận lợi, tình duyên êm đẹp, người thân mạnh khỏe.',
    ttsSummary: 'Quẻ số 18, Thượng Cát, Xuân Phong Đắc Ý. Thuận buồm xuôi gió, tài lộc dồi dào, nhân duyên tốt đẹp.'
  },
  {
    number: 24,
    rank: 'Trung Cát',
    title: 'Vũ Quá Thiên Thanh — Mưa Tạnh Trời Trong',
    poem: 'Mưa qua trời lại sáng trong ngần\nGian khó lùi xa đón phúc phần\nGiữ vững lòng thành đừng nản chí\nHoa thơm trái ngọt đến mười phân.',
    meaning: 'Khó khăn cũ sắp qua đi, vận may mới đang tới. Hãy kiên nhẫn và giữ tâm bình tĩnh.',
    ttsSummary: 'Quẻ số 24, Trung Cát, Vũ Quá Thiên Thanh. Mưa qua trời lại sáng trong, gian khó lùi xa để đón phúc phần mới.'
  },
  {
    number: 36,
    rank: 'Thượng Thượng Cát',
    title: 'Phúc Tinh Cao Chiếu — Sao Phúc Chiếu Mệnh',
    poem: 'Phúc tinh rực sáng giữa đêm rằm\nTừ bi Phật độ suốt quanh năm\nTài lộc tự nhiên về gõ cửa\nTrăm điều như ý vạn điều lành.',
    meaning: 'Sao Phúc chiếu mạng, tai qua nạn khỏi, tiền tài sung túc, gia đạo hưng long.',
    ttsSummary: 'Quẻ số 36, Thượng Thượng Cát, Phúc Tinh Cao Chiếu. Sao Phúc chiếu mạng, tài lộc tự nhiên gõ cửa, trăm điều như ý.'
  },
  {
    number: 52,
    rank: 'Thượng Cát',
    title: 'Ngọc Xuất Côn Sơn — Ngọc Quý Phát Sáng',
    poem: 'Ngọc quý Côn Sơn tỏa ánh ngời\nBấy lâu rèn giũa nay gặp thời\nTri âm tương ngộ cùng nâng đỡ\nSự nghiệp thăng hoa rạng rỡ đời.',
    meaning: 'Nỗ lực bấy lâu nay sắp được đền đáp xứng đáng. Có người tốt nâng đỡ trong công việc và cuộc sống.',
    ttsSummary: 'Quẻ số 52, Thượng Cát, Ngọc Xuất Côn Sơn. Nỗ lực bấy lâu sắp được đền đáp xứng đáng, sự nghiệp thăng hoa.'
  },
  {
    number: 68,
    rank: 'Đại Cát',
    title: 'Lộc Mã Đồng Hương — Lộc Tài Cùng Tới',
    poem: 'Lộc Mã song hành đến tận nhà\nLàm ăn buôn bán nở như hoa\nTâm thành bố thí thêm công đức\nPhú quý vinh hoa khắp một nhà.',
    meaning: 'Quẻ đại lợi về tài lộc và kinh doanh. Nên làm nhiều việc thiện để phúc đức càng thêm bền vững.',
    ttsSummary: 'Quẻ số 68, Đại Cát, Lộc Mã Đồng Hương. Đại lợi về tài lộc và buôn bán, phú quý vinh hoa khắp một nhà.'
  },
  {
    number: 81,
    rank: 'Thượng Cát',
    title: 'Nguyệt Nhập Trung Thiên — Trăng Rằm Giữa Đỉnh',
    poem: 'Trăng tròn vằng vặc giữa trời thu\nSoi sáng muôn phương sạch mây mù\nTình duyên viên mãn gia đình thuận\nTâm an vạn sự chẳng ưu tư.',
    meaning: 'Tình duyên và gia đạo vô cùng tốt đẹp. Người độc thân dễ gặp ý trung nhân, gia đình thêm tin vui.',
    ttsSummary: 'Quẻ số 81, Thượng Cát, Nguyệt Nhập Trung Thiên. Tình duyên viên mãn, gia đình hòa thuận, tâm an vạn sự lành.'
  },
  {
    number: 99,
    rank: 'Thượng Thượng Cát',
    title: 'Vạn Sự Viên Thành — Cửu Cửu Đại Cát',
    poem: 'Chín tầng mây trắng ánh hào quang\nTừ bi Phật Tổ độ nhân gian\nThí chủ lòng thành dâng lễ bái\nTrọn đời trường thọ hưởng vinh khang.',
    meaning: 'Quẻ tối thượng cát tường. Sức khỏe trường thọ, công danh hiển đạt, vạn sự viên thành.',
    ttsSummary: 'Quẻ số 99, Thượng Thượng Cát, Vạn Sự Viên Thành. Quẻ tối thượng cát tường, sức khỏe trường thọ, vạn sự như ý.'
  }
];

// ============================================================================
// 2. ZEROTTS PYTHON WORKER MANAGER (VOICE: MAI CHI)
// ============================================================================
class ZeroTTSManager {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.status = 'starting';
    this.voice = 'maichi';
    this.voices = ['maichi'];
    this.model = 'zeroweight-ai/ZeroTTS';
    this.pending = new Map();
    this.inflight = new Map();
    this.reqCounter = 0;
    this.buffer = '';
    this.startWorker();
  }

  resolvePythonBin() {
    const isWin = process.platform === 'win32';
    const venvPy = isWin
      ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPy)) return venvPy;
    return isWin ? 'python' : 'python3';
  }

  startWorker() {
    const pyBin = this.resolvePythonBin();
    const scriptPath = path.join(__dirname, 'tts_worker.py');
    console.log(`[ZeroTTS] Khởi chạy worker với ${pyBin} (Giọng mặc định: Mai Chi)...`);

    this.status = 'loading';
    try {
      this.proc = spawn(pyBin, [scriptPath], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        // Windows mặc định đọc/ghi pipe bằng cp1252: ép UTF-8 để tiếng Việt không bị lỗi mã
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', HF_HUB_DISABLE_SYMLINKS_WARNING: '1' }
      });
    } catch (err) {
      // Bun ném lỗi ngay khi không tìm thấy Python: chạy tiếp không có giọng đọc thay vì sập server
      console.warn(`[ZeroTTS] Không khởi chạy được worker (${err.message}). Server vẫn chạy, tạm tắt giọng đọc.`);
      this.proc = null;
      this.status = 'unavailable';
      return;
    }
    this.proc.on('error', (err) => {
      console.warn(`[ZeroTTS] Lỗi worker: ${err.message}`);
      this.ready = false;
      this.status = 'unavailable';
    });

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      let lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        this.handleWorkerLine(line.trim());
      }
    });

    this.proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) console.log(`[ZeroTTS stderr] ${msg}`);
    });

    this.proc.on('exit', (code) => {
      console.warn(`[ZeroTTS] Worker thoát với mã ${code}`);
      this.ready = false;
      this.status = 'stopped';
      for (const [, item] of this.pending) {
        clearTimeout(item.timer);
        item.resolve({ ok: false, error: 'ZeroTTS worker exited' });
      }
      this.pending.clear();
    });
  }

  handleWorkerLine(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'status') {
        this.status = msg.status;
        this.model = msg.model || this.model;
        broadcastNotification('tts.status', this.getStatus());
      } else if (msg.type === 'ready') {
        this.ready = true;
        this.status = 'ready';
        this.voice = msg.voice || 'maichi';
        this.voices = msg.voices || ['maichi'];
        this.model = msg.model || this.model;
        console.log(`[ZeroTTS] Sẵn sàng sau ${msg.loadSec}s! Giọng: ${this.voice} (${this.voices.join(', ')})`);
        broadcastNotification('tts.status', this.getStatus());
        setTimeout(warmChantCache, 1500);
      } else if (msg.type === 'result' && msg.id != null) {
        const entry = this.pending.get(msg.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      } else if (msg.type === 'error') {
        console.error('[ZeroTTS Error]', msg.error);
        this.status = 'error';
        broadcastNotification('tts.status', this.getStatus());
      }
    } catch (err) {
      console.log('[ZeroTTS stdout]', line);
    }
  }

  getStatus() {
    return {
      ready: this.ready,
      status: this.status,
      engine: 'ZeroTTS (zeroweight-ai/ZeroTTS)',
      voice: state.settings.ttsVoice || this.voice || 'maichi',
      voices: this.voices,
      model: this.model
    };
  }

  synthesize(text, voiceOverride) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return Promise.resolve({ ok: false, error: 'Empty text' });
    const voice = (voiceOverride || state.settings.ttsVoice || 'maichi').toLowerCase();
    const dedupKey = `${voice}::${cleanText}`;

    if (this.inflight.has(dedupKey)) {
      return this.inflight.get(dedupKey);
    }

    const promise = new Promise((resolve) => {
      if (!this.proc || !this.ready) {
        return resolve({ ok: false, error: `ZeroTTS đang ở trạng thái: ${this.status}` });
      }
      const id = ++this.reqCounter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'ZeroTTS synthesis timeout' });
      }, 30000);

      this.pending.set(id, { resolve, timer });
      const payload = JSON.stringify({ id, text: cleanText, voice }) + '\n';
      this.proc.stdin.write(payload);
    }).finally(() => {
      this.inflight.delete(dedupKey);
    });

    this.inflight.set(dedupKey, promise);
    return promise;
  }
}

// ============================================================================
// 3. TRẠNG THÁI CHÙA ONLINE & BẢNG VÀNG CÔNG ĐỨC
// ============================================================================
const DEFAULT_STATE = {
  totalIncense: 108,
  totalMerit: 1080,
  woodenFishHits: 360,
  bellRings: 36,
  lanternCount: 18,
  fortuneCount: 12,
  activeIncenseSticks: 9,
  haloIntensity: 0.45,
  offerings: {
    lotus: 3,
    fruit: 2,
    lamp: 2,
    dragon: 1
  },
  devotees: {},
  recentEvents: [],
  settings: {
    ttsEnabled: true,
    ttsVoice: 'maichi',
    bgMusicEnabled: true,
    sfxEnabled: true,
    smokeDensity: 1.0,
    autoSim: false,
    autoSimIntervalMs: 9500,
    chantGoal: 300,
    festivalOverride: '',
    thanks: {}
  },
  chant: {
    progress: 0,
    round: 0
  },
  tiktok: {
    connected: false,
    connecting: false,
    username: 'zenfacts_vn',
    roomId: null,
    viewerCount: 0,
    totalViewers: 0,
    lastError: null
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return {
        ...DEFAULT_STATE,
        ...saved,
        devotees: saved.devotees || {},
        offerings: { ...DEFAULT_STATE.offerings, ...(saved.offerings || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        chant: { ...DEFAULT_STATE.chant, ...(saved.chant || {}) },
        tiktok: { ...DEFAULT_STATE.tiktok }
      };
    }
  } catch (e) {
    console.warn('[State] Không đọc được merit-state.json, dùng mặc định:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const toSave = {
      totalIncense: state.totalIncense,
      totalMerit: state.totalMerit,
      woodenFishHits: state.woodenFishHits,
      bellRings: state.bellRings,
      lanternCount: state.lanternCount,
      fortuneCount: state.fortuneCount,
      activeIncenseSticks: state.activeIncenseSticks,
      offerings: state.offerings,
      devotees: state.devotees,
      settings: state.settings,
      chant: { progress: state.chant.progress, round: state.chant.round }
    };
    fs.promises.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2), 'utf8').catch((e) => {
      console.error('[State] Lỗi lưu file:', e.message);
    });
  }, 1200);
}

function getLeaderboard(limit = 6) {
  return Object.values(state.devotees)
    .sort((a, b) => b.merit - a.merit)
    .slice(0, limit)
    .map((d, index) => ({
      rank: index + 1,
      name: d.name,
      uniqueId: d.uniqueId,
      avatar: d.avatar || '',
      merit: d.merit,
      incense: d.incense || 0,
      lastWish: d.lastWish || ''
    }));
}
// Bộ lọc chặn ký tự lạ (Cuneiform 𒐫, Zalgo, Braille, ký tự spam) & từ ngữ phản cảm
const WEIRD_SPAM_RE = /[\u{12000}-\u{1254F}\uFDFD\u2800-\u28FF\u2580-\u259F]|[\u0300-\u036F]{3,}/u;
const BRACKET_EMOTE_RE = /\[[^\]]{1,24}\]/g;
const ALLOWED_VI_TEXT_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]/g;
const ALLOWED_VI_NAME_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;
const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;
const BAD_WORDS_RE = /(đá dái|địt|lồn|cặc|đm|vcl|vl|yamate|i cư|lừa đảo|lừa à|te-le gram|telegram|bố là trùm)/i;

function isBlockedSpamOrToxic(raw) {
  if (!raw) return true;
  const s = String(raw);
  if (WEIRD_SPAM_RE.test(s)) return true;
  if (BAD_WORDS_RE.test(s)) return true;
  return false;
}

function sanitizeUserName(rawName) {
  const normalized = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);

  if (!normalized || BAD_WORDS_RE.test(normalized)) {
    return 'Thí Chủ Hữu Duyên';
  }
  const letters = normalized.match(VI_LETTER_RE) || [];
  if (letters.length < 2) {
    return 'Thí Chủ Hữu Duyên';
  }
  return normalized;
}

function sanitizeWishText(rawWish) {
  if (!rawWish) return '';
  const cleaned = String(rawWish)
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/(.)\1{2,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s-]+|[.,!?\s-]+$/g, '')
    .slice(0, 120);

  if (!cleaned || BAD_WORDS_RE.test(cleaned)) return '';
  const letters = cleaned.match(VI_LETTER_RE) || [];
  if (letters.length < 2) return '';
  return cleaned;
}

function recordDevotee(user, uniqueId, avatar, meritDelta, incenseDelta = 0, giftDelta = 0, wish = '') {
  const displayName = sanitizeUserName(user || uniqueId);
  const cleanWish = sanitizeWishText(wish);
  const key = (uniqueId || displayName).slice(0, 40);
  if (!state.devotees[key]) {
    state.devotees[key] = {
      name: displayName,
      uniqueId: uniqueId || displayName.toLowerCase().replace(/\s+/g, ''),
      avatar: avatar || '',
      merit: 0,
      incense: 0,
      gifts: 0,
      lastWish: ''
    };
  }
  const dev = state.devotees[key];
  dev.name = displayName;
  if (avatar) dev.avatar = avatar;
  dev.merit += meritDelta;
  dev.incense += incenseDelta;
  dev.gifts += giftDelta;
  if (cleanWish) dev.lastWish = cleanWish;

  state.totalMerit += meritDelta;
  state.haloIntensity = Math.min(1.0, 0.35 + (state.totalMerit % 1000) / 1400);
  return dev;
}

function pushEventLog(evt) {
  const entry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt
  };
  state.recentEvents.unshift(entry);
  if (state.recentEvents.length > 35) {
    state.recentEvents.length = 35;
  }
  return entry;
}

function getPublicState() {
  return {
    totalIncense: state.totalIncense,
    totalMerit: state.totalMerit,
    woodenFishHits: state.woodenFishHits,
    bellRings: state.bellRings,
    lanternCount: state.lanternCount,
    fortuneCount: state.fortuneCount,
    activeIncenseSticks: state.activeIncenseSticks,
    haloIntensity: state.haloIntensity,
    offerings: state.offerings,
    leaderboard: getLeaderboard(24),
    recentEvents: state.recentEvents.slice(0, 15),
    settings: state.settings,
    tiktok: state.tiktok,
    calendar: getCalendar(),
    chant: getPublicChant(),
    tts: zeroTts ? zeroTts.getStatus() : { ready: false, status: 'init', voice: 'maichi' }
  };
}


// ============================================================================
// 3A. CẤU HÌNH QUÀ TẶNG & LỜI CẢM ƠN (chỉnh trên Admin, lưu trong merit-state.json)
// ============================================================================
// Biến trong mẫu: {user} tên người xem, {gift} tên quà, {count} số lượng, {coins} tổng xu, {merit} điểm công đức
const DEFAULT_THANKS = {
  giftVoice: true,
  giftMinCoinsForVoice: 1,
  mediumCoins: 5,
  largeCoins: 100,
  giftSmall: 'Cảm tạ thí chủ {user} đã dâng {gift}, tích thêm {merit} điểm công đức. Nguyện chư Phật gia hộ cho thí chủ bình an may mắn.',
  giftMedium: 'Công đức vô lượng! Cảm tạ thí chủ {user} đã phát tâm dâng {gift}. Nguyện cầu chư Phật gia hộ cho thí chủ vạn sự cát tường như ý.',
  giftLarge: 'Nam Mô A Di Đà Phật! Đại thí chủ {user} đã dâng {gift}, công đức vô lượng. Toàn thể đạo tràng xin cảm tạ, nguyện thí chủ phúc lộc viên mãn, gia đạo hưng long.',
  followVoice: true,
  followText: 'Cảm tạ thí chủ {user} đã theo dõi Chùa Linh Ứng. Nguyện thí chủ luôn bình an, mọi điều như ý.',
  shareVoice: true,
  shareText: 'Cảm tạ thí chủ {user} đã chia sẻ buổi lễ, công đức lan tỏa muôn nơi.'
};
const THANKS_TEXT_KEYS = ['giftSmall', 'giftMedium', 'giftLarge', 'followText', 'shareText'];

function getThanksConfig() {
  return { ...DEFAULT_THANKS, ...(state.settings.thanks || {}) };
}

function updateThanksConfig(params = {}) {
  const next = { ...(state.settings.thanks || {}) };
  for (const key of THANKS_TEXT_KEYS) {
    if (typeof params[key] === 'string') {
      const text = params[key].replace(/\s+/g, ' ').trim().slice(0, 300);
      if (text) next[key] = text;
      else delete next[key];
    }
  }
  for (const key of ['giftVoice', 'followVoice', 'shareVoice']) {
    if (typeof params[key] === 'boolean') next[key] = params[key];
  }
  for (const key of ['giftMinCoinsForVoice', 'mediumCoins', 'largeCoins']) {
    if (params[key] !== undefined && Number.isFinite(Number(params[key]))) {
      next[key] = Math.max(1, Math.round(Number(params[key])));
    }
  }
  if (next.largeCoins !== undefined || next.mediumCoins !== undefined) {
    const merged = { ...DEFAULT_THANKS, ...next };
    if (merged.largeCoins <= merged.mediumCoins) next.largeCoins = merged.mediumCoins + 1;
  }
  if (params.reset === true) {
    state.settings.thanks = {};
  } else {
    state.settings.thanks = next;
  }
  saveState();
  broadcastNotification('temple.state', getPublicState());
  return getThanksConfig();
}

function fillThanksTemplate(template, vars) {
  return String(template || '').replace(/\{(user|gift|count|coins|merit)\}/g, (_, key) => String(vars[key] ?? ''));
}

function getGiftTier(coins) {
  const cfg = getThanksConfig();
  if (coins >= cfg.largeCoins) return 'large';
  if (coins >= cfg.mediumCoins) return 'medium';
  return 'small';
}

// Quà combo (giftType = 1) được TikTok gửi nhiều lần với repeatCount tăng dần, kết thúc bằng repeatEnd.
// Gom lại để chỉ dâng lễ & cảm ơn 1 lần với tổng số lượng; tự chốt sau 4 giây nếu không nhận được repeatEnd.
const giftStreaks = new Map();

function handleIncomingGift(info) {
  const count = Math.max(1, Number(info.repeatCount) || 1);
  if (!info.streakable) {
    return finalizeGift({ ...info, repeatCount: count });
  }
  const key = info.streakKey || `${info.uniqueId || info.user}_${info.giftId}`;
  const existing = giftStreaks.get(key);
  if (existing) clearTimeout(existing.timer);
  const streak = { ...(existing || {}), ...info, repeatCount: Math.max(count, existing?.repeatCount || 0) };
  if (info.repeatEnd) {
    giftStreaks.delete(key);
    return finalizeGift(streak);
  }
  streak.timer = setTimeout(() => {
    giftStreaks.delete(key);
    finalizeGift(streak);
  }, 4000);
  giftStreaks.set(key, streak);
  if (giftStreaks.size > 500) {
    const [oldKey, old] = giftStreaks.entries().next().value;
    clearTimeout(old.timer);
    giftStreaks.delete(oldKey);
    finalizeGift(old);
  }
  return { pending: true, repeatCount: streak.repeatCount };
}

function finalizeGift(info) {
  const count = Math.max(1, Number(info.repeatCount) || 1);
  const unitCoins = Math.max(1, Number(info.diamondCount) || 1);
  const rawName = String(info.giftName || 'Hoa Hồng').slice(0, 40);
  const giftName = count > 1 ? `${count} ${rawName}` : rawName;
  console.log(`[TikTok Gift] ${info.user} tặng ${giftName} (${unitCoins * count} xu)`);
  return Rituals.offerGift({
    user: info.user,
    uniqueId: info.uniqueId,
    avatar: info.avatar,
    coins: unitCoins * count,
    giftCount: count,
    giftName,
    wish: `Thành tâm dâng ${giftName} kính lễ Đức Phật A Di Đà`
  });
}

// Follow / Share: cảm ơn bằng giọng đọc, mỗi người 1 lần mỗi 2 phút cho từng loại để không nghẽn hàng đợi
const socialThanksCooldown = new Map();

function handleSocialThanks(kind, { user, uniqueId, avatar }) {
  const cfg = getThanksConfig();
  const key = `${kind}:${uniqueId || user}`;
  const now = Date.now();
  const canSpeak = now - (socialThanksCooldown.get(key) || 0) > 120000;
  const voiceOn = kind === 'follow' ? cfg.followVoice : cfg.shareVoice;
  if (canSpeak) {
    socialThanksCooldown.set(key, now);
    if (socialThanksCooldown.size > 2000) {
      socialThanksCooldown.delete(socialThanksCooldown.keys().next().value);
    }
  }
  const template = kind === 'follow' ? cfg.followText : cfg.shareText;
  return Rituals.ringBell({
    user,
    uniqueId,
    avatar,
    count: 1,
    wish: kind === 'follow' ? 'Theo dõi Chùa Linh Ứng, kết duyên lành nơi cửa Phật' : 'Chia sẻ buổi lễ, lan tỏa công đức muôn nơi',
    actionLabel: kind === 'follow' ? 'Theo dõi Chùa' : 'Chia sẻ buổi lễ',
    ttsTemplate: voiceOn && canSpeak ? template : ''
  });
}

// ============================================================================
// 3B. LỊCH ÂM, NGÀY LỄ PHẬT GIÁO & TỤNG KINH TẬP THỂ
// ============================================================================
let calendarCache = { stamp: '', info: null };
function getCalendar() {
  const override = state.settings.festivalOverride || '';
  const stamp = `${new Date().toISOString().slice(0, 16)}|${override}`;
  if (calendarCache.stamp !== stamp) {
    calendarCache = { stamp, info: getCalendarInfo(new Date(), override) };
  }
  return calendarCache.info;
}

// Nhân điểm công đức theo ngày lễ (Rằm/Mùng Một x2, Đại lễ x3)
function festivalMerit(baseMerit) {
  return Math.round(baseMerit * getCalendar().multiplier);
}

let lastFestivalSignature = null;
function checkFestivalChange() {
  const cal = getCalendar();
  const signature = `${cal.solarLabel}|${cal.festival?.key || ''}`;
  if (lastFestivalSignature === null) {
    lastFestivalSignature = signature;
    return;
  }
  if (signature === lastFestivalSignature) return;
  lastFestivalSignature = signature;

  if (!cal.festival) {
    broadcastNotification('temple.state', getPublicState());
    return;
  }
  const event = pushEventLog({
    type: 'festivalStart',
    user: 'Chánh Điện',
    festival: cal.festival,
    lunarLabel: cal.lunarLabel,
    ttsText: `Hôm nay là ${cal.festival.name}, ngày ${cal.lunar.day} tháng ${cal.lunar.month} âm lịch. ${cal.festival.greeting}. Mọi công đức trong ngày hôm nay được nhân ${cal.multiplier}.`,
    ttsVoice: state.settings.ttsVoice || 'maichi'
  });
  broadcastNotification('temple.event', { event, state: getPublicState() });
}

const chantRun = { active: false, timer: null, contributors: new Map() };

function getChantGoal() {
  return Math.max(20, Math.min(100000, Number(state.settings.chantGoal) || 300));
}

function getPublicChant() {
  const goal = getChantGoal();
  const nextSutra = pickSutra(state.chant.round, getCalendar().festival?.key);
  return {
    progress: Math.min(goal, state.chant.progress),
    goal,
    round: state.chant.round,
    active: chantRun.active,
    nextTitle: nextSutra.title,
    contributorCount: chantRun.contributors.size
  };
}

// Nhịp mõ góp vào buổi tụng kinh: tim = 1, bình luận = 5, chuông = 10, mỗi xu quà = 5
function addChantProgress(points, devotee) {
  if (!points || points <= 0) return;
  state.chant.progress += points;
  if (devotee) {
    const key = devotee.uniqueId || devotee.name;
    const entry = chantRun.contributors.get(key) || { devotee, points: 0 };
    entry.devotee = devotee;
    entry.points += points;
    chantRun.contributors.set(key, entry);
  }
  if (!chantRun.active && state.chant.progress >= getChantGoal()) {
    // Phát sự kiện tụng kinh sau sự kiện nghi thức vừa xảy ra
    setImmediate(() => {
      if (!chantRun.active && state.chant.progress >= getChantGoal()) startChant();
    });
  }
}

function startChant(params = {}) {
  if (chantRun.active) {
    throw new Error('Đạo tràng đang tụng kinh, vui lòng chờ buổi tụng hiện tại kết thúc');
  }
  const goal = getChantGoal();
  const manual = Boolean(params.manual);
  if (!manual && state.chant.progress < goal) return null;

  const calendar = getCalendar();
  const sutra = SUTRAS.find((s) => s.key === params.sutra) || pickSutra(state.chant.round, calendar.festival?.key);
  const contributors = [...chantRun.contributors.values()]
    .sort((a, b) => b.points - a.points)
    .map((c) => ({ ...c, name: c.devotee.name, avatar: c.devotee.avatar }));
  chantRun.contributors = new Map();
  if (!manual) state.chant.progress -= goal;
  state.chant.round += 1;
  chantRun.active = true;

  // Cộng thẳng vào bản ghi đã có của từng thí chủ (tránh tạo trùng tên trên Bảng Vàng)
  const bonus = festivalMerit(20);
  contributors.forEach((c) => {
    c.devotee.merit += bonus;
    state.totalMerit += bonus;
  });
  const topNames = contributors.slice(0, 3).map((c) => c.name);
  const thanksText = contributors.length
    ? `Cảm tạ ${contributors.length} thí chủ đã cùng góp nhịp mõ tụng kinh${topNames.length ? `, đặc biệt là ${topNames.join(', ')}` : ''}. Mỗi vị được thêm ${bonus} điểm công đức. Nam Mô A Di Đà Phật.`
    : 'Nguyện cầu chúng sanh an lạc, thế giới hòa bình. Nam Mô A Di Đà Phật.';

  const lines = [...sutra.lines, ...DEDICATION_LINES];
  const estimatedSeconds = [...lines, thanksText].reduce((sum, line) => sum + estimateLineSeconds(line) + 0.4, 0);
  const durationMs = Math.round((estimatedSeconds * 1.3 + 8) * 1000);

  const event = pushEventLog({
    type: 'chantStart',
    user: topNames[0] || 'Đạo Tràng',
    sutraKey: sutra.key,
    sutraTitle: sutra.title,
    lines,
    thanksText,
    contributorCount: contributors.length,
    topContributors: contributors.slice(0, 5).map((c) => ({ name: c.name, avatar: c.avatar || '', points: c.points })),
    bonus,
    round: state.chant.round,
    festivalName: calendar.festival?.name || '',
    ttsVoice: state.settings.ttsVoice || 'maichi'
  });

  clearTimeout(chantRun.timer);
  chantRun.timer = setTimeout(finishChant, durationMs);
  saveState();
  broadcastNotification('temple.event', { event, state: getPublicState() });
  return { event, state: getPublicState() };
}

// Tổng hợp sẵn giọng đọc mọi câu kinh vào tts-cache (chạy nền, tuần tự từng câu):
// ZeroTTS trên CPU tổng hợp chậm hơn thời gian đọc, nếu không làm trước thì buổi tụng sẽ bị ngắt quãng
let chantWarmRunning = false;
async function warmChantCache() {
  if (chantWarmRunning) return;
  chantWarmRunning = true;
  const voice = state.settings.ttsVoice || 'maichi';
  const lines = [...new Set([...SUTRAS.flatMap((s) => s.lines), ...DEDICATION_LINES])];
  let created = 0;
  for (const line of lines) {
    if (!zeroTts.ready) break;
    const res = await zeroTts.synthesize(line, voice);
    if (res.ok && !res.cached) created += 1;
  }
  chantWarmRunning = false;
  if (created > 0) {
    console.log(`[ZeroTTS] Đã tạo sẵn giọng tụng cho ${created} câu kinh (${lines.length} câu đã sẵn sàng).`);
  }
}

function finishChant() {
  chantRun.active = false;
  chantRun.timer = null;
  broadcastNotification('temple.state', getPublicState());
  if (state.chant.progress >= getChantGoal()) startChant();
}

// ============================================================================
// 4. NGHI THỨC TƯƠNG TÁC (RITUAL HANDLERS)
// ============================================================================
const memberGreetMap = new Map();
let lastMemberGreetAt = 0;

const Rituals = {
  burnIncense(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 3));
    const wish = sanitizeWishText(params.wish) || 'Thành tâm dâng hương bái Phật, cầu bình an cát tường';
    const merit = festivalMerit(count * 5);

    state.totalIncense += count;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + count);
    const devotee = recordDevotee(user, uniqueId, avatar, merit, count, 0, wish);
    addChantProgress(5, devotee);

    const ttsText = params.readTts === false
      ? ''
      : `Nam mô A Di Đà Phật. Cảm tạ thí chủ ${devotee.name} đã thành tâm thắp ${count} nén hương thơm. ${wish}.`;

    const event = pushEventLog({
      type: 'burnIncense',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  strikeWoodenFish(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(50, Number(params.count) || 1));
    const merit = festivalMerit(count);

    state.woodenFishHits += count;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0);
    addChantProgress(count, devotee);

    const event = pushEventLog({
      type: 'strikeWoodenFish',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      ttsText: params.ttsText || ''
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  ringBell(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 1));
    const wish = sanitizeWishText(params.wish) || 'Thỉnh chuông Bát Nhã, phiền não tiêu tan, trí tuệ sáng ngời';
    const merit = festivalMerit(count * 10);

    state.bellRings += count;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, wish);
    addChantProgress(count * 10, devotee);

    let ttsText = '';
    if (params.ttsTemplate) {
      ttsText = fillThanksTemplate(params.ttsTemplate, { user: devotee.name, merit, count });
    } else if (params.readTts) {
      ttsText = `Thí chủ ${devotee.name} thỉnh Đại Hồng Chung cầu nguyện: ${wish}.`;
    }

    const event = pushEventLog({
      type: 'ringBell',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      merit,
      wish,
      actionLabel: params.actionLabel || '',
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  sendPrayer(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const wish = sanitizeWishText(params.wish) || 'Cầu cho quốc thái dân an, gia đình mạnh khỏe hạnh phúc';
    const merit = festivalMerit(10);

    state.lanternCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 1, 0, wish);
    addChantProgress(5, devotee);

    const ttsText = params.readTts === false
      ? ''
      : `Lời cầu nguyện của thí chủ ${devotee.name}: ${wish}. Nam mô A Di Đà Phật.`;

    const event = pushEventLog({
      type: 'sendPrayer',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      wish,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  offerGift(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const coins = Math.max(1, Number(params.coins) || 10);
    const tier = getGiftTier(coins);
    const giftType = ['lotus', 'fruit', 'lamp', 'dragon'].includes(params.giftType)
      ? params.giftType
      : (tier === 'large' ? 'dragon' : tier === 'medium' ? (coins >= 20 ? 'fruit' : 'lamp') : 'lotus');

    const giftLabels = {
      lotus: 'Đài Hoa Sen Vàng',
      fruit: 'Mâm Ngũ Quả Cát Tường',
      lamp: 'Đèn Lưu Ly Trí Tuệ',
      dragon: 'Đại Lễ Kim Long Chầu Phật'
    };
    const giftName = params.giftName || giftLabels[giftType];
    const multiplier = tier === 'large' ? 50 : tier === 'medium' ? 30 : 20;
    const merit = festivalMerit(Math.max(20, coins * multiplier));

    state.offerings[giftType] = (state.offerings[giftType] || 0) + 1;
    state.totalIncense += 3;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + 3);

    const wish = params.wish || `Dâng cúng ${giftName} lên Tam Bảo`;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 3, 1, wish);
    addChantProgress(coins * 5, devotee);

    const thanks = getThanksConfig();
    const tierTemplate = { small: thanks.giftSmall, medium: thanks.giftMedium, large: thanks.giftLarge }[tier];
    const speak = params.readTts !== false && thanks.giftVoice && coins >= thanks.giftMinCoinsForVoice;
    const ttsText = speak
      ? fillThanksTemplate(tierTemplate, { user: devotee.name, gift: giftName, count: params.giftCount || 1, coins, merit })
      : '';

    const event = pushEventLog({
      type: giftType === 'dragon' ? 'grandCeremony' : 'offerGift',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      giftType,
      giftName,
      giftTier: tier,
      coins,
      merit,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  drawFortune(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const topic = sanitizeWishText(params.topic) || 'Gia đạo, Tài lộc và Bình an';
    const fortune = FORTUNE_DECK[Math.floor(Math.random() * FORTUNE_DECK.length)];
    const merit = festivalMerit(10);

    state.fortuneCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, `Xin xăm: Quẻ số ${fortune.number} (${fortune.rank})`);
    addChantProgress(5, devotee);

    const ttsText = params.readTts === false
      ? ''
      : `Thí chủ ${devotee.name} vừa gieo được ${fortune.ttsSummary}`;

    const event = pushEventLog({
      type: 'drawFortune',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      topic,
      fortune,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Người xem vào phòng Live: chào mừng trên màn hình (mỗi người 10 phút/lần, cả phòng tối đa 1 lời chào/2 giây)
  memberJoin(params = {}) {
    const uniqueId = params.uniqueId || '';
    const devotee = recordDevotee(params.user, uniqueId, params.avatar || '', festivalMerit(1), 0, 0, 'Đã vào Chánh Điện lễ Phật');
    const now = Date.now();
    const key = uniqueId || devotee.name;
    const lastGreet = memberGreetMap.get(key) || 0;
    if (now - lastGreet < 10 * 60 * 1000 || now - lastMemberGreetAt < 2000) {
      broadcastNotification('temple.state', getPublicState());
      return { greeted: false, state: getPublicState() };
    }
    memberGreetMap.set(key, now);
    lastMemberGreetAt = now;
    if (memberGreetMap.size > 2000) {
      memberGreetMap.delete(memberGreetMap.keys().next().value);
    }
    const event = {
      id: `join_${now}`,
      type: 'memberJoin',
      user: devotee.name,
      avatar: devotee.avatar,
      merit: festivalMerit(1)
    };
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { greeted: true, event, state: getPublicState() };
  },

  grandCeremony(params = {}) {
    return this.offerGift({
      ...params,
      giftType: 'dragon',
      coins: Math.max(100, Number(params.coins) || 199),
      giftName: params.giftName || 'Đại Lễ Hào Quang Vạn Trượng'
    });
  },

  updateSettings(params = {}) {
    state.settings = {
      ...state.settings,
      ...params
    };
    if (typeof params.autoSim === 'boolean') {
      configureAutoSim(params.autoSim);
    }
    saveState();
    broadcastNotification('temple.state', getPublicState());
    if (params.festivalOverride !== undefined) {
      checkFestivalChange();
    }
    if (params.chantGoal !== undefined && !chantRun.active && state.chant.progress >= getChantGoal()) {
      startChant();
    }
    return getPublicState();
  },

  resetMerit() {
    state.totalIncense = 9;
    state.totalMerit = 0;
    state.woodenFishHits = 0;
    state.bellRings = 0;
    state.lanternCount = 0;
    state.fortuneCount = 0;
    state.activeIncenseSticks = 3;
    state.offerings = { lotus: 1, fruit: 1, lamp: 1, dragon: 0 };
    state.devotees = {};
    state.recentEvents = [];
    state.chant.progress = 0;
    chantRun.contributors = new Map();
    saveState();
    broadcastNotification('temple.state', getPublicState());
    return getPublicState();
  }
};

// ============================================================================
// 5. TIKTOK LIVE CONNECTOR & COMMENT PARSER
// ============================================================================
let tiktokConn = null;

const commentCooldownMap = new Map();

function parseViewerComment(commentText, user, uniqueId, avatar) {
  const raw = String(commentText || '').trim();
  if (!raw || isBlockedSpamOrToxic(raw)) {
    return null;
  }

  const cleanWish = sanitizeWishText(raw);
  if (!cleanWish || cleanWish.length < 3) {
    return null;
  }

  // Chống 1 người spam bình luận liên tục làm nghẽn hàng đợi TTS (cooldown 3.5 giây/người)
  const userKey = uniqueId || user || '';
  const now = Date.now();
  if (userKey) {
    const lastTs = commentCooldownMap.get(userKey) || 0;
    if (now - lastTs < 3500) {
      return null;
    }
    commentCooldownMap.set(userKey, now);
    if (commentCooldownMap.size > 600) {
      const oldestKey = commentCooldownMap.keys().next().value;
      commentCooldownMap.delete(oldestKey);
    }
  }

  const cleanUser = sanitizeUserName(user);
  const lower = cleanWish.toLowerCase();

  // 1. Xin xăm / Gieo quẻ
  if (
    lower.includes('xin xăm') ||
    lower.includes('xin xam') ||
    lower.includes('gieo quẻ') ||
    lower.includes('gieo que') ||
    lower.includes('rút quẻ') ||
    lower.includes('rut que') ||
    lower.includes('quẻ') ||
    lower.includes('que')
  ) {
    return Rituals.drawFortune({ user: cleanUser, uniqueId, avatar, topic: cleanWish });
  }

  // 2. Thỉnh chuông
  if (lower.includes('chuông') || lower.includes('chuong') || lower.includes('thỉnh chuông')) {
    return Rituals.ringBell({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish, readTts: true });
  }

  // 3. Gõ mõ
  if (lower.includes('gõ mõ') || lower.includes('go mo') || lower.includes('tụng kinh')) {
    return Rituals.strikeWoodenFish({ user: cleanUser, uniqueId, avatar, count: 3 });
  }

  // 4. Thắp hương / Bái Phật
  if (
    lower.includes('thắp hương') ||
    lower.includes('thap huong') ||
    lower.includes('dâng hương') ||
    lower.includes('dang huong') ||
    lower.includes('bái phật') ||
    lower.includes('bai phat') ||
    lower.includes('lạy phật') ||
    lower.includes('lay phat')
  ) {
    return Rituals.burnIncense({ user: cleanUser, uniqueId, avatar, count: 3, wish: cleanWish });
  }

  // 5. Cầu nguyện / Thả đèn hoa đăng
  if (
    lower.includes('cầu') ||
    lower.includes('cau ') ||
    lower.includes('nguyện') ||
    lower.includes('nguyen') ||
    lower.includes('nam mô') ||
    lower.includes('nam mo') ||
    lower.includes('mô phật') ||
    lower.includes('mo phat') ||
    lower.includes('a di đà') ||
    lower.includes('a di da') ||
    lower.includes('bình an') ||
    lower.includes('tài lộc') ||
    lower.includes('chúc')
  ) {
    return Rituals.sendPrayer({ user: cleanUser, uniqueId, avatar, wish: cleanWish });
  }

  return Rituals.burnIncense({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish });
}


async function resolveTikTokUsername(rawInput) {
  let input = String(rawInput || '').trim();
  if (!input) {
    throw new Error('Vui lòng nhập @username hoặc link TikTok Live cần kết nối');
  }
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const urlToFetch = input.startsWith('http') ? input : `https://${input}`;
    const directMatch = urlToFetch.match(/tiktok\.com\/@([^/?#]+)/i);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }
    try {
      const resp = await fetch(urlToFetch, { redirect: 'follow' });
      const finalUrl = resp.url || '';
      const resolvedMatch = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
      if (resolvedMatch && resolvedMatch[1]) {
        return resolvedMatch[1];
      }
    } catch (e) {
      console.warn('[TikTok URL Resolve Warning]', e.message);
    }
  }
  return input.replace(/^@/, '').split(/[/?#]/)[0].trim();
}

function extractUserFromEvent(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Thí Chủ';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function connectTikTokLive(usernameOrUrl) {
  const cleanUser = await resolveTikTokUsername(usernameOrUrl);
  if (!cleanUser) {
    throw new Error('Không tìm thấy @username hợp lệ từ dữ liệu nhập vào');
  }

  if (tiktokConn) {
    try {
      await tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }

  state.tiktok = {
    connected: false,
    connecting: true,
    username: cleanUser,
    roomId: null,
    viewerCount: 0,
    totalViewers: 0,
    lastError: null
  };
  liveWatch.wanted = true;
  liveWatch.lastDataAt = Date.now();
  broadcastNotification('temple.state', getPublicState());

  const conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false
  });
  tiktokConn = conn;

  conn.on(ControlEvent.CONNECTED, (roomState) => {
    if (conn !== tiktokConn) return;
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || conn.roomId || null;
    state.tiktok.lastError = null;
    console.log(`[TikTok Live] Đã kết nối phòng @${cleanUser} (roomId: ${state.tiktok.roomId})`);
    broadcastNotification('temple.state', getPublicState());
  });

  // Kết nối cũ ngắt sau khi đã có kết nối mới thì bỏ qua, tránh báo nhầm là mất kết nối
  conn.on(ControlEvent.DISCONNECTED, () => {
    if (conn !== tiktokConn) return;
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    console.log(`[TikTok Live] Đã ngắt kết nối @${cleanUser}`);
    broadcastNotification('temple.state', getPublicState());
  });

  conn.on(WebcastEvent.STREAM_END, () => {
    if (conn !== tiktokConn) return;
    state.tiktok.connected = false;
    console.log(`[TikTok Live] Phiên live @${cleanUser} đã kết thúc, sẽ tự kết nối lại khi có phiên mới`);
    broadcastNotification('temple.state', getPublicState());
  });

  conn.on('decodedData', () => {
    if (conn === tiktokConn) liveWatch.lastDataAt = Date.now();
  });

  // Thư viện gửi lỗi dạng { info, exception }: ghép lại thành câu đọc được, bỏ qua lỗi trùng lặp khi đang thử kết nối lại
  conn.on(ControlEvent.ERROR, (err) => {
    if (conn !== tiktokConn) return;
    const detail = err?.exception?.message || err?.message || '';
    const message = [err?.info, detail].filter(Boolean).join(': ') || String(err);
    state.tiktok.lastError = message;
    if (message !== liveWatch.lastLoggedError) {
      liveWatch.lastLoggedError = message;
      console.warn('[TikTok Live Warning]', message);
    }
    broadcastNotification('temple.state', getPublicState());
  });

  // Số mắt đang xem nằm ở viewerCount/total (live chế độ Game thường để 0); totalUser là tổng lượt xem cả phiên
  tiktokConn.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(data?.viewerCount || data?.total || 0);
    const totalViewers = Number(data?.totalUser || 0);
    if (viewerCount > 0) state.tiktok.viewerCount = viewerCount;
    if (totalViewers > 0) state.tiktok.totalViewers = totalViewers;
    if (viewerCount > 0 || totalViewers > 0) {
      broadcastNotification('temple.viewerCount', {
        viewerCount: state.tiktok.viewerCount,
        totalViewers: state.tiktok.totalViewers
      });
    }
  });

  tiktokConn.on(WebcastEvent.MEMBER, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    Rituals.memberJoin({ user, uniqueId, avatar });
  });

  tiktokConn.on(WebcastEvent.CHAT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const commentText = data?.content || data?.comment || '';
    console.log(`[TikTok Chat] ${user}: ${commentText}`);
    parseViewerComment(commentText, user, uniqueId, avatar);
  });

  tiktokConn.on(WebcastEvent.LIKE, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const likeCount = Math.min(15, Math.max(1, Number(data?.count ?? data?.likeCount ?? 1)));
    Rituals.strikeWoodenFish({ user, uniqueId, avatar, count: likeCount });
  });

  // FOLLOW / SHARE là sự kiện SOCIAL đã được thư viện tách sẵn: chỉ nghe 2 sự kiện này để không cảm ơn trùng
  tiktokConn.on(WebcastEvent.FOLLOW, (data) => handleSocialThanks('follow', extractUserFromEvent(data)));
  tiktokConn.on(WebcastEvent.SHARE, (data) => handleSocialThanks('share', extractUserFromEvent(data)));

  tiktokConn.on(WebcastEvent.GIFT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const details = data?.giftDetails || data?.gift || {};
    const giftId = String(data?.giftId || details?.id || 'gift');
    handleIncomingGift({
      user,
      uniqueId,
      avatar,
      giftId,
      giftName: details?.giftName || details?.name || data?.giftName || 'Hoa Hồng',
      diamondCount: Number(details?.diamondCount || data?.diamondCount || 1),
      streakable: Number(details?.giftType ?? data?.giftType) === 1,
      repeatCount: Number(data?.repeatCount || 1),
      repeatEnd: Boolean(Number(data?.repeatEnd || 0)),
      streakKey: data?.groupId ? `${uniqueId}_${giftId}_${data.groupId}` : ''
    });
  });

  try {
    const roomState = await conn.connect();
    if (conn !== tiktokConn) return state.tiktok;
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || conn.roomId || null;
    const roomData = roomState?.roomInfo?.data || {};
    const initialViewers = Number(roomData.user_count || roomData.stats?.watch_user_count || 0);
    const initialTotal = Number(roomData.stats?.total_user || 0);
    if (initialViewers > 0) state.tiktok.viewerCount = initialViewers;
    if (initialTotal > 0) state.tiktok.totalViewers = initialTotal;
    liveWatch.lastDataAt = Date.now();
    broadcastNotification('temple.state', getPublicState());
    return state.tiktok;
  } catch (err) {
    if (conn !== tiktokConn) throw err;
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    state.tiktok.lastError = err?.message || 'Không thể kết nối phòng Live (kiểm tra tài khoản đang phát Live chưa)';
    broadcastNotification('temple.state', getPublicState());
    throw new Error(state.tiktok.lastError);
  }
}

// Tự giữ kết nối với phiên live hiện tại: kết nối lại khi mất kết nối, khi phiên cũ kết thúc
// hoặc khi 3 phút không nhận được dữ liệu nào (thường là do đã mở phiên live mới với roomId khác)
const liveWatch = { wanted: false, lastDataAt: 0, busy: false, retries: 0, lastLoggedError: '' };

async function checkLiveConnection() {
  if (!liveWatch.wanted || liveWatch.busy || state.tiktok.connecting || !state.tiktok.username) return;
  const stale = state.tiktok.connected && Date.now() - liveWatch.lastDataAt > 3 * 60 * 1000;
  if (state.tiktok.connected && !stale) return;
  liveWatch.busy = true;
  try {
    // Chỉ báo lần đầu và mỗi 5 phút để cửa sổ server không bị trôi log khi kênh chưa phát live
    if (stale || liveWatch.retries % 10 === 0) {
      console.log(`[TikTok Live] ${stale ? 'Không nhận được dữ liệu 3 phút' : 'Kênh chưa phát live'}, đang chờ và thử kết nối lại @${state.tiktok.username} mỗi 30 giây...`);
    }
    liveWatch.retries += 1;
    await connectTikTokLive(state.tiktok.username);
    liveWatch.retries = 0;
    liveWatch.lastLoggedError = '';
  } catch (err) {
    // Kênh chưa phát live: thử lại ở lượt kiểm tra sau
  } finally {
    liveWatch.busy = false;
  }
}

function disconnectTikTokLive() {
  liveWatch.wanted = false;
  if (tiktokConn) {
    try {
      tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }
  state.tiktok.connected = false;
  state.tiktok.connecting = false;
  state.tiktok.viewerCount = 0;
  state.tiktok.totalViewers = 0;
  broadcastNotification('temple.state', getPublicState());
  return state.tiktok;
}

// ============================================================================
// 6. AUTO-SIMULATION ENGINE (CHẾ ĐỘ TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI XEM)
// ============================================================================
let autoSimTimer = null;
const SIM_DEVOTEES = [
  { user: 'Ngọc Anh Nguyễn', uniqueId: 'ngocanh.98', wish: 'Con thành tâm cầu cho bố mẹ luôn mạnh khỏe, bình an' },
  { user: 'Trần Minh Quân', uniqueId: 'minhquan_bds', wish: 'Cầu tháng mới công việc thuận buồm xuôi gió, tài lộc hanh thông' },
  { user: 'Diệu Thảo Tâm An', uniqueId: 'tam_an_99', wish: 'Nam Mô A Di Đà Phật, nguyện cầu thế giới hòa bình chúng sinh an lạc' },
  { user: 'Lê Hoàng Nam', uniqueId: 'hoangnam.dev', wish: 'Cầu thi cử đỗ đạt điểm cao, sự nghiệp rộng mở' },
  { user: 'Phạm Thanh Hà', uniqueId: 'thanhha.lotus', wish: 'Cầu gia đạo êm ấm, con cái ngoan ngoãn học giỏi' },
  { user: 'Vũ Đức Thịnh', uniqueId: 'ducthinh88', wish: 'Con xin gieo một quẻ cầu tài lộc đầu năm' }
];

function runSingleSimulationStep() {
  const pick = SIM_DEVOTEES[Math.floor(Math.random() * SIM_DEVOTEES.length)];
  const roll = Math.random();
  if (roll < 0.30) {
    Rituals.burnIncense({ user: pick.user, uniqueId: pick.uniqueId, count: 3, wish: pick.wish });
  } else if (roll < 0.55) {
    Rituals.sendPrayer({ user: pick.user, uniqueId: pick.uniqueId, wish: pick.wish });
  } else if (roll < 0.75) {
    Rituals.drawFortune({ user: pick.user, uniqueId: pick.uniqueId, topic: pick.wish });
  } else if (roll < 0.90) {
    Rituals.offerGift({ user: pick.user, uniqueId: pick.uniqueId, giftType: 'lotus', coins: 15, giftName: 'Hoa Sen Vàng Tinh Khiết' });
  } else {
    Rituals.ringBell({ user: pick.user, uniqueId: pick.uniqueId, count: 1, wish: pick.wish, readTts: true });
  }
}

function configureAutoSim(enabled) {
  state.settings.autoSim = Boolean(enabled);
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  if (state.settings.autoSim) {
    runSingleSimulationStep();
    autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 9500);
  }
}

// ============================================================================
// 7. JSON-RPC 2.0 DISPATCHER
// ============================================================================
async function handleRpcCall(method, params = {}) {
  switch (method) {
    case 'temple.getState':
      return getPublicState();
    case 'temple.burnIncense':
      return Rituals.burnIncense(params);
    case 'temple.strikeWoodenFish':
      return Rituals.strikeWoodenFish(params);
    case 'temple.ringBell':
      return Rituals.ringBell(params);
    case 'temple.sendPrayer':
      return Rituals.sendPrayer(params);
    case 'temple.offerGift':
      return Rituals.offerGift(params);
    case 'temple.drawFortune':
      return Rituals.drawFortune(params);
    case 'temple.grandCeremony':
      return Rituals.grandCeremony(params);
    case 'temple.updateSettings':
      return Rituals.updateSettings(params);
    case 'temple.resetMerit':
      return Rituals.resetMerit();
    case 'temple.comment':
      return parseViewerComment(params.comment, params.user, params.uniqueId, params.avatar);
    case 'temple.speak': {
      const res = await zeroTts.synthesize(params.text, params.voice || 'maichi');
      if (res.ok && params.broadcast !== false) {
        broadcastNotification('tts.play', {
          text: params.text,
          voice: res.voice,
          url: res.url
        });
      }
      return res;
    }
    case 'temple.getCalendar':
      return {
        ...getCalendar(),
        festivals: Object.entries(FESTIVALS).map(([key, f]) => ({ key, name: f.name, multiplier: f.multiplier })),
        sutras: SUTRAS.map((s) => ({ key: s.key, title: s.title }))
      };
    case 'temple.setFestival':
      return Rituals.updateSettings({ festivalOverride: FESTIVALS[params.key] ? params.key : '' });
    case 'temple.getThanks':
      return getThanksConfig();
    case 'temple.updateThanks':
      return updateThanksConfig(params);
    case 'temple.simulateGift':
      return handleIncomingGift({
        user: params.user || 'Thí Chủ Thử Quà',
        uniqueId: params.uniqueId || '',
        avatar: params.avatar || '',
        giftId: params.giftId || String(params.giftName || 'rose'),
        giftName: params.giftName || 'Hoa Hồng',
        diamondCount: Number(params.diamondCount) || 1,
        streakable: params.streakable !== false,
        repeatCount: Number(params.repeatCount) || 1,
        repeatEnd: params.repeatEnd !== false
      });
    case 'temple.simulateSocial':
      return handleSocialThanks(params.kind === 'share' ? 'share' : 'follow', {
        user: params.user || 'Thí Chủ Hữu Duyên',
        uniqueId: params.uniqueId || '',
        avatar: params.avatar || ''
      });
    case 'temple.memberJoin':
      return Rituals.memberJoin(params);
    case 'temple.startChant':
      return startChant({ manual: true, sutra: params.sutra });
    case 'temple.ttsStatus':
      return zeroTts.getStatus();
    case 'live.connect':
      return await connectTikTokLive(params.username);
    case 'live.disconnect':
      return disconnectTikTokLive();
    case 'live.setAutoSim':
      configureAutoSim(Boolean(params.enabled));
      saveState();
      broadcastNotification('temple.state', getPublicState());
      return getPublicState();
    default:
      throw new Error(`Không tìm thấy phương thức JSON-RPC: ${method}`);
  }
}

// ============================================================================
// 8. EXPRESS + WEBSOCKET SERVER
// ============================================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/tts-cache', express.static(TTS_CACHE_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// HTTP JSON-RPC 2.0 Endpoint
app.post('/rpc', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC Request: thiếu method' }
    });
  }
  try {
    const result = await handleRpcCall(method, params || {});
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      result
    });
  } catch (err) {
    res.status(200).json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      error: { code: -32000, message: err.message || 'Server error' }
    });
  }
});

// ZeroTTS HTTP Endpoint (Mai Chi default)
app.all('/api/tts', async (req, res) => {
  const text = (req.body?.text || req.query?.text || '').trim();
  const voice = (req.body?.voice || req.query?.voice || state.settings.ttsVoice || 'maichi').trim();
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Thiếu nội dung text cần đọc' });
  }
  const result = await zeroTts.synthesize(text, voice);
  res.json(result);
});

app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastNotification(method, params) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'temple.state',
      params: getPublicState()
    })
  );

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      return;
    }
    if (!msg || !msg.method) return;
    try {
      const result = await handleRpcCall(msg.method, msg.params || {});
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result
          })
        );
      }
    } catch (err) {
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32000, message: err.message || 'RPC Error' }
          })
        );
      }
    }
  });
});

const zeroTts = new ZeroTTSManager();

server.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`🪷 CHÙA ONLINE TIKTOK LIVE RPC ĐÃ KHỞI ĐỘNG`);
  console.log(`📺 Màn hình Live (9:16 OBS): http://localhost:${PORT}`);
  console.log(`🎛️ Bảng điều khiển RPC Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌 JSON-RPC 2.0 Endpoint   : http://localhost:${PORT}/rpc (ws://localhost:${PORT}/ws)`);
  console.log(`============================================================`);

  // Theo dõi sang ngày mới / ngày lễ để đổi giao diện Chánh Điện & đọc lời chào
  checkFestivalChange();
  setInterval(checkFestivalChange, 60 * 1000);
  setInterval(checkLiveConnection, 30 * 1000);

  // Tự động kết nối tới @zenfacts_vn ngay khi khởi động server
  const defaultChannel = process.env.TIKTOK_USER || state.tiktok?.username || 'zenfacts_vn';
  if (defaultChannel) {
    connectTikTokLive(defaultChannel).catch((err) => {
      console.warn(`[Auto-Connect @${defaultChannel}] Chưa kết nối được ngay:`, err.message);
    });
  }
});
