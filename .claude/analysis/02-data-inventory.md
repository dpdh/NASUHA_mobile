# 02 — Inventaris Data: apa yang pindah ke backend

Klasifikasi:
- **A. Transaksional / UGC** — dibuat user, harus di server (multi-user).
- **B. Per-user sync** — milik satu user, sekarang lokal, sebaiknya sinkron (pindah HP tidak hilang).
- **C. Konten CMS** — sekarang hardcoded, dikelola admin.
- **D. Tetap lokal / pihak ketiga** — tidak perlu backend.

## A. Transaksional / UGC

| Entitas | Sumber sekarang | Shape sekarang (types/index.ts) | Catatan untuk backend |
|---|---|---|---|
| User / akun | store `members`, `@nasjak_accounts` | `User` (id, email, name, phone, avatar, role, joinDate, isActive, bio, city, address, gender, birthDate, occupation, nasuhaRegion, lbuBatch, membershipType, membershipFeatures, googleId, authProvider) | Password di-hash; login via email **atau** no. HP (normalisasi `+62/62 → 0`); Google `sub` sebagai identitas Google; role & membership hanya bisa diubah admin. |
| Event | store `events` + `SAMPLE_EVENTS` (15) | `Event` (id, title, type, date `YYYY-MM-DD`, time `HH:MM`, location, description, quota, registered, status draft/published/cancelled, createdBy, image?, contactWhatsapp?) | `registered` dihitung server dari registrasi non-cancelled. Tambah `image`. Seed dari `SAMPLE_EVENTS`. |
| Registrasi event | store `eventRegistrations` | `EventRegistration` (eventId, userId, userName, userEmail, userPhone, userCity?, korda?, notes?, status registered/confirmed/cancelled) | Unik (eventId,userId) untuk status aktif; cek kuota & status event di server. |
| Produk Lapak | store `products` | `LapakProduct` (sellerId, sellerName, sellerCity, sellerWhatsapp, name, category, description ≤500, price, photos[≤5], specs{weight, condition Baru/Bekas, stock, minOrder, variant, shippingFrom}, tags[], status pending/approved/rejected, rating, sold) | Upload foto. Moderasi admin. Edit oleh pemilik → kembali `pending`. `seller*` diambil dari profil (snapshot boleh). |
| Testimoni | `SAMPLE_TESTIMONIALS` (24) + store `testimonials` | 2 shape berbeda: `Testimonial` (name, korda, text, program, rating, date) & `UserTestimonial` (userId, userName, userAvatar, program, rating, text, photo?) | Satukan; tambah `korda` & `status` moderasi. Program: LBU/TSN/Riyadhoh/Kajian/Lainnya. Seed 24 sample sebagai approved tanpa userId. |
| Pertanyaan & jawaban | store `questions` (answers nested) | `Question` (userId, category, title, body, answers[]), `Answer` (questionId, userId, body) | Answers tabel terpisah. Kategori: Keuangan Syariah/Hijrah/Fiqh/Bisnis/Umum. Perlu penanda jawaban ustadz/admin. |
| Notifikasi inbox | hardcoded di screen | `{title, body, icon, type event/riyadhoh/motivasi/lbu/info, read}` | Tabel notifikasi per user + push token (Expo push). |
| Konfirmasi infaq (baru) | tidak ada (hanya WA) | — | Opsional: catat konfirmasi + bukti transfer. |

## B. Per-user sync

| Data | Format lokal sekarang | Format API usulan |
|---|---|---|
| `riyadhohLogs` | `Record<"${itemId}_${YYYY-MM-DD}", boolean>` (tanggal UTC — bug) | baris `(userId, itemId, date WIB, completed)`; API kirim map per tanggal |
| `bookmarkedAyahs` | `string[]` `"surahId:ayah"` | `{type:"ayah", ref:"2:255"}` |
| `bookmarkedHadiths` | `number[]` (bentrok antar kitab) | `{type:"hadith", ref:"bukhari:1"}` |
| `lastReadAyahs` | `Record<surahId, ayah>` | `{ "2": 255, ... }` + `lastReadSurah` terakhir |
| Preferensi | `theme, colorScheme, quranFontSize, hadithFontSize, notificationSettings, prayerLocation` | `GET/PUT /me/preferences` (opsional, last-write-wins) |
| Statistik profil | hardcoded 0 | dihitung server: streak riyadhoh, total amalan, kehadiran TSN (dari registrasi confirmed event type TSN), jumlah bookmark |

## C. Konten CMS

| Konten | Lokasi | Jumlah | Shape |
|---|---|---|---|
| Onboarding slides | `ONBOARDING_SLIDES` | 4 | id, title, subtitle, description, icon |
| Quote motivasi | `MOTIVASI_QUOTES` | 360 | id, text, author, category (≈23 tag) |
| Kategori motivasi | `MOTIVASI_CATEGORIES` | 21 | id(slug), title, subtitle, description, icon, color, gradient[2] |
| Relasi kategori→tag quote | `CATEGORY_QUOTE_MAP` (motivasi/[categoryId]) | 6 dari 21 | categoryId → quoteCategory[] |
| Artikel motivasi | `MOTIVASI_ARTICLES` | 44 (id 1001 = 500 afirmasi generated) | id, categoryId, title, summary, content (teks, `\n\n` paragraf), author, readTime, icon |
| Artikel umum | `ARTICLES` (`app/artikel`) | 6 (tanpa isi) | id, title, category, readTime, icon → digabung ke tabel artikel |
| Doa | `DOAS` (`constants/doa.ts`) | 35 (ada duplikat) | category (15 enum), title, arabic?, latin?, meaning, source?, icon, debt? |
| Item riyadhoh | `RIYADHOH_ITEMS` | 33 | id (slug, **harus stabil**), name, category (8), icon, rakaat? |
| Dokumen riyadhoh | `RIYADHOH_DOCS` | 2 | title, body |
| Kontak Korda | `KORDA_CONTACTS` (+ `NASUHA_KORDA` 14 string, + `REGION_OPTIONS` profil) | 14 | region, ketua, phone, icon — satukan jadi master `kordas` |
| Program: TSN, LBU, KFM, Kegiatan | `TSN_INFO`, `LBU_INFO`, `TIMELINE_STEPS`, `KFM_TOPICS`, `TUJUAN`, `PERTANYAAN_HARTA`, `KEGIATAN` | 1+1+6+6+5+5+5 | halaman program: title, subtitle, description, benefits[], steps[], stats{}, sections[] |
| Program infaq | `INFAQ_PROGRAMS`, `NOMINAL_OPTIONS` | 3, 6 | title, description, icon, gradient, bankName, bankAccount, bankHolder, whatsappConfirm, (+qrisImageUrl) |
| Social links & post | `SOCIAL_LINKS`, `NASUHA_CONTENT`, IG post di Home | 5, 8, 3 | name, icon, color, handle, url, deepLink; post: platform, type, title, url, thumbnail |
| Asisten Anas | `KNOWLEDGE_BASE`, `SUGGESTED_QUESTIONS`, `LITERACY_TOPICS` | 22, 18, 4 | keywords[], topic, response (markdown) |
| Master referensi | `EVENT_TYPES` (12), `LAPAK_CATEGORIES` (7), kategori tanya (5), program testimoni (5), kategori doa (15), gender, region | — | id, label, icon, color, sortOrder |
| Membership plans | `DEFAULT_MEMBERSHIP_PLANS` (store) | 3 plan × ≤9 fitur | type, label, description, color, features[{id,name,description,icon,enabled}] |
| Menu Home / Belajar | `QUICK_ACTIONS` (17), `MENU_ITEMS` (5) | — | opsional (remote config / feature flag), prioritas rendah |
| Teks notifikasi pengingat | `services/prayer.ts` | ±17 | opsional, remote config |
| Info app / about | `about.tsx`, modal profil | — | `GET /config` (versi minimum, link, kontak) |

## D. Tetap lokal / pihak ketiga

| Data | Alasan |
|---|---|
| Al-Quran teks + audio (equran.id) | API publik stabil, sudah di-cache 7 hari di app |
| Hadis (hadis-api-id.vercel.app) | sama; opsional di-proxy kalau ingin cache server |
| Jadwal sholat (Aladhan, method 20 Kemenag) | per lokasi user, cukup di client |
| Masjid terdekat (Overpass) & kiblat (hitung lokal) | per lokasi user |
| `JUZ_DATA`, `COLLECTION_META` hadis | data referensi statis |
| `isOnboarded`, cache API, state audio player | murni device |
| Penjadwalan notifikasi lokal (adzan, pengingat) | tetap lokal; server hanya untuk push broadcast |
