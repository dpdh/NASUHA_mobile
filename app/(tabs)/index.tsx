import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    Easing,
    FlatList,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { AnasAvatar } from '../../components/ui/AnasAvatar';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { MOTIVASI_QUOTES, RIYADHOH_ITEMS } from '../../constants/data';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi, riyadhohApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';
import type { Event, RiyadhohItem, SocialPost } from '../../types';
import { addDaysKey, wibDateKey } from '../../utils/date';

// Quote cadangan (offline) dipilih sekali per sesi app; Math.random tidak boleh dipanggil saat render.
const FALLBACK_QUOTE_INDEX = Math.floor(Math.random() * MOTIVASI_QUOTES.length);

const LOGO_SPLASH = require('../../assets/images/logo-splash.png');

interface QuickAction {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  route: string;
  gradient: [string, string];
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'sholat', icon: 'time', label: 'Shalat', route: '/sholat/', gradient: ['rgba(0,119,182,0.85)', 'rgba(0,180,216,0.85)'] },
  { id: 'quran', icon: 'book', label: "Al-Qur'an", route: '/(tabs)/quran', gradient: ['rgba(0,180,216,0.8)', 'rgba(0,119,182,0.9)'] },
  { id: 'hadis', icon: 'library', label: 'Hadis', route: '/hadis/', gradient: ['rgba(46,196,182,0.8)', 'rgba(14,140,127,0.9)'] },
  { id: 'doa', icon: 'heart-outline', label: 'Doa Harian', route: '/doa/', gradient: ['rgba(196,69,105,0.8)', 'rgba(142,44,74,0.9)'] },
  { id: 'riyadhoh', icon: 'checkmark-circle', label: 'Riyadhoh', route: '/(tabs)/riyadhoh', gradient: ['rgba(212,168,83,0.85)', 'rgba(184,134,11,0.9)'] },
  { id: 'motivasi', icon: 'bulb', label: 'Motivasi', route: '/motivasi/', gradient: ['rgba(255,179,71,0.85)', 'rgba(255,107,107,0.9)'] },
  { id: 'testimoni', icon: 'heart', label: 'Testimoni', route: '/testimoni/', gradient: ['rgba(255,107,107,0.8)', 'rgba(196,69,105,0.9)'] },
  { id: 'event', icon: 'calendar', label: 'Event', route: '/(tabs)/event', gradient: ['rgba(144,224,239,0.8)', 'rgba(0,119,182,0.9)'] },
  { id: 'tsn', icon: 'people', label: 'TSN', route: '/tsn/', gradient: ['rgba(46,196,182,0.8)', 'rgba(0,180,216,0.9)'] },
  { id: 'lbu', icon: 'rocket', label: 'LBU', route: '/lbu/', gradient: ['rgba(212,168,83,0.82)', 'rgba(184,134,11,0.9)'] },
  { id: 'debt-repayment', icon: 'wallet', label: 'Teknik Utang', route: '/debt-repayment/', gradient: ['rgba(13,99,142,0.9)', 'rgba(11,52,87,0.95)'] },
  { id: 'lapak', icon: 'storefront', label: 'Lapak', route: '/lapak/', gradient: ['rgba(255,179,71,0.85)', 'rgba(212,168,83,0.9)'] },
  { id: 'tanya', icon: 'chatbubbles', label: 'Tanya', route: '/tanya/', gradient: ['rgba(74,144,217,0.8)', 'rgba(46,196,182,0.9)'] },
  { id: 'kegiatan', icon: 'hand-left', label: 'Kegiatan', route: '/kegiatan/', gradient: ['rgba(46,196,182,0.8)', 'rgba(14,140,127,0.9)'] },
  { id: 'korda', icon: 'call', label: 'Korda', route: '/korda/', gradient: ['rgba(0,119,182,0.8)', 'rgba(0,180,216,0.9)'] },
  { id: 'kfm', icon: 'document-text', label: 'KFM', route: '/kfm/', gradient: ['rgba(0,119,182,0.8)', 'rgba(46,196,182,0.9)'] },
  { id: 'infaq', icon: 'heart-circle', label: 'Infaq', route: '/infaq/', gradient: ['rgba(245,158,11,0.85)', 'rgba(217,119,6,0.9)'] },
  { id: 'social', icon: 'share-social', label: 'Sosial', route: '/social/', gradient: ['rgba(131,58,180,0.8)', 'rgba(225,48,108,0.9)'] },
];

// Ditampilkan bila server belum memiliki post sosial.
const FALLBACK_IG_POSTS: Pick<SocialPost, 'id' | 'title' | 'type' | 'url'>[] = [
  { id: 'ig-1', title: 'Bahaya Riba Sehari-hari', type: 'Reels', url: 'https://www.instagram.com/nasuhajakarta/' },
  { id: 'ig-2', title: 'Jadwal TSN September', type: 'Post', url: 'https://www.instagram.com/nasuhajakarta/' },
  { id: 'ig-3', title: 'Kisah Lunas 200 Juta!', type: 'Reels', url: 'https://www.instagram.com/nasuhajakarta/' },
];

const QuickActionButton = memo(({ item, onPress }: { item: QuickAction; onPress: () => void }) => {
  return (
    <View style={styles.quickItemWrap}>
      <Pressable onPress={onPress} style={styles.quickCard}>
        <LinearGradient colors={item.gradient as [string, string]} style={styles.quickGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.quickShine} />
          <View style={styles.quickIconWrap}>
            <Ionicons name={item.icon} size={28} color="#FFF" />
          </View>
        </LinearGradient>
      </Pressable>
      <Text style={styles.quickLabel} numberOfLines={2}>{item.label}</Text>
    </View>
  );
});

const HOME_LIGHTS = [
  { size: 150, left: -42, top: 34, color: ['rgba(76,201,240,0.34)', 'rgba(0,119,182,0.04)'] as [string, string], x: 38, y: 26, duration: 9000, delay: 0 },
  { size: 118, left: 150, top: -34, color: ['rgba(125,211,252,0.28)', 'rgba(212,168,83,0.08)'] as [string, string], x: -30, y: 42, duration: 7600, delay: 500 },
  { size: 92, left: 238, top: 128, color: ['rgba(212,168,83,0.3)', 'rgba(255,255,255,0.03)'] as [string, string], x: -34, y: -30, duration: 8200, delay: 900 },
  { size: 74, left: 46, top: 176, color: ['rgba(0,180,216,0.22)', 'rgba(212,168,83,0.04)'] as [string, string], x: 28, y: -24, duration: 6800, delay: 350 },
];

const HomeLightOrb = memo(({ light }: { light: (typeof HOME_LIGHTS)[number] }) => {
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const xLoop = Animated.loop(Animated.sequence([
      Animated.timing(driftX, { toValue: light.x, duration: light.duration, delay: light.delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftX, { toValue: -light.x * 0.7, duration: light.duration * 0.85, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftX, { toValue: 0, duration: light.duration * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const yLoop = Animated.loop(Animated.sequence([
      Animated.timing(driftY, { toValue: -light.y, duration: light.duration * 0.72, delay: light.delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftY, { toValue: light.y, duration: light.duration * 0.92, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftY, { toValue: 0, duration: light.duration * 0.64, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.9, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.4, duration: 2100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    xLoop.start();
    yLoop.start();
    glowLoop.start();
    return () => { xLoop.stop(); yLoop.stop(); glowLoop.stop(); };
  }, [driftX, driftY, glow, light]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.homeLightOrb, { width: light.size, height: light.size, borderRadius: light.size / 2, left: light.left, top: light.top, opacity: glow, transform: [{ translateX: driftX }, { translateY: driftY }] }]}
    >
      <LinearGradient colors={light.color} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
});

const MovingLightBorder = memo(({ duration }: { duration: number }) => {
  const lightOneX = useRef(new Animated.Value(0)).current;
  const lightOneY = useRef(new Animated.Value(0)).current;
  const lightTwoX = useRef(new Animated.Value(0)).current;
  const lightTwoY = useRef(new Animated.Value(0)).current;
  const lightThreeX = useRef(new Animated.Value(0)).current;
  const lightThreeY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(lightOneX, { toValue: 42, duration: duration * 0.22, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneX, { toValue: -28, duration: duration * 0.18, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneX, { toValue: 12, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneX, { toValue: 0, duration: duration * 0.16, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lightOneY, { toValue: -34, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneY, { toValue: 28, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneY, { toValue: 8, duration: duration * 0.18, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightOneY, { toValue: 0, duration: duration * 0.18, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lightTwoX, { toValue: -42, duration: duration * 0.26, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightTwoX, { toValue: 26, duration: duration * 0.18, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightTwoX, { toValue: 0, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lightTwoY, { toValue: 30, duration: duration * 0.22, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightTwoY, { toValue: -26, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightTwoY, { toValue: 0, duration: duration * 0.22, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lightThreeX, { toValue: 34, duration: duration * 0.18, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightThreeX, { toValue: -36, duration: duration * 0.24, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightThreeX, { toValue: 0, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lightThreeY, { toValue: -24, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightThreeY, { toValue: 36, duration: duration * 0.22, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lightThreeY, { toValue: 0, duration: duration * 0.2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ]));
    animation.start();
    return () => animation.stop();
  }, [duration, lightOneX, lightOneY, lightTwoX, lightTwoY, lightThreeX, lightThreeY]);

  return (
    <View pointerEvents="none" style={styles.movingLightBorder}>
      <Animated.View style={[styles.movingLight, styles.movingLightOne, { transform: [{ translateX: lightOneX }, { translateY: lightOneY }] }]} />
      <Animated.View style={[styles.movingLight, styles.movingLightTwo, { transform: [{ translateX: lightTwoX }, { translateY: lightTwoY }] }]} />
      <Animated.View style={[styles.movingLight, styles.movingLightThree, { transform: [{ translateX: lightThreeX }, { translateY: lightThreeY }] }]} />
    </View>
  );
});

function HomeScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const riyadhohLogs = useAppStore((s) => s.riyadhohLogs);
  const colors = Colors[theme];

  const { data: home } = useApiQuery(() => contentApi.home(), [user?.id], { cacheKey: 'home', refetchOnFocus: true });
  const { data: riyadhohData } = useApiQuery(() => riyadhohApi.items(), [], { cacheKey: 'riyadhoh_items' });
  const riyadhohItems: RiyadhohItem[] = riyadhohData?.items?.length ? riyadhohData.items : RIYADHOH_ITEMS;

  // Tanggal WIB, dihitung tiap render agar berganti hari tepat tengah malam.
  const todayKey = wibDateKey();

  const riyadhohProgress = useMemo(() => {
    const total = riyadhohItems.length;
    let done = 0;
    for (const item of riyadhohItems) {
      if (riyadhohLogs[`${item.id}_${todayKey}`]) done++;
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [riyadhohLogs, todayKey, riyadhohItems]);

  // Streak (hari berturut-turut dengan minimal 1 amalan, hari ini boleh belum diisi)
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const dateKey = addDaysKey(todayKey, -i);
      let anyDone = false;
      for (const item of riyadhohItems) {
        if (riyadhohLogs[`${item.id}_${dateKey}`]) { anyDone = true; break; }
      }
      if (anyDone) count++;
      else if (i > 0) break;
    }
    return count;
  }, [riyadhohLogs, todayKey, riyadhohItems]);

  const fallbackQuote = MOTIVASI_QUOTES[FALLBACK_QUOTE_INDEX] || MOTIVASI_QUOTES[0];
  const quote = home?.quoteOfTheDay || fallbackQuote;
  const upcomingEvents: Event[] = home?.upcomingEvents ?? [];
  const featuredTestimonial = home?.featuredTestimonial ?? null;
  const unreadCount = home?.unreadNotifications ?? 0;
  const igPosts = home?.socialPosts?.length ? home.socialPosts : FALLBACK_IG_POSTS;

  const displayName = user?.name || 'Sahabat NASUHA';
  const assistantFloat = useRef(new Animated.Value(0)).current;
  const anasFloat = useRef(new Animated.Value(0)).current;
  const anasPulse = useRef(new Animated.Value(1)).current;
  const anasRotate = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoShimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(assistantFloat, { toValue: -8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(assistantFloat, { toValue: 8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(assistantFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [assistantFloat]);

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(anasFloat, { toValue: -6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasFloat, { toValue: 6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(anasPulse, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasPulse, { toValue: 0.98, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasPulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(anasRotate, { toValue: -1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasRotate, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anasRotate, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 0.96, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(logoShimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoShimmer, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ]),
    ).start();

  }, [anasFloat, anasPulse, anasRotate, logoPulse, logoShimmer]);

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Hero */}
        <LinearGradient
          colors={theme === 'dark' ? ['#071B2B', '#0B2340', '#0F4D7B', '#7DD3FC'] : ['#F0FAFF', '#D9F6FF', '#BFE7FF', '#90E0EF']}
          style={styles.hero}
        >
          <View style={styles.heroGlassOverlay} />
          <View pointerEvents="none" style={styles.homeLightLayer}>
            {HOME_LIGHTS.map((light) => <HomeLightOrb key={`${light.left}-${light.top}`} light={light} />)}
          </View>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.salam, { color: colors.textSecondary }]}>Assalamu'alaikum 👋</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{displayName}</Text>
            </View>
            <View style={styles.heroIcons}>
              <Pressable onPress={() => router.push('/search/' as any)} hitSlop={8}>
                <Ionicons name="search-outline" size={24} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => router.push('/notifications/' as any)} hitSlop={8}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/profile' as any)} hitSlop={8}>
                <Ionicons name="person-circle-outline" size={26} color={colors.text} />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>
            Semoga hari ini menjadi langkah terbaik menuju perubahan.
          </Text>
          <View style={styles.brandWrap}>
            <Animated.View
              style={[
                styles.logoGlow,
                { opacity: logoShimmer },
                { transform: [{ scale: logoPulse }] },
              ]}
            />
            <Animated.Image
              source={LOGO_SPLASH}
              style={[styles.heroLogo, { transform: [{ scale: logoPulse }] }]}
              resizeMode="contain"
            />
            <Text style={[styles.brandText, { color: colors.text }]}>NASUHA</Text>
          </View>

          {(user?.role === 'super_admin' || user?.role === 'admin') && (
            <Pressable
              onPress={() => router.push((Platform.OS === 'web' && user?.role === 'super_admin' ? '/admin-web' : '/admin/') as any)}
              style={[styles.adminShortcut, { backgroundColor: 'rgba(255, 107, 107, 0.14)', borderColor: 'rgba(255, 107, 107, 0.42)' }]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FF6B6B" />
              <View style={styles.adminShortcutTextWrap}>
                <Text style={[styles.adminShortcutTitle, { color: colors.text }]}>Open Admin Panel</Text>
                <Text style={[styles.adminShortcutSub, { color: colors.textSecondary }]}>Kelola user, produk, dan event</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </LinearGradient>

        {/* Daily Motivation */}
        <View style={[styles.motivCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <ShimmerGold style={styles.shimmerTop} />
          <Text style={[styles.motivLabel, { color: colors.gold }]}>Motivasi Hari Ini</Text>
          <Text style={[styles.motivText, { color: colors.text }]}>&ldquo;{quote.text}&rdquo;</Text>
          <View style={styles.motivFooter}>
            <Text style={[styles.motivAuthor, { color: colors.gold }]}>— {quote.author}</Text>
            <Pressable onPress={() => router.push('/motivasi/' as any)} style={[styles.motivBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.motivBtnText}>BACA MOTIVASI</Text>
            </Pressable>
          </View>
        </View>

        {/* Riyadhoh Progress */}
        <Pressable
          onPress={() => router.push('/(tabs)/riyadhoh')}
          style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={[styles.progressTitle, { color: colors.text }]}>Riyadhoh Hari Ini</Text>
              <Text style={[styles.progressSub, { color: colors.textSecondary }]}>{riyadhohProgress.done}/{riyadhohProgress.total} ibadah selesai</Text>
            </View>
            <View style={styles.progressRight}>
              <Text style={[styles.progressPct, { color: colors.primary }]}>{riyadhohProgress.pct}%</Text>
              {streak > 0 && (
                <View style={styles.streakRow}>
                  <Ionicons name="flame" size={14} color={colors.gold} />
                  <Text style={[styles.streakText, { color: colors.gold }]}>{streak} hari</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <View style={[styles.progressFill, { width: `${riyadhohProgress.pct}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.ctaLabel, { color: colors.primary }]}>MULAI RIYADHOH →</Text>
        </Pressable>

        {/* Quick Menu */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu Cepat</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <QuickActionButton key={item.id} item={item} onPress={() => router.push(item.route as any)} />
          ))}
        </View>

        {/* Kisah Sahabat */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kisah Sahabat NASUHA</Text>
        {featuredTestimonial && [featuredTestimonial].map((t) => (
          <Pressable key={t.id} onPress={() => router.push('/testimoni/' as any)} style={[styles.storyCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <View style={[styles.storyAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.storyAvatarText}>{t.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.storyName, { color: colors.text }]}>{t.name}</Text>
              <Text style={[styles.storyText, { color: colors.textSecondary }]} numberOfLines={2}>{t.text}</Text>
              <Text style={[styles.storyCta, { color: colors.primary }]}>BACA CERITA →</Text>
            </View>
          </Pressable>
        ))}

        {/* Instagram NASUHA Jakarta */}
        <View style={[styles.igSection, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <LinearGradient colors={['#833AB4', '#E1306C', '#F77737']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.igHeader}>
            <Ionicons name="logo-instagram" size={22} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.igHandle}>@nasuhajakarta</Text>
              <Text style={styles.igLabel}>Instagram Resmi</Text>
            </View>
            <Pressable
              onPress={async () => {
                try {
                  const supported = await Linking.canOpenURL('instagram://user?username=nasuhajakarta');
                  await Linking.openURL(supported ? 'instagram://user?username=nasuhajakarta' : 'https://www.instagram.com/nasuhajakarta/');
                } catch { await Linking.openURL('https://www.instagram.com/nasuhajakarta/'); }
              }}
              style={styles.igFollowBtn}
            >
              <Text style={styles.igFollowText}>Follow</Text>
            </Pressable>
          </LinearGradient>
          <View style={styles.igContent}>
            <View style={styles.igPostRow}>
              {igPosts.slice(0, 3).map((post) => (
                <Pressable
                  key={post.id}
                  onPress={async () => {
                    try { await Linking.openURL(post.url || 'https://www.instagram.com/nasuhajakarta/'); } catch {}
                  }}
                  style={[styles.igPost, { backgroundColor: colors.surface }]}
                >
                  <LinearGradient colors={['#833AB4', '#C13584', '#E1306C']} style={styles.igPostThumb}>
                    <Ionicons name={post.type === 'Reels' ? 'play' : 'image'} size={16} color="#FFF" />
                  </LinearGradient>
                  <Text style={[styles.igPostTitle, { color: colors.text }]} numberOfLines={2}>{post.title}</Text>
                  <View style={styles.igPostMeta}>
                    <View style={[styles.igTypeBadge, { backgroundColor: '#E1306C20' }]}>
                      <Text style={styles.igTypeText}>{post.type}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={async () => {
                try {
                  const supported = await Linking.canOpenURL('instagram://user?username=nasuhajakarta');
                  await Linking.openURL(supported ? 'instagram://user?username=nasuhajakarta' : 'https://www.instagram.com/nasuhajakarta/');
                } catch { await Linking.openURL('https://www.instagram.com/nasuhajakarta/'); }
              }}
              style={styles.igViewAll}
            >
              <Text style={[styles.igViewAllText, { color: '#E1306C' }]}>Lihat semua di Instagram →</Text>
            </Pressable>
          </View>
        </View>

        {/* Social Links */}
        <Pressable onPress={() => router.push('/social/' as any)} style={[styles.socialBanner, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <Ionicons name="share-social" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.socialTitle, { color: colors.text }]}>NASUHA Social</Text>
            <Text style={[styles.socialSub, { color: colors.textSecondary }]}>Instagram, TikTok, YouTube, WhatsApp</Text>
          </View>
          <Text style={[styles.socialCta, { color: colors.primary }]}>LIHAT →</Text>
        </Pressable>

        {/* Events Header */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Event Mendatang</Text>
          <Pressable onPress={() => router.push('/(tabs)/event')}>
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>Lihat Semua</Text>
          </Pressable>
        </View>
      </View>
    ),
    [theme, colors, riyadhohProgress, quote, displayName, streak, unreadCount, featuredTestimonial, igPosts],
  );

  const renderEvent = useCallback(
    ({ item }: { item: Event }) => (
      <Pressable
        onPress={() => router.push(`/event/${item.id}` as any)}
        style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
      >
        <View style={[styles.eventBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.eventBadgeText}>{item.type}</Text>
        </View>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.eventMeta}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>{item.date}</Text>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.eventMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={[styles.detailBtn, { borderColor: colors.primary }]}>
          <Text style={[styles.detailBtnText, { color: colors.primary }]}>DETAIL EVENT</Text>
        </View>
      </Pressable>
    ),
    [colors],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={upcomingEvents.slice(0, 3)}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEvent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <Text style={[styles.emptyEvents, { color: colors.textSecondary }]}>Belum ada event mendatang.</Text>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Games NAS Button */}
      <Animated.View style={[styles.gamesFab, { transform: [{ translateY: assistantFloat }] }]}>
        <View style={styles.gamesShell}>
          <MovingLightBorder duration={1800} />
          <Pressable onPress={() => router.push('/games/' as any)} style={({ pressed }) => [styles.gamesButton, { opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient colors={['#F6D77A', '#C9972B', '#8B5E12']} style={styles.gamesGradient}>
              <Ionicons name="game-controller" size={15} color="#FFF" />
            </LinearGradient>
            <View style={styles.gamesLabel}><Text style={styles.gamesLabelText}>Games NAS</Text></View>
          </Pressable>
        </View>
      </Animated.View>

      {/* Floating Anas AI Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [
              { translateY: anasFloat },
              { scale: anasPulse },
              { rotate: anasRotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) },
            ],
          },
        ]}
      >
        <View style={styles.fabGlow} />
        <View style={styles.fabShell}>
          <MovingLightBorder duration={2200} />
          <Pressable
            onPress={() => router.push('/asisten/' as any)}
            style={({ pressed }) => [
              styles.fabButton,
              {
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LinearGradient colors={['#4CC9F0', '#0077B6', '#003C8F']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <AnasAvatar size={28} />
            </LinearGradient>
            <View style={styles.fabLabel}>
              <Text style={styles.fabLabelText}>Anas AI</Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default memo(HomeScreen);

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  emptyEvents: { textAlign: 'center', fontSize: FontSize.sm, marginHorizontal: Spacing.lg, marginVertical: Spacing.md },
  hero: {
    marginHorizontal: Spacing.lg,
    marginTop: 12,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#0B1726',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 20, 35, 0.28)',
  },
  heroGlassOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  homeLightLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: 30 },
  homeLightOrb: { position: 'absolute', overflow: 'hidden', shadowColor: '#4CC9F0', shadowOpacity: 0.28, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 },
  heroIcons: { flexDirection: 'row', gap: Spacing.md },
  salam: { fontSize: FontSize.md },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 2 },
  heroSubtext: { fontSize: FontSize.sm, marginTop: 4, lineHeight: 18, zIndex: 1 },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    gap: 6,
    zIndex: 1,
  },
  adminShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    zIndex: 1,
  },
  adminShortcutTextWrap: { flex: 1 },
  adminShortcutTitle: { fontSize: FontSize.md, fontWeight: '700' },
  adminShortcutSub: { fontSize: FontSize.xs, marginTop: 2 },
  logoGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.24)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  heroLogo: { width: 54, height: 54, alignSelf: 'center', opacity: 0.95 },
  brandText: { fontSize: FontSize.xl, fontWeight: '900', letterSpacing: 1.2 },
  motivCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  shimmerTop: { height: 3 },
  motivLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  motivText: { fontSize: FontSize.md, lineHeight: 22, fontStyle: 'italic', paddingHorizontal: Spacing.md, paddingTop: 4 },
  motivFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.sm },
  motivAuthor: { fontSize: FontSize.sm, fontWeight: '600' },
  motivBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  motivBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  progressSub: { fontSize: FontSize.sm, marginTop: 2 },
  progressRight: { alignItems: 'flex-end' },
  progressPct: { fontSize: FontSize.xl, fontWeight: '800' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  streakText: { fontSize: FontSize.xs, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  ctaLabel: { fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.sm, textAlign: 'right' },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginHorizontal: Spacing.lg,
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: 18, marginBottom: 12 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'flex-start',
    rowGap: 7,
    columnGap: 7,
    width: '100%',
  },
  quickItemWrap: {
    width: '31.5%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  quickCard: {
    width: '100%',
    height: 98,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  quickGradient: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  quickShine: {
    position: 'absolute',
    top: -12,
    left: -8,
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '18deg' }],
  },
  quickIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  quickLabel: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
    letterSpacing: 0.01,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
    maxWidth: '128%',
    marginTop: 4,
    minHeight: 24,
    alignSelf: 'center',
  },
  storyCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    gap: Spacing.md,
  },
  storyAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  storyAvatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  storyName: { fontSize: FontSize.md, fontWeight: '700' },
  storyText: { fontSize: FontSize.sm, lineHeight: 18, marginTop: 2 },
  storyCta: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 4 },
  socialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    gap: Spacing.md,
  },
  socialTitle: { fontSize: FontSize.md, fontWeight: '700' },
  socialSub: { fontSize: FontSize.xs, marginTop: 1 },
  socialCta: { fontSize: FontSize.xs, fontWeight: '700' },

  // Instagram Section
  igSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  igHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  igHandle: { color: '#FFF', fontSize: FontSize.md, fontWeight: '800' },
  igLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs },
  igFollowBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: BorderRadius.full },
  igFollowText: { color: '#E1306C', fontSize: FontSize.sm, fontWeight: '800' },
  igContent: { padding: Spacing.sm },
  igPostRow: { flexDirection: 'row', gap: Spacing.sm },
  igPost: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  igPostThumb: { height: 72, alignItems: 'center', justifyContent: 'center' },
  igPostTitle: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingTop: 4, lineHeight: 14 },
  igPostMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingBottom: 6, paddingTop: 2 },
  igPostLikes: { fontSize: 9 },
  igTypeBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginLeft: 'auto' },
  igTypeText: { fontSize: 8, fontWeight: '700', color: '#E1306C' },
  igViewAll: { alignItems: 'center', paddingVertical: Spacing.sm },
  igViewAllText: { fontSize: FontSize.sm, fontWeight: '700' },
  eventCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  eventBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  eventBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  eventTitle: { fontSize: FontSize.lg, fontWeight: '700', marginTop: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventMetaText: { fontSize: FontSize.xs },
  detailBtn: { marginTop: Spacing.sm, paddingVertical: 8, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  detailBtnText: { fontSize: FontSize.sm, fontWeight: '700' },

  // FAB Anas
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 112,
    zIndex: 20,
  },
  gamesFab: { position: 'absolute', right: 14, bottom: 178, zIndex: 20 },
  gamesShell: { position: 'relative', padding: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(246,215,122,0.36)', shadowColor: '#A9E8FF', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  gamesButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 5, paddingRight: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', shadowColor: '#F6D77A', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  gamesGradient: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  gamesLabel: { backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, minWidth: 88, alignItems: 'center' },
  gamesLabelText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '900' },
  fabShell: { position: 'relative', padding: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(125,211,252,0.34)', shadowColor: '#A9E8FF', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  movingLightBorder: { position: 'absolute', top: -28, right: -28, bottom: -28, left: -28, borderRadius: 999, overflow: 'hidden' },
  movingLight: { position: 'absolute', width: 86, height: 86, borderRadius: 43, opacity: 0.72, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  movingLightOne: { left: -26, top: -22, backgroundColor: 'rgba(255,255,255,0.84)', shadowColor: '#FFFFFF' },
  movingLightTwo: { right: -24, top: 8, backgroundColor: 'rgba(169,232,255,0.72)', shadowColor: '#A9E8FF' },
  movingLightThree: { left: 28, bottom: -30, backgroundColor: 'rgba(255,232,173,0.68)', shadowColor: '#FFE8AD' },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  fabGlow: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(125, 211, 252, 0.08)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  fabLabel: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 80,
    alignItems: 'center',
  },
  fabLabelText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
