import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';

interface InfaqProgram {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  gradient: [string, string];
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  whatsappConfirm: string;
}

const INFAQ_PROGRAMS: InfaqProgram[] = [
  {
    id: 'app',
    title: 'Support Development Software',
    description: 'Infaq untuk pengembangan dan maintenance Aplikasi NASUHA agar terus bermanfaat bagi umat. Dana digunakan untuk server, update fitur, dan perbaikan bug.',
    icon: 'phone-portrait-outline',
    gradient: ['#00B4D8', '#0077B6'],
    bankName: 'Bank Syariah Indonesia (BSI)',
    bankAccount: '7359302295',
    bankHolder: 'M. Ashadi Setiawan',
    whatsappConfirm: '6281234567890',
  },
  {
    id: 'subuh',
    title: 'Sedekah Subuh',
    description: 'Program sedekah subuh rutin untuk membantu saudara kita yang membutuhkan. Disalurkan setiap minggu melalui Korda NASUHA di seluruh Indonesia.',
    icon: 'sunny-outline',
    gradient: ['#F59E0B', '#D97706'],
    bankName: 'Bank Syariah Indonesia (BSI)',
    bankAccount: '7359302295',
    bankHolder: 'M. Ashadi Setiawan',
    whatsappConfirm: '6281234567890',
  },
  {
    id: 'air',
    title: 'Air Minum Gratis',
    description: 'Program pembagian air minum gratis untuk masyarakat yang membutuhkan di berbagai daerah. Rasulullah SAW bersabda: "Sebaik-baik sedekah adalah memberi air minum."',
    icon: 'water-outline',
    gradient: ['#06B6D4', '#0891B2'],
    bankName: 'Bank Syariah Indonesia (BSI)',
    bankAccount: '7359302295',
    bankHolder: 'M. Ashadi Setiawan',
    whatsappConfirm: '6281234567890',
  },
];

const NOMINAL_OPTIONS = [10000, 25000, 50000, 100000, 250000, 500000];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function InfaqScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const [selectedProgram, setSelectedProgram] = useState<InfaqProgram>(INFAQ_PROGRAMS[0]);
  const [selectedNominal, setSelectedNominal] = useState<number | null>(null);
  const [showSupportImage, setShowSupportImage] = useState(false);

  const handleCopyAccount = useCallback(async () => {
    await Clipboard.setStringAsync(selectedProgram.bankAccount);
    Alert.alert('Berhasil', 'Nomor rekening berhasil disalin');
  }, [selectedProgram]);

  const handleWhatsAppConfirm = useCallback(() => {
    const nominal = selectedNominal ? formatRupiah(selectedNominal) : '(nominal)';
    const msg = `Assalamu'alaikum, saya ingin konfirmasi infaq untuk program *${selectedProgram.title}* sebesar ${nominal}.\n\nRekening: ${selectedProgram.bankAccount}\nA/N: ${selectedProgram.bankHolder}\n\nMohon dikonfirmasi. Jazakallahu khairan.`;
    const url = `https://wa.me/${selectedProgram.whatsappConfirm}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Tidak dapat membuka WhatsApp'));
  }, [selectedProgram, selectedNominal]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Ionicons name="heart" size={48} color="#FFF" />
        <Text style={styles.heroTitle}>Infaq & Sedekah</Text>
        <Text style={styles.heroSub}>Bersedekah untuk kebaikan bersama</Text>
      </LinearGradient>

      {/* Ayat Motivasi */}
      <View style={[styles.ayatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.ayatArabic, { color: colors.text }]}>
          مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍۢ مِّا۟ئَةُ حَبَّةٍۢ
        </Text>
        <Text style={[styles.ayatTranslation, { color: colors.textSecondary }]}>
          "Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji." (QS. Al-Baqarah: 261)
        </Text>
      </View>

      <View style={[styles.supportCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
        <Pressable onPress={() => setShowSupportImage(true)} accessibilityLabel="Perbesar gambar SSNJ">
          <Image source={require('../../assets/SSNJ.jpg')} style={styles.supportImage} resizeMode="contain" />
          <View style={styles.zoomHint}>
            <Ionicons name="expand-outline" size={16} color="#FFF" />
            <Text style={styles.zoomHintText}>Ketuk untuk memperbesar</Text>
          </View>
        </Pressable>
        <Text style={[styles.supportTitle, { color: colors.text }]}>Support Development Software & Sedekah Sahabat NASUHA</Text>
        <Text style={[styles.supportText, { color: colors.textSecondary }]}>💳 Salurkan Sedekah Subuh, AMG, KMJ & Sedekah Spesial melalui Rekening Bendahara Nasuha Jakarta:</Text>
        <View style={[styles.supportBank, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.supportBankText, { color: colors.text }]}>🏦 BSI : 7359302295</Text>
          <Text style={[styles.supportBankText, { color: colors.text }]}>👤 a.n M. Ashadi Setiawan</Text>
        </View>
      </View>

      <Modal visible={showSupportImage} transparent animationType="fade" onRequestClose={() => setShowSupportImage(false)}>
        <View style={styles.imageModal}>
          <Pressable style={styles.imageModalClose} onPress={() => setShowSupportImage(false)} accessibilityLabel="Tutup gambar">
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <ScrollView
            style={styles.imageZoomViewport}
            contentContainerStyle={styles.imageZoomContent}
            minimumZoomScale={1}
            maximumZoomScale={3}
            bouncesZoom
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image source={require('../../assets/SSNJ.jpg')} style={styles.fullSupportImage} resizeMode="contain" />
          </ScrollView>
        </View>
      </Modal>

      {/* Program Tabs */}
      <View style={styles.programTabs}>
        {INFAQ_PROGRAMS.map((prog) => {
          const isActive = selectedProgram.id === prog.id;
          return (
            <Pressable
              key={prog.id}
              onPress={() => { setSelectedProgram(prog); setSelectedNominal(null); }}
              style={[styles.programTab, isActive && { borderColor: prog.gradient[0], borderWidth: 2 }, { backgroundColor: isActive ? prog.gradient[0] + '15' : colors.surface }]}
            >
              <Ionicons name={prog.icon} size={20} color={isActive ? prog.gradient[0] : colors.textMuted} />
              <Text style={[styles.programTabText, { color: isActive ? prog.gradient[0] : colors.textSecondary }]} numberOfLines={1}>
                {prog.id === 'app' ? 'Aplikasi' : prog.id === 'subuh' ? 'Sedekah Subuh' : 'Air Minum'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Selected Program Detail */}
      <View style={[styles.programCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
        <LinearGradient colors={selectedProgram.gradient} style={styles.programIcon}>
          <Ionicons name={selectedProgram.icon} size={32} color="#FFF" />
        </LinearGradient>
        <Text style={[styles.programTitle, { color: colors.text }]}>{selectedProgram.title}</Text>
        <Text style={[styles.programDesc, { color: colors.textSecondary }]}>{selectedProgram.description}</Text>

        {/* QR Code Placeholder */}
        <View style={styles.qrSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Scan QRIS untuk Transfer</Text>
          <LinearGradient colors={['#F8F9FA', '#E9ECEF']} style={styles.qrBox}>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={80} color="#6C757D" />
              <Text style={styles.qrPlaceholderText}>QRIS</Text>
            </View>
            <Text style={styles.qrNote}>Scan QR code di atas menggunakan{'\n'}aplikasi mobile banking Anda</Text>
          </LinearGradient>
        </View>

        {/* Bank Info */}
        <View style={styles.bankSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Transfer Manual</Text>
          <View style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: colors.textMuted }]}>Bank</Text>
              <Text style={[styles.bankValue, { color: colors.text }]}>{selectedProgram.bankName}</Text>
            </View>
            <View style={[styles.bankDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: colors.textMuted }]}>No. Rekening</Text>
              <View style={styles.bankAccountRow}>
                <Text style={[styles.bankAccountNumber, { color: colors.text }]}>{selectedProgram.bankAccount}</Text>
                <Pressable onPress={handleCopyAccount} style={[styles.copyBtn, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                  <Text style={[styles.copyBtnText, { color: colors.primary }]}>Salin</Text>
                </Pressable>
              </View>
            </View>
            <View style={[styles.bankDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: colors.textMuted }]}>Atas Nama</Text>
              <Text style={[styles.bankValue, { color: colors.text }]}>{selectedProgram.bankHolder}</Text>
            </View>
          </View>
        </View>

        {/* Nominal Suggestions */}
        <View style={styles.nominalSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Pilih Nominal</Text>
          <View style={styles.nominalGrid}>
            {NOMINAL_OPTIONS.map((n) => {
              const isActive = selectedNominal === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setSelectedNominal(isActive ? null : n)}
                  style={[styles.nominalChip, { backgroundColor: isActive ? selectedProgram.gradient[0] : colors.surface, borderColor: isActive ? selectedProgram.gradient[0] : colors.border }]}
                >
                  <Text style={[styles.nominalText, { color: isActive ? '#FFF' : colors.text }]}>
                    {n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}rb`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Konfirmasi WhatsApp */}
        <Pressable onPress={handleWhatsAppConfirm}>
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
            <Text style={styles.confirmBtnText}>Konfirmasi via WhatsApp</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Doa Section */}
      <View style={[styles.doaCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
        <Ionicons name="sparkles" size={24} color={colors.gold} />
        <Text style={[styles.doaTitle, { color: colors.gold }]}>Doa Bersedekah</Text>
        <Text style={[styles.doaArabic, { color: colors.text }]}>
          اللَّهُمَّ اجْعَلْهَا مَغْنَمًا وَلَا تَجْعَلْهَا مَغْرَمًا
        </Text>
        <Text style={[styles.doaTranslation, { color: colors.textSecondary }]}>
          "Ya Allah, jadikanlah (infaq ini) sebagai keuntungan dan jangan jadikan sebagai kerugian."
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Dana infaq dikelola oleh Yayasan NASUHA secara transparan dan amanah. Laporan penggunaan dana dapat dilihat di website resmi nasuha.id
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

export default memo(InfaqScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 4 },

  ayatCard: { marginHorizontal: Spacing.lg, marginTop: -Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  ayatArabic: { fontSize: 22, lineHeight: 40, textAlign: 'right', fontFamily: 'Lateef-Regular', marginBottom: Spacing.sm },
  ayatTranslation: { fontSize: FontSize.sm, lineHeight: 20, fontStyle: 'italic' },

  supportCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  supportImage: { width: '100%', height: 220, borderRadius: BorderRadius.md, backgroundColor: '#E8F0F0' },
  zoomHint: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: 'rgba(0,0,0,0.58)' },
  zoomHintText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '700' },
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  imageZoomViewport: { width: '100%', height: '82%' },
  imageZoomContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  fullSupportImage: { width: 360, height: 620 },
  imageModalClose: { position: 'absolute', top: 52, right: 18, zIndex: 2, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  supportTitle: { fontSize: FontSize.lg, fontWeight: '800', lineHeight: 23, marginTop: Spacing.md },
  supportText: { fontSize: FontSize.sm, lineHeight: 21, marginTop: Spacing.sm },
  supportBank: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md, gap: Spacing.xs },
  supportBankText: { fontSize: FontSize.md, fontWeight: '700', lineHeight: 22 },

  programTabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  programTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'transparent' },
  programTabText: { fontSize: FontSize.xs, fontWeight: '700' },

  programCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: StyleSheet.hairlineWidth },
  programIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  programTitle: { fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' },
  programDesc: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg },

  qrSection: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  qrBox: { borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' },
  qrPlaceholder: { alignItems: 'center', padding: Spacing.lg },
  qrPlaceholderText: { fontSize: FontSize.lg, fontWeight: '800', color: '#6C757D', marginTop: Spacing.xs },
  qrNote: { fontSize: FontSize.xs, color: '#6C757D', textAlign: 'center', marginTop: Spacing.sm },

  bankSection: { marginBottom: Spacing.lg },
  bankCard: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  bankRow: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  bankLabel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4 },
  bankValue: { fontSize: FontSize.md, fontWeight: '700' },
  bankAccountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankAccountNumber: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full },
  copyBtnText: { fontSize: FontSize.xs, fontWeight: '700' },
  bankDivider: { height: StyleSheet.hairlineWidth },

  nominalSection: { marginBottom: Spacing.lg },
  nominalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  nominalChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 1, minWidth: '30%', alignItems: 'center' },
  nominalText: { fontSize: FontSize.md, fontWeight: '700' },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16, borderRadius: BorderRadius.xl },
  confirmBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },

  doaCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  doaTitle: { fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.xs },
  doaArabic: { fontSize: 24, lineHeight: 44, textAlign: 'center', fontFamily: 'Lateef-Regular', marginTop: Spacing.sm },
  doaTranslation: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center', fontStyle: 'italic', marginTop: Spacing.xs },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
});
