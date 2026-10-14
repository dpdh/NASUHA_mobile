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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';

type KegiatanItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  gradient: string[];
  schedule: string;
  howToJoin: string;
  stats: { events: number; beneficiaries: number; volunteers: number };
};

function compact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')}K+`;
  return `${value}+`;
}

const KEGIATAN: KegiatanItem[] = [
  {
    id: 'air-minum',
    title: 'Air Minum Gratis',
    subtitle: 'Berbagi air minum untuk sesama',
    description: 'Program distribusi air minum gratis di area publik seperti stasiun, terminal, dan tempat keramaian. Menyebarkan kebaikan melalui segelas air.',
    icon: 'water',
    gradient: ['#00B4D8', '#0077B6'],
    schedule: 'Setiap Jumat & hari besar Islam',
    howToJoin: 'Hubungi koordinator korda terdekat atau daftar melalui TSN',
    stats: { events: 120, beneficiaries: 15000, volunteers: 500 },
  },
  {
    id: 'jenguk-sakit',
    title: 'Jenguk Sahabat Sakit',
    subtitle: 'Meringankan beban sahabat',
    description: 'Program kunjungan dan bantuan kepada sahabat NASUHA yang sedang sakit. Memberi dukungan moral, doa bersama, dan bantuan finansial jika diperlukan.',
    icon: 'heart' as const,
    gradient: ['#FF6B6B', '#C44569'],
    schedule: 'Setiap ada sahabat yang membutuhkan',
    howToJoin: 'Laporkan melalui grup korda atau hubungi pengurus',
    stats: { events: 85, beneficiaries: 200, volunteers: 350 },
  },
  {
    id: 'safari-dakwah',
    title: 'Safari Dakwah',
    subtitle: 'Dakwah keliling anti-riba',
    description: 'Safari dakwah ke berbagai masjid dan komunitas di seluruh Indonesia. Menyebarkan edukasi tentang bahaya riba dan solusi keuangan syariah.',
    icon: 'megaphone' as const,
    gradient: ['#7B61FF', '#9D8FFF'],
    schedule: 'Minimal 2x sebulan',
    howToJoin: 'Daftar sebagai relawan dakwah melalui CMS Admin atau koordinator korda',
    stats: { events: 200, beneficiaries: 25000, volunteers: 400 },
  },
  {
    id: 'baksos',
    title: 'Bakti Sosial',
    subtitle: 'Berbagi kebahagiaan',
    description: 'Kegiatan bakti sosial umum: pembagian sembako, santunan yatim, bantuan bencana, dan kegiatan sosial lainnya yang mendekatkan diri kepada Allah.',
    icon: 'gift' as const,
    gradient: ['#D4A853', '#B8860B'],
    schedule: 'Ramadhan, Idul Adha, dan event khusus',
    howToJoin: 'Daftar melalui event NASUHA atau hubungi pengurus korda',
    stats: { events: 60, beneficiaries: 8000, volunteers: 600 },
  },
  {
    id: 'edukasi',
    title: 'Edukasi Anti-Riba',
    subtitle: 'Literasi keuangan syariah',
    description: 'Program edukasi anti-riba ke sekolah, kampus, dan komunitas. Memberikan pemahaman tentang bahaya riba dan alternatif keuangan syariah.',
    icon: 'school' as const,
    gradient: ['#2EC4B6', '#0E8C7F'],
    schedule: 'Sesuai undangan atau jadwal bulanan',
    howToJoin: 'Hubungi tim edukasi NASUHA atau ajukan permohonan kunjungan',
    stats: { events: 150, beneficiaries: 20000, volunteers: 250 },
  },
];

function KegiatanScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const { data } = useApiQuery(
    () => contentApi.programs('kegiatan').then((result) => ({
      items: result.data.map<KegiatanItem>((program) => ({
        id: program.id,
        title: program.title,
        subtitle: program.subtitle,
        description: program.description,
        icon: program.icon as KegiatanItem['icon'],
        gradient: program.gradient,
        schedule: program.data?.schedule ?? '-',
        howToJoin: program.data?.howToJoin ?? '-',
        stats: { events: 0, beneficiaries: 0, volunteers: 0, ...(program.data?.stats ?? {}) },
      })),
      summary: result.meta?.kegiatanSummary as KegiatanItem['stats'] | undefined,
    })),
    [],
    { cacheKey: 'programs_kegiatan' },
  );
  const items = data?.items?.length ? data.items : KEGIATAN;
  const summary = data?.summary ?? items.reduce(
    (total, item) => ({
      events: total.events + item.stats.events,
      beneficiaries: total.beneficiaries + item.stats.beneficiaries,
      volunteers: total.volunteers + item.stats.volunteers,
    }),
    { events: 0, beneficiaries: 0, volunteers: 0 },
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + Spacing.md }]}> 
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Kegiatan Sosial</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Program sosial NASUHA untuk umat</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <Text style={[styles.summaryTitle, { color: colors.gold }]}>Dampak Sosial NASUHA</Text>
          <View style={styles.summaryGrid}>
            {[
              { val: compact(summary.events), label: 'Kegiatan', icon: 'calendar' },
              { val: compact(summary.beneficiaries), label: 'Penerima Manfaat', icon: 'people' },
              { val: compact(summary.volunteers), label: 'Relawan', icon: 'hand-left' },
            ].map((s) => (
              <View key={s.label} style={styles.summaryItem}>
                <Ionicons name={s.icon as any} size={20} color={colors.gold} />
                <Text style={[styles.summaryVal, { color: colors.text }]}>{s.val}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Program Cards */}
        {items.map((k) => (
          <View key={k.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <LinearGradient colors={k.gradient as [string, string]} style={styles.cardGradient}>
              <Ionicons name={k.icon} size={32} color="#FFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{k.title}</Text>
                <Text style={styles.cardSubtitle}>{k.subtitle}</Text>
              </View>
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{k.description}</Text>

              <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Jadwal:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{k.schedule}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-add-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Cara Ikut:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{k.howToJoin}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                  <Ionicons name="flag" size={12} color={colors.primary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{k.stats.events} event</Text>
                </View>
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                  <Ionicons name="people" size={12} color={colors.primary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{k.stats.beneficiaries.toLocaleString('id-ID')} penerima</Text>
                </View>
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                  <Ionicons name="hand-left" size={12} color={colors.primary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{k.stats.volunteers} relawan</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default memo(KegiatanScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  summaryCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  summaryTitle: { fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md },
  summaryGrid: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryVal: { fontSize: FontSize.xl, fontWeight: '800' },
  summaryLabel: { fontSize: FontSize.xs },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  cardGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  cardTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
  cardSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 2 },
  cardBody: { padding: Spacing.md },
  cardDesc: { fontSize: FontSize.sm, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  infoLabel: { fontSize: FontSize.xs, fontWeight: '700', minWidth: 50 },
  infoValue: { fontSize: FontSize.xs, flex: 1 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statText: { fontSize: FontSize.xs },
});
