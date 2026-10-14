import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';
import type { Event, LapakProduct, MembershipPlan, User } from '../../types';

const ROLE_COLORS: Record<User['role'], string> = { super_admin: '#FF6B6B', admin: '#D4A853', sahabat: '#2EC4B6', calon_sahabat: '#999999' };
const ROLE_LABELS: Record<User['role'], string> = { super_admin: 'Super Admin', admin: 'Admin', sahabat: 'Sahabat NASUHA', calon_sahabat: 'Calon Sahabat' };
const STATUS_COLORS: Record<LapakProduct['status'], string> = { pending: '#FFB347', approved: '#2EC4B6', rejected: '#FF6B6B' };
const STATUS_LABELS: Record<LapakProduct['status'], string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

type CmsTab = 'users' | 'lapak' | 'events' | 'registrations' | 'membership';
type LapakFilter = 'semua' | 'pending' | 'approved' | 'rejected';
type UserRoleFilter = 'semua' | User['role'];
type EventFilter = 'semua' | 'published' | 'draft' | 'cancelled';
const EVENT_STATUS_COLORS: Record<string, string> = { published: '#2EC4B6', draft: '#FFB347', cancelled: '#FF6B6B' };
const EVENT_STATUS_LABELS: Record<string, string> = { published: 'Published', draft: 'Draft', cancelled: 'Dibatalkan' };
const EVENT_TYPE_COLORS: Record<string, string> = { TSN: '#4A90D9', LBU: '#2EC4B6', Kajian: '#D4A853', 'Safari Dakwah': '#9B59B6', KFM: '#E67E22', TOT: '#E74C3C', 'Scale Up Bisnis': '#27AE60', 'Digital Marketing': '#3498DB', 'Public Speaking': '#F39C12', 'Business Coaching': '#8E44AD' };

// ─── Member Card ───
const MemberCard = memo(({ item, isCurrentUser, currentUserRole, colors, membershipPlans, onChangeRole, onToggleActive, onRemove, onToggleFeature }: {
  item: User; isCurrentUser: boolean; currentUserRole: User['role']; colors: typeof Colors.light;
  membershipPlans: MembershipPlan[]; onChangeRole: (id: string, role: User['role']) => void; onToggleActive: (id: string) => void; onRemove: (id: string) => void; onToggleFeature: (user: User, featureId: string, enabled: boolean) => void;
}) => (
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
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>Bergabung: {new Date(item.joinDate).toLocaleDateString('id-ID')}</Text>
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
        {Object.values(item.membershipFeatures || {}).filter(Boolean).length} fitur khusus
      </Text>
      <Pressable onPress={() => {
        const plan = membershipPlans.find((membershipPlan) => membershipPlan.type === (item.membershipType || 'free'));
        const features = plan?.features || [];
        Alert.alert('Pengaturan Fitur', `Atur akses fitur untuk ${item.name}`, [
          ...features.map((feature) => {
            const enabled = item.membershipFeatures?.[feature.id] ?? feature.enabled;
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
      {!isCurrentUser && (
        <View style={styles.btnRow}>
          <Pressable onPress={() => {
            const allRoles: User['role'][] = ['calon_sahabat', 'sahabat', 'admin', 'super_admin'];
            const allowedRoles: User['role'][] = currentUserRole === 'super_admin' ? allRoles : ['calon_sahabat', 'sahabat'];
            const currentIdx = allowedRoles.indexOf(item.role);
            const next = allowedRoles[(currentIdx + 1) % allowedRoles.length];
            Alert.alert('Ubah Role', `Jadikan ${item.name} sebagai ${ROLE_LABELS[next]}?`, [
              { text: 'Batal', style: 'cancel' },
              { text: `Jadikan ${ROLE_LABELS[next]}`, onPress: () => onChangeRole(item.id, next) },
            ]);
          }} style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="shield-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => onToggleActive(item.id)} style={[styles.iconBtn, { backgroundColor: colors.warning + '15' }]}>
            <Ionicons name={item.isActive ? 'pause-outline' : 'play-outline'} size={16} color={colors.warning} />
          </Pressable>
          <Pressable onPress={() => Alert.alert('Hapus', `Hapus ${item.name}?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => onRemove(item.id) },
          ])} style={[styles.iconBtn, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </Pressable>
        </View>
      )}
    </View>
  </View>
));

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
  onEdit: (id: number) => void; onPublish: (id: number) => void; onCancel: (id: number) => void; onDelete: (id: number) => void;
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

function MembershipPanel({ plans, members, colors, onUpdateMember, onUpdatePlan }: {
  plans: MembershipPlan[];
  members: User[];
  colors: typeof Colors.light;
  onUpdateMember: (userId: string, type: User['membershipType']) => void;
  onUpdatePlan: (type: MembershipPlan['type'], updates: Partial<MembershipPlan>) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {plans.map((plan) => {
        const planMembers = members.filter((member) => (member.membershipType || 'free') === plan.type);
        return (
          <View key={plan.type} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatarFallback, { backgroundColor: plan.color }]}><Ionicons name={plan.type === 'free' ? 'person-outline' : plan.type === 'membership' ? 'people-outline' : 'star'} size={24} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={[styles.cardName, { color: colors.text }]}>{plan.label}</Text><Text style={[styles.cardSub, { color: colors.textSecondary }]}>{plan.description}</Text><Text style={[styles.cardMeta, { color: plan.color }]}>{planMembers.length} member</Text></View>
            </View>
            <Text style={[styles.featureSectionTitle, { color: colors.textSecondary }]}>FITUR AKSES</Text>
            <View style={styles.featuresGrid}>{plan.features.map((feature) => <Pressable key={feature.id} onPress={() => onUpdatePlan(plan.type, { features: plan.features.map((currentFeature) => currentFeature.id === feature.id ? { ...currentFeature, enabled: !currentFeature.enabled } : currentFeature) })} style={[styles.featureItem, { backgroundColor: colors.surface, borderColor: feature.enabled ? plan.color + '40' : colors.border }]}><Ionicons name={feature.icon as any} size={19} color={feature.enabled ? plan.color : colors.textMuted} /><Text style={[styles.featureName, { color: colors.text }]}>{feature.name}</Text><Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feature.enabled ? 'Aktif · tekan untuk nonaktifkan' : 'Nonaktif · tekan untuk aktifkan'}</Text></Pressable>)}</View>
            <Text style={[styles.featureSectionTitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>MEMBER TIER INI</Text>
            <View style={styles.membersList}>{planMembers.slice(0, 5).map((member) => <Pressable key={member.id} onPress={() => Alert.alert('Ubah Tier Member', `Pilih tier baru untuk ${member.name}`, [{ text: 'Batal', style: 'cancel' }, { text: 'Free Member', onPress: () => onUpdateMember(member.id, 'free') }, { text: 'Membership', onPress: () => onUpdateMember(member.id, 'membership') }, { text: 'Sahabat NASUHA', onPress: () => onUpdateMember(member.id, 'sahabat') }])} style={[styles.memberChip, { backgroundColor: plan.color + '20' }]}><Text style={{ color: plan.color, fontSize: 11, fontWeight: '600' }}>{member.name}</Text></Pressable>)}</View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Admin Screen ───
function AdminScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const members = useAppStore((s) => s.members);
  const products = useAppStore((s) => s.products);
  const events = useAppStore((s) => s.events);
  const eventRegistrations = useAppStore((s) => s.eventRegistrations);
  const confirmRegistration = useAppStore((s) => s.confirmRegistration);
  const cancelRegistration = useAppStore((s) => s.cancelRegistration);
  const updateMemberRole = useAppStore((s) => s.updateMemberRole);
  const toggleMemberActive = useAppStore((s) => s.toggleMemberActive);
  const removeMember = useAppStore((s) => s.removeMember);
  const approveProduct = useAppStore((s) => s.approveProduct);
  const rejectProduct = useAppStore((s) => s.rejectProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const updateEvent = useAppStore((s) => s.updateEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const colors = Colors[theme];
  const membershipPlans = useAppStore((s) => s.membershipPlans);
  const updateMembershipPlan = useAppStore((s) => s.updateMembershipPlan);
  const updateUserMembership = useAppStore((s) => s.updateUserMembership);
  const updateUserMembershipFeature = useAppStore((s) => s.updateUserMembershipFeature);
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  const [activeTab, setActiveTab] = useState<CmsTab>('users');
  const [search, setSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('semua');
  const [lapakFilter, setLapakFilter] = useState<LapakFilter>('semua');
  const [eventFilter, setEventFilter] = useState<EventFilter>('semua');

  const handleToggleMemberFeature = (member: User, featureId: string, enabled: boolean) => {
    updateUserMembershipFeature(member.id, featureId, enabled);
    Alert.alert('Fitur Diperbarui', `${member.name}: fitur ${featureId} sekarang ${enabled ? 'aktif' : 'nonaktif'}.`);
  };

  const userStats = useMemo(() => ({
    total: members.length,
    admins: members.filter((m) => m.role === 'super_admin' || m.role === 'admin').length,
    active: members.filter((m) => m.isActive).length,
  }), [members]);

  const productStats = useMemo(() => ({
    total: products.length,
    pending: products.filter((p) => p.status === 'pending').length,
    approved: products.filter((p) => p.status === 'approved').length,
    rejected: products.filter((p) => p.status === 'rejected').length,
  }), [products]);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (userRoleFilter !== 'semua') list = list.filter((member) => member.role === userRoleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((member) => member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q));
    }
    return list;
  }, [search, members, userRoleFilter]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (lapakFilter !== 'semua') list = list.filter((p) => p.status === lapakFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products, lapakFilter, search]);

  const eventStats = useMemo(() => ({
    total: events.length,
    published: events.filter((e) => (e.status || 'published') === 'published').length,
    draft: events.filter((e) => e.status === 'draft').length,
    cancelled: events.filter((e) => e.status === 'cancelled').length,
  }), [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (eventFilter !== 'semua') list = list.filter((e) => (e.status || 'published') === eventFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.location.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, eventFilter, search]);

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <View style={[styles.denied, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
        <Text style={[styles.deniedTitle, { color: colors.text }]}>Akses Ditolak</Text>
        <Text style={[styles.deniedSub, { color: colors.textSecondary }]}>Halaman CMS hanya untuk Super Admin dan Admin.</Text>
        <Pressable onPress={() => router.replace('/(tabs)' as any)} style={[styles.backBtn, { borderColor: colors.primary }]}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Kembali ke Beranda</Text>
        </Pressable>
      </View>
    );
  }

  const tabs: { id: CmsTab; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; count: number }[] = [
    { id: 'users', label: 'Daftar User', icon: 'people', count: userStats.total },
    { id: 'lapak', label: 'Lapak', icon: 'storefront', count: productStats.total },
    { id: 'events', label: 'Events', icon: 'calendar', count: eventStats.total },
    { id: 'registrations', label: 'Daftar', icon: 'clipboard', count: eventRegistrations.filter((r) => r.status !== 'cancelled').length },
    { id: 'membership', label: 'Member', icon: 'shield-checkmark', count: membershipPlans.length },
  ];

  const lapakFilters: { id: LapakFilter; label: string; count: number }[] = [
    { id: 'semua', label: 'Semua', count: productStats.total },
    { id: 'pending', label: 'Pending', count: productStats.pending },
    { id: 'approved', label: 'Approved', count: productStats.approved },
    { id: 'rejected', label: 'Rejected', count: productStats.rejected },
  ];
  const userRoleFilters: { id: UserRoleFilter; label: string; count: number; color: string }[] = [
    { id: 'semua', label: 'Semua User', count: members.length, color: colors.primary },
    { id: 'super_admin', label: 'Super Admin', count: members.filter((member) => member.role === 'super_admin').length, color: ROLE_COLORS.super_admin },
    { id: 'admin', label: 'Admin', count: members.filter((member) => member.role === 'admin').length, color: ROLE_COLORS.admin },
    { id: 'sahabat', label: 'Sahabat NASUHA', count: members.filter((member) => member.role === 'sahabat').length, color: ROLE_COLORS.sahabat },
    { id: 'calon_sahabat', label: 'Calon Sahabat', count: members.filter((member) => member.role === 'calon_sahabat').length, color: ROLE_COLORS.calon_sahabat },
  ];
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const activeTabDescription: Record<CmsTab, string> = {
    users: 'Pantau akses dan aktivitas member',
    lapak: 'Moderasi produk sebelum tampil di lapak',
    events: 'Atur agenda dan publikasi kegiatan',
    registrations: 'Kelola pendaftaran peserta event',
    membership: 'Atur tier dan fitur akses member',
  };
  const isDenseStats = isCompact && activeTab !== 'users';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.dashboardShell, isCompact && styles.dashboardShellCompact]}>
        <View style={[styles.sidebar, isCompact && styles.sidebarCompact]}>
          <View style={styles.brandBlock}>
            <View style={styles.brandMark}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
            <View>
              <Text style={styles.brandTitle}>NASUHA</Text>
              <Text style={styles.brandSubtitle}>Admin Panel</Text>
            </View>
          </View>

          <View style={styles.navGroup}>
            {[
              { key: 'users', label: 'Daftar User', icon: 'people-outline' },
              { key: 'lapak', label: 'Lapak', icon: 'storefront-outline' },
              { key: 'events', label: 'Events', icon: 'calendar-outline' },
              { key: 'registrations', label: 'Registrasi', icon: 'clipboard-outline' },
              { key: 'membership', label: 'Membership', icon: 'shield-checkmark-outline' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setActiveTab(item.key as CmsTab)}
                style={[styles.navItem, activeTab === item.key && styles.navItemActive]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={activeTab === item.key ? '#fff' : '#cbd5e1'}
                />
                <Text style={[styles.navText, activeTab === item.key && styles.navTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => router.replace('/(tabs)' as any)} style={styles.exitButton}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.exitText}>Kembali</Text>
          </Pressable>
        </View>

        <View style={styles.mainContent}>
          {/* Header */}
          <LinearGradient colors={['#F05D6C', '#B83F68']} style={[styles.header, isCompact && styles.headerCompact]}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>AREA KERJA ADMIN</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{activeTabMeta.label}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{activeTabDescription[activeTab]}</Text>
            </View>
            <View style={styles.headerBadge}>
              <Ionicons name={activeTabMeta.icon} size={18} color="#FFF" />
            </View>
          </LinearGradient>

      {/* Stats */}
      <View style={[styles.statsCard, isCompact && styles.statsCardCompact, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
        <ShimmerGold style={styles.shimmer} />
        {activeTab === 'users' ? (
          <View style={[styles.statsGrid, isDenseStats && styles.statsGridCompact]}>
            <View style={[styles.statItem, isDenseStats && styles.statItemCompact]}><Text style={[styles.statVal, { color: colors.primary }]}>{userStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total User</Text></View>
            <View style={[styles.statItem, isDenseStats && styles.statItemCompact]}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{userStats.admins}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Admin</Text></View>
            <View style={[styles.statItem, isDenseStats && styles.statItemCompact]}><Text style={[styles.statVal, { color: colors.success }]}>{userStats.active}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Aktif</Text></View>
          </View>
        ) : activeTab === 'lapak' ? (
          <View style={[styles.statsGrid, styles.statsGridCompact]}>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: colors.primary }]}>{productStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FFB347' }]}>{productStats.pending}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Pending</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{productStats.approved}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Approved</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{productStats.rejected}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Rejected</Text></View>
          </View>
        ) : activeTab === 'events' ? (
          <View style={[styles.statsGrid, styles.statsGridCompact]}>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: colors.primary }]}>{eventStats.total}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{eventStats.published}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Published</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FFB347' }]}>{eventStats.draft}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Draft</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{eventStats.cancelled}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Dibatalkan</Text></View>
          </View>
        ) : (
          <View style={[styles.statsGrid, styles.statsGridCompact]}>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: colors.primary }]}>{eventRegistrations.length}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#2EC4B6' }]}>{eventRegistrations.filter((r) => r.status === 'confirmed').length}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Konfirmasi</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FFB347' }]}>{eventRegistrations.filter((r) => r.status === 'registered').length}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Pending</Text></View>
            <View style={styles.statItemCompact}><Text style={[styles.statVal, { color: '#FF6B6B' }]}>{eventRegistrations.filter((r) => r.status === 'cancelled').length}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Batal</Text></View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabGrid, isCompact && styles.tabGridCompact]}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => { setActiveTab(t.id); setSearch(''); }} style={[styles.tab, isCompact && styles.tabCompact, { backgroundColor: activeTab === t.id ? colors.primary + '12' : colors.surface, borderColor: activeTab === t.id ? colors.primary : colors.border }]}>
            <Ionicons name={t.icon as any} size={18} color={activeTab === t.id ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === t.id ? colors.primary : colors.textMuted }]} numberOfLines={1}>{t.label}</Text>
            <View style={[styles.tabCount, { backgroundColor: activeTab === t.id ? colors.primary : colors.textMuted + '30' }]}>
              <Text style={[styles.tabCountText, { color: activeTab === t.id ? '#FFF' : colors.textMuted }]}>{t.count}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={[styles.searchSection, isCompact && styles.searchSectionCompact]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 'users' ? 'Cari nama atau email...' : activeTab === 'events' ? 'Cari event atau lokasi...' : 'Cari data...'}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
        </View>
      </View>

      <View style={[styles.contentToolbar, isCompact && styles.contentToolbarCompact]}>
        <View style={styles.contentToolbarTitle}>
          <View style={[styles.contentToolbarIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={activeTabMeta.icon} size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.contentToolbarHeading, { color: colors.text }]}>{activeTabMeta.label}</Text>
            <Text style={[styles.contentToolbarSub, { color: colors.textSecondary }]}>Data terbaru dan aksi cepat</Text>
          </View>
        </View>
        <View style={[styles.resultCount, { backgroundColor: colors.surface }]}>
          <Text style={[styles.resultCountText, { color: colors.primary }]}>{activeTab === 'users' ? filteredMembers.length : activeTab === 'lapak' ? filteredProducts.length : activeTab === 'events' ? filteredEvents.length : activeTab === 'registrations' ? eventRegistrations.filter((r) => r.status !== 'cancelled').length : membershipPlans.length}</Text>
          <Text style={[styles.resultCountLabel, { color: colors.textMuted }]}>item</Text>
        </View>
      </View>

      {/* Lapak Filters */}
      {activeTab === 'users' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {userRoleFilters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setUserRoleFilter(filter.id)}
              style={[styles.filterChip, { backgroundColor: userRoleFilter === filter.id ? filter.color : colors.surface, borderColor: userRoleFilter === filter.id ? filter.color : colors.border }]}
            >
              <Text style={[styles.filterText, { color: userRoleFilter === filter.id ? '#FFF' : colors.textSecondary }]}>{filter.label} ({filter.count})</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Lapak Filters */}
      {activeTab === 'lapak' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemberCard item={item} isCurrentUser={item.id === user.id} currentUserRole={user.role} colors={colors} membershipPlans={membershipPlans}
              onChangeRole={updateMemberRole} onToggleActive={toggleMemberActive} onRemove={removeMember} onToggleFeature={handleToggleMemberFeature} />
          )}
          contentContainerStyle={[styles.list, isCompact && styles.listCompact]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{userRoleFilter === 'semua' ? 'Belum ada user' : `Belum ada ${ROLE_LABELS[userRoleFilter]}`}</Text></View>}
        />
      ) : activeTab === 'lapak' ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductModCard item={item} colors={colors}
              onApprove={approveProduct} onReject={rejectProduct} onDelete={deleteProduct} />
          )}
          contentContainerStyle={[styles.list, isCompact && styles.listCompact]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="bag-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{lapakFilter === 'semua' ? 'Belum ada dagangan' : `Tidak ada dagangan ${STATUS_LABELS[lapakFilter as LapakProduct['status']] || ''}`}</Text></View>}
        />
      ) : activeTab === 'events' ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EventModCard item={item} colors={colors}
              onEdit={(id) => router.push(`/event/edit/${id}` as any)}
              onPublish={(id) => updateEvent(id, { status: 'published' })}
              onCancel={(id) => Alert.alert('Batalkan Event', `Batalkan "${item.title}"?`, [
                { text: 'Tidak', style: 'cancel' },
                { text: 'Batalkan', style: 'destructive', onPress: () => updateEvent(id, { status: 'cancelled' }) },
              ])}
              onDelete={(id) => deleteEvent(id)} />
          )}
          contentContainerStyle={[styles.list, isCompact && styles.listCompact]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada event. Tambah event baru!</Text></View>}
        />
      ) : activeTab === 'membership' ? (
        <MembershipPanel plans={membershipPlans} members={members} colors={colors} onUpdateMember={updateUserMembership} onUpdatePlan={updateMembershipPlan} />
      ) : (
        <FlatList
          data={eventRegistrations.filter((r) => r.status !== 'cancelled').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, isCompact && styles.listCompact]}
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
                  {reg.userCity && <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{reg.userCity}</Text>}
                  {reg.notes && <Text style={[styles.cardMeta, { color: colors.textMuted, fontStyle: 'italic' }]}>"{reg.notes}"</Text>}
                </View>
              </View>
              <View style={styles.actionRow}>
                <View style={[styles.badge, { backgroundColor: (reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347') + '20' }]}>
                  <View style={[styles.dot, { backgroundColor: reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347' }]} />
                  <Text style={[styles.badgeText, { color: reg.status === 'confirmed' ? '#2EC4B6' : '#FFB347' }]}>{reg.status === 'confirmed' ? 'Dikonfirmasi' : 'Terdaftar'}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>Event #{reg.eventId} · {new Date(reg.createdAt).toLocaleDateString('id-ID')}</Text>
                <View style={styles.btnRow}>
                  {reg.status !== 'confirmed' && (
                    <Pressable onPress={() => confirmRegistration(reg.id)} style={[styles.iconBtn, { backgroundColor: '#2EC4B620' }]}>
                      <Ionicons name="checkmark" size={16} color="#2EC4B6" />
                    </Pressable>
                  )}
                  <Pressable onPress={() => Alert.alert('Batalkan', `Batalkan pendaftaran ${reg.userName}?`, [
                    { text: 'Tidak', style: 'cancel' },
                    { text: 'Batalkan', style: 'destructive', onPress: () => cancelRegistration(reg.id) },
                  ])} style={[styles.iconBtn, { backgroundColor: '#FF6B6B20' }]}>
                    <Ionicons name="close" size={16} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="clipboard-outline" size={48} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada pendaftaran event</Text></View>}
        />
      )}
        </View>
      </View>
    </View>
  );
}

export default memo(AdminScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  dashboardShell: { flex: 1, flexDirection: 'row' },
  dashboardShellCompact: { flexDirection: 'column' },
  sidebar: {
    width: 240,
    backgroundColor: '#111827',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 24 },
  brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  brandSubtitle: { color: '#cbd5e1', fontSize: 11, marginTop: 2 },
  navGroup: { gap: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navItemActive: { backgroundColor: '#FF6B6B' },
  navText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  navTextActive: { color: '#fff' },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sidebarCompact: { display: 'none' },
  exitText: { color: '#fff', fontWeight: '700' },
  mainContent: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerCompact: { paddingTop: 24, paddingHorizontal: Spacing.md, paddingBottom: 18 },
  headerCopy: { flex: 1, alignItems: 'flex-start', marginLeft: Spacing.md },
  headerEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: '900', marginTop: 2 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 2 },
  headerBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  statsCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  statsCardCompact: { marginHorizontal: Spacing.md, marginTop: -Spacing.sm },
  shimmer: { height: 3 },
  statsGrid: { flexDirection: 'row', padding: Spacing.md },
  statsGridCompact: { flexWrap: 'wrap', padding: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statItemCompact: { width: '50%', flexBasis: '50%', flexGrow: 0, flexShrink: 0, paddingVertical: Spacing.sm },
  statVal: { fontSize: FontSize.xxl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.sm },
  tabGridCompact: { flexWrap: 'nowrap', marginHorizontal: Spacing.md, paddingRight: Spacing.md },
  tab: { width: '31.8%', minHeight: 62, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: Spacing.sm, gap: 4 },
  tabCompact: { width: 92, minHeight: 72, flexGrow: 0 },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  tabCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  tabCountText: { fontSize: FontSize.xs, fontWeight: '700' },
  searchSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  searchSectionCompact: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 44 },
  contentToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.lg, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  contentToolbarCompact: { marginHorizontal: Spacing.md, marginTop: Spacing.xs, marginBottom: 2 },
  contentToolbarTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  contentToolbarIcon: { width: 32, height: 32, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  contentToolbarHeading: { fontSize: FontSize.md, fontWeight: '800' },
  contentToolbarSub: { fontSize: FontSize.xs, marginTop: 1 },
  resultCount: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full },
  resultCountText: { fontSize: FontSize.md, fontWeight: '900' },
  resultCountLabel: { fontSize: FontSize.xs },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  filterText: { fontSize: FontSize.sm, fontWeight: '600' },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  listCompact: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
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
  featureButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 68, height: 32, paddingHorizontal: 8, borderRadius: BorderRadius.sm, borderWidth: 1, flexShrink: 0, gap: 4 },
  featureButtonText: { fontSize: FontSize.xs, fontWeight: '700', flexShrink: 0 },
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
