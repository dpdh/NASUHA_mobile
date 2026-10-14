import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, FontSize, Spacing, getColors } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { errorMessage } from '../../services/api';
import { featureApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';
import type { WorshipGroup } from '../../types';

// Grup bawaan (offline). Keanggotaan & jumlah anggota disimpan di server.
const FALLBACK_GROUPS: WorshipGroup[] = [
  { id: 'tahajud-call', name: 'Tahajud Call', description: 'Saling membangunkan dan menguatkan untuk shalat Tahajud.', schedule: '02.30', icon: 'moon', color: '#355C7D', reminderKey: 'tahajudCallEnabled', memberCount: 0, joined: false },
  { id: 'dhuha-call', name: 'Dhuha Call', description: 'Mengingatkan waktu Dhuha dan berbagi semangat kebaikan.', schedule: '07.00 - 11.30', icon: 'sunny', color: '#D08B32', reminderKey: 'dhuhaReminderEnabled', memberCount: 0, joined: false },
  { id: 'taubat-call', name: 'Taubat Call', description: 'Menjaga waktu muhasabah dan shalat Taubat bersama.', schedule: '3 kali sehari', icon: 'heart', color: '#2E8B78', reminderKey: 'taubatReminderEnabled', memberCount: 0, joined: false },
];

function WorshipGroupsScreen() {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const theme = useAppStore((state) => state.theme);
  const colors = getColors(colorScheme)[theme];
  const user = useAppStore((state) => state.user);
  const updateNotificationSettings = useAppStore((state) => state.updateNotificationSettings);
  const { data } = useApiQuery(() => featureApi.worshipGroups(), [user?.id], { cacheKey: user ? `worship_groups_${user.id}` : 'worship_groups', fallback: FALLBACK_GROUPS });
  const [groups, setGroups] = useState<WorshipGroup[]>(FALLBACK_GROUPS);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (data?.length) setGroups(data);
  }, [data]);

  const toggleGroup = async (group: WorshipGroup) => {
    if (!user) {
      Alert.alert('Masuk dulu', 'Login untuk bergabung di grup ibadah dan menerima pengingatnya.', [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    setPendingId(group.id);
    try {
      const updated = group.joined ? await featureApi.leaveWorshipGroup(group.id) : await featureApi.joinWorshipGroup(group.id);
      setGroups((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      // Bergabung = aktifkan pengingat lokal grup ini (Tahajud/Dhuha/Taubat); keluar = matikan.
      if (updated.reminderKey) updateNotificationSettings({ [updated.reminderKey]: updated.joined });
    } catch (error) {
      Alert.alert('Gagal', errorMessage(error));
    } finally {
      setPendingId(null);
    }
  };

  const copyLink = async (groupId: string) => {
    const link = `nasjak://grup-ibadah`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Tautan disalin', 'Bagikan tautan ini kepada sahabat yang ingin saling mengingatkan.');
  };

  const shareGroup = async (groupName: string, groupId: string) => {
    await Share.share({ message: `Bergabung di ${groupName} NASUHA: nasjak://grup-ibadah` });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}><Text style={[styles.title, { color: colors.text }]}>Grup Ibadah</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Saling mengingatkan dalam kebaikan</Text></View>
        <Ionicons name="people-circle-outline" size={28} color={colors.primary} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
          <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.text }]}>Pilih grup untuk membangun kebiasaan bersama. Notifikasi grup akan menjadi pengingat, bukan tekanan.</Text>
        </View>
        {groups.map((group) => {
          const isJoined = group.joined;
          const isPending = pendingId === group.id;
          return (
            <View key={group.id} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: isJoined ? group.color : colors.border }]}>
              <View style={[styles.groupIcon, { backgroundColor: group.color }]}><Ionicons name={group.icon as any} size={25} color="#FFF" /></View>
              <View style={styles.groupMain}><View style={styles.groupTitleRow}><Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>{isJoined && <Text style={[styles.joinedLabel, { color: group.color }]}>Bergabung</Text>}</View><Text style={[styles.groupDescription, { color: colors.textSecondary }]}>{group.description}</Text><View style={styles.metaRow}><Ionicons name="time-outline" size={15} color={colors.textMuted} /><Text style={[styles.metaText, { color: colors.textMuted }]}>{group.schedule}</Text><Ionicons name="people-outline" size={15} color={colors.textMuted} /><Text style={[styles.metaText, { color: colors.textMuted }]}>{group.memberCount} anggota</Text></View><View style={styles.actions}><Pressable onPress={() => toggleGroup(group)} disabled={isPending} style={[styles.joinButton, { backgroundColor: isJoined ? colors.surface : group.color, opacity: isPending ? 0.6 : 1 }]}><Ionicons name={isJoined ? 'checkmark' : 'add'} size={17} color={isJoined ? group.color : '#FFF'} /><Text style={[styles.joinText, { color: isJoined ? group.color : '#FFF' }]}>{isPending ? 'Memproses...' : isJoined ? 'Sudah Bergabung' : 'Gabung Grup'}</Text></Pressable><Pressable onPress={() => copyLink(group.id)} style={[styles.iconButton, { borderColor: colors.border }]}><Ionicons name="copy-outline" size={18} color={colors.primary} /></Pressable><Pressable onPress={() => shareGroup(group.name, group.id)} style={[styles.iconButton, { borderColor: colors.border }]}><Ionicons name="share-social-outline" size={18} color={colors.primary} /></Pressable></View></View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(WorshipGroupsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  intro: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md },
  introText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20, fontWeight: '600' },
  groupCard: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md },
  groupIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupMain: { flex: 1 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  groupName: { flex: 1, fontSize: FontSize.lg, fontWeight: '800' },
  joinedLabel: { fontSize: FontSize.xs, fontWeight: '800' },
  groupDescription: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  metaText: { fontSize: FontSize.xs, marginRight: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  joinButton: { flex: 1, minHeight: 40, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8 },
  joinText: { fontSize: FontSize.xs, fontWeight: '800', textAlign: 'center' },
  iconButton: { width: 40, height: 40, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
