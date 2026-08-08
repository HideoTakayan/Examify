# Examify - Hệ thống thi trắc nghiệm trực tuyến — Online Examination System

> **学者は手に持つ。** *"Người học thức giấc trong tay."*

**Cập nhật:** 2026-05-13

---

## Tài liệu đồ án & tiến độ (đọc trước)

**[DO_AN_MASTER.md](./DO_AN_MASTER.md)** — tài liệu **tổng hợp duy nhất**: kiến trúc, tiến độ module, Item 1–13, kiểm thử nhanh, rủi ro, liên kết API/OpenAPI.

---

## Chạy nhanh

### Backend

```bash
cd BackEnd/server
cp .env.example .env   # DATABASE_URL, JWT_SECRET, …
npm install
npm run migrate
npm run dev            # http://localhost:5000
```

### Frontend

```bash
cd FrontEnd/client
npm install
npm run dev            # http://localhost:5173
```

- **REST:** `http://localhost:5000/v1`  
- **API chi tiết:** [BackEnd/server/API.md](./BackEnd/server/API.md)  
- **Production API:** `https://api.examify.local` (xem `FrontEnd/client/.env.production` và `src/configs/app.config.ts`)

---

## Tài khoản mẫu (seed)

Mật khẩu thường dùng: **`Test@123`**

| Role | Email (ví dụ) |
|------|----------------|
| Admin | `admin01@phenikaa-uni.edu.vn` |
| Teacher | `mai.xuan.trang@phenikaa-uni.edu.vn` |
| Student | `student01@st.phenikaa-uni.edu.vn` |

---

## Test

```bash
cd BackEnd/server && npm test
cd FrontEnd/client && npm test
```

---

## Liên hệ

**Author:** Examify · **License:** MIT
