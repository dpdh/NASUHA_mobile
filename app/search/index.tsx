import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { errorMessage } from '../../services/api';
import { contentApi } from '../../services/nasjakApi';

type ResultType = 'quran' | 'hadis' | 'program' | 'events' | 'products' | 'articles' | 'quotes' | 'doas' | 'testimonials' | 'questions';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route?: string;
}

const TYPE_ICONS: Record<ResultType, React.ComponentProps<typeof Ionicons>['name']> = {
  quran: 'book', hadis: 'library', program: 'people', events: 'calendar', products: 'storefront', articles: 'newspaper',
  quotes: 'bulb', doas: 'hand-left', testimonials: 'heart', questions: 'help-circle',
};

const TYPE_LABELS: Record<ResultType, string> = {
  quran: "Al-Qur'an", hadis: 'Hadis', program: 'Program', events: 'Event', products: 'Lapak', articles: 'Artikel',
  quotes: 'Motivasi', doas: 'Doa', testimonials: 'Testimoni', questions: 'Tanya',
};

const REMOTE_TYPES: ResultType[] = ['events', 'products', 'articles', 'quotes', 'doas', 'testimonials', 'questions'];

// Pintasan statis: cocok bila kata kunci mengandung / terkandung dalam salah satu keyword.
const SHORTCUTS: { keywords: string[]; result: SearchResult }[] = [
  { keywords: ['quran', 'al-quran', 'surah', 'surat', 'ayat', 'juz'], result: { id: 'quran', type: 'quran', title: "Al-Qur'an", subtitle: '114 Surah lengkap', icon: 'book', route: '/(tabs)/quran' } },
  { keywords: ['hadis', 'hadits', 'hadith', 'bukhari', 'muslim'], result: { id: 'hadis', type: 'hadis', title: 'Hadis', subtitle: '9 Kitab • 38,000+ hadis', icon: 'library', route: '/hadis/' } },
  { keywords: ['tsn', 'temu sahabat'], result: { id: 'tsn', type: 'program', title: 'Temu Sahabat NASUHA', subtitle: 'Program TSN', icon: 'people', route: '/tsn/' } },
  { keywords: ['lbu', 'bebas utang', 'lunasi', 'utang', 'hutang'], result: { id: 'lbu', type: 'program', title: 'Langkah Bebas Utang', subtitle: 'Program LBU', icon: 'rocket', route: '/lbu/' } },
];

function SearchScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const [query, setQuery] = useState('');
  // Hasil disimpan bersama kata kuncinya; status "mencari" diturunkan dari selisih query (tanpa setState sinkron di effect).
  const [remote, setRemote] = useState<{ query: string; items: SearchResult[]; error: string | null }>({ query: '', items: [], error: null });

  const trimmed = query.trim();
  const searching = trimmed.length >= 2 && remote.query !== trimmed;
  const error = remote.query === trimmed ? remote.error : null;

  useEffect(() => {
    if (trimmed.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await contentApi.search(trimmed);
        if (cancelled) return;
        const out: SearchResult[] = [];
        for (const type of REMOTE_TYPES) {
          for (const item of data[type] ?? []) {
            out.push({ id: `${type}-${item.id}`, type, title: item.title, subtitle: item.subtitle, icon: TYPE_ICONS[type], route: item.route });
          }
        }
        setRemote({ query: trimmed, items: out, error: null });
      } catch (caught) {
        if (!cancelled) setRemote({ query: trimmed, items: [], error: errorMessage(caught) });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  const results = useMemo<SearchResult[]>(() => {
    if (trimmed.length < 2) return [];
    const q = trimmed.toLowerCase();
    const shortcuts = SHORTCUTS
      .filter(({ keywords }) => keywords.some((keyword) => keyword.includes(q) || q.includes(keyword)))
      .map(({ result }) => result);
    return [...shortcuts, ...(remote.query === trimmed ? remote.items : [])];
  }, [trimmed, remote]);

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <Pressable
        onPress={() => item.route && router.push(item.route as any)}
        style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
      >
        <View style={[styles.resultIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={item.icon || TYPE_ICONS[item.type]} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.resultHeaderRow}>
            <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typeText, { color: colors.textSecondary }]}>{TYPE_LABELS[item.type]}</Text>
            </View>
          </View>
          <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari apa yang sedang kamu butuhkan..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {query.length < 2 ? (
        <View style={styles.hintBox}>
          <Ionicons name="search" size={48} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Cari Event, Lapak, Artikel, Motivasi, Doa, Testimoni, Tanya Ustadz, TSN, LBU...
          </Text>
        </View>
      ) : results.length === 0 && searching ? (
        <View style={styles.hintBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.hintBox}>
          <Ionicons name={error ? 'cloud-offline-outline' : 'sad-outline'} size={48} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            {error || `Tidak ditemukan hasil untuk "${query}"`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={searching ? <ActivityIndicator style={{ marginTop: Spacing.md }} color={colors.primary} /> : null}
        />
      )}
    </View>
  );
}

export default memo(SearchScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 44 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  resultCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  resultIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultTitle: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 9, fontWeight: '700' },
  resultSub: { fontSize: FontSize.xs, marginTop: 2 },
  hintBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  hintText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});
