import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Alert,
    Text,
    View
} from 'react-native';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { questionApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';
import type { Question } from '../../types';

const DEFAULT_CATEGORIES = ['Keuangan Syariah', 'Hijrah', 'Fiqh', 'Bisnis', 'Umum'];
const CATEGORY_META: Record<string, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  Semua: { color: '#2EC4B6', icon: 'grid-outline' },
  'Keuangan Syariah': { color: '#2EC4B6', icon: 'wallet-outline' },
  Hijrah: { color: '#7B61FF', icon: 'compass-outline' },
  Fiqh: { color: '#D4A853', icon: 'book-outline' },
  Bisnis: { color: '#FF6B6B', icon: 'briefcase-outline' },
  Umum: { color: '#4A90D9', icon: 'people-outline' },
};
const DEFAULT_META = { color: '#4A90D9', icon: 'help-circle-outline' as const };
const CAT_COLORS: Record<string, string> = Object.fromEntries(Object.entries(CATEGORY_META).map(([key, meta]) => [key, meta.color]));

const QuestionCard = memo(({ item, colors }: { item: Question; colors: typeof Colors.light }) => (
  <Pressable onPress={() => router.push(`/tanya/${item.id}` as any)}
    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: CAT_COLORS[item.category] || colors.primary }]}>
        <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[item.category] || colors.primary) + '20' }]}>
            <Text style={[styles.catText, { color: CAT_COLORS[item.category] || colors.primary }]}>{item.category}</Text>
          </View>
          <Text style={[styles.date, { color: colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString('id-ID')}</Text>
        </View>
      </View>
    </View>
    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
    <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
    <View style={styles.footer}>
      <View style={styles.footerItem}>
        <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{item.answersCount} jawaban</Text>
      </View>
      {item.hasOfficialAnswer && (
        <View style={styles.footerItem}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.footerText, { color: colors.success, fontWeight: '700' }]}>Dijawab Ustadz</Text>
        </View>
      )}
    </View>
  </Pressable>
));
QuestionCard.displayName = 'QuestionCard';

function TanyaIndexScreen() {
  const theme = useAppStore((s) => s.theme);
  const references = useAppStore((s) => s.references);
  const user = useAppStore((s) => s.user);
  const hasFeature = useAppStore((s) => s.hasFeature);
  const colors = Colors[theme];
  const [filter, setFilter] = useState('Semua');
  const categories = ['Semua', ...(references?.questionCategories?.length ? references.questionCategories : DEFAULT_CATEGORIES)];

  const openAdd = () => {
    if (!user) {
      Alert.alert('Login Diperlukan', 'Silakan login terlebih dahulu untuk bertanya.', [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    if (!hasFeature('tanya') && user.role !== 'ustadz') {
      Alert.alert('Fitur Khusus Member', 'Tanya Ustadz tersedia untuk member. Hubungi admin atau korda Anda untuk upgrade membership.');
      return;
    }
    router.push('/tanya/add' as any);
  };

  // Server sudah mengurutkan terbaru dulu; tidak ada sort in-place di sini.
  const { data, loading, refreshing, refresh, error } = useApiQuery(
    () => questionApi.list({ category: filter === 'Semua' ? undefined : filter, perPage: 50 }).then((result) => result.data),
    [filter],
    { cacheKey: `questions_${filter}`, refetchOnFocus: true },
  );
  const filtered: Question[] = data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tanya Sahabat</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Konsultasi antar sahabat NASUHA</Text>
        </View>
      </View>

      <View style={styles.filterWrap}>
        {categories.map((c) => {
          const meta = CATEGORY_META[c] || DEFAULT_META;
          const active = filter === c;
          return (
            <Pressable
              key={c}
              onPress={() => setFilter(c)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? meta.color : colors.surface,
                  borderColor: active ? meta.color : colors.border,
                },
              ]}
            >
              <Ionicons name={meta.icon} size={14} color={active ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.filterText, { color: active ? '#FFF' : colors.textSecondary }]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <QuestionCard item={item} colors={colors} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'chatbubbles-outline'} size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? 'Gagal memuat pertanyaan' : 'Belum ada pertanyaan'}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error || 'Jadilah yang pertama bertanya!'}</Text>
            </View>
          )
        }
      />

      <Pressable onPress={openAdd} style={[styles.fab, { backgroundColor: colors.primary }, Shadows.md]}>
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

export default memo(TanyaIndexScreen);

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
  headerSub: { fontSize: FontSize.sm, marginTop: 2, letterSpacing: 0.08 },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
  },
  filterText: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.md },
  userName: { fontSize: FontSize.sm, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  catText: { fontSize: FontSize.xs, fontWeight: '700' },
  date: { fontSize: FontSize.xs },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.sm },
  body: { fontSize: FontSize.sm, lineHeight: 20, marginTop: 4 },
  footer: { flexDirection: 'row', marginTop: Spacing.sm, gap: Spacing.md },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: FontSize.xs },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptyText: { fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
