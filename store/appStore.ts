import { create } from 'zustand';
import { getColors } from '../constants/theme';
import { ApiError, errorMessage, getToken, loadToken, onUnauthorized, setToken } from '../services/api';
import { authApi, contentApi, libraryApi, meApi, riyadhohApi, type ProfileInput, type UserPreferences } from '../services/nasjakApi';
import { registerPushDevice, unregisterPushDevice } from '../services/push';
import { readJson, remove, writeJson } from '../services/storage';
import type {
  AppState, ColorScheme, FeatureId, GoogleCredential, MembershipPlan, NotificationSettings, PrayerLocation, References, ThemeMode, User,
} from '../types';
import { addDaysKey, wibDateKey } from '../utils/date';

type ActionResult = { success: boolean; error?: string; field?: string };

interface AppActions {
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setUser: (user: User | null) => void;
  setOnboarded: (val: boolean) => void;
  toggleRiyadhoh: (key: string) => void;
  toggleBookmarkAyah: (key: string, label?: string) => void;
  toggleBookmarkHadith: (ref: string, label?: string) => void;
  setQuranFontSize: (size: number) => void;
  setHadithFontSize: (size: number) => void;
  setLastReadAyah: (surahId: number, ayahNumber: number) => void;
  hydrate: () => Promise<void>;
  // Auth (nasjak-backend)
  login: (identifier: string, password: string) => Promise<ActionResult>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<ActionResult>;
  /** Sign in with Google: token dari Google diverifikasi server; akun dibuat otomatis bila belum ada. */
  loginWithGoogle: (credential: GoogleCredential) => Promise<ActionResult & { isNewUser?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasFeature: (feature: FeatureId) => boolean;
  isStaff: () => boolean;
  // Profile
  updateProfile: (updates: ProfileInput) => Promise<ActionResult>;
  uploadAvatar: (uri: string) => Promise<ActionResult>;
  removeAvatar: () => Promise<ActionResult>;
  // Sinkronisasi data per-user
  syncUserData: () => Promise<void>;
  syncRiyadhoh: () => Promise<void>;
  // Konfigurasi & referensi dari server
  loadRemoteConfig: () => Promise<void>;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  setPrayerLocation: (location: PrayerLocation | null) => void;
}

const STORAGE_KEY = '@nasjak_store';
const RIYADHOH_SYNC_DAYS = 92;

// Plan default (dipakai sebelum /config termuat atau saat offline).
const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    type: 'free',
    label: 'Free Member',
    description: 'Calon Sahabat NASUHA atau Member yang belum tergabung dalam Komunitas',
    color: '#999999',
    features: [
      { id: 'quran', name: 'Al-Quran', description: 'Baca Al-Quran', icon: 'book-outline', enabled: true },
      { id: 'hadis', name: 'Hadis', description: 'Baca Hadis', icon: 'document-text-outline', enabled: true },
      { id: 'motivasi', name: 'Motivasi', description: 'Baca Motivasi', icon: 'heart-outline', enabled: true },
      { id: 'riyadhoh', name: 'Riyadhoh Tracking', description: 'Track Ibadah Harian', icon: 'checkbox-outline', enabled: false },
      { id: 'event', name: 'Event', description: 'Daftar Event', icon: 'calendar-outline', enabled: false },
      { id: 'lapak', name: 'Lapak Penjualan', description: 'Buka Lapak Jualan', icon: 'storefront-outline', enabled: false },
    ],
  },
  {
    type: 'membership',
    label: 'Membership',
    description: 'Calon Sahabat dengan fitur tambahan',
    color: '#2EC4B6',
    features: [],
  },
  {
    type: 'sahabat',
    label: 'Sahabat NASUHA',
    description: 'Full Fitur - Member Komunitas NASUHA',
    color: '#D4A853',
    features: [],
  },
];

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  adhanEnabled: true,
  motivationalEnabled: true,
  riyadhohEnabled: true,
  istighfarHourlyEnabled: true,
  dzikirReminderEnabled: true,
  shalawatReminderEnabled: true,
  spiritualReminderEnabled: true,
  debtReminderEnabled: true,
  taubatReminderEnabled: true,
  dhuhaReminderEnabled: true,
  tahajudCallEnabled: true,
  riyadhohHour: 20,
  riyadhohMinute: 0,
};

const USER_SCOPED_DEFAULTS = {
  riyadhohLogs: {} as Record<string, boolean>,
  bookmarkedAyahs: [] as string[],
  bookmarkedHadiths: [] as string[],
  lastReadAyahs: {} as Record<string, number>,
};

function failure(error: unknown): ActionResult {
  return { success: false, error: errorMessage(error), field: error instanceof ApiError ? error.field : undefined };
}

function splitLogKey(key: string): { itemId: string; date: string } | null {
  const match = key.match(/^(.+)_(\d{4}-\d{2}-\d{2})$/);
  return match ? { itemId: match[1], date: match[2] } : null;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  theme: 'light',
  colorScheme: 'mist' as ColorScheme,
  user: null,
  isOnboarded: false,
  ...USER_SCOPED_DEFAULTS,
  membershipPlans: DEFAULT_MEMBERSHIP_PLANS,
  references: null,
  quranFontSize: 16,
  hadithFontSize: 16,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  prayerLocation: null,

  setTheme: (mode) => {
    set({ theme: mode });
    persist(get());
    schedulePreferencesSync(get());
  },

  toggleTheme: () => {
    set({ theme: get().theme === 'light' ? 'dark' : 'light' });
    persist(get());
    schedulePreferencesSync(get());
  },

  setColorScheme: (scheme) => {
    set({ colorScheme: scheme });
    persist(get());
    schedulePreferencesSync(get());
  },

  setUser: (user) => {
    set({ user });
    persist(get());
  },

  setOnboarded: (val) => {
    set({ isOnboarded: val });
    persist(get());
  },

  hasFeature: (feature) => {
    const user = get().user;
    if (!user) return false;
    if (get().isStaff()) return true;
    return Boolean(user.membershipFeatures?.[feature]);
  },

  isStaff: () => {
    const user = get().user;
    return Boolean(user && (user.role === 'super_admin' || user.role === 'admin'));
  },

  // ---------------- Riyadhoh ----------------
  toggleRiyadhoh: (key) => {
    const logs = { ...get().riyadhohLogs };
    logs[key] = !logs[key];
    set({ riyadhohLogs: logs });
    persist(get());
    const parsed = splitLogKey(key);
    if (parsed && getToken() && get().hasFeature('riyadhoh')) {
      riyadhohApi.toggle(parsed.date, parsed.itemId, logs[key]).catch((error) => {
        // Gagal jaringan → tetap tersimpan lokal, disinkron ulang saat syncRiyadhoh berikutnya.
        if (!(error instanceof ApiError) || error.status !== 0) console.warn('[riyadhoh] gagal sinkron:', errorMessage(error));
      });
    }
  },

  syncRiyadhoh: async () => {
    if (!getToken() || !get().hasFeature('riyadhoh')) return;
    const today = wibDateKey();
    const from = addDaysKey(today, -RIYADHOH_SYNC_DAYS);
    const entries = Object.entries(get().riyadhohLogs)
      .map(([key, completed]) => ({ ...splitLogKey(key), completed }))
      .filter((entry): entry is { itemId: string; date: string; completed: boolean } =>
        Boolean(entry.itemId && entry.date && entry.date >= from && entry.date <= today));
    try {
      if (entries.length) await riyadhohApi.sync(entries.slice(-2000));
      const serverLogs = await riyadhohApi.logs(addDaysKey(today, -RIYADHOH_SYNC_DAYS + 1), today);
      const merged: Record<string, boolean> = {};
      for (const [date, items] of Object.entries(serverLogs)) {
        for (const itemId of items) merged[`${itemId}_${date}`] = true;
      }
      set({ riyadhohLogs: merged });
      persist(get());
    } catch (error) {
      console.warn('[riyadhoh] sinkronisasi gagal:', errorMessage(error));
    }
  },

  // ---------------- Bookmark & progres baca ----------------
  toggleBookmarkAyah: (key, label) => {
    const list = [...get().bookmarkedAyahs];
    const index = list.indexOf(key);
    const adding = index < 0;
    if (adding) list.push(key);
    else list.splice(index, 1);
    set({ bookmarkedAyahs: list });
    persist(get());
    if (getToken()) {
      (adding ? libraryApi.addBookmark('ayah', key, label) : libraryApi.removeBookmark('ayah', key)).catch(() => {});
    }
  },

  toggleBookmarkHadith: (ref, label) => {
    const list = [...get().bookmarkedHadiths];
    const index = list.indexOf(ref);
    const adding = index < 0;
    if (adding) list.push(ref);
    else list.splice(index, 1);
    set({ bookmarkedHadiths: list });
    persist(get());
    if (getToken()) {
      (adding ? libraryApi.addBookmark('hadith', ref, label) : libraryApi.removeBookmark('hadith', ref)).catch(() => {});
    }
  },

  setLastReadAyah: (surahId, ayahNumber) => {
    set({ lastReadAyahs: { ...get().lastReadAyahs, [String(surahId)]: ayahNumber } });
    persist(get());
    if (getToken()) libraryApi.saveProgress(surahId, ayahNumber).catch(() => {});
  },

  setQuranFontSize: (size) => {
    set({ quranFontSize: Math.max(12, Math.min(28, size)) });
    persist(get());
    schedulePreferencesSync(get());
  },

  setHadithFontSize: (size) => {
    set({ hadithFontSize: Math.max(12, Math.min(28, size)) });
    persist(get());
    schedulePreferencesSync(get());
  },

  syncUserData: async () => {
    if (!getToken()) return;
    const { bookmarkedAyahs, bookmarkedHadiths, lastReadAyahs } = get();
    try {
      const bookmarks = await libraryApi.syncBookmarks(bookmarkedAyahs, bookmarkedHadiths);
      const progress = Object.keys(lastReadAyahs).length
        ? await libraryApi.syncProgress(lastReadAyahs)
        : await libraryApi.progress();
      set({
        bookmarkedAyahs: bookmarks.filter((item) => item.type === 'ayah').map((item) => item.ref),
        bookmarkedHadiths: bookmarks.filter((item) => item.type === 'hadith').map((item) => item.ref),
        lastReadAyahs: progress.perSurah,
      });
      persist(get());
    } catch (error) {
      console.warn('[library] sinkronisasi gagal:', errorMessage(error));
    }
    await Promise.all([get().syncRiyadhoh(), restorePreferences()]);
    void registerPushDevice();
  },

  // ---------------- Auth ----------------
  login: async (identifier, password) => {
    const value = identifier.trim();
    if (!value || !password) return { success: false, error: 'Email/no. HP dan password harus diisi' };
    try {
      const result = await authApi.login(value, password);
      await setToken(result.token);
      set({ user: result.user });
      persist(get());
      // Tunggu sinkronisasi selesai sebelum layar berpindah: perubahan state di tengah transisi navigasi
      // memicu error mounting Fabric di Android.
      await get().syncUserData();
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  },

  register: async (name, email, password, phone) => {
    if (!name.trim()) return { success: false, error: 'Nama harus diisi', field: 'name' };
    if (!email.trim() || !email.includes('@')) return { success: false, error: 'Format email tidak valid', field: 'email' };
    if (password.length < 6) return { success: false, error: 'Password minimal 6 karakter', field: 'password' };
    try {
      const result = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone?.trim() || undefined,
      });
      await setToken(result.token);
      set({ user: result.user });
      persist(get());
      // Tunggu sinkronisasi selesai sebelum layar berpindah: perubahan state di tengah transisi navigasi
      // memicu error mounting Fabric di Android.
      await get().syncUserData();
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  },

  loginWithGoogle: async (credential) => {
    if (!credential.idToken && !credential.accessToken) return { success: false, error: 'Token Google tidak ditemukan.' };
    try {
      const result = await authApi.google(credential);
      await setToken(result.token);
      set({ user: result.user, isOnboarded: true });
      persist(get());
      await get().syncUserData();
      return { success: true, isNewUser: result.isNewUser };
    } catch (error) {
      return failure(error);
    }
  },

  logout: async () => {
    await unregisterPushDevice();
    if (getToken()) await authApi.logout().catch(() => {});
    await setToken(null);
    // Data riyadhoh/bookmark milik akun ini tidak boleh terbawa ke akun lain di perangkat yang sama.
    set({ user: null, ...USER_SCOPED_DEFAULTS });
    persist(get());
  },

  refreshUser: async () => {
    if (!getToken()) return;
    try {
      const user = await authApi.me();
      set({ user });
      persist(get());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await setToken(null);
        set({ user: null });
        persist(get());
      }
    }
  },

  // ---------------- Profil ----------------
  updateProfile: async (updates) => {
    try {
      const user = await meApi.update(updates);
      set({ user });
      persist(get());
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  },

  uploadAvatar: async (uri) => {
    try {
      const result = await meApi.uploadAvatar(uri);
      const user = get().user;
      if (user) set({ user: { ...user, avatar: result.avatar } });
      persist(get());
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  },

  removeAvatar: async () => {
    try {
      await meApi.deleteAvatar();
      const user = get().user;
      if (user) set({ user: { ...user, avatar: null } });
      persist(get());
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  },

  // ---------------- Konfigurasi server ----------------
  loadRemoteConfig: async () => {
    try {
      const [config, references] = await Promise.all([contentApi.config(), contentApi.references()]);
      set({ membershipPlans: config.membershipPlans, references: references as References });
      persist(get());
      await writeJson('@nasjak_app_config', config);
    } catch (error) {
      console.warn('[config] gagal memuat konfigurasi server:', errorMessage(error));
    }
  },

  updateNotificationSettings: (updates) => {
    set({ notificationSettings: { ...get().notificationSettings, ...updates } });
    persist(get());
    schedulePreferencesSync(get());
  },

  setPrayerLocation: (prayerLocation) => {
    set({ prayerLocation });
    persist(get());
    schedulePreferencesSync(get());
  },

  hydrate: async () => {
    try {
      // Data lama versi lokal (password plaintext) tidak dipakai lagi.
      await remove('@nasjak_accounts');
      const [data, token] = await Promise.all([readJson<Partial<AppState>>(STORAGE_KEY), loadToken()]);
      if (data) {
        set({
          theme: data.theme || 'light',
          colorScheme: data.colorScheme || 'mist',
          user: token ? data.user || null : null,
          isOnboarded: data.isOnboarded || false,
          riyadhohLogs: data.riyadhohLogs || {},
          bookmarkedAyahs: data.bookmarkedAyahs || [],
          // Format lama (nomor saja, tanpa kitab) tidak bisa dipetakan → dibuang.
          bookmarkedHadiths: (data.bookmarkedHadiths || []).filter((ref): ref is string => typeof ref === 'string' && ref.includes(':')),
          lastReadAyahs: data.lastReadAyahs || {},
          quranFontSize: data.quranFontSize || 16,
          hadithFontSize: data.hadithFontSize || 16,
          membershipPlans: data.membershipPlans?.length ? data.membershipPlans : DEFAULT_MEMBERSHIP_PLANS,
          references: data.references || null,
          notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.notificationSettings || {}) },
          prayerLocation: data.prayerLocation || null,
        });
      }
    } catch {
      // Hydration best effort.
    }
    onUnauthorized(() => {
      setToken(null);
      set({ user: null });
      persist(get());
    });
    // Sinkron server di latar belakang; app tetap bisa dipakai offline.
    get().loadRemoteConfig();
    if (getToken()) {
      get().refreshUser().then(() => get().syncUserData());
    }
  },
}));

const PREFERENCES_SYNC_DELAY_MS = 1500;
let preferencesTimer: ReturnType<typeof setTimeout> | null = null;

function preferencesOf(state: AppState): UserPreferences {
  const { theme, colorScheme, quranFontSize, hadithFontSize, notificationSettings, prayerLocation } = state;
  return { theme, colorScheme, quranFontSize, hadithFontSize, notificationSettings, prayerLocation };
}

// Pengaturan disimpan lokal sebagai sumber utama; server hanya cadangan agar ikut pindah saat login di perangkat lain.
function schedulePreferencesSync(state: AppState) {
  if (!getToken()) return;
  if (preferencesTimer) clearTimeout(preferencesTimer);
  const preferences = preferencesOf(state);
  preferencesTimer = setTimeout(() => {
    preferencesTimer = null;
    meApi.savePreferences(preferences).catch((error) => console.warn('[preferences] gagal disimpan:', errorMessage(error)));
  }, PREFERENCES_SYNC_DELAY_MS);
}

async function restorePreferences() {
  try {
    const remote = await meApi.preferences();
    const state = useAppStore.getState();
    if (!remote.updatedAt) {
      // Belum ada cadangan di server: unggah pengaturan perangkat ini.
      await meApi.savePreferences(preferencesOf(state));
      return;
    }
    useAppStore.setState({
      theme: remote.theme === 'dark' || remote.theme === 'light' ? remote.theme : state.theme,
      colorScheme: (remote.colorScheme as ColorScheme | undefined) || state.colorScheme,
      quranFontSize: typeof remote.quranFontSize === 'number' ? remote.quranFontSize : state.quranFontSize,
      hadithFontSize: typeof remote.hadithFontSize === 'number' ? remote.hadithFontSize : state.hadithFontSize,
      notificationSettings: { ...state.notificationSettings, ...(remote.notificationSettings || {}) },
      prayerLocation: remote.prayerLocation === undefined ? state.prayerLocation : remote.prayerLocation,
    });
    persist(useAppStore.getState());
  } catch (error) {
    console.warn('[preferences] sinkronisasi gagal:', errorMessage(error));
  }
}

function persist(state: AppState) {
  const {
    theme, colorScheme, user, isOnboarded, riyadhohLogs, bookmarkedAyahs, bookmarkedHadiths, lastReadAyahs,
    quranFontSize, hadithFontSize, membershipPlans, references, notificationSettings, prayerLocation,
  } = state;
  void writeJson(STORAGE_KEY, {
    theme, colorScheme, user, isOnboarded, riyadhohLogs, bookmarkedAyahs, bookmarkedHadiths, lastReadAyahs,
    quranFontSize, hadithFontSize, membershipPlans, references, notificationSettings, prayerLocation,
  });
}

export function useColors() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  return getColors(colorScheme)[theme];
}
