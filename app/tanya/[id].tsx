import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { ApiError, errorMessage } from '../../services/api';
import { questionApi } from '../../services/nasjakApi';
import type { Answer } from '../../types';

const CAT_COLORS: Record<string, string> = { 'Keuangan Syariah': '#2EC4B6', Hijrah: '#7B61FF', Fiqh: '#D4A853', Bisnis: '#FF6B6B', Umum: '#4A90D9' };

const AnswerCard = memo(({ item, colors }: { item: Answer; colors: typeof Colors.light }) => (
  <View style={[
    styles.answerCard,
    { backgroundColor: colors.surface, borderColor: item.isOfficial ? colors.success : colors.border },
    item.isOfficial && { borderWidth: 1.5 },
  ]}>
    <View style={styles.answerHeader}>
      <View style={[styles.answerAvatar, { backgroundColor: item.isOfficial ? colors.success : colors.primary }]}>
        <Text style={styles.answerAvatarText}>{item.userName.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.answerName, { color: colors.text }]}>{item.userName}</Text>
        <Text style={[styles.answerDate, { color: colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString('id-ID')}</Text>
      </View>
      {item.isOfficial && (
        <View style={[styles.officialBadge, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={12} color={colors.success} />
          <Text style={[styles.officialText, { color: colors.success }]}>Jawaban Resmi Ustadz</Text>
        </View>
      )}
    </View>
    <Text style={[styles.answerBody, { color: colors.textSecondary }]}>{item.body}</Text>
  </View>
));
AnswerCard.displayName = 'AnswerCard';

function TanyaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const { data: question, loading, refreshing, refresh, reload, error } = useApiQuery(
    () => questionApi.detail(String(id)),
    [id],
  );
  const [answerText, setAnswerText] = useState('');
  const [sending, setSending] = useState(false);

  if (loading) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons name="help-circle-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error || 'Pertanyaan tidak ditemukan'}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const answers = question.answers ?? [];
  const canDelete = Boolean(question.isMine) && !question.hasOfficialAnswer;

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return Alert.alert('Error', 'Jawaban harus diisi');
    if (!user) return Alert.alert('Error', 'Silakan login terlebih dahulu');

    setSending(true);
    try {
      await questionApi.answer(question.id, answerText.trim());
      setAnswerText('');
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.isFeatureLocked) {
        Alert.alert('Fitur Khusus Member', 'Menjawab pertanyaan tersedia untuk member. Hubungi admin atau korda Anda untuk upgrade membership.');
      } else {
        Alert.alert('Gagal', errorMessage(caught));
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Hapus Pertanyaan', 'Yakin ingin menghapus pertanyaan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await questionApi.remove(question.id);
            router.back();
          } catch (caught) {
            Alert.alert('Gagal', errorMessage(caught));
          }
        },
      },
    ]);
  };

  const catColor = CAT_COLORS[question.category] || colors.primary;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Detail Pertanyaan</Text>
          {canDelete ? (
            <Pressable onPress={handleDelete} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* Question */}
          <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <View style={styles.qHeader}>
              <View style={[styles.avatar, { backgroundColor: catColor }]}>
                <Text style={styles.avatarText}>{question.userName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.qUserName, { color: colors.text }]}>{question.userName}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.catBadge, { backgroundColor: catColor + '20' }]}>
                    <Text style={[styles.catText, { color: catColor }]}>{question.category}</Text>
                  </View>
                  <Text style={[styles.qDate, { color: colors.textMuted }]}>{new Date(question.createdAt).toLocaleDateString('id-ID')}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.qTitle, { color: colors.text }]}>{question.title}</Text>
            <Text style={[styles.qBody, { color: colors.textSecondary }]}>{question.body}</Text>
          </View>

          {/* Answers */}
          <View style={styles.answersSection}>
            <Text style={[styles.answersTitle, { color: colors.text }]}>
              {answers.length} Jawaban
            </Text>
            {answers.length === 0 ? (
              <View style={styles.noAnswers}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.noAnswersText, { color: colors.textSecondary }]}>Belum ada jawaban. Jadilah yang pertama menjawab!</Text>
              </View>
            ) : (
              answers.map((a) => <AnswerCard key={a.id} item={a} colors={colors} />)
            )}
          </View>
        </ScrollView>

        {/* Answer Input */}
        <View style={[styles.inputBar, { paddingBottom: Spacing.md + insets.bottom, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.answerInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Tulis jawaban..."
            placeholderTextColor={colors.textMuted}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
          />
          <Pressable onPress={handleSubmitAnswer} disabled={sending} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 }]}>
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default memo(TanyaDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  questionCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  qUserName: { fontSize: FontSize.md, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  catText: { fontSize: FontSize.xs, fontWeight: '700' },
  qDate: { fontSize: FontSize.xs },
  qTitle: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.md },
  qBody: { fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm },
  answersSection: { marginTop: Spacing.xl },
  answersTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  answerCard: { borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  answerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  answerAvatarText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  answerName: { fontSize: FontSize.sm, fontWeight: '700' },
  answerDate: { fontSize: FontSize.xs },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  officialText: { fontSize: 10, fontWeight: '800' },
  answerBody: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
  noAnswers: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noAnswersText: { fontSize: FontSize.sm, textAlign: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md, gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  answerInput: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.md, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.md },
  backBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5, marginTop: Spacing.md },
});
