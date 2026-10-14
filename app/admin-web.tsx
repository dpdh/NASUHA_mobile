import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';

const roleColors: Record<string, string> = {
  super_admin: '#FF6B6B',
  admin: '#D4A853',
  sahabat: '#2EC4B6',
  calon_sahabat: '#999999',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  sahabat: 'Sahabat NASUHA',
  calon_sahabat: 'Calon Sahabat',
};

export default function AdminWebScreen() {
  const theme = useAppStore((state) => state.theme);
  const user = useAppStore((state) => state.user);
  const members = useAppStore((state) => state.members);
  const products = useAppStore((state) => state.products);
  const events = useAppStore((state) => state.events);
  const eventRegistrations = useAppStore((state) => state.eventRegistrations);
  const colors = Colors[theme];

  const isAllowed = user?.role === 'super_admin';

  const stats = useMemo(() => {
    return {
      totalUsers: members.length,
      activeUsers: members.filter((member) => member.isActive).length,
      totalProducts: products.length,
      pendingProducts: products.filter((product) => product.status === 'pending').length,
      totalEvents: events.length,
      registrations: eventRegistrations.filter((registration) => registration.status !== 'cancelled').length,
    };
  }, [members, products, events, eventRegistrations]);

  const recentMembers = useMemo(
    () => [...members].sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()).slice(0, 5),
    [members],
  );

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
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={styles.sidebar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
          <View>
            <Text style={styles.brandTitle}>NASUHA</Text>
            <Text style={styles.brandSubtitle}>Admin Web</Text>
          </View>
        </View>

        <View style={styles.navGroup}>
          {[
            { key: 'overview', label: 'Overview', icon: 'grid-outline' },
            { key: 'members', label: 'Users', icon: 'people-outline' },
            { key: 'products', label: 'Lapak', icon: 'storefront-outline' },
            { key: 'events', label: 'Events', icon: 'calendar-outline' },
          ].map((item) => (
            <View key={item.key} style={[styles.navItem, styles.navItemInactive]}>
              <Ionicons name={item.icon as any} size={18} color="#dbeafe" />
              <Text style={styles.navText}>{item.label}</Text>
            </View>
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

        <View style={styles.statGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total User</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalUsers}</Text>
            <Text style={[styles.statMeta, { color: colors.success }]}>+{stats.activeUsers} aktif</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lapak</Text>
            <Text style={[styles.statValue, { color: '#FFB347' }]}>{stats.totalProducts}</Text>
            <Text style={[styles.statMeta, { color: '#FFB347' }]}>{stats.pendingProducts} menunggu</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Event</Text>
            <Text style={[styles.statValue, { color: '#2EC4B6' }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statMeta, { color: '#2EC4B6' }]}>Live activity</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Registrasi</Text>
            <Text style={[styles.statValue, { color: '#C44569' }]}>{stats.registrations}</Text>
            <Text style={[styles.statMeta, { color: '#C44569' }]}>Aktif hari ini</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>User Terbaru</Text>
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
              { label: 'Produk pending', value: `${stats.pendingProducts}`, icon: 'time-outline', tone: '#FFB347' },
              { label: 'Event target', value: `${events.length}`, icon: 'calendar-outline', tone: '#4A90D9' },
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
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
