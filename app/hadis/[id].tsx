import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { fetchHadisPage } from '../../services/hadisApi';

const PAGE_SIZE = 30;

interface HadithRow {
  number: number;
  arab: string;
  translation: string;
}

function getHadithTitle(translation: string, number: number): string {
  const firstSentence = translation.split(/[.!?。]/)[0]?.trim();
  return firstSentence ? `Hadis tentang ${firstSentence.toLowerCase()}` : `Hadis nomor ${number}`;
}

const HadithCard = memo(
  ({ item, bookmarked, collectionName, onToggle, onCopy, onShare, colors, fontSize }: {
    item: HadithRow; bookmarked: boolean; collectionName: string;
    onToggle: (n: number) => void; onCopy: (item: HadithRow) => void; onShare: (item: HadithRow) => void;
    colors: typeof Colors.light;
    fontSize: number;
  }) => (
    <View style={[styles.hadithCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
      <View style={styles.hadithHeader}>
        <View style={[styles.numBadge, { backgroundColor: colors.gold }]}>
          <Text style={styles.numBadgeText}>#{item.number}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => onCopy(item)} hitSlop={8} style={[styles.hadithActionBtn, { backgroundColor: colors.textMuted + '15' }]}>
          <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => onShare(item)} hitSlop={8} style={[styles.hadithActionBtn, { backgroundColor: colors.textMuted + '15' }]}>
          <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => onToggle(item.number)} hitSlop={12}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={bookmarked ? colors.gold : colors.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.hadithTitle, { color: colors.text }]} numberOfLines={2}>{getHadithTitle(item.translation, item.number)}</Text>
      <Text style={[styles.arabic, { color: colors.text, fontSize }]}>{item.arab}</Text>
      <Text style={[styles.translation, { color: colors.textSecondary }]}>{item.translation}</Text>
    </View>
  ),
);

function HadisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slug = id || '';
  const theme = useAppStore((s) => s.theme);
  const bookmarkedHadiths = useAppStore((s) => s.bookmarkedHadiths);
  const toggleBookmarkHadith = useAppStore((s) => s.toggleBookmarkHadith);
  const hadithFontSize = useAppStore((s) => s.hadithFontSize);
  const colors = Colors[theme];

  const [hadiths, setHadiths] = useState<HadithRow[]>([]);
  const [collectionName, setCollectionName] = useState('');
  const [totalHadis, setTotalHadis] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const loadedPages = useRef(new Set<number>());
  const flatListRef = useRef<FlatList>(null);

  // Jump-to picker state
  const [showJumpPicker, setShowJumpPicker] = useState(false);
  const [jumpNumber, setJumpNumber] = useState('');

  const loadPage = useCallback(async (page: number, reset = false) => {
    if (!reset && loadedPages.current.has(page)) return;
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const data = await fetchHadisPage(slug, page, PAGE_SIZE);
      const mapped: HadithRow[] = data.items.map((h) => ({
        number: h.number,
        arab: h.arab,
        translation: h.id,
      }));

      setCollectionName(data.name);
      setTotalHadis(data.total);
      setTotalPages(data.pagination.totalPages);
      loadedPages.current.add(page);

      if (reset) {
        setHadiths(mapped);
        loadedPages.current = new Set([page]);
      } else {
        setHadiths((prev) => [...prev, ...mapped]);
      }
      setCurrentPage(page);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat hadis');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

  // Nomor hadis yang di-bookmark untuk kitab ini (ref tersimpan sebagai "slug:nomor").
  const bookmarkSet = useMemo(
    () => new Set(bookmarkedHadiths.filter((ref) => ref.startsWith(`${slug}:`)).map((ref) => Number(ref.split(':')[1]))),
    [bookmarkedHadiths, slug],
  );

  const handleToggle = useCallback(
    (n: number) => toggleBookmarkHadith(`${slug}:${n}`, `${collectionName || slug} No. ${n}`),
    [toggleBookmarkHadith, slug, collectionName],
  );

  const formatHadithText = useCallback((item: HadithRow) =>
    `HR. ${collectionName || slug} No. ${item.number}\n\n${item.arab}\n\n${item.translation}\n\n— NASUHA App`, [collectionName, slug]);

  const handleCopyHadith = useCallback(async (item: HadithRow) => {
    await Clipboard.setStringAsync(formatHadithText(item));
    Alert.alert('Berhasil', `Hadis No. ${item.number} berhasil disalin`);
  }, [formatHadithText]);

  const handleShareHadith = useCallback(async (item: HadithRow) => {
    try {
      await Share.share({ message: formatHadithText(item) });
    } catch { /* user cancelled */ }
  }, [formatHadithText]);

  const filtered = useMemo(() => {
    if (!search.trim()) return hadiths;
    const lower = search.toLowerCase();
    return hadiths.filter(
      (h) => h.translation.toLowerCase().includes(lower) || h.arab.includes(search) || String(h.number).includes(search),
    );
  }, [search, hadiths]);

  const renderItem = useCallback(
    ({ item }: { item: HadithRow }) => (
      <HadithCard
        item={item}
        bookmarked={bookmarkSet.has(item.number)}
        collectionName={collectionName}
        onToggle={handleToggle}
        onCopy={handleCopyHadith}
        onShare={handleShareHadith}
        colors={colors}
        fontSize={hadithFontSize}
      />
    ),
    [bookmarkSet, handleToggle, handleCopyHadith, handleShareHadith, collectionName, colors, hadithFontSize],
  );

  const handleEndReached = useCallback(() => {
    if (loadingMore || search.trim()) return;
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      loadPage(nextPage);
    }
  }, [currentPage, totalPages, loadingMore, loadPage, search]);

  const handleJumpToHadith = useCallback(async () => {
    const num = parseInt(jumpNumber, 10);
    if (isNaN(num) || num < 1 || num > totalHadis) return;

    const targetPage = Math.ceil(num / PAGE_SIZE);
    setShowJumpPicker(false);
    setSearch('');

    // Load the target page if not loaded
    if (!loadedPages.current.has(targetPage)) {
      try {
        setLoadingMore(true);
        const data = await fetchHadisPage(slug, targetPage, PAGE_SIZE);
        const mapped: HadithRow[] = data.items.map((h) => ({
          number: h.number,
          arab: h.arab,
          translation: h.id,
        }));
        loadedPages.current.add(targetPage);
        setHadiths((prev) => {
          const existing = new Set(prev.map((h) => h.number));
          const newItems = mapped.filter((h) => !existing.has(h.number));
          const combined = [...prev, ...newItems].sort((a, b) => a.number - b.number);
          return combined;
        });
        setCurrentPage(Math.max(currentPage, targetPage));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingMore(false);
      }
    }

    // Scroll to the hadith after a short delay
    setTimeout(() => {
      const idx = hadiths.findIndex((h) => h.number === num);
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 });
      }
    }, 500);
  }, [jumpNumber, totalHadis, slug, currentPage, hadiths]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Memuat hadis lainnya...</Text>
      </View>
    );
  }, [loadingMore, colors]);

  // Quick range buttons for the jump picker
  const quickRanges = useMemo(() => {
    if (totalHadis <= 0) return [];
    const ranges: number[] = [];
    const step = totalHadis <= 100 ? 10 : totalHadis <= 500 ? 50 : 100;
    for (let i = 1; i <= totalHadis; i += step) {
      ranges.push(i);
    }
    return ranges;
  }, [totalHadis]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{collectionName || slug}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {totalHadis > 0 ? `${totalHadis.toLocaleString('id-ID')} hadis` : 'Memuat...'}
          </Text>
        </View>
        {/* Jump-to button */}
        <Pressable onPress={() => { setJumpNumber(''); setShowJumpPicker(true); }} hitSlop={12}>
          <Ionicons name="navigate" size={22} color={colors.gold} />
        </Pressable>
      </View>

      {/* Search */}
      {!loading && !error && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari hadis..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          {search.trim().length > 0 && (
            <Text style={[styles.searchCount, { color: colors.textMuted }]}>
              {filtered.length} hasil ditemukan
            </Text>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat hadis...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => loadPage(1, true)} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filtered}
          keyExtractor={(item) => `${slug}-${item.number}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: info.index, animated: true });
              }
            }, 200);
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tidak ditemukan hadis untuk "{search}"
              </Text>
            </View>
          }
        />
      )}

      {/* Jump-to-Hadith Modal */}
      <Modal visible={showJumpPicker} transparent animationType="slide" onRequestClose={() => setShowJumpPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowJumpPicker(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.gold }]}>Lompat ke Hadis</Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              {collectionName} • Total {totalHadis.toLocaleString('id-ID')} hadis
            </Text>

            {/* Number Input */}
            <View style={[styles.jumpInputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.gold} />
              <TextInput
                style={[styles.jumpInput, { color: colors.text }]}
                value={jumpNumber}
                onChangeText={(t) => setJumpNumber(t.replace(/[^0-9]/g, ''))}
                placeholder="Masukkan nomor hadis..."
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {/* Quick Range Buttons */}
            <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Navigasi Cepat:</Text>
            <View style={styles.quickGrid}>
              {quickRanges.map((n) => {
                const isSelected = jumpNumber === String(n);
                return (
                  <Pressable
                    key={n}
                    onPress={() => setJumpNumber(String(n))}
                    style={[styles.quickBtn, { backgroundColor: isSelected ? colors.gold : colors.surface, borderColor: isSelected ? colors.gold : colors.border }]}
                  >
                    <Text style={[styles.quickBtnText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Go Button */}
            <Pressable onPress={handleJumpToHadith}>
              <LinearGradient colors={[colors.gold || '#D4A853', '#B8860B']} style={styles.jumpGoBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="navigate" size={20} color="#FFF" />
                <Text style={styles.jumpGoBtnText}>
                  {jumpNumber ? `Buka Hadis #${jumpNumber}` : 'Masukkan nomor hadis'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default memo(HadisDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  searchBar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 40, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 40 },
  searchCount: { fontSize: FontSize.xs, marginTop: 4, textAlign: 'right' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  hadithCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  hadithHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  hadithTitle: { fontSize: FontSize.md, fontWeight: '800', lineHeight: 21, marginBottom: Spacing.sm },
  numBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  numBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  hadithActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  arabic: { fontSize: 24, lineHeight: 46, textAlign: 'right', marginBottom: Spacing.sm, fontFamily: 'Lateef-Regular' },
  translation: { fontSize: FontSize.md, lineHeight: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  errorText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5 },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center' },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  footerText: { fontSize: FontSize.sm },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  modalHint: { fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.md },
  jumpInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 56, gap: Spacing.sm, marginBottom: Spacing.md },
  jumpInput: { flex: 1, fontSize: FontSize.xl, fontWeight: '700', height: 56 },
  quickLabel: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: Spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  jumpGoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.xl },
  jumpGoBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
});
