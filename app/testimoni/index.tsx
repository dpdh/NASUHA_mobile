import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SAMPLE_TESTIMONIALS } from '../../constants/data';
import { BorderRadius, Colors, FontSize, Shadows, Spacing, getColors } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import type { ApiResult } from '../../services/api';
import { testimonialApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';
import type { Testimonial } from '../../types';

const FALLBACK_TESTIMONIALS: Testimonial[] = SAMPLE_TESTIMONIALS.map((item) => ({
  ...item,
  id: String(item.id),
  kordaLabel: item.korda,
}));

const TestimonialCard = memo(({ item, colors }: { item: Testimonial; colors: typeof Colors.light }) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
    <View style={styles.cardHeader}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <View style={styles.row}>
          <View style={[styles.programBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.programText, { color: colors.gold }]}>{item.program}</Text>
          </View>
          {(item.kordaLabel || item.korda) && (
            <View style={[styles.kordaBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="location" size={9} color={colors.primary} />
              <Text style={[styles.kordaText, { color: colors.primary }]} numberOfLines={1}>{item.kordaLabel || item.korda}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < item.rating ? 'star' : 'star-outline'} size={14} color={colors.gold} />
      ))}
      <Text style={[styles.date, { color: colors.textMuted }]}>{new Date(item.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</Text>
    </View>
    <Text style={[styles.text, { color: colors.textSecondary }]}>{item.text}</Text>
    {item.photo ? <Image source={{ uri: item.photo }} style={styles.photo} resizeMode="cover" /> : null}
  </View>
));

function TestimoniScreen() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const colors = getColors(colorScheme)[theme];
  const references = useAppStore((s) => s.references);
  const [activeKorda, setActiveKorda] = useState('Semua');
  const { data, loading, refreshing, refresh } = useApiQuery<ApiResult<Testimonial[]>>(
    () => testimonialApi.list({ korda: activeKorda === 'Semua' ? undefined : activeKorda, perPage: 50 }),
    [activeKorda],
    {
      cacheKey: `testimonials_${activeKorda}`,
      refetchOnFocus: true,
      fallback: activeKorda === 'Semua' ? { data: FALLBACK_TESTIMONIALS } : undefined,
    },
  );
  // Ringkasan total & jumlah per korda (selalu dari daftar "Semua") untuk chip filter.
  const { data: summary } = useApiQuery(
    () => testimonialApi.list({ perPage: 1 }).then((result) => ({
      total: result.meta?.total ?? 0,
      kordaCounts: (result.meta?.kordaCounts as Record<string, number> | undefined) ?? {},
    })),
    [],
    { cacheKey: 'testimonials_summary', refetchOnFocus: true },
  );

  const filtered = data?.data ?? [];
  const totalCount = summary?.total ?? (activeKorda === 'Semua' ? filtered.length : 0);
  const kordaChips = useMemo(
    () => (references?.kordas ?? []).filter((korda) => (summary?.kordaCounts[korda.id] ?? 0) > 0),
    [references, summary],
  );
  const activeLabel = activeKorda === 'Semua' ? 'Semua' : references?.kordas.find((korda) => korda.id === activeKorda)?.label || activeKorda;

  const renderItem = useCallback(
    ({ item }: { item: Testimonial }) => <TestimonialCard item={item} colors={colors} />,
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Testimoni Sahabat</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{totalCount} cerita sahabat NASUHA</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Korda Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[{ id: 'Semua', label: 'Semua' }, ...kordaChips].map((k) => {
          const isActive = activeKorda === k.id;
          const count = k.id === 'Semua' ? totalCount : summary?.kordaCounts[k.id] ?? 0;
          return (
            <Pressable
              key={k.id}
              onPress={() => setActiveKorda(k.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  shadowOpacity: isActive ? 0.2 : 0,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                {k.label.replace('Korda ', '')}
              </Text>
              <View style={[styles.filterCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : colors.border }]}>
                <Text style={[styles.filterCountText, { color: isActive ? '#FFF' : colors.textMuted }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada testimoni dari {activeLabel}</Text>
            </View>
          )
        }
      />

      {/* FAB Tulis Testimoni */}
      <Pressable onPress={() => router.push('/testimoni/add' as any)} style={[styles.fab, { backgroundColor: colors.gold }, Shadows.md]}>
        <Ionicons name="create" size={24} color="#FFF" />
      </Pressable>
    </View>
  );
}

export default memo(TestimoniScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: 0.2 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2, letterSpacing: 0.1 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
  },
  filterText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.1 },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountText: { fontSize: 9, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.lg },
  name: { fontSize: FontSize.lg, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  programBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm, maxWidth: '60%' },
  programText: { fontSize: FontSize.xs, fontWeight: '700' },
  kordaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, maxWidth: '38%' },
  kordaText: { fontSize: 10, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.sm },
  date: { fontSize: FontSize.xs, marginLeft: 'auto' },
  text: { fontSize: FontSize.md, lineHeight: 22 },
  photo: { width: '100%', height: 180, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
