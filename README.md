# TOEIC Trainer — Bản App Thật

Ứng dụng học TOEIC trên điện thoại thật: học từ vựng (SRS), luyện Part 1–7, mock test
chấm /990, ngữ pháp, sổ tay, Speaking Coach, học rảnh tay và 5 tính năng AI for Life.

| Lớp | Công nghệ |
|---|---|
| Frontend | React Native — Expo SDK 57, TypeScript, expo-router, giao diện glass |
| Backend | Java 21, Spring Boot 3, REST API, Spring Security + JWT, Flyway |
| Database | Supabase Postgres (kết nối JDBC trực tiếp) |
| Giọng đọc | Speechify (giọng George, `simba-3.2`) qua backend proxy + cache 3 lớp |
| AI | OpenAI-compatible API qua backend proxy (key ở server) |
| Cập nhật | Expo Updates (OTA) cho JS · backend auto-deploy từ GitHub |

> Đây là bản app thật, tách bạch với bản demo trên Muse (React web). Mọi API key
> (Speechify, AI) chỉ nằm ở biến môi trường phía server — app không chứa key chung.

## Cấu trúc repo

```
frontend/   # Expo app (SDK 57): npx expo start, quét QR bằng Expo Go SDK 57
backend/    # Spring Boot API: mvn spring-boot:run (cần DB_URL/DB_USER/DB_PASSWORD)
docs/       # Tài liệu cấu hình: supabase, eas, speechify, ai
```

## Chạy nhanh (dev)

**Backend**
```bash
cd backend
cp .env.example .env   # điền DB_URL/DB_USER/DB_PASSWORD (Supabase), JWT_SECRET
# Windows (PowerShell): $env:JAVA_HOME="C:\Program Files\Java\jdk-21"
mvn spring-boot:run    # Flyway tự tạo 16 bảng + seed 42 từ vựng mẫu
```

**Frontend**
```bash
cd frontend
npm install
npx expo start         # quét QR bằng Expo Go (SDK 57), cùng Wi-Fi với máy tính
```

App tự nhận địa chỉ máy tính để gọi backend cổng 8080 (xem `frontend/src/config/env.ts`).
Trang admin: mở bản web `npx expo start --web` rồi vào `http://localhost:8081/admin`.

## Biến môi trường backend

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Có | Chuỗi kết nối Supabase Postgres (Database → Connection string, Session mode) |
| `JWT_SECRET` | Có (prod) | Chuỗi bí mật ký JWT, tối thiểu 32 ký tự |
| `SPEECHIFY_API_KEY` | Không | Key Speechify — chưa có thì giọng đọc lùi về giọng máy, app báo rõ |
| `AI_API_KEY`, `AI_API_BASE`, `AI_MODEL` | Không | Key AI OpenAI-compatible — chưa có thì tính năng AI báo rõ, không giả lập |
| `AI_DAILY_CHAR_LIMIT` | Không | Giới hạn ký tự AI/ngày/user (mặc định 200000) |
| `CORS_ALLOWED_ORIGINS` | Không | Mặc định `*` cho dev |
| `STORAGE_DIR` | Không | Thư mục lưu ảnh/file upload (mặc định `./uploads`) |
| `PORT` | Không | Mặc định 8080 |

**Không bao giờ** gửi key qua chat hay commit vào repo.

## Tính năng AI — nói thật

5 tính năng AI (mạng ngữ nghĩa, chụp ảnh học từ, tài liệu→đề thi, Speaking Coach,
học rảnh tay) gọi model có sẵn qua API, kết quả được cache vào database để tái dùng.
**Không có chuyện train lại LLM.** Phần "học" duy nhất là mô hình thích ứng nhỏ
trên dữ liệu của từng người học (điểm thành thạo/đường cong quên cho SRS và gợi ý).
Chấm phát âm dựa trên transcript nhận dạng được, chưa phân tích âm học từng phoneme.

## Đóng gói & cập nhật

- **OTA (khuyên dùng):** `eas update:configure` một lần, sau đó mỗi lần sửa JS chỉ cần
  `eas update --branch production` — máy đã cài tự nhận bản mới khi mở app.
- **Build file cài:** `eas build --platform android` khi thêm thư viện native mới.

Chi tiết xem `docs/`.
