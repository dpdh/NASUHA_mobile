// Form event bersama untuk layar tambah & edit event (admin).
import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';
import { errorMessage } from '../services/api';
import { adminApi, uploadApi, type EventInput } from '../services/nasjakApi';
import type { Event } from '../types';

export const EVENT_TYPES = ['TSN', 'LBU', 'Kajian', 'KFM', 'TOT', 'Scale Up Bisnis', 'Safari Dakwah', 'Digital Marketing', 'Public Speaking', 'Business Coaching', 'Sosial', 'Lainnya'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type EventStatus = 'published' | 'draft' | 'cancelled';

export function AccessDenied({ message = 'Akses Ditolak', icon = 'lock-closed' as const }: { message?: string; icon?: 'lock-closed' | 'calendar-outline' }) {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  return (
    <View style={[styles.denied, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={64} color={colors.textMuted} />
      <Text style={[styles.deniedTitle, { color: colors.text }]}>{message}</Text>
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.primary }]}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Kembali</Text>
      </Pressable>
    </View>
  );
}

// Form event dipakai bersama oleh layar tambah & edit (khusus admin).
export function EventForm({ existing }: { existing?: Event }) {
  const theme = useAppStore((s) => s.theme);
  const references = useAppStore((s) => s.references);
  const colors = Colors[theme];
  const eventTypes = references?.eventTypes?.length ? references.eventTypes.map((t) => t.id) : EVENT_TYPES;

  const [title, setTitle] = useState(existing?.title || '');
  const [type, setType] = useState(existing?.type || eventTypes[0] || 'TSN');
  const [date, setDate] = useState(existing?.date || '');
  const [time, setTime] = useState(existing?.time || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [quota, setQuota] = useState(existing ? String(existing.quota) : '');
  const [contactWhatsapp, setContactWhatsapp] = useState(existing?.contactWhatsapp || '');
  const [status, setStatus] = useState<EventStatus>(existing?.status || 'published');
  const [image, setImage] = useState<string | null>(existing?.image || null);
  const [saving, setSaving] = useState(false);

  const statuses: EventStatus[] = existing ? ['published', 'draft', 'cancelled'] : ['published', 'draft'];
  const statusLabel: Record<EventStatus, string> = existing
    ? { published: 'Published', draft: 'Draft', cancelled: 'Dibatalkan' }
    : { published: 'Langsung Publish', draft: 'Simpan Draft', cancelled: 'Dibatalkan' };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Judul event harus diisi');
    if (!DATE_PATTERN.test(date.trim()) || Number.isNaN(Date.parse(date.trim()))) {
      return Alert.alert('Error', 'Tanggal harus diisi dengan format YYYY-MM-DD');
    }
    if (!TIME_PATTERN.test(time.trim())) return Alert.alert('Error', 'Waktu harus diisi dengan format HH:MM');
    if (!location.trim()) return Alert.alert('Error', 'Lokasi harus diisi');
    const quotaNumber = parseInt(quota, 10);
    if (!quota.trim() || Number.isNaN(quotaNumber) || quotaNumber < 1) return Alert.alert('Error', 'Kuota harus berupa angka minimal 1');
    if (saving) return;

    setSaving(true);
    try {
      let imageUrl = image;
      if (image && !/^https?:\/\//.test(image)) {
        imageUrl = (await uploadApi.image(image, 'event')).url;
      }
      const input: EventInput = {
        title: title.trim(),
        type,
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        description: description.trim(),
        quota: quotaNumber,
        status,
        contactWhatsapp: contactWhatsapp.trim() || null,
        image: imageUrl,
      };
      if (existing) await adminApi.updateEvent(existing.id, input);
      else await adminApi.createEvent(input);
      Alert.alert('Berhasil', existing ? 'Event berhasil diperbarui!' : 'Event berhasil ditambahkan!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (caught) {
      Alert.alert('Gagal Menyimpan', errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#4A90D9', '#357ABD']} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{existing ? 'Edit Event' : 'Tambah Event Baru'}</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: colors.text }]}>Judul Event *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Contoh: TSN Oktober 2026"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text }]}>Tipe Event *</Text>
          <View style={styles.chipRow}>
            {eventTypes.map((t) => (
              <Pressable key={t} onPress={() => setType(t)}
                style={[styles.chip, { backgroundColor: type === t ? colors.primary : colors.surface, borderColor: type === t ? colors.primary : colors.border }]}>
                <Text style={[styles.chipText, { color: type === t ? '#FFF' : colors.textSecondary }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Tanggal * (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="2026-10-15"
                placeholderTextColor={colors.textMuted}
                value={date}
                onChangeText={setDate}
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Waktu * (HH:MM)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                value={time}
                onChangeText={setTime}
                maxLength={5}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Lokasi *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Masjid / Gedung / Online via Zoom"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[styles.label, { color: colors.text }]}>Deskripsi</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Penjelasan singkat tentang event..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Kuota Peserta *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="200"
                placeholderTextColor={colors.textMuted}
                value={quota}
                onChangeText={setQuota}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>WhatsApp CP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="081234567890"
                placeholderTextColor={colors.textMuted}
                value={contactWhatsapp}
                onChangeText={setContactWhatsapp}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Gambar (opsional)</Text>
          <Pressable onPress={pickImage} style={[styles.imageBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.imageHint, { color: colors.textMuted }]}>Pilih gambar banner</Text>
              </>
            )}
          </Pressable>
          {image && (
            <Pressable onPress={() => setImage(null)} style={styles.removeImage}>
              <Text style={{ color: colors.error, fontWeight: '600' }}>Hapus gambar</Text>
            </Pressable>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Status</Text>
          <View style={styles.chipRow}>
            {statuses.map((s) => (
              <Pressable key={s} onPress={() => setStatus(s)}
                style={[styles.chip, { backgroundColor: status === s ? colors.primary : colors.surface, borderColor: status === s ? colors.primary : colors.border }]}>
                <Ionicons name={s === 'published' ? 'globe-outline' : s === 'draft' ? 'document-outline' : 'close-circle-outline'} size={14} color={status === s ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.chipText, { color: status === s ? '#FFF' : colors.textSecondary }]}>{statusLabel[s]}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
            <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : existing ? 'Simpan Perubahan' : 'Simpan Event'}</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
  headerTitle: { flex: 1, color: '#FFF', fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' },
  form: { padding: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.md, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, fontSize: FontSize.md },
  textArea: { height: 100, paddingTop: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, gap: 4 },
  chipText: { fontSize: FontSize.sm, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: BorderRadius.lg, marginTop: Spacing.xl, gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  deniedTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  backBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5, marginTop: Spacing.md },
  imageBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: BorderRadius.md, height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imageHint: { fontSize: FontSize.sm, marginTop: 4 },
  removeImage: { alignSelf: 'flex-start', marginTop: 6 },
});
