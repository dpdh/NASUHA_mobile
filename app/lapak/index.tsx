import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { LAPAK_CATEGORIES } from '../../constants/data';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { lapakApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';

import type { LapakProduct } from '../../types';

const STATUS_LABEL: Record<LapakProduct['status'], string> = {
  pending: 'Menunggu Review',
  approved: 'Aktif',
  rejected: 'Ditolak',
};

const normalizeWhatsapp = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : `62${digits}`;
};

const ProductCard = memo(({ item, colors, showStatus }: { item: LapakProduct; colors: typeof Colors.light; showStatus?: boolean }) => {
  const statusColor = item.status === 'approved' ? colors.success : item.status === 'rejected' ? colors.error : colors.warning;
  const handleWhatsApp = useCallback(async () => {
    const normalizedPhone = normalizeWhatsapp(item.sellerWhatsapp);
    if (!normalizedPhone) {
      Alert.alert('Info', 'Nomor WhatsApp penjual belum tersedia.');
      return;
    }

    lapakApi.trackContact(item.id);
    const msg = encodeURIComponent(`Assalamu'alaikum, saya tertarik dengan produk "${item.name}" di NASJAK App. Apakah masih tersedia?`);
    try {
      const deepLink = `whatsapp://send?phone=${normalizedPhone}&text=${msg}`;
      const fallbackUrl = `https://wa.me/${normalizedPhone}?text=${msg}`;
      const supported = await Linking.canOpenURL(deepLink);
      await Linking.openURL(supported ? deepLink : fallbackUrl);
    } catch (error) {
      console.warn('WhatsApp open failed:', error);
      Alert.alert('Error', 'Tidak dapat membuka WhatsApp saat ini. Silakan coba lagi.');
    }
  }, [item]);

  return (
    <Pressable
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
      onPress={() => router.push(`/lapak/${item.id}` as any)}
    >
      {/* Photo */}
      {item.photos.length > 0 ? (
        <Image source={{ uri: item.photos[0] }} style={styles.productImage} />
      ) : (
        <LinearGradient colors={['#D4A853', '#F5D98C']} style={styles.productImagePlaceholder}>
          <Ionicons name="image-outline" size={32} color="#FFF" />
        </LinearGradient>
      )}

      <View style={styles.productBody}>
        {showStatus && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[item.status]}</Text>
            {item.status === 'rejected' && item.rejectionReason ? (
              <Text style={[styles.statusReason, { color: colors.textSecondary }]}>Alasan: {item.rejectionReason}</Text>
            ) : null}
          </View>
        )}
        {/* Tags */}
        <View style={styles.tagRow}>
          {item.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
          {item.specs.condition && (
            <View style={[styles.tag, { backgroundColor: colors.gold + '15' }]}>
              <Text style={[styles.tagText, { color: colors.gold }]}>{item.specs.condition}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: colors.gold }]}>Rp {item.price.toLocaleString('id-ID')}</Text>

        {/* Specs mini */}
        <View style={styles.specsMini}>
          {item.specs.weight && <Text style={[styles.specMiniText, { color: colors.textMuted }]}>{item.specs.weight}</Text>}
          {item.specs.stock !== undefined && <Text style={[styles.specMiniText, { color: colors.textMuted }]}>Stok: {item.specs.stock}</Text>}
          {item.specs.shippingFrom && <Text style={[styles.specMiniText, { color: colors.textMuted }]}>{item.specs.shippingFrom}</Text>}
        </View>

        {/* Seller */}
        <View style={[styles.sellerRow, { borderTopColor: colors.border }]}>
          <View style={[styles.sellerDot, { backgroundColor: colors.primary }]}>
            <Text style={styles.sellerInitial}>{item.sellerName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sellerName, { color: colors.text }]}>{item.sellerName}</Text>
            <Text style={[styles.sellerCity, { color: colors.textMuted }]}>{item.sellerCity}</Text>
          </View>
          <Pressable style={[styles.waBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
            <Text style={styles.waBtnText}>Chat</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});
ProductCard.displayName = 'ProductCard';

function LapakScreen() {
  const { mine } = useLocalSearchParams<{ mine?: string }>();
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const references = useAppStore((s) => s.references);
  const hasFeature = useAppStore((s) => s.hasFeature);
  const colors = Colors[theme];
  const [activeCategory, setActiveCategory] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const isMine = mine === '1';

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const categories = useMemo(() => (
    references?.lapakCategories?.length
      ? [{ id: 'semua', label: 'Semua', icon: 'grid-outline' }, ...references.lapakCategories.map((c) => ({ id: c.id, label: c.label, icon: c.icon || 'pricetag-outline' }))]
      : LAPAK_CATEGORIES
  ), [references]);

  const publicQuery = useApiQuery(
    () => lapakApi.list({
      category: activeCategory === 'semua' ? undefined : activeCategory,
      q: appliedQuery || undefined,
      perPage: 50,
    }),
    [activeCategory, appliedQuery],
    // Tetap dimuat di mode "Dagangan Saya" karena statistik hero (produk/penjual) berasal dari sini.
    { refetchOnFocus: true },
  );
  const mineQuery = useApiQuery(() => lapakApi.mine(), [user?.id], { refetchOnFocus: true, enabled: Boolean(user) });

  const stats = (publicQuery.data?.meta?.stats as { products: number; sellers: number } | undefined);
  const myProducts = useMemo(() => mineQuery.data?.data || [], [mineQuery.data]);

  const filteredProducts = useMemo(() => {
    if (!isMine) return publicQuery.data?.data || [];
    let list = myProducts;
    if (activeCategory !== 'semua') list = list.filter((p) => p.category === activeCategory);
    if (appliedQuery) {
      const q = appliedQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }, [isMine, publicQuery.data, myProducts, activeCategory, appliedQuery]);

  const activeQuery = isMine ? mineQuery : publicQuery;

  const handleSell = useCallback(() => {
    if (!user) {
      Alert.alert('Login Diperlukan', 'Silakan login terlebih dahulu untuk berjualan di Lapak.', [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    if (!hasFeature('lapak')) {
      Alert.alert(
        'Khusus Sahabat NASUHA',
        'Fitur Lapak Penjualan khusus untuk anggota Sahabat NASUHA. Hubungi admin atau korda Anda untuk upgrade membership.',
      );
      return;
    }
    router.push('/lapak/add' as any);
  }, [user, hasFeature]);

  const renderProduct = useCallback(
    ({ item }: { item: LapakProduct }) => <ProductCard item={item} colors={colors} showStatus={isMine} />,
    [colors, isMine],
  );

  const headerComponent = useMemo(() => (
    <>
      {/* Hero */}
      <LinearGradient colors={['#D4A853', '#B8860B']} style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Ionicons name="storefront" size={48} color="#FFF" />
        <Text style={styles.heroTitle}>{isMine ? 'Dagangan Saya' : 'Lapak Sahabat NASUHA'}</Text>
        <Text style={styles.heroSub}>Belanja dari sesama sahabat, berkah bersama</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Text style={styles.heroStatNum}>{stats?.products ?? '-'}</Text><Text style={styles.heroStatLabel}>Produk</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatNum}>{stats?.sellers ?? '-'}</Text><Text style={styles.heroStatLabel}>Penjual</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatNum}>100%</Text><Text style={styles.heroStatLabel}>Halal</Text></View>
        </View>
      </LinearGradient>

      {/* My Products Banner */}
      {!isMine && myProducts.length > 0 && (
        <Pressable onPress={() => router.push('/lapak/?mine=1' as any)} style={[styles.myBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Ionicons name="bag-check" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.myBannerTitle, { color: colors.text }]}>Dagangan Saya ({myProducts.length})</Text>
            <Text style={[styles.myBannerSub, { color: colors.textSecondary }]}>
              {myProducts.filter((p) => p.status === 'pending').length} pending · {myProducts.filter((p) => p.status === 'approved').length} aktif
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      )}

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          placeholder="Cari produk atau penjual..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery} onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></Pressable>}
      </View>

      {/* Categories */}
      <FlatList horizontal data={categories} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          return (
            <Pressable onPress={() => setActiveCategory(item.id)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : 'rgba(148, 163, 184, 0.25)',
                  shadowOpacity: isActive ? 0.16 : 0.08,
                },
              ]}>
              <Ionicons name={item.icon as any} size={14} color={isActive ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.categoryLabel, { color: isActive ? '#FFF' : colors.textSecondary }]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{filteredProducts.length} produk ditemukan</Text>
    </>
  ), [colors, activeCategory, searchQuery, stats, myProducts, filteredProducts.length, isMine, categories]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          activeQuery.loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="bag-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeQuery.error ? 'Gagal memuat produk' : isMine && !user ? 'Silakan login dulu' : 'Belum ada produk'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {activeQuery.error || 'Jadilah yang pertama jual dagangan!'}
              </Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={activeQuery.refreshing} onRefresh={activeQuery.refresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Jual Dagangan */}
      <Pressable onPress={handleSell} style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={['#D4A853', '#B8860B']} style={styles.fabGradient}>
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.fabText}>Jual</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default memo(LapakScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.18)' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '900', marginTop: Spacing.md, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 4 },
  heroStats: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.lg },
  heroStat: { alignItems: 'center' },
  heroStatNum: { color: '#FFF', fontSize: FontSize.xl, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  myBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.sm },
  myBannerTitle: { fontSize: FontSize.md, fontWeight: '700' },
  myBannerSub: { fontSize: FontSize.xs, marginTop: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, height: 48 },
  categoryList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
  },
  categoryLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  resultCount: { fontSize: FontSize.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  list: { paddingBottom: 100 },
  productCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  productImage: { width: '100%', height: 200 },
  productImagePlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  productBody: { padding: Spacing.md },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },
  statusReason: { fontSize: FontSize.xs, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.xs },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  tagText: { fontSize: FontSize.xs, fontWeight: '700' },
  productName: { fontSize: FontSize.lg, fontWeight: '700' },
  productPrice: { fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
  specsMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.xs },
  specMiniText: { fontSize: FontSize.xs },
  sellerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, marginTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  sellerDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sellerInitial: { color: '#FFF', fontWeight: '800', fontSize: FontSize.sm },
  sellerName: { fontSize: FontSize.sm, fontWeight: '700' },
  sellerCity: { fontSize: FontSize.xs },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  waBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700' },
  emptyHint: { fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 24, right: Spacing.lg },
  fabGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: BorderRadius.full },
  fabText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '800' },
});
