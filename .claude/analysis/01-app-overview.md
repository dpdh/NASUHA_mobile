# 01 — Overview Aplikasi NASUHA (NASJAK)

> Dianalisis 2026-10-14 dari commit `502450b` (branch `main`).

## 1. Ringkasan

**NASUHA App** adalah aplikasi komunitas NASUHA Jakarta: "Hijrah Bersama, Tumbuh Bersama, Bebas Utang Bersama".
Isinya fitur ibadah (Al-Quran, Hadis, Doa, Sholat/Kiblat, Riyadhoh tracker), konten motivasi/edukasi
(Motivasi, KFM, Artikel, asisten "Anas"), dan fitur komunitas (Event + registrasi, Lapak jualan anggota,
Testimoni, Tanya Ustadz, Korda, Infaq, LBU, TSN, Kegiatan sosial). Ada **CMS Admin Panel** di dalam app.

**Saat ini tidak ada backend.** Semua data:
- konten = konstanta hardcoded (`constants/data.ts` 1.450 baris, `constants/doa.ts`, plus konstanta lokal di tiap screen);
- data user (akun, produk, event, testimoni, pertanyaan, registrasi, member) = Zustand store yang di-persist ke AsyncStorage
  (`@nasjak_store`), password **plaintext** di `@nasjak_accounts`;
- data ibadah dari API pihak ketiga (equran.id, hadis-api-id, Aladhan, Overpass).

Akibatnya: data tidak pernah berpindah antar device — produk yang dijual user A tidak pernah terlihat user B,
admin hanya bisa mengelola member yang pernah login di HP yang sama.

## 2. Stack

| Item | Nilai |
|---|---|
| Framework | Expo SDK **57** (`expo ~57.0.21`), React Native 0.86.3, React 19.2.3, TypeScript 6 |
| Routing | `expo-router` (file-based, `app/`), typed routes |
| State | `zustand` 5 (`store/appStore.ts`, satu store global) |
| Storage | `@react-native-async-storage/async-storage` lewat `services/storage.ts` (JSON + TTL cache) |
| Auth | lokal (email/HP + password) + Google OAuth (`expo-auth-session`) |
| Native | expo-location, expo-maps, expo-notifications (adzan + pengingat), expo-audio (murottal), expo-image-picker, expo-clipboard, expo-haptics |
| Package | `com.nasuha.nasjak` (Android & iOS), EAS projectId `f6987a08-…` |
| Lain | Ada dependency `@capacitor/*` (tidak dipakai), folder `nasjak/` = sisa template `create-expo-app` (bukan app aktif, bikin `tsc` error) |

Arsitektur berlapis didokumentasikan di `ARCHITECTURE.md` (app → store → services → storage).
Satu-satunya titik integrasi backend yang sudah ada: `services/userProvider.ts` → `POST {EXPO_PUBLIC_API_BASE_URL}/auth/google`
(kontrak di `backend/USER_PROVIDER_CONTRACT.md`).

## 3. Cara menjalankan

```bash
npm install
npx expo start            # Expo Go / dev client
npx expo start --web      # web (dipakai untuk verifikasi analisis ini, port 8091)
npm run android           # expo run:android (butuh Android SDK)
```

Hasil verifikasi 2026-10-14:
- `npm install` OK.
- `npx expo start --web` OK → onboarding → login → "Masuk sebagai Tamu" → Home + tab bar tampil, tanpa console error.
- `npx tsc --noEmit`: 1 error di app (`riyadhoh.tsx:618` properti `backdropFilter` di StyleSheet) + puluhan error dari folder template `nasjak/` (harus di-exclude / dihapus).
- Akun lokal default: `nasjak@gmail.com` / `Admin123` (super admin, di-seed `services/accountRepository.ts`).

## 4. Peta screen

| Route | Fungsi | Sumber data sekarang |
|---|---|---|
| `/onboarding` | 4 slide intro | `ONBOARDING_SLIDES` |
| `/(auth)/login`, `/register` | login email/HP + password, Google | store + `@nasjak_accounts` |
| `/(tabs)/index` Home | sapaan, quote harian, progress riyadhoh, 17 menu cepat, event, testimoni, feed IG palsu | `MOTIVASI_QUOTES`, `RIYADHOH_ITEMS`, `SAMPLE_EVENTS`, `SAMPLE_TESTIMONIALS` |
| `/(tabs)/belajar` | hub belajar | statis |
| `/(tabs)/riyadhoh` | checklist 33 amalan harian, streak, grafik 7 hari | `RIYADHOH_ITEMS`, `riyadhohLogs` |
| `/(tabs)/event`, `/event/*` | list, detail, registrasi, add/edit (admin) | `SAMPLE_EVENTS` + store `events`, `eventRegistrations` |
| `/(tabs)/profile`, `/profile/edit` | profil + edit (avatar) | store `user` |
| `/(tabs)/quran`, `/quran/[id]` | daftar surah, juz, baca + audio, bookmark, last read | equran.id + store |
| `/(tabs)/community` (hidden) | TSN, LBU, testimoni, event | konstanta |
| `/hadis`, `/hadis/[slug]` | 9 kitab hadis, paging, bookmark | hadis-api-id + store |
| `/bookmarks` | bookmark ayat & hadis | store |
| `/doa` | 35 doa | `DOAS` |
| `/sholat` | jadwal sholat, kiblat, masjid terdekat, aktifkan adzan | Aladhan, Overpass, expo-location |
| `/motivasi`, `/motivasi/[categoryId]`, `/motivasi/article/[id]` | 21 kategori, 44 artikel, 360 quote | konstanta |
| `/artikel` | 6 artikel "coming soon" (tidak bisa dibuka) | konstanta lokal |
| `/asisten` | chatbot "Anas" keyword-matching (22 entri KB) | `services/anasBot.ts` |
| `/kfm` | materi Kelas Financial Mindset | konstanta lokal |
| `/korda` | 14 kontak koordinator daerah (telp/WA) | `KORDA_CONTACTS` |
| `/lbu`, `/tsn`, `/kegiatan` | halaman program | `LBU_INFO`, `TSN_INFO`, `KEGIATAN` |
| `/lapak`, `/lapak/add`, `/lapak/[id]`, `/lapak/edit/[id]` | marketplace anggota (kontak via WA, tanpa transaksi) | store `products` |
| `/testimoni`, `/testimoni/add` | testimoni | `SAMPLE_TESTIMONIALS` (input user **tidak pernah tampil**) |
| `/tanya`, `/tanya/add`, `/tanya/[id]` | tanya-jawab | store `questions` |
| `/infaq` | 3 program infaq, rekening, konfirmasi WA | konstanta lokal (rekening placeholder) |
| `/social` | link sosmed + post palsu | konstanta lokal |
| `/notifications` | inbox notifikasi | 5 item hardcoded di `useState` |
| `/search` | cari quote/event/testimoni | konstanta |
| `/settings` | tema, warna, ukuran font, toggle notifikasi | store (lokal) |
| `/admin` | CMS: Users, Lapak, Events, Registrasi, Membership | store |
| `/about` | info app | statis |

## 5. Model akses (sekarang)

- **Role** (`User.role`): `super_admin` · `admin` · `sahabat` · `calon_sahabat` (default). Ditentukan dari daftar email hardcoded di `domain/auth.ts`.
- **Membership** (`User.membershipType`): `free` · `membership` · `sahabat`, plus override per user `membershipFeatures: Record<featureId, boolean>`.
- **Feature id**: `quran, hadis, motivasi, riyadhoh, event, lapak, tanya, social, community`.
- **Faktanya tidak ada screen yang mengecek feature membership** — hanya disimpan & di-toggle di admin.
- Gate yang benar-benar ada: admin panel (role admin/super_admin), add/edit event (hanya `admin` — super_admin malah ditolak), edit lapak (pemilik atau admin).
- Tamu (tanpa login) bisa membuka semua route.

## 6. Temuan penting (bug & risiko) yang relevan untuk backend

Keamanan
1. Password plaintext di AsyncStorage; super admin default `nasjak@gmail.com/Admin123` di source.
2. Role & membership ditentukan di client → wajib dipindah ke server.
3. Admin biasa bisa menurunkan/menghapus super_admin (bug cycle role di admin panel).
4. Google Maps API key ter-commit di `app.json`; file `120` (cookie jar curl) ikut ter-commit. `.history/` (VS Code Local History) juga ter-commit.

Integritas data
5. `user.id` saat login diturunkan dari email, saat register = `Date.now()` → profil (avatar, bio, kota, dll.) hilang setiap re-login.
6. `isActive` tidak dicek saat login; `removeMember` tidak menghapus akun.
7. Foto (avatar, produk, testimoni) disimpan sebagai URI file lokal `file://…` → butuh upload endpoint.
8. Event: `registered` tidak pernah bertambah; kuota hanya dicek di UI; edit sample event membuat duplikat; draft terlihat publik.
9. Home/LBU/TSN/Search/Community membaca `SAMPLE_EVENTS`, bukan event dari admin. Testimoni user tidak pernah tampil.
10. Bookmark hadis hanya simpan nomor (tanpa kitab) → bentrok antar kitab. Perlu format `slug:number`.
11. Tanggal riyadhoh pakai `toISOString()` (UTC) → checklist jam 00:00–06:59 WIB tercatat ke hari sebelumnya.
12. Beberapa `.sort()` memutasi array di dalam store.

UX/fungsi
13. Pengaturan font Quran tidak berefek (`Math.max(fontSize, 30)`); lompat ke ayat/nomor hadis diabaikan.
14. Jadwal adzan dijadwalkan sekali, tidak pernah di-refresh otomatis; reminder dzikir tiap 5 menit & istighfar tiap 10 menit (spam).
15. CTA mati: "Lupa password", Artikel, DAFTAR LBU, promo KFM, notifikasi.

Daftar lengkap data yang harus dipindah ke backend: lihat `02-data-inventory.md`. Spesifikasi API: `03-api-docs.md`.
