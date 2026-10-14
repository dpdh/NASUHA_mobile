import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';

interface ArtikelItem {
  id: string | number;
  title: string;
  category: string;
  readTime: string;
  icon: string;
  /** true bila artikel punya isi di server sehingga bisa dibuka */
  readable: boolean;
}

// Daftar bawaan (belum ada isi) — tampil bila server belum memiliki artikel terbit.
const ARTICLES: ArtikelItem[] = [
  { id: 1, title: 'Memahami Bahaya Riba dalam Islam', category: 'Muamalah', readTime: '5 menit', icon: 'alert-circle-outline', readable: false },
  { id: 2, title: 'Cara Memulai Hidup Bebas Utang', category: 'Keuangan', readTime: '7 menit', icon: 'trending-up-outline', readable: false },
  { id: 3, title: 'Keutamaan Sedekah dalam Al-Quran dan Hadis', category: 'Ibadah', readTime: '4 menit', icon: 'heart-outline', readable: false },
  { id: 4, title: 'Tips Istiqamah dalam Beribadah', category: 'Self-Development', readTime: '6 menit', icon: 'flame-outline', readable: false },
  { id: 5, title: 'Panduan Keuangan Syariah untuk Pemula', category: 'Keuangan', readTime: '8 menit', icon: 'wallet-outline', readable: false },
  { id: 6, title: 'Mengelola Stres dengan Dzikir dan Doa', category: 'Kesehatan', readTime: '5 menit', icon: 'leaf-outline', readable: false },
];

function ArtikelScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const { data: remote } = useApiQuery(() => contentApi.articles({ section: 'artikel' }), [], { cacheKey: 'artikel' });
  // Hanya artikel terbit yang dikembalikan server, jadi semuanya bisa dibuka.
  const articles: ArtikelItem[] = remote?.length
    ? remote.map((article) => ({
      id: article.id,
      title: article.title,
      category: article.summary || 'Artikel',
      readTime: article.readTime,
      icon: article.icon,
      readable: true,
    }))
    : ARTICLES;
  const hasReadable = articles.some((article) => article.readable);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.title, { color: colors.text }]}>Artikel</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Edukasi & Ilmu untuk Sahabat NASUHA</Text>
        </View>
      </View>

      <View style={styles.list}>
        {articles.map((article) => (
          <Pressable
            key={article.id}
            disabled={!article.readable}
            onPress={() => router.push(`/motivasi/article/${article.id}` as any)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: article.readable ? 1 : 0.75 }, Shadows.sm]}
          >
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name={article.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{article.title}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.catBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.catText, { color: colors.textSecondary }]}>{article.category}</Text>
                </View>
                <Text style={[styles.readTime, { color: colors.textMuted }]}>{article.readTime}</Text>
              </View>
            </View>
            {article.readable && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          </Pressable>
        ))}
      </View>

      {!hasReadable && (
      <View style={[styles.comingSoon, { backgroundColor: colors.surface }]}>
        <Ionicons name="construct-outline" size={24} color={colors.textMuted} />
        <Text style={[styles.comingText, { color: colors.textSecondary }]}>
          Konten artikel lengkap akan segera tersedia. Nantikan update selanjutnya!
        </Text>
      </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

export default memo(ArtikelScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catText: { fontSize: FontSize.xs, fontWeight: '600' },
  readTime: { fontSize: FontSize.xs },
  comingSoon: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  comingText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
});
