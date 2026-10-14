import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { MOTIVASI_CATEGORIES, MOTIVASI_ARTICLES } from '../../constants/data';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';
import type { MotivasiCategory } from '../../types';

type Category = MotivasiCategory;

// Konten bawaan app dipakai bila server belum terjangkau.
const FALLBACK_CATEGORIES: Category[] = MOTIVASI_CATEGORIES.map((category) => ({
  ...category,
  gradient: [...category.gradient],
  articlesCount: MOTIVASI_ARTICLES.filter((article) => article.categoryId === category.id).length,
}));

const CategoryCard = memo(({ item, colors }: { item: Category; colors: typeof Colors.light }) => {
  const articleCount = item.articlesCount ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
        Shadows.md,
      ]}
      onPress={() => router.push(`/motivasi/${item.id}` as any)}
    >
      <LinearGradient
        colors={item.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Ionicons name={item.icon as any} size={28} color="#FFFFFF" />
      </LinearGradient>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardSubtitle, { color: item.color }]}>{item.subtitle}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.articleCount, { backgroundColor: item.color + '15' }]}>
          <Ionicons name="document-text-outline" size={12} color={item.color} />
          <Text style={[styles.articleCountText, { color: item.color }]}>{articleCount} artikel</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
});

function MotivasiScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const { data: categories } = useApiQuery(() => contentApi.motivasiCategories(), [], {
    cacheKey: 'motivasi_categories',
    fallback: FALLBACK_CATEGORIES,
  });

  const renderItem = useCallback(
    ({ item }: { item: Category }) => <CategoryCard item={item} colors={colors} />,
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Motivasi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.banner, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name="sparkles" size={20} color={colors.gold} />
        <Text style={[styles.bannerText, { color: colors.text }]}>
          Perbaiki diri, kembangkan potensi, raih keberlimpahan hidup yang berkah
        </Text>
      </View>

      <FlatList
        data={categories?.length ? categories : FALLBACK_CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default memo(MotivasiScreen);

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
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  bannerText: { fontSize: FontSize.sm, fontWeight: '600', flex: 1 },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  cardContent: { marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 2 },
  cardSubtitle: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.xs },
  cardDesc: { fontSize: FontSize.md, lineHeight: 20 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  articleCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  articleCountText: { fontSize: FontSize.xs, fontWeight: '700' },
});
