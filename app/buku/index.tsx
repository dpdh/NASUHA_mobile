import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';

function BookShelfScreen() {
  const theme = useAppStore((state) => state.theme);
  const colors = Colors[theme];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={theme === 'dark' ? ['#21150E', '#543721'] : ['#FFF4E8', '#E9C39B']} style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme === 'dark' ? '#FFF4E8' : '#5A3820'} />
        </Pressable>
        <View style={styles.heroIcon}>
          <Ionicons name="library" size={34} color="#FFF4E8" />
        </View>
        <Text style={[styles.eyebrow, { color: theme === 'dark' ? '#E9C39B' : '#7C4F2D' }]}>KOLEKSI DIGITAL</Text>
        <Text style={[styles.title, { color: theme === 'dark' ? '#FFF4E8' : '#3D2516' }]}>Buku NASUHA</Text>
        <Text style={[styles.subtitle, { color: theme === 'dark' ? '#E9C39B' : '#6E4B35' }]}>Ruang baca untuk bertumbuh, memahami, dan menghidupkan nilai kebaikan.</Text>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Koleksi Buku</Text>
      <Pressable onPress={() => router.push('/buku/putih' as any)} style={({ pressed }) => [styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }, Shadows.md]}>
        <LinearGradient colors={['#FFFFFF', '#E7F5FF', '#78BFE8']} style={styles.cover}>
          <View style={styles.coverLine} />
          <Ionicons name="sparkles-outline" size={26} color="#C9972B" />
          <Text style={styles.coverSmall}>KOMUNITAS NASUHA</Text>
          <Text style={styles.coverTitle}>BUKU SAKTI{`\n`}LUNAS UTANG</Text>
          <Text style={styles.coverCaption}>Panduan syariah untuk melangkah bebas dari utang</Text>
          <View style={styles.coverLine} />
        </LinearGradient>
        <View style={styles.bookInfo}>
          <View style={styles.bookHeadingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bookTitle, { color: colors.text }]}>Buku Sakti Lunas Utang Komunitas NASUHA</Text>
              <Text style={[styles.bookMeta, { color: colors.textMuted }]}>Flipbook resmi  •  204 halaman</Text>
            </View>
            <View style={[styles.readIcon, { backgroundColor: colors.primary + '18' }]}><Ionicons name="book-outline" size={20} color={colors.primary} /></View>
          </View>
          <Text style={[styles.bookDescription, { color: colors.textSecondary }]}>Materi syariah untuk memahami akad, memetakan pokok dan DBO, bernegosiasi, serta menyusun langkah pelunasan bersama Komunitas NASUHA.</Text>
          <View style={[styles.readButton, { backgroundColor: colors.primary }]}><Ionicons name="play" size={15} color="#FFF" /><Text style={styles.readButtonText}>Mulai Membaca</Text></View>
        </View>
      </Pressable>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

export default memo(BookShelfScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  hero: { minHeight: 250, paddingHorizontal: Spacing.lg, paddingTop: 54, paddingBottom: Spacing.xl, overflow: 'hidden' },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: Spacing.lg },
  heroIcon: { width: 66, height: 66, borderRadius: 20, backgroundColor: '#6A4930', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  eyebrow: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 34, fontWeight: '900', marginTop: 4 },
  subtitle: { fontSize: FontSize.md, lineHeight: 21, maxWidth: 330, marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '800', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  bookCard: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cover: { minHeight: 286, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  coverLine: { width: 118, height: 2, backgroundColor: '#C9972B', opacity: 0.85, marginVertical: Spacing.md },
  coverSmall: { color: '#B17C16', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 2.4, marginTop: Spacing.sm, textAlign: 'center' },
  coverTitle: { color: '#B17C16', fontSize: 32, fontWeight: '900', lineHeight: 36, textAlign: 'center', letterSpacing: 1.2, marginTop: Spacing.sm, textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  coverCaption: { color: '#215D82', fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center', marginTop: Spacing.md, maxWidth: 230, lineHeight: 18 },
  bookInfo: { padding: Spacing.md },
  bookHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bookTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  bookMeta: { fontSize: FontSize.xs, marginTop: 3 },
  readIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bookDescription: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.md },
  readButton: { minHeight: 44, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: Spacing.md },
  readButtonText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '800' },
});
