# TOEIC Trainer — Frontend (Expo SDK 57)

Ứng dụng di động học TOEIC: React Native + Expo SDK 57, TypeScript, expo-router, React 19.
Giao diện glass sáng (sky `#E9F2FB`, thẻ kính trắng mờ, xanh `#1D7FE0`, teal `#12B5A5`), toàn bộ nhãn tiếng Việt.

> Tài liệu yêu cầu gốc: `TOEIC Trainer — Requirements & Plan.docx` (bản v1.0). Frontend này chỉ nói
> chuyện với backend Java Spring Boot — app không giữ bất kỳ API key nào.

## Chạy thử

```bash
cd frontend
npm install
npx expo start            # quét QR bằng Expo Go (SDK 57)
```

### Trỏ tới backend

Ưu tiên biến môi trường (file `.env` hoặc EAS):

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
```

Nếu không đặt, app tự đoán host từ Expo dev server (máy thật cùng Wi-Fi sẽ gọi
`http://<expo-host>:8080`; giả lập Android dùng `10.0.2.2:8080`; web/iOS simulator dùng
`localhost:8080`). Logic nằm ở `src/config/env.ts`.

## EAS Update (OTA)

`app.json` đã bật `expo-updates` (`checkAutomatically: ON_APP_START`). Trước khi publish bản OTA đầu
tiên, chủ sở hữu project phải chạy:

```bash
npx eas-cli update:configure
```

Lệnh này sẽ điền `updates.url` thật (hiện là placeholder `https://u.expo.dev/00000000-…`) và projectId
vào `app.json`. Sau đó:

```bash
eas update --branch production --message "..."
```

## Cấu trúc

```
app/
  index.tsx            # boot: điều hướng theo trạng thái đăng nhập/onboarding
  onboarding.tsx       # 5 bước: mục tiêu, phút/ngày, ngày học, test đầu vào, lộ trình
  (auth)/              # login, register, forgot-password
  (tabs)/              # home, vocab, flashcards, practice, more (tab bar kính mờ)
  (ai)/                # semantic, camera, docs, speaking, handsfree
  word/[id].tsx        # chi tiết từ (+ sửa/xoá từ tự tạo)
  grammar/             # danh sách + chi tiết bài ngữ pháp + quiz
  practice/            # run (Part/sổ lỗi/thi thử), test-setup, result
  notebook/            # từ đã lưu, câu bookmark, lỗi sai
  profile/             # thống kê, thành tích, mục tiêu, cài đặt giọng đọc
  admin/               # đăng nhập ADMIN + dashboard CRUD
src/
  config/env.ts        # API_BASE_URL (env hoặc tự đoán host)
  theme.ts             # glass theme
  types/               # DTO khớp hợp đồng backend
  services/
    api.client.ts      # fetch wrapper + gắn JWT + ApiError
    auth/vocab/practice/ai/admin.service.ts   # service theo module
    tts.service.ts     # phát giọng George qua backend, cache 3 lớp
    storage.ts         # token/user/onboarding/admin token/key riêng
  context/AuthContext.tsx
  components/ui|vocab|practice/
  hooks/useRecorder.ts # thu âm expo-audio dùng chung
```

## Giọng đọc (Speechify George)

- Mặc định app gọi **backend proxy**: `GET /api/tts?text=…&voice=george` → bytes MP3.
- Cache 3 lớp: bộ nhớ (phiên) → file trên máy (tên file = sha256 của text) → cache server.
- Trạng thái phát luôn hiển thị trung thực: *đang tạo giọng George / phát từ bộ nhớ đệm / giọng dự
  phòng của máy* (fallback khi backend/Speechify lỗi).
- Mục Hồ sơ có thêm ô **"Khóa Speechify của riêng bạn (tùy chọn)"** — chỉ lưu trên máy, dùng để gọi
  Speechify trực tiếp khi người dùng muốn, có nhãn rõ ràng. Không có key chung nào trong app.

## Hợp đồng backend (Spring Boot cần implement)

Base URL + JWT Bearer. Tóm tắt endpoint (chi tiết type xem `src/types/index.ts`):

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/forgot-password` |
| User | `GET/PATCH /api/users/me`, `GET /api/dashboard`, `POST /api/onboarding/complete` |
| Từ vựng | `GET /api/vocab/topics`, `GET /api/vocab?search=&topic=&page=&size=`, `GET /api/vocab/{id}`, `POST/PUT/DELETE /api/vocab/custom[/{id}]` |
| Flashcard | `GET /api/flashcards/due?limit=`, `POST /api/flashcards/review {wordId?,customWordId?,rating}` |
| Luyện tập | `GET /api/practice/questions?part=&limit=`, `POST /api/practice/attempts`, `GET /api/practice/mistakes` |
| Thi thử | `POST /api/tests/start {kind}`, `GET /api/tests/{id}/questions`, `POST /api/tests/{id}/submit`, `GET /api/tests/{id}/result` |
| Ngữ pháp | `GET /api/grammar`, `GET /api/grammar/{id}`, `POST /api/grammar/{id}/quiz` |
| Sổ tay | `GET /api/notebook`, `POST/DELETE /api/notebook/saved-words`, `POST/DELETE /api/notebook/bookmarks` |
| Placement | `POST /api/placement/submit` |
| TTS | `GET /api/tts?text=&voice=george` → `audio/mpeg` |
| AI | `GET /api/ai/availability`, `GET /api/ai/semantic?word=`, `POST /api/ai/semantic/save`, `POST /api/ai/photo` (multipart), `POST /api/ai/photo/save`, `POST /api/ai/docs/upload` (multipart), `GET /api/ai/docs/{id}`, `GET /api/ai/docs/history`, `GET /api/ai/speaking/samples`, `POST /api/ai/speaking/score` (multipart audio), `GET /api/ai/speaking/history`, `POST /api/ai/handsfree/session`, `POST /api/ai/handsfree/answer` (multipart audio) |
| Admin | `POST /api/admin/login`, `GET /api/admin/overview`, CRUD `GET/POST/PUT/DELETE /api/admin/questions`, `/api/admin/vocabulary`, `/api/admin/grammar` |

Khi AI/TTS không khả dụng, backend trả message rõ ràng — app hiển thị đúng message đó, không tự bịa
nội dung thay thế.

## Kiểm tra chất lượng

```bash
npm run typecheck   # tsc --noEmit → 0 lỗi
npm run lint        # eslint
npx expo-doctor
npx expo export --platform android
```
