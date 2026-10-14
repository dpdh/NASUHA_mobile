# 04 — Keputusan Terbuka (sebelum plan project backend)

Hal yang perlu diputuskan sebelum masuk ke tahap plan/implementasi backend. Rekomendasi saya di kolom kanan.

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| 1 | Stack backend? | ✅ **DIPUTUSKAN: Node.js + Express 5 + PostgreSQL** mengikuti arsitektur & DB `idtc-user`; panel admin Tailwind + Alpine.js. Project: `/Users/bahri/development/masdani/nasjak-backend` |
| 2 | Panel admin: tetap di app mobile, web, atau keduanya? | ✅ keduanya: web `/admin` (Tailwind + Alpine) untuk semua termasuk CRUD konten; panel admin di app untuk moderasi cepat (users, lapak, event, registrasi) |
| 3 | Tambah role `ustadz`? Siapa yang boleh menjawab Tanya? | ✅ diimplementasikan: role `ustadz`; member (fitur `tanya`) boleh berdiskusi, jawaban `isOfficial` hanya ustadz/admin |
| 4 | Testimoni & lapak wajib moderasi? | Ya, keduanya `pending` dulu |
| 5 | Riyadhoh untuk tamu? | Tetap lokal; setelah login di-`sync` sekali |
| 6 | Bookmark hadis lama (nomor tanpa kitab) | Dibuang saat migrasi (datanya ambigu) |
| 7 | Siapa yang mengisi `lbuBatch` & membership? | Admin saja (dari data peserta LBU) |
| 8 | Metode login fase 1? | ✅ **DIPUTUSKAN (2026-10-14): fase 1 email/no. HP + password saja.** Google login = fase 2. Lupa password via OTP email = fase 1b (sementara reset oleh admin). OTP WhatsApp = nanti |
| 9 | Penyimpanan file | ✅ fase 1: disk lokal `uploads/<purpose>/` (seperti idtc-user); nanti bisa pindah ke S3-compatible |
| 10 | Infaq: hanya info rekening, atau catat konfirmasi? | Fase 1 info + WA (seperti sekarang, data dari CMS); fase 2 `POST /infaq/confirmations` |
| 11 | Asisten Anas: KB keyword atau LLM? | Fase 1 KB di server (port `anasBot.ts`); fase 2 LLM + retrieval |
| 12 | Rekening & nomor WA infaq/lapak di konstanta saat ini placeholder? | Minta data asli dari pengurus sebelum seeding |
| 13 | Data seed (event 2026, testimoni sample) masih dipakai di produksi? | Seed konten (motivasi, doa, korda, riyadhoh, program) = ya; event & testimoni sample = hanya untuk dev |

## Catatan migrasi data lokal → server (untuk tahap app)

1. Saat user pertama login versi baru: kirim `riyadhohLogs` (ubah key `itemId_YYYY-MM-DD` → entries), `bookmarkedAyahs`, `lastReadAyahs` ke endpoint `sync`, lalu tandai `migratedAt` di AsyncStorage.
2. `members`, `products`, `events`, `testimonials`, `questions`, `eventRegistrations` lokal **tidak dimigrasi** (data per-device, tidak konsisten). Hapus dari store.
3. Hapus `@nasjak_accounts` (password plaintext) dan `ensureDefaultSuperAdmin`.
4. Token disimpan di `expo-secure-store` (bukan AsyncStorage).

## Perbaikan app yang sebaiknya ikut saat integrasi

- Tanggal riyadhoh pakai WIB, bukan `toISOString()`.
- Format bookmark hadis `slug:number`.
- `quranFontSize` benar-benar dipakai (hapus `Math.max(…, 30)`).
- Hapus folder template `nasjak/`, file `120`, `.history/` dari repo; pindahkan Google Maps key ke env/EAS secret.
- Gate fitur di UI membaca `user.membershipFeatures` dari server.
