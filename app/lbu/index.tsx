import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { LBU_INFO, SAMPLE_TESTIMONIALS } from '../../constants/data';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi, eventApi, testimonialApi } from '../../services/nasjakApi';
import type { Testimonial } from '../../types';

const LOGO_BADGE = require('../../assets/images/logo-badge.png');

const TIMELINE_STEPS = [
  { num: 1, title: 'SADAR', desc: 'Menyadari kondisi utang dan dampak riba', icon: 'eye-outline' as const },
  { num: 2, title: 'TAUBAT', desc: 'Bertaubat dan berniat meninggalkan riba', icon: 'heart-outline' as const },
  { num: 3, title: 'EVALUASI', desc: 'Mengevaluasi seluruh kondisi keuangan', icon: 'clipboard-outline' as const },
  { num: 4, title: 'SUSUN STRATEGI', desc: 'Menyusun langkah ikhtiar pelunasan', icon: 'map-outline' as const },
  { num: 5, title: 'IKHTIAR', desc: 'Menjalankan rencana dengan istiqamah', icon: 'fitness-outline' as const },
  { num: 6, title: 'BEBAS UTANG', desc: 'Alhamdulillah, terbebas dari jeratan riba!', icon: 'trophy-outline' as const },
];

type TimelineStep = { num: number; title: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'] };
type ProgramCta = { label?: string; type?: 'whatsapp' | 'url' | 'route'; value?: string };

const FALLBACK_TESTIMONIALS: Testimonial[] = SAMPLE_TESTIMONIALS
  .filter((t) => t.program === 'LBU')
  .slice(0, 2)
  .map((t) => ({ ...t, id: String(t.id) }));

function openCta(cta?: ProgramCta) {
  if (!cta?.value) {
    router.push('/korda' as any);
    return;
  }
  if (cta.type === 'whatsapp') Linking.openURL(`https://wa.me/${cta.value.replace(/[^0-9]/g, '')}`).catch(() => {});
  else if (cta.type === 'url') Linking.openURL(cta.value).catch(() => {});
  else router.push(cta.value as any);
}

function formatRupiah(num: number): string {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(0)} M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function LBUScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const { data: program } = useApiQuery(() => contentApi.program('lbu'), [], { cacheKey: 'program_lbu' });
  const { data: testimonials = FALLBACK_TESTIMONIALS } = useApiQuery(
    () => testimonialApi.list({ program: 'LBU', perPage: 2 }).then((result) => result.data),
    [],
    { cacheKey: 'lbu_testimonials', fallback: FALLBACK_TESTIMONIALS },
  );
  const { data: lbuEvents = [] } = useApiQuery(
    () => eventApi.list({ type: 'LBU' }).then((result) => result.data),
    [],
    { cacheKey: 'lbu_events', refetchOnFocus: true },
  );

  const info = {
    title: program?.title || LBU_INFO.title,
    description: program?.description || LBU_INFO.description,
    stats: { ...LBU_INFO.stats, ...((program?.data?.stats as Partial<typeof LBU_INFO.stats>) ?? {}) },
  };
  const steps = (program?.data?.steps as TimelineStep[] | undefined)?.length ? (program!.data.steps as TimelineStep[]) : TIMELINE_STEPS;
  const cta = program?.data?.cta as ProgramCta | undefined;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient colors={['#D4A853', '#B8860B']} style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Image source={LOGO_BADGE} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroTitle}>{info.title}</Text>
        <Text style={styles.heroTagline}>Bukan Sekadar Melunasi Utang, Tetapi Mengubah Cara Hidup.</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
        <ShimmerGold style={styles.shimmer} />
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{info.stats.totalLBU}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Event</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{(info.stats.totalPeserta / 1000).toFixed(1)}K</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peserta</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.gold }]}>{formatRupiah(info.stats.totalLunas)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Lunas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.success }]}>{info.stats.persentaseSukses}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sukses</Text>
          </View>
        </View>
      </View>

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>Apa itu LBU?</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{info.description}</Text>
      </View>

      {/* Timeline */}
      <Text style={[styles.timelineTitle, { color: colors.text }]}>Timeline Program LBU</Text>
      <View style={styles.timeline}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <View key={step.num} style={styles.timelineItem}>
              {/* Line */}
              {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.gold + '40' }]} />}
              {/* Circle */}
              <LinearGradient
                colors={isLast ? ['#2EC4B6', '#0E8C7F'] : ['#D4A853', '#B8860B']}
                style={styles.timelineCircle}
              >
                <Ionicons name={step.icon} size={18} color="#FFF" />
              </LinearGradient>
              {/* Content */}
              <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.timelineNum, { color: colors.gold }]}>Langkah {step.num}</Text>
                <Text style={[styles.timelineStepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Testimoni Alumni */}
      <Text style={[styles.timelineTitle, { color: colors.text }]}>Testimoni Alumni LBU</Text>
      {testimonials.map((t) => (
        <View key={t.id} style={[styles.testimonialCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.testimonialHeader}>
            <View style={[styles.testimonialAvatar, { backgroundColor: colors.gold }]}>
              <Text style={styles.testimonialAvatarText}>{t.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.testimonialName, { color: colors.text }]}>{t.name}</Text>
              <View style={[styles.lunasBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.lunasText, { color: colors.success }]}>LUNAS UTANG</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.testimonialText, { color: colors.textSecondary }]} numberOfLines={3}>{t.text}</Text>
        </View>
      ))}

      {/* Events */}
      {lbuEvents.length > 0 && (
        <>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>Event LBU Mendatang</Text>
          {lbuEvents.map((e) => (
            <Pressable key={e.id} onPress={() => router.push(`/event/${e.id}` as any)} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
              <Text style={[styles.eventTitle, { color: colors.text }]}>{e.title}</Text>
              <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{e.date} • {e.location}</Text>
            </Pressable>
          ))}
        </>
      )}

      {/* CTA */}
      <Pressable onPress={() => openCta(cta)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={['#D4A853', '#B8860B']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="rocket" size={22} color="#FFF" />
          <Text style={styles.ctaText}>{cta?.label || 'DAFTAR LBU'}</Text>
        </LinearGradient>
      </Pressable>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

export default memo(LBUScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  heroLogo: { width: 72, height: 72, marginBottom: Spacing.md },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center' },
  heroTagline: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, textAlign: 'center', marginTop: 6, lineHeight: 18, fontStyle: 'italic' },
  statsCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmer: { height: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md },
  statItem: { width: '50%', alignItems: 'center', paddingVertical: Spacing.sm },
  statVal: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  section: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  desc: { fontSize: FontSize.md, lineHeight: 22 },
  timelineTitle: { fontSize: FontSize.xl, fontWeight: '700', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  timeline: { marginHorizontal: Spacing.lg },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, position: 'relative' },
  timelineLine: { position: 'absolute', left: 18, top: 38, bottom: -8, width: 2 },
  timelineCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineContent: { flex: 1, marginLeft: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  timelineNum: { fontSize: FontSize.xs, fontWeight: '700' },
  timelineStepTitle: { fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },
  timelineDesc: { fontSize: FontSize.sm, marginTop: 2, lineHeight: 18 },
  testimonialCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  testimonialAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  testimonialAvatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  testimonialName: { fontSize: FontSize.md, fontWeight: '700' },
  lunasBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  lunasText: { fontSize: FontSize.xs, fontWeight: '800' },
  testimonialText: { fontSize: FontSize.sm, lineHeight: 18 },
  eventCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  eventTitle: { fontSize: FontSize.md, fontWeight: '700' },
  eventMeta: { fontSize: FontSize.xs, marginTop: 4 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.xl, gap: Spacing.sm },
  ctaText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
});
