import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { fetchHadisCollections } from '../../services/hadisApi';
import type { ApiHadisCollection } from '../../services/hadisApi';

interface CollectionRow extends ApiHadisCollection {
  arabic: string;
  author: string;
}

type ViewMode = 'kitab' | 'cari';

const CollectionCard = memo(({ item, colors }: { item: CollectionRow; colors: typeof Colors.light }) => (
  <Pressable
    onPress={() => router.push(`/hadis/${item.slug}` as any)}
    style={[styles.collCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
  >
    <View style={[styles.collIcon, { backgroundColor: colors.gold + '20' }]}>
      <Ionicons name="library" size={24} color={colors.gold} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.collName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.collMeta, { color: colors.textSecondary }]}>
        {item.author} • {item.total.toLocaleString('id-ID')} hadis
      </Text>
    </View>
    <Text style={[styles.collArabic, { color: colors.textMuted }]}>{item.arabic}</Text>
  </Pressable>
));

function HadisIndexScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kitab');
  const [search, setSearch] = useState('');

  // Wheel picker state
  const [selectedCollection, setSelectedCollection] = useState(0);
  const [hadithNumber, setHadithNumber] = useState('1');
  const collectionScrollRef = useRef<FlatList>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHadisCollections();
      setCollections(data);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalHadis = collections.reduce((sum, c) => sum + c.total, 0);

  const selectedCollData = collections[selectedCollection];
  const maxHadith = selectedCollData?.total || 1;

  const filteredCollections = useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase();
    return collections.filter((c) =>
      c.name.toLowerCase().includes(q) || c.author.toLowerCase().includes(q) || c.arabic.includes(search),
    );
  }, [search, collections]);

  const handleGoToHadith = useCallback(() => {
    if (!selectedCollData) return;
    const num = parseInt(hadithNumber, 10);
    if (isNaN(num) || num < 1) return;
    const page = Math.ceil(num / 30);
    router.push(`/hadis/${selectedCollData.slug}` as any);
  }, [selectedCollData, hadithNumber]);

  // Generate number ranges for the wheel picker
  const hadithNumberRanges = useMemo(() => {
    if (!selectedCollData) return [];
    const ranges: { start: number; end: number; label: string }[] = [];
    const step = 100;
    for (let i = 1; i <= selectedCollData.total; i += step) {
      const end = Math.min(i + step - 1, selectedCollData.total);
      ranges.push({ start: i, end, label: `${i} - ${end}` });
    }
    return ranges;
  }, [selectedCollData]);

  const renderCollItem = useCallback(
    ({ item }: { item: CollectionRow }) => <CollectionCard item={item} colors={colors} />,
    [colors],
  );

  const tabs: { id: ViewMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { id: 'kitab', label: 'Kitab', icon: 'library-outline' },
    { id: 'cari', label: 'Cari', icon: 'search-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.title, { color: colors.text }]}>Hadis</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {collections.length} Kitab • {totalHadis.toLocaleString('id-ID')} Hadis
            </Text>
          </View>
        </View>

        {/* Tabs */}
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat koleksi hadis...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={loadData} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : viewMode === 'kitab' ? (
        /* ─── KITAB LIST ─── */
        <FlatList
          data={collections}
          keyExtractor={(item) => item.slug}
          renderItem={renderCollItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        /* ─── CARI (Search + Wheel Picker) ─── */
        <ScrollView contentContainerStyle={styles.searchContent} showsVerticalScrollIndicator={false}>
          {/* Text Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari nama kitab, perawi..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
          </View>

          {/* Wheel Picker: Kitab + Nomor Hadis */}
          <View style={[styles.wheelCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
            <Text style={[styles.wheelTitle, { color: colors.gold }]}>Navigasi Cepat Hadis</Text>
            <Text style={[styles.wheelHint, { color: colors.textMuted }]}>Pilih kitab dan nomor hadis untuk langsung membaca</Text>

            <View style={styles.wheelRow}>
              {/* Kitab/Collection Wheel */}
              <View style={styles.wheelCol}>
                <Text style={[styles.wheelLabel, { color: colors.textSecondary }]}>Kitab Hadis</Text>
                <FlatList
                  ref={collectionScrollRef}
                  data={collections}
                  keyExtractor={(c) => c.slug}
                  style={[styles.wheelScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={52}
                  decelerationRate="fast"
                  getItemLayout={(_, i) => ({ length: 52, offset: 52 * i, index: i })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: c, index }) => (
                    <Pressable
                      onPress={() => { setSelectedCollection(index); setHadithNumber('1'); }}
                      style={[styles.wheelItem, selectedCollection === index && { backgroundColor: colors.primary + '15' }]}
                    >
                      <Ionicons name="library" size={16} color={selectedCollection === index ? colors.primary : colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.wheelItemText, { color: selectedCollection === index ? colors.primary : colors.text }]} numberOfLines={1}>{c.name}</Text>
                        <Text style={[styles.wheelItemSub, { color: colors.textMuted }]}>{c.total.toLocaleString('id-ID')} hadis</Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>

              {/* Nomor Hadis Input + Range Picker */}
              <View style={styles.wheelColSmall}>
                <Text style={[styles.wheelLabel, { color: colors.textSecondary }]}>No. Hadis</Text>
                <View style={[styles.numberInputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.numberInput, { color: colors.gold }]}
                    value={hadithNumber}
                    onChangeText={(t) => {
                      const num = t.replace(/[^0-9]/g, '');
                      setHadithNumber(num);
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    textAlign="center"
                  />
                  <Text style={[styles.numberMax, { color: colors.textMuted }]}>
                    / {maxHadith.toLocaleString('id-ID')}
                  </Text>
                </View>
                {/* Quick range buttons */}
                <FlatList
                  data={hadithNumberRanges}
                  keyExtractor={(r) => String(r.start)}
                  style={[styles.rangeScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  getItemLayout={(_, i) => ({ length: 40, offset: 40 * i, index: i })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: r }) => {
                    const num = parseInt(hadithNumber, 10) || 0;
                    const active = num >= r.start && num <= r.end;
                    return (
                      <Pressable
                        onPress={() => setHadithNumber(String(r.start))}
                        style={[styles.rangeItem, active && { backgroundColor: colors.gold + '15' }]}
                      >
                        <Text style={[styles.rangeText, { color: active ? colors.gold : colors.textSecondary }]}>{r.label}</Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </View>

            {/* Selected Info */}
            {selectedCollData && (
              <View style={[styles.selectedInfo, { backgroundColor: colors.surface }]}>
                <Text style={[styles.selectedArabic, { color: colors.text }]}>{selectedCollData.arabic}</Text>
                <Text style={[styles.selectedAuthor, { color: colors.textSecondary }]}>{selectedCollData.author}</Text>
              </View>
            )}

            {/* Go Button */}
            <Pressable onPress={handleGoToHadith}>
              <LinearGradient colors={[colors.gold || '#D4A853', '#B8860B']} style={styles.goBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="library" size={20} color="#FFF" />
                <Text style={styles.goBtnText}>
                  Buka {selectedCollData?.name || 'Kitab'} #{hadithNumber || '1'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Search Results */}
          {search.trim().length > 0 && (
            <View style={styles.searchResults}>
              <Text style={[styles.searchResultLabel, { color: colors.textSecondary }]}>{filteredCollections.length} kitab ditemukan</Text>
              {filteredCollections.map((c) => (
                <Pressable
                  key={c.slug}
                  onPress={() => router.push(`/hadis/${c.slug}` as any)}
                  style={[styles.searchResultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.collIcon, { backgroundColor: colors.gold + '20' }]}>
                    <Ionicons name="library" size={20} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.collName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.collMeta, { color: colors.textSecondary }]}>{c.author} • {c.total.toLocaleString('id-ID')} hadis</Text>
                  </View>
                  <Text style={[styles.collArabic, { color: colors.textMuted }]}>{c.arabic}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

export default memo(HadisIndexScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabLabel: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  collCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  collIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  collName: { fontSize: FontSize.lg, fontWeight: '700' },
  collMeta: { fontSize: FontSize.xs, marginTop: 2 },
  collArabic: { fontSize: 18, fontFamily: 'Lateef-Regular' },

  // Search
  searchContent: { padding: Spacing.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, gap: 8, marginBottom: Spacing.lg },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 44 },

  // Wheel Picker
  wheelCard: { borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, overflow: 'hidden' },
  wheelTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  wheelHint: { fontSize: FontSize.xs, marginTop: 2, marginBottom: Spacing.md },
  wheelRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  wheelCol: { flex: 3 },
  wheelColSmall: { flex: 2 },
  wheelLabel: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: Spacing.xs },
  wheelScroll: { height: 260, borderWidth: 1, borderRadius: BorderRadius.md },
  wheelItem: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, gap: 8 },
  wheelItemText: { fontSize: FontSize.sm, fontWeight: '600' },
  wheelItemSub: { fontSize: FontSize.xs },

  // Number input
  numberInputBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm },
  numberInput: { fontSize: FontSize.xxl, fontWeight: '800', width: '100%', textAlign: 'center', height: 44 },
  numberMax: { fontSize: FontSize.xs, marginTop: 2 },
  rangeScroll: { height: 180, borderWidth: 1, borderRadius: BorderRadius.md },
  rangeItem: { height: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.sm },
  rangeText: { fontSize: FontSize.xs, fontWeight: '600' },

  // Selected info
  selectedInfo: { borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  selectedArabic: { fontSize: 22, fontFamily: 'Lateef-Regular' },
  selectedAuthor: { fontSize: FontSize.sm, marginTop: 2 },

  // Go button
  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.xl },
  goBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },

  // Search results
  searchResults: { marginTop: Spacing.lg, gap: Spacing.sm },
  searchResultLabel: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  errorText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5 },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
});
