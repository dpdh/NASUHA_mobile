import React, { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { RASULULLAH_STORIES } from '../../constants/kisah';
import { NABI_STORIES } from '../../constants/kisah-nabi';
import { useApiQuery } from '../../hooks/useApiQuery';
import { featureApi } from '../../services/nasjakApi';
import type { StoryCategory, StorySummary } from '../../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type LocalStory = StorySummary & { body?: string };

const STORY_GROUPS: Record<StoryCategory, { label: string; color: string; icons: IconName[] }> = {
  rasul: { label: 'Kisah Rasulullah SAW', color: '#2E8B83', icons: ['heart-outline', 'sunny-outline', 'sparkles-outline'] },
  nabi: { label: 'Kisah Nabi', color: '#B9822B', icons: ['book-outline'] },
  sahabat: { label: 'Kisah Sahabat Nabi', color: '#4977A4', icons: ['people-outline', 'scale-outline', 'musical-notes-outline'] },
};

// Konten bawaan app: dipakai saat server belum terjangkau (offline / pertama kali dibuka).
const RASUL_SUMMARIES = [
  'Meneladani amanah dan kejujuran Rasulullah dalam berdagang dan bermuamalah.',
  'Kelembutan, kesabaran, dan kasih sayang Rasulullah kepada umat dan makhluk hidup.',
  'Pelajaran tentang pemaafan dan kemenangan akhlak dalam perjalanan dakwah.',
];
const FALLBACK_STORIES: LocalStory[] = [
  ...RASULULLAH_STORIES.map((story, index) => ({ id: `rasul-${index}`, category: 'rasul' as const, title: story.title, person: story.person, summary: RASUL_SUMMARIES[index] || '', body: story.body })),
  ...NABI_STORIES.map((story, index) => ({ id: `nabi-${index}`, category: 'nabi' as const, title: story.title, person: story.person, summary: story.summary, body: story.body })),
  { id: 'sahabat-0', category: 'sahabat', title: 'Abu Bakar dan Kejujuran', person: 'Abu Bakar Ash-Shiddiq RA', summary: 'Keteguhan iman, kelembutan hati, dan keberanian mendampingi Rasulullah.' },
  { id: 'sahabat-1', category: 'sahabat', title: 'Umar dan Keadilan', person: 'Umar bin Khattab RA', summary: 'Keadilan yang lahir dari rasa takut kepada Allah dan kepedulian kepada rakyat.' },
  { id: 'sahabat-2', category: 'sahabat', title: 'Bilal dan Keteguhan Tauhid', person: 'Bilal bin Rabah RA', summary: 'Keteguhan mempertahankan iman meski berada dalam tekanan dan siksaan.' },
];

function KisahScreen() {
  const theme = useAppStore((state) => state.theme);
  const colors = Colors[theme];
  const [activeCategory, setActiveCategory] = useState<StoryCategory>('rasul');
  const [selectedStory, setSelectedStory] = useState<LocalStory | null>(null);
  const activeGroup = STORY_GROUPS[activeCategory];

  const { data } = useApiQuery<LocalStory[]>(() => featureApi.stories(), [], { cacheKey: 'stories', fallback: FALLBACK_STORIES });
  const stories = useMemo(() => (data?.length ? data : FALLBACK_STORIES).filter((story) => story.category === activeCategory), [data, activeCategory]);

  // Isi lengkap diambil saat kisah dibuka; selama memuat/offline pakai isi bawaan bila ada.
  const fallbackBody = selectedStory?.body ?? FALLBACK_STORIES.find((story) => story.title === selectedStory?.title)?.body;
  const isLocalStory = !selectedStory || FALLBACK_STORIES.some((story) => story.id === selectedStory.id);
  const { data: detail, loading: detailLoading } = useApiQuery(
    () => featureApi.story(selectedStory!.id),
    [selectedStory?.id],
    { enabled: !isLocalStory, cacheKey: selectedStory && !isLocalStory ? `story_${selectedStory.id}` : undefined },
  );
  const storyBody = (detail?.id === selectedStory?.id ? detail?.body : undefined) || fallbackBody || selectedStory?.summary;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>Kisah Teladan</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Belajar dari perjalanan orang-orang pilihan</Text></View>
        <Ionicons name="book-outline" size={25} color={colors.primary} />
      </View>

      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
        <View style={[styles.heroIcon, { backgroundColor: activeGroup.color + '18' }]}><Ionicons name="sparkles" size={27} color={activeGroup.color} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.heroKicker, { color: activeGroup.color }]}>RENUNGAN HARI INI</Text><Text style={[styles.heroTitle, { color: colors.text }]}>Satu kisah, satu teladan, satu langkah baik.</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(Object.keys(STORY_GROUPS) as StoryCategory[]).map((category) => {
          const group = STORY_GROUPS[category];
          const active = category === activeCategory;
          return <Pressable key={category} onPress={() => setActiveCategory(category)} style={[styles.tab, { backgroundColor: active ? group.color : colors.card, borderColor: active ? group.color : colors.border }]}><Text style={[styles.tabText, { color: active ? '#FFF' : colors.textSecondary }]}>{group.label}</Text></Pressable>;
        })}
      </ScrollView>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeGroup.label}</Text>
      {stories.map((story, index) => (
        <Pressable key={story.id} onPress={() => setSelectedStory(story)} style={[styles.storyCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={[styles.storyIcon, { backgroundColor: activeGroup.color + '18' }]}><Ionicons name={activeGroup.icons[index % activeGroup.icons.length]} size={23} color={activeGroup.color} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.storyTitle, { color: colors.text }]}>{story.title}</Text><Text style={[styles.storyPerson, { color: activeGroup.color }]}>{story.person}</Text><Text style={[styles.storySummary, { color: colors.textSecondary }]}>{story.summary}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
      <View style={styles.footerSpace} />
      <Modal visible={selectedStory !== null} animationType="slide" onRequestClose={() => setSelectedStory(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setSelectedStory(null)} hitSlop={12}><Ionicons name="close" size={25} color={colors.text} /></Pressable>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Kisah Teladan</Text>
            <View style={{ width: 25 }} />
          </View>
          {selectedStory && <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalKicker, { color: activeGroup.color }]}>{activeGroup.label.toUpperCase()}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedStory.title}</Text>
            <Text style={[styles.modalPerson, { color: activeGroup.color }]}>{selectedStory.person}</Text>
            <View style={[styles.modalRule, { backgroundColor: activeGroup.color }]} />
            {detailLoading && !fallbackBody ? <ActivityIndicator color={activeGroup.color} style={{ marginTop: Spacing.lg }} /> : null}
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>{storyBody}</Text>
          </ScrollView>}
        </View>
      </Modal>
    </ScrollView>
  );
}

export default memo(KisahScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '900' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  hero: { margin: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { fontSize: FontSize.lg, fontWeight: '800', lineHeight: 22, marginTop: 3 },
  tabs: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabText: { fontSize: FontSize.xs, fontWeight: '800' },
  sectionTitle: { marginHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm, fontSize: FontSize.xl, fontWeight: '900' },
  storyCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storyIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  storyTitle: { fontSize: FontSize.md, fontWeight: '800' },
  storyPerson: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 3 },
  storySummary: { fontSize: FontSize.sm, lineHeight: 18, marginTop: 4 },
  footerSpace: { height: 24 },
  modalContainer: { flex: 1 },
  modalHeader: { paddingTop: 54, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  modalHeaderTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  modalContent: { padding: Spacing.lg, paddingBottom: 48 },
  modalKicker: { fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: Spacing.sm },
  modalPerson: { fontSize: FontSize.sm, fontWeight: '800', marginTop: Spacing.sm },
  modalRule: { width: 56, height: 3, marginVertical: Spacing.lg },
  modalBody: { fontSize: FontSize.lg, lineHeight: 29 },
});
