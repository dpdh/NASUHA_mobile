import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { eventApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';
import type { Event } from '../../types';

const EVENT_CATEGORIES = ['Semua', 'TSN', 'LBU', 'Kajian', 'KFM', 'TOT', 'Scale Up Bisnis', 'Safari Dakwah', 'Digital Marketing', 'Public Speaking', 'Business Coaching', 'Sosial', 'Lainnya'];

function EventTabScreen() {
  const theme = useAppStore((s) => s.theme);
  const references = useAppStore((s) => s.references);
  const user = useAppStore((s) => s.user);
  const isStaff = useAppStore((s) => s.isStaff);
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('Semua');
  const { data, loading, refreshing, refresh, error } = useApiQuery(
    () => eventApi.list({ perPage: 50 }).then((result) => result.data),
    [user?.id],
    { cacheKey: 'events_upcoming', refetchOnFocus: true },
  );

  const categories = useMemo(
    () => (references?.eventTypes?.length ? ['Semua', ...references.eventTypes.map((type) => type.id)] : EVENT_CATEGORIES),
    [references],
  );

  const allEvents = useMemo(() => {
    let list = (data || []).filter((e) => (e.status || 'published') !== 'cancelled');
    if (filter !== 'Semua') list = list.filter((e) => e.type === filter);
    return list;
  }, [data, filter]);

  const renderItem = useCallback(
    ({ item }: { item: Event }) => {
      const pct = item.quota > 0 ? Math.min(100, Math.round((item.registered / item.quota) * 100)) : 0;
      return (
        <Pressable
          onPress={() => router.push(`/event/${item.id}` as any)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
        >
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{item.type}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.date}</Text>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.time}</Text>
          </View>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.locText, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
          </View>
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
          <View style={styles.footer}>
            <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 90 ? colors.warning : colors.primary }]} />
            </View>
            <Text style={[styles.quota, { color: colors.textMuted }]}>{item.registered}/{item.quota}</Text>
          </View>
          <View style={styles.btnRow}>
            <Pressable
              onPress={(pressEvent) => {
                pressEvent.stopPropagation();
                router.push(`/event/${item.id}` as any);
              }}
              style={[styles.detailBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.detailBtnText, { color: colors.primary }]}>DETAIL EVENT</Text>
            </Pressable>
            <Pressable
              onPress={(pressEvent) => {
                pressEvent.stopPropagation();
                router.push(`/event/${item.id}?register=1` as any);
              }}
              style={[styles.daftarBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.daftarBtnText}>DAFTAR</Text>
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + Spacing.md }]}> 
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Event NASUHA</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Jakarta & Sekitarnya</Text>
          </View>
          {isStaff() && (
            <Pressable onPress={() => router.push('/event/add' as any)} style={[styles.manageBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.manageBtnText}>Kelola</Text>
            </Pressable>
          )}
        </View>
      </View>
      {/* Event categories */}
      <View style={[styles.filterSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Kategori Event</Text>
            <Text style={[styles.filterSub, { color: colors.textSecondary }]}>{categories.length - 1} kategori tersedia</Text>
          </View>
          <Ionicons name="options-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.filterGrid}>
          {categories.map((category) => {
            const active = category === filter;
            return (
              <Pressable
                key={category}
                onPress={() => setFilter(category)}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                {active && <Ionicons name="checkmark" size={13} color="#FFF" />}
                <Text style={[styles.filterText, { color: active ? '#FFF' : colors.textSecondary }]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FlatList
        data={allEvents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error ? error : 'Belum ada event mendatang.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

export default memo(EventTabScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.02)' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: 0.2 },
  headerSub: { fontSize: FontSize.sm, marginTop: 2, letterSpacing: 0.08 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full },
  manageBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '700' },
  empty: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
  filterSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  filterIcon: { width: 30, height: 30, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  filterTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  filterSub: { fontSize: FontSize.xs, marginTop: 1 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(148, 163, 184, 0.25)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.08 },
  filterText: { fontSize: FontSize.xs, fontWeight: '600', flexShrink: 1 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.sm },
  badgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  title: { fontSize: FontSize.lg, fontWeight: '700', marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: FontSize.sm },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { fontSize: FontSize.xs, flex: 1 },
  desc: { fontSize: FontSize.sm, lineHeight: 18, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  quota: { fontSize: FontSize.xs },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  detailBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  detailBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  daftarBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.lg, alignItems: 'center' },
  daftarBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '700' },
});
