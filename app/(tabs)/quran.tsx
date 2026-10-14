import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { fetchAllSurahs, mapSurahToLocal } from '../../services/quranApi';
import type { QuranSurah } from '../../types';

// Juz data: juz number -> { startSurah, startAyah, endSurah, endAyah }
const JUZ_DATA: { juz: number; startSurah: number; startAyah: number; label: string }[] = [
  { juz: 1, startSurah: 1, startAyah: 1, label: 'Al-Fatihah 1' },
  { juz: 2, startSurah: 2, startAyah: 142, label: 'Al-Baqarah 142' },
  { juz: 3, startSurah: 2, startAyah: 253, label: 'Al-Baqarah 253' },
  { juz: 4, startSurah: 3, startAyah: 93, label: 'Ali Imran 93' },
  { juz: 5, startSurah: 4, startAyah: 24, label: 'An-Nisa 24' },
  { juz: 6, startSurah: 4, startAyah: 148, label: 'An-Nisa 148' },
  { juz: 7, startSurah: 5, startAyah: 83, label: 'Al-Maidah 83' },
  { juz: 8, startSurah: 6, startAyah: 111, label: 'Al-An\'am 111' },
  { juz: 9, startSurah: 7, startAyah: 88, label: 'Al-A\'raf 88' },
  { juz: 10, startSurah: 8, startAyah: 41, label: 'Al-Anfal 41' },
  { juz: 11, startSurah: 9, startAyah: 93, label: 'At-Taubah 93' },
  { juz: 12, startSurah: 11, startAyah: 6, label: 'Hud 6' },
  { juz: 13, startSurah: 12, startAyah: 53, label: 'Yusuf 53' },
  { juz: 14, startSurah: 15, startAyah: 1, label: 'Al-Hijr 1' },
  { juz: 15, startSurah: 17, startAyah: 1, label: 'Al-Isra 1' },
  { juz: 16, startSurah: 18, startAyah: 75, label: 'Al-Kahf 75' },
  { juz: 17, startSurah: 21, startAyah: 1, label: 'Al-Anbiya 1' },
  { juz: 18, startSurah: 23, startAyah: 1, label: 'Al-Mu\'minun 1' },
  { juz: 19, startSurah: 25, startAyah: 21, label: 'Al-Furqan 21' },
  { juz: 20, startSurah: 27, startAyah: 56, label: 'An-Naml 56' },
  { juz: 21, startSurah: 29, startAyah: 46, label: 'Al-Ankabut 46' },
  { juz: 22, startSurah: 33, startAyah: 31, label: 'Al-Ahzab 31' },
  { juz: 23, startSurah: 36, startAyah: 28, label: 'Yasin 28' },
  { juz: 24, startSurah: 39, startAyah: 32, label: 'Az-Zumar 32' },
  { juz: 25, startSurah: 41, startAyah: 47, label: 'Fussilat 47' },
  { juz: 26, startSurah: 46, startAyah: 1, label: 'Al-Ahqaf 1' },
  { juz: 27, startSurah: 51, startAyah: 31, label: 'Adz-Dzariyat 31' },
  { juz: 28, startSurah: 58, startAyah: 1, label: 'Al-Mujadilah 1' },
  { juz: 29, startSurah: 67, startAyah: 1, label: 'Al-Mulk 1' },
  { juz: 30, startSurah: 78, startAyah: 1, label: 'An-Naba 1' },
];

type ViewMode = 'surah' | 'juz' | 'cari';

const SurahItem = memo(({ item, colors, lastReadAyah }: { item: QuranSurah; colors: typeof Colors.light; lastReadAyah: number }) => (
  <Pressable
    onPress={() => router.push(`/quran/${item.id}` as any)}
    style={({ pressed }) => [
      styles.surahCard,
      { backgroundColor: colors.card, borderColor: lastReadAyah > 0 ? colors.gold + '60' : colors.border, opacity: pressed ? 0.85 : 1 },
      Shadows.sm,
    ]}
  >
    <View style={[styles.surahNumber, { backgroundColor: lastReadAyah > 0 ? colors.gold : colors.primary }]}>
      <Text style={styles.surahNumberText}>{item.id}</Text>
    </View>
    <View style={styles.surahInfo}>
      <Text style={[styles.surahName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.surahMeta, { color: colors.textSecondary }]}>
        {item.meaning} • {item.ayahCount} ayat • {item.type}
      </Text>
      {lastReadAyah > 0 && (
        <View style={styles.lastReadRow}>
          <Ionicons name="bookmark" size={10} color={colors.gold} />
          <Text style={[styles.lastReadLabel, { color: colors.gold }]}>Ayat {lastReadAyah}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.surahArabic, { color: colors.primary }]}>{item.arabic}</Text>
  </Pressable>
));

const SEARCH_LIGHTS = [
  { size: 138, left: -46, top: -36, color: ['rgba(76,201,240,0.30)', 'rgba(0,119,182,0.02)'] as [string, string], x: 30, y: 24, duration: 8200 },
  { size: 104, left: 140, top: 10, color: ['rgba(125,211,252,0.25)', 'rgba(212,168,83,0.08)'] as [string, string], x: -24, y: 32, duration: 7000 },
  { size: 82, left: 218, top: 170, color: ['rgba(212,168,83,0.28)', 'rgba(255,255,255,0.02)'] as [string, string], x: -30, y: -26, duration: 7600 },
];

const SearchLightOrb = memo(({ light }: { light: (typeof SEARCH_LIGHTS)[number] }) => {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const xLoop = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: light.x, duration: light.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: -light.x * 0.7, duration: light.duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: light.duration * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const yLoop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -light.y, duration: light.duration * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(y, { toValue: light.y, duration: light.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: light.duration * 0.65, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.9, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    xLoop.start();
    yLoop.start();
    glowLoop.start();
    return () => { xLoop.stop(); yLoop.stop(); glowLoop.stop(); };
  }, [light, opacity, x, y]);

  return (
    <Animated.View pointerEvents="none" style={[styles.searchLightOrb, { width: light.size, height: light.size, borderRadius: light.size / 2, left: light.left, top: light.top, opacity, transform: [{ translateX: x }, { translateY: y }] }]}>
      <LinearGradient colors={light.color} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
});

function QuranScreen() {
  const theme = useAppStore((s) => s.theme);
  const lastReadAyahs = useAppStore((s) => s.lastReadAyahs);
  const colors = Colors[theme];
  const [search, setSearch] = useState('');
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('surah');

  // Wheel picker state
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedAyah, setSelectedAyah] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const apiSurahs = await fetchAllSurahs();
        if (!cancelled) setSurahs(apiSurahs.map(mapSurahToLocal));
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Gagal memuat data surah');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedSurahData = useMemo(() => surahs.find((s) => s.id === selectedSurah), [surahs, selectedSurah]);
  const maxAyah = selectedSurahData?.ayahCount || 1;

  const filtered = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.toLowerCase();
    return surahs.filter((s) =>
      s.name.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q) || String(s.id).includes(search),
    );
  }, [search, surahs]);

  const handleGoToAyah = useCallback(() => {
    router.push({
      pathname: `/quran/${selectedSurah}`,
      params: { ayah: String(selectedAyah) },
    } as any);
  }, [selectedAyah, selectedSurah]);

  const renderSurahItem = useCallback(
    ({ item }: { item: QuranSurah }) => <SurahItem item={item} colors={colors} lastReadAyah={lastReadAyahs[String(item.id)] || 0} />,
    [colors, lastReadAyahs],
  );

  const tabs: { id: ViewMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { id: 'surah', label: 'Surah', icon: 'book-outline' },
    { id: 'juz', label: 'Juz', icon: 'layers-outline' },
    { id: 'cari', label: 'Cari', icon: 'search-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Al-Qur'an</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>114 Surah • 30 Juz • Lengkap dengan terjemahan</Text>

        {/* View Mode Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((t) => {
            const active = viewMode === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setViewMode(t.id)}
                style={[styles.tabBtn, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
              >
                <Ionicons name={t.icon} size={14} color={active ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.tabLabel, { color: active ? '#FFF' : colors.textSecondary }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat daftar surah...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => { setLoading(true); setError(null); fetchAllSurahs().then((s) => setSurahs(s.map(mapSurahToLocal))).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
            style={[styles.retryBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : viewMode === 'surah' ? (
        /* ─── SURAH LIST ─── */
        <FlatList
          data={surahs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSurahItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
        />
      ) : viewMode === 'juz' ? (
        /* ─── JUZ LIST ─── */
        <FlatList
          data={JUZ_DATA}
          keyExtractor={(item) => String(item.juz)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: juz }) => (
            <Pressable
              onPress={() => router.push(`/quran/${juz.startSurah}` as any)}
              style={({ pressed }) => [styles.juzCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }, Shadows.sm]}
            >
              <LinearGradient colors={[colors.primary, '#0077B6']} style={styles.juzBadge}>
                <Text style={styles.juzBadgeText}>{juz.juz}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.juzTitle, { color: colors.text }]}>Juz {juz.juz}</Text>
                <Text style={[styles.juzSub, { color: colors.textSecondary }]}>Mulai dari {juz.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      ) : (
        /* ─── CARI (Search + Wheel Picker) ─── */
        <FlatList
          data={search.trim() ? filtered : []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.searchContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          ListHeaderComponent={(
            <>
          {/* Text Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari nama surah, arti, atau nomor..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
          </View>

          {/* Wheel Picker: Surah + Ayah */}
          <View style={[styles.wheelCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
            <View pointerEvents="none" style={styles.searchLightLayer}>
              {SEARCH_LIGHTS.map((light) => <SearchLightOrb key={`${light.left}-${light.top}`} light={light} />)}
            </View>
            <Text style={[styles.wheelTitle, { color: colors.gold }]}>Navigasi Cepat</Text>
            <Text style={[styles.wheelHint, { color: colors.textMuted }]}>Pilih surah dan ayat untuk langsung membaca</Text>

            <View style={styles.wheelRow}>
              {/* Surah Wheel */}
              <View style={styles.wheelCol}>
                <Text style={[styles.wheelLabel, { color: colors.textSecondary }]}>Surah</Text>
                <ScrollView
                  style={[styles.wheelScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  scrollEnabled
                  bounces
                  overScrollMode="always"
                  contentContainerStyle={styles.wheelContent}
                >
                  {surahs.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => { setSelectedSurah(s.id); setSelectedAyah(1); }}
                      style={[styles.wheelItem, selectedSurah === s.id && { backgroundColor: colors.primary + '15' }]}
                    >
                      <Text style={[styles.wheelItemNum, { color: selectedSurah === s.id ? colors.primary : colors.textMuted }]}>{s.id}.</Text>
                      <Text style={[styles.wheelItemText, { color: selectedSurah === s.id ? colors.primary : colors.text }]} numberOfLines={1}>{s.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Ayah Wheel */}
              <View style={styles.wheelColSmall}>
                <Text style={[styles.wheelLabel, { color: colors.textSecondary }]}>Ayat</Text>
                <ScrollView
                  style={[styles.wheelScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  scrollEnabled
                  bounces
                  overScrollMode="always"
                  contentContainerStyle={styles.wheelContent}
                >
                  {Array.from({ length: maxAyah }, (_, i) => i + 1).map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setSelectedAyah(n)}
                      style={[styles.wheelItem, styles.wheelItemCenter, selectedAyah === n && { backgroundColor: colors.gold + '15' }]}
                    >
                      <Text style={[styles.wheelItemNum, { color: selectedAyah === n ? colors.gold : colors.text }]}>{n}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Go Button */}
            <Pressable onPress={handleGoToAyah}>
              <LinearGradient colors={[colors.primary, '#0077B6']} style={styles.goBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="book" size={20} color="#FFF" />
                <Text style={styles.goBtnText}>
                  Baca {selectedSurahData?.name || `Surah ${selectedSurah}`} Ayat {selectedAyah}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={[styles.searchResultLabel, { color: colors.textSecondary }]}>{search.trim() ? `${filtered.length} surah ditemukan` : 'Ketik nama surah untuk mencari'}</Text>
            </>
          )}
          renderItem={({ item: s }) => (
            <Pressable
              onPress={() => router.push(`/quran/${s.id}` as any)}
              style={[styles.searchResultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.surahNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.surahNumberText}>{s.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.surahName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.surahMeta, { color: colors.textSecondary }]}>{s.meaning} • {s.ayahCount} ayat</Text>
              </View>
              <Text style={[styles.surahArabic, { color: colors.primary }]}>{s.arabic}</Text>
            </Pressable>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </View>
  );
}

export default memo(QuranScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabLabel: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },

  // Surah Card
  surahCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  surahNumber: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  surahNumberText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  surahInfo: { flex: 1 },
  surahName: { fontSize: FontSize.lg, fontWeight: '700' },
  surahMeta: { fontSize: FontSize.xs, marginTop: 2 },
  lastReadRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  lastReadLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  surahArabic: { fontSize: 22, fontFamily: 'Lateef-Regular' },

  // Juz Card
  juzCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  juzBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  juzBadgeText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  juzTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  juzSub: { fontSize: FontSize.xs, marginTop: 2 },

  // Search / Wheel
  searchContent: { padding: Spacing.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, gap: 8, marginBottom: Spacing.lg },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 44 },

  wheelCard: { position: 'relative', borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, overflow: 'hidden' },
  searchLightLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: BorderRadius.lg },
  searchLightOrb: { position: 'absolute', overflow: 'hidden', shadowColor: '#4CC9F0', shadowOpacity: 0.3, shadowRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  wheelTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  wheelHint: { fontSize: FontSize.xs, marginTop: 2, marginBottom: Spacing.md },
  wheelRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  wheelCol: { flex: 2 },
  wheelColSmall: { flex: 1 },
  wheelLabel: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: Spacing.xs },
  wheelScroll: { height: 220, borderWidth: 1, borderRadius: BorderRadius.md },
  wheelContent: { paddingVertical: 2 },
  wheelItem: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: 6 },
  wheelItemCenter: { justifyContent: 'center' },
  wheelItemNum: { fontSize: FontSize.sm, fontWeight: '700', minWidth: 28 },
  wheelItemText: { fontSize: FontSize.sm, flex: 1 },

  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.xl },
  goBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },

  searchResults: { marginTop: Spacing.lg, gap: Spacing.sm },
  searchResultLabel: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  errorText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5 },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
});
