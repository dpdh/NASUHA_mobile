import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';

type KfmTopic = { id: string; title: string; icon: React.ComponentProps<typeof Ionicons>['name']; gradient: string[]; items: string[] };
type KfmSection = { title: string; items: string[] };

const KFM_TOPICS: KfmTopic[] = [
  {
    id: 'fundamental',
    title: 'Fundamental Fiqih Muamalah',
    icon: 'book' as const,
    gradient: ['#0077B6', '#00B4D8'],
    items: [
      'Prinsip dasar muamalah',
      'Kaidah-kaidah fiqih muamalah',
      'Halal, haram, mubah, makruh',
      'Riba, gharar, maysir dan tadlis',
    ],
  },
  {
    id: 'akad',
    title: 'Akad-Akad Syariah',
    icon: 'document-text' as const,
    gradient: ['#2EC4B6', '#0E8C7F'],
    items: [
      'Akad jual beli',
      'Murabahah',
      'Mudharabah',
      'Musyarakah / Syirkah',
      'Ijarah',
      'Qardh',
      'Rahn',
      'Wakalah',
      'Kafalah',
      "Salam dan Istishna'",
    ],
  },
  {
    id: 'syirkah',
    title: 'Syirkah & Kerja Sama Bisnis',
    icon: 'people' as const,
    gradient: ['#7B61FF', '#9D8FFF'],
    items: [
      'Konsep partnership dalam Islam',
      'Pembagian modal dan keuntungan',
      'Pembagian risiko',
      'Hak dan kewajiban para pihak',
      'Kesalahan umum dalam akad kerja sama',
    ],
  },
  {
    id: 'jual-beli',
    title: 'Fiqih Jual Beli',
    icon: 'cart' as const,
    gradient: ['#D4A853', '#B8860B'],
    items: [
      'Syarat dan rukun jual beli',
      'Jual beli yang sah dan batal',
      'Utang-piutang',
      'Kredit dan cicilan',
      'Jual beli online',
      'Marketplace dan dropship',
      'Diskon, cashback, dan promo',
    ],
  },
  {
    id: 'utang',
    title: 'Fiqih Utang-Piutang',
    icon: 'cash' as const,
    gradient: ['#FF6B6B', '#C44569'],
    items: [
      'Adab berutang',
      'Akad qardh',
      'Tambahan dalam utang',
      'Denda dan keterlambatan',
      'Penyelesaian utang',
      'Perbedaan utang syariah dan transaksi ribawi',
    ],
  },
  {
    id: 'kontemporer',
    title: 'Muamalah Kontemporer',
    icon: 'phone-portrait' as const,
    gradient: ['#E67E22', '#F39C12'],
    items: [
      'Fintech',
      'Pinjaman online',
      'Paylater',
      'Kartu kredit',
      'Investasi',
      'Asuransi',
      'Cryptocurrency',
      'Transaksi digital',
    ],
  },
];

const TUJUAN = [
  'Memperbaiki cara kita bermuamalah',
  'Memperbaiki akad kita',
  'Memperbaiki transaksi kita',
  'Sehingga harta yang kita peroleh menjadi lebih berkah',
  'Kehidupan kita semakin dekat dengan ridha Allah',
];

const PERTANYAAN_HARTA = [
  'Dari mana diperoleh?',
  'Dengan akad apa?',
  'Bagaimana cara mendapatkannya?',
  'Bagaimana cara menggunakannya?',
  'Apakah di dalamnya terdapat riba atau unsur yang diharamkan Allah?',
];

function KfmScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const blinkAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const { data: program } = useApiQuery(() => contentApi.program('kfm'), [], { cacheKey: 'program_kfm' });
  const topics = (program?.data?.topics as KfmTopic[] | undefined)?.length ? (program!.data.topics as KfmTopic[]) : KFM_TOPICS;
  const sections = (program?.data?.sections as KfmSection[] | undefined) ?? [];
  const tujuan = sections.find((section) => section.title === 'Tujuan')?.items ?? TUJUAN;
  const pertanyaanHarta = sections.find((section) => section.title === 'Pertanyaan Harta')?.items ?? PERTANYAAN_HARTA;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 0.35, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [blinkAnim, floatAnim, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Kajian Fiqih Muamalah</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>KFM NASUHA</Text>
        </View>
        <View style={[styles.headerAction, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="book" size={18} color={colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.floatingPromo,
            {
              transform: [{ translateY: floatAnim }, { scale: pulseAnim }],
            },
          ]}
        >
          <Pressable
            onPress={() => router.push('/event' as any)}
            style={styles.floatingPromoButton}
          >
            <Animated.View style={[styles.floatingIconWrap, { opacity: blinkAnim }]}>
              <Ionicons name="information-circle" size={20} color="#FFF" />
            </Animated.View>
            <View style={styles.floatingTextWrap}>
              <Text style={styles.floatingEyebrow}>Seminar KFM</Text>
              <Text style={styles.floatingTitle}>Ikut kajian bersama Ust. Dr. M. Farhan Mauludi (UFM)</Text>
            </View>
          </Pressable>
        </Animated.View>
        {/* Intro Card */}
        <View style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <Text style={[styles.introTitle, { color: colors.primary }]}>Tentang KFM</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Kajian Fiqih Muamalah (KFM) adalah program edukasi dan pembinaan yang diselenggarakan oleh Komunitas NASUHA sebagai ikhtiar untuk membantu umat memahami, memperbaiki, dan menerapkan muamalah sesuai prinsip syariah dalam kehidupan sehari-hari.
          </Text>

          {/* Pembimbing */}
          <View style={[styles.mentorCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.mentorAvatar, { backgroundColor: colors.gold }]}>
              <Ionicons name="school" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mentorLabel, { color: colors.textMuted }]}>Dibimbing oleh:</Text>
              <Text style={[styles.mentorName, { color: colors.text }]}>Ust. Dr. Muhammad Farhan Mauludi, Lc., M.A.</Text>
            </View>
          </View>

          <Text style={[styles.introText, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
            Sahabat NASUHA diajak untuk tidak hanya memahami hukum halal dan haram, tetapi juga mengetahui bagaimana menjalankan transaksi, kerja sama, bisnis, dan aktivitas ekonomi dengan akad yang benar dan sesuai syariat.
          </Text>
        </View>

        {/* Fokus Kajian */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fokus Kajian KFM</Text>

        {topics.map((topic) => {
          const isExpanded = expandedTopic === topic.id;
          return (
            <Pressable
              key={topic.id}
              onPress={() => setExpandedTopic(isExpanded ? null : topic.id)}
              style={[styles.topicCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
            >
              <LinearGradient colors={topic.gradient as [string, string]} style={styles.topicGradient}>
                <Ionicons name={topic.icon} size={24} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
                <Text style={[styles.topicCount, { color: colors.textMuted }]}>{topic.items.length} materi</Text>
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />

              {isExpanded && (
                <View style={styles.topicItems}>
                  {topic.items.map((item, idx) => (
                    <View key={idx} style={styles.topicItemRow}>
                      <View style={[styles.bulletDot, { backgroundColor: topic.gradient[0] }]} />
                      <Text style={[styles.topicItemText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Tujuan KFM */}
        <View style={[styles.tujuanCard, { backgroundColor: colors.gold + '10', borderColor: colors.gold + '30' }]}>
          <Ionicons name="flag" size={24} color={colors.gold} />
          <Text style={[styles.tujuanTitle, { color: colors.gold }]}>Tujuan KFM</Text>
          <Text style={[styles.tujuanDesc, { color: colors.textSecondary }]}>
            KFM bukan sekadar kajian tentang teori fiqih. Tujuan utamanya adalah membangun kesadaran agar Sahabat NASUHA mampu:
          </Text>
          {tujuan.map((t, i) => (
            <View key={i} style={styles.tujuanRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
              <Text style={[styles.tujuanText, { color: colors.text }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Pertanyaan Harta */}
        <View style={[styles.hartaCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <Text style={[styles.hartaTitle, { color: colors.text }]}>Dalam Islam, Persoalan Harta Bukan Hanya Tentang Berapa Banyak</Text>
          <Text style={[styles.hartaSub, { color: colors.textSecondary }]}>Tetapi juga tentang:</Text>
          {pertanyaanHarta.map((q, i) => (
            <View key={i} style={styles.hartaRow}>
              <Text style={[styles.hartaNum, { color: colors.primary }]}>{i + 1}.</Text>
              <Text style={[styles.hartaText, { color: colors.text }]}>{q}</Text>
            </View>
          ))}
        </View>

        {/* Semangat KFM */}
        <LinearGradient colors={['#0077B6', '#00B4D8']} style={styles.semangatCard}>
          <Ionicons name="flame" size={28} color="#FFF" />
          <Text style={styles.semangatTitle}>Semangat KFM NASUHA</Text>
          <Text style={styles.semangatText}>
            Belajar akad {'\u2192'} memahami hukum {'\u2192'} memperbaiki transaksi {'\u2192'} meninggalkan riba {'\u2192'} membangun muamalah yang halal {'\u2192'} meraih keberkahan.
          </Text>
          <View style={styles.semangatDivider} />
          <Text style={styles.semangatQuote}>
            KFM menjadi salah satu ikhtiar NASUHA untuk membangun generasi yang sadar syariah dalam bermuamalah, sehingga semangat hijrah tidak berhenti pada meninggalkan riba, tetapi berlanjut pada membangun sistem kehidupan dan ekonomi yang sesuai dengan tuntunan Islam.
          </Text>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default memo(KfmScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: 0.2 },
  headerSub: { fontSize: FontSize.sm, marginTop: 2, letterSpacing: 0.08 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 90 },
  floatingPromo: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 18,
    zIndex: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  floatingPromoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 280,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0, 136, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  floatingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  floatingTextWrap: { flexShrink: 1 },
  floatingEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  floatingTitle: { color: '#FFF', fontSize: 12, fontWeight: '700', lineHeight: 18 },

  // Intro
  introCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  introTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.sm },
  introText: { fontSize: FontSize.sm, lineHeight: 22 },

  // Mentor
  mentorCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  mentorAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  mentorLabel: { fontSize: FontSize.xs },
  mentorName: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },

  // Section
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.sm },

  // Topic
  topicCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  topicGradient: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { fontSize: FontSize.md, fontWeight: '700' },
  topicCount: { fontSize: FontSize.xs, marginTop: 2 },
  topicItems: { width: '100%', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E030' },
  topicItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3 },
  topicItemText: { fontSize: FontSize.sm, flex: 1 },

  // Tujuan
  tujuanCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, gap: Spacing.sm },
  tujuanTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  tujuanDesc: { fontSize: FontSize.sm, lineHeight: 20 },
  tujuanRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tujuanText: { fontSize: FontSize.sm, flex: 1, lineHeight: 20 },

  // Harta
  hartaCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  hartaTitle: { fontSize: FontSize.md, fontWeight: '700', lineHeight: 22 },
  hartaSub: { fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.sm },
  hartaRow: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  hartaNum: { fontSize: FontSize.sm, fontWeight: '800', minWidth: 20 },
  hartaText: { fontSize: FontSize.sm, flex: 1 },

  // Semangat
  semangatCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' },
  semangatTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.sm },
  semangatText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, marginTop: Spacing.sm },
  semangatDivider: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: Spacing.md, borderRadius: 1 },
  semangatQuote: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
