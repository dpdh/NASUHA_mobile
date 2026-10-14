import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { API_BASE_URL, errorMessage } from '../services/api';
import { adminApi, type AdminDashboard } from '../services/nasjakApi';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';
import { Colors, Spacing } from '../constants/theme';

const roleColors: Record<string, string> = {
  super_admin: '#FF6B6B',
  admin: '#D4A853',
  ustadz: '#16A34A',
  sahabat: '#2EC4B6',
  calon_sahabat: '#999999',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  ustadz: 'Ustadz',
  sahabat: 'Sahabat NASUHA',
  calon_sahabat: 'Calon Sahabat',
};

// Panel admin web lengkap (CMS, registrasi, broadcast, kesehatan sistem) disajikan backend di /admin.
const BACKEND_ADMIN_URL = API_BASE_URL.replace(/\/api\/v1$/, '') + '/admin';

export default function AdminWebScreen() {
  const theme = useAppStore((state) => state.theme);
  const user = useAppStore((state) => state.user);
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  const isAllowed = user?.role === 'super_admin';
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [recentMembers, setRecentMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, users] = await Promise.all([adminApi.dashboard(), adminApi.users({ perPage: 5 })]);
      setDashboard(stats);
      setRecentMembers(users.data);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) void load();
  }, [isAllowed, load]);

  const stats = {
    totalUsers: dashboard?.users.total ?? 0,
    activeUsers: dashboard?.users.active ?? 0,
    approvedProducts: dashboard?.lapak.approved ?? 0,
    pendingProducts: dashboard?.lapak.pending ?? 0,
    upcomingEvents: dashboard?.events.upcoming ?? 0,
    pendingRegistrations: dashboard?.registrations.pending ?? 0,
    pendingTestimonials: dashboard?.testimonials.pending ?? 0,
    unansweredQuestions: dashboard?.questions.unanswered ?? 0,
  };
  const openFullPanel = () => WebBrowser.openBrowserAsync(BACKEND_ADMIN_URL).catch(() => {});

  if (!isAllowed) {
    return (
      <View style={[styles.denied, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
        <Text style={[styles.deniedTitle, { color: colors.text }]}>Akses Ditolak</Text>
        <Text style={[styles.deniedText, { color: colors.textSecondary }]}>
          Halaman ini hanya untuk Super Admin.
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)' as any)} style={[styles.backButton, { borderColor: colors.primary }]}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Kembali ke Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.shell, isCompact && styles.shellCompact, { backgroundColor: colors.background }]}>
      <View style={[styles.sidebar, isCompact && styles.sidebarCompact]}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
          <View>
            <Text style={styles.brandTitle}>NASUHA</Text>
            <Text style={styles.brandSubtitle}>Admin Web</Text>
          </View>
        </View>

        <View style={styles.navGroup}>
          {[
            { key: 'overview', label: 'Overview', icon: 'grid-outline', onPress: load },
            { key: 'cms', label: 'Users, Lapak & Event', icon: 'people-outline', onPress: () => router.push('/admin/' as any) },
            { key: 'web', label: 'Panel Admin Lengkap', icon: 'open-outline', onPress: openFullPanel },
          ].map((item) => (
            <Pressable key={item.key} onPress={item.onPress} style={[styles.navItem, styles.navItemInactive]}>
              <Ionicons name={item.icon as any} size={18} color="#dbeafe" />
              <Text style={styles.navText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.replace('/(tabs)' as any)} style={styles.exitButton}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.exitText}>Kembali ke App</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Dashboard</Text>
            <Text style={[styles.heading, { color: colors.text }]}>Web Admin Panel</Text>
          </View>
          <View style={[styles.userPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-circle" size={18} color={colors.primary} />
            <Text style={[styles.userPillText, { color: colors.text }]}>{user?.name || 'Super Admin'}</Text>
          </View>
        </View>

        {loading && !dashboard ? <ActivityIndicator color={colors.primary} style={{ marginBottom: Spacing.lg }} /> : null}
        {error ? (
          <Pressable onPress={load} style={[styles.errorBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={18} color="#FF6B6B" />
            <Text style={[styles.errorText, { color: colors.text }]}>{error} Ketuk untuk coba lagi.</Text>
          </Pressable>
        ) : null}

        <View style={styles.statGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total User</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalUsers}</Text>
            <Text style={[styles.statMeta, { color: colors.success }]}>+{stats.activeUsers} aktif</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lapak Tayang</Text>
            <Text style={[styles.statValue, { color: '#FFB347' }]}>{stats.approvedProducts}</Text>
            <Text style={[styles.statMeta, { color: '#FFB347' }]}>{stats.pendingProducts} menunggu</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Event Mendatang</Text>
            <Text style={[styles.statValue, { color: '#2EC4B6' }]}>{stats.upcomingEvents}</Text>
            <Text style={[styles.statMeta, { color: '#2EC4B6' }]}>Sudah dipublikasi</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Registrasi</Text>
            <Text style={[styles.statValue, { color: '#C44569' }]}>{stats.pendingRegistrations}</Text>
            <Text style={[styles.statMeta, { color: '#C44569' }]}>Menunggu konfirmasi</Text>
          </View>
        </View>

        <View style={[styles.sectionRow, isCompact && styles.sectionRowCompact]}>
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>User Terbaru</Text>
            {!loading && !recentMembers.length ? <Text style={[styles.listSub, { color: colors.textSecondary }]}>Belum ada user.</Text> : null}
            {recentMembers.map((member) => (
              <View key={member.id} style={styles.listItem}>
                <View style={[styles.avatar, { backgroundColor: roleColors[member.role] || '#999' }]}>
                  <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.listMeta}>
                  <Text style={[styles.listName, { color: colors.text }]}>{member.name}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary }]}>{member.email}</Text>
                </View>
                <Text style={[styles.roleTag, { color: roleColors[member.role] || colors.primary, backgroundColor: `${roleColors[member.role] || colors.primary}22` }]}>{roleLabels[member.role] || member.role}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Operasional</Text>
            {[
              { label: 'User aktif', value: `${stats.activeUsers}/${stats.totalUsers}`, icon: 'people-outline', tone: '#2EC4B6' },
              { label: 'Produk menunggu moderasi', value: `${stats.pendingProducts}`, icon: 'time-outline', tone: '#FFB347' },
              { label: 'Testimoni menunggu moderasi', value: `${stats.pendingTestimonials}`, icon: 'chatbox-ellipses-outline', tone: '#C44569' },
              { label: 'Pertanyaan belum dijawab', value: `${stats.unansweredQuestions}`, icon: 'help-circle-outline', tone: '#4A90D9' },
            ].map((item) => (
              <View key={item.label} style={styles.operationRow}>
                <View style={[styles.operationIcon, { backgroundColor: `${item.tone}22` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.tone} />
                </View>
                <View style={styles.listMeta}>
                  <Text style={[styles.operationLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.operationValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              </View>
            ))}
            <Pressable onPress={openFullPanel} style={[styles.fullPanelButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="open-outline" size={16} color="#FFF" />
              <Text style={styles.fullPanelText}>Buka Panel Admin Lengkap</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  shellCompact: { flexDirection: 'column' },
  sidebarCompact: { display: 'none' },
  sectionRowCompact: { flexDirection: 'column' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: Spacing.lg },
  errorText: { flex: 1, fontSize: 13 },
  fullPanelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 12 },
  fullPanelText: { color: '#FFF', fontWeight: '700' },
  sidebar: {
    width: 240,
    backgroundColor: '#0f172a',
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  brandBadge: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1.0 },
  brandSubtitle: { color: '#cbd5e1', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  navGroup: { gap: 10, marginTop: 28 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  navItemInactive: { backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  navText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  exitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 12 },
  exitText: { color: '#fff', fontWeight: '700' },
  content: { flexGrow: 1, padding: Spacing.lg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  eyebrow: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  heading: { fontSize: 28, fontWeight: '800' },
  userPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  userPillText: { fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg },
  statCard: { width: '23%', minWidth: 180, padding: 18, borderRadius: 16, borderWidth: 1, flexGrow: 1 },
  statLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  statMeta: { fontSize: 12, marginTop: 6 },
  sectionRow: { flexDirection: 'row', gap: 16 },
  panel: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16 },
  panelTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.15)' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  listMeta: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '700' },
  listSub: { fontSize: 12 },
  roleTag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  operationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  operationIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  operationLabel: { fontSize: 12 },
  operationValue: { fontSize: 16, fontWeight: '700' },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  deniedTitle: { fontSize: 26, fontWeight: '800', marginTop: 12 },
  deniedText: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  backButton: { marginTop: 18, borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  backButtonText: { fontWeight: '700' },
});
