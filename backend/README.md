# NASJAK Backend

REST API untuk pengelolaan user, role dan fitur membership, Lapak, event, serta pendaftaran event. Server menggunakan Node.js built-in HTTP dan penyimpanan JSON atomik sehingga dapat dijalankan tanpa dependency tambahan.

## Menjalankan

Dari folder `backend`:

```sh
npm start
```

Server berjalan di `http://localhost:4000`. Atur `PORT`, `DATA_FILE`, `NODE_ENV`, `MAX_BODY_BYTES`, dan `ALLOWED_ORIGIN` melalui environment variable. Untuk production, `GOOGLE_CLIENT_ID` wajib diisi dan `ALLOWED_ORIGIN` sebaiknya dibatasi ke domain aplikasi.

Untuk development lokal, autentikasi token dev harus diaktifkan secara eksplisit:

```sh
ALLOW_DEV_AUTH=true npm start
```

Token `dev:<user-id>` hanya diterima ketika `ALLOW_DEV_AUTH=true` dan server bukan production. Jangan mengaktifkan opsi ini pada server yang dapat diakses publik.

## Autentikasi

`POST /auth/google` menerima bearer access token Google dan memverifikasinya ke Google `tokeninfo`. Identitas backend memakai claim `sub`, bukan email. Endpoint mengembalikan token sesi development hanya saat `NODE_ENV` bukan `production`.

Untuk pengujian lokal, gunakan token development `dev:<user-id>` setelah user tersedia. Token ini sengaja ditolak saat production. Operasi tulis admin selalu memeriksa role user dari data backend, bukan role dari request client.

## Endpoint

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/auth/google` | Google bearer | Login atau buat user |
| GET | `/api/users?search=` | Admin | Daftar user |
| PATCH | `/api/users/:id` | Admin | Ubah `role`, `isActive`, `membershipType`, `membershipFeatures` |
| DELETE | `/api/users/:id` | Admin | Hapus user |
| GET | `/api/lapak/products?status=` | Publik/admin | Produk approved untuk publik; admin dapat melihat semua |
| POST | `/api/lapak/products` | User | Buat produk, status awal `pending` |
| PATCH | `/api/lapak/products/:id` | Pemilik/admin | Edit produk atau moderasi status |
| DELETE | `/api/lapak/products/:id` | Pemilik/admin | Hapus produk |
| GET | `/api/events?status=` | Publik/admin | Event published untuk publik; admin dapat melihat semua |
| POST | `/api/events` | Admin | Buat event draft/published |
| PATCH | `/api/events/:id` | Admin | Edit, publish, atau cancel event |
| DELETE | `/api/events/:id` | Admin | Hapus event dan registrasinya |
| GET | `/api/event-registrations` | User/admin | Registrasi sendiri atau semua registrasi |
| POST | `/api/event-registrations` | User | Daftar event dan cek kuota |
| PATCH | `/api/event-registrations/:id` | User/admin | User membatalkan; admin konfirmasi atau batalkan |
| GET | `/health` | Publik | Health check |

Contoh header untuk endpoint terlindungi:

```http
Authorization: Bearer dev:<user-id>
Content-Type: application/json
```

Contoh membuat produk:

```json
{
  "name": "Madu Hutan 500ml",
  "category": "makanan",
  "description": "Madu asli tanpa campuran",
  "price": 150000,
  "sellerWhatsapp": "628123456789",
  "photos": ["https://example.com/madu.jpg"],
  "specs": { "condition": "Baru", "stock": 10 },
  "tags": ["halal", "best seller"]
}
```

Contoh membuat event:

```json
{
  "title": "TSN Oktober 2026",
  "type": "TSN",
  "date": "2026-10-15",
  "time": "09:00",
  "location": "Jakarta",
  "description": "Temu Sahabat NASUHA",
  "quota": 200,
  "status": "draft"
}
```

File data default adalah `backend/data.json`. File ini bersifat runtime dan sebaiknya tidak dikomit ke repository production; gunakan database PostgreSQL/MySQL pada deployment berskala besar. Penulisan JSON backend sudah diserialisasikan untuk mencegah dua perubahan bersamaan saling menimpa, tetapi database tetap disarankan untuk deployment multi-instance.
