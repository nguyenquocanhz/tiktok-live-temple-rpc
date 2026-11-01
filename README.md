# 🪷 Chùa Linh Ứng Online — TikTok Live RPC (9:16 Interactive Buddhist Sanctuary)

Hệ thống phát trực tiếp tương tác (**Interactive TikTok Live Stream & JSON-RPC 2.0**) chuẩn khung dọc **9:16 (`1080×1920`)** dành cho **OBS Studio / TikTok Live Studio**, chạy siêu nhẹ trên **Bun.js** và tích hợp giọng đọc AI tiếng Việt **ZeroTTS (`zeroweight-ai/ZeroTTS`)**.

Người xem trên TikTok Live tương tác trực tiếp qua **Bình luận (Comment)**, **Thả tim (Like)**, **Chia sẻ / Follow** và **Tặng quà (Gift)** để thực hiện các nghi thức tâm linh trên màn hình Chánh Điện **Đức Phật A Di Đà**:
- 🔥 **Thắp hương & Đảnh lễ Tam Bái (8-Frame Walking & Prostration)**: Nhân vật Phật tử mặc áo lam bước đi từng bước dọc thảm đỏ hoa sen lên trước Lư Hương Đỉnh Đồng, hạ gối quỳ và thực hiện 3 lạy Ngũ thể đầu địa hướng về Đức Phật A Di Đà.
- 🏮 **Thả Đèn Hoa Đăng / Sớ Cầu Nguyện**: Bình luận lời khấn sẽ bay lên thành Đèn Hoa Đăng kèm giọng đọc AI đọc lời cầu nguyện.
- 🎋 **Xin Xăm / Gieo Quẻ Đầu Năm (Đồng bộ Giọng đọc & Tờ Giải Quẻ)**: Tự động lắc ống xăm và mở tờ Giải Quẻ (Thượng Thượng Cát, Đại Cát, Thượng Cát...) đúng thời điểm giọng đọc bắt đầu vang lên.
- 🪵 **Gõ Mõ & 🔔 Thỉnh Đại Hồng Chung**: Thả tim gõ mõ tích điểm Công Đức, chia sẻ/follow thỉnh chuông đồng lan tỏa sóng âm vàng và kích hoạt làn sóng vái lạy của 40+ Phật tử trong Đạo Tràng.
- 📜 **Bảng Vàng Công Đức (`TẤM LÒNG THÀNH` & 6 Đệm Quỳ VIP)**: Vinh danh trực tiếp người xem thật có điểm Công Đức cao nhất trên 6 đệm quỳ gấm đỏ trước bàn thờ Phật.

---

## 📸 Hình Ảnh Demo Giao Diện

### 1. Màn hình Chánh Điện 9:16 & Bảng Điều Khiển Nhanh (`http://localhost:3000`)
![Màn hình Chánh Điện và Điều Khiển Nhanh](docs/demo/demo-main-stage.png)

### 2. Chế độ OBS Browser Source 9:16 Sạch (`http://localhost:3000/?obs=1`) & Gieo Quẻ Linh Xăm
| Màn hình OBS 9:16 (`?obs=1`) | Tờ Giải Quẻ Linh Xăm (Đồng bộ Giọng Đọc) |
| :---: | :---: |
| ![OBS 9:16 Mode](docs/demo/demo-obs-9x16.png) | ![Fortune Oracle Modal](docs/demo/demo-fortune-oracle.png) |

### 3. Bảng Điều Khiển JSON-RPC 2.0 & Admin (`http://localhost:3000/admin`)
![Admin JSON-RPC Panel](docs/demo/demo-admin-panel.png)

---

## ⚡ Kiến Trúc & Tối Ưu Hóa Hiệu Suất (Siêu Nhẹ CPU/GPU)

- **Runtime**: Chạy trực tiếp trên **Bun.js** (`~0.1% CPU` khi chờ).
- **Canvas Particle Engine (`public/js/particles.js`)**:
  - Khóa tốc độ vẽ ở **30 FPS** ổn định, tự động tạm dừng khi ẩn tab (`document.hidden`).
  - Pre-render toàn bộ Khói hương, Hạt vàng và Cánh hoa sen ra Offscreen Canvas 1 lần duy nhất lúc khởi tạo (`drawImage`), không gọi `createRadialGradient` hay `shadowBlur` trong vòng lặp frame.
- **Zero-Flicker 8-Frame Sprite Stack (`public/js/live.js` & `public/css/live.css`)**:
  - Nạp sẵn cả 8 khung hình chuyển động (`walk1`, `walk2`, `kneelDown`, `kneel`, `forehead`, `bowMid`, `prostrate`, `prostrateDeep`) vào GPU với bóng đổ (drop-shadow) đã bake sẵn trong PNG, loại bỏ hoàn toàn hiện tượng nháy/mất hình khi chuyển tư thế.
- **ZeroTTS Worker (`tts_worker.py`)**:
  - Tiến trình Python thường trú nạp sẵn model `zeroweight-ai/ZeroTTS` (`intra_op_num_threads=3`, `OMP_WAIT_POLICY=PASSIVE` → **`0.0% CPU` khi chờ**).
  - Tổng hợp nguyên câu trong 1 lần gọi (`single-pass synthesis`), khử DC offset, chuẩn hóa đỉnh âm lượng (`peak <= 0.90`) và làm mượt 2 đầu sóng âm (`cosine fade-in/out`) chống xước/rè tiếng.
- **Bộ Lọc Chặn Ký Tự Lạ & Spam (`server.js` & `tts_worker.py`)**:
  - Chặn tự động các ký tự Cuneiform (`𒐫`), chữ Ả Rập gây lag, Braille, Zalgo, bình luận chỉ toàn dấu chấm (`...`) hoặc từ ngữ phản cảm.
  - Tự động chuẩn hóa Unicode (`NFKC` → `NFC`) chuyển tên kiểu chữ toán học về tiếng Việt sạch trước khi đọc TTS.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Nhanh

### 1. Yêu cầu hệ thống
- [Bun.js](https://bun.sh/) (`>= 1.1`)
- Python `3.10+` & [`uv`](https://github.com/astral-sh/uv) (để tạo môi trường `.venv` chạy `zerotts`)

### 2. Cài đặt thư viện
```bash
# Cài đặt dependencies cho Bun / Node
bun install

# Tạo môi trường Python .venv và cài đặt ZeroTTS
uv venv .venv
uv pip install --python .venv/bin/python zerotts pillow
# Windows: uv pip install --python .venv\Scripts\python.exe zerotts pillow
```

> Chưa cài ZeroTTS thì server vẫn chạy bình thường, chỉ tắt giọng đọc (chữ kinh vẫn chạy theo nhịp ước lượng).

### 3. Khởi chạy Server
```bash
bun start
# Hoặc chế độ tự động reload khi sửa code:
bun run dev
```

Mặc định server chạy tại cổng `3000`:
- **Màn hình Live + Điều khiển nhanh**: [http://localhost:3000](http://localhost:3000)
- **Màn hình OBS Browser Source (Sạch 9:16)**: [http://localhost:3000/?obs=1](http://localhost:3000/?obs=1) *(Đặt kích thước Browser Source trong OBS là `1080 × 1920`)*
- **Bảng điều khiển Admin & RPC**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🎮 Bảng Quy Tắc Tương Tác TikTok Live

| Sự kiện TikTok Live | Điều kiện / Từ khóa | Nghi thức trên Chánh Điện | Điểm Công Đức |
| :--- | :--- | :--- | :---: |
| **Thả tim (Like)** | Mỗi đợt thả tim | Gõ mõ gỗ tụng kinh + Làn sóng Phật tử vái lạy | `+1` / tim |
| **Follow / Share** | Theo dõi hoặc chia sẻ | Thỉnh Đại Hồng Chung ngân vang + Sóng âm vàng | `+10` |
| **Bình luận Thắp hương** | `thắp hương`, `dâng hương`, `bái phật`, `lạy phật` | Phật tử bước dọc thảm đỏ lên trước Lư Hương, quỳ đảnh lễ 3 lạy + Đọc tên khấn | `+15` |
| **Bình luận Cầu nguyện** | `cầu ...`, `nguyện ...`, `nam mô`, `a di đà phật`, `bình an`, `chúc ...` | Bước lên đảnh lễ + Thả Đèn Hoa Đăng mang lời khấn bay lên trời + Đọc lời cầu nguyện | `+10` |
| **Bình luận Xin xăm** | `xin xăm`, `gieo quẻ`, `rút quẻ`, `quẻ` | Lắc ống xăm + Mở tờ Giải Quẻ đồng bộ đúng lúc giọng đọc bắt đầu vang lên | `+10` |
| **Tặng quà Nhỏ (1–4 xu)** | Hoa hồng (Rose), Heart Me... | Bước lên dâng Đài Hoa Sen Vàng + Thắp 3 nén hương + Đọc lời cảm tạ | `+20` / xu |
| **Tặng quà Vừa (5–99 xu)** | Đèn lưu ly, Mâm ngũ quả... | Dâng Đèn Lưu Ly / Mâm Ngũ Quả + Thỉnh Chuông + Đọc lời chúc phúc | `+30` / xu |
| **Tặng quà Lớn (≥ 100 xu)** | Quà ≥ 100 xu | **Đại Lễ Kim Long Chầu Phật**: Mưa hoa sen vàng, Hào quang vạn trượng, Chuông đồng ngân vang | `+50` / xu |

---

### 🙏 Người xem vào phòng Live
Mỗi người xem vừa vào phòng được `+1` công đức và hiện lời chào *"vừa vào Chánh Điện"* ở đầu thảm đỏ. Mỗi người chỉ được chào 1 lần mỗi 10 phút, cả phòng tối đa 1 lời chào mỗi 2 giây, nên phòng đông người cũng không bị tràn màn hình.

---

## 📅 Lịch Âm & Ngày Lễ Phật Giáo

Chánh Điện tự đổi theo **lịch âm Việt Nam (UTC+7, có tháng nhuận)**. Lịch âm hiện ở góc trên bên trái. Vào ngày lễ, sân khấu đổi sắc màu, hiện banner chào mừng, giọng đọc lời chào và **nhân điểm Công Đức**:

| Ngày (Âm lịch) | Ngày lễ | Công Đức |
| :--- | :--- | :---: |
| Mùng 1 – 3 tháng Giêng / Đêm Giao Thừa | Tết Nguyên Đán | `x3` |
| 15/1 | Rằm Tháng Giêng — Tết Nguyên Tiêu | `x3` |
| 15/4 | Đại Lễ Phật Đản | `x3` |
| 15/7 | Đại Lễ Vu Lan Báo Hiếu | `x3` |
| 17/11 | Vía Đức Phật A Di Đà | `x3` |
| 19/2, 19/6, 19/9 | Vía Quan Thế Âm Bồ Tát | `x2` |
| 15/10 · 8/12 | Tết Hạ Nguyên · Phật Thành Đạo | `x2` |
| Mùng 1 & Rằm hằng tháng | Ngày Sóc Vọng | `x2` |

Ngày đại lễ (`x3`) có thêm mưa hoa sen định kỳ. Trên Bảng Điều Khiển Nhanh có ô **"Xem trước"** để thử giao diện từng ngày lễ, hoặc gọi `temple.setFestival`.

## 📿 Tụng Kinh Tập Thể (Mục Tiêu Cộng Đồng)

Thanh **nhịp mõ** phía trên HUD gom tương tác của cả phòng: mỗi tim = 1 nhịp, mỗi bình luận nghi thức = 5, thỉnh chuông = 10, mỗi xu quà = 5. Khi đủ mục tiêu (mặc định `300`, đổi được trên Dock), cả Đạo Tràng cùng tụng kinh:
- Chữ kinh chạy theo giọng đọc ZeroTTS, có tiếng mõ theo từng câu, chuông mở đầu và kết thúc, Phật tử hai bên cùng vái lạy.
- Xoay vòng **Bát Nhã Tâm Kinh**, **Niệm Hồng Danh A Di Đà**, **Chú Vãng Sanh** (ngày vía A Di Đà ưu tiên niệm Phật, Vu Lan ưu tiên Chú Vãng Sanh). Bài nào cũng kết thúc bằng bài **Hồi Hướng**.
- Cuối buổi tụng đọc tên những người góp nhiều nhịp mõ nhất. Mỗi người góp mõ được thưởng `+20` công đức (nhân theo ngày lễ).

---

## 🔌 Giao Thức JSON-RPC 2.0 (`POST /rpc` & `ws://localhost:3000/ws`)

Bạn có thể gọi trực tiếp từ **TikFinity**, **Streamer.bot**, webhook hoặc `curl`:

```bash
# 1. Thắp hương cầu an
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "temple.burnIncense",
    "params": {
      "user": "Thí Chủ Minh Tâm",
      "count": 3,
      "wish": "Cầu gia đình bình an, vạn sự cát tường như ý"
    }
  }'

# 2. Xin xăm / Gieo quẻ đầu năm
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "temple.drawFortune",
    "params": {
      "user": "Thí Chủ Minh Tâm",
      "topic": "Cầu tài lộc và gia đạo bình an"
    }
  }'

# 3. Kết nối tới phòng TikTok Live (@username hoặc link vt.tiktok.com)
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "live.connect",
    "params": {
      "username": "@zenfacts_vn"
    }
  }'
```

### Danh sách JSON-RPC Methods hỗ trợ:
- `temple.getState`: Lấy toàn bộ trạng thái Chánh Điện và Bảng Vàng Công Đức.
- `temple.burnIncense`: Thắp nhang & bước lên đảnh lễ (`user`, `avatar`, `count`, `wish`).
- `temple.sendPrayer`: Thả đèn hoa đăng cầu nguyện (`user`, `avatar`, `wish`).
- `temple.drawFortune`: Lắc ống xăm & gieo quẻ (`user`, `avatar`, `topic`).
- `temple.strikeWoodenFish`: Gõ mõ tích công đức (`user`, `count`).
- `temple.ringBell`: Thỉnh Đại Hồng Chung (`user`, `count`, `wish`).
- `temple.offerGift`: Dâng lễ vật (`user`, `giftType`: `lotus` | `fruit` | `lamp` | `dragon`, `coins`, `giftName`).
- `temple.grandCeremony`: Kích hoạt Đại Lễ Kim Long Chầu Phật (`user`, `coins`, `giftName`).
- `temple.updateSettings`: Cập nhật âm lượng nhạc nền (`musicVolume`), giọng đọc (`ttsVolume`), bật/tắt TTS.
- `temple.resetMerit`: Đặt lại bảng thống kê Công Đức.
- `temple.getCalendar`: Lịch âm hôm nay, ngày lễ, hệ số công đức, danh sách ngày lễ & bài kinh.
- `temple.setFestival`: Xem trước giao diện một ngày lễ (`key`, để trống = theo lịch thật).
- `temple.startChant`: Bắt đầu tụng kinh ngay (`sutra`: `batNha` | `niemPhat` | `vangSanh`, tùy chọn).
- `temple.memberJoin`: Giả lập người xem vào phòng (`user`, `uniqueId`, `avatar`).
- `temple.updateSettings` cũng nhận `chantGoal` (số nhịp mõ cần cho mỗi buổi tụng).
- `live.connect` / `live.disconnect`: Kết nối / Ngắt kết nối phòng TikTok Live.

---

## 📁 Cấu Trúc Thư Mục

```text
├── server.js                  # Bun.js HTTP + WebSocket JSON-RPC 2.0 Server & TikTok Live Connector
├── tts_worker.py              # Tiến trình Python ZeroTTS thường trú (48kHz, chống rè/clipping, lọc ký tự lạ)
├── lunar.js                   # Đổi Dương lịch -> Âm lịch Việt Nam & danh sách ngày lễ Phật giáo
├── chants.js                  # Kinh tụng tập thể (phiên âm Hán Việt) & bài Hồi Hướng
├── data/
│   ├── merit-state.json       # Lưu trữ bền vững Bảng Vàng Công Đức của người xem thật
│   └── tts-cache/             # Bộ đệm file âm thanh WAV đã tổng hợp
├── public/
│   ├── index.html             # Giao diện Chánh Điện 9:16 + Bảng điều khiển nhanh
│   ├── admin.html             # Trang quản trị JSON-RPC 2.0 đầy đủ
│   ├── css/live.css           # Stylesheet tối ưu GPU Compositor
│   ├── js/
│   │   ├── live.js            # Điều phối 8-frame prostration, Đạo Tràng 40 chỗ ngồi & WebSocket RPC
│   │   ├── particles.js       # 30 FPS Offscreen-Sprite Particle Engine (Khói hương, Hoa sen, Sóng âm)
│   │   └── audio.js           # Quản lý nhạc nền auto-ducking, Pháp khí Web Audio & hàng đợi đồng bộ TTS
│   └── assets/                # Hình nền Đức Phật A Di Đà, 8 frame Phật tử áo lam & nhạc nền
└── docs/
    ├── demo/                  # Hình ảnh chụp màn hình demo thực tế
    └── superpowers/specs/     # Tài liệu thiết kế kỹ thuật (Design Spec)
```
