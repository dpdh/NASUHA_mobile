import React, { memo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { LAPAK_CATEGORIES } from '../../constants/data';
import { ApiError, errorMessage } from '../../services/api';
import { lapakApi, uploadApi } from '../../services/nasjakApi';

const CONDITIONS = ['Baru', 'Bekas'] as const;
const MAX_PHOTOS = 5;

function AddProductScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const references = useAppStore((s) => s.references);
  const colors = Colors[theme];

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState(user?.phone || '');
  const [weight, setWeight] = useState('');
  const [condition, setCondition] = useState<'Baru' | 'Bekas'>('Baru');
  const [stock, setStock] = useState('');
  const [minOrder, setMinOrder] = useState('1');
  const [variant, setVariant] = useState('');
  const [shippingFrom, setShippingFrom] = useState(user?.city || '');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCategory, setShowCategory] = useState(false);

  const pickPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Maksimal', `Maksimal ${MAX_PHOTOS} foto per produk`);
      return;
    }
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Izin', 'Izinkan akses galeri'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, [photos.length]);

  const takePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert('Maksimal', `Maksimal ${MAX_PHOTOS} foto`); return; }
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert('Izin', 'Izinkan akses kamera'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, [photos.length]);

  const removePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama produk harus diisi'); return; }
    if (!category) { Alert.alert('Error', 'Pilih kategori produk'); return; }
    if (!price || Number(price) <= 0) { Alert.alert('Error', 'Harga harus valid'); return; }
    if (photos.length === 0) { Alert.alert('Error', 'Tambahkan minimal 1 foto produk'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Deskripsi produk harus diisi'); return; }
    if (!whatsapp.trim()) { Alert.alert('Error', 'Nomor WhatsApp harus diisi'); return; }

    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const uri of photos) {
        uploaded.push(/^https?:\/\//.test(uri) ? uri : (await uploadApi.image(uri, 'product')).url);
      }
      await lapakApi.create({
        sellerWhatsapp: whatsapp.trim(),
        name: name.trim(),
        category,
        description: description.trim(),
        price: Number(price),
        photos: uploaded,
        specs: {
          weight: weight.trim() || undefined,
          condition,
          stock: stock ? Number(stock) : undefined,
          minOrder: minOrder ? Number(minOrder) : 1,
          variant: variant.trim() || undefined,
          shippingFrom: shippingFrom.trim() || undefined,
        },
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      Alert.alert('Dagangan Ditambahkan!', 'Dagangan Anda sedang menunggu persetujuan admin.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (caught) {
      if (caught instanceof ApiError && caught.isFeatureLocked) {
        Alert.alert('Khusus Sahabat NASUHA', 'Fitur Lapak Penjualan khusus untuk anggota Sahabat NASUHA. Hubungi admin atau korda Anda untuk upgrade membership.');
      } else {
        Alert.alert('Gagal Memposting', errorMessage(caught));
      }
    } finally {
      setSaving(false);
    }
  }, [name, category, price, photos, description, whatsapp, weight, condition, stock, minOrder, variant, shippingFrom, tags]);

  if (!user) return null;

  const categories = references?.lapakCategories?.length
    ? references.lapakCategories.map((c) => ({ id: c.id, label: c.label, icon: c.icon || 'pricetag-outline' }))
    : LAPAK_CATEGORIES.filter((c) => c.id !== 'semua');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Jual Dagangan</Text>
        <Pressable onPress={handleSubmit} disabled={saving}><Text style={[styles.saveBtn, { color: colors.gold, opacity: saving ? 0.5 : 1 }]}>{saving ? 'Posting...' : 'Posting'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Photo Upload */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>FOTO PRODUK *</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>Tambahkan foto (maks {MAX_PHOTOS}). Foto pertama jadi cover.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {i === 0 && <View style={[styles.coverBadge, { backgroundColor: colors.gold }]}><Text style={styles.coverText}>Cover</Text></View>}
              <Pressable onPress={() => removePhoto(i)} style={[styles.removeBtn, { backgroundColor: colors.error }]}>
                <Ionicons name="close" size={14} color="#FFF" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <View style={styles.addPhotoRow}>
              <Pressable onPress={pickPhoto} style={[styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="image-outline" size={28} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.primary }]}>Galeri</Text>
              </Pressable>
              <Pressable onPress={takePhoto} style={[styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="camera-outline" size={28} color={colors.gold} />
                <Text style={[styles.addPhotoText, { color: colors.gold }]}>Kamera</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Basic Info */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>INFORMASI PRODUK</Text>
        <Field label="Nama Produk *" value={name} onChangeText={setName} placeholder="Contoh: Madu Hutan Sumbawa 500ml" colors={colors} />

        {/* Category Picker */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kategori *</Text>
          <Pressable onPress={() => setShowCategory(!showCategory)} style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="grid-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.fieldInput, { color: category ? colors.text : colors.textMuted }]}>{categories.find((c) => c.id === category)?.label || 'Pilih kategori'}</Text>
            <Ionicons name={showCategory ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
          {showCategory && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {categories.map((c) => (
                <Pressable key={c.id} onPress={() => { setCategory(c.id); setShowCategory(false); }}
                  style={[styles.dropdownItem, category === c.id && { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={c.icon as any} size={16} color={category === c.id ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.dropdownText, { color: category === c.id ? colors.primary : colors.text }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Field label="Harga (Rp) *" value={price} onChangeText={setPrice} placeholder="150000" colors={colors} keyboardType="numeric" />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Deskripsi *</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description} onChangeText={setDescription}
            placeholder="Jelaskan produk Anda secara detail..." placeholderTextColor={colors.textMuted}
            multiline maxLength={500} textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>{description.length}/500</Text>
        </View>

        {/* Specs */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>SPESIFIKASI</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Field label="Berat" value={weight} onChangeText={setWeight} placeholder="500gr" colors={colors} /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kondisi</Text>
              <View style={styles.condRow}>
                {CONDITIONS.map((c) => (
                  <Pressable key={c} onPress={() => setCondition(c)}
                    style={[styles.condChip, { backgroundColor: condition === c ? colors.primary : colors.surface, borderColor: condition === c ? colors.primary : colors.border }]}>
                    <Text style={[styles.condText, { color: condition === c ? '#FFF' : colors.textSecondary }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Field label="Stok" value={stock} onChangeText={setStock} placeholder="100" colors={colors} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="Min. Order" value={minOrder} onChangeText={setMinOrder} placeholder="1" colors={colors} keyboardType="numeric" /></View>
        </View>
        <Field label="Varian (opsional)" value={variant} onChangeText={setVariant} placeholder="Merah, Biru, Hijau" colors={colors} />
        <Field label="Asal Kirim" value={shippingFrom} onChangeText={setShippingFrom} placeholder="Jakarta Timur" colors={colors} />

        {/* Contact */}
        <Text style={[styles.sectionLabel, { color: colors.gold }]}>KONTAK</Text>
        <Field label="WhatsApp *" value={whatsapp} onChangeText={setWhatsapp} placeholder="628123456789" colors={colors} keyboardType="phone-pad" />
        <Field label="Tags (pisahkan koma)" value={tags} onChangeText={setTags} placeholder="Halal, Best Seller, Syariah" colors={colors} />

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Dagangan akan ditinjau oleh admin sebelum ditampilkan di Lapak. Proses review biasanya 1x24 jam.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const Field = memo(({ label, value, onChangeText, placeholder, colors, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
  colors: typeof Colors.light; keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) => (
  <View style={styles.field}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput style={[styles.fieldInput, { color: colors.text }]} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={keyboardType} />
    </View>
  </View>
));
Field.displayName = 'Field';

export default memo(AddProductScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  saveBtn: { fontSize: FontSize.md, fontWeight: '800' },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  hint: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  photoRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 88, height: 88, borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  coverText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  removeBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addPhotoRow: { flexDirection: 'row', gap: Spacing.sm },
  addPhotoBtn: { width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontSize: FontSize.xs, fontWeight: '600' },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, borderWidth: 1, gap: 8 },
  fieldInput: { flex: 1, fontSize: FontSize.md, minHeight: 48 },
  textArea: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, fontSize: FontSize.md, minHeight: 100, lineHeight: 22 },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: 4 },
  dropdown: { borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.xs, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  dropdownText: { fontSize: FontSize.md },
  row2: { flexDirection: 'row', gap: Spacing.md },
  condRow: { flexDirection: 'row', gap: Spacing.sm },
  condChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1 },
  condText: { fontSize: FontSize.md, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm, marginTop: Spacing.lg },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
});
