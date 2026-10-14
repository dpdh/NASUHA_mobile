import React, { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { BorderRadius, Colors, FontSize, Spacing } from '../../constants/theme';
import { fetchHadisCollections } from '../../services/hadisApi';
import { fetchAllSurahs } from '../../services/quranApi';

function BookmarksScreen() {
  const theme = useAppStore((state) => state.theme);
  const bookmarkedAyahs = useAppStore((state) => state.bookmarkedAyahs);
  const bookmarkedHadiths = useAppStore((state) => state.bookmarkedHadiths);
  const toggleBookmarkAyah = useAppStore((state) => state.toggleBookmarkAyah);
  const toggleBookmarkHadith = useAppStore((state) => state.toggleBookmarkHadith);
  const colors = Colors[theme];
  const [surahNames, setSurahNames] = useState<Record<string, string>>({});
  const [kitabNames, setKitabNames] = useState<Record<string, string>>({});

  // Nama surah & kitab dari cache API (best effort; tanpa jaringan tetap tampil nomor).
  useEffect(() => {
    fetchAllSurahs()
      .then((list) => setSurahNames(Object.fromEntries(list.map((surah) => [String(surah.nomor), surah.namaLatin]))))
      .catch(() => {});
    fetchHadisCollections()
      .then((list) => setKitabNames(Object.fromEntries(list.map((kitab) => [kitab.slug, kitab.name]))))
      .catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Bookmark</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ayat Al-Qur'an dan hadis tersimpan</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ayat Al-Qur'an ({bookmarkedAyahs.length})</Text>
        {bookmarkedAyahs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Belum ada ayat yang disimpan.</Text>
        ) : bookmarkedAyahs.map((key) => {
          const [surahId, ayahNumber] = key.split(':');
          return (
            <Pressable key={key} onPress={() => router.push(`/quran/${surahId}` as any)} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bookmark" size={18} color={colors.gold} />
              <Text style={[styles.itemText, { color: colors.text }]}>
                {surahNames[surahId] ? `${surahNames[surahId]} (${surahId})` : `Surah ${surahId}`}, ayat {ayahNumber}
              </Text>
              <Pressable onPress={() => toggleBookmarkAyah(key)} hitSlop={10} accessibilityLabel="Hapus bookmark">
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          );
        })}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hadis ({bookmarkedHadiths.length})</Text>
        {bookmarkedHadiths.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Belum ada hadis yang disimpan.</Text>
        ) : bookmarkedHadiths.map((ref) => {
          const [slug, number] = ref.split(':');
          return (
            <Pressable key={ref} onPress={() => router.push(`/hadis/${slug}` as any)} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bookmark" size={18} color={colors.gold} />
              <Text style={[styles.itemText, { color: colors.text }]}>{kitabNames[slug] || slug} No. {number}</Text>
              <Pressable onPress={() => toggleBookmarkHadith(ref)} hitSlop={10} accessibilityLabel="Hapus bookmark">
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(BookmarksScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerText: { flex: 1, marginLeft: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.md, marginBottom: Spacing.sm },
  empty: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  itemText: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
});
