import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { TSN_INFO, LBU_INFO, SAMPLE_TESTIMONIALS } from '../../constants/data';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi, eventApi, testimonialApi } from '../../services/nasjakApi';
import type { Testimonial } from '../../types';

const LOGO_BADGE = require('../../assets/images/logo-badge.png');
const LOGO_KAWANATA = require('../../assets/images/logo-kawanata.png');

interface CommunitySection {
  id: string;
  type: 'tsn' | 'lbu' | 'testimonial' | 'event';
}

const FALLBACK_TESTIMONIALS: Testimonial[] = SAMPLE_TESTIMONIALS.slice(0, 5).map((item) => ({ ...item, id: String(item.id) }));

const SECTIONS: CommunitySection[] = [
  { id: 'tsn', type: 'tsn' },
  { id: 'lbu', type: 'lbu' },
  { id: 'testimonials', type: 'testimonial' },
  { id: 'events', type: 'event' },
];

function CommunityScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];

  const { data: tsnProgram } = useApiQuery(() => contentApi.program('tsn'), [], { cacheKey: 'program_tsn' });
  const { data: lbuProgram } = useApiQuery(() => contentApi.program('lbu'), [], { cacheKey: 'program_lbu' });
  const { data: testimonials = FALLBACK_TESTIMONIALS } = useApiQuery(
    () => testimonialApi.list({ perPage: 5 }).then((result) => result.data),
    [],
    { cacheKey: 'community_testimonials', fallback: FALLBACK_TESTIMONIALS },
  );
  const { data: events = [] } = useApiQuery(
    () => eventApi.list({ perPage: 2 }).then((result) => result.data),
    [],
    { cacheKey: 'community_events', refetchOnFocus: true },
  );

  const tsnInfo = useMemo(() => ({
    title: tsnProgram?.title || TSN_INFO.title,
    subtitle: tsnProgram?.subtitle || TSN_INFO.subtitle,
    description: tsnProgram?.description || TSN_INFO.description,
    benefits: (tsnProgram?.data?.benefits as string[] | undefined) ?? TSN_INFO.benefits,
  }), [tsnProgram]);
  const lbuInfo = useMemo(() => ({
    title: lbuProgram?.title || LBU_INFO.title,
    subtitle: lbuProgram?.subtitle || LBU_INFO.subtitle,
    stats: { ...LBU_INFO.stats, ...((lbuProgram?.data?.stats as Partial<typeof LBU_INFO.stats>) ?? {}) },
  }), [lbuProgram]);

  const renderItem = useCallback(
    ({ item }: { item: CommunitySection }) => {
      switch (item.type) {
        case 'tsn':
          return (
            <Pressable onPress={() => router.push('/tsn/' as any)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
              <ShimmerGold style={styles.shimmerTop} />
              <View style={styles.cardRow}>
                <Image source={LOGO_KAWANATA} style={styles.cardLogo} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{tsnInfo.title}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{tsnInfo.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{tsnInfo.description}</Text>
              <View style={styles.benefitRow}>
                {tsnInfo.benefits.slice(0, 2).map((b, i) => (
                  <View key={i} style={[styles.benefitChip, { backgroundColor: colors.surface }]}>
                    <Ionicons name="checkmark" size={12} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]} numberOfLines={1}>{b}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        case 'lbu':
          return (
            <Pressable onPress={() => router.push('/lbu/' as any)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
              <LinearGradient colors={[colors.gold, colors.goldDeep]} style={styles.lbuBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Image source={LOGO_BADGE} style={styles.lbuBadge} resizeMode="contain" />
                <View>
                  <Text style={styles.lbuTitle}>{lbuInfo.title}</Text>
                  <Text style={styles.lbuSub}>{lbuInfo.subtitle}</Text>
                </View>
              </LinearGradient>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: colors.primary }]}>{lbuInfo.stats.totalLBU}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Event</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: colors.primary }]}>{(lbuInfo.stats.totalPeserta / 1000).toFixed(1)}K</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peserta</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: colors.gold }]}>{lbuInfo.stats.persentaseSukses}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sukses</Text>
                </View>
              </View>
            </Pressable>
          );
        case 'testimonial':
          return (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Testimoni Sahabat</Text>
              {testimonials.map((t) => (
                <View key={t.id} style={[styles.testimonialCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
                  <View style={styles.testimonialHeader}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>{t.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.testimonialName, { color: colors.text }]}>{t.name}</Text>
                      <Text style={[styles.testimonialProgram, { color: colors.gold }]}>{t.program}</Text>
                    </View>
                    <View style={styles.ratingRow}>
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color={colors.gold} />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.testimonialText, { color: colors.textSecondary }]} numberOfLines={3}>{t.text}</Text>
                </View>
              ))}
            </View>
          );
        case 'event':
          return (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Mendatang</Text>
              {events.length === 0 && (
                <Text style={[styles.eventDate, { color: colors.textSecondary }]}>Belum ada event mendatang.</Text>
              )}
              {events.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push(`/event/${e.id}` as any)}
                  style={[styles.eventMini, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
                >
                  <View style={[styles.eventBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.eventBadgeText}>{e.type}</Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{e.title}</Text>
                  <Text style={[styles.eventDate, { color: colors.textSecondary }]}>{e.date} • {e.time}</Text>
                </Pressable>
              ))}
            </View>
          );
        default:
          return null;
      }
    },
    [colors, tsnInfo, lbuInfo, testimonials, events],
  );

  return (
    <FlatList
      data={SECTIONS}
      keyExtractor={(s) => s.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Komunitas</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Bersahabat di Dunia, Bertetangga di Surga</Text>
        </View>
      }
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

export default memo(CommunityScreen);

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  card: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmerTop: { height: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  cardLogo: { width: 44, height: 44 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  cardSub: { fontSize: FontSize.xs },
  cardDesc: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, fontSize: FontSize.sm },
  benefitRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  benefitChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm, gap: 4, flex: 1 },
  benefitText: { fontSize: FontSize.xs, flex: 1 },
  lbuBanner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  lbuBadge: { width: 48, height: 48 },
  lbuTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
  lbuSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  statsGrid: { flexDirection: 'row', padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  testimonialCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  testimonialName: { fontSize: FontSize.md, fontWeight: '700' },
  testimonialProgram: { fontSize: FontSize.xs, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 1 },
  testimonialText: { fontSize: FontSize.sm, lineHeight: 20 },
  eventMini: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  eventBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: 4 },
  eventBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  eventTitle: { fontSize: FontSize.md, fontWeight: '700' },
  eventDate: { fontSize: FontSize.xs, marginTop: 2 },
});
