import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { NASUHA_KORDA } from '../../constants/data';
import { useApiQuery } from '../../hooks/useApiQuery';
import { ApiError, errorMessage } from '../../services/api';
import { eventApi } from '../../services/nasjakApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function EventDetailScreen() {
  const { id, register } = useLocalSearchParams<{ id: string; register?: string }>();
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const references = useAppStore((s) => s.references);
  const isStaff = useAppStore((s) => s.isStaff);
  const hasFeature = useAppStore((s) => s.hasFeature);
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState(user?.name || '');
  const [formEmail, setFormEmail] = useState(user?.email || '');
  const [formPhone, setFormPhone] = useState(user?.phone || '');
  const [formCity, setFormCity] = useState(user?.city || '');
  const [formKorda, setFormKorda] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const eventId = String(id);
  const { data: event, setData: setEvent, loading, error, reload } = useApiQuery(
    () => eventApi.detail(eventId),
    [eventId, user?.id],
  );

  const kordaOptions = useMemo(
    () => references?.kordas?.length
      ? references.kordas.map((k) => ({ id: k.id, label: k.label }))
      : NASUHA_KORDA.map((label) => ({ id: label, label })),
    [references],
  );

  const myRegistration = event?.myRegistration || null;

  const openForm = useCallback(() => {
    if (!user) {
      Alert.alert('Login Diperlukan', 'Silakan login terlebih dahulu untuk mendaftar event.', [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    if (!hasFeature('event')) {
      Alert.alert(
        'Fitur Khusus Member',
        'Fitur ini khusus member. Pendaftaran event tersedia untuk paket Membership dan Sahabat NASUHA. Hubungi admin atau korda Anda untuk upgrade membership.',
      );
      return;
    }
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormCity(user.city || '');
    setFormKorda(user.nasuhaRegion || '');
    setFormNotes('');
    setShowForm(true);
  }, [user, hasFeature]);

  const autoOpened = useRef(false);
  useEffect(() => {
    if (register === '1' && event && !event.myRegistration && !event.isFull && !autoOpened.current) {
      autoOpened.current = true;
      openForm();
    }
  }, [register, event, openForm]);

  if (!event) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={{ color: colors.textSecondary }}>{error || 'Event tidak ditemukan'}</Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Kembali</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const totalRegistered = event.registered;
  const pct = event.quota > 0 ? Math.round((totalRegistered / event.quota) * 100) : 0;
  const isFull = event.isFull ?? totalRegistered >= event.quota;
  const isClosed = event.status !== undefined && event.status !== 'published';

  const handleRegister = async () => {
    if (!formName.trim()) return Alert.alert('Error', 'Nama lengkap harus diisi');
    if (!formEmail.trim()) return Alert.alert('Error', 'Email harus diisi');
    if (!formPhone.trim()) return Alert.alert('Error', 'Nomor HP/WhatsApp harus diisi');
    if (!user) return Alert.alert('Error', 'Silakan login terlebih dahulu');
    if (submitting) return;

    setSubmitting(true);
    try {
      const registration = await eventApi.register(eventId, {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        city: formCity.trim() || undefined,
        korda: formKorda || undefined,
        notes: formNotes.trim() || undefined,
      });
      setShowForm(false);
      setEvent({
        ...event,
        registered: event.registered + 1,
        myRegistration: { id: registration.id, status: registration.status === 'confirmed' ? 'confirmed' : 'registered' },
      });
      reload();
      Alert.alert(
        'Pendaftaran Berhasil!',
        `Anda telah terdaftar di ${event.title}.\n\nDetail pendaftaran:\nNama: ${formName}\nEmail: ${formEmail}\nHP: ${formPhone}\n\nSampai jumpa di acara!`,
        [{ text: 'OK' }],
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.isFeatureLocked) {
        setShowForm(false);
        Alert.alert(
          'Fitur Khusus Member',
          'Fitur ini khusus member. Pendaftaran event tersedia untuk paket Membership dan Sahabat NASUHA. Hubungi admin atau korda Anda untuk upgrade membership.',
        );
      } else {
        Alert.alert('Gagal Mendaftar', errorMessage(caught));
        if (caught instanceof ApiError && (caught.status === 409 || caught.status === 400)) reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!myRegistration) return;
    Alert.alert('Batalkan Pendaftaran', `Yakin ingin membatalkan pendaftaran di ${event.title}?`, [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Batalkan',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventApi.cancelRegistration(myRegistration.id);
            setEvent({ ...event, registered: Math.max(0, event.registered - 1), myRegistration: null });
            reload();
            Alert.alert('Dibatalkan', 'Pendaftaran Anda telah dibatalkan.');
          } catch (caught) {
            Alert.alert('Gagal', errorMessage(caught));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
          <LinearGradient colors={['#00B4D8', '#0077B6']} style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            {isStaff() && (
              <Pressable onPress={() => router.push(`/event/edit/${event.id}` as any)} hitSlop={12} style={styles.editBtn}>
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{event.type}</Text>
          </View>
          <Text style={styles.heroTitle}>{event.title}</Text>
        </LinearGradient>

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          {[
            { icon: 'calendar-outline' as const, label: 'Tanggal', value: new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: 'time-outline' as const, label: 'Waktu', value: event.time + ' WIB' },
            { icon: 'location-outline' as const, label: 'Lokasi', value: event.location },
          ].map((info) => (
            <View key={info.label} style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
              <Ionicons name={info.icon} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{info.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{info.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Deskripsi</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{event.description}</Text>
        </View>

        {/* Quota */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quotaHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pendaftaran</Text>
            <Text style={[styles.quotaPct, { color: pct >= 90 ? colors.error : colors.primary }]}>{Math.min(pct, 100)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 90 ? colors.error : pct >= 70 ? colors.warning : colors.primary }]} />
          </View>
          <Text style={[styles.quotaText, { color: colors.textSecondary }]}>
            {totalRegistered} dari {event.quota} peserta terdaftar
          </Text>
          {isClosed && (
            <View style={[styles.fullBadge, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.fullText, { color: colors.error }]}>
                {event.status === 'cancelled' ? 'Event dibatalkan' : 'Event belum diterbitkan'}
              </Text>
            </View>
          )}
          {isFull && (
            <View style={[styles.fullBadge, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.fullText, { color: colors.error }]}>Kuota sudah penuh</Text>
            </View>
          )}
        </View>

        {/* My Registration Status */}
        {myRegistration && (
          <View style={[styles.section, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
            <View style={styles.regStatusRow}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.regStatusTitle, { color: colors.success }]}>Anda Sudah Terdaftar</Text>
                <Text style={[styles.regStatusSub, { color: colors.textSecondary }]}>
                  Status: {myRegistration.status === 'confirmed' ? 'Dikonfirmasi' : 'Terdaftar (menunggu konfirmasi)'}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleCancel} style={[styles.cancelBtn, { borderColor: colors.error }]}>
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.cancelText, { color: colors.error }]}>Batalkan Pendaftaran</Text>
            </Pressable>
          </View>
        )}

        {/* CTA */}
        {!myRegistration && !isClosed && (
          <Pressable onPress={isFull ? undefined : openForm} style={({ pressed }) => [{ opacity: pressed && !isFull ? 0.9 : 1 }]}>
            <LinearGradient
              colors={isFull ? ['#999', '#777'] : [colors.primary, '#0077B6']}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={isFull ? 'close-circle' : 'checkmark-circle'} size={22} color="#FFF" />
              <Text style={styles.ctaText}>{isFull ? 'Kuota Penuh' : 'Daftar Sekarang'}</Text>
            </LinearGradient>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Registration Form Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Pressable style={styles.modalOverlay} onPress={() => setShowForm(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>Form Pendaftaran</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{event.title}</Text>

                <Text style={[styles.formLabel, { color: colors.text }]}>Nama Lengkap *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Nama lengkap Anda"
                  placeholderTextColor={colors.textMuted}
                  value={formName}
                  onChangeText={setFormName}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>Email *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="email@contoh.com"
                  placeholderTextColor={colors.textMuted}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>No. HP / WhatsApp *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="081234567890"
                  placeholderTextColor={colors.textMuted}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>Kota / Domisili</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Contoh: Jakarta Timur"
                  placeholderTextColor={colors.textMuted}
                  value={formCity}
                  onChangeText={setFormCity}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>Korda NASUHA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kordaRow}>
                  {kordaOptions.map((k) => (
                    <Pressable key={k.id} onPress={() => setFormKorda(formKorda === k.id ? '' : k.id)}
                      style={[styles.kordaChip, { backgroundColor: formKorda === k.id ? colors.primary : colors.surface, borderColor: formKorda === k.id ? colors.primary : colors.border }]}>
                      <Text style={[styles.kordaChipText, { color: formKorda === k.id ? '#FFF' : colors.textSecondary }]}>
                        {k.label.replace('Korda ', '')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.formLabel, { color: colors.text }]}>Catatan (opsional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Informasi tambahan, pertanyaan, dll"
                  placeholderTextColor={colors.textMuted}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={{ height: 10 }} />
              </ScrollView>

              <Pressable onPress={handleRegister} disabled={submitting}>
                <LinearGradient colors={[colors.primary, '#0077B6']} style={[styles.submitBtn, submitting && { opacity: 0.7 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
                  <Text style={styles.submitText}>{submitting ? 'Mengirim...' : 'Konfirmasi Pendaftaran'}</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default memo(EventDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: {},
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  editBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '700' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  typeBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800' },
  infoGrid: { paddingHorizontal: Spacing.lg, marginTop: -Spacing.md, gap: Spacing.sm },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  infoLabel: { fontSize: FontSize.xs },
  infoValue: { fontSize: FontSize.md, fontWeight: '600' },
  section: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  desc: { fontSize: FontSize.md, lineHeight: 22 },
  quotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quotaPct: { fontSize: FontSize.lg, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 4, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  quotaText: { fontSize: FontSize.sm, marginTop: 4 },
  fullBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, padding: 8, borderRadius: BorderRadius.sm },
  fullText: { fontSize: FontSize.sm, fontWeight: '600' },
  regStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  regStatusTitle: { fontSize: FontSize.md, fontWeight: '700' },
  regStatusSub: { fontSize: FontSize.xs, marginTop: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  cancelText: { fontSize: FontSize.sm, fontWeight: '600' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, gap: Spacing.sm },
  ctaText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  modalSub: { fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.md },
  formLabel: { fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.sm, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 46, fontSize: FontSize.md },
  formTextArea: { height: 80, paddingTop: Spacing.sm },
  kordaRow: { gap: 6, paddingVertical: 4 },
  kordaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  kordaChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: BorderRadius.xl, marginTop: Spacing.sm, gap: 8 },
  submitText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '800' },
});
