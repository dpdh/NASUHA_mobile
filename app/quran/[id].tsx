import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import { useFonts } from 'expo-font';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { fetchSurahDetail, mapAyahToLocal } from '../../services/quranApi';
import {
  playQuranRangeAudio,
    playQuranAudio,
    quranAudioPlayer,
    setQuranPlaybackState,
    stopQuranPlayback,
    subscribeQuranPlayback,
} from '../../services/quranPlayback';
import { useAppStore } from '../../store/appStore';
import type { QuranAyah } from '../../types';

const formatAyahText = (item: QuranAyah, surahName: string) =>
  `QS. ${surahName} [${item.surahId}]:${item.ayahNumber}\n\n${item.arabic}\n\n${item.translation}\n\n— NASUHA App`;

type ArabicFont = 'NotoNaskhArabic-Regular' | 'Amiri-Regular' | 'Lateef-Regular';

// Ukuran teks Arab mengikuti pengaturan ukuran font Quran (12–28) dengan skala lebih besar.
const arabicFontSize = (fontSize: number) => Math.max(24, Math.round(fontSize * 1.75));

const getArabicLineHeight = (fontSize: number, fontFamily: ArabicFont) => {
  const multiplier = fontFamily === 'Lateef-Regular' ? 1.2 : 1.5;
  return Math.round(fontSize * multiplier);
};

const AyahItem = memo(
  ({ item, bookmarked, isLastRead, isPlaying, arabicOnly, arabicFont, onToggle, onMarkRead, onCopy, onShare, onPlay, colors, fontSize }: {
    item: QuranAyah; bookmarked: boolean; isLastRead: boolean;
    onToggle: (key: string) => void; onMarkRead: (ayah: number) => void;
    onCopy: (item: QuranAyah) => void; onShare: (item: QuranAyah) => void; onPlay: (item: QuranAyah) => void;
    isPlaying: boolean; arabicOnly: boolean; arabicFont: ArabicFont;
    colors: typeof Colors.light;
    fontSize: number;
  }) => {
    const key = `${item.surahId}:${item.ayahNumber}`;
    return (
      <View style={[
        styles.ayahCard,
        {
          backgroundColor: isPlaying ? colors.primary + '18' : arabicOnly ? 'transparent' : colors.card,
          borderColor: isPlaying ? colors.primary : isLastRead ? colors.gold : colors.border,
        },
        arabicOnly ? styles.arabicOnlyCard : styles.fullCard,
        isLastRead && !arabicOnly && { borderWidth: 2 },
        isPlaying && !arabicOnly && styles.playingCard,
        !arabicOnly && Shadows.sm,
      ]}>
        {isPlaying && (
          <View style={[styles.playingBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="volume-high" size={10} color="#FFF" />
            <Text style={styles.playingBadgeText}>Sedang Diputar</Text>
          </View>
        )}
        {/* Last read badge */}
        {isLastRead && !arabicOnly && (
          <View style={[styles.lastReadBadge, { backgroundColor: colors.gold }]}>
            <Ionicons name="bookmark" size={10} color="#FFF" />
            <Text style={styles.lastReadBadgeText}>Terakhir Dibaca</Text>
          </View>
        )}

        <View style={styles.ayahHeader}>
          <View style={[styles.ayahNum, { backgroundColor: isPlaying ? colors.primaryDark : isLastRead ? colors.gold : colors.primary }]}>
            <Text style={styles.ayahNumText}>{item.ayahNumber}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => onPlay(item)} hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: (isPlaying ? colors.primary : colors.textMuted) + '15' }]}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={isPlaying ? colors.primary : colors.textMuted} />
            </Pressable>
            {!arabicOnly && <>
            {/* Copy */}
            <Pressable onPress={() => onCopy(item)} hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.textMuted + '15' }]}>
              <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
            </Pressable>
            {/* Share */}
            <Pressable onPress={() => onShare(item)} hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.textMuted + '15' }]}>
              <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
            </Pressable>
            {/* Mark as last read */}
            <Pressable onPress={() => onMarkRead(item.ayahNumber)} hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: (isLastRead ? colors.gold : colors.textMuted) + '15' }]}>
              <Ionicons name={isLastRead ? 'flag' : 'flag-outline'} size={16} color={isLastRead ? colors.gold : colors.textMuted} />
            </Pressable>
            {/* Bookmark */}
            <Pressable onPress={() => onToggle(key)} hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: (bookmarked ? colors.gold : colors.textMuted) + '15' }]}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={bookmarked ? colors.gold : colors.textMuted} />
            </Pressable>
            </>}
          </View>
        </View>
        <Text style={[
          styles.arabic,
          {
            color: colors.text,
            fontSize: arabicFontSize(fontSize),
            lineHeight: getArabicLineHeight(arabicFontSize(fontSize), arabicFont),
            fontFamily: arabicFont,
          },
        ]}>{item.arabic}</Text>
        {!arabicOnly && <Text style={[styles.latin, { color: colors.primary }]}>{item.latin}</Text>}
        {!arabicOnly && <Text style={[styles.translation, { color: colors.textSecondary }]}>{item.translation}</Text>}
      </View>
    );
  },
);

function QuranDetailScreen() {
  useFonts({
    'NotoNaskhArabic-Regular': NotoNaskhArabic_400Regular,
    'Amiri-Regular': Amiri_400Regular,
  });

  const { id, ayah } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const theme = useAppStore((s) => s.theme);
  const bookmarkedAyahs = useAppStore((s) => s.bookmarkedAyahs);
  const toggleBookmarkAyah = useAppStore((s) => s.toggleBookmarkAyah);
  const lastReadAyahs = useAppStore((s) => s.lastReadAyahs);
  const setLastReadAyah = useAppStore((s) => s.setLastReadAyah);
  const quranFontSize = useAppStore((s) => s.quranFontSize);
  const colors = Colors[theme];
  const flatListRef = useRef<FlatList>(null);
  const lastScrollY = useRef(0);
  const surahId = Number(id);
  const requestedAyah = Number(ayah);

  const [ayahs, setAyahs] = useState<QuranAyah[]>([]);
  const [surahName, setSurahName] = useState('');
  const [surahArabic, setSurahArabic] = useState('');
  const [totalAyat, setTotalAyat] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJumpPicker, setShowJumpPicker] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('1');
  const [rangePlayback, setRangePlayback] = useState<{ end: number } | null>(null);
  const [arabicOnly, setArabicOnly] = useState(false);
  const [arabicFont, setArabicFont] = useState<ArabicFont>('NotoNaskhArabic-Regular');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playbackState, setPlaybackState] = useState(() => ({
    isPlaying: false,
    playingKey: null as string | null,
    rangeEnd: null as number | null,
    repeatCount: 1,
    currentRepeat: 0,
    visible: true,
  }));

  const activeAyahKey = playbackState.playingKey ?? playingAyah;
  const ayahsRef = useRef<QuranAyah[]>([]);
  const activeAyahRef = useRef<string | null>(null);
  const playbackStateRef = useRef(playbackState);
  const repeatCountRef = useRef(repeatCount);
  const rangePlaybackRef = useRef<{ end: number } | null>(null);

  const lastReadAyah = lastReadAyahs[String(surahId)] || 0;

  useEffect(() => {
    playbackStateRef.current = playbackState;
    activeAyahRef.current = playbackState.playingKey ?? playingAyah;
    repeatCountRef.current = playbackState.repeatCount || repeatCount;
    rangePlaybackRef.current = playbackState.rangeEnd ? { end: playbackState.rangeEnd } : rangePlayback;
  }, [playbackState, playingAyah, rangePlayback, repeatCount]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeQuranPlayback((next) => {
      setPlaybackState(next);
      setPlayingAyah(next.playingKey);
      setCurrentRepeat(next.currentRepeat || 0);
      setRangePlayback(next.rangeEnd ? { end: next.rangeEnd } : null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    ayahsRef.current = ayahs;
  }, [ayahs]);

  useEffect(() => {
    const subscription = quranAudioPlayer.addListener('playbackStatusUpdate', (status) => {
      if (playbackStateRef.current.rangeEnd) return;
      if (!status.didJustFinish) return;

      const activeAyah = activeAyahRef.current;
      if (!activeAyah) return;

      const nextRepeat = (playbackStateRef.current.currentRepeat || 0) + 1;
      const repeatLimit = playbackStateRef.current.repeatCount || repeatCountRef.current || 1;
      if (nextRepeat <= repeatLimit) {
        setQuranPlaybackState({ currentRepeat: nextRepeat });
        setCurrentRepeat(nextRepeat);
        void quranAudioPlayer.seekTo(0).then(() => quranAudioPlayer.play());
        return;
      }

      const range = rangePlaybackRef.current ?? (playbackStateRef.current.rangeEnd ? { end: playbackStateRef.current.rangeEnd } : null);
      if (range) {
        const currentNumber = Number(activeAyah.split(':')[1]);
        const nextAyah = ayahsRef.current.find(
          (ayah) => ayah.ayahNumber > currentNumber && ayah.ayahNumber <= range.end && Boolean(ayah.audioUrl),
        );

        if (nextAyah?.audioUrl) {
          const nextKey = `${nextAyah.surahId}:${nextAyah.ayahNumber}`;
          activeAyahRef.current = nextKey;
          playQuranAudio({
            url: nextAyah.audioUrl,
            key: nextKey,
            repeatCount: playbackStateRef.current.repeatCount || repeatCountRef.current || 1,
            rangeEnd: range.end,
          });
          setPlayingAyah(nextKey);
          setCurrentRepeat(1);
          return;
        }
      }

      stopQuranPlayback();
      setPlayingAyah(null);
      setCurrentRepeat(0);
      setRangePlayback(null);
    });

    return () => subscription.remove();
  }, []);

  const handlePlayAyah = useCallback((item: QuranAyah) => {
    const key = `${item.surahId}:${item.ayahNumber}`;
    if (!item.audioUrl) {
      Alert.alert('Audio tidak tersedia', 'Audio untuk ayat ini belum tersedia.');
      return;
    }
    if ((activeAyahKey === key || playingAyah === key) && playbackState.isPlaying) {
      stopQuranPlayback();
      setPlayingAyah(null);
      setCurrentRepeat(0);
      setRangePlayback(null);
      return;
    }

    playQuranAudio({ url: item.audioUrl, key, repeatCount, rangeEnd: null });
    setPlayingAyah(key);
    setCurrentRepeat(1);
    setRangePlayback(null);
  }, [activeAyahKey, playbackState.isPlaying, playingAyah, repeatCount]);

  const handlePlayRange = useCallback(() => {
    if (rangePlayback || playbackState.rangeEnd) {
      stopQuranPlayback();
      setPlayingAyah(null);
      setCurrentRepeat(0);
      setRangePlayback(null);
      return;
    }

    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > totalAyat || start > end) {
      Alert.alert('Rentang ayat tidak valid', `Masukkan ayat awal dan akhir antara 1-${totalAyat}, dengan ayat awal tidak lebih besar dari ayat akhir.`);
      return;
    }

    const firstAyah = ayahs.find((ayah) => ayah.ayahNumber === start);
    if (!firstAyah?.audioUrl) {
      Alert.alert('Audio tidak tersedia', `Audio untuk ayat ${start} belum tersedia.`);
      return;
    }

    const rangeTracks = ayahs
      .filter((item) => item.ayahNumber >= start && item.ayahNumber <= end && Boolean(item.audioUrl))
      .map((item) => ({ url: item.audioUrl as string, key: `${item.surahId}:${item.ayahNumber}` }));
    const firstKey = `${firstAyah.surahId}:${firstAyah.ayahNumber}`;
    playQuranRangeAudio({ tracks: rangeTracks, repeatCount, rangeEnd: end });
    setPlayingAyah(firstKey);
    setCurrentRepeat(1);
    setRangePlayback({ end });
  }, [ayahs, playbackState.rangeEnd, rangeEnd, rangePlayback, rangeStart, repeatCount, totalAyat]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const detail = await fetchSurahDetail(surahId);
        if (!cancelled) {
          setSurahName(detail.namaLatin);
          setSurahArabic(detail.nama);
          setTotalAyat(detail.jumlahAyat);
          setAyahs(detail.ayat.map((a) => mapAyahToLocal(surahId, a)));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Gagal memuat ayat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [surahId]);

  useEffect(() => {
    if (!loading && ayahs.length > 0 && lastReadAyah > 0) {
      const idx = ayahs.findIndex((a) => a.ayahNumber === lastReadAyah);
      if (idx > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
        }, 500);
      }
    }
  }, [loading, ayahs, lastReadAyah]);

  useEffect(() => {
    if (!loading && requestedAyah > 0 && ayahs.length > 0) {
      const idx = ayahs.findIndex((item) => item.ayahNumber === requestedAyah);
      if (idx >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
        }, 500);
      }
    }
  }, [ayahs, loading, requestedAyah]);

  useEffect(() => {
    if (!loading && activeAyahKey && ayahs.length > 0) {
      const idx = ayahs.findIndex((a) => `${a.surahId}:${a.ayahNumber}` === activeAyahKey);
      if (idx >= 0) {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.45 });
      }
    }
  }, [activeAyahKey, ayahs, loading]);

  const bookmarkSet = useMemo(() => new Set(bookmarkedAyahs), [bookmarkedAyahs]);

  const handleToggle = useCallback(
    (key: string) => toggleBookmarkAyah(key, `${surahName || `Surah ${surahId}`}: ${key.split(':')[1]}`),
    [toggleBookmarkAyah, surahName, surahId],
  );

  const handleMarkRead = useCallback((ayahNumber: number) => {
    setLastReadAyah(surahId, ayahNumber);
  }, [surahId, setLastReadAyah]);

  const handleCopyAyah = useCallback(async (item: QuranAyah) => {
    const text = formatAyahText(item, surahName || `Surah ${surahId}`);
    await Clipboard.setStringAsync(text);
    Alert.alert('Berhasil', `Ayat ${item.ayahNumber} berhasil disalin`);
  }, [surahName, surahId]);

  const handleShareAyah = useCallback(async (item: QuranAyah) => {
    const text = formatAyahText(item, surahName || `Surah ${surahId}`);
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled
    }
  }, [surahName, surahId]);

  const handleJumpToAyah = useCallback((ayahNumber: number) => {
    const idx = ayahs.findIndex((a) => a.ayahNumber === ayahNumber);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
    setShowJumpPicker(false);
  }, [ayahs]);

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > lastScrollY.current + 12 && controlsVisible) {
      setControlsVisible(false);
    }
    if (y < lastScrollY.current - 12 && !controlsVisible) {
      setControlsVisible(true);
    }
    lastScrollY.current = y;
  }, [controlsVisible]);

  const renderItem = useCallback(({ item }: { item: QuranAyah }) => (
    <AyahItem
      item={item}
      bookmarked={bookmarkSet.has(`${item.surahId}:${item.ayahNumber}`)}
      isLastRead={item.ayahNumber === lastReadAyah}
      onToggle={handleToggle}
      onMarkRead={handleMarkRead}
      onCopy={handleCopyAyah}
      onShare={handleShareAyah}
      onPlay={handlePlayAyah}
      isPlaying={activeAyahKey === `${item.surahId}:${item.ayahNumber}`}
      arabicOnly={arabicOnly}
      arabicFont={arabicFont}
      colors={colors}
      fontSize={quranFontSize}
    />
  ), [activeAyahKey, arabicFont, arabicOnly, bookmarkSet, colors, handleCopyAyah, handleMarkRead, handlePlayAyah, handleShareAyah, handleToggle, lastReadAyah, quranFontSize]);

  const onScrollToIndexFailed = useCallback((info: { index: number }) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
    }, 200);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setShowJumpPicker(!showJumpPicker)} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{surahName || `Surah ${surahId}`}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {/* Latin di depan: bila diawali huruf Arab, Android membalik urutan seluruh baris (BiDi). */}
            {totalAyat || '...'} ayat
            {!arabicOnly && lastReadAyah > 0 ? ` • Terakhir ayat ${lastReadAyah}` : ''}
            {surahArabic ? ` • ${surahArabic}` : ''}
          </Text>
        </Pressable>
        <Pressable onPress={() => setArabicOnly((value) => !value)} hitSlop={12} style={styles.modeButton}>
          <Ionicons name={arabicOnly ? 'text-outline' : 'book-outline'} size={18} color={colors.primary} />
          <Text style={[styles.modeButtonText, { color: colors.primary }]}>{arabicOnly ? 'Lengkap' : 'Arab'}</Text>
        </Pressable>
      </View>

      <View style={[styles.ribbonWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {controlsVisible ? (
          <View style={styles.ribbonMenu}>
            <View style={[styles.ribbonSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Huruf</Text>
              <View style={styles.ribbonOptions}>
                {([['Noto', 'NotoNaskhArabic-Regular'], ['Amiri', 'Amiri-Regular'], ['Lateef', 'Lateef-Regular']] as const).map(([label, value]) => {
                  const active = arabicFont === value;
                  return (
                    <Pressable key={value} onPress={() => setArabicFont(value)} style={[styles.ribbonChip, active && { backgroundColor: colors.primary }]}>
                      <Text style={[styles.ribbonChipText, { color: active ? '#FFF' : colors.textSecondary }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.ribbonSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Ulang</Text>
              <View style={styles.ribbonOptions}>
                {Array.from({ length: 5 }, (_, index) => index + 1).map((count) => (
                  <Pressable key={count} onPress={() => setRepeatCount(count)} style={[styles.ribbonChip, repeatCount === count && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.ribbonChipText, { color: repeatCount === count ? '#FFF' : colors.textSecondary }]}>{count}x</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.ribbonSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Rentang</Text>
              <View style={styles.rangeInlineRow}>
                <TextInput
                  value={rangeStart}
                  onChangeText={setRangeStart}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[styles.rangeInlineInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.rangeInlineSep, { color: colors.textMuted }]}>-</Text>
                <TextInput
                  value={rangeEnd}
                  onChangeText={setRangeEnd}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[styles.rangeInlineInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={handlePlayRange} style={[styles.ribbonPlayButton, { backgroundColor: rangePlayback ? colors.gold : colors.primary }]}>
                  <Ionicons name={rangePlayback ? 'stop' : 'play'} size={12} color="#FFF" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setControlsVisible(true)} style={[styles.peekButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="chevron-up" size={18} color="#FFF" />
          </Pressable>
        )}
      </View>

      {showJumpPicker && totalAyat > 0 && (
        <View style={[styles.jumpPicker, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.jumpLabel, { color: colors.textSecondary }]}>Lompat ke ayat:</Text>
          <FlatList
            data={Array.from({ length: totalAyat }, (_, i) => i + 1)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(n) => String(n)}
            contentContainerStyle={styles.jumpList}
            renderItem={({ item: n }) => (
              <Pressable
                onPress={() => handleJumpToAyah(n)}
                style={[
                  styles.jumpChip,
                  {
                    backgroundColor: n === lastReadAyah ? colors.gold : colors.surface,
                    borderColor: n === lastReadAyah ? colors.gold : colors.border,
                  },
                ]}
              >
                {!arabicOnly && n === lastReadAyah && <Ionicons name="bookmark" size={10} color="#FFF" />}
                <Text style={[styles.jumpChipText, { color: n === lastReadAyah ? '#FFF' : colors.text }]}>{n}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {!arabicOnly && !loading && lastReadAyah > 0 && !showJumpPicker && (
        <Pressable
          onPress={() => handleJumpToAyah(lastReadAyah)}
          style={[styles.lastReadBanner, { backgroundColor: colors.gold + '15', borderBottomColor: colors.gold + '30' }]}
        >
          <Ionicons name="bookmark" size={16} color={colors.gold} />
          <Text style={[styles.lastReadText, { color: colors.gold }]}>Terakhir dibaca: Ayat {lastReadAyah}</Text>
          <Text style={[styles.lastReadCta, { color: colors.gold }]}>Lanjutkan →</Text>
        </Pressable>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat ayat...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchSurahDetail(surahId)
                .then((d) => {
                  setSurahName(d.namaLatin);
                  setSurahArabic(d.nama);
                  setTotalAyat(d.jumlahAyat);
                  setAyahs(d.ayat.map((a) => mapAyahToLocal(surahId, a)));
                })
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
            style={[styles.retryBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={ayahs}
          keyExtractor={(item) => `${item.surahId}:${item.ayahNumber}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          onScroll={handleScroll}
          onScrollToIndexFailed={onScrollToIndexFailed}
          ListHeaderComponent={
            surahId !== 1 && surahId !== 9 ? (
              <View style={[styles.bismillah, { backgroundColor: arabicOnly ? 'transparent' : colors.card, borderColor: colors.border }, arabicOnly && styles.arabicOnlyBismillah]}>
                <Text
                  style={[
                    styles.bismillahText,
                    {
                      color: colors.text,
                      fontFamily: arabicFont,
                      lineHeight: getArabicLineHeight(30, arabicFont),
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {playbackState.isPlaying && (
        <Pressable
          onPress={() => {
            stopQuranPlayback();
            setPlayingAyah(null);
            setCurrentRepeat(0);
            setRangePlayback(null);
          }}
          style={[styles.floatingStop, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="stop-circle" size={18} color="#FFF" />
          <Text style={styles.floatingStopText}>{rangePlayback ? `Stop ${rangeStart}-${rangeEnd}` : `Stop • ${currentRepeat}x`}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default memo(QuranDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  modeButton: { alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  modeButtonText: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  ribbonWrapper: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, zIndex: 8 },
  ribbonMenu: { gap: Spacing.xs },
  ribbonSection: { borderRadius: BorderRadius.md, padding: Spacing.xs },
  ribbonLabel: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: Spacing.xs, marginLeft: Spacing.xs },
  ribbonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  ribbonChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: BorderRadius.sm, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  ribbonChipText: { fontSize: 10, fontWeight: '700' },
  rangeInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rangeInlineInput: { width: 42, height: 28, borderWidth: 1, borderRadius: BorderRadius.sm, textAlign: 'center', fontSize: FontSize.xs, paddingVertical: 0 },
  rangeInlineSep: { fontSize: FontSize.sm, fontWeight: '700' },
  ribbonPlayButton: { width: 30, height: 30, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  peekButton: { alignSelf: 'center', width: 42, height: 32, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  fontPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  fontPickerLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  fontPickerOptions: { flex: 1, flexDirection: 'row', borderRadius: BorderRadius.md, padding: 3, gap: 3 },
  fontOption: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: BorderRadius.sm },
  fontOptionText: { fontSize: FontSize.xs, fontWeight: '700' },
  repeatPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.xs },
  repeatOptions: { flex: 1, flexDirection: 'row', borderRadius: BorderRadius.md, padding: 3, gap: 2 },
  repeatOption: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: BorderRadius.sm },
  repeatOptionText: { fontSize: 10, fontWeight: '700' },
  rangePicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.xs },
  rangeLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  rangeInput: { width: 48, height: 32, borderWidth: 1, borderRadius: BorderRadius.sm, textAlign: 'center', fontSize: FontSize.sm, paddingVertical: 0 },
  rangeTo: { fontSize: FontSize.xs },
  rangePlayButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 68, height: 32, borderRadius: BorderRadius.sm, paddingHorizontal: 8 },
  rangePlayText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },
  ayahCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  playingCard: { borderWidth: 2 },
  fullCard: {},
  arabicOnlyCard: { borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: Spacing.md },
  ayahHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  ayahNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ayahNumText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  playingBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  playingBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arabic: { fontSize: 30, lineHeight: 42, letterSpacing: 0.15, textAlign: 'right', marginBottom: Spacing.sm },
  latin: { fontSize: FontSize.sm, fontStyle: 'italic', marginBottom: 4 },
  translation: { fontSize: FontSize.md, lineHeight: 22 },
  bismillah: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.md },
  arabicOnlyBismillah: { borderWidth: 0, paddingHorizontal: 0, paddingVertical: Spacing.md },
  bismillahText: { width: '100%', fontSize: 30, lineHeight: 58, textAlign: 'center', includeFontPadding: true, fontFamily: 'Lateef-Bold' },

  // Last Read Badge on card
  lastReadBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  lastReadBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Last Read Banner
  lastReadBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, gap: Spacing.sm },
  lastReadText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  lastReadCta: { fontSize: FontSize.sm, fontWeight: '700' },

  // Jump Picker
  jumpPicker: { paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  jumpLabel: { fontSize: FontSize.xs, fontWeight: '600', paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  jumpList: { paddingHorizontal: Spacing.lg, gap: 6 },
  jumpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 36, height: 32, paddingHorizontal: 10, borderRadius: BorderRadius.full, borderWidth: 1, justifyContent: 'center' },
  jumpChipText: { fontSize: FontSize.sm, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  errorText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5 },
  retryText: { fontSize: FontSize.md, fontWeight: '700' },
  floatingStop: { position: 'absolute', right: Spacing.lg, bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.full, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  floatingStopText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '700' },
});
