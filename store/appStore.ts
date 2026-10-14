import { create } from 'zustand';
import { ADMIN_EMAILS, getRoleForEmail, normalizePhone, SUPER_ADMIN_EMAILS } from '../domain/auth';
import { ensureDefaultSuperAdmin, loadAccounts, saveAccounts } from '../services/accountRepository';
import { readJson, writeJson } from '../services/storage';
import type { Answer, AppState, ColorScheme, Event, EventRegistration, LapakProduct, MembershipPlan, NotificationSettings, PrayerLocation, Question, ThemeMode, User, UserTestimonial } from '../types';

interface AppActions {
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setUser: (user: User | null) => void;
  setOnboarded: (val: boolean) => void;
  toggleRiyadhoh: (key: string) => void;
  toggleBookmarkAyah: (key: string) => void;
  toggleBookmarkHadith: (id: number) => void;
  setQuranFontSize: (size: number) => void;
  setHadithFontSize: (size: number) => void;
  hydrate: () => Promise<void>;
  // Auth
  login: (identifier: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser: { googleId: string; email: string; name: string; avatar?: string; backendToken?: string; membershipType?: User['membershipType']; membershipFeatures?: Record<string, boolean> }) => void;
  logout: () => void;
  // Admin
  updateMemberRole: (userId: string, role: User['role']) => void;
  toggleMemberActive: (userId: string) => void;
  removeMember: (userId: string) => void;
  // Profile
  updateProfile: (updates: Partial<User>) => void;
  // Lapak
  addProduct: (product: Omit<LapakProduct, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'sold' | 'status'>) => void;
  updateProduct: (id: string, updates: Partial<LapakProduct>) => void;
  deleteProduct: (id: string) => void;
  approveProduct: (id: string) => void;
  rejectProduct: (id: string) => void;
  addTestimonial: (t: Omit<UserTestimonial, 'id' | 'createdAt'>) => void;
  addQuestion: (q: Omit<Question, 'id' | 'createdAt' | 'answers'>) => void;
  addAnswer: (questionId: string, a: Omit<Answer, 'id' | 'createdAt' | 'questionId'>) => void;
  setLastReadAyah: (surahId: number, ayahNumber: number) => void;
  // Events
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'registered'>) => void;
  updateEvent: (id: number, updates: Partial<Event>) => void;
  deleteEvent: (id: number) => void;
  // Event Registrations
  registerEvent: (reg: Omit<EventRegistration, 'id' | 'createdAt' | 'status'>) => void;
  cancelRegistration: (id: string) => void;
  confirmRegistration: (id: string) => void;
  // Membership
  updateMembershipPlan: (type: MembershipPlan['type'], updates: Partial<MembershipPlan>) => void;
  updateUserMembership: (userId: string, membershipType: User['membershipType']) => void;
  updateUserMembershipFeature: (userId: string, featureId: string, enabled: boolean) => void;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  setPrayerLocation: (location: PrayerLocation | null) => void;
}

const STORAGE_KEY = '@nasjak_store';

// Default Membership Plans
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
    features: [
      { id: 'quran', name: 'Al-Quran', description: 'Baca Al-Quran', icon: 'book-outline', enabled: true },
      { id: 'hadis', name: 'Hadis', description: 'Baca Hadis', icon: 'document-text-outline', enabled: true },
      { id: 'motivasi', name: 'Motivasi', description: 'Baca Motivasi', icon: 'heart-outline', enabled: true },
      { id: 'riyadhoh', name: 'Riyadhoh Tracking', description: 'Track Ibadah Harian', icon: 'checkbox-outline', enabled: true },
      { id: 'event', name: 'Event', description: 'Daftar Event', icon: 'calendar-outline', enabled: true },
      { id: 'lapak', name: 'Lapak Penjualan', description: 'Buka Lapak Jualan', icon: 'storefront-outline', enabled: false },
      { id: 'tanya', name: 'Tanya Ustadz', description: 'Tanya Jawab dengan Ustadz', icon: 'help-circle-outline', enabled: true },
    ],
  },
  {
    type: 'sahabat',
    label: 'Sahabat NASUHA',
    description: 'Full Fitur - Member Komunitas NASUHA',
    color: '#D4A853',
    features: [
      { id: 'quran', name: 'Al-Quran', description: 'Baca Al-Quran', icon: 'book-outline', enabled: true },
      { id: 'hadis', name: 'Hadis', description: 'Baca Hadis', icon: 'document-text-outline', enabled: true },
      { id: 'motivasi', name: 'Motivasi', description: 'Baca Motivasi', icon: 'heart-outline', enabled: true },
      { id: 'riyadhoh', name: 'Riyadhoh Tracking', description: 'Track Ibadah Harian', icon: 'checkbox-outline', enabled: true },
      { id: 'event', name: 'Event', description: 'Daftar Event', icon: 'calendar-outline', enabled: true },
      { id: 'lapak', name: 'Lapak Penjualan', description: 'Buka Lapak Jualan', icon: 'storefront-outline', enabled: true },
      { id: 'tanya', name: 'Tanya Ustadz', description: 'Tanya Jawab dengan Ustadz', icon: 'help-circle-outline', enabled: true },
      { id: 'social', name: 'Media Sosial', description: 'Akses Media Sosial', icon: 'share-social-outline', enabled: true },
      { id: 'community', name: 'Komunitas', description: 'Akses Forum Komunitas', icon: 'people-outline', enabled: true },
    ],
  },
];

const DEFAULT_TSN_WEEKEND_EVENTS: Event[] = [
  {
    id: 26092601,
    title: 'TSN Jakarta · Weekend September',
    type: 'TSN',
    date: '2026-09-26',
    time: '08:00 - 12:00',
    location: 'Jakarta Pusat',
    description: 'Temu Solusi NASUHA untuk keluarga Jakarta: konsultasi, edukasi, dan langkah bebas utang.',
    quota: 120,
    registered: 0,
    status: 'published',
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
  },
  {
    id: 26092602,
    title: 'TSN Deborami · Weekend September',
    type: 'TSN',
    date: '2026-09-26',
    time: '13:00 - 17:00',
    location: 'Deborami Community Hall',
    description: 'Sesi Temu Solusi NASUHA bersama komunitas Deborami untuk membangun kebiasaan finansial yang sehat.',
    quota: 100,
    registered: 0,
    status: 'published',
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
  },
  {
    id: 26092603,
    title: 'TSN Tangerang · Weekend September',
    type: 'TSN',
    date: '2026-09-27',
    time: '08:00 - 12:00',
    location: 'Tangerang Selatan',
    description: 'Agenda TSN akhir pekan untuk sahabat Tangerang: konsultasi solusi utang dan pendampingan komunitas.',
    quota: 100,
    registered: 0,
    status: 'published',
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
  },
];

function mergeDefaultEvents(events: Event[]): Event[] {
  const existingIds = new Set(events.map((event) => event.id));
  return [...events, ...DEFAULT_TSN_WEEKEND_EVENTS.filter((event) => !existingIds.has(event.id))];
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  theme: 'light',
  colorScheme: 'mist' as ColorScheme,
  user: null,
  isOnboarded: false,
  riyadhohLogs: {},
  bookmarkedAyahs: [],
  bookmarkedHadiths: [],
  members: [],
  products: [],
  testimonials: [],
  questions: [],
  membershipPlans: DEFAULT_MEMBERSHIP_PLANS,
  lastReadAyahs: {},
  events: [],
  eventRegistrations: [],
  quranFontSize: 16,
  hadithFontSize: 16,
  notificationSettings: {
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
  },
  prayerLocation: null,

  setTheme: (mode) => {
    set({ theme: mode });
    persist(get());
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    persist(get());
  },

  setColorScheme: (scheme) => {
    set({ colorScheme: scheme });
    persist(get());
  },

  setUser: (user) => {
    set({ user });
    persist(get());
  },

  setOnboarded: (val) => {
    set({ isOnboarded: val });
    persist(get());
  },

  toggleRiyadhoh: (key) => {
    const logs = { ...get().riyadhohLogs };
    logs[key] = !logs[key];
    set({ riyadhohLogs: logs });
    persist(get());
  },

  toggleBookmarkAyah: (key) => {
    const arr = [...get().bookmarkedAyahs];
    const idx = arr.indexOf(key);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(key);
    set({ bookmarkedAyahs: arr });
    persist(get());
  },

  toggleBookmarkHadith: (id) => {
    const arr = [...get().bookmarkedHadiths];
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    set({ bookmarkedHadiths: arr });
    persist(get());
  },

  setQuranFontSize: (size) => {
    set({ quranFontSize: Math.max(12, Math.min(28, size)) });
    persist(get());
  },

  setHadithFontSize: (size) => {
    set({ hadithFontSize: Math.max(12, Math.min(28, size)) });
    persist(get());
  },

  login: async (identifier, password) => {
    const value = identifier.trim();
    if (!value || !password) return { success: false, error: 'Email/no. HP dan password harus diisi' };

    const isPhone = !value.includes('@');
    const normalizedPhone = isPhone ? normalizePhone(value) : '';
    const accounts = await loadAccounts();
    const account = accounts.find((candidate) => {
      if (isPhone) return candidate.phone && normalizePhone(candidate.phone) === normalizedPhone;
      return candidate.email.toLowerCase() === value.toLowerCase();
    });
    if (!account) return { success: false, error: isPhone ? 'No. HP belum terdaftar. Silakan daftar terlebih dahulu.' : 'Email belum terdaftar. Silakan daftar terlebih dahulu.' };
    if (account.password !== password) return { success: false, error: 'Password salah' };

    const trimEmail = account.email.toLowerCase();
    const role = getRoleForEmail(trimEmail);
    const isManagedRole = role === 'super_admin' || role === 'admin' || role === 'sahabat';

    const user: User = {
      id: trimEmail.replace(/[^a-z0-9]/g, '_'),
      email: trimEmail,
      name: account.name || trimEmail.split('@')[0],
      phone: account.phone,
      role,
      joinDate: new Date().toISOString(),
      isActive: true,
      membershipType: role === 'sahabat' ? 'sahabat' : 'free',
    };

    // Add to members if not already there
    const members = [...get().members];
    if (!members.find((m) => m.email === trimEmail)) {
      members.push(user);
    } else {
      const idx = members.findIndex((m) => m.email === trimEmail);
      if (idx >= 0) {
        user.name = members[idx].name || account.name;
        user.phone = members[idx].phone || account.phone;
        user.role = isManagedRole ? role : members[idx].role;
        user.joinDate = members[idx].joinDate;
        user.membershipType = role === 'sahabat' ? 'sahabat' : members[idx].membershipType || 'free';
        user.membershipFeatures = members[idx].membershipFeatures;
      }
    }

    set({ user, members });
    persist(get());
    return { success: true };
  },

  register: async (name, email, password, phone) => {
    const trimEmail = email.trim().toLowerCase();
    const trimName = name.trim();
    const trimPhone = phone?.trim() ? normalizePhone(phone) : undefined;
    if (!trimName) return { success: false, error: 'Nama harus diisi' };
    if (!trimEmail || !trimEmail.includes('@')) return { success: false, error: 'Format email tidak valid' };
    if (password.length < 6) return { success: false, error: 'Password minimal 6 karakter' };

    const members = [...get().members];
    if (members.find((m) => m.email === trimEmail)) {
      return { success: false, error: 'Email sudah terdaftar. Silakan login.' };
    }
    if (trimPhone && members.some((m) => m.phone && normalizePhone(m.phone) === trimPhone)) {
      return { success: false, error: 'No. HP sudah terdaftar. Silakan login.' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: trimEmail,
      name: trimName,
      authProvider: 'password',
      phone: trimPhone,
      role: getRoleForEmail(trimEmail),
      joinDate: new Date().toISOString(),
      isActive: true,
      membershipType: 'free',
    };

    members.push(newUser);

    // Save account with password
    const accounts = await loadAccounts();
    accounts.push({ email: trimEmail, password, name: trimName, phone: trimPhone, createdAt: newUser.joinDate });
    await saveAccounts(accounts);

    set({ user: newUser, members, isOnboarded: true });
    persist(get());
    return { success: true };
  },

  loginWithGoogle: (googleUser) => {
    const trimEmail = googleUser.email.trim().toLowerCase();
    const assignedRole = getRoleForEmail(trimEmail);
    const isPrivileged = assignedRole === 'super_admin' || assignedRole === 'admin';
    const members = [...get().members];
    const existing = members.find((m) => m.email === trimEmail);

    const user: User = existing
      ? { ...existing, avatar: googleUser.avatar || existing.avatar, backendToken: googleUser.backendToken || existing.backendToken, membershipType: googleUser.membershipType || existing.membershipType, membershipFeatures: googleUser.membershipFeatures || existing.membershipFeatures, role: isPrivileged ? assignedRole : existing.role }
      : {
          id: trimEmail.replace(/[^a-z0-9]/g, '_'),
          email: trimEmail,
          name: googleUser.name,
          googleId: googleUser.googleId,
          backendToken: googleUser.backendToken,
          authProvider: 'google',
          avatar: googleUser.avatar,
          membershipType: googleUser.membershipType || 'free',
          membershipFeatures: googleUser.membershipFeatures,
          role: assignedRole,
          joinDate: new Date().toISOString(),
          isActive: true,
        };

    const normalizedUser = { ...user, googleId: googleUser.googleId || user.googleId, backendToken: googleUser.backendToken || user.backendToken, authProvider: 'google' as const, membershipType: googleUser.membershipType || user.membershipType || 'free', membershipFeatures: googleUser.membershipFeatures || user.membershipFeatures };
    if (!existing) members.push(normalizedUser);
    else {
      const idx = members.findIndex((m) => m.email === trimEmail);
      if (idx >= 0) members[idx] = normalizedUser;
    }

    set({ user: normalizedUser, members });
    persist(get());
  },

  logout: () => {
    set({ user: null });
    persist(get());
  },

  updateMemberRole: (userId, role) => {
    const members = get().members.map((m) =>
      m.id === userId ? { ...m, role } : m,
    );
    set({ members });
    persist(get());
  },

  toggleMemberActive: (userId) => {
    const members = get().members.map((m) =>
      m.id === userId ? { ...m, isActive: !m.isActive } : m,
    );
    set({ members });
    persist(get());
  },

  removeMember: (userId) => {
    const members = get().members.filter((m) => m.id !== userId);
    set({ members });
    persist(get());
  },

  updateProfile: (updates) => {
    const user = get().user;
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    const members = get().members.map((m) =>
      m.id === user.id ? { ...m, ...updates } : m,
    );
    set({ user: updatedUser, members });
    persist(get());
    if (updates.name || updates.phone) {
      loadAccounts().then((accounts) => {
        const acc = accounts.find((a) => a.email === user.email);
        if (acc) {
          if (updates.name) acc.name = updates.name;
          if (updates.phone) acc.phone = updates.phone;
          saveAccounts(accounts);
        }
      });
    }
  },

  addProduct: (product) => {
    const now = new Date().toISOString();
    const newProduct: LapakProduct = {
      ...product,
      id: `prod_${Date.now()}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      rating: 0,
      sold: 0,
    };
    const products = [...get().products, newProduct];
    set({ products });
    persist(get());
  },

  updateProduct: (id, updates) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
    );
    set({ products });
    persist(get());
  },

  deleteProduct: (id) => {
    const products = get().products.filter((p) => p.id !== id);
    set({ products });
    persist(get());
  },

  approveProduct: (id) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, status: 'approved' as const, updatedAt: new Date().toISOString() } : p,
    );
    set({ products });
    persist(get());
  },

  rejectProduct: (id) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, status: 'rejected' as const, updatedAt: new Date().toISOString() } : p,
    );
    set({ products });
    persist(get());
  },

  addTestimonial: (t) => {
    const newT: UserTestimonial = { ...t, id: `testi_${Date.now()}`, createdAt: new Date().toISOString() };
    set({ testimonials: [...get().testimonials, newT] });
    persist(get());
  },

  addQuestion: (q) => {
    const newQ: Question = { ...q, id: `q_${Date.now()}`, answers: [], createdAt: new Date().toISOString() };
    set({ questions: [...get().questions, newQ] });
    persist(get());
  },

  addAnswer: (questionId, a) => {
    const newA: Answer = { ...a, id: `a_${Date.now()}`, questionId, createdAt: new Date().toISOString() };
    const questions = get().questions.map((q) =>
      q.id === questionId ? { ...q, answers: [...q.answers, newA] } : q,
    );
    set({ questions });
    persist(get());
  },

  setLastReadAyah: (surahId, ayahNumber) => {
    const lastReadAyahs = { ...get().lastReadAyahs, [String(surahId)]: ayahNumber };
    set({ lastReadAyahs });
    persist(get());
  },

  addEvent: (event) => {
    const now = new Date().toISOString();
    const newEvent: Event = {
      ...event,
      id: Date.now(),
      registered: 0,
      createdAt: now,
      updatedAt: now,
    };
    set({ events: [...get().events, newEvent] });
    persist(get());
  },

  updateEvent: (id, updates) => {
    const events = get().events.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e,
    );
    set({ events });
    persist(get());
  },

  deleteEvent: (id) => {
    const events = get().events.filter((e) => e.id !== id);
    set({ events });
    persist(get());
  },

  registerEvent: (reg) => {
    const newReg: EventRegistration = {
      ...reg,
      id: `reg_${Date.now()}`,
      status: 'registered',
      createdAt: new Date().toISOString(),
    };
    set({ eventRegistrations: [...get().eventRegistrations, newReg] });
    persist(get());
  },

  cancelRegistration: (id) => {
    const eventRegistrations = get().eventRegistrations.map((r) =>
      r.id === id ? { ...r, status: 'cancelled' as const } : r,
    );
    set({ eventRegistrations });
    persist(get());
  },

  confirmRegistration: (id) => {
    const eventRegistrations = get().eventRegistrations.map((r) =>
      r.id === id ? { ...r, status: 'confirmed' as const } : r,
    );
    set({ eventRegistrations });
    persist(get());
  },

  updateMembershipPlan: (type, updates) => {
    const membershipPlans = get().membershipPlans.map((plan) =>
      plan.type === type ? { ...plan, ...updates, updatedAt: new Date().toISOString() } : plan,
    );
    set({ membershipPlans });
    persist(get());
  },

  updateUserMembership: (userId, membershipType) => {
    const members = get().members.map((m) =>
      m.id === userId ? { ...m, membershipType } : m,
    );
    set({ members });
    persist(get());
    
    // Update current user if it's the logged in user
    const user = get().user;
    if (user?.id === userId) {
      set({ user: { ...user, membershipType } });
    }
  },

  updateUserMembershipFeature: (userId, featureId, enabled) => {
    const members = get().members.map((member) =>
      member.id === userId
        ? { ...member, membershipFeatures: { ...member.membershipFeatures, [featureId]: enabled } }
        : member,
    );
    const user = get().user;
    set({
      members,
      user: user?.id === userId
        ? { ...user, membershipFeatures: { ...user.membershipFeatures, [featureId]: enabled } }
        : user,
    });
    persist(get());
  },

  updateNotificationSettings: (updates) => {
    const notificationSettings = { ...get().notificationSettings, ...updates };
    set({ notificationSettings });
    persist(get());
  },

  setPrayerLocation: (prayerLocation) => {
    set({ prayerLocation });
    persist(get());
  },

  hydrate: async () => {
    try {
      await ensureDefaultSuperAdmin();
      const data = await readJson<Partial<AppState>>(STORAGE_KEY);
      if (data) {
        set({
          theme: data.theme || 'light',
          colorScheme: data.colorScheme || 'mist',
          user: data.user || null,
          isOnboarded: Boolean(data.user || data.isOnboarded),
          riyadhohLogs: data.riyadhohLogs || {},
          bookmarkedAyahs: data.bookmarkedAyahs || [],
          bookmarkedHadiths: data.bookmarkedHadiths || [],
          members: data.members || [],
          products: data.products || [],
          testimonials: data.testimonials || [],
          questions: data.questions || [],
          lastReadAyahs: data.lastReadAyahs || {},
          events: mergeDefaultEvents(data.events || []),
          eventRegistrations: data.eventRegistrations || [],
          quranFontSize: data.quranFontSize || 16,
          hadithFontSize: data.hadithFontSize || 16,
          membershipPlans: data.membershipPlans || DEFAULT_MEMBERSHIP_PLANS,
          notificationSettings: {
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
            ...(data.notificationSettings || {}),
          },
          prayerLocation: data.prayerLocation || null,
        });
      }
    } catch {}
  },
}));

function persist(state: AppState) {
  const { theme, colorScheme, user, isOnboarded, riyadhohLogs, bookmarkedAyahs, bookmarkedHadiths, members, products, testimonials, questions, lastReadAyahs, events, eventRegistrations, quranFontSize, hadithFontSize, membershipPlans, notificationSettings, prayerLocation } = state;
  void writeJson(STORAGE_KEY, { theme, colorScheme, user, isOnboarded, riyadhohLogs, bookmarkedAyahs, bookmarkedHadiths, members, products, testimonials, questions, lastReadAyahs, events, eventRegistrations, quranFontSize, hadithFontSize, membershipPlans, notificationSettings, prayerLocation });
}

export { ADMIN_EMAILS, SUPER_ADMIN_EMAILS };

    import { getColors } from '../constants/theme';
export function useColors() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  return getColors(colorScheme)[theme];
}
