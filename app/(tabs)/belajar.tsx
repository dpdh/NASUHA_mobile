import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { ShimmerGold } from '../../components/ui/ShimmerGold';

const LOGO_SPLASH = require('../../assets/images/logo-splash.png');

interface MenuItem {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string;
  route: string;
  gradient: [string, string];
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'quran', icon: 'book', label: "Al-Qur'an", sub: '114 Surah lengkap', route: '/(tabs)/quran', gradient: ['#00B4D8', '#0077B6'] },
  { id: 'hadis', icon: 'library', label: 'Hadis', sub: '9 Kitab • 38,000+ hadis', route: '/hadis/', gradient: ['#2EC4B6', '#0E8C7F'] },
  { id: 'motivasi', icon: 'bulb', label: 'Motivasi', sub: 'Inspirasi harian', route: '/motivasi/', gradient: ['#D4A853', '#B8860B'] },
  { id: 'artikel', icon: 'newspaper', label: 'Artikel', sub: 'Edukasi & ilmu', route: '/artikel/', gradient: ['#FF6B6B', '#C44569'] },
  { id: 'doa', icon: 'heart', label: "Do'a Harian", sub: 'Doa harian & utang', route: '/doa/', gradient: ['#168AAD', '#52B69A'] },
  { id: 'buku', icon: 'library-outline', label: 'Buku NASUHA', sub: 'Koleksi buku digital', route: '/buku/', gradient: ['#8B5E3C', '#C08A5C'] },
  { id: 'rasul', icon: 'sparkles', label: 'Kisah Rasulullah SAW', sub: 'Teladan dari Rasulullah', route: '/kisah/', gradient: ['#2E8B83', '#185D59'] },
  { id: 'nabi', icon: 'sunny', label: 'Kisah Nabi', sub: 'Pelajaran para Nabi', route: '/kisah/', gradient: ['#B9822B', '#7B5117'] },
  { id: 'sahabat', icon: 'people', label: 'Kisah Sahabat Nabi', sub: 'Jejak generasi terbaik', route: '/kisah/', gradient: ['#4977A4', '#294D70'] },
];

const MenuCard = memo(({ item }: { item: MenuItem }) => (
  <Pressable
    onPress={() => router.push(item.route as any)}
    style={({ pressed }) => [styles.menuCard, { opacity: pressed ? 0.85 : 1 }]}
  >
    <LinearGradient colors={item.gradient} style={styles.menuGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={item.icon} size={32} color="#FFF" />
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Text style={styles.menuSub}>{item.sub}</Text>
    </LinearGradient>
  </Pressable>
));

function BelajarScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={theme === 'dark' ? ['#0A1628', '#112240', '#0077B6'] : ['#F0FAFF', '#CAF0F8', '#90E0EF']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Belajar</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Akses Al-Qur&apos;an, Hadis, Motivasi &amp; Edukasi
            </Text>
          </View>
          <Image source={LOGO_SPLASH} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </LinearGradient>

      {/* Quote */}
      <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
        <ShimmerGold style={styles.shimmer} />
        <Ionicons name="sparkles" size={20} color={colors.gold} style={{ marginTop: Spacing.md, marginLeft: Spacing.md }} />
        <Text style={[styles.quoteText, { color: colors.text }]}>
          &ldquo;Barangsiapa yang menempuh suatu jalan untuk menuntut ilmu, niscaya Allah memudahkan baginya jalan menuju surga.&rdquo;
        </Text>
        <Text style={[styles.quoteAuthor, { color: colors.gold }]}>— HR. Muslim</Text>
      </View>

      {/* Menu Grid */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pilih Materi</Text>
      <View style={styles.menuGrid}>
        {MENU_ITEMS.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </View>

      {/* Quick Links */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Lainnya</Text>
      {[
        { icon: 'heart-outline' as const, label: 'Testimoni Sahabat', route: '/testimoni/' },
        { icon: 'people-outline' as const, label: 'Komunitas NASUHA', route: '/social/' },
      ].map((item) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.route as any)}
          style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
        >
          <Ionicons name={item.icon} size={22} color={colors.primary} />
          <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

export default memo(BelajarScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  headerLogo: { width: 56, height: 56, marginLeft: Spacing.md },
  quoteCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.sm, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmer: { height: 3 },
  quoteText: { fontSize: FontSize.md, fontStyle: 'italic', lineHeight: 22, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  quoteAuthor: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'right', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: 4 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  menuCard: { width: '48%', aspectRatio: 1.2 },
  menuGradient: { flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, justifyContent: 'flex-end' },
  menuLabel: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.sm },
  menuSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, marginTop: 2 },
  linkCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  linkLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
});
