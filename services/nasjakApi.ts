// Repository endpoint nasjak-backend. Screen & store memakai fungsi di sini, bukan fetch langsung.
import type {
  AppConfig, AppNotification, Article, ArticleSummary, Doa, Event, EventRegistration, HomeData, InfaqProgram, Korda,
  LapakProduct, LapakProductInput, MeStats, MembershipPlan, Motivasi, MotivasiCategory, NotificationSettings, PrayerLocation,
  Program, Question, Answer, References, RiyadhohDoc, RiyadhohItem, SocialLink, SocialPost, Testimonial, User, UserRole,
  MembershipType,
} from '../types';
import { api, apiRequest, uploadImage } from './api';

export interface AuthPayload {
  token: string;
  user: User;
}

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<AuthPayload>('/auth/login', { identifier, password, deviceName: 'nasjak-app' }),
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    api.post<AuthPayload>('/auth/register', { ...input, deviceName: 'nasjak-app' }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
  changePassword: (currentPassword: string, password: string) =>
    api.put<{ message: string }>('/auth/password', { currentPassword, password, passwordConfirmation: password }),
};

export interface ProfileInput {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  address?: string | null;
  gender?: 'laki-laki' | 'perempuan' | null;
  birthDate?: string | null;
  occupation?: string | null;
  nasuhaRegion?: string | null;
}

export interface UserPreferences {
  theme?: string;
  colorScheme?: string;
  quranFontSize?: number;
  hadithFontSize?: number;
  notificationSettings?: NotificationSettings;
  prayerLocation?: PrayerLocation | null;
  updatedAt?: string | null;
}

export const meApi = {
  update: (input: ProfileInput) => api.patch<User>('/me', input),
  uploadAvatar: (uri: string) => uploadImage<{ avatar: string }>('/me/avatar', uri),
  deleteAvatar: () => api.delete('/me/avatar'),
  stats: () => api.get<MeStats>('/me/stats'),
  deleteAccount: (password: string) => api.delete('/me', { password }),
  preferences: () => api.get<UserPreferences>('/me/preferences'),
  savePreferences: (input: UserPreferences) => api.put<UserPreferences>('/me/preferences', input),
  registerDevice: (expoPushToken: string, platform: string) => api.post<void>('/me/devices', { expoPushToken, platform }),
  unregisterDevice: (expoPushToken: string) => api.delete(`/me/devices/${encodeURIComponent(expoPushToken)}`),
};

export const uploadApi = {
  image: (uri: string, purpose: 'product' | 'testimonial' | 'event' | 'content') =>
    uploadImage<{ id: string; url: string; path: string }>('/uploads', uri, { purpose }),
};

export const contentApi = {
  config: () => api.get<AppConfig>('/config'),
  references: () => api.get<References>('/references'),
  membershipPlans: () => api.get<MembershipPlan[]>('/membership-plans'),
  home: () => api.get<HomeData>('/home'),
  search: (q: string) => api.get<Record<string, { id: string; title: string; subtitle: string; route: string }[]>>('/search', { q }),
  motivasiCategories: () => api.get<MotivasiCategory[]>('/motivasi/categories'),
  motivasiCategory: (id: string) =>
    api.get<MotivasiCategory & { quote: Motivasi | null; articles: ArticleSummary[] }>(`/motivasi/categories/${encodeURIComponent(id)}`),
  quotes: (query: { category?: string; random?: 1; perPage?: number } = {}) => api.get<Motivasi[]>('/quotes', query),
  dailyQuote: () => api.get<Motivasi | null>('/quotes/daily'),
  articles: (query: { categoryId?: string; section?: string; q?: string } = {}) => api.get<ArticleSummary[]>('/articles', query),
  article: (id: string) => api.get<Article>(`/articles/${encodeURIComponent(id)}`),
  doas: (query: { category?: string; debt?: boolean; q?: string } = {}) => api.get<Doa[]>('/doas', query),
  programs: (group?: 'utama' | 'kegiatan') =>
    apiRequest<Program[]>('GET', '/programs', { query: { group } }),
  program: (slug: string) => api.get<Program>(`/programs/${encodeURIComponent(slug)}`),
  kordas: () => api.get<Korda[]>('/kordas'),
  infaqPrograms: () => api.get<InfaqProgram[]>('/infaq/programs'),
  socialLinks: () => api.get<SocialLink[]>('/social/links'),
  socialPosts: (platform?: string) => api.get<SocialPost[]>('/social/posts', { platform }),
};

export const eventApi = {
  list: (query: { type?: string; from?: string; q?: string; page?: number; perPage?: number } = {}) =>
    apiRequest<Event[]>('GET', '/events', { query }),
  detail: (id: string) => api.get<Event>(`/events/${encodeURIComponent(id)}`),
  register: (id: string, input: { name: string; email: string; phone: string; city?: string; korda?: string; notes?: string }) =>
    api.post<EventRegistration>(`/events/${encodeURIComponent(id)}/registrations`, input),
  myRegistrations: (query: { status?: string; upcoming?: boolean } = {}) =>
    api.get<EventRegistration[]>('/me/event-registrations', query),
  cancelRegistration: (registrationId: string) =>
    api.post<EventRegistration>(`/event-registrations/${encodeURIComponent(registrationId)}/cancel`),
};

export const lapakApi = {
  list: (query: { category?: string; q?: string; sellerId?: string; page?: number; perPage?: number } = {}) =>
    apiRequest<LapakProduct[]>('GET', '/lapak/products', { query }),
  detail: (id: string) => api.get<LapakProduct>(`/lapak/products/${encodeURIComponent(id)}`),
  mine: () => apiRequest<LapakProduct[]>('GET', '/me/products'),
  create: (input: LapakProductInput) => api.post<LapakProduct>('/lapak/products', input),
  update: (id: string, input: LapakProductInput) => api.put<LapakProduct>(`/lapak/products/${encodeURIComponent(id)}`, input),
  remove: (id: string) => api.delete(`/lapak/products/${encodeURIComponent(id)}`),
  trackContact: (id: string) => api.post<void>(`/lapak/products/${encodeURIComponent(id)}/contact`).catch(() => undefined),
};

export const testimonialApi = {
  list: (query: { korda?: string; program?: string; page?: number; perPage?: number } = {}) =>
    apiRequest<Testimonial[]>('GET', '/testimonials', { query }),
  create: (input: { program: string; rating: number; text: string; korda?: string; photo?: string }) =>
    api.post<Testimonial>('/testimonials', input),
  mine: () => api.get<Testimonial[]>('/me/testimonials'),
};

export const questionApi = {
  list: (query: { category?: string; q?: string; mine?: boolean; page?: number; perPage?: number } = {}) =>
    apiRequest<Question[]>('GET', '/questions', { query }),
  detail: (id: string) => api.get<Question>(`/questions/${encodeURIComponent(id)}`),
  create: (input: { category: string; title: string; body: string; isAnonymous?: boolean }) => api.post<Question>('/questions', input),
  answer: (id: string, body: string) => api.post<Answer>(`/questions/${encodeURIComponent(id)}/answers`, { body }),
  remove: (id: string) => api.delete(`/questions/${encodeURIComponent(id)}`),
};

export interface RiyadhohSummary {
  today: { date: string; completed: number; total: number; percent: number };
  streak: { current: number; longest: number };
  week: { date: string; completed: number; total: number }[];
}

export const riyadhohApi = {
  items: () => api.get<{ categories: { label: string }[]; items: RiyadhohItem[]; docs: RiyadhohDoc[] }>('/riyadhoh/items'),
  logs: (from: string, to: string) => api.get<Record<string, string[]>>('/me/riyadhoh/logs', { from, to }),
  toggle: (date: string, itemId: string, completed: boolean) =>
    api.put<{ streak: number }>(`/me/riyadhoh/logs/${date}/${encodeURIComponent(itemId)}`, { completed }),
  sync: (entries: { date: string; itemId: string; completed: boolean }[]) =>
    api.post<{ applied: number; skipped: number }>('/me/riyadhoh/logs/sync', { entries }),
  summary: () => api.get<RiyadhohSummary>('/me/riyadhoh/summary'),
};

export interface BookmarkRecord {
  id: string;
  type: 'ayah' | 'hadith';
  ref: string;
  label: string | null;
  createdAt: string;
}

export const libraryApi = {
  bookmarks: () => api.get<BookmarkRecord[]>('/me/bookmarks'),
  addBookmark: (type: 'ayah' | 'hadith', ref: string, label?: string) => api.post<BookmarkRecord>('/me/bookmarks', { type, ref, label }),
  removeBookmark: (type: 'ayah' | 'hadith', ref: string) => api.delete(`/me/bookmarks/${type}/${encodeURIComponent(ref)}`),
  syncBookmarks: (ayahs: string[], hadiths: string[]) => api.post<BookmarkRecord[]>('/me/bookmarks/sync', { ayahs, hadiths }),
  progress: () => api.get<{ lastRead: { surahId: number; ayah: number } | null; perSurah: Record<string, number> }>('/me/quran/progress'),
  saveProgress: (surahId: number, ayah: number) => api.put('/me/quran/progress', { surahId, ayah }),
  syncProgress: (perSurah: Record<string, number>) =>
    api.post<{ perSurah: Record<string, number> }>('/me/quran/progress/sync', { perSurah }),
};

export const notificationApi = {
  list: (unread = false) => apiRequest<AppNotification[]>('GET', '/me/notifications', { query: { unread: unread || undefined } }),
  markRead: (id: string) => api.post<void>(`/me/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => api.post<void>('/me/notifications/read-all'),
};

// ---------------- Admin (panel admin di dalam app) ----------------
export interface AdminDashboard {
  users: { total: number; active: number; admins: number; byMembership: Record<string, number> };
  lapak: { pending: number; approved: number };
  events: { upcoming: number };
  registrations: { pending: number };
  testimonials: { pending: number };
  questions: { unanswered: number };
}

export interface EventInput {
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  description: string;
  quota: number;
  status: 'draft' | 'published' | 'cancelled';
  contactWhatsapp?: string | null;
  image?: string | null;
}

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/admin/dashboard'),
  users: (query: { q?: string; membershipType?: string; status?: string; page?: number; perPage?: number } = {}) =>
    apiRequest<User[]>('GET', '/admin/users', { query }),
  setRole: (id: string, role: UserRole) => api.patch<User>(`/admin/users/${id}/role`, { role }),
  setStatus: (id: string, isActive: boolean) => api.patch<User>(`/admin/users/${id}/status`, { isActive }),
  setMembership: (id: string, membershipType: MembershipType) => api.patch<User>(`/admin/users/${id}/membership`, { membershipType }),
  setFeatures: (id: string, features: Record<string, boolean | null>) => api.patch<User>(`/admin/users/${id}/features`, features),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  membershipPlans: () => api.get<MembershipPlan[]>('/admin/membership-plans'),
  saveMembershipPlan: (type: MembershipType, features: { id: string; enabled: boolean }[]) =>
    api.put<MembershipPlan>(`/admin/membership-plans/${type}`, { features }),
  products: (query: { status?: string; q?: string; perPage?: number } = {}) =>
    apiRequest<LapakProduct[]>('GET', '/admin/lapak/products', { query }),
  approveProduct: (id: string) => api.post<LapakProduct>(`/admin/lapak/products/${id}/approve`),
  rejectProduct: (id: string, reason?: string) => api.post<LapakProduct>(`/admin/lapak/products/${id}/reject`, { reason }),
  deleteProduct: (id: string) => api.delete(`/admin/lapak/products/${id}`),
  events: (query: { status?: string; q?: string; perPage?: number } = {}) => apiRequest<Event[]>('GET', '/admin/events', { query }),
  event: (id: string) => api.get<Event>(`/admin/events/${id}`),
  createEvent: (input: EventInput) => api.post<Event>('/admin/events', input),
  updateEvent: (id: string, input: Partial<EventInput>) => api.put<Event>(`/admin/events/${id}`, input),
  setEventStatus: (id: string, status: 'draft' | 'published' | 'cancelled') => api.patch<Event>(`/admin/events/${id}/status`, { status }),
  deleteEvent: (id: string) => api.delete(`/admin/events/${id}`),
  registrations: (query: { eventId?: string; status?: string; q?: string; perPage?: number } = {}) =>
    apiRequest<EventRegistration[]>('GET', '/admin/event-registrations', { query }),
  updateRegistration: (id: string, patch: { status?: 'registered' | 'confirmed' | 'cancelled'; attended?: boolean }) =>
    api.patch<EventRegistration>(`/admin/event-registrations/${id}`, patch),
};
