# TOEIC Trainer — Backend (Java Spring Boot)

REST API cho app TOEIC Trainer: auth JWT, từ vựng + SRS, luyện Part 1–7,
placement test, Speaking Coach, thống kê, proxy Speechify (giọng George)
và 5 tính năng AI for Life. Mọi API key (AI, Speechify) nằm ở phía server.

- Java 21 · Spring Boot 3.3.x · Maven
- PostgreSQL (khuyên dùng Supabase Postgres) + Flyway migration
- Group: `com.toeictrainer` · Artifact: `toeic-trainer-backend`

## Chạy nhanh (dev)

```bash
cp .env.example .env   # rồi điền giá trị thật
export $(grep -v '^#' .env | xargs)

export JAVA_HOME=$HOME/tools/jdk21
export PATH=$HOME/tools/jdk21/bin:$HOME/tools/maven/bin:$PATH
mvn spring-boot:run
```

Lần chạy đầu tiên Flyway tự tạo toàn bộ schema (V1), nạp 42 từ vựng mẫu (V2)
và câu hỏi mẫu (V3). Kiểm tra: `GET http://localhost:8080/api/health`.

> Không có database thật vẫn build/test được: `mvn test` chỉ chạy unit test
> thuần (JWT, SRS), không cần Postgres.

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `DB_URL` | dev: không | `jdbc:postgresql://localhost:5432/toeic_trainer` | JDBC URL Postgres. Trên Supabase: Database → Connection string → URI (chế độ **Session**). |
| `DB_USER` | dev: không | `postgres` | User database |
| `DB_PASSWORD` | dev: không | `postgres` | Password database |
| `JWT_SECRET` | **production: có** | chuỗi dev | Secret ký JWT, **tối thiểu 32 byte**. Tạo: `openssl rand -base64 48`. |
| `JWT_EXPIRATION_MS` | không | `86400000` (24h) | Thời hạn token đăng nhập |
| `SPEECHIFY_API_KEY` | không* | (trống) | Key Speechify (server-side). Trống → `/api/tts` trả 503 `{fallback:true}`, app dùng giọng máy. |
| `AI_API_KEY` | không* | (trống) | Key nhà cung cấp AI, chuẩn OpenAI-compatible (server-side). Trống → các endpoint `/api/ai/**` trả 503 với thông báo rõ ràng. |
| `AI_API_BASE` | không | `https://api.openai.com/v1` | Base URL của AI provider |
| `AI_MODEL` | không | `gpt-4o-mini` | Model cho chat/tutor/phân tích |
| `AI_VISION_MODEL` | không | `gpt-4o-mini` | Model cho ảnh (photo-to-word, OCR) |
| `AI_DAILY_CHAR_LIMIT` | không | `200000` | Hạn mức ký tự AI mỗi user mỗi ngày (input+output, cộng dồn mọi tính năng) |
| `CORS_ALLOWED_ORIGINS` | không | `*` | Danh sách origin cách nhau dấu phẩy. Production nên ghi rõ domain. |
| `STORAGE_DIR` | không | `./uploads` | Thư mục lưu ảnh/tài liệu tải lên (**tạm thời local** — xem mục Supabase Storage) |
| `PORT` | không | `8080` | Cổng HTTP |

\* Không bắt buộc để chạy, nhưng tính năng tương ứng sẽ ở chế độ dự phòng.

**Không bao giờ commit key thật vào git.** `.env` đã nằm ngoài repo theo quy ước
(thêm vào `.gitignore` khi khởi tạo repo).

## API

Mọi response JSON có dạng `{success, data, message}`. Lỗi trả về cùng cấu trúc
với `success:false` và message tiếng Việt.

| Method & Path | Auth | Mô tả |
|---|---|---|
| `POST /api/auth/register` | public | Đăng ký `{email, password, displayName}` → `{token, userId, ...}` |
| `POST /api/auth/login` | public | Đăng nhập → `{token, ...}` |
| `POST /api/auth/forgot-password` | public | Tạo reset token (dev: in ra log; production: gửi email) |
| `POST /api/auth/reset-password` | public | `{token, newPassword}` — token hiệu lực 30 phút |
| `GET /api/health` | public | `{status:"UP"}` |
| `GET /api/vocab?search=&topic=&page=&size=` | user | Tìm/lọc từ vựng (phân trang) |
| `GET /api/vocab/{id}` | user | Chi tiết một từ |
| `GET /api/words/custom` | user | Từ riêng của user |
| `POST /api/words/custom` | user | Thêm từ riêng |
| `PUT /api/words/custom/{id}` | user | Sửa từ riêng |
| `DELETE /api/words/custom/{id}` | user | Xóa từ riêng |
| `POST /api/words/progress` | user | Upsert tiến độ `{wordId\|customWordId, status, favorite, selfRating 0..3}` — tính SRS `nextReviewAt` |
| `GET /api/words/progress?dueOnly=` | user | Tiến độ SRS (`dueOnly=true`: từ đến hạn ôn) |
| `GET /api/practice/questions?part=&limit=` | user | Câu hỏi Part 1–7 (ngẫu nhiên) |
| `POST /api/practice/attempts` | user | Nộp bài `{mode, part, answers:[{questionId, selectedIndex}]}` → điểm + danh sách câu sai, cộng XP |
| `GET /api/practice/attempts` | user | Lịch sử làm bài |
| `GET /api/practice/mistakes` | user | Sổ lỗi (câu sai mọi lần làm) |
| `GET /api/placement/quiz` | user | 12 câu kiểm tra đầu vào |
| `POST /api/placement/submit` | user | Chấm → `{level, estimatedScore, roadmap}` |
| `GET /api/grammar`, `GET /api/grammar/{id}` | user | Bài ngữ pháp |
| `POST /api/speaking/score` | user | `{sentence, transcript}` → 4 điểm thành phần + feedback. Không có AI key → chấm dự phòng, `fallback:true` |
| `POST /api/speaking/score-audio` | user | multipart (điểm mở rộng STT — xem ghi chú) |
| `GET /api/speaking/history` | user | Lịch sử chấm nói |
| `GET /api/stats` | user | `{xp, level, streak, studySeconds}` |
| `POST /api/stats/study-time` | user | `{seconds}` — cộng giờ học, cập nhật streak |
| `GET /api/tts?text=&voice=george` | user | MP3 giọng George. Header `X-TTS-Cache: HIT/MISS`. Lỗi 503 `{fallback:true}` khi chưa cấu hình key |
| `POST /api/ai/semantic` | user | `{word}` → mạng ngữ nghĩa (đọc cache `word_relations` trước, gọi AI 1 lần rồi lưu) |
| `POST /api/ai/photo` | user | multipart ảnh → `{word, ipa, meaningVi, exampleEn}`, lưu `photo_words` |
| `GET /api/ai/photos` | user | Lịch sử ảnh đã học |
| `POST /api/ai/analyze-doc` | user | multipart PDF/DOCX/TXT/MD/ảnh → từ vựng + ngữ pháp + mẹo + câu hỏi; từ mới tự thêm vào `custom_words` (chống trùng), lưu `doc_analyses` |
| `GET /api/ai/docs`, `GET /api/ai/docs/{id}` | user | Lịch sử / chi tiết phân tích (mở lại không tốn AI) |
| `POST /api/ai/tutor` | user | `{messages:[{role, content}]}` → trả lời của gia sư AI |
| `GET /api/admin/overview` | **admin** | Tổng quan: số user, từ, câu hỏi, lượt làm bài… |
| `GET /api/admin/users` | **admin** | Danh sách user (phân trang) |
| `GET/POST /api/admin/vocab`, `PUT/DELETE /api/admin/vocab/{id}` | **admin** | CRUD kho từ |
| `GET/POST /api/admin/questions`, `PUT/DELETE /api/admin/questions/{id}` | **admin** | CRUD ngân hàng câu hỏi |
| `GET/POST /api/admin/grammar`, `PUT/DELETE /api/admin/grammar/{id}` | **admin** | CRUD bài ngữ pháp |

`user_id` luôn lấy từ JWT, không bao giờ tin `user_id` do client gửi.

## Database & Migration

Flyway chạy tự động khi khởi động (`spring.flyway.enabled=true`,
`ddl-auto=validate` — Hibernate không tự sửa schema).

- `V1__schema.sql` — 16 bảng: `users`, `password_reset_tokens`,
  `vocabulary`, `word_relations`, `custom_words`, `word_progress`,
  `questions`, `practice_attempts`, `placement_results`, `speaking_attempts`,
  `user_stats`, `tts_cache`, `doc_analyses`, `photo_words`,
  `grammar_lessons`, `ai_usage_log`. FK dữ liệu cá nhân đều
  `ON DELETE CASCADE`.
- `V2__seed_vocabulary.sql` — **dữ liệu mẫu**: 42 từ TOEIC nâng cao,
  8 chủ đề (Office, HR, Finance, Marketing, Sales, Travel, IT,
  Customer Service). Thay bằng nội dung biên soạn thật trước production.
- `V3__seed_practice_questions.sql` — **dữ liệu mẫu**: 14 câu hỏi tự soạn
  (2 câu/Part × 7 Part) + 12 câu placement test.

Quy tắc an toàn schema: mọi thay đổi sau này đều **cộng thêm**
(migration mới), không sửa migration đã chạy ở production.

## Các điểm tích hợp cần biết

- **Speechify**: `POST {app.speechify.api-url}` với
  `{input, voice_id, audio_format:"mp3", model:"simba-3.2"}`.
  Cache toàn hệ thống theo `sha256(text|voice|model)` trong `tts_cache`
  (audio lưu dạng `bytea`). Số ký tự tính phí được log mỗi lần tổng hợp mới.
- **AI**: mọi cuộc gọi qua `AiClient` — kiểm tra `AI_DAILY_CHAR_LIMIT`
  theo user/ngày, ghi `ai_usage_log(user, feature, input/output chars)`.
  Model và base URL đổi qua env mà không sửa code.
- **Supabase Storage** (chưa làm): hiện ảnh/tài liệu lưu ở `STORAGE_DIR`
  local trong `AiService.saveFile()`. Để chuyển sang Storage, thay hàm này
  bằng upload lên Supabase Storage và lưu public path — cột `image_path` /
  `file_path` đã sẵn sàng cho việc đó.
- **Quên mật khẩu**: hiện tại token reset chỉ **log ở server (dev)**.
  Production phải gắn email sender (ví dụ Resend/SMTP) vào
  `AuthService.forgotPassword()` rồi mới mở tính năng.
- **Speaking STT**: app gửi `transcript` từ nhận dạng giọng nói trên thiết bị.
  Endpoint `/api/speaking/score-audio` là điểm mở rộng để gắn nhà cung cấp
  STT thật (chuyển audio → transcript) khi cần.

## Cấu trúc code

```
src/main/java/com/toeictrainer/
├── ToeicTrainerApplication.java
├── common/     ApiResponse, ApiException, GlobalExceptionHandler
├── config/     SecurityConfig (stateless JWT), CorsConfig
├── security/   JwtTokenProvider, JwtAuthenticationFilter, JwtPrincipal, SecurityUtils
├── domain/     16 JPA entities
├── repo/       Spring Data repositories
├── dto/        request/response records (validation)
├── service/    AuthService, VocabService, SrsService, PracticeService,
│               PlacementService, SpeakingService, StatsService,
│               TtsService, AiClient, AiService, AdminService
└── web/        10 REST controllers
src/main/resources/
├── application.yml
└── db/migration/ V1__schema.sql V2__seed_vocabulary.sql V3__seed_practice_questions.sql
```

## Build & test trong sandbox

Java trong sandbox này không mở được kết nối TCP trực tiếp (kể cả tới Maven
Central), nên `mvn` online không chạy được. Cách build đã kiểm chứng:

1. Dùng script `dev-mvnfetch.py` (Python, đi qua egress proxy bằng plain
   HTTP) để nạp toàn bộ dependency + plugin vào một Maven repository local:
   ```bash
   python3 -u dev-mvnfetch.py pom.xml --local-repo ./.m2-repo
   ```
   (Script tự resolve transitive closure theo đúng ngữ nghĩa Maven:
   dependencyManagement thắng mediation, plugin resolve trong realm riêng.)
2. Build offline, chỉ rõ repo:
   ```bash
   export JAVA_HOME=$HOME/tools/jdk21
   export PATH=$HOME/tools/jdk21/bin:$HOME/tools/maven/bin:$PATH
   mvn -o -Dmaven.repo.local=./.m2-repo -q compile
   mvn -o -Dmaven.repo.local=./.m2-repo -q test
   ```
   Thư mục `.m2-repo/` (~110MB) đã có sẵn trong workspace (đã gitignore),
   nên bước 1 chỉ cần làm lại khi `pom.xml` đổi dependency.

> Lưu ý: `/root/.m2` **không persistent** trong sandbox (đã bị xóa tự động
> một lần) — luôn dùng `./.m2-repo` trong workspace. Ngoài sandbox (máy dev
> thật / CI), `mvn compile` / `mvn test` online chạy bình thường, không cần
> các bước trên.
>
> Chi tiết cuộc "phiêu lưu" proxy (CONNECT relay, `insecure.repo1.maven.org`,
> mvnfetch) xem báo cáo bàn giao — không cần thiết cho việc dùng repo.

## Chạy unit test

`mvn -o -Dmaven.repo.local=./.m2-repo -q test` — 19 test, không cần database:
- `JwtTokenProviderTest` (6): tạo/validate JWT, từ chối token giả/mạo, giữ role ADMIN, secret ngắn bị từ chối
- `SrsServiceTest` (9): SM-2 — again reset, good/easy lên lịch đúng, easiness có sàn 1.3, mastered sau đủ lần ôn
- `AiClientJsonTest` (4): bóc JSON từ output AI (fence ```json, prose thừa)

## Tạo tài khoản admin đầu tiên

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

## Hạn chế đã biết (trung thực)

- Migration Flyway **chưa được chạy live** (không có Postgres trong sandbox);
  SQL đã được rà soát thủ công — hãy chạy thử với database thật trước khi
  deploy production.
- Các endpoint AI/Speechify cần key thật mới hoạt động; khi thiếu key API trả
  503 kèm thông báo rõ ràng (không âm thầm trả nội dung giả) — ngoại trừ
  Speaking Coach có chế độ chấm dự phòng minh bạch (`fallback:true`).
- Ảnh/tài liệu đang lưu local (`STORAGE_DIR`), chưa dùng Supabase Storage.
- Email đặt lại mật khẩu chưa được gửi thật (chỉ log ở dev).
