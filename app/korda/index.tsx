import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { KORDA_CONTACTS } from '../../constants/data';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';
import type { Korda } from '../../types';

const FALLBACK_KORDAS: Korda[] = KORDA_CONTACTS.map((item) => ({
  id: String(item.id),
  label: `Korda ${item.region}`,
  region: item.region,
  ketua: item.ketua,
  phone: item.phone,
  icon: item.icon,
}));

const GRADIENT_PAIRS: [string, string][] = [
  ['#2EC4B6', '#0E8C7F'],
  ['#4A90D9', '#357ABD'],
  ['#D4A853', '#B8860B'],
  ['#7B61FF', '#5A3FD9'],
  ['#FF6B6B', '#C44569'],
  ['#00B4D8', '#0077B6'],
  ['#E67E22', '#D35400'],
];

function formatPhone(phone: string): string {
  if (phone.startsWith('0')) return '+62' + phone.slice(1);
  return phone;
}

function displayPhone(phone: string): string {
  const p = phone;
  if (p.length >= 12) return `${p.slice(0,4)}-${p.slice(4,8)}-${p.slice(8)}`;
  if (p.length >= 10) return `${p.slice(0,4)}-${p.slice(4,8)}-${p.slice(8)}`;
  return p;
}

const KordaCard = memo(({ item, index, colors }: { item: Korda; index: number; colors: typeof Colors.light }) => {
  const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  const phone = item.phone || '';

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Tidak bisa membuka aplikasi telepon'));
  };

  const handleWhatsApp = () => {
    const wa = formatPhone(phone);
    const msg = encodeURIComponent(`Assalamu'alaikum ${item.ketua}, saya ingin bertanya tentang NASUHA Korda ${item.region}.`);
    Linking.openURL(`https://wa.me/${wa.replace('+', '')}?text=${msg}`).catch(() => Alert.alert('Error', 'Tidak bisa membuka WhatsApp'));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <LinearGradient colors={gradient} style={styles.iconCircle}>
          <Ionicons name={(item.icon || 'location') as any} size={22} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.region, { color: colors.text }]}>{item.label}</Text>
          {!!item.ketua && <Text style={[styles.ketua, { color: colors.textSecondary }]}>Ketua: {item.ketua}</Text>}
          {!!phone && (
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={12} color={colors.gold} />
              <Text style={[styles.phone, { color: colors.gold }]}>{displayPhone(phone)}</Text>
            </View>
          )}
        </View>
      </View>
      {!!phone && <View style={styles.btnRow}>
        <Pressable onPress={handleCall} style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="call" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Telepon</Text>
        </Pressable>
        <Pressable onPress={handleWhatsApp} style={[styles.actionBtn, { backgroundColor: '#25D36620' }]}>
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={[styles.actionText, { color: '#25D366' }]}>WhatsApp</Text>
        </Pressable>
      </View>}
    </View>
  );
});

function KordaScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const { data: kordas = FALLBACK_KORDAS, refreshing, refresh } = useApiQuery(() => contentApi.kordas(), [], {
    cacheKey: 'kordas',
    fallback: FALLBACK_KORDAS,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#0077B6', '#00B4D8']} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Koordinator Daerah</Text>
          <Text style={styles.headerSub}>Kontak Ketua Korda NASUHA</Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Info Banner */}
      <View style={[styles.banner, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
        <Ionicons name="information-circle" size={20} color={colors.gold} />
        <Text style={[styles.bannerText, { color: colors.gold }]}>
          Silahkan kontak Ketua Korda terdekat untuk informasi program NASUHA di wilayah Anda.
        </Text>
      </View>

      {/* Contact List */}
      <FlatList
        data={kordas}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        renderItem={({ item, index }) => <KordaCard item={item} index={index} colors={colors} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default memo(KordaScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.sm },
  bannerText: { fontSize: FontSize.sm, flex: 1, lineHeight: 18 },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  region: { fontSize: FontSize.md, fontWeight: '700' },
  ketua: { fontSize: FontSize.sm, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phone: { fontSize: FontSize.sm, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md },
  actionText: { fontSize: FontSize.sm, fontWeight: '700' },
});
