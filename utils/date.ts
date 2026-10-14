// Tanggal bisnis aplikasi memakai zona WIB (Asia/Jakarta), bukan UTC dari toISOString().
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** YYYY-MM-DD menurut WIB untuk tanggal tertentu (default: sekarang). */
export function wibDateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Geser tanggal YYYY-MM-DD sebanyak `days` hari. */
export function addDaysKey(dateKey: string, days: number): string {
  const value = new Date(`${dateKey}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Waktu relatif singkat dalam Bahasa Indonesia, mis. "2 jam lalu". */
export function relativeTime(value: string | Date): string {
  const time = typeof value === 'string' ? new Date(value).getTime() : value.getTime();
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
