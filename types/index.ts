export type UserRole = 'super_admin' | 'admin' | 'ustadz' | 'sahabat' | 'calon_sahabat';
export type MembershipType = 'free' | 'membership' | 'sahabat';
export type FeatureId = 'quran' | 'hadis' | 'motivasi' | 'riyadhoh' | 'event' | 'lapak' | 'tanya' | 'social' | 'community';

export interface User {
  id: string;
  email: string;
  name: string;
  authProvider?: 'password' | 'google';
  /** false untuk akun yang daftar lewat Google dan belum membuat password. */
  hasPassword?: boolean;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  roles?: UserRole[];
  joinDate: string;
  isActive: boolean;
  status?: 'pending' | 'active' | 'suspended';
  memberNumber?: string | null;
  mustChangePassword?: boolean;
  // Extended profile
  bio?: string | null;
  city?: string | null;
  address?: string | null;
  gender?: 'laki-laki' | 'perempuan' | null;
  birthDate?: string | null;
  occupation?: string | null;
  /** id korda (slug), mis. "jakarta" */
  nasuhaRegion?: string | null;
  lbuBatch?: number | null;
  // Membership
  membershipType?: MembershipType;
  membershipFeatures?: Record<string, boolean>;
  featureOverrides?: Record<string, boolean>;
}

/** Token hasil Sign in with Google; diverifikasi server (idToken diutamakan). */
export interface GoogleCredential {
  idToken?: string;
  accessToken?: string;
}

export interface QuranSurah {
  id: number;
  name: string;
  arabic: string;
  ayahCount: number;
  type: 'Makkiyah' | 'Madaniyah';
  meaning: string;
}

export interface QuranAyah {
  surahId: number;
  ayahNumber: number;
  arabic: string;
  latin: string;
  translation: string;
  audioUrl?: string;
}

export interface HadithCollection {
  id: string;
  name: string;
  arabic: string;
  totalHadith: number;
  author: string;
}

export interface Hadith {
  id: number;
  collection: string;
  number: number;
  arabic: string;
  translation: string;
  narrator: string;
  grade: string;
}

export interface RiyadhohItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  rakaat?: number | null;
}

export interface RiyadhohDoc {
  id: string;
  title: string;
  body: string;
}

export interface PrayerLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface NotificationSettings {
  adhanEnabled: boolean;
  motivationalEnabled: boolean;
  riyadhohEnabled: boolean;
  istighfarHourlyEnabled: boolean;
  dzikirReminderEnabled: boolean;
  shalawatReminderEnabled: boolean;
  spiritualReminderEnabled: boolean;
  debtReminderEnabled: boolean;
  taubatReminderEnabled: boolean;
  dhuhaReminderEnabled: boolean;
  tahajudCallEnabled: boolean;
  riyadhohHour: number;
  riyadhohMinute: number;
}

export interface Motivasi {
  id: number | string;
  text: string;
  author: string;
  category: string;
}

export interface Testimonial {
  id: string;
  userId?: string | null;
  user?: { id: string; name: string; avatar: string | null } | null;
  name: string;
  avatar: string | null;
  korda?: string | null;
  kordaLabel?: string | null;
  text: string;
  program: string;
  rating: number;
  photo?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  date: string;
  createdAt?: string;
}

export interface EventRegistrationRef {
  id: string;
  status: 'registered' | 'confirmed';
}

export interface Event {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  description: string;
  quota: number;
  registered: number;
  remaining?: number;
  isFull?: boolean;
  status?: 'draft' | 'published' | 'cancelled';
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  image?: string | null;
  contactWhatsapp?: string | null;
  myRegistration?: EventRegistrationRef | null;
}

export interface LapakProduct {
  id: string;
  seller?: { id: string; name: string; city: string | null; avatar: string | null };
  sellerId: string;
  sellerName: string;
  sellerCity: string;
  sellerWhatsapp: string;
  name: string;
  category: string;
  description: string;
  price: number;
  photos: string[];
  specs: {
    weight?: string;
    condition?: 'Baru' | 'Bekas';
    stock?: number;
    minOrder?: number;
    variant?: string;
    shippingFrom?: string;
  };
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  rating: number;
  sold: number;
}

export interface LapakProductInput {
  name: string;
  category: string;
  description: string;
  price: number;
  photos: string[];
  sellerWhatsapp: string;
  specs: LapakProduct['specs'];
  tags: string[];
}

export interface Question {
  id: string;
  userId: string | null;
  userName: string;
  userAvatar?: string | null;
  isMine?: boolean;
  category: string;
  title: string;
  body: string;
  isAnonymous?: boolean;
  status?: 'open' | 'closed';
  answersCount: number;
  hasOfficialAnswer?: boolean;
  answers?: Answer[];
  createdAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string | null;
  userName: string;
  userAvatar?: string | null;
  isOfficial?: boolean;
  body: string;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'mist' | 'ocean' | 'emerald' | 'royal' | 'sunset' | 'rose';

export interface MembershipFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface MembershipPlan {
  type: MembershipType;
  label: string;
  description: string;
  features: MembershipFeature[];
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  event?: { id: string; title: string; type: string; date: string; time: string; location: string; status?: string };
  userId: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  userCity?: string | null;
  korda?: string | null;
  notes?: string | null;
  status: 'registered' | 'confirmed' | 'cancelled';
  attended?: boolean;
  createdAt: string;
}

export interface Korda {
  id: string;
  label: string;
  region: string;
  ketua?: string;
  phone?: string;
  icon?: string;
  sortOrder?: number;
}

export interface References {
  kordas: Korda[];
  eventTypes: { id: string; label: string; color: string | null }[];
  lapakCategories: { id: string; label: string; icon: string | null }[];
  questionCategories: string[];
  testimonialPrograms: string[];
  doaCategories: string[];
  infaqNominals: number[];
}

export interface MotivasiCategory {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  quoteTags?: string[];
  articlesCount?: number;
}

export interface ArticleSummary {
  id: string;
  legacyId?: number | null;
  section?: 'motivasi' | 'artikel';
  categoryId: string | null;
  title: string;
  summary: string;
  author: string;
  readTime: string;
  icon: string;
  coverImage?: string | null;
  publishedAt?: string;
}

export interface Article extends ArticleSummary {
  content: string;
  category?: MotivasiCategory | null;
}

export interface Doa {
  id: string;
  category: string;
  title: string;
  arabic?: string | null;
  latin?: string | null;
  meaning: string;
  source?: string | null;
  icon: string;
  debt?: boolean;
}

export interface Program {
  id: string;
  group: 'utama' | 'kegiatan';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string[];
  data: Record<string, any>;
  relatedEventType?: string | null;
}

export interface InfaqProgram {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  icon: string;
  gradient: string[];
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  qrisImage?: string | null;
  whatsappConfirm: string;
}

export interface SocialLink {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string[];
  handle: string;
  url: string;
  deepLink?: string | null;
  cta: string;
}

export interface SocialPost {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  type: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  url: string;
  deepLink?: string | null;
  publishedAt: string;
}

export interface AppNotification {
  id: string;
  type: 'event' | 'riyadhoh' | 'motivasi' | 'lbu' | 'lapak' | 'tanya' | 'info';
  title: string;
  body: string;
  icon?: string | null;
  data?: { route?: string; [key: string]: unknown };
  read: boolean;
  createdAt: string;
}

export interface HomeData {
  quoteOfTheDay: Motivasi | null;
  upcomingEvents: Event[];
  featuredTestimonial: Testimonial | null;
  socialPosts: SocialPost[];
  riyadhohToday: { completed: number; total: number; streak: number } | null;
  unreadNotifications: number;
}

export interface MeStats {
  riyadhoh: { currentStreak: number; longestStreak: number; totalCompleted: number; todayCompleted: number; todayTotal: number };
  tsnAttendance: number;
  eventsJoined: number;
  bookmarks: { ayah: number; hadith: number };
  lapak: { approved: number; pending: number; rejected: number };
  questions: number;
  testimonials: number;
}

export interface AppConfig {
  app: {
    name: string;
    tagline: string;
    latestVersion: string;
    minSupportedVersion: string;
    storeUrl: { android: string | null; ios: string | null };
    releaseDate: string;
    author: string;
    organization: string;
    website: string;
    features: string[];
  };
  contact: { whatsapp: string; email: string; instagram: string };
  membershipPlans: MembershipPlan[];
}

export interface AppState {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  user: User | null;
  isOnboarded: boolean;
  /** key: `${itemId}_${YYYY-MM-DD}` (tanggal WIB) */
  riyadhohLogs: Record<string, boolean>;
  /** "surahId:ayah" */
  bookmarkedAyahs: string[];
  /** "slug:nomor", mis. "bukhari:1" */
  bookmarkedHadiths: string[];
  lastReadAyahs: Record<string, number>;
  quranFontSize: number;
  hadithFontSize: number;
  membershipPlans: MembershipPlan[];
  references: References | null;
  notificationSettings: NotificationSettings;
  prayerLocation: PrayerLocation | null;
}

// ---------------- Kisah, Kuis NAS, Buku, Grup Ibadah (dari server) ----------------
export type StoryCategory = 'rasul' | 'nabi' | 'sahabat';

export interface StorySummary {
  id: string;
  category: StoryCategory;
  title: string;
  person: string;
  summary: string;
}

export interface Story extends StorySummary {
  body: string;
}

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export interface Book {
  id: string;
  title: string;
  coverTitle: string;
  coverCaption: string;
  meta: string;
  description: string;
  coverImage: string | null;
  url: string;
}

export type ReminderSettingKey = 'tahajudCallEnabled' | 'dhuhaReminderEnabled' | 'taubatReminderEnabled';

export interface WorshipGroup {
  id: string;
  name: string;
  description: string;
  schedule: string;
  icon: string;
  color: string;
  reminderKey: ReminderSettingKey | null;
  memberCount: number;
  joined: boolean;
}
