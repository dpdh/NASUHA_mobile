import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { errorMessage } from '../../services/api';
import { adminApi, type AdminDashboard } from '../../services/nasjakApi';
import type { User, LapakProduct, Event, EventRegistration, MembershipPlan, MembershipType } from '../../types';

const ROLE_COLORS: Record<User['role'], string> = { super_admin: '#FF6B6B', admin: '#D4A853', ustadz: '#16A34A', sahabat: '#2EC4B6', calon_sahabat: '#999999' };
const ROLE_LABELS: Record<User['role'], string> = { super_admin: 'Super Admin', admin: 'Admin', ustadz: 'Ustadz', sahabat: 'Sahabat NASUHA', calon_sahabat: 'Calon Sahabat' };
const ALL_ROLES: User['role'][] = ['calon_sahabat', 'sahabat', 'ustadz', 'admin', 'super_admin'];
const ADMIN_ASSIGNABLE_ROLES: User['role'][] = ['calon_sahabat', 'sahabat', 'ustadz'];
const MEMBERSHIP_LABELS: Record<MembershipType, string> = { free: 'Free Member', membership: 'Membership', sahabat: 'Sahabat NASUHA' };
const isStaffRole = (role: User['role']) => role === 'super_admin' || role === 'admin';
const STATUS_COLORS: Record<LapakProduct['status'], string> = { pending: '#FFB347', approved: '#2EC4B6', rejected: '#FF6B6B' };
const STATUS_LABELS: Record<LapakProduct['status'], string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

type CmsTab = 'users' | 'lapak' | 'events' | 'registrations' | 'membership';
type LapakFilter = 'semua' | 'pending' | 'approved' | 'rejected';
type EventFilter = 'semua' | 'published' | 'draft' | 'cancelled';
const EVENT_STATUS_COLORS: Record<string, string> = { published: '#2EC4B6', draft: '#FFB347', cancelled: '#FF6B6B' };
const EVENT_STATUS_LABELS: Record<string, string> = { published: 'Published', draft: 'Draft', cancelled: 'Dibatalkan' };
const EVENT_TYPE_COLORS: Record<string, string> = { TSN: '#4A90D9', LBU: '#2EC4B6', Kajian: '#D4A853', 'Safari Dakwah': '#9B59B6', KFM: '#E67E22', TOT: '#E74C3C', 'Scale Up Bisnis': '#27AE60', 'Digital Marketing': '#3498DB', 'Public Speaking': '#F39C12', 'Business Coaching': '#8E44AD' };

// ─── Member Card ───
const MemberCard = memo(({ item, isCurrentUser, currentUserRole, colors, membershipPlans, onChangeRole, onToggleActive, onRemove, onToggleFeature }: {
  item: User; isCurrentUser: boolean; currentUserRole: User['role']; colors: typeof Colors.light;
  membershipPlans: MembershipPlan[]; onChangeRole: (user: User, role: User['role']) => void; onToggleActive: (user: User) => void; onRemove: (user: User) => void; onToggleFeature: (user: User, featureId: string, enabled: boolean) => void;
}) => {
  // Admin tidak boleh mengubah akun staf lain; hanya Super Admin yang bisa.
  const canManage = !isCurrentUser && (currentUserRole === 'super_admin' || !isStaffRole(item.role));
  return (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.isActive ? colors.border : colors.error + '40', opacity: item.isActive ? 1 : 0.6 }, Shadows.sm]}>
    <View style={styles.cardRow}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: ROLE_COLORS[item.role] }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {isCurrentUser && <View style={[styles.youBadge, { backgroundColor: colors.primary }]}><Text style={styles.youText}>Anda</Text></View>}
        </View>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{item.email}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
          {MEMBERSHIP_LABELS[item.membershipType || 'free']} · Bergabung {new Date(item.joinDate).toLocaleDateString('id-ID')}
        </Text>
      </View>
    </View>
    <View style={styles.actionRow}>
      <View style={[styles.badge, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
        <View style={[styles.dot, { backgroundColor: ROLE_COLORS[item.role] }]} />
        <Text style={[styles.badgeText, { color: ROLE_COLORS[item.role] }]}>{ROLE_LABELS[item.role]}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: (item.isActive ? colors.success : colors.error) + '20' }]}>
        <Text style={[styles.badgeText, { color: item.isActive ? colors.success : colors.error }]}>{item.isActive ? 'Aktif' : 'Nonaktif'}</Text>
      </View>
      <Text style={[styles.featureSummary, { color: colors.textMuted }]}>
        {Object.values(item.membershipFeatures || {}).filter(Boolean).length} fitur aktif
      </Text>
      <Pressable onPress={() => {
        const plan = membershipPlans.find((membershipPlan) => membershipPlan.type === (item.membershipType || 'free'));
        const features = plan?.features || [];
        Alert.alert('Pengaturan Fitur', `Atur akses fitur untuk ${item.name}`, [
          ...features.map((feature) => {
            const enabled = Boolean(item.membershipFeatures?.[feature.id]);
            return {
              text: `${enabled ? '✓' : '○'} ${feature.name}`,
              onPress: () => onToggleFeature(item, feature.id, !enabled),
            };
          }),
          { text: 'Tutup', style: 'cancel' },
        ]);
      }} style={[styles.featureButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}>
        <Ionicons name="options-outline" size={14} color={colors.primary} />
        <Text style={[styles.featureButtonText, { color: colors.primary }]}>Fitur</Text>
      </Pressable>
      {canManage && (
        <View style={styles.btnRow}>
          <Pressable onPress={() => {
            const allowedRoles = (currentUserRole === 'super_admin' ? ALL_ROLES : ADMIN_ASSIGNABLE_ROLES).filter((role) => role !== item.role);
            Alert.alert('Ubah Role', `Pilih role baru untuk ${item.name}`, [
              ...allowedRoles.map((role) => ({ text: ROLE_LABELS[role], onPress: () => onChangeRole(item, role) })),
              { text: 'Batal', style: 'cancel' as const },
            ]);
          }} style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="shield-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => onToggleActive(item)} style={[styles.iconBtn, { backgroundColor: colors.warning + '15' }]}>
            <Ionicons name={item.isActive ? 'pause-outline' : 'play-outline'} size={16} color={colors.warning} />
          </Pressable>
          {currentUserRole === 'super_admin' && (
            <Pressable onPress={() => Alert.alert('Hapus Akun', `Hapus permanen akun ${item.name}?`, [
              { text: 'Batal', style: 'cancel' },
              { text: 'Hapus', style: 'destructive', onPress: () => onRemove(item) },
            ])} style={[styles.iconBtn, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  </View>
  );
});

// ─── Product Moderation Card ───
const ProductModCard = memo(({ item, colors, onApprove, onReject, onDelete }: {
  item: LapakProduct; colors: typeof Colors.light;
  onApprove: (id: string) => void; onReject: (id: string) => void; onDelete: (id: string) => void;
}) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
    <View style={styles.cardRow}>
      {item.photos.length > 0 ? (
        <Image source={{ uri: item.photos[0] }} style={styles.productThumb} />
      ) : (
        <View style={[styles.productThumbPlaceholder, { backgroundColor: colors.gold + '20' }]}>
          <Ionicons name="image-outline" size={24} color={colors.gold} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardSub, { color: colors.gold }]}>Rp {item.price.toLocaleString('id-ID')}</Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{item.sellerName} · {item.sellerCity}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.category} · {item.photos.length} foto</Text>
      </View>
    </View>

    {/* Specs preview */}
    <View style={styles.specsRow}>
      {item.specs.condition && <View style={[styles.specChip, { backgroundColor: colors.surface }]}><Text style={[styles.specText, { color: colors.textSecondary }]}>{item.specs.condition}</Text></View>}
      {item.specs.weight && <View style={[styles.specChip, { backgroundColor: colors.surface }]}><Text style={[styles.specText, { color: colors.textSecondary }]}>{item.specs.weight}</Text></View>}
      {item.specs.stock !== undefined && <View style={[styles.specChip, { backgroundColor: colors.surface }]}><Text style={[styles.specText, { color: colors.textSecondary }]}>Stok: {item.specs.stock}</Text></View>}
    </View>

    <View style={styles.actionRow}>
      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLORS[item.status] }]} />
        <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>{STATUS_LABELS[item.status]}</Text>
      </View>
      <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString('id-ID')}</Text>
      <View style={styles.btnRow}>
        {item.status !== 'approved' && (
          <Pressable onPress={() => onApprove(item.id)} style={[styles.iconBtn, { backgroundColor: '#2EC4B6' + '20' }]}>
            <Ionicons name="checkmark" size={16} color="#2EC4B6" />
          </Pressable>
        )}
        {item.status !== 'rejected' && (
          <Pressable onPress={() => onReject(item.id)} style={[styles.iconBtn, { backgroundColor: '#FFB347' + '20' }]}>
            <Ionicons name="close" size={16} color="#FFB347" />
          </Pressable>
        )}
        <Pressable onPress={() => Alert.alert('Hapus Produk', `Hapus "${item.name}"?`, [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: () => onDelete(item.id) },
        ])} style={[styles.iconBtn, { backgroundColor: '#FF6B6B20' }]}>
          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
        </Pressable>
      </View>
    </View>
  </View>
));

// ─── Event Card ───
const EventModCard = memo(({ item, colors, onEdit, onPublish, onCancel, onDelete }: {
  item: Event; colors: typeof Colors.light;
  onEdit: (id: string) => void; onPublish: (id: string) => void; onCancel: (id: string) => void; onDelete: (id: string) => void;
}) => {
  const status = item.status || 'published';
  const pct = item.quota > 0 ? Math.round((item.registered / item.quota) * 100) : 0;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.eventIcon, { backgroundColor: (EVENT_TYPE_COLORS[item.type] || colors.primary) + '20' }]}>
          <Ionicons name={item.type === 'TSN' ? 'people' : item.type === 'LBU' ? 'cash' : item.type === 'Kajian' ? 'book' : 'megaphone'} size={24} color={EVENT_TYPE_COLORS[item.type] || colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{item.type} · {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.time} · {item.location}</Text>
        </View>
      </View>
      <View style={[styles.progressRow, { marginTop: 8 }]}>
        <View style={[styles.progressBg, { backgroundColor: colors.surface }]}>
          <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 90 ? '#FF6B6B' : pct >= 70 ? '#FFB347' : '#2EC4B6' }]} />
        </View>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.registered}/{item.quota} ({pct}%)</Text>
      </View>
      <View style={styles.actionRow}>
        <View style={[styles.badge, { backgroundColor: (EVENT_STATUS_COLORS[status] || '#999') + '20' }]}>
          <View style={[styles.dot, { backgroundColor: EVENT_STATUS_COLORS[status] || '#999' }]} />
          <Text style={[styles.badgeText, { color: EVENT_STATUS_COLORS[status] || '#999' }]}>{EVENT_STATUS_LABELS[status] || status}</Text>
        </View>
        <View style={styles.btnRow}>
          <Pressable onPress={() => onEdit(item.id)} style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
          </Pressable>
          {status !== 'published' && (
            <Pressable onPress={() => onPublish(item.id)} style={[styles.iconBtn, { backgroundColor: '#2EC4B620' }]}>
              <Ionicons name="checkmark" size={16} color="#2EC4B6" />
            </Pressable>
          )}
          {status !== 'cancelled' && (
            <Pressable onPress={() => onCancel(item.id)} style={[styles.iconBtn, { backgroundColor: '#FFB34720' }]}>
              <Ionicons name="close" size={16} color="#FFB347" />
            </Pressable>
          )}
          <Pressable onPress={() => Alert.alert('Hapus Event', `Hapus "${item.title}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => onDelete(item.id) },
          ])} style={[styles.iconBtn, { backgroundColor: '#FF6B6B20' }]}>
            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function MembershipPanel({ plans, members, colors, canEditPlans, onUpdateMember, onTogglePlanFeature, onSavePlan }: {
  plans: MembershipPlan[];
  members: User[];
  colors: typeof Colors.light;
  canEditPlans: boolean;
  onUpdateMember: (member: User, type: MembershipType) => void;
  onTogglePlanFeature: (type: MembershipType, featureId: string) => void;
  onSavePlan: (plan: MembershipPlan) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {!canEditPlans && (
        <Text style={[styles.cardMeta, { color: colors.warning, textAlign: 'center' }]}>Hanya Super Admin yang dapat mengubah fitur plan.</Text>
      )}
      {plans.map((plan) => {
        const planMembers = members.filter((member) => (member.membershipType || 'free') === plan.type);
        return (
          <View key={plan.type} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatarFallback, { backgroundColor: plan.color }]}><Ionicons name={plan.type === 'free' ? 'person-outline' : plan.type === 'membership' ? 'people-outline' : 'star'} size={24} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={[styles.cardName, { color: colors.text }]}>{plan.label}</Text><Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.description}</Text><Text style={[styles.cardMeta, { color: plan.color }]}>{planMembers.length} member (halaman ini)</Text></View>
            </View>
            <Text style={[styles.featureSectionTitle, { color: colors.textSecondary }]}>FITUR AKSES</Text>
            <View style={styles.featuresGrid}>{plan.features.map((feature) => <Pressable key={feature.id} disabled={!canEditPlans} onPress={() => onTogglePlanFeature(plan.type, feature.id)} style={[styles.featureItem, { backgroundColor: colors.surface, borderColor: feature.enabled ? plan.color + '40' : colors.border }]}><Ionicons name={feature.icon as any} size={19} color={feature.enabled ? plan.color : colors.textMuted} /><Text style={[styles.featureName, { color: colors.text }]}>{feature.name}</Text><Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feature.enabled ? 'Aktif' : 'Nonaktif'}{canEditPlans ? ' · tekan untuk ubah' : ''}</Text></Pressable>)}</View>
            {canEditPlans && (
              <Pressable onPress={() => onSavePlan(plan)} style={[styles.addEventBtn, { backgroundColor: plan.color, marginTop: Spacing.md }]}>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.addEventText}>Simpan Plan {plan.label}</Text>
              </Pressable>
            )}
            <Text style={[styles.featureSectionTitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>MEMBER TIER INI</Text>
            <View style={styles.membersList}>{planMembers.slice(0, 8).map((member) => <Pressable key={member.id} onPress={() => Alert.alert('Ubah Tier Member', `Pilih tier baru untuk ${member.name}`, [{ text: 'Batal', style: 'cancel' }, { text: 'Free Member', onPress: () => onUpdateMember(member, 'free') }, { text: 'Membership', onPress: () => onUpdateMember(member, 'membership') }, { text: 'Sahabat NASUHA', onPress: () => onUpdateMember(member, 'sahabat') }])} style={[styles.memberChip, { backgroundColor: plan.color + '20' }]}><Text style={{ color: plan.color, fontSize: 11, fontWeight: '600' }}>{member.name}</Text></Pressable>)}</View>
          </View>
        );
      })}
    </ScrollView>
  );
}

MemberCard.displayName = 'MemberCard';
ProductModCard.displayName = 'ProductModCard';
EventModCard.displayName = 'EventModCard';

// ─── Main Admin Screen ───
function AdminDenied({ colors }: { colors: typeof Colors.light }) {
  return (
    <View style={[styles.denied, { backgroundColor: colors.background }]}>
      <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
      <Text style={[styles.deniedTitle, { color: colors.text }]}>Akses Ditolak</Text>
      <Text style={[styles.deniedSub, { color: colors.textSecondary }]}>Hanya admin yang dapat mengakses halaman ini</Text>
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.primary }]}>
        <Text style={[styles.backBtnText, { color: colors.primary }]}>Kembali</Text>
      </Pressable>
    </View>
  );
}

function AdminScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const isStaff = useAppStore((s) => s.isStaff);
  const colors = Colors[theme];
  if (!user || !isStaff()) return <AdminDenied colors={colors} />;
  return <AdminPanel user={user} colors={colors} />;
}

function AdminPanel({ user, colors }: { user: User; colors: typeof Colors.light }) {
  const isSuperAdmin = user.role === 'super_admin';
  const fallbackPlans = useAppStore((s) => s.membershipPlans);

  const [activeTab, setActiveTab] = useState<CmsTab>('users');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lapakFilter, setLapakFilter] = useState<LapakFilter>('semua');
  const [eventFilter, setEventFilter] = useState<EventFilter>('semua');

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [products, setProducts] = useState<LapakProduct[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const showError = useCallback((error: unknown) => {
    Alert.alert('Gagal', errorMessage(error));
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await adminApi.dashboard());
    } catch {
      // Ringkasan opsional; tab tetap bisa dipakai.
    }
  }, []);

  const loadTab = useCallback(async (tab: CmsTab, q: string) => {
    if (tab === 'users') {
      const result = await adminApi.users({ q, perPage: 100 });
      setMembers(result.data);
      setMembersTotal(result.meta?.total ?? result.data.length);
    } else if (tab === 'lapak') {
      const result = await adminApi.products({ q, perPage: 100 });
      setProducts(result.data);
      setProductCounts((result.meta?.counts as Record<string, number>) || {});
    } else if (tab === 'events') {
      const result = await adminApi.events({ q, perPage: 100 });
      setEvents(result.data);
    } else if (tab === 'registrations') {
      const result = await adminApi.registrations({ q, status: 'registered,confirmed', perPage: 200 });
      setRegistrations(result.data);
    } else {
      const [planList, userResult] = await Promise.all([adminApi.membershipPlans(), adminApi.users({ perPage: 100 })]);
      setPlans(planList);
      setMembers(userResult.data);
      setMembersTotal(userResult.meta?.total ?? userResult.data.length);
    }
  }, []);

  const reload = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      await Promise.all([loadTab(activeTab, debouncedSearch), loadDashboard()]);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, loadTab, loadDashboard, showError]);

  useEffect(() => {
    // Ditunda satu tick agar setState tidak terjadi sinkron di dalam effect.
    const timer = setTimeout(() => reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);

  // Plan dibutuhkan juga di tab Users (dialog pengaturan fitur per anggota).
  useEffect(() => {
    adminApi.membershipPlans().then(setPlans).catch(() => {});
  }, []);

  // ── Aksi user ──
  const replaceMember = useCallback((updated: User) => {
    setMembers((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const runAction = useCallback(async (action: () => Promise<unknown>, message?: string) => {
    try {
      await action();
      if (message) Alert.alert('Berhasil', message);
      loadDashboard();
      // Muat ulang tab aktif agar ringkasan & filter (mis. jumlah pending lapak) ikut ter-update.
      loadTab(activeTab, debouncedSearch).catch(() => {});
    } catch (error) {
      showError(error);
    }
  }, [loadDashboard, loadTab, activeTab, debouncedSearch, showError]);

  const handleChangeRole = useCallback((member: User, role: User['role']) => runAction(async () => {
    replaceMember(await adminApi.setRole(member.id, role));
  }, `${member.name} sekarang ${ROLE_LABELS[role]}.`), [replaceMember, runAction]);

  const handleToggleActive = useCallback((member: User) => {
    const execute = () => runAction(async () => {
      replaceMember(await adminApi.setStatus(member.id, !member.isActive));
    });
    if (!member.isActive) {
      execute();
      return;
    }
    Alert.alert('Nonaktifkan Akun', `Nonaktifkan ${member.name}? Semua sesi login akan dicabut.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Nonaktifkan', style: 'destructive', onPress: execute },
    ]);
  }, [replaceMember, runAction]);

  const handleRemoveMember = useCallback((member: User) => runAction(async () => {
    await adminApi.deleteUser(member.id);
    setMembers((list) => list.filter((item) => item.id !== member.id));
  }, 'Akun dihapus.'), [runAction]);

  const handleToggleMemberFeature = useCallback((member: User, featureId: string, enabled: boolean) => runAction(async () => {
    replaceMember(await adminApi.setFeatures(member.id, { [featureId]: enabled }));
  }, `${member.name}: fitur ${featureId} sekarang ${enabled ? 'aktif' : 'nonaktif'}.`), [replaceMember, runAction]);

  const handleUpdateMembership = useCallback((member: User, type: MembershipType) => runAction(async () => {
    replaceMember(await adminApi.setMembership(member.id, type));
  }, `${member.name} sekarang ${MEMBERSHIP_LABELS[type]}.`), [replaceMember, runAction]);

  // ── Aksi lapak ──
  const replaceProduct = useCallback((updated: LapakProduct) => {
    setProducts((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const handleApproveProduct = useCallback((id: string) => runAction(async () => {
    replaceProduct(await adminApi.approveProduct(id));
  }), [replaceProduct, runAction]);

  const handleRejectProduct = useCallback((id: string) => {
    const reject = (reason?: string) => runAction(async () => {
      replaceProduct(await adminApi.rejectProduct(id, reason || undefined));
    });
    // Di Android & web, Alert.prompt disediakan AlertHost.
    Alert.prompt('Tolak Produk', 'Alasan penolakan (opsional), mis. "Foto kurang jelas"', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Tolak', style: 'destructive', onPress: (reason?: string) => reject(reason?.trim()) },
    ]);
  }, [replaceProduct, runAction]);

  const handleDeleteProduct = useCallback((id: string) => runAction(async () => {
    await adminApi.deleteProduct(id);
    setProducts((list) => list.filter((item) => item.id !== id));
  }), [runAction]);

  // ── Aksi event ──
  const replaceEvent = useCallback((updated: Event) => {
    setEvents((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const handleEventStatus = useCallback((id: string, status: 'published' | 'cancelled') => runAction(async () => {
    replaceEvent(await adminApi.setEventStatus(id, status));
  }), [replaceEvent, runAction]);

  const handleDeleteEvent = useCallback((id: string) => runAction(async () => {
    await adminApi.deleteEvent(id);
    setEvents((list) => list.filter((item) => item.id !== id));
  }), [runAction]);

  // ── Aksi registrasi ──
  const handleRegistrationStatus = useCallback((id: string, status: 'confirmed' | 'cancelled') => runAction(async () => {
    const updated = await adminApi.updateRegistration(id, { status });
    setRegistrations((list) => status === 'cancelled'
      ? list.filter((item) => item.id !== id)
      : list.map((item) => (item.id === id ? { ...item, ...updated } : item)));
  }), [runAction]);

  // ── Aksi membership plan ──
  const handleTogglePlanFeature = useCallback((type: MembershipType, featureId: string) => {
    setPlans((list) => list.map((plan) => plan.type !== type ? plan : {
      ...plan,
      features: plan.features.map((feature) => feature.id === featureId ? { ...feature, enabled: !feature.enabled } : feature),
    }));
  }, []);

  const handleSavePlan = useCallback((plan: MembershipPlan) => runAction(async () => {
    const saved = await adminApi.saveMembershipPlan(plan.type, plan.features.map((feature) => ({ id: feature.id, enabled: feature.enabled })));
    setPlans((list) => list.map((item) => (item.type === saved.type ? saved : item)));
  }, `Plan ${plan.label} disimpan.`), [runAction]);

  const userStats = useMemo(() => ({
    total: dashboard?.users.total ?? membersTotal,
    admins: dashboard?.users.admins ?? members.filter((m) => isStaffRole(m.role)).length,
    active: dashboard?.users.active ?? members.filter((m) => m.isActive).length,
  }), [dashboard, members, membersTotal]);

  const productStats = useMemo(() => {
    const pending = productCounts.pending ?? 0;
    const approved = productCounts.approved ?? 0;
    const rejected = productCounts.rejected ?? 0;
    return { total: pending + approved + rejected, pending, approved, rejected };
  }, [productCounts]);

  const filteredProducts = useMemo(() => {
    const list = lapakFilter === 'semua' ? products : products.filter((p) => p.status === lapakFilter);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products, lapakFilter]);

  const eventStats = useMemo(() => ({
    total: events.length,
    published: events.filter((e) => (e.status || 'published') === 'published').length,
    draft: events.filter((e) => e.status === 'draft').length,
    cancelled: events.filter((e) => e.status === 'cancelled').length,
  }), [events]);

  const filteredEvents = useMemo(() => {
    const list = eventFilter === 'semua' ? events : events.filter((e) => (e.status || 'published') === eventFilter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, eventFilter]);

  const registrationStats = useMemo(() => ({
    total: registrations.length,
    confirmed: registrations.filter((r) => r.status === 'confirmed').length,
    registered: registrations.filter((r) => r.status === 'registered').length,
  }), [registrations]);

  const tabs: { id: CmsTab; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; count: number }[] = [
    { id: 'users', label: 'Users', icon: 'people', count: userStats.total },
    { id: 'lapak', label: 'Lapak', icon: 'storefront', count: dashboard?.lapak.pending ?? productStats.pending },
    { id: 'events', label: 'Events', icon: 'calendar', count: dashboard?.events.upcoming ?? eventStats.published },
    { id: 'registrations', label: 'Daftar', icon: 'clipboard', count: dashboard?.registrations.pending ?? registrationStats.registered },
    { id: 'membership', label: 'Member', icon: 'shield-checkmark', count: plans.length || 3 },
  ];

  const lapakFilters: { id: LapakFilter; label: string; count: number }[] = [
    { id: 'semua', label: 'Semua', count: productStats.total },
    { id: 'pending', label: 'Pending', count: productStats.pending },
    { id: 'approved', label: 'Approved', count: productStats.approved },
    { id: 'rejected', label: 'Rejected', count: productStats.rejected },
  ];

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={() => reload('refresh')} tintColor={colors.primary} />;
  const searchPlaceholder = activeTab === 'users' ? 'Cari nama, email, HP...'
    : activeTab === 'lapak' ? 'Cari produk/penjual...'
      : activeTab === 'events' ? 'Cari judul/lokasi event...'
        : activeTab === 'registrations' ? 'Cari nama/email/HP pendaftar...' : 'Cari...';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#FF6B6B', '#C44569']} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>CMS Admin Panel</Text>
          <Text style={styles.headerSub}>{ROLE_LABELS[user.role]} · NASUHA</Text>
        </View>
        <Pressable onPress={() => reload('refresh')} hitSlop={12}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </Pressable>
      </LinearGradient>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
        <ShimmerGold style={styles.shimmer} />
        {activeTab === 'users' || activeTab === 'membership' ? (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: colors.primary }]}>{userStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total User</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{userStats.admins}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Admin</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: colors.success }]}>{userStats.active}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aktif</Text></View>
          </View>
        ) : activeTab === 'lapak' ? (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: colors.primary }]}>{productStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FFB347' }]}>{productStats.pending}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{productStats.approved}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{productStats.rejected}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text></View>
          </View>
        ) : activeTab === 'events' ? (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: colors.primary }]}>{eventStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{eventStats.published}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Published</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FFB347' }]}>{eventStats.draft}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Draft</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{eventStats.cancelled}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dibatalkan</Text></View>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: colors.primary }]}>{registrationStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aktif</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{registrationStats.confirmed}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Konfirmasi</Text></View>
            <View style={styles.statItem}><Text style={[styles.statVal, { color: '#FFB347' }]}>{registrationStats.registered}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text></View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabGrid}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => { setActiveTab(t.id); setSearch(''); setDebouncedSearch(''); }} style={[styles.tab, { backgroundColor: activeTab === t.id ? colors.primary + '12' : colors.surface, borderColor: activeTab === t.id ? colors.primary : colors.border }]}>
            <Ionicons name={t.icon as any} size={18} color={activeTab === t.id ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === t.id ? colors.primary : colors.textMuted }]} numberOfLines={1}>{t.label}</Text>
            <View style={[styles.tabCount, { backgroundColor: activeTab === t.id ? colors.primary : colors.textMuted + '30' }]}>
              <Text style={[styles.tabCountText, { color: activeTab === t.id ? '#FFF' : colors.textMuted }]}>{t.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      {activeTab !== 'membership' && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
          </View>
        </View>
      )}

      {/* Lapak Filters */}
      {activeTab === 'lapak' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {lapakFilters.map((f) => (
            <Pressable key={f.id} onPress={() => setLapakFilter(f.id)}
              style={[styles.filterChip, { backgroundColor: lapakFilter === f.id ? colors.primary : colors.surface, borderColor: lapakFilter === f.id ? colors.primary : colors.border }]}>
              <Text style={[styles.filterText, { color: lapakFilter === f.id ? '#FFF' : colors.textSecondary }]}>{f.label} ({f.count})</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Event Filters */}
      {activeTab === 'events' && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            {([{ id: 'semua' as EventFilter, label: 'Semua', count: eventStats.total }, { id: 'published' as EventFilter, label: 'Published', count: eventStats.published }, { id: 'draft' as EventFilter, label: 'Draft', count: eventStats.draft }, { id: 'cancelled' as EventFilter, label: 'Dibatalkan', count: eventStats.cancelled }]).map((f) => (
              <Pressable key={f.id} onPress={() => setEventFilter(f.id)}
                style={[styles.filterChip, { backgroundColor: eventFilter === f.id ? colors.primary : colors.surface, borderColor: eventFilter === f.id ? colors.primary : colors.border }]}>
                <Text style={[styles.filterText, { color: eventFilter === f.id ? '#FFF' : colors.textSecondary }]}>{f.label} ({f.count})</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
            <Pressable onPress={() => router.push('/event/add' as any)} style={[styles.addEventBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addEventText}>Tambah Event Baru</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      {activeTab === 'users' ? (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemberCard item={item} isCurrentUser={item.id === user.id} currentUserRole={user.role} colors={colors} membershipPlans={plans.length ? plans : fallbackPlans}
              onChangeRole={handleChangeRole} onToggleActive={handleToggleActive} onRemove={handleRemoveMember} onToggleFeature={handleToggleMemberFeature} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? null : <View style={styles.empty}><Ionicons name="people-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{debouncedSearch ? 'User tidak ditemukan' : 'Belum ada user'}</Text></View>}
        />
      ) : activeTab === 'lapak' ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductModCard item={item} colors={colors}
              onApprove={handleApproveProduct} onReject={handleRejectProduct} onDelete={handleDeleteProduct} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? null : <View style={styles.empty}><Ionicons name="bag-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{lapakFilter === 'semua' ? 'Belum ada dagangan' : `Tidak ada dagangan ${STATUS_LABELS[lapakFilter as LapakProduct['status']] || ''}`}</Text></View>}
        />
      ) : activeTab === 'events' ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventModCard item={item} colors={colors}
              onEdit={(id) => router.push(`/event/edit/${id}` as any)}
              onPublish={(id) => handleEventStatus(id, 'published')}
              onCancel={(id) => Alert.alert('Batalkan Event', `Batalkan "${item.title}"? Pendaftar akan diberi notifikasi.`, [
                { text: 'Tidak', style: 'cancel' },
                { text: 'Batalkan', style: 'destructive', onPress: () => handleEventStatus(id, 'cancelled') },
              ])}
              onDelete={handleDeleteEvent} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? null : <View style={styles.empty}><Ionicons name="calendar-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada event. Tambah event baru!</Text></View>}
        />
      ) : activeTab === 'membership' ? (
        <MembershipPanel plans={plans} members={members} colors={colors} canEditPlans={isSuperAdmin}
          onUpdateMember={handleUpdateMembership} onTogglePlanFeature={handleTogglePlanFeature} onSavePlan={handleSavePlan} />
      ) : (
        <FlatList
          data={registrations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: reg }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
              <View style={styles.cardRow}>
                <View style={[styles.avatarFallback, { backgroundColor: reg.status === 'confirmed' ? '#2EC4B6' : colors.primary }]}>
                  <Text style={styles.avatarText}>{reg.userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{reg.userName}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{reg.userEmail}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{reg.userPhone}{reg.korda ? ` · ${reg.korda}` : ''}</Text>
                  {reg.userCity ? <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{reg.userCity}</Text> : null}
                  {reg.notes ? <Text style={[styles.cardMeta, { color: colors.textMuted, fontStyle: 'italic' }]}>&quot;{reg.notes}&quot;</Text> : null}
                </View>
              </View>
              <View style={styles.actionRow}>
                <View style={[styles.badge, { backgroundColor: (reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347') + '20' }]}>
                  <View style={[styles.dot, { backgroundColor: reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347' }]} />
                  <Text style={[styles.badgeText, { color: reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347' }]}>{reg.status === 'confirmed' ? 'Dikonfirmasi' : 'Terdaftar'}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]} numberOfLines={1}>
                  {reg.event?.title || 'Event'} · {new Date(reg.createdAt).toLocaleDateString('id-ID')}
                </Text>
                <View style={styles.btnRow}>
                  {reg.status !== 'confirmed' && (
                    <Pressable onPress={() => handleRegistrationStatus(reg.id, 'confirmed')} style={[styles.iconBtn, { backgroundColor: '#2EC4B620' }]}>
                      <Ionicons name="checkmark" size={16} color="#2EC4B6" />
                    </Pressable>
                  )}
                  <Pressable onPress={() => Alert.alert('Batalkan', `Batalkan pendaftaran ${reg.userName}?`, [
                    { text: 'Tidak', style: 'cancel' },
                    { text: 'Batalkan', style: 'destructive', onPress: () => handleRegistrationStatus(reg.id, 'cancelled') },
                  ])} style={[styles.iconBtn, { backgroundColor: '#FF6B6B20' }]}>
                    <Ionicons name="close" size={16} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={loading ? null : <View style={styles.empty}><Ionicons name="clipboard-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada pendaftaran event</Text></View>}
        />
      )}
    </View>
  );
}

export default memo(AdminScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 2 },
  statsCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmer: { height: 3 },
  statsGrid: { flexDirection: 'row', padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.xxl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.sm },
  tab: { width: '31.8%', minHeight: 62, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: Spacing.sm, gap: 4 },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  tabCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  tabCountText: { fontSize: FontSize.xs, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 44 },
  // Tanpa ini ScrollView horizontal ikut menyusut di layout kolom Android dan chip terpotong.
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  filterText: { fontSize: FontSize.sm, fontWeight: '600' },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  productThumb: { width: 56, height: 56, borderRadius: 12 },
  productThumbPlaceholder: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: FontSize.md, fontWeight: '700', flexShrink: 1 },
  cardSub: { fontSize: FontSize.sm, marginTop: 1 },
  cardMeta: { fontSize: FontSize.xs, marginTop: 1 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  youText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  specsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm },
  specChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  specText: { fontSize: FontSize.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  dateText: { fontSize: FontSize.xs },
  btnRow: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: BorderRadius.sm, borderWidth: 1 },
  featureButtonText: { fontSize: FontSize.xs, fontWeight: '700' },
  featureSummary: { fontSize: 10 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  deniedTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  deniedSub: { fontSize: FontSize.md, textAlign: 'center' },
  backBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5, marginTop: Spacing.md },
  backBtnText: { fontSize: FontSize.md, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, textAlign: 'center' },
  eventIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: BorderRadius.md, gap: 6 },
  addEventText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
  featureSectionTitle: { fontSize: FontSize.xs, fontWeight: '900', marginBottom: Spacing.sm, letterSpacing: 0.5 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  featureItem: { width: '48%', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureName: { fontSize: FontSize.xs, fontWeight: '700', marginTop: Spacing.xs, textAlign: 'center' },
  featureDesc: { fontSize: 9, marginTop: 2, textAlign: 'center' },
  featureBadge: { marginTop: Spacing.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 2 },
  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  memberChip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full },
});
