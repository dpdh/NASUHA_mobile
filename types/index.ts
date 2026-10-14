export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  backendToken?: string;
  authProvider?: 'password' | 'google';
  phone?: string;
  avatar?: string;
  role: 'super_admin' | 'admin' | 'sahabat' | 'calon_sahabat';
  joinDate: string;
  isActive: boolean;
  // Extended profile
  bio?: string;
  city?: string;
  address?: string;
  gender?: 'laki-laki' | 'perempuan';
  birthDate?: string;
  occupation?: string;
  nasuhaRegion?: string;
  lbuBatch?: number;
  // Membership
  membershipType?: 'free' | 'membership' | 'sahabat';
  membershipFeatures?: Record<string, boolean>;
}

export interface Profile {
  userId: string;
  bio?: string;
  city?: string;
  region: string;
  joinedNasuhaDate?: string;
  lbuParticipant: boolean;
  tsnAttendance: number;
  riyadhohStreak: number;
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
}

export interface RiyadhohLog {
  id: string;
  itemId: string;
  date: string;
  completed: boolean;
  notes?: string;
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
  id: number;
  text: string;
  author: string;
  category: string;
}

export interface Testimonial {
  id: number;
  name: string;
  avatar: string | null;
  korda?: string;
  text: string;
  program: string;
  rating: number;
  date: string;
}

export interface Event {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  description: string;
  quota: number;
  registered: number;
  status?: 'draft' | 'published' | 'cancelled';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  image?: string;
  contactWhatsapp?: string;
}

export interface TSNSession {
  id: number;
  title: string;
  date: string;
  location: string;
  speaker: string;
  topic: string;
  attendees: number;
}

export interface LBUProgram {
  id: number;
  batchNumber: number;
  city: string;
  date: string;
  totalPeserta: number;
  totalLunas: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface LapakProduct {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  rating: number;
  sold: number;
}

export interface UserTestimonial {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  program: 'LBU' | 'TSN' | 'Riyadhoh' | 'Kajian' | 'Lainnya';
  rating: number;
  text: string;
  photo?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  category: 'Keuangan Syariah' | 'Hijrah' | 'Fiqh' | 'Bisnis' | 'Umum';
  title: string;
  body: string;
  answers: Answer[];
  createdAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  body: string;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'mist' | 'ocean' | 'emerald' | 'royal' | 'sunset' | 'rose';

export type MembershipType = 'free' | 'membership' | 'sahabat';

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
  eventId: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userCity?: string;
  korda?: string;
  notes?: string;
  status: 'registered' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface AppState {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  user: User | null;
  isOnboarded: boolean;
  riyadhohLogs: Record<string, boolean>;
  bookmarkedAyahs: string[];
  bookmarkedHadiths: number[];
  members: User[];
  products: LapakProduct[];
  testimonials: UserTestimonial[];
  questions: Question[];
  lastReadAyahs: Record<string, number>;
  events: Event[];
  eventRegistrations: EventRegistration[];
  quranFontSize: number;
  hadithFontSize: number;
  membershipPlans: MembershipPlan[];
  notificationSettings: NotificationSettings;
  prayerLocation: PrayerLocation | null;
}
