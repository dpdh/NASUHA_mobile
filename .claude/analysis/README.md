# Analisis NASUHA App → Backend

| File | Isi |
|---|---|
| [01-app-overview.md](01-app-overview.md) | Stack, cara run, peta 40+ screen, model akses, temuan bug/risiko |
| [02-data-inventory.md](02-data-inventory.md) | Semua data lokal/hardcoded dan klasifikasinya (UGC, per-user sync, CMS, tetap lokal) |
| [03-api-docs.md](03-api-docs.md) | **Spesifikasi API v1 lengkap** (konvensi, schema, ±79 endpoint app + admin) |
| [04-open-questions.md](04-open-questions.md) | Keputusan yang perlu diambil sebelum plan project backend + catatan migrasi |

Langkah berikutnya: review API docs → putuskan poin di 04 → plan project backend (skema DB, modul, urutan sesi).

## Implementasi

- Backend: `/Users/bahri/development/masdani/nasjak-backend` (Node.js + Express 5 + PostgreSQL, pola idtc-user, panel admin `/admin` Tailwind + Alpine). Lihat README di sana.
- App: lapisan API di `services/api.ts`, `services/nasjakApi.ts`, `hooks/useApiQuery.ts`; base URL `EXPO_PUBLIC_API_BASE_URL` (`.env.local`).
