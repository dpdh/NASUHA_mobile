import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { getAnasResponse, SUGGESTED_QUESTIONS } from '../../services/anasBot';

interface ChatMessage {
  id: string;
  role: 'user' | 'anas';
  text: string;
  topic?: string;
  timestamp: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'anas',
  text: `Assalamu'alaikum! 👋

Saya **Anas**, asisten virtual NASUHA Jakarta. Saya siap membantu menjawab pertanyaan Anda seputar:

🔹 Hukum Riba & Dalilnya
🔹 Penyelesaian Utang Riba
🔹 Mediasi & Negosiasi dengan Bank
🔹 Cara Bersurat dengan Bank
🔹 Keuangan Syariah
🔹 Fundamental Aqidah
🔹 Program LBU NASUHA
🔹 Doa Pelunasan Utang

Silakan tanyakan apa saja! 👇`,
  topic: 'Salam',
  timestamp: new Date().toISOString(),
};

const LITERACY_TOPICS = [
  { question: 'Literasi riba dan keadilan', title: 'Riba & Keadilan', description: 'Pokok harta, tenggang waktu, dan prinsip tidak menzalimi.', icon: 'scale-outline' as const },
  { question: 'Literasi negosiasi utang', title: 'Negosiasi Utang', description: 'Debt map, restrukturisasi, settlement, dan komunikasi tertulis.', icon: 'chatbubbles-outline' as const },
  { question: 'Literasi doa dan pemulihan utang', title: 'Doa & Pemulihan', description: 'Doa ma’tsur yang berjalan bersama ikhtiar dan disiplin.', icon: 'sparkles-outline' as const },
  { question: 'Bagaimana recovery journey bebas utang?', title: 'Recovery Journey', description: 'Langkah dari pemetaan utang hingga pembayaran konsisten.', icon: 'footsteps-outline' as const },
];

const MessageBubble = memo(({ msg, colors }: { msg: ChatMessage; colors: typeof Colors.light }) => {
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.anasAvatar}>
          <Text style={styles.anasAvatarText}>A</Text>
        </LinearGradient>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleAnas, { backgroundColor: colors.card, borderColor: colors.border }],
      ]}>
        {!isUser && msg.topic && msg.topic !== 'Salam' && msg.topic !== 'Umum' && (
          <View style={[styles.topicBadge, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="bookmark" size={10} color={colors.primary} />
            <Text style={[styles.topicText, { color: colors.primary }]}>{msg.topic}</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, { color: isUser ? '#FFF' : colors.text }]}>{msg.text}</Text>
        <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
          {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
});

function AsistenScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setTyping(true);
    scrollToBottom();

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    const { topic, response } = getAnasResponse(text);
    const anasMsg: ChatMessage = {
      id: `anas_${Date.now()}`,
      role: 'anas',
      text: response,
      topic,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, anasMsg]);
    setTyping(false);
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleSuggestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble msg={item} colors={colors} />,
    [colors],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.headerName}>Asisten Anas</Text>
              <Text style={styles.headerStatus}>{typing ? 'Sedang mengetik...' : 'Online · NASUHA Jakarta'}</Text>
            </View>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListHeaderComponent={
            <View style={[styles.literacyPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.literacyHeading}>
                <View style={[styles.literacyIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="library-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.literacyTitle, { color: colors.text }]}>Pustaka ANAS</Text>
                  <Text style={[styles.literacySubtitle, { color: colors.textSecondary }]}>Literasi singkat untuk memahami dan menyelesaikan utang dengan adil.</Text>
                </View>
              </View>
              <View style={styles.literacyGrid}>
                {LITERACY_TOPICS.map((item) => (
                  <Pressable key={item.question} onPress={() => handleSuggestion(item.question)} style={[styles.literacyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                    <Text style={[styles.literacyCardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.literacyCardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            <>
              {typing && (
                <View style={[styles.bubbleRow]}>
                  <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.anasAvatar}>
                    <Text style={styles.anasAvatarText}>A</Text>
                  </LinearGradient>
                  <View style={[styles.bubble, styles.bubbleAnas, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.typingDots, { color: colors.textMuted }]}>Anas sedang mengetik...</Text>
                  </View>
                </View>
              )}
              {showSuggestions && messages.length <= 1 && (
                <View style={styles.suggestionsWrap}>
                  <Text style={[styles.sugLabel, { color: colors.textMuted }]}>Pertanyaan yang sering ditanyakan:</Text>
                  <View style={styles.sugGrid}>
                    {SUGGESTED_QUESTIONS.slice(0, 6).map((q) => (
                      <Pressable key={q} onPress={() => handleSuggestion(q)}
                        style={[styles.sugChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sugText, { color: colors.primary }]}>{q}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          }
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Tanya Asisten Anas..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onFocus={scrollToBottom}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
          <Pressable onPress={handleSend} disabled={!input.trim() || typing}
            style={({ pressed }) => [styles.sendBtn, { opacity: (!input.trim() || typing) ? 0.4 : pressed ? 0.8 : 1 }]}>
            <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.sendBtnGradient}>
              <Ionicons name="send" size={20} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default memo(AsistenScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#FFF', fontWeight: '900', fontSize: FontSize.lg },
  headerName: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
  headerStatus: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs },

  messageList: { padding: Spacing.md, paddingBottom: 8 },

  literacyPanel: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg },
  literacyHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  literacyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  literacyTitle: { fontSize: FontSize.md, fontWeight: '800' },
  literacySubtitle: { fontSize: FontSize.xs, lineHeight: 17, marginTop: 2 },
  literacyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  literacyCard: { width: '48%', minHeight: 112, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.sm },
  literacyCardTitle: { fontSize: FontSize.sm, fontWeight: '800', marginTop: 8 },
  literacyCardDescription: { fontSize: FontSize.xs, lineHeight: 16, marginTop: 3 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm, gap: Spacing.xs },
  bubbleRowUser: { justifyContent: 'flex-end' },
  anasAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  anasAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  bubble: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAnas: { borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: FontSize.md, lineHeight: 22 },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },

  topicBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  topicText: { fontSize: 10, fontWeight: '700' },

  typingDots: { fontSize: FontSize.sm, fontStyle: 'italic' },

  suggestionsWrap: { paddingHorizontal: Spacing.xs, paddingTop: Spacing.md },
  sugLabel: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  sugGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  sugChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  sugText: { fontSize: FontSize.sm, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm, gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  inputBox: { flex: 1, borderRadius: BorderRadius.xl, borderWidth: 1, paddingHorizontal: Spacing.md, minHeight: 44, maxHeight: 100, justifyContent: 'center' },
  textInput: { fontSize: FontSize.md, lineHeight: 20, paddingVertical: 10 },
  sendBtn: {},
  sendBtnGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
