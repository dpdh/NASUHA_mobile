import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { errorMessage } from '../../services/api';
import { notificationApi } from '../../services/nasjakApi';
import type { AppNotification } from '../../types';
import { relativeTime } from '../../utils/date';
import { tint } from '../../utils/color';

const TYPE_COLORS: Record<string, string> = {
  event: '#00B4D8', riyadhoh: '#2EC4B6', motivasi: '#D4A853', lbu: '#FF6B6B', lapak: '#F59E0B', tanya: '#16A34A', info: '#8BA4B8',
};

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  event: 'calendar', riyadhoh: 'checkmark-circle', motivasi: 'bulb', lbu: 'rocket', lapak: 'storefront', tanya: 'chatbubble-ellipses', info: 'notifications',
};

function NotificationsScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];

  const { data, setData, loading, refreshing, error, refresh } = useApiQuery(
    () => notificationApi.list().then((result) => result.data),
    [user?.id],
    { enabled: Boolean(user), refetchOnFocus: true },
  );
  const notifs = useMemo(() => data || [], [data]);
  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const markRead = useCallback((id: string) => {
    setData((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)));
    notificationApi.markRead(id).catch(() => {});
  }, [setData]);

  const markAllRead = useCallback(async () => {
    const previous = notifs;
    setData((prev) => prev?.map((n) => ({ ...n, read: true })));
    try {
      await notificationApi.markAllRead();
    } catch (caught) {
      setData(previous);
      Alert.alert('Gagal', errorMessage(caught));
    }
  }, [notifs, setData]);

  const handlePress = useCallback((item: AppNotification) => {
    if (!item.read) markRead(item.id);
    const route = typeof item.data?.route === 'string' ? item.data.route : null;
    if (route) router.push(route as any);
  }, [markRead]);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const color = TYPE_COLORS[item.type] || TYPE_COLORS.info;
      const icon = (item.icon as React.ComponentProps<typeof Ionicons>['name']) || TYPE_ICONS[item.type] || 'notifications';
      return (
        <Pressable
          onPress={() => handlePress(item)}
          style={[
            styles.notifCard,
            { backgroundColor: item.read ? colors.card : tint(colors.primary, 0.05, colors.card), borderColor: item.read ? colors.border : colors.primary + '30' },
            Shadows.sm,
          ]}
        >
          <View style={[styles.notifIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon in Ionicons.glyphMap ? icon : TYPE_ICONS[item.type] || 'notifications'} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.notifHeaderRow}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
            {item.body ? <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={3}>{item.body}</Text> : null}
            <Text style={[styles.notifTime, { color: colors.textMuted }]}>{relativeTime(item.createdAt)}</Text>
          </View>
          {item.data?.route ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </Pressable>
      );
    },
    [colors, handlePress],
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text, marginLeft: Spacing.md }]}>Notifikasi</Text>
        </View>
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Login untuk melihat notifikasi Anda</Text>
          <Pressable onPress={() => router.push('/(auth)/login' as any)} style={[styles.loginBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.loginBtnText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.title, { color: colors.text }]}>Notifikasi</Text>
          {unreadCount > 0 && (
            <Text style={[styles.subtitle, { color: colors.primary }]}>{unreadCount} belum dibaca</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Baca Semua</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={colors.primary} />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'notifications-off-outline'} size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error || 'Belum ada notifikasi'}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

export default memo(NotificationsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  markAll: { fontSize: FontSize.sm, fontWeight: '700' },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  notifCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.md },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontSize: FontSize.md, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: FontSize.sm, lineHeight: 18, marginTop: 2 },
  notifTime: { fontSize: FontSize.xs, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.lg },
  loginBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
  loginBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
});
