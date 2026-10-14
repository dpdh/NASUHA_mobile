import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { getColors } from '../constants/theme';
import { useApiQuery } from '../hooks/useApiQuery';
import { contentApi } from '../services/nasjakApi';

const FALLBACK_FEATURES = [
  'Al-Quran & Hadis lengkap dengan terjemahan',
  'Riyadhoh & tracking ibadah harian',
  'Program LBU & TSN',
  'Motivasi & 260+ Kalimat Muhasabah',
  'Lapak Sahabat NASUHA',
  'Asisten Anas AI',
  'Media Sosial & Kegiatan',
  'Event Management (TSN, LBU, KFM, TOT, dll)',
];

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AboutScreen() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const colors = getColors(colorScheme)[theme];

  const { data: config } = useApiQuery(() => contentApi.config(), [], { cacheKey: 'config' });
  const app = config?.app;
  const features = app?.features?.length ? app.features : FALLBACK_FEATURES;

  const info = [
    { label: 'Dibuat oleh', value: app?.author || 'Dani Hamdani' },
    { label: 'Organisasi', value: app?.organization || 'NASUHA' },
    { label: 'Tanggal Rilis', value: formatDate(app?.releaseDate || '2026-08-08') },
    { label: 'Website', value: (app?.website || 'nasuha.org').replace(/^https?:\/\//, '') },
    { label: 'Instagram', value: `@${config?.contact.instagram || 'nasuhajakarta'}` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tentang NASUHA App</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.primary }]}>{app?.name || 'NASUHA App'}</Text>
          <Text style={[styles.version, { color: colors.gold }]}>Versi {app?.latestVersion || '1.0.0'}</Text>
          <Text style={[styles.description, { color: colors.text }]}>Aplikasi resmi komunitas NASUHA.</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>{app?.tagline || 'Hijrah Bersama, Tumbuh Bersama, Bebas Utang Bersama'}.</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fitur Utama</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informasi</Text>
          {info.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  version: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  description: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
  },
  tagline: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
});
