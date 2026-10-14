import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { TSN_INFO } from '../../constants/data';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi, eventApi } from '../../services/nasjakApi';

const LOGO_NASUHA = require('../../assets/images/logo NASUHA.png');

function TSNScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const { data: program } = useApiQuery(() => contentApi.program('tsn'), [], { cacheKey: 'program_tsn' });
  const { data: tsnEvents = [] } = useApiQuery(
    () => eventApi.list({ type: 'TSN' }).then((result) => result.data),
    [],
    { cacheKey: 'tsn_events', refetchOnFocus: true },
  );
  const info = {
    title: program?.title || TSN_INFO.title,
    subtitle: program?.subtitle || TSN_INFO.subtitle,
    description: program?.description || TSN_INFO.description,
    benefits: (program?.data?.benefits as string[] | undefined) ?? TSN_INFO.benefits,
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Image source={LOGO_NASUHA} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroTitle}>{info.title}</Text>
        <Text style={styles.heroSub}>{info.subtitle}</Text>
      </LinearGradient>

      <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ShimmerGold style={styles.shimmer} />
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{info.description}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Manfaat TSN</Text>
      {info.benefits.map((benefit, i) => (
        <View key={i} style={[styles.benefitCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={[styles.benefitNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.benefitNumText}>{i + 1}</Text>
          </View>
          <Text style={[styles.benefitText, { color: colors.text }]}>{benefit}</Text>
        </View>
      ))}

      {tsnEvents.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Event TSN Mendatang</Text>
          {tsnEvents.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push(`/event/${e.id}` as any)}
              style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
            >
              <Text style={[styles.eventTitle, { color: colors.text }]}>{e.title}</Text>
              <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{e.date} • {e.location}</Text>
            </Pressable>
          ))}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

export default memo(TSNScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  heroLogo: { width: 72, height: 72, marginBottom: Spacing.md },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, marginTop: 4 },
  descCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmer: { height: 3 },
  desc: { padding: Spacing.md, fontSize: FontSize.md, lineHeight: 22 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md },
  benefitCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  benefitNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  benefitNumText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  benefitText: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  eventCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  eventTitle: { fontSize: FontSize.md, fontWeight: '700' },
  eventMeta: { fontSize: FontSize.xs, marginTop: 4 },
});
