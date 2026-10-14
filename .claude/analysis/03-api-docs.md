# 03 — NASUHA API Specification (v1, draft)

> v1, 2026-10-14. Diturunkan dari analisis seluruh screen app (lihat `01-app-overview.md`, `02-data-inventory.md`).
> **Sudah diimplementasikan** di `/Users/bahri/development/masdani/nasjak-backend` (Node.js + Express 5 + PostgreSQL,
> arsitektur & DB mengikuti `idtc-user`). Lihat **[Status implementasi](#status-implementasi)** untuk perbedaan dengan draft awal.

## Status implementasi

| Bagian | Status |
|---|---|
| Auth email/HP + password, logout, me, ganti password | ✅ |
| Login Google (`/auth/google`), lupa/reset password OTP | ⏳ fase 2 / 1b (reset sementara oleh admin → password sementara) |
| Profil, avatar, stats, hapus akun, preferensi, device, notifikasi inbox | ✅ |
| Upload gambar (`/uploads`, `/me/avatar`) | ✅ |
| Config, referensi, membership plans, home, search | ✅ |
| Event & registrasi (kuota, duplikat, batal) | ✅ |
| Lapak (moderasi, edit → pending) | ✅ |
| Testimoni (moderasi), Tanya Ustadz (jawaban resmi ustadz) | ✅ |
| Riyadhoh (item, log, sync, summary/streak WIB) | ✅ |
| Bookmark, progres Quran (+ `POST /me/quran/progress/sync`) | ✅ |
| Motivasi, quote harian, artikel (id UUID **atau** legacy numerik), doa, program, korda, infaq, sosial | ✅ |
| Admin: dashboard, user (+ `POST /admin/users` buat akun dgn password sementara), membership, moderasi, event, registrasi (+CSV), testimoni, tanya, broadcast, audit | ✅ |
| Admin CRUD konten | ✅ dengan pola generik `/admin/content/{resource}[/{id}]` (bukan `/admin/{res}`); daftar resource: `GET /admin/content` |
| Panel admin web | ✅ `/admin` (Tailwind + Alpine), login `POST /api/v1/admin/session` (cookie HttpOnly), logout `DELETE /api/v1/admin/session` |
| Konfirmasi infaq, banner, onboarding slides, asisten Anas server | ⏳ belum (app memakai konten lokal) |

Perbedaan teknis dari draft:
- **ID = UUID string** (pola idtc-user); kecuali konten ber-slug (korda, kategori motivasi, item riyadhoh, program, infaq, link sosial) dan referensi (`code`).
- **Format error = `{ "error": "pesan", "field"?: "..." , "code"?: "FEATURE_LOCKED", "feature"?: "lapak" }`** (pola idtc-user), bukan `{ message, errors }`. Validasi gagal → **400** (bukan 422).
- Port dev **3100**. `app-config` memakai key snake_case (`latest_version`, …) dan tersimpan di tabel `site_content`.
- Export registrasi: `GET /admin/event-registrations?eventId=…&format=csv`. Kehadiran: `PATCH /admin/event-registrations/{id}` body `{ attended: true }`.
- Role `ustadz` sudah ada; ustadz boleh menjawab walau membership-nya free.
- App: preferensi (tema, huruf, notifikasi, lokasi shalat) dikirim ke `PUT /me/preferences` (debounce 1,5 dtk) dan dipulihkan saat login. Push token didaftarkan ke `POST /me/devices` setelah izin notifikasi diberikan dan dilepas (`DELETE /me/devices/{token}`) saat logout.
- Push Android butuh kredensial FCM (`google-services.json` + `android.googleServicesFile` di app.json); tanpa itu registrasi token dilewati diam-diam.

## Daftar isi

0. [Konvensi](#0-konvensi)
1. [Auth](#1-auth)
2. [Profil & akun saya](#2-profil--akun-saya)
3. [Upload](#3-upload)
4. [Config & referensi](#4-config--referensi)
5. [Home & search](#5-home--search)
6. [Event & registrasi](#6-event--registrasi)
7. [Lapak](#7-lapak)
8. [Testimoni](#8-testimoni)
9. [Tanya Ustadz](#9-tanya-ustadz)
10. [Riyadhoh](#10-riyadhoh)
11. [Bookmark & progres baca](#11-bookmark--progres-baca)
12. [Preferensi](#12-preferensi)
13. [Konten: motivasi, artikel, doa](#13-konten-motivasi-artikel-doa)
14. [Program, korda, infaq, sosial](#14-program-korda-infaq-sosial)
15. [Asisten Anas](#15-asisten-anas)
16. [Notifikasi & device](#16-notifikasi--device)
17. [Admin](#17-admin)
18. [Lampiran: matriks akses, enum, mapping screen → endpoint](#18-lampiran)

---

## 0. Konvensi

### Base URL & versi
```
https://api.nasuha.id/api/v1        (production, usulan)
http://<IP-LAN>:3100/api/v1         (dev, nasjak-backend)
```
App membaca `EXPO_PUBLIC_API_BASE_URL` (sudah ada di `.env.example`), isi dengan `.../api/v1`.

### Fase auth (keputusan 2026-10-14)
- **Fase 1:** login **email/no. HP + password** saja — `register`, `login`, `logout`, `me`, ganti password. Tombol "Masuk dengan Google" di app disembunyikan.
- **Fase 1b (opsional, butuh SMTP):** lupa password via OTP email. Sebelum itu siap, reset dilakukan admin (17.2).
- **Fase 2:** login Google (`POST /auth/google`, 1.3). Skema tabel `users` sudah menyiapkan kolom `google_subject` & `auth_provider` dari awal supaya tidak perlu migrasi ulang.

### Format
- JSON, `Content-Type: application/json`, key **camelCase** (sama dengan `types/index.ts`, supaya mapping minimal).
- Upload: `multipart/form-data`.
- ID: UUID string (mengikuti idtc-user). Konten ber-slug memakai slug string sebagai id.
  Pengecualian: id konten yang dipakai sebagai kunci stabil memakai **slug string** (`riyadhoh item`, `motivasi category`, `korda`, referensi).
- Tanggal-waktu: ISO 8601 dengan offset, mis. `2026-10-14T08:00:00+07:00`. Tanggal saja: `YYYY-MM-DD`. Jam saja: `HH:mm`.
- Zona waktu bisnis: **Asia/Jakarta (WIB)**. "Hari ini" untuk riyadhoh dihitung WIB di server (memperbaiki bug UTC di app).
- Uang: integer rupiah.
- Nomor HP: disimpan ternormalisasi `08xxxxxxxxxx`; endpoint menerima `+62…`, `62…`, `08…`.

### Envelope
Sukses (single):
```json
{ "data": { ... } }
```
Sukses (list ber-paging):
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "perPage": 20, "total": 134, "lastPage": 7 }
}
```
Error:
```json
{ "error": "Email sudah terdaftar. Silakan login.", "field": "email" }
```
`field` ada bila error terkait satu input. Pesan dalam Bahasa Indonesia (langsung ditampilkan app via `Alert`).

### Status code
| Code | Arti |
|---|---|
| 200 / 201 / 204 | OK / Created / No Content |
| 400 | request tidak valid secara bisnis (mis. kuota penuh) |
| 401 | token tidak ada / kedaluwarsa |
| 403 | role / membership feature tidak mengizinkan, atau akun nonaktif |
| 404 | tidak ditemukan (juga untuk resource milik orang lain yang tidak boleh terlihat) |
| 409 | konflik (sudah terdaftar event, duplikat) |
| 422 | validasi gagal |
| 429 | rate limit |

### Auth header
```
Authorization: Bearer <token>
```
Token opaque (mis. Sanctum personal access token), dibuat saat login/registrasi. Tidak kedaluwarsa otomatis
(app mobile), dicabut saat logout atau saat admin menonaktifkan akun.

Legend akses pada tiap endpoint:
- **Public** — tanpa token (tamu boleh).
- **Auth** — wajib token, akun aktif.
- **Auth + feature `x`** — wajib token dan `membershipFeatures.x === true` (efektif). Kalau tidak → `403 { "message": "Fitur ini khusus member ...", "code": "FEATURE_LOCKED", "feature": "lapak" }`.
- **Admin** — role `admin` atau `super_admin`.
- **Super admin** — role `super_admin`.

### Paging, sort, filter
`?page=1&perPage=20` (max 100). `?sort=field` naik, `?sort=-field` turun. Pencarian teks `?q=`.

### Rate limit (usulan)
Auth endpoints 10 req/menit/IP; lainnya 120 req/menit/user.

---

## Resource schemas

Dipakai berulang di bawah.

### `User` (dikembalikan ke pemilik sendiri / admin)
```json
{
  "id": 12,
  "email": "ahmad@example.com",
  "name": "Ahmad Fauzi",
  "phone": "081234567890",
  "avatar": "https://cdn.nasuha.id/avatars/12.jpg",
  "authProvider": "password",
  "role": "calon_sahabat",
  "isActive": true,
  "joinDate": "2026-09-08T10:12:00+07:00",
  "bio": "…",
  "city": "Jakarta Timur",
  "address": "…",
  "gender": "laki-laki",
  "birthDate": "1990-05-17",
  "occupation": "Wiraswasta",
  "nasuhaRegion": "jakarta",
  "lbuBatch": 37,
  "membershipType": "free",
  "membershipFeatures": {
    "quran": true, "hadis": true, "motivasi": true, "riyadhoh": false,
    "event": false, "lapak": false, "tanya": false, "social": false, "community": false
  }
}
```
- `membershipFeatures` = **efektif**: fitur dari plan `membershipType`, ditimpa override per user (admin). App cukup membaca map ini.
- `nasuhaRegion` = slug korda (lihat `/references`). App sekarang menyimpan label bebas → migrasi ke slug.
- `birthDate` format `YYYY-MM-DD` (app sekarang input "DD/MM/YYYY" teks bebas → app perlu konversi/date picker).

### `PublicUser` (penulis konten, penjual, dsb.)
```json
{ "id": 12, "name": "Ahmad Fauzi", "avatar": "https://…", "city": "Jakarta Timur", "role": "sahabat" }
```

### `Event`
```json
{
  "id": 5,
  "title": "TSN September 2026",
  "type": "TSN",
  "date": "2026-09-06",
  "time": "08:00",
  "location": "Masjid Al-Ikhlas, Jakarta Timur",
  "description": "…",
  "image": "https://…/events/5.jpg",
  "quota": 200,
  "registered": 156,
  "remaining": 44,
  "isFull": false,
  "status": "published",
  "contactWhatsapp": "081234567890",
  "myRegistration": { "id": 88, "status": "registered" },
  "createdBy": 1,
  "createdAt": "…", "updatedAt": "…"
}
```
- `registered` dihitung server = jumlah registrasi status `registered|confirmed`.
- `myRegistration` hanya bila request membawa token; `null` jika belum daftar / sudah cancel.

### `EventRegistration`
```json
{
  "id": 88, "eventId": 5,
  "event": { "id": 5, "title": "…", "date": "2026-09-06", "time": "08:00", "location": "…", "type": "TSN" },
  "userId": 12, "userName": "Ahmad Fauzi", "userEmail": "…", "userPhone": "0812…",
  "userCity": "Jakarta Timur", "korda": "jakarta", "notes": "…",
  "status": "registered", "createdAt": "…"
}
```

### `LapakProduct`
```json
{
  "id": 31,
  "seller": { "id": 12, "name": "Ahmad Fauzi", "city": "Jakarta Timur", "avatar": null },
  "sellerWhatsapp": "081234567890",
  "name": "Madu Hutan Sumbawa 500ml",
  "category": "makanan",
  "description": "…",
  "price": 185000,
  "photos": ["https://…/1.jpg", "https://…/2.jpg"],
  "specs": { "weight": "500 gr", "condition": "Baru", "stock": 20, "minOrder": 1, "variant": "500ml, 1L", "shippingFrom": "Jakarta Timur" },
  "tags": ["Halal", "Best Seller"],
  "status": "approved",
  "rejectionReason": null,
  "rating": 0, "sold": 0,
  "createdAt": "…", "updatedAt": "…"
}
```
Kompatibilitas: app sekarang memakai `sellerId/sellerName/sellerCity` datar → app mapping dari `seller.*`
(atau backend juga mengirim field datar; pilih satu saat implementasi).

### `Testimonial`
```json
{
  "id": 7,
  "user": { "id": 12, "name": "Ahmad Fauzi", "avatar": null } ,
  "name": "Ahmad Fauzi",
  "korda": "jakarta",
  "kordaLabel": "Korda Jakarta",
  "program": "LBU",
  "rating": 5,
  "text": "Alhamdulillah …",
  "photo": "https://…",
  "status": "approved",
  "date": "2026-06-15",
  "createdAt": "…"
}
```
`user` `null` untuk testimoni seed (sample lama). `name` selalu terisi (display name).

### `Question` / `Answer`
```json
{
  "id": 4,
  "user": { "id": 12, "name": "Ahmad Fauzi", "avatar": null },
  "category": "Keuangan Syariah",
  "title": "Hukum KPR syariah?",
  "body": "…",
  "answersCount": 2,
  "hasOfficialAnswer": true,
  "status": "open",
  "createdAt": "…",
  "answers": [
    { "id": 9, "questionId": 4, "user": { "id": 1, "name": "Ustadz Anas", "role": "ustadz" }, "isOfficial": true, "body": "…", "createdAt": "…" }
  ]
}
```
`answers` hanya di detail. `isOfficial` = dijawab oleh role ustadz/admin.

---

## 1. Auth

### 1.1 `POST /auth/register` — Public
Pengganti `appStore.register()`.
```json
{ "name": "Ahmad Fauzi", "email": "ahmad@example.com", "phone": "081234567890", "password": "rahasia123", "passwordConfirmation": "rahasia123", "deviceName": "android-SM-A525F" }
```
Validasi: `name` wajib; `email` wajib, format email, unik; `phone` opsional, unik setelah normalisasi; `password` min 6 (usul: 8), harus sama dengan konfirmasi.
Role selalu `calon_sahabat`, membership `free` (client tidak bisa set).

`201`
```json
{ "data": { "token": "1|abc…", "user": { "...User" } } }
```
422 contoh pesan: `"Email sudah terdaftar. Silakan login."`, `"No. HP sudah terdaftar. Silakan login."`.

### 1.2 `POST /auth/login` — Public
Pengganti `appStore.login()`. `identifier` = email atau no. HP (tanpa `@` → dianggap HP, dinormalisasi).
```json
{ "identifier": "081234567890", "password": "rahasia123", "deviceName": "android-…" }
```
`200` → `{ "data": { "token", "user" } }`
Error:
- 401 `"Email belum terdaftar. Silakan daftar terlebih dahulu."` / `"No. HP belum terdaftar…"` / `"Password salah"` (usul: satukan jadi `"Email/No. HP atau password salah"` agar tidak bocor enumerasi akun).
- 403 `"Akun Anda dinonaktifkan. Hubungi admin."` (isActive = false).
- 422 field kosong.

### 1.3 `POST /auth/google` — Public (Bearer = Google access token) — **FASE 2**
> Tidak dikerjakan di fase 1. Selama belum ada, `EXPO_PUBLIC_USER_PROVIDER`/Google client ID dikosongkan dan tombol Google disembunyikan.

Kontrak sudah ada (`backend/USER_PROVIDER_CONTRACT.md`) — **dipertahankan**, ditambah token aplikasi.
```http
POST /auth/google
Authorization: Bearer <google-access-token>
```
```json
{ "googleId": "1093…", "email": "user@gmail.com", "name": "User", "avatar": "https://…" }
```
Server: verifikasi token ke Google (`https://www.googleapis.com/oauth2/v3/userinfo` atau tokeninfo), pakai `sub` sebagai identitas.
Jika email sudah terdaftar via password → tautkan `google_subject` ke akun tsb.

`200`
```json
{ "data": { "token": "2|xyz…", "user": { "...User" } }, "user": { "...User" } }
```
> `user` di root dipertahankan sementara karena `userProvider.ts` membaca `payload.user ?? payload.data`. Setelah app diperbarui, cukup `data`.
> Catatan: header `Authorization` di endpoint ini berisi token **Google**, bukan token app.

### 1.4 `POST /auth/logout` — Auth
Mencabut token saat ini. `204`.

### 1.5 `GET /auth/me` — Auth
`200 { "data": User }`. Dipanggil saat app start (`hydrate`) untuk refresh role/membership; 401 → app hapus token & ke login.

### 1.6 `POST /auth/forgot-password` — Public — **Fase 1b**
Tombol "Lupa password?" (sekarang mati).
```json
{ "identifier": "ahmad@example.com" }
```
`200 { "message": "Jika akun terdaftar, kode reset telah dikirim." }` — selalu 200.
Kirim **OTP 6 digit** via email (atau WhatsApp gateway bila ada), berlaku 15 menit.

### 1.7 `POST /auth/reset-password` — Public — **Fase 1b**
```json
{ "identifier": "ahmad@example.com", "otp": "482913", "password": "baru12345", "passwordConfirmation": "baru12345" }
```
`200 { "message": "Password berhasil diubah. Silakan login." }` · 422 OTP salah/kedaluwarsa.

### 1.8 `PUT /auth/password` — Auth
Ganti password dari dalam app.
```json
{ "currentPassword": "…", "password": "…", "passwordConfirmation": "…" }
```
`200`. (Fase 2: akun Google tanpa password boleh set password pertama tanpa `currentPassword`.)

---

## 2. Profil & akun saya

### 2.1 `GET /me` — Auth
Alias `GET /auth/me`.

### 2.2 `PATCH /me` — Auth
Pengganti `updateProfile()` (`app/profile/edit.tsx`). Semua field opsional; kirim `null` untuk mengosongkan.
```json
{
  "name": "Ahmad Fauzi", "phone": "081234567890", "bio": "≤200 char",
  "city": "Jakarta Timur", "address": "…", "gender": "laki-laki",
  "birthDate": "1990-05-17", "occupation": "…", "nasuhaRegion": "jakarta"
}
```
Validasi: `name` wajib bila dikirim (tidak boleh kosong), `phone` unik + dinormalisasi, `bio` max 200, `gender ∈ {laki-laki, perempuan}`,
`nasuhaRegion` ∈ slug korda, `birthDate` tanggal valid & di masa lalu.
Field yang **diabaikan** walau dikirim: `email`, `role`, `isActive`, `membershipType`, `membershipFeatures`, `lbuBatch`.
`200 { "data": User }`

### 2.3 `POST /me/avatar` — Auth (multipart)
Field `file` (jpg/png/webp, ≤ 5 MB; app mengirim hasil crop 1:1 quality 0.7). Server resize ke 512×512.
`200 { "data": { "avatar": "https://…/avatars/12.jpg" } }`

### 2.4 `DELETE /me/avatar` — Auth
"Hapus Foto". `204`.

### 2.5 `GET /me/stats` — Auth
Mengisi kartu statistik profil (sekarang hardcoded 0).
```json
{
  "data": {
    "riyadhoh": { "currentStreak": 12, "longestStreak": 40, "totalCompleted": 1532, "todayCompleted": 18, "todayTotal": 33 },
    "tsnAttendance": 4,
    "eventsJoined": 7,
    "bookmarks": { "ayah": 15, "hadith": 6 },
    "lapak": { "approved": 3, "pending": 1, "rejected": 0 },
    "questions": 2,
    "testimonials": 1
  }
}
```

### 2.6 `DELETE /me` — Auth
Hapus akun (wajib untuk kebijakan Google Play). Body `{ "password": "…" }` (akun password) atau `{ "confirm": "HAPUS" }` (akun Google).
Soft-delete + anonimisasi konten. `204`.

---

## 3. Upload

### 3.1 `POST /uploads` — Auth (multipart)
Upload generik untuk foto lapak, testimoni, event. Dipanggil saat user memilih foto, sebelum submit form.
| Field | Keterangan |
|---|---|
| `file` | jpg/png/webp ≤ 5 MB |
| `purpose` | `product` · `testimonial` · `event` · `infaq_proof` · `content` |

`201`
```json
{ "data": { "id": 501, "url": "https://cdn.nasuha.id/uploads/product/2026/10/abc.jpg", "purpose": "product", "width": 1080, "height": 1080 } }
```
Form lalu mengirim `url` (atau `id`) di field foto. Upload yang tidak dipakai > 24 jam dibersihkan oleh job.
`purpose=event|content` hanya Admin.

---

## 4. Config & referensi

### 4.1 `GET /config` — Public
Dipanggil saat app start. Mengganti info hardcoded di `about.tsx`, modal profil, settings "Cek Update".
```json
{
  "data": {
    "app": {
      "name": "NASUHA App", "tagline": "Hijrah Bersama, Tumbuh Bersama, Bebas Utang Bersama",
      "latestVersion": "1.1.0", "minSupportedVersion": "1.0.0",
      "storeUrl": { "android": "https://play.google.com/store/apps/details?id=com.nasuha.nasjak", "ios": null },
      "releaseDate": "2026-08-08", "author": "Dani Hamdani", "organization": "Komunitas NASUHA Jakarta",
      "website": "https://nasuha.org", "features": ["Al-Quran 30 Juz + audio", "…"]
    },
    "contact": { "whatsapp": "62…", "email": "info@nasuha.id", "instagram": "nasuhajakarta" },
    "featureFlags": { "asistenAi": false, "infaqConfirmation": true },
    "membershipPlans": [ { "...MembershipPlan (lihat 4.3)" } ]
  }
}
```

### 4.2 `GET /references` — Public
Semua master kecil sekaligus (di-cache app 24 jam). Menggantikan konstanta yang tersebar & saling tidak sinkron.
```json
{
  "data": {
    "kordas":            [ { "id": "jakarta", "label": "Korda Jakarta", "sortOrder": 1 } ],
    "eventTypes":        [ { "id": "TSN", "label": "TSN", "color": "#00B4D8" }, { "id": "LBU", "label": "LBU", "color": "…" } ],
    "lapakCategories":   [ { "id": "makanan", "label": "Makanan & Minuman", "icon": "fast-food-outline" } ],
    "questionCategories":[ "Keuangan Syariah", "Hijrah", "Fiqh", "Bisnis", "Umum" ],
    "testimonialPrograms": [ "LBU", "TSN", "Riyadhoh", "Kajian", "Lainnya" ],
    "doaCategories":     [ "Iman & Tauhid", "Ampunan & Taubat", "Rezeki", "…" ],
    "genders":           [ { "id": "laki-laki", "label": "Laki-laki" }, { "id": "perempuan", "label": "Perempuan" } ],
    "productConditions": [ "Baru", "Bekas" ],
    "infaqNominals":     [ 10000, 25000, 50000, 100000, 250000, 500000 ]
  }
}
```
Catatan: `eventTypes` = gabungan `EVENT_TYPES` (12, termasuk Sosial & Lainnya) — filter tab Event memakai list yang sama (memperbaiki bug filter).
`lapakCategories` tanpa `semua` (opsi "Semua" dibuat di app).

### 4.3 `GET /membership-plans` — Public
```json
{
  "data": [
    {
      "type": "free", "label": "Free Member", "description": "…", "color": "#999999",
      "features": [ { "id": "quran", "name": "Al-Quran", "description": "Baca Al-Quran", "icon": "book-outline", "enabled": true } ]
    }
  ]
}
```

---

## 5. Home & search

### 5.1 `GET /home` — Public (token opsional)
Satu request untuk layar Home (`app/(tabs)/index.tsx`), menggantikan 4 konstanta.
```json
{
  "data": {
    "quoteOfTheDay": { "id": 42, "text": "…", "author": "NASUHA", "category": "Hijrah" },
    "riyadhohToday": { "completed": 12, "total": 33, "streak": 5 },
    "upcomingEvents": [ { "...Event" } ],
    "featuredTestimonial": { "...Testimonial" },
    "banners": [ { "id": 1, "title": "Seminar KFM", "image": "https://…", "action": { "type": "route", "value": "/kfm" } } ],
    "socialPosts": [ { "...SocialPost (14.6)" } ],
    "unreadNotifications": 3
  }
}
```
- `quoteOfTheDay` deterministik per tanggal WIB (sama untuk semua user di hari itu).
- `riyadhohToday` & `unreadNotifications` hanya bila ada token.
- `upcomingEvents`: status `published`, `date >= today`, urut tanggal, limit 3.

### 5.2 `GET /search?q=&types=` — Public
Pengganti `app/search/index.tsx` (sekarang cari di konstanta saja). `q` min 2 karakter.
`types` opsional, CSV dari `events,products,articles,quotes,doas,testimonials,questions`.
```json
{
  "data": {
    "events":       [ { "id": 5, "title": "…", "subtitle": "TSN · 6 Sep 2026", "route": "/event/5" } ],
    "products":     [ { "id": 31, "title": "…", "subtitle": "Rp 185.000", "route": "/lapak/31" } ],
    "articles":     [ ],
    "quotes":       [ ],
    "doas":         [ ],
    "testimonials": [ ],
    "questions":    [ ]
  }
}
```
Max 5 per tipe. Quran & Hadis tetap dicari di client (API pihak ketiga).

---

## 6. Event & registrasi

### 6.1 `GET /events` — Public
| Query | Keterangan |
|---|---|
| `type` | id event type (`TSN`, `LBU`, …) |
| `from`, `to` | `YYYY-MM-DD`; default `from` = hari ini (pakai `from=` kosong untuk semua) |
| `q` | cari judul/deskripsi/lokasi |
| `sort` | default `date` |
| `page`, `perPage` | |

Hanya `status=published`. Response: list `Event` + `meta`.
Dipakai: tab Event, `/event`, Home, LBU (`type=LBU`), TSN (`type=TSN`), Community.

### 6.2 `GET /events/{id}` — Public (token opsional)
Detail + `myRegistration`. Draft/cancelled → 404 untuk non-admin (cancelled boleh tampil dengan status jika user punya registrasi — opsional).

### 6.3 `POST /events/{id}/registrations` — Auth + feature `event`
Form registrasi di `app/event/[id].tsx`.
```json
{ "name": "Ahmad Fauzi", "email": "ahmad@example.com", "phone": "081234567890", "city": "Jakarta Timur", "korda": "jakarta", "notes": "Datang berdua" }
```
Wajib: `name`, `email`, `phone`. `korda` ∈ slug korda.
Server (dalam transaksi + lock event):
- event harus `published` dan `date >= today` → selain itu 400 `"Pendaftaran event ini sudah ditutup."`
- kuota: jika `registered >= quota` → 400 `"Kuota sudah penuh."`
- sudah punya registrasi aktif → 409 `"Anda sudah terdaftar di event ini."`
- registrasi yang dulu `cancelled` boleh daftar lagi (buat baris baru atau re-activate).

`201 { "data": EventRegistration }`

### 6.4 `GET /me/event-registrations` — Auth
`?status=registered,confirmed&upcoming=true`. List `EventRegistration` (dengan `event` ringkas).

### 6.5 `POST /event-registrations/{id}/cancel` — Auth (pemilik)
`200 { "data": EventRegistration }` dengan `status: "cancelled"`. Registrasi yang `confirmed` tetap boleh dibatalkan sebelum hari H.

---

## 7. Lapak

### 7.1 `GET /lapak/products` — Public
| Query | Keterangan |
|---|---|
| `category` | slug kategori |
| `q` | nama, nama penjual, deskripsi |
| `sellerId` | produk satu penjual |
| `sort` | `-createdAt` (default), `price`, `-price`, `-sold` |
| `page`, `perPage` | |

Hanya `status=approved`. Response list `LapakProduct` + `meta` + statistik hero:
```json
"meta": { "page": 1, "perPage": 20, "total": 48, "lastPage": 3, "stats": { "products": 48, "sellers": 17 } }
```

### 7.2 `GET /lapak/products/{id}` — Public (token opsional)
Approved → semua boleh. Pending/rejected → hanya pemilik & admin (lainnya 404).

### 7.3 `GET /me/products` — Auth
"Dagangan Saya" (`/lapak?mine=1`). Semua status, `?status=` opsional.
`meta.counts`: `{ "pending": 1, "approved": 3, "rejected": 0 }`.

### 7.4 `POST /lapak/products` — Auth + feature `lapak`
```json
{
  "name": "Madu Hutan Sumbawa 500ml",
  "category": "makanan",
  "description": "≤500 karakter",
  "price": 185000,
  "photos": ["https://cdn…/1.jpg"],
  "sellerWhatsapp": "081234567890",
  "specs": { "weight": "500 gr", "condition": "Baru", "stock": 20, "minOrder": 1, "variant": "…", "shippingFrom": "Jakarta Timur" },
  "tags": ["Halal", "Best Seller"]
}
```
Validasi: `name`, `category`, `description` (≤500), `price > 0`, `photos` 1–5 URL hasil `/uploads` milik user, `sellerWhatsapp` wajib.
`specs.condition ∈ {Baru, Bekas}` default Baru, `minOrder` default 1, `tags` max 10 × 30 char.
Status awal `pending`. Notifikasi ke admin. `201 { "data": LapakProduct }`.

### 7.5 `PUT /lapak/products/{id}` — Auth (pemilik)
Body sama dengan 7.4. Jika diubah oleh pemilik → status kembali `pending`. Admin pakai endpoint admin (status tidak berubah).

### 7.6 `DELETE /lapak/products/{id}` — Auth (pemilik)
Soft delete. `204`. (Sekarang pemilik tidak punya tombol hapus — ditambahkan di app.)

### 7.7 `POST /lapak/products/{id}/contact` — Public (opsional)
Mencatat klik "Chat/Pesan via WA" untuk statistik penjual. `204`. App tetap membuka `wa.me` sendiri.

---

## 8. Testimoni

### 8.1 `GET /testimonials` — Public
`?korda=jakarta&program=LBU&page=&perPage=`. Hanya `approved`, urut `-date`.
`meta.kordaCounts`: `{ "jakarta": 10, "bandung": 3 }` (chip filter di `testimoni/index.tsx`).
Dipakai juga: Home (featured), LBU (`program=LBU&perPage=2`), Community.

### 8.2 `POST /testimonials` — Auth
```json
{ "program": "LBU", "rating": 5, "text": "min 20 karakter", "korda": "jakarta", "photo": "https://cdn…/t.jpg" }
```
`korda` default dari `user.nasuhaRegion`. Status `pending` (moderasi admin). `201`.

### 8.3 `GET /me/testimonials` — Auth
Testimoni saya + status.

### 8.4 `DELETE /testimonials/{id}` — Auth (pemilik) · `204`

---

## 9. Tanya Ustadz

### 9.1 `GET /questions` — Public
`?category=Fiqh&q=&mine=true&page=&sort=-createdAt`. List `Question` tanpa `answers`.

### 9.2 `GET /questions/{id}` — Public
`Question` + `answers[]` (urut `createdAt`, jawaban official di atas).

### 9.3 `POST /questions` — Auth + feature `tanya`
```json
{ "category": "Keuangan Syariah", "title": "≤150 char", "body": "≤2000 char", "isAnonymous": false }
```
`isAnonymous` (usulan baru) → nama ditampilkan "Hamba Allah". `201`.

### 9.4 `POST /questions/{id}/answers` — Auth + feature `tanya`
```json
{ "body": "…" }
```
`isOfficial = true` otomatis bila role `ustadz` / `admin` / `super_admin`. Notifikasi ke penanya. `201 { "data": Answer }`.
> Keputusan terbuka: apakah member biasa boleh menjawab (sekarang boleh) atau hanya ustadz. Lihat `04-open-questions.md`.

### 9.5 `PATCH /questions/{id}` · `DELETE /questions/{id}` — Auth (pemilik, selama belum ada jawaban official)
### 9.6 `DELETE /answers/{id}` — Auth (pemilik) / Admin

---

## 10. Riyadhoh

### 10.1 `GET /riyadhoh/items` — Public
Pengganti `RIYADHOH_ITEMS` + `RIYADHOH_DOCS`. **`id` slug dipertahankan** (`shalat-subuh`, …) agar log lama bisa dimigrasi.
```json
{
  "data": {
    "categories": [ { "id": "shalat-wajib", "label": "Shalat Wajib", "sortOrder": 1 } ],
    "items": [ { "id": "shalat-subuh", "name": "Shalat Subuh", "category": "Shalat Wajib", "icon": "sunny-outline", "rakaat": null, "sortOrder": 1, "isActive": true } ],
    "docs": [ { "id": "azzam-riyadhoh", "title": "Azzam Riyadhoh", "body": "markdown…" } ]
  }
}
```

### 10.2 `GET /me/riyadhoh/logs?from=2026-10-08&to=2026-10-14` — Auth + feature `riyadhoh`
Rentang max 92 hari. Default 7 hari terakhir (WIB).
```json
{ "data": { "2026-10-14": ["shalat-subuh", "dzikir-pagi"], "2026-10-13": ["shalat-subuh"] } }
```
Hanya item `completed=true`. App bisa mengubah ke format lama `itemId_date → true`.

### 10.3 `PUT /me/riyadhoh/logs/{date}/{itemId}` — Auth + feature `riyadhoh`
Toggle satu amalan (`toggleRiyadhoh`).
```json
{ "completed": true }
```
`date` hanya boleh hari ini atau ≤ 7 hari ke belakang (WIB); masa depan → 422. `200 { "data": { "date", "itemId", "completed", "streak": 5 } }`.

### 10.4 `POST /me/riyadhoh/logs/sync` — Auth + feature `riyadhoh`
Sinkron offline/migrasi pertama dari AsyncStorage (bulk, idempotent).
```json
{ "entries": [ { "date": "2026-10-14", "itemId": "shalat-subuh", "completed": true, "updatedAt": "2026-10-14T05:01:00+07:00" } ] }
```
Konflik → menang `updatedAt` terbaru. Max 2000 entri/request. `200 { "data": { "applied": 120, "skipped": 3 } }`.

### 10.5 `GET /me/riyadhoh/summary` — Auth + feature `riyadhoh`
```json
{
  "data": {
    "today": { "date": "2026-10-14", "completed": 18, "total": 33, "percent": 55 },
    "streak": { "current": 12, "longest": 40, "rule": "minimal 1 amalan per hari" },
    "week": [ { "date": "2026-10-08", "completed": 20, "total": 33 } ]
  }
}
```

---

## 11. Bookmark & progres baca

Konten Quran/Hadis tetap dari API pihak ketiga; server hanya menyimpan referensi.

### 11.1 `GET /me/bookmarks?type=ayah|hadith` — Auth
```json
{
  "data": [
    { "id": 1, "type": "ayah",   "ref": "2:255",      "label": "Al-Baqarah: 255", "note": null, "createdAt": "…" },
    { "id": 2, "type": "hadith", "ref": "bukhari:1",  "label": "Shahih Bukhari No. 1", "note": null, "createdAt": "…" }
  ]
}
```
`ref` ayat = `surahId:ayah`; hadis = `slug:number` (**format baru**, memperbaiki bentrok antar kitab). `label` dikirim client saat create.

### 11.2 `POST /me/bookmarks` — Auth
```json
{ "type": "ayah", "ref": "2:255", "label": "Al-Baqarah: 255" }
```
Idempotent (unik per user+type+ref). `201`/`200`.

### 11.3 `DELETE /me/bookmarks/{type}/{ref}` — Auth
mis. `DELETE /me/bookmarks/ayah/2:255` (URL-encode `:`). `204`.

### 11.4 `POST /me/bookmarks/sync` — Auth
Migrasi pertama dari lokal.
```json
{ "ayahs": ["2:255", "1:1"], "hadiths": ["bukhari:1"] }
```
Bookmark hadis lama yang hanya nomor (tanpa kitab) tidak bisa dimigrasi akurat → app kirim sebagai `"unknown:<n>"` atau dibuang (keputusan terbuka).

### 11.5 `GET /me/quran/progress` · `PUT /me/quran/progress` — Auth
```json
{ "lastRead": { "surahId": 2, "ayah": 255, "updatedAt": "…" }, "perSurah": { "1": 7, "2": 255 } }
```
`PUT` body: `{ "surahId": 2, "ayah": 255 }` (`setLastReadAyah`).

---

## 12. Preferensi

### 12.1 `GET /me/preferences` · `PUT /me/preferences` — Auth (opsional)
Sinkron pengaturan antar device. App tetap menyimpan lokal sebagai sumber utama; server hanya backup.
```json
{
  "theme": "light", "colorScheme": "mist",
  "quranFontSize": 18, "hadithFontSize": 16,
  "notificationSettings": {
    "adhanEnabled": true, "motivationalEnabled": true, "riyadhohEnabled": true,
    "istighfarHourlyEnabled": true, "dzikirReminderEnabled": true, "shalawatReminderEnabled": true,
    "spiritualReminderEnabled": true, "riyadhohHour": 20, "riyadhohMinute": 0
  },
  "prayerLocation": { "latitude": -6.2088, "longitude": 106.8456, "city": "Jakarta", "country": "Indonesia" }
}
```
`PUT` = partial merge. `notificationSettings` juga dipakai server untuk menentukan siapa yang menerima push kategori tertentu.

---

## 13. Konten: motivasi, artikel, doa

### 13.1 `GET /motivasi/categories` — Public
```json
{ "data": [ { "id": "aqidah", "title": "Fundamental Aqidah", "subtitle": "Pondasi Keimanan", "description": "…", "icon": "shield-checkmark", "color": "#0077B6", "gradient": ["#0077B6", "#00B4D8"], "articlesCount": 3, "sortOrder": 1 } ] }
```

### 13.2 `GET /motivasi/categories/{id}` — Public
Kategori + `quote` (satu quote acak dari tag terkait — menggantikan `CATEGORY_QUOTE_MAP`) + `articles[]` ringkas.

### 13.3 `GET /quotes` — Public
`?category=Hijrah&random=1&limit=1&page=`. `GET /quotes/daily` → quote hari ini (sama dengan Home).
```json
{ "data": [ { "id": 1, "text": "…", "author": "NASUHA", "category": "Hijrah" } ] }
```

### 13.4 `GET /articles` — Public
Menyatukan `MOTIVASI_ARTICLES` (44) dan `artikel` (6).
`?categoryId=aqidah&section=motivasi|artikel&q=&page=`. List tanpa `content`:
```json
{ "data": [ { "id": 12, "slug": "makna-tauhid", "section": "motivasi", "categoryId": "aqidah", "title": "…", "summary": "…", "author": "Tim NASUHA", "readTime": "5 menit", "icon": "book", "coverImage": null, "publishedAt": "…" } ] }
```

### 13.5 `GET /articles/{id}` — Public
Plus `content` (**markdown**; app merender quote `>` & list `-`/`1.` — menggantikan heuristik `"`/`•` sekarang) dan `category`.
Artikel 1001 "500 Afirmasi Magnet Rezeki" disimpan sebagai konten markdown hasil generate sekali saat seeding.

### 13.6 `GET /doas` — Public
`?category=Rezeki&debt=true&q=`. Default tanpa paging (≈35 item; app cache).
```json
{ "data": [ { "id": 7, "category": "Rezeki", "title": "Kecukupan dengan yang halal", "arabic": "…", "latin": "…", "meaning": "…", "source": "HR. Tirmidzi", "icon": "wallet-outline", "debt": true, "sortOrder": 7 } ] }
```
Seeding: hapus duplikat CORE vs EXTRA.

---

## 14. Program, korda, infaq, sosial

### 14.1 `GET /programs` · `GET /programs/{slug}` — Public
Halaman program generik untuk `tsn`, `lbu`, `kfm`, dan kegiatan sosial (`air-minum`, `jenguk-sakit`, `safari-dakwah`, `baksos`, `edukasi`).
```json
{
  "data": {
    "slug": "lbu",
    "group": "utama",
    "title": "Langkah Bebas Utang", "subtitle": "LBU",
    "description": "…",
    "icon": "trending-up", "gradient": ["#…", "#…"],
    "benefits": ["…"],
    "steps": [ { "num": 1, "title": "Daftar", "desc": "…", "icon": "create" } ],
    "stats": { "totalLBU": 37, "totalPeserta": 12500, "totalLunas": 85000000000, "persentaseSukses": 94 },
    "sections": [ { "title": "Tujuan", "items": ["…"] }, { "title": "Materi", "items": ["…"] } ],
    "schedule": "Setiap bulan", "howToJoin": "…",
    "cta": { "label": "DAFTAR LBU", "type": "whatsapp", "value": "62…" },
    "relatedEventType": "LBU"
  }
}
```
- `GET /programs?group=kegiatan` → list kartu `/kegiatan` + `summary` agregat (menggantikan angka "615+/68K+/2.1K+" hardcoded).
- KFM: `sections` = `KFM_TOPICS`, `TUJUAN`, `PERTANYAAN_HARTA`; promo seminar via `cta`.
- App mengambil event & testimoni terkait lewat `/events?type=` dan `/testimonials?program=`.

### 14.2 `GET /kordas` — Public
Pengganti `KORDA_CONTACTS` + `NASUHA_KORDA` + `REGION_OPTIONS` (satu master).
```json
{ "data": [ { "id": "jakarta", "label": "Korda Jakarta", "region": "Jakarta", "ketua": "Pak Dani", "phone": "081324727577", "whatsapp": "6281324727577", "icon": "business", "sortOrder": 2 } ] }
```

### 14.3 `GET /infaq/programs` — Public
```json
{ "data": [ { "id": "subuh", "title": "Sedekah Subuh", "shortLabel": "Sedekah Subuh", "description": "…", "icon": "sunny", "gradient": ["#…", "#…"], "bankName": "BSI", "bankAccount": "7171000001", "bankHolder": "Yayasan NASUHA", "qrisImage": "https://…/qris.png", "whatsappConfirm": "62…", "isActive": true } ] }
```
`shortLabel` memperbaiki bug label tab yang hardcoded per id.

### 14.4 `POST /infaq/confirmations` — Public/Auth (opsional, fase 2)
Pencatatan konfirmasi transfer (selain via WA).
```json
{ "programId": "subuh", "amount": 50000, "name": "Hamba Allah", "phone": "0812…", "transferDate": "2026-10-14", "proofImage": "https://…", "notes": "…" }
```
`201`, status `pending` → diverifikasi admin. `GET /me/infaq/confirmations` untuk riwayat.

### 14.5 `GET /social/links` — Public
```json
{ "data": [ { "id": "instagram", "name": "Instagram", "icon": "logo-instagram", "color": "#E1306C", "gradient": ["#…", "#…"], "handle": "@nasuhajakarta", "url": "https://instagram.com/nasuhajakarta", "deepLink": "instagram://user?username=nasuhajakarta", "cta": "Follow" } ] }
```

### 14.6 `GET /social/posts` — Public
`?platform=instagram&limit=8`. Dikelola manual di CMS (fase 1), bisa diganti sinkron API IG/TikTok (fase 2).
```json
{ "data": [ { "id": 1, "platform": "instagram", "type": "Reels", "title": "…", "description": "…", "thumbnail": "https://…", "url": "https://instagram.com/p/…", "deepLink": "…", "publishedAt": "…" } ] }
```
Angka likes/komentar palsu dihapus (atau hanya diisi bila sinkron API).

### 14.7 `GET /onboarding-slides` — Public (opsional)
`{ "data": [ { "id": 1, "title", "subtitle", "description", "icon" } ] }`. App tetap punya fallback bawaan (onboarding harus jalan offline).

---

## 15. Asisten Anas

### 15.1 `GET /asisten/suggestions` — Public
```json
{ "data": { "greeting": "Assalamu'alaikum! Saya Anas…", "suggestions": ["Apa itu riba?", "…"], "literacyTopics": [ { "question": "…", "title": "…", "description": "…", "icon": "…" } ] } }
```

### 15.2 `POST /asisten/chat` — Public (rate limit ketat)
```json
{ "message": "Apa hukum KPR konvensional?", "conversationId": null }
```
```json
{ "data": { "conversationId": "c_123", "reply": "markdown…", "topic": "KPR & Riba", "sources": [ { "type": "faq", "id": 4 } ], "suggestions": ["…"] } }
```
Fase 1: keyword matching KB di server (port logika `anasBot.ts`, KB dikelola CMS).
Fase 2: LLM + retrieval dari KB/artikel (di balik `featureFlags.asistenAi`).

---

## 16. Notifikasi & device

Notifikasi lokal (adzan, pengingat dzikir dll.) **tetap dijadwalkan di device**. Server menangani inbox + push broadcast.

### 16.1 `POST /me/devices` — Auth
Daftar Expo push token (panggil saat login & saat token berubah).
```json
{ "expoPushToken": "ExponentPushToken[xxx]", "platform": "android", "deviceName": "SM-A525F", "appVersion": "1.0.0" }
```
Upsert per token. `204`. `DELETE /me/devices/{expoPushToken}` saat logout.

### 16.2 `GET /me/notifications` — Auth
`?unread=true&page=`
```json
{
  "data": [ { "id": 10, "type": "event", "title": "Pendaftaran Dikonfirmasi", "body": "…", "icon": "calendar", "data": { "route": "/event/5" }, "readAt": null, "createdAt": "…" } ],
  "meta": { "page": 1, "perPage": 20, "total": 14, "lastPage": 1, "unread": 3 }
}
```
`type ∈ event | riyadhoh | motivasi | lbu | lapak | tanya | info`. App menampilkan waktu relatif dari `createdAt`.

### 16.3 `POST /me/notifications/{id}/read` · `POST /me/notifications/read-all` — Auth · `204`

### Notifikasi otomatis yang dikirim server
| Pemicu | Ke | type |
|---|---|---|
| Registrasi event dikonfirmasi / dibatalkan admin | pendaftar | event |
| H-1 event | pendaftar aktif | event |
| Produk lapak approved / rejected | penjual | lapak |
| Produk baru menunggu review | admin | lapak |
| Pertanyaan dijawab | penanya | tanya |
| Testimoni approved | penulis | info |
| Broadcast admin (16.4) | segmen | sesuai pilihan |

---

## 17. Admin

Prefix `/admin`, semua **Admin** kecuali disebut **Super admin**. Mengganti `app/admin/index.tsx` (5 tab) + CRUD konten yang sekarang hardcoded.
CRUD konten dipakai oleh panel web admin (disarankan) maupun panel di app.

### 17.1 Dashboard
`GET /admin/dashboard`
```json
{ "data": { "users": { "total": 1200, "active": 1180, "admins": 3, "byMembership": { "free": 900, "membership": 200, "sahabat": 100 } }, "lapak": { "pending": 4 }, "events": { "upcoming": 6 }, "registrations": { "pending": 25 }, "testimonials": { "pending": 2 }, "questions": { "unanswered": 5 } } }
```

### 17.2 Users (tab "Users" & "Member")
| Method | Path | Body / Query | Catatan |
|---|---|---|---|
| GET | `/admin/users` | `?q=&role=&membershipType=&isActive=&page=` | list `User` |
| GET | `/admin/users/{id}` | | + stats ringkas |
| PATCH | `/admin/users/{id}/role` | `{ "role": "sahabat" }` | admin hanya boleh set `calon_sahabat`/`sahabat`/`ustadz` dan **tidak boleh** mengubah admin/super_admin; super_admin bebas; tidak boleh mengubah diri sendiri |
| PATCH | `/admin/users/{id}/status` | `{ "isActive": false }` | nonaktif → semua token dicabut |
| PATCH | `/admin/users/{id}/membership` | `{ "membershipType": "sahabat", "lbuBatch": 37 }` | |
| PATCH | `/admin/users/{id}/features` | `{ "lapak": true, "tanya": false }` | override per user; kirim `null` untuk kembali ke default plan |
| DELETE | `/admin/users/{id}` | | **Super admin**; soft delete + cabut token (memperbaiki bug akun yang dihapus masih bisa login) |
| POST | `/admin/users/{id}/reset-password` | | Fase 1: generate password sementara, dikembalikan sekali di response `{ "data": { "temporaryPassword": "…" } }` untuk diberikan admin ke user (via WA); semua token user dicabut. Fase 1b: kirim OTP email |

### 17.3 Membership plans
| Method | Path | Body |
|---|---|---|
| GET | `/admin/membership-plans` | |
| PUT | `/admin/membership-plans/{type}` | `{ "label", "description", "color", "features": [ { "id": "lapak", "enabled": true } ] }` — **Super admin** |

### 17.4 Lapak moderation
| Method | Path | Body / Query |
|---|---|---|
| GET | `/admin/lapak/products` | `?status=pending&q=&category=&page=` |
| POST | `/admin/lapak/products/{id}/approve` | — |
| POST | `/admin/lapak/products/{id}/reject` | `{ "reason": "Foto kurang jelas" }` |
| PUT | `/admin/lapak/products/{id}` | edit tanpa mengubah status |
| DELETE | `/admin/lapak/products/{id}` | — |

### 17.5 Events
| Method | Path | Body / Query |
|---|---|---|
| GET | `/admin/events` | `?status=draft,published,cancelled&type=&q=&page=` (semua status) |
| POST | `/admin/events` | `{ title*, type*, date*, time*, location*, description, quota*, status: draft|published, contactWhatsapp, image }` |
| PUT | `/admin/events/{id}` | sama; `quota` tidak boleh < jumlah registrasi aktif |
| PATCH | `/admin/events/{id}/status` | `{ "status": "published" | "cancelled" }` — cancel → notifikasi ke pendaftar |
| DELETE | `/admin/events/{id}` | hanya bila tidak ada registrasi, selain itu 409 (pakai cancel) |

Validasi `date` `YYYY-MM-DD`, `time` `HH:mm`, `quota` integer ≥ 1, `type` ∈ eventTypes.

### 17.6 Event registrations (tab "Daftar")
| Method | Path | Body / Query |
|---|---|---|
| GET | `/admin/event-registrations` | `?eventId=&status=&q=&page=` |
| GET | `/admin/events/{id}/registrations/export` | CSV |
| PATCH | `/admin/event-registrations/{id}` | `{ "status": "confirmed" | "cancelled" }` |
| POST | `/admin/event-registrations/{id}/attendance` | `{ "attended": true }` (opsional; dasar statistik kehadiran TSN) |

### 17.7 Testimoni & Tanya
| Method | Path | Body |
|---|---|---|
| GET | `/admin/testimonials?status=pending` | |
| POST | `/admin/testimonials/{id}/approve` · `/reject` | `{ "reason" }` |
| POST | `/admin/testimonials` | buat testimoni atas nama (seed/manual): `{ name, korda, program, rating, text, date }` |
| DELETE | `/admin/testimonials/{id}` | |
| GET | `/admin/questions?answered=false` | |
| DELETE | `/admin/questions/{id}` · `/admin/answers/{id}` | |
| PATCH | `/admin/questions/{id}` | `{ "status": "closed" }` |

### 17.8 CRUD konten (pola seragam)
Setiap resource: `GET /admin/{res}` (semua, termasuk tidak aktif) · `POST` · `PUT /{id}` · `DELETE /{id}` · `PATCH /admin/{res}/reorder` `{ "ids": [..] }`.

| `{res}` | Field utama |
|---|---|
| `motivasi-categories` | id(slug), title, subtitle, description, icon, color, gradient[2], quoteTags[], sortOrder, isActive |
| `quotes` | text, author, category, isActive |
| `articles` | section, categoryId, title, slug, summary, content(markdown), author, readTime, icon, coverImage, publishedAt, status draft/published |
| `doas` | category, title, arabic, latin, meaning, source, icon, debt, sortOrder |
| `riyadhoh-items` | id(slug, immutable), name, category, icon, rakaat, sortOrder, isActive (nonaktifkan, jangan hapus — log merujuk id) |
| `riyadhoh-docs` | title, body |
| `programs` | lihat 14.1 |
| `kordas` | id(slug), label, region, ketua, phone, icon, sortOrder |
| `infaq-programs` | lihat 14.3 |
| `infaq-confirmations` | GET list + `PATCH {status: verified/rejected}` |
| `social-links`, `social-posts` | lihat 14.5–14.6 |
| `banners` | title, image, action{type: route/url/whatsapp, value}, startAt, endAt, sortOrder |
| `onboarding-slides` | title, subtitle, description, icon, sortOrder |
| `asisten-kb` | keywords[], topic, response(markdown), isActive · + `asisten-suggestions` |
| `references/{kind}` | event-types, lapak-categories, question-categories, testimonial-programs, doa-categories |
| `app-config` | `PUT /admin/app-config` (isi `GET /config`) — **Super admin** |

### 17.9 Broadcast notifikasi
`POST /admin/notifications/broadcast`
```json
{ "title": "TSN Oktober dibuka!", "body": "…", "type": "event", "data": { "route": "/event/12" },
  "target": { "all": false, "roles": ["sahabat"], "membershipTypes": ["sahabat"], "kordas": ["jakarta"] },
  "sendPush": true, "scheduledAt": null }
```
`202 { "data": { "id": 3, "recipients": 540 } }`. `GET /admin/notifications/broadcasts` untuk riwayat.

### 17.10 Audit log
`GET /admin/audit-logs?actorId=&action=&page=` — **Super admin**. Semua aksi admin (role, status, approve/reject, hapus) tercatat.

---

## 18. Lampiran

### 18.1 Matriks akses ringkas
| Area | Tamu | User login | + feature | Pemilik | Admin | Super admin |
|---|---|---|---|---|---|---|
| Baca konten (motivasi, doa, artikel, program, korda, infaq, sosial) | ✓ | ✓ | | | ✓ | ✓ |
| Lihat event / lapak approved / testimoni / tanya | ✓ | ✓ | | | ✓ | ✓ |
| Daftar event | | | `event` | | | |
| Jual di lapak | | | `lapak` | edit/hapus | moderasi | moderasi |
| Tulis testimoni | | ✓ | | hapus | moderasi | moderasi |
| Tanya / jawab | | | `tanya` | edit/hapus | hapus | hapus |
| Riyadhoh sync | | | `riyadhoh` | | | |
| Bookmark, progres baca, preferensi | | ✓ | | | | |
| Kelola user (role terbatas) | | | | | ✓ | ✓ |
| Hapus user, ubah plan, app-config, audit | | | | | | ✓ |

> Tamu di app tetap bisa memakai riyadhoh & bookmark **lokal** seperti sekarang; sync hanya setelah login.
> Fitur `quran`, `hadis`, `motivasi` tidak di-gate server (kontennya publik/pihak ketiga); `social`, `community` hanya flag UI.

### 18.2 Enum
| Enum | Nilai |
|---|---|
| role | `super_admin`, `admin`, `ustadz` *(usulan baru)*, `sahabat`, `calon_sahabat` |
| membershipType | `free`, `membership`, `sahabat` |
| feature | `quran`, `hadis`, `motivasi`, `riyadhoh`, `event`, `lapak`, `tanya`, `social`, `community` |
| authProvider | `password`, `google` |
| event.status | `draft`, `published`, `cancelled` |
| registration.status | `registered`, `confirmed`, `cancelled` |
| product.status / testimonial.status | `pending`, `approved`, `rejected` |
| question.status | `open`, `closed` |
| product.specs.condition | `Baru`, `Bekas` |
| gender | `laki-laki`, `perempuan` |
| notification.type | `event`, `riyadhoh`, `motivasi`, `lbu`, `lapak`, `tanya`, `info` |
| upload.purpose | `avatar`, `product`, `testimonial`, `event`, `infaq_proof`, `content` |

### 18.3 Mapping screen → endpoint
| Screen | Endpoint |
|---|---|
| `_layout` (hydrate) | `GET /config`, `GET /auth/me`, `GET /references` |
| onboarding | `GET /onboarding-slides` (opsional) |
| login / register | Fase 1: `POST /auth/login`, `/auth/register` · Fase 1b: `/auth/forgot-password`, `/auth/reset-password` · Fase 2: `/auth/google` |
| Home | `GET /home` |
| Riyadhoh | `GET /riyadhoh/items`, `GET /me/riyadhoh/summary`, `GET /me/riyadhoh/logs`, `PUT /me/riyadhoh/logs/{date}/{itemId}` |
| Event tab, `/event`, detail | `GET /events`, `GET /events/{id}`, `POST /events/{id}/registrations`, `POST /event-registrations/{id}/cancel` |
| `/event/add`, `/event/edit/[id]` | `POST/PUT /admin/events` |
| Profile, edit profile | `GET /me`, `GET /me/stats`, `PATCH /me`, `POST/DELETE /me/avatar`, `POST /auth/logout` |
| Quran detail, Hadis detail, Bookmarks | `GET/POST/DELETE /me/bookmarks`, `GET/PUT /me/quran/progress` |
| Settings | `GET/PUT /me/preferences`, `GET /config` (cek update) |
| Motivasi (3 screen), Artikel | `GET /motivasi/categories[/{id}]`, `GET /quotes`, `GET /articles[/{id}]` |
| Doa | `GET /doas` |
| Lapak (4 screen) | `GET /lapak/products[/{id}]`, `GET /me/products`, `POST /uploads`, `POST/PUT/DELETE /lapak/products` |
| Testimoni (2) | `GET /testimonials`, `POST /uploads`, `POST /testimonials` |
| Tanya (3) | `GET /questions[/{id}]`, `POST /questions`, `POST /questions/{id}/answers` |
| Community, LBU, TSN, KFM, Kegiatan | `GET /programs[/{slug}]`, `GET /events?type=`, `GET /testimonials?program=` |
| Korda | `GET /kordas` |
| Infaq | `GET /infaq/programs`, `POST /infaq/confirmations` |
| Social | `GET /social/links`, `GET /social/posts` |
| Asisten | `GET /asisten/suggestions`, `POST /asisten/chat` |
| Notifications | `GET /me/notifications`, `POST …/read`, `POST …/read-all`, `POST /me/devices` |
| Search | `GET /search` |
| About | `GET /config` |
| Admin (5 tab) | `/admin/dashboard`, `/admin/users*`, `/admin/lapak/*`, `/admin/events*`, `/admin/event-registrations*`, `/admin/membership-plans*` |
| Sholat, Quran list, Hadis list | **tidak ada** — tetap Aladhan / equran.id / hadis-api-id / Overpass |

### 18.4 Jumlah endpoint
| Grup | Jumlah |
|---|---|
| Auth | 8 |
| Me / profil / upload / preferensi / device / notifikasi | 16 |
| Config, referensi, home, search | 5 |
| Event | 5 |
| Lapak | 7 |
| Testimoni | 4 |
| Tanya | 7 |
| Riyadhoh | 5 |
| Bookmark & progres | 6 |
| Konten (motivasi, artikel, doa, program, korda, infaq, sosial, onboarding, asisten) | 16 |
| **App total** | **≈ 79** |
| Admin (dashboard, user, plan, moderasi, event, CRUD ±17 resource × 5, broadcast, audit) | ≈ 110 |
