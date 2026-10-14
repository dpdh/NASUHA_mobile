# NASUHA Apps

Aplikasi mobile all-in-one untuk umat Muslim: ibadah harian, belajar Al-Qur'an & Hadis, event komunitas, hingga kesehatan finansial — dibangun dengan **Expo SDK 57** + **React Native** + **TypeScript**.

> Repo: <https://github.com/dpdh/NASUHA-Apps>

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Arsitektur](#arsitektur)
- [Struktur Repositori](#struktur-repositori)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Backend (REST API)](#backend-rest-api)
- [Build & Rilis (EAS)](#build--rilis-eas)
- [Linting & Kualitas Kode](#linting--kualitas-kode)
- [Panduan Pengembangan](#panduan-pengembangan)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang

**NASUHA** (slug `nasjak-app`, bundle ID `com.nasuha.nasjak`) adalah super-app komunitas muslim yang menggabungkan:

1. **Ibadah harian** — jadwal shalat, pengingat/adzan, Al-Qur'an lengkap dengan audio, hadis, doa harian, checklist riyadhoh.
2. **Komunitas & belajar** — event, Temu Solusi Nasuha (TSN), grup ibadah, kajian, kisah nabi, motivasi, testimoni.
3. **Ekonomi umat** — Lapak (marketplace), infaq/zakat, dan Langkah Bebas Utang (LBU).
4. **Admin & pengelolaan** — dashboard admin (mobile) dan admin-web, manajemen user/role/membership.

Tersedia untuk **Android**, **iOS**, dan **Web**, dengan mode gelap/terang serta pilihan tema warna (Mist, Ocean, Emerald, dll).

## Fitur

### Utama (Bottom Tab)

| Tab | Deskripsi |
| --- | --- |
| **Home** | Dashboard harian: ringkasan ibadah, jadwal shalat, konten motivasi, akses cepat fitur |
| **Belajar** | Al-Qur'an (surah, audio murottal, bookmark), Hadis, Doa, Kisah Nabi, Artikel, Buku, Kajian |
| **Riyadhoh** | Checklist ibadah harian (puasa, shalat sunnah, dzikir, tilawah) dengan progres |
| **Event** | Daftar event & TSN (Temu Solusi Nasuha), pendaftaran, kuota, grup ibadah |
| **Profil** | Profil pengguna, pengaturan tema/notifikasi, keanggotaan, infaq & LBU |

### Lainnya

- **Shalat & Kiblat** — jadwal shalat berbasis lokasi (`expo-location`), notifikasi adzan, arah kiblat, masjid terdekat (`expo-maps` + Google Maps).
- **Al-Qur'an & Audio** — pemutar audio latar (`expo-audio`, background playback), pengaturan font/tajwid.
- **Auth** — login/register + **Sign in with Google** (`expo-auth-session`, multi client ID web/Android/iOS).
- **Notifikasi** — push & local notification channel `reminders` dengan suara adzan kustom (`assets/adhan.mp3`, `assets/nas_1.mp3`).
- **Lapak** — marketplace produk UMKM: buat/edit produk, moderasi status, detail produk.
- **Infaq & LBU** — catatan infaq/zakat dan program Langkah Bebas Utang (termasuk pelunasan hutang).
- **Games & Kisah** — mini games edukatif (`constants/games.ts`) dan kisah (`constants/kisah.ts`, `kisah-nabi.ts`).
- **Asisten** — asisten AI/bantuan (`app/asisten`, `services/anasBot.ts`).
- **Notification Center, Search Global, Bookmarks, Testimoni, Motivasi, Social feed**.
- **Admin Dashboard** — modul `app/admin` (mobile) dan `app/admin-web` untuk user, role, membership, Lapak, dan event.
- **Onboarding** — layar perkenalan awal untuk pengguna baru.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), React Native 0.86, React 19.2 |
| Bahasa | TypeScript ~6.0 |
| Navigasi | Expo Router ~57 (typed routes, file-based routing) |
| State | Zustand ~5 (`store/appStore.ts`) |
| Penyimpanan | `@react-native-async-storage/async-storage` (lewat `services/storage.ts`) |
| Audio / Media | `expo-audio`, `expo-asset`, `expo-image-picker` |
| Lokasi / Peta | `expo-location`, `expo-maps` (Google Maps API key di `app.json`) |
| Notifikasi | `expo-notifications` |
| Auth | `expo-auth-session`, `expo-web-browser`, `expo-crypto` |
| UI | `@expo/vector-icons`, `expo-blur`, `expo-linear-gradient`, `react-native-reanimated`, `react-native-gesture-handler` |
| Hybrid | Capacitor 8 (opsional) |
| Backend | Node.js built-in HTTP (tanpa dependency), penyimpanan JSON atomik |
| Build/Rilis | EAS Build & EAS Submit (`eas.json`) |
| Lint | ESLint 9 + `eslint-config-expo` |

> **Catatan AGENTS.md:** Expo sudah berubah — baca dokumentasi versi 57 di <https://docs.expo.dev/versions/v57.0.0/> sebelum menulis kode.

## Arsitektur

Detail lengkap ada di [`ARCHITECTURE.md`](./ARCHITECTURE.md). Ringkasan arsitektur berlapis (dependensi mengarah ke dalam):

```
app/         → Presentasi & navigasi (Expo Router). Screen membaca state & dispatch aksi.
store/       → State aplikasi & orkestrasi (Zustand). Tidak boleh import React component/router.
services/    → Batas data & infrastruktur: API client, repository, storage, cache, native module.
constants/   → Data domain & tema (independen dari Expo/React/Zustand bila memungkinkan).
types/       → Kontrak tipe domain.
components/  → Komponen presentasi reusable tanpa persistensi/routing.
backend/     → REST API Node.js (user, role, Lapak, event, registrasi).
```

Aturan penting:

1. `services/storage.ts` adalah **satu-satunya** boundary untuk persistensi JSON & cache TTL.
2. `services/accountRepository.ts` memiliki record akun yang dipersistensikan.
3. `services/quranApi.ts` & `services/hadisApi.ts` memiliki akses API remote + cache.
4. `store/appStore.ts` memiliki transisi state dan mendelegasikan persistensi ke repository.
5. Keputusan routing tetap di layout/screen Expo Router; aksi persistensi tidak boleh import `router`.

## Struktur Repositori

```
nasjak-app/
├── app/                    # Screens & routing (Expo Router)
│   ├── (auth)/             #   Login, register
│   ├── (tabs)/             #   Home, Belajar, Riyadhoh, Event, Profil
│   ├── admin/              #   Dashboard admin (mobile)
│   ├── admin-web.tsx       #   Admin web view
│   ├── asisten/ buku/ debt-repayment/ doa/ games/ grup-ibadah/
│   ├── event/ infaq/ kisah/ lapak/ quran/ sholat/ tsn/ ...
│   ├── onboarding.tsx settings/ profile/ search/ notifications/
│   └── _layout.tsx         #   Root layout
├── components/             # Komponen reusable
├── constants/              # Data domain: data.ts, doa.ts, games.ts, kisah*.ts, theme.ts
├── domain/                 # Logika domain (auth, dll.)
├── services/               # Storage, API, repository, playback, notifikasi, googleAuth
├── store/appStore.ts       # Zustand store
├── types/                  # Kontrak tipe TypeScript
├── backend/                # REST API Node.js (lihat backend/README.md)
├── assets/                 # Ikon, splash, audio adzan, gambar
├── app.json / app.config.js# Konfigurasi Expo
├── eas.json                # Konfigurasi EAS Build & Submit
├── ARCHITECTURE.md         # Dokumentasi arsitektur
└── package.json
```

## Prasyarat

- **Node.js** 20+ (disarankan LTS terbaru) dan npm
- **Git**
- **Expo CLI** — otomatis via `npx expo`, atau global: `npm install -g expo-cli`
- Untuk build native:
  - **Android Studio** (SDK Android) untuk `expo run:android`
  - **Xcode** (macOS) untuk `expo run:ios`
  - Akun [Expo](https://expo.dev/) untuk EAS Build
- Untuk Google Sign-In: OAuth Client ID dari [Google Cloud Console](https://console.cloud.google.com/)

## Instalasi

```sh
# 1. Clone repository
git clone https://github.com/dpdh/NASUHA-Apps.git
cd NASUHA-Apps

# 2. Install dependency
npm install
# atau
yarn install

# 3. Siapkan file environment
cp .env.example .env
# lalu isi nilai-nilainya (lihat bagian Konfigurasi Environment)
```

## Konfigurasi Environment

Salin `.env.example` ke `.env` lalu isi:

```env
# Google OAuth client ID (public client ID, bukan rahasia)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# Opsional: backend endpoint untuk sinkronisasi profil Google
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
EXPO_PUBLIC_USER_PROVIDER=api
```

> ⚠️ **Keamanan:**
>
> - Jangan letakkan password Gmail, OAuth client secret, atau JSON service account Play Console di `.env` aplikasi.
> - File `.env` **tidak boleh** dikomit ke repository (sudah masuk daftar abaikan).
> - EAS Submit memakai service account Play Console yang disimpan di **EAS Secrets**, bukan di app.
> - API key Google Maps ada di `app.json` — pastikan dibatasi restriction di Google Cloud Console.

## Menjalankan Aplikasi

```sh
npm start          # Expo dev server (QR code / Metro bundler)
npm run android    # expo run:android (build native lokal)
npm run ios        # expo run:ios (build native lokal, macOS)
npm run web        # expo start --web
```


## Backend (REST API)

Folder `backend/` berisi REST API tanpa dependency eksternal (Node.js HTTP + penyimpanan JSON atomik).

```sh
cd backend
npm start                       # server di http://localhost:4000

# Development lokal dengan token dev:
ALLOW_DEV_AUTH=true npm start   # token dev:<user-id> (JANGAN di production)
```

Konfigurasi via environment variable: `PORT`, `DATA_FILE`, `NODE_ENV`, `MAX_BODY_BYTES`, `ALLOWED_ORIGIN`, `GOOGLE_CLIENT_ID`.

Endpoint utama: `POST /auth/google`, `GET|PATCH|DELETE /api/users`, `/api/lapak/products`, `/api/events`, `/api/event-registrations`, `GET /health`.

Contoh header:

```http
Authorization: Bearer dev:<user-id>
Content-Type: application/json
```

Dokumentasi lengkap endpoint & payload: [`backend/README.md`](./backend/README.md) · kontrak provider: [`backend/USER_PROVIDER_CONTRACT.md`](./backend/USER_PROVIDER_CONTRACT.md).

## Build & Rilis (EAS)

Konfigurasi ada di `eas.json`:

```sh
npm install -g eas-cli
eas login

# Build
eas build --profile development --platform android   # dev client
eas build --profile preview --platform android       # APK internal
eas build --profile production --platform android    # AAB (autoIncrement)
eas build --profile production --platform ios

# Submit ke Google Play (track internal)
eas submit --profile production --platform android
```

Panduan tambahan: [`GOOGLE_PLAY_STORE_SETUP.md`](./GOOGLE_PLAY_STORE_SETUP.md).

## Linting & Kualitas Kode

```sh
npm run lint      # eslint via expo lint
```

## Panduan Pengembangan

1. **Baca dokumentasi Expo versi 57** sebelum menulis kode: <https://docs.expo.dev/versions/v57.0.0/>
2. Ikuti aturan lapisan di [Arsitektur](#arsitektur) — jangan akses AsyncStorage langsung dari screen.
3. Sebelum menambah logika persistensi/API di screen, ekstrak dulu ke `services/` (repository/API client).
4. Simpan data domain statis di `constants/`, tipe di `types/`.
5. Commit message yang jelas; jangan komit `.env`, `backend/data.json`, `node_modules/`, `dist/`, `.expo/`.

## Kontribusi

1. Fork repository dan buat branch fitur: `git checkout -b fitur/nama-fitur`
2. Pastikan `npm run lint` lolos
3. Buka Pull Request dengan deskripsi perubahan yang jelas

## Lisensi

MIT — lihat [`LICENSE`](./LICENSE).

---

<sub>Dibuat untuk komunitas NASUHA · <https://github.com/dpdh/NASUHA-Apps></sub>


