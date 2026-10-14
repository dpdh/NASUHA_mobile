import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { NotificationSettings, PrayerLocation } from '../types';
import { getNotifications } from './nativeModules';
import { registerPushDevice } from './push';
import { readCache, writeCache } from './storage';

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

export interface NearbyMosque {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
}

interface ScheduledNotification {
  identifier: string;
  content: { data?: Record<string, unknown> };
}

const KAABA = { latitude: 21.422487, longitude: 39.826206 };
const NOTIFICATION_SOUND = 'nas_1.mp3';
const FAJR_ADHAN_SOUND = 'fajr_128_44.mp3';
const REGULAR_ADHAN_SOUND = 'mecca_56_22.mp3';
const FAJR_ADHAN_CHANNEL = 'adhan-fajr-v2';
const REGULAR_ADHAN_CHANNEL = 'adhan-regular-v1';
const REMINDER_CHANNEL = 'reminders-v2';
const TAHAJUD_CHANNEL = 'tahajud-call-v2';
export const NEARBY_MOSQUE_RADIUS_METERS = 1000;
export const DEFAULT_PRAYER_LOCATION: PrayerLocation = {
  latitude: -6.2088,
  longitude: 106.8456,
  city: 'Jakarta',
  country: 'Indonesia',
};
const PRAYER_CACHE_TTL = 6 * 60 * 60 * 1000;
const MOSQUE_CACHE_TTL = 30 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 8000;
const prayerRequests = new Map<string, Promise<PrayerTimes>>();
const mosqueRequests = new Map<string, Promise<NearbyMosque[]>>();
const PRAYER_NAMES: Array<keyof PrayerTimes> = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_LABELS: Record<string, string> = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

export async function getCurrentPrayerLocation(): Promise<PrayerLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return DEFAULT_PRAYER_LOCATION;
  }

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return DEFAULT_PRAYER_LOCATION;
  }
  let city: string | undefined;
  let country: string | undefined;
  try {
    const address = (await Location.reverseGeocodeAsync(position.coords))[0];
    city = address?.city || address?.district || address?.subregion || undefined;
    country = address?.country || undefined;
  } catch {
    // Coordinates remain usable even when reverse geocoding is unavailable.
  }

  return { latitude: position.coords.latitude, longitude: position.coords.longitude, city, country };
}

export async function fetchPrayerTimes(location: PrayerLocation, date = new Date()): Promise<PrayerTimes> {
  const dateValue = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const cacheKey = `@nasjak_prayer_${dateValue}_${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;
  const cached = await readCache<PrayerTimes>(cacheKey, PRAYER_CACHE_TTL);
  if (cached) return cached;
  const existingRequest = prayerRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${dateValue}?latitude=${location.latitude}&longitude=${location.longitude}&method=20`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error(`Jadwal shalat tidak dapat dimuat (${response.status}).`);
      const payload = await response.json();
      if (payload.code !== 200 || !payload.data?.timings) {
        throw new Error(payload.status || 'Jadwal shalat tidak tersedia.');
      }
      const times = payload.data.timings as PrayerTimes;
      await writeCache(cacheKey, times);
      return times;
    } finally {
      clearTimeout(timeout);
      prayerRequests.delete(cacheKey);
    }
  })();
  prayerRequests.set(cacheKey, request);
  return request;
}

export function getPrayerEntries(times: PrayerTimes) {
  return PRAYER_NAMES
    .filter((key) => typeof times[key] === 'string' && times[key].length > 0)
    .map((key) => ({ key, label: PRAYER_LABELS[key], time: times[key].split(' ')[0] }));
}

export function getQiblaBearing(location: PrayerLocation): number {
  const latitude = toRadians(location.latitude);
  const longitudeDelta = toRadians(KAABA.longitude - location.longitude);
  const bearing = Math.atan2(
    Math.sin(longitudeDelta),
    Math.cos(latitude) * Math.tan(toRadians(KAABA.latitude)) - Math.sin(latitude) * Math.cos(longitudeDelta),
  );
  return Math.round((toDegrees(bearing) + 360) % 360);
}

export async function fetchNearbyMosques(location: PrayerLocation): Promise<NearbyMosque[]> {
  const cacheKey = `@nasjak_mosques_${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;
  const cached = await readCache<NearbyMosque[]>(cacheKey, MOSQUE_CACHE_TTL);
  if (cached) return cached;
  const existingRequest = mosqueRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const query = `[out:json][timeout:8];(nwr[amenity=mosque](around:${NEARBY_MOSQUE_RADIUS_METERS},${location.latitude},${location.longitude});nwr[amenity=place_of_worship][religion=muslim](around:${NEARBY_MOSQUE_RADIUS_METERS},${location.latitude},${location.longitude}););out center tags;`;
    try {
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];
      let response: Response | null = null;
      let lastError = 'Masjid terdekat tidak dapat dimuat.';
      for (const endpoint of endpoints) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
        try {
          const nextResponse = await fetch(endpoint, {
            method: 'POST',
            // Overpass menolak (406) request tanpa User-Agent yang mengidentifikasi aplikasi.
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'NASUHA-App/1.0 (com.nasuha.nasjak)', Accept: 'application/json' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          if (nextResponse.ok) {
            response = nextResponse;
            break;
          }
          lastError = `Masjid terdekat tidak dapat dimuat (${nextResponse.status}).`;
        } catch (error) {
          lastError = 'Koneksi pencarian masjid tidak tersedia.';
        } finally {
          clearTimeout(timeout);
        }
      }
      if (!response) throw new Error(lastError);
      const payload = await response.json();
      const seen = new Set<string>();
      const mosques = (payload.elements || [])
    .map((element: any) => {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      const name = element.tags?.name || 'Masjid terdekat';
      const id = `${name}-${latitude}-${longitude}`;
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        name,
        latitude,
        longitude,
        distanceKm: haversineDistance(location.latitude, location.longitude, latitude, longitude),
        address: [element.tags?.['addr:street'], element.tags?.['addr:city']].filter(Boolean).join(', ') || undefined,
      } as NearbyMosque;
    })
    .filter((mosque: NearbyMosque | null): mosque is NearbyMosque => mosque !== null && mosque.distanceKm * 1000 <= NEARBY_MOSQUE_RADIUS_METERS)
    .sort((a: NearbyMosque, b: NearbyMosque) => a.distanceKm - b.distanceKm)
    .slice(0, 10);
      await writeCache(cacheKey, mosques);
      return mosques;
    } finally {
      mosqueRequests.delete(cacheKey);
    }
  })();
  mosqueRequests.set(cacheKey, request);
  return request;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(FAJR_ADHAN_CHANNEL, {
      name: 'Adzan Subuh',
      importance: Notifications.AndroidImportance.MAX,
      sound: FAJR_ADHAN_SOUND,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(REGULAR_ADHAN_CHANNEL, {
      name: 'Adzan Dzuhur, Ashar, Maghrib, Isya',
      importance: Notifications.AndroidImportance.MAX,
      sound: REGULAR_ADHAN_SOUND,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Pengingat NASUHA',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: NOTIFICATION_SOUND,
    });
    await Notifications.setNotificationChannelAsync(TAHAJUD_CHANNEL, {
      name: 'Tahajud Call',
      importance: Notifications.AndroidImportance.MAX,
      sound: NOTIFICATION_SOUND,
      vibrationPattern: [0, 500, 300, 500],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permissions = current.granted
    ? current
    : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  if (!permissions.granted) return false;

  // Izin sudah ada: daftarkan perangkat untuk push dari server (dilewati diam-diam bila FCM/EAS belum siap).
  void registerPushDevice();
  return true;
}

export async function rescheduleNotifications(times: PrayerTimes, settings: NotificationSettings): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item: ScheduledNotification) => item.content.data?.nasjakNotification === true)
      .map((item: ScheduledNotification) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  const hasEnabledNotification = Object.entries(settings)
    .some(([key, value]) => key.endsWith('Enabled') && value === true);
  if (!hasEnabledNotification) return;
  if (!(await requestNotificationPermission())) return;

  if (settings.adhanEnabled) {
    for (const key of PRAYER_NAMES) {
      const [hour, minute] = parseReminderTime(times[key]);
      if (hour === null || minute === null) continue;
      const isFajr = key === 'Fajr';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Waktu ${PRAYER_LABELS[key]}`,
          body: `Telah masuk waktu shalat ${PRAYER_LABELS[key]}. Mari tunaikan dengan khusyuk.`,
          sound: isFajr ? FAJR_ADHAN_SOUND : REGULAR_ADHAN_SOUND,
          data: { nasjakNotification: true, kind: 'adhan', prayer: key },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: isFajr ? FAJR_ADHAN_CHANNEL : REGULAR_ADHAN_CHANNEL,
        },
      });
    }
  }

  if (settings.motivationalEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Motivasi NASUHA',
        body: 'Tarik napas, lanjutkan langkahmu, dan percaya bahwa ikhtiar kecilmu hari ini berarti.',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'motivasi' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 60, repeats: true, channelId: REMINDER_CHANNEL },
    });
  }

  if (settings.riyadhohEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Riyadhoh Reminder',
        body: 'Sudahkah Anda menyelesaikan Riyadhoh hari ini? Ayo istiqamah.',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'riyadhoh' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: settings.riyadhohHour, minute: settings.riyadhohMinute, channelId: REMINDER_CHANNEL },
    });
  }

  if (settings.istighfarHourlyEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Istighfar 10 menit',
        body: 'Astaghfirullah. Ambil 10 menit untuk menyegarkan hati dan memohon ampunan Allah.',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'istighfar' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 10, repeats: true, channelId: REMINDER_CHANNEL },
    });
  }

  if (settings.dzikirReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dzikir NASUHA',
        body: 'Jangan LUpa Shalawat dan Dzikir tiada henti',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'dzikir' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 * 60, repeats: true, channelId: REMINDER_CHANNEL },
    });
  }

  if (settings.shalawatReminderEnabled) {
    const salawatTimes = [
      { hour: 8, minute: 0 },
      { hour: 13, minute: 30 },
      { hour: 20, minute: 30 },
    ];
    for (const reminder of salawatTimes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Membaca Shalawat',
          body: 'Yuk, baca shalawat untuk menambah keberkahan dan cinta kepada Rasulullah ﷺ.',
          sound: NOTIFICATION_SOUND,
          data: { nasjakNotification: true, kind: 'shalawat' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: REMINDER_CHANNEL },
      });
    }
  }

  if (settings.spiritualReminderEnabled) {
    const reminders = [
      { hour: 9, minute: 0, title: 'Jaga Mata', body: 'Jaga pandangan dan pilih apa yang membawa hati lebih dekat kepada Allah.' },
      { hour: 12, minute: 30, title: 'Jaga Lisan', body: 'Sebelum berbicara, pastikan ucapanmu benar, baik, dan bermanfaat.' },
      { hour: 15, minute: 30, title: 'Jaga Hati', body: 'Luangkan waktu untuk membersihkan hati dari iri, marah, dan prasangka.' },
      { hour: 19, minute: 30, title: 'Mendoakan Orang Tua dan Sahabat', body: 'Kirimkan doa untuk orang tua dan sahabat yang kamu sayangi.' },
      { hour: 21, minute: 0, title: 'Shalat Witir', body: 'Tunaikan shalat Witir sebelum tidur jika belum dikerjakan.' },
      { hour: 22, minute: 0, title: 'Shalat Taubat', body: 'Luangkan waktu untuk bermuhasabah dan menunaikan shalat Taubat.' },
    ];
    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, sound: NOTIFICATION_SOUND, data: { nasjakNotification: true, kind: 'riyadhoh' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: REMINDER_CHANNEL },
      });
    }
  }

  if (settings.debtReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ingat Amanah Utang',
        body: 'Ingat membayar utang sesuai kemampuan dan merespons dengan baik kepada yang kita utangi.',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'debt' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0, channelId: REMINDER_CHANNEL },
    });
  }

  if (settings.taubatReminderEnabled) {
    for (const reminder of [{ hour: 6, minute: 0 }, { hour: 13, minute: 0 }, { hour: 20, minute: 0 }]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Shalat Taubat',
          body: 'Luangkan waktu untuk shalat Taubat dan bermuhasabah.',
          sound: NOTIFICATION_SOUND,
          data: { nasjakNotification: true, kind: 'taubat' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...reminder, channelId: REMINDER_CHANNEL },
      });
    }
  }

  if (settings.dhuhaReminderEnabled) {
    for (const reminder of [{ hour: 7, minute: 0 }, { hour: 11, minute: 0 }]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Waktu Shalat Dhuha',
          body: 'Waktu Dhuha berlangsung sekitar pukul 07.00 sampai 11.30. Yuk tunaikan dengan ringan.',
          sound: NOTIFICATION_SOUND,
          data: { nasjakNotification: true, kind: 'dhuha' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...reminder, channelId: REMINDER_CHANNEL },
      });
    }
  }

  if (settings.tahajudCallEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tahajud Call',
        body: 'Ayo Tahajud... Ayo Tahajud... Ayo bangun Tahajud...',
        sound: NOTIFICATION_SOUND,
        data: { nasjakNotification: true, kind: 'tahajud' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 2, minute: 30, channelId: TAHAJUD_CHANNEL },
    });
  }
}

function parseReminderTime(value: string | undefined): [number | null, number | null] {
  if (!value) return [null, null];
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return [null, null];
  }
  return [hour, minute];
}

export function formatDistance(distanceKm: number): string {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function toRadians(value: number) { return value * Math.PI / 180; }
function toDegrees(value: number) { return value * 180 / Math.PI; }
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
