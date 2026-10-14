import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { NAS_GAME_QUESTIONS } from '../../constants/games';
import { useAppStore } from '../../store/appStore';

const CATEGORIES = ['Semua', 'Hukum Islam', 'Sahabat Nabi', 'Akad Syariah', 'Khazanah Islam'] as const;

type Category = (typeof CATEGORIES)[number];

function GamesNasScreen() {
  const theme = useAppStore((state) => state.theme);
  const colors = Colors[theme];
  const [category, setCategory] = useState<Category>('Semua');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const questions = useMemo(
    () => category === 'Semua' ? NAS_GAME_QUESTIONS : NAS_GAME_QUESTIONS.filter((item) => item.category === category),
    [category],
  );
  const question = questions[questionIndex % questions.length];
  const answered = selected !== null;
  const isCorrect = selected === question.answer;

  const chooseCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    setQuestionIndex(0);
    setSelected(null);
    setScore(0);
  };

  const chooseAnswer = (answer: string) => {
    if (answered) return;
    setSelected(answer);
    if (answer === question.answer) setScore((current) => current + 1);
  };

  const nextQuestion = () => {
    setQuestionIndex((current) => (current + 1) % questions.length);
    setSelected(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0B3457', '#087E8B', '#C9972B']} style={styles.hero}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <View style={styles.heroBadge}><Ionicons name="sparkles" size={15} color="#FBE7A1" /><Text style={styles.heroBadgeText}>NASUHA PLAYGROUND</Text></View>
          <Text style={styles.heroTitle}>Games NAS</Text>
          <Text style={styles.heroSubtitle}>Tebak jawaban tentang syariah, hukum Islam, sahabat Nabi, dan khazanah Islam.</Text>
          <View style={styles.scorePill}><Ionicons name="trophy" size={16} color="#FBE7A1" /><Text style={styles.scoreText}>Skor {score}</Text></View>
        </LinearGradient>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Pilih tema</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((item) => <Pressable key={item} onPress={() => chooseCategory(item)} style={[styles.categoryChip, { backgroundColor: category === item ? colors.primary : colors.card, borderColor: category === item ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === item ? '#FFF' : colors.textSecondary }]}>{item}</Text></Pressable>)}
        </ScrollView>

        <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <View style={styles.questionHeader}><Text style={[styles.questionNumber, { color: colors.primary }]}>SOAL {(questionIndex % questions.length) + 1} / {questions.length}</Text><Text style={[styles.questionCategory, { color: colors.textMuted }]}>{question.category}</Text></View>
          <Text style={[styles.questionText, { color: colors.text }]}>{question.question}</Text>
          <View style={styles.answers}>
            {question.choices.map((choice, index) => {
              const isSelected = selected === choice;
              const isAnswer = answered && choice === question.answer;
              return <Pressable key={choice} onPress={() => chooseAnswer(choice)} style={[styles.answerRow, { backgroundColor: isAnswer ? '#E5F5E9' : isSelected ? '#FFF4D6' : colors.background, borderColor: isAnswer ? '#3A9D62' : isSelected ? '#C9972B' : colors.border }]}><View style={[styles.answerLetter, { backgroundColor: isAnswer ? '#3A9D62' : isSelected ? '#C9972B' : colors.primary }]}><Text style={styles.answerLetterText}>{String.fromCharCode(65 + index)}</Text></View><Text style={[styles.answerText, { color: colors.text }]}>{choice}</Text>{isAnswer && <Ionicons name="checkmark-circle" size={22} color="#3A9D62" />}{isSelected && !isAnswer && <Ionicons name="close-circle" size={22} color="#C9972B" />}</Pressable>;
            })}
          </View>
          {answered && <View style={[styles.feedback, { backgroundColor: isCorrect ? '#E5F5E9' : '#FFF4D6' }]}><Text style={[styles.feedbackTitle, { color: isCorrect ? '#26734D' : '#956E14' }]}>{isCorrect ? 'Jawaban tepat.' : `Jawaban yang benar: ${question.answer}`}</Text><Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{question.explanation}</Text></View>}
          <Pressable onPress={nextQuestion} disabled={!answered} style={[styles.nextButton, { backgroundColor: answered ? colors.primary : colors.border }]}><Text style={styles.nextButtonText}>Soal berikutnya</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></Pressable>
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>Materi untuk edukasi dasar. Rincian fikih dan transaksi nyata dapat berbeda menurut mazhab, fatwa, dan otoritas yang berlaku. Gunakan guru atau ahli yang kompeten.</Text>
      </ScrollView>
    </View>
  );
}

export default memo(GamesNasScreen);

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { paddingBottom: 34 },
  hero: { padding: Spacing.lg, paddingTop: 54, minHeight: 245, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 26 }, heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 }, heroBadgeText: { color: '#FBE7A1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, heroTitle: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 10 }, heroSubtitle: { color: 'rgba(255,255,255,0.86)', fontSize: FontSize.md, lineHeight: 21, maxWidth: 340, marginTop: 4 }, scorePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.18)' }, scoreText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '800' }, sectionLabel: { fontSize: FontSize.lg, fontWeight: '900', marginHorizontal: Spacing.lg, marginTop: Spacing.lg }, categoryRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingVertical: 12 }, categoryChip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8 }, categoryText: { fontSize: FontSize.xs, fontWeight: '800' }, questionCard: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.md }, questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, questionNumber: { fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1 }, questionCategory: { fontSize: FontSize.xs, fontWeight: '700' }, questionText: { fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: Spacing.md }, answers: { gap: 9, marginTop: Spacing.lg }, answerRow: { minHeight: 56, borderRadius: BorderRadius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 }, answerLetter: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, answerLetterText: { color: '#FFF', fontWeight: '900' }, answerText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', lineHeight: 19 }, feedback: { padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md }, feedbackTitle: { fontSize: FontSize.md, fontWeight: '900' }, feedbackText: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 }, nextButton: { minHeight: 48, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.md }, nextButtonText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '900' }, note: { marginHorizontal: Spacing.lg, textAlign: 'center', fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.lg },
});
