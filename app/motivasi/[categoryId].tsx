import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { MOTIVASI_CATEGORIES, MOTIVASI_ARTICLES, MOTIVASI_QUOTES } from '../../constants/data';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';
import type { ArticleSummary, Motivasi, MotivasiCategory } from '../../types';

type Article = Pick<ArticleSummary, 'title' | 'summary' | 'author' | 'readTime' | 'icon'> & { id: string | number };

// Pemetaan lama kategori → tag quote, hanya dipakai saat data server tidak tersedia.
const CATEGORY_QUOTE_MAP: Record<string, string[]> = {
  aqidah: ['Al-Quran', 'Hijrah'],
  akhlaq: ['Persahabatan', 'Komunitas'],
  'mental-spiritual': ['Hijrah'],
  muhasabah: ['Hijrah'],
  'scale-up-potensi': ['Tagline'],
  'scale-up-bisnis': ['Anti-Riba', 'Tagline'],
};

const ArticleCard = memo(({ item, colors, categoryColor }: { item: Article; colors: typeof Colors.light; categoryColor: string }) => (
  <Pressable
    style={({ pressed }) => [
      styles.articleCard,
      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      Shadows.sm,
    ]}
    onPress={() => router.push(`/motivasi/article/${item.id}` as any)}
  >
    <View style={[styles.articleIcon, { backgroundColor: categoryColor + '15' }]}>
      <Ionicons name={item.icon as any} size={22} color={categoryColor} />
    </View>
    <View style={styles.articleContent}>
      <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
      <Text style={[styles.articleSummary, { color: colors.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
      <View style={styles.articleMeta}>
        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
        <Text style={[styles.articleMetaText, { color: colors.textMuted }]}>{item.readTime}</Text>
        <Text style={[styles.articleMetaDot, { color: colors.textMuted }]}>·</Text>
        <Text style={[styles.articleMetaText, { color: colors.textMuted }]}>{item.author}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </Pressable>
));

function CategoryDetailScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];

  const { data: remote } = useApiQuery(() => contentApi.motivasiCategory(categoryId ?? ''), [categoryId], {
    cacheKey: `motivasi_category_${categoryId}`,
    enabled: Boolean(categoryId),
  });

  const category: MotivasiCategory | undefined = useMemo(() => {
    if (remote) return remote;
    const local = MOTIVASI_CATEGORIES.find((c) => c.id === categoryId);
    return local ? { ...local, gradient: [...local.gradient] } : undefined;
  }, [remote, categoryId]);

  const articles: Article[] = useMemo(
    () => remote?.articles ?? MOTIVASI_ARTICLES.filter((a) => a.categoryId === categoryId),
    [remote, categoryId],
  );

  const relatedQuotes: Motivasi[] = useMemo(() => {
    if (remote) return remote.quote ? [remote.quote] : [];
    const tags = CATEGORY_QUOTE_MAP[categoryId ?? ''] ?? [];
    return MOTIVASI_QUOTES.filter((q) => tags.includes(q.category));
  }, [remote, categoryId]);

  const renderArticle = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard item={item} colors={colors} categoryColor={category?.color ?? colors.primary} />
    ),
    [colors, category],
  );

  if (!category) return null;

  const headerComponent = (
    <>
      <LinearGradient
        colors={category.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Ionicons name={category.icon as any} size={40} color="#FFFFFF" />
        <Text style={styles.heroTitle}>{category.title}</Text>
        <Text style={styles.heroSubtitle}>{category.subtitle}</Text>
        <Text style={styles.heroDesc}>{category.description}</Text>
      </LinearGradient>

      {relatedQuotes.length > 0 && (
        <View style={[styles.quoteBox, { backgroundColor: colors.gold + '12', borderColor: colors.gold + '30' }]}>
          <Ionicons name="chatbubble-ellipses" size={16} color={colors.gold} />
          <Text style={[styles.quoteText, { color: colors.text }]}>
            &ldquo;{relatedQuotes[0].text}&rdquo;
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.gold }]}>— {relatedQuotes[0].author}</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Artikel ({articles.length})</Text>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{category.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderArticle}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default memo(CategoryDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', flex: 1, textAlign: 'center' },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: '#FFFFFF', marginTop: Spacing.md, textAlign: 'center' },
  heroSubtitle: { fontSize: FontSize.md, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroDesc: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  quoteBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  quoteText: { fontSize: FontSize.md, fontStyle: 'italic', lineHeight: 22 },
  quoteAuthor: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'right' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  articleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleContent: { flex: 1 },
  articleTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  articleSummary: { fontSize: FontSize.sm, lineHeight: 18, marginBottom: 4 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  articleMetaText: { fontSize: FontSize.xs },
  articleMetaDot: { fontSize: FontSize.xs },
});
