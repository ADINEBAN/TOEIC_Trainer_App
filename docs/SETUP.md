# Hướng dẫn cấu hình & chạy TOEIC Trainer

## 1. Supabase (database)

1. Vào [supabase.com](https://supabase.com) → project của bạn → **Database**.
2. Mục **Connection string**, chọn chế độ **Session**, copy chuỗi dạng:
   `postgresql://postgres.[ref]:[PASSWORD]@aws-0-...pooler.supabase.com:5432/postgres`
3. Tách thành 3 biến cho backend:
   - `DB_URL=jdbc:postgresql://aws-0-...pooler.supabase.com:5432/postgres`
   - `DB_USER=postgres.[ref]`
   - `DB_PASSWORD=[PASSWORD]`
4. Chạy backend lần đầu — Flyway tự tạo 16 bảng + seed 42 từ vựng mẫu.
   Mở **Table Editor** trong Supabase để kiểm chứng.

## 2. Speechify (giọng George)

1. Đăng ký tại `platform.speechify.ai` → **API Keys** → tạo key mới, copy ngay.
2. Đặt `SPEECHIFY_API_KEY=<key>` cho backend (biến môi trường server).
3. Chưa có key: API `/api/tts` trả `503 {fallback:true}` và app tự dùng giọng máy,
   hiển thị rõ "giọng dự phòng".

## 3. AI (5 tính năng AI for Life)

1. Chuẩn bị một API key OpenAI-compatible (ví dụ OpenAI, hoặc bất kỳ provider nào
   có endpoint `/v1/chat/completions`).
2. Đặt `AI_API_KEY`, `AI_API_BASE` (mặc định `https://api.openai.com/v1`),
   `AI_MODEL` (mặc định `gpt-4o-mini`).
3. Chưa có key: các màn hình AI hiển thị đúng thông báo từ backend, không giả lập.
4. Chấm giọng nói phía server cần provider hỗ trợ transcription
   (`AI_TRANSCRIBE_MODEL`, mặc định `whisper-1`); chưa có thì Speaking Coach dùng
   chấm heuristic trên transcript và ghi rõ `fallback:true`.

## 4. Chạy trên điện thoại thật (Expo Go)

```bash
cd frontend && npm install && npx expo start
```

- Cài **Expo Go** đúng **SDK 57** trên điện thoại, cùng Wi-Fi với máy tính.
- Quét mã QR. App tự trỏ về IP máy tính để gọi backend cổng 8080
  (hoặc đặt `EXPO_PUBLIC_API_BASE_URL=http://<IP>:8080` trong `.env` của frontend).
- Backend phải đang chạy (`mvn spring-boot:run`).

## 5. Trang admin

```bash
cd frontend && npx expo start --web
# mở http://localhost:8081/admin
```

Đăng nhập bằng tài khoản có `role = ADMIN`. Tạo tài khoản admin đầu tiên bằng cách
đăng ký thường rồi sửa `role` thành `ADMIN` trong bảng `users` (Supabase Table Editor).

## 6. OTA updates (EAS)

```bash
cd frontend
npm i -g eas-cli
eas login
eas update:configure     # một lần duy nhất, tạo projectId trong app.json
eas update --branch production --message "mô tả thay đổi"
```

Máy đã cài bản dev/production có `expo-updates` sẽ tự tải bản mới khi mở app.
Chỉ sửa JS/logic mới dùng OTA; thêm thư viện native → `eas build --platform android`.

## 7. Deploy backend

Backend là Spring Boot thuần — deploy ở đâu cũng được (Render, Railway, VPS…):

```bash
cd backend && mvn -DskipTests package
java -jar target/toeic-trainer-backend-*.jar
```

Đặt toàn bộ biến môi trường ở mục trên trong phần Environment của host.
Schema database đi qua Flyway migration có phiên bản — không sửa tay trên DB thật.
