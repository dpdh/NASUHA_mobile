import React, { memo, useState, useCallback } from 'react';
import {
  ActivityIndicator, View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '../../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../../../constants/theme';
import { LAPAK_CATEGORIES } from '../../../constants/data';
import { useApiQuery } from '../../../hooks/useApiQuery';
import { errorMessage } from '../../../services/api';
import { lapakApi, uploadApi } from '../../../services/nasjakApi';
import type { LapakProduct } from '../../../types';

const CONDITIONS = ['Baru', 'Bekas'] as const;
const MAX_PHOTOS = 5;

function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];
  const { data: product, loading, error } = useApiQuery(() => lapakApi.detail(String(id)), [id, user?.id]);

  if (!product) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : (
        <>
          <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Produk tidak ditemukan'}</Text>
          <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>Kembali</Text></Pressable>
        </>
      )}
    </View>
  );

  return <EditProductForm key={product.id} product={product} />;
}

function EditProductForm({ product }: { product: LapakProduct }) {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const references = useAppStore((s) => s.references);
  const colors = Colors[theme];

  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [description, setDescription] = useState(product?.description || '');
  const [photos, setPhotos] = useState<string[]>(product?.photos || []);
  const [whatsapp, setWhatsapp] = useState(product?.sellerWhatsapp || '');
  const [weight, setWeight] = useState(product?.specs.weight || '');
  const [condition, setCondition] = useState<'Baru' | 'Bekas'>(product?.specs.condition || 'Baru');
  const [stock, setStock] = useState(product?.specs.stock !== undefined ? String(product.specs.stock) : '');
  const [minOrder, setMinOrder] = useState(product?.specs.minOrder ? String(product.specs.minOrder) : '1');
  const [variant, setVariant] = useState(product?.specs.variant || '');
  const [shippingFrom, setShippingFrom] = useState(product?.specs.shippingFrom || '');
  const [tags, setTags] = useState(product?.tags.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [showCategory, setShowCategory] = useState(false);

  // Edit dari app hanya untuk pemilik; admin memoderasi lewat panel admin.
  const canEdit = Boolean(user && user.id === product.sellerId);

  const pickPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert('Maksimal', `Maksimal ${MAX_PHOTOS} foto`); return; }
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, [photos.length]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !category || !price || Number(price) <= 0 || photos.length === 0) {
      Alert.alert('Error', 'Lengkapi semua field wajib (nama, kategori, harga, foto)');
      return;
    }
    if (!description.trim()) { Alert.alert('Error', 'Deskripsi produk harus diisi'); return; }
    if (!whatsapp.trim()) { Alert.alert('Error', 'Nomor WhatsApp harus diisi'); return; }
    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const uri of photos) {
        uploaded.push(/^https?:\/\//.test(uri) ? uri : (await uploadApi.image(uri, 'product')).url);
      }
      await lapakApi.update(product.id, {
        name: name.trim(), category, description: description.trim(),
        price: Number(price), photos: uploaded, sellerWhatsapp: whatsapp.trim(),
        specs: { weight: weight.trim() || undefined, condition, stock: stock ? Number(stock) : undefined, minOrder: minOrder ? Number(minOrder) : 1, variant: variant.trim() || undefined, shippingFrom: shippingFrom.trim() || undefined },
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      Alert.alert('Berhasil', 'Dagangan diperbarui dan kembali menunggu review admin sebelum tampil lagi.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (caught) {
      Alert.alert('Gagal Menyimpan', errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }, [product.id, name, category, price, description, photos, whatsapp, weight, condition, stock, minOrder, variant, shippingFrom, tags]);

  const handleDelete = useCallback(() => {
    Alert.alert('Hapus Produk', `Yakin ingin menghapus "${product.name}"? Tindakan ini tidak bisa dibatalkan.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await lapakApi.remove(product.id);
            Alert.alert('Terhapus', 'Produk telah dihapus.', [{ text: 'OK', onPress: () => router.replace('/lapak/?mine=1' as any) }]);
          } catch (caught) {
            Alert.alert('Gagal Menghapus', errorMessage(caught));
          }
        },
      },
    ]);
  }, [product]);

  if (!canEdit) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
      <Text style={[styles.errorText, { color: colors.text }]}>Anda tidak bisa mengedit produk ini</Text>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>Kembali</Text></Pressable>
    </View>
  );

  const categories = references?.lapakCategories?.length
    ? references.lapakCategories.map((c) => ({ id: c.id, label: c.label }))
    : LAPAK_CATEGORIES.filter((c) => c.id !== 'semua');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Dagangan</Text>
        <Pressable onPress={handleSave} disabled={saving}><Text style={[styles.saveBtn, { color: colors.gold, opacity: saving ? 0.5 : 1 }]}>{saving ? 'Simpan...' : 'Simpan'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Photos */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>FOTO PRODUK</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {i === 0 && <View style={[styles.coverBadge, { backgroundColor: colors.gold }]}><Text style={styles.coverText}>Cover</Text></View>}
              <Pressable onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} style={[styles.removeBtn, { backgroundColor: colors.error }]}>
                <Ionicons name="close" size={14} color="#FFF" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={pickPhoto} style={[styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </Pressable>
          )}
        </ScrollView>

        {/* Fields */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>INFORMASI PRODUK</Text>
        <Field label="Nama Produk *" value={name} onChangeText={setName} colors={colors} />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kategori *</Text>
          <Pressable onPress={() => setShowCategory(!showCategory)} style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[{ flex: 1, fontSize: FontSize.md }, { color: category ? colors.text : colors.textMuted }]}>{categories.find((c) => c.id === category)?.label || 'Pilih'}</Text>
            <Ionicons name={showCategory ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
          {showCategory && <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => { setCategory(c.id); setShowCategory(false); }} style={[styles.dropdownItem, category === c.id && { backgroundColor: colors.primary + '15' }]}>
                <Text style={{ color: category === c.id ? colors.primary : colors.text, fontSize: FontSize.md }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>}
        </View>

        <Field label="Harga (Rp) *" value={price} onChangeText={setPrice} colors={colors} keyboardType="numeric" />
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Deskripsi *</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={description} onChangeText={setDescription} multiline maxLength={500} textAlignVertical="top" placeholderTextColor={colors.textMuted} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.gold }]}>SPESIFIKASI</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Field label="Berat" value={weight} onChangeText={setWeight} colors={colors} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kondisi</Text>
            <View style={styles.condRow}>
              {CONDITIONS.map((c) => (
                <Pressable key={c} onPress={() => setCondition(c)} style={[styles.condChip, { backgroundColor: condition === c ? colors.primary : colors.surface, borderColor: condition === c ? colors.primary : colors.border }]}>
                  <Text style={{ color: condition === c ? '#FFF' : colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Field label="Stok" value={stock} onChangeText={setStock} colors={colors} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="Min Order" value={minOrder} onChangeText={setMinOrder} colors={colors} keyboardType="numeric" /></View>
        </View>
        <Field label="Varian" value={variant} onChangeText={setVariant} colors={colors} />
        <Field label="Asal Kirim" value={shippingFrom} onChangeText={setShippingFrom} colors={colors} />

        <Text style={[styles.sectionLabel, { color: colors.gold }]}>KONTAK</Text>
        <Field label="WhatsApp *" value={whatsapp} onChangeText={setWhatsapp} colors={colors} keyboardType="phone-pad" />
        <Field label="Tags" value={tags} onChangeText={setTags} colors={colors} />

        <Pressable onPress={handleDelete} style={[styles.deleteBtn, { borderColor: colors.error }]}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles.deleteText, { color: colors.error }]}>Hapus produk</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const Field = memo(({ label, value, onChangeText, colors, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; colors: typeof Colors.light; keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) => (
  <View style={styles.field}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput style={[{ flex: 1, fontSize: FontSize.md, minHeight: 48 }, { color: colors.text }]} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={colors.textMuted} />
    </View>
  </View>
));
Field.displayName = 'Field';

export default memo(EditProductScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.lg, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  saveBtn: { fontSize: FontSize.md, fontWeight: '800' },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  photoRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 88, height: 88, borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  coverText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  removeBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, borderWidth: 1, gap: 8 },
  textArea: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, fontSize: FontSize.md, minHeight: 100, lineHeight: 22 },
  dropdown: { borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.xs, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  row2: { flexDirection: 'row', gap: Spacing.md },
  condRow: { flexDirection: 'row', gap: Spacing.sm },
  condChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.xl, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1 },
  deleteText: { fontSize: FontSize.md, fontWeight: '700' },
});
