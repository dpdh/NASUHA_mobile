import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions, FlatList,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { lapakApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu Review', approved: 'Aktif', rejected: 'Ditolak' };
const STATUS_COLORS: Record<string, string> = { pending: '#FFB347', approved: '#2EC4B6', rejected: '#FF6B6B' };
const normalizeWhatsapp = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : `62${digits}`;
};

function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const [activePhoto, setActivePhoto] = useState(0);

  const { data: product, loading, error } = useApiQuery(() => lapakApi.detail(String(id)), [id, user?.id], { refetchOnFocus: true });
  const isOwner = Boolean(user && product && user.id === product.sellerId);

  const handleWhatsApp = useCallback(async () => {
    if (!product) return;
    const normalizedPhone = normalizeWhatsapp(product.sellerWhatsapp);
    if (!normalizedPhone) {
      Alert.alert('Info', 'Nomor WhatsApp penjual belum tersedia.');
      return;
    }

    lapakApi.trackContact(product.id);
    const msg = encodeURIComponent(`Assalamu'alaikum, saya tertarik dengan produk "${product.name}" seharga Rp ${product.price.toLocaleString('id-ID')} di NASJAK App. Apakah masih tersedia?`);
    try {
      const deepLink = `whatsapp://send?phone=${normalizedPhone}&text=${msg}`;
      const fallbackUrl = `https://wa.me/${normalizedPhone}?text=${msg}`;
      const supported = await Linking.canOpenURL(deepLink);
      await Linking.openURL(supported ? deepLink : fallbackUrl);
    } catch (error) {
      console.warn('WhatsApp detail open failed:', error);
      Alert.alert('Error', 'Tidak dapat membuka WhatsApp saat ini. Silakan coba lagi.');
    }
  }, [product]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try { await Share.share({ message: `${product.name}\nRp ${product.price.toLocaleString('id-ID')}\nOleh: ${product.sellerName}\n\nLihat di NASJAK App` }); } catch {}
  }, [product]);

  if (!product) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : (
        <>
          <Ionicons name="bag-remove-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Produk tidak ditemukan'}</Text>
          <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary, fontWeight: '700' }}>Kembali</Text></Pressable>
        </>
      )}
    </View>
  );

  const specs: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    ...(product.specs.condition ? [{ label: 'Kondisi', value: product.specs.condition, icon: 'pricetag-outline' as const }] : []),
    ...(product.specs.weight ? [{ label: 'Berat', value: product.specs.weight, icon: 'scale-outline' as const }] : []),
    ...(product.specs.stock !== undefined ? [{ label: 'Stok', value: `${product.specs.stock} pcs`, icon: 'cube-outline' as const }] : []),
    ...(product.specs.minOrder ? [{ label: 'Min. Order', value: `${product.specs.minOrder} pcs`, icon: 'cart-outline' as const }] : []),
    ...(product.specs.variant ? [{ label: 'Varian', value: product.specs.variant, icon: 'color-palette-outline' as const }] : []),
    ...(product.specs.shippingFrom ? [{ label: 'Dikirim dari', value: product.specs.shippingFrom, icon: 'location-outline' as const }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detail Produk</Text>
        <View style={styles.headerRight}>
          {isOwner && (
            <Pressable onPress={() => router.push(`/lapak/edit/${product.id}` as any)} hitSlop={12}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={handleShare} hitSlop={12}><Ionicons name="share-outline" size={22} color={colors.primary} /></Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Photo Gallery */}
        {product.photos.length > 0 ? (
          <View>
            <FlatList
              data={product.photos}
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              renderItem={({ item: uri }) => <Image source={{ uri }} style={styles.galleryImage} />}
            />
            {product.photos.length > 1 && (
              <View style={styles.dotsRow}>
                {product.photos.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === activePhoto ? colors.primary : colors.border }]} />
                ))}
              </View>
            )}
            <View style={styles.photoCount}><Text style={styles.photoCountText}>{activePhoto + 1}/{product.photos.length}</Text></View>
          </View>
        ) : (
          <LinearGradient colors={['#D4A853', '#F5D98C', '#B8860B']} style={styles.noPhoto}>
            <Ionicons name="image-outline" size={64} color="#FFF" />
          </LinearGradient>
        )}

        {/* Status badge (for owner) */}
        {isOwner && (
          <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[product.status] + '15' }]}>
            <Ionicons name={product.status === 'approved' ? 'checkmark-circle' : product.status === 'pending' ? 'time' : 'close-circle'} size={18} color={STATUS_COLORS[product.status]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[product.status] }]}>Status: {STATUS_LABELS[product.status]}</Text>
              {product.status === 'rejected' && product.rejectionReason ? (
                <Text style={[styles.statusText, { color: colors.textSecondary, fontWeight: '500' }]}>Alasan: {product.rejectionReason}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Tags */}
        <View style={styles.tagRow}>
          {product.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.tagText, { color: colors.gold }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Name & Price */}
        <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
        <Text style={[styles.productPrice, { color: colors.gold }]}>Rp {product.price.toLocaleString('id-ID')}</Text>

        {/* Description */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Deskripsi Produk</Text>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>{product.description}</Text>
        </View>

        {/* Specs Table */}
        {specs.length > 0 && (
          <View style={[styles.specsCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.sm }]}>Spesifikasi</Text>
            {specs.map((s, i) => (
              <View key={s.label} style={[styles.specRow, i < specs.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.specLeft}>
                  <Ionicons name={s.icon} size={16} color={colors.textMuted} />
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                </View>
                <Text style={[styles.specValue, { color: colors.text }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Seller Info */}
        <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.sellerTop}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.sellerAvatarText}>{product.sellerName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sellerName, { color: colors.text }]}>{product.sellerName}</Text>
              <View style={styles.sellerMeta}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.sellerCity, { color: colors.textMuted }]}>{product.sellerCity}</Text>
              </View>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={[styles.verifiedText, { color: colors.primary }]}>NASUHA</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Spacing.md + insets.bottom, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable style={[styles.chatBtn, { borderColor: '#25D366' }]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={[styles.chatBtnText, { color: '#25D366' }]}>Chat</Text>
        </Pressable>
        <Pressable style={styles.orderBtn} onPress={handleWhatsApp}>
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.orderBtnGradient}>
            <Ionicons name="cart-outline" size={20} color="#FFF" />
            <Text style={styles.orderBtnText}>Pesan Sekarang</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(ProductDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.lg, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: Spacing.md },
  content: { paddingBottom: 120 },

  // Gallery
  galleryImage: { width: SCREEN_WIDTH, height: 300 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  photoCount: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  photoCountText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  noPhoto: { height: 220, alignItems: 'center', justifyContent: 'center' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md },
  statusText: { fontSize: FontSize.sm, fontWeight: '700' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm },
  tagText: { fontSize: FontSize.xs, fontWeight: '700' },
  productName: { fontSize: FontSize.xxl, fontWeight: '900', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, lineHeight: 30 },
  productPrice: { fontSize: 30, fontWeight: '900', paddingHorizontal: Spacing.lg, marginTop: Spacing.xs },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  descText: { fontSize: FontSize.md, lineHeight: 24, marginTop: Spacing.sm },

  specsCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  specLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  specLabel: { fontSize: FontSize.sm },
  specValue: { fontSize: FontSize.sm, fontWeight: '700' },

  sellerCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sellerTop: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
  sellerName: { fontSize: FontSize.md, fontWeight: '700' },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  sellerCity: { fontSize: FontSize.xs },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '700' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 2 },
  chatBtnText: { fontSize: FontSize.md, fontWeight: '700' },
  orderBtn: { flex: 1 },
  orderBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg },
  orderBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '800' },
});
