import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';

const METHODS = [
  { title: 'Snowball', subtitle: 'Pokok terkecil dahulu', icon: 'snow', color: '#2685B8', body: 'Urutkan saldo pokok yang diakui dari yang paling kecil. Penuhi kewajiban yang telah disepakati secara tertulis pada utang lain, lalu arahkan dana akselerasi ke pokok terkecil untuk membangun momentum.' },
  { title: 'Avalanche syariah', subtitle: 'Biaya sah paling membebani', icon: 'trending-down', color: '#C98B2E', body: 'Setelah akad dan DBO dipetakan, arahkan dana ekstra kepada kewajiban dengan biaya sah yang paling membebani. Jangan memakai bunga atau DBO yang belum jelas sebagai dasar prioritas.' },
  { title: 'Negosiasi terarah', subtitle: 'Kesepakatan tertulis', icon: 'git-merge', color: '#2E8B78', body: 'Tetapkan kemampuan bayar, minta pengurangan atau penghapusan DBO, pastikan persetujuan tertulis, lalu penuhi komitmen sesuai jadwal. Konsultasikan kasus khusus kepada ahli syariah dan penasihat hukum.' },
] as const;

const DEBT_GUIDE = [
  ['Pinjol / pindar', 'Pastikan legalitas, simpan akad dan riwayat tagihan, lalu bedakan pokok dari DBO. Ajukan restrukturisasi lewat kanal resmi; jangan transfer ke rekening pribadi penagih.'],
  ['Rentenir', 'Utamakan keselamatan dan dokumentasikan transaksi, ancaman, serta bukti pembayaran. Usahakan pendampingan keluarga atau tokoh tepercaya dan negosiasikan pokok secara tertulis.'],
  ['Bank / KTA / kartu kredit', 'Minta rincian pelunasan dan opsi restrukturisasi. Pastikan pembayaran ekstra mengurangi pokok atau tenor sesuai kesepakatan.'],
  ['Leasing / pembiayaan kendaraan', 'Periksa akad, jaminan, sisa pokok, dan ketentuan pelunasan dipercepat. Evaluasi aset secara legal bila cicilan tidak sanggup.'],
  ['Utang perorangan', 'Jujur, jangan menghindar, tulis nominal pokok dan jadwal bayar, lalu kirim bukti untuk menjaga amanah.'],
  ['Vendor', 'Rekonsiliasi invoice, retur, dan sengketa kualitas. Buat cicilan realistis yang tidak mematikan arus kas usaha.'],
  ['Investor', 'Bedakan utang, penyertaan modal, dan bagi hasil. Laporkan kondisi usaha transparan dan buat kesepakatan tertulis.'],
];

const CHECKLIST = ['Catat akad, pokok, biaya sah, dan DBO yang diperselisihkan', 'Kirim proposal pembayaran tertulis melalui kanal resmi', 'Bayar sesuai angka kesepakatan dan simpan bukti', 'Jangan menambah utang konsumtif baru', 'Perbarui saldo pokok dan catat kemajuan'];

const WEEK_PLAN = [
  'Tulis semua utang dan amankan bukti akad atau tagihan.',
  'Hitung kebutuhan pokok serta kemampuan bayar nyata.',
  'Pisahkan pokok, DBO, dan bagian yang perlu diverifikasi.',
  'Hubungi kreditur resmi dengan proposal tertulis dan sopan.',
  'Pilih satu utang target dan hentikan sumber utang baru.',
  'Libatkan pasangan, keluarga, atau pendamping tepercaya bila dibutuhkan.',
  'Tinjau kemajuan, berdoa, dan lakukan evaluasi mingguan.',
];

const DEBT_COLLECTOR_SCRIPT = 'Terima kasih sudah menghubungi saya. Saya tidak menghindari kewajiban dan sedang menyusun penyelesaian. Mohon kirimkan identitas petugas, surat tugas, serta rincian tagihan melalui kanal resmi. Setelah saya verifikasi, saya akan menyampaikan proposal pembayaran tertulis sesuai kemampuan saya.';

const AZZAM_STEPS = [
  { title: 'Niat dan taubat', icon: 'heart-outline', points: ['Teguhkan niat melunasi utang karena Allah dan menjaga hak manusia.', 'Bertaubat dari pengeluaran berlebihan, transaksi tidak jelas, dan praktik yang mengandung riba.', 'Perbanyak doa agar diberi kecukupan dan dimudahkan melunasi kewajiban.'] },
  { title: 'Inventarisasi seluruh utang', icon: 'list-outline', points: ['Catat pemberi pinjaman, nominal pokok, jatuh tempo, cicilan, dan akad setiap utang.', 'Pisahkan utang bebas riba dari utang yang mengandung bunga atau denda.', 'Pastikan tidak ada kewajiban yang terlupa.'] },
  { title: 'Audit kemampuan keuangan', icon: 'calculator-outline', points: ['Catat pendapatan rutin dan tambahan.', 'Catat kebutuhan pokok yang wajar: makan, tempat tinggal, kesehatan, pendidikan, dan tanggungan.', 'Hentikan atau kurangi pengeluaran sekunder hingga utang lebih terkendali.'] },
  { title: 'Menentukan prioritas pembayaran', icon: 'arrow-up-circle-outline', points: ['Dahulukan utang jatuh tempo, mendesak, atau berisiko menzalimi hak orang lain.', 'Utamakan pelunasan utang kepada individu, terutama jika mereka membutuhkan.', 'Untuk utang berbunga, upayakan percepatan atau restrukturisasi tanpa mengambil utang baru berbunga.'] },
  { title: 'Menyusun anggaran pelunasan', icon: 'wallet-outline', points: ['Tentukan nominal pembayaran utang yang tetap setiap bulan.', 'Pisahkan dana cicilan segera setelah menerima penghasilan.', 'Jangan memakai dana pelunasan untuk kebutuhan konsumtif.'] },
  { title: 'Komunikasi jujur dengan pemberi utang', icon: 'chatbox-ellipses-outline', points: ['Sampaikan kondisi dan rencana pembayaran secara terbuka.', 'Minta keringanan, penjadwalan ulang, atau penghapusan denda bila memungkinkan.', 'Buat kesepakatan tertulis yang jelas dan adil bagi kedua pihak.'] },
  { title: 'Menambah ikhtiar halal', icon: 'trending-up-outline', points: ['Cari tambahan penghasilan halal: pekerjaan sampingan, jasa, perdagangan, atau menjual aset yang tidak penting.', 'Hindari cara cepat yang haram, spekulatif, penipuan, dan pinjaman baru berbunga.', 'Bila menerima rezeki tambahan, alokasikan sebagian besar untuk utang.'] },
  { title: 'Menjaga transaksi sesuai syariah', icon: 'shield-checkmark-outline', points: ['Hindari riba, gharar (ketidakjelasan), dan akad yang merugikan salah satu pihak.', 'Utamakan akad yang jelas, transparan, dan dicatat.', 'Bila perlu, konsultasikan restrukturisasi kepada pihak yang memahami fikih muamalah.'] },
  { title: 'Konsisten dan evaluasi bulanan', icon: 'calendar-outline', points: ['Tinjau sisa utang, pembayaran yang sudah dilakukan, serta pengeluaran setiap bulan.', 'Tingkatkan nominal pembayaran bila pendapatan bertambah.', 'Bersyukur atas setiap kemajuan, sekecil apa pun.'] },
  { title: 'Menjaga keberkahan', icon: 'sparkles-outline', points: ['Tunaikan ibadah, perbanyak istighfar, dan bersedekah sesuai kemampuan.', 'Jangan bersedekah sampai mengabaikan nafkah wajib atau utang yang telah jatuh tempo.', 'Jaga kejujuran, amanah, dan komitmen sampai seluruh utang selesai.'] },
] as const;

function DebtRepaymentScreen() {
  const theme = useAppStore((state) => state.theme);
  const colors = Colors[theme];
  const [prayerVisible, setPrayerVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0D638E', '#0B3457']} style={styles.hero}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color="#FFF" /></Pressable>
          <Ionicons name="wallet" size={42} color="#F6D77A" style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Debt Repayment Technique</Text>
          <Text style={styles.heroSubtitle}>Panduan praktis melunasi berbagai jenis utang dengan ikhtiar yang terarah.</Text>
        </LinearGradient>

        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>Materi edukasi umum, bukan fatwa atau nasihat hukum individual. Utamakan pelunasan pokok yang diakui, verifikasi akad, dan konsultasi kepada ahli syariah serta profesional berwenang untuk kasus khusus.</Text>
        </View>

        <View style={[styles.azzamCard, { backgroundColor: colors.card, borderColor: colors.gold + '70' }, Shadows.gold]}>
          <View style={styles.azzamHeader}>
            <View style={[styles.azzamIcon, { backgroundColor: colors.gold }]}><Ionicons name="ribbon-outline" size={22} color="#FFF" /></View>
            <View style={styles.azzamHeaderText}>
              <Text style={[styles.azzamTitle, { color: colors.text }]}>Azzam Penguatan Lunas Utang</Text>
              <Text style={[styles.azzamSubtitle, { color: colors.gold }]}>Niat, ikhtiar, amanah, dan keberkahan</Text>
            </View>
          </View>
          <Text style={[styles.azzamIntro, { color: colors.textSecondary }]}>Dengan menyebut nama Allah, kami berazam untuk melunasi seluruh utang dengan sungguh-sungguh, jujur, dan bertanggung jawab. Kami ingin menyelesaikan kewajiban ini dengan cara yang halal, baik, serta selaras dengan ketentuan syariah Islam. Kami berkomitmen menjaga amanah, tidak menunda pembayaran saat mampu, tidak menambah utang tanpa kebutuhan yang benar, dan terus berikhtiar sambil memohon pertolongan serta keberkahan dari Allah.</Text>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>Tahapan teknis</Text>
        {AZZAM_STEPS.map((step, index) => (
          <Section key={step.title} title={`${index + 1}. ${step.title}`} colors={colors} icon={step.icon as ComponentProps<typeof Ionicons>['name']}>
            {step.points.map((point) => <Bullet key={point} text={point} colors={colors} />)}
          </Section>
        ))}
        <View style={[styles.azzamClosing, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
          <Ionicons name="heart" size={20} color={colors.primary} />
          <Text style={[styles.azzamClosingText, { color: colors.textSecondary }]}>Semoga Allah mencukupkan rezeki, menjaga kehormatan, dan memudahkan pelunasan seluruh utang dengan jalan yang halal dan penuh keberkahan.</Text>
        </View>

        <Section title="1. Buat peta seluruh utang" colors={colors} icon="map-outline">
          <Text style={[styles.body, { color: colors.textSecondary }]}>LBU adalah ruang untuk melihat utang dengan jernih: tanpa menyangkal masalah, tanpa mempermalukan diri, dan tanpa mengambil jalan pintas yang merusak. Catat kreditur, sisa pokok, akad, kewajiban yang disepakati, DBO, jaminan, dan jatuh tempo.</Text>
          <View style={[styles.formula, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}><Text style={[styles.formulaText, { color: colors.primary }]}>Penghasilan bersih - kebutuhan pokok - cicilan minimum yang disepakati = dana akselerasi pelunasan</Text></View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Dahulukan makan, tempat tinggal, kesehatan, pendidikan dasar, dan biaya mencari nafkah. Pelunasan harus bertahan lama, bukan sekadar tampak cepat.</Text>
        </Section>

        <Section title="2. Hentikan utang baru" colors={colors} icon="stop-circle-outline">
          <Bullet text="Jeda paylater, kartu kredit, dan pinjaman baru untuk konsumsi." colors={colors} />
          <Bullet text="Utang baru hanya dipertimbangkan setelah ada perhitungan tertulis dan kebutuhan benar-benar mendesak." colors={colors} />
          <Bullet text="Pisahkan uang kebutuhan dasar dari dana pelunasan." colors={colors} />
          <Bullet text="Jangan membayar DBO yang belum jelas hanya karena tekanan; tetap komunikasikan penyelesaian pokok secara amanah." colors={colors} />
        </Section>

        <Section title="3. Audit DBO: Denda, Bunga, dan Ongkos Lain" colors={colors} icon="document-text-outline">
          <Text style={[styles.body, { color: colors.textSecondary }]}>Jangan langsung membayar komponen DBO yang belum jelas dasar akad, perhitungan, atau statusnya. Pisahkan pokok yang diakui, biaya yang sah dan terdokumentasi, serta komponen yang diperselisihkan. Minta rincian tertulis, lalu ajukan negosiasi, restrukturisasi, atau konsultasi ahli.</Text>
          <Bullet text="Minta rekening koran atau rincian tagihan: pokok, margin/bunga, denda, biaya admin, penagihan, dan biaya lain." colors={colors} />
          <Bullet text="Cocokkan dengan akad atau perjanjian. Jangan menyetujui nominal baru hanya melalui telepon." colors={colors} />
          <Bullet text="Nyatakan pokok yang diakui, minta penghapusan atau keringanan DBO, dan ajukan jadwal sesuai kemampuan." colors={colors} />
          <Bullet text="Bayarkan pokok atau angka kesepakatan hanya melalui kanal resmi; simpan bukti dan minta surat pelunasan." colors={colors} />
        </Section>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Pilih teknik utama</Text>
        {METHODS.map((method) => (
          <View key={method.title} style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
            <View style={[styles.methodIcon, { backgroundColor: method.color }]}><Ionicons name={method.icon} size={22} color="#FFF" /></View>
            <View style={styles.methodMain}><Text style={[styles.methodTitle, { color: colors.text }]}>{method.title}</Text><Text style={[styles.methodSubtitle, { color: method.color }]}>{method.subtitle}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{method.body}</Text></View>
          </View>
        ))}

        <Section title="5. Prioritaskan dengan amanah" colors={colors} icon="warning-outline">
          <Bullet text="Hubungi kreditur sebelum masalah membesar dan minta restrukturisasi tertulis." colors={colors} />
          <Bullet text="Pertahankan kebutuhan dasar dan biaya mencari nafkah." colors={colors} />
          <Bullet text="Prioritaskan pokok serta biaya sah yang sudah jelas dan disepakati." colors={colors} />
          <Bullet text="Jangan menghilang dari kreditur, tetapi jangan pula mengakui DBO yang belum diverifikasi." colors={colors} />
        </Section>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>6. Peta penanganan berdasarkan jenis utang</Text>
        {DEBT_GUIDE.map(([name, description]) => <View key={name} style={[styles.guideRow, { borderBottomColor: colors.border }]}><Text style={[styles.guideName, { color: colors.text }]}>{name}</Text><Text style={[styles.guideText, { color: colors.textSecondary }]}>{description}</Text></View>)}

        <Section title="7. Berhadapan dengan debt collector" colors={colors} icon="chatbox-ellipses-outline">
          <Text style={[styles.body, { color: colors.textSecondary }]}>Anda berhak diperlakukan secara manusiawi, dan tetap perlu amanah menyelesaikan kewajiban. Gunakan contoh respons tertulis berikut:</Text>
          <Text style={[{ borderLeftWidth: 3, borderLeftColor: '#C98B2E', paddingLeft: Spacing.md, marginVertical: Spacing.md, fontSize: FontSize.sm, lineHeight: 21, fontStyle: 'italic' }, { color: colors.primary }]}>{DEBT_COLLECTOR_SCRIPT}</Text>
          <Bullet text="Pastikan identitas, perusahaan, surat tugas, dan rincian tagihan sebelum berdiskusi lebih jauh." colors={colors} />
          <Bullet text="Jangan menyerahkan uang tunai atau mentransfer ke rekening pribadi. Simpan semua bukti." colors={colors} />
          <Bullet text="Jika ada ancaman, kekerasan, pemerasan, atau penyebaran data pribadi, utamakan keselamatan dan cari bantuan berwenang." colors={colors} />
          <Pressable onPress={() => Linking.openURL('https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Tindak-Praktik-Penagihan-Melanggar-Hukum-dan-Panggil-Indosaku.aspx')}><Text style={[{ fontSize: FontSize.sm, fontWeight: '800', marginTop: Spacing.sm }, { color: colors.primary }]}>Baca penegasan OJK</Text></Pressable>
        </Section>

        <Section title="8. Checklist dan rencana aksi 7 hari" colors={colors} icon="checkmark-done-outline">
          {CHECKLIST.map((item) => <View key={item} style={styles.checkRow}><Ionicons name="checkmark-circle-outline" size={19} color={colors.success} /><Text style={[styles.body, { color: colors.textSecondary }]}>{item}</Text></View>)}
          {WEEK_PLAN.map((item, index) => <View key={item} style={styles.checkRow}><Text style={[{ width: 22, fontSize: FontSize.md, fontWeight: '900', textAlign: 'center' }, { color: colors.primary }]}>{index + 1}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{item}</Text></View>)}
        </Section>

        <View style={[styles.disclaimer, { backgroundColor: colors.gold + '18' }]}><Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>Langkah Bebas Utang - NASUHA. Materi edukasi umum, bukan fatwa atau nasihat hukum individual. Untuk akad, sengketa, atau restrukturisasi spesifik, mintalah pendampingan ahli syariah dan profesional yang berwenang.</Text></View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {prayerVisible && <View style={[styles.prayerCard, { backgroundColor: colors.card, borderColor: colors.gold }]}><View style={styles.prayerHeader}><Ionicons name="heart" size={22} color={colors.gold} /><Text style={[styles.prayerTitle, { color: colors.text }]}>Doa kelapangan utang</Text><Pressable onPress={() => setPrayerVisible(false)} hitSlop={8}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable></View><Text style={[styles.arabic, { color: colors.text }]}>اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ</Text><Text style={[styles.translation, { color: colors.textSecondary }]}>“Ya Allah, cukupkanlah aku dengan yang halal dari-Mu sehingga aku tidak membutuhkan yang haram, dan cukupkanlah aku dengan karunia-Mu sehingga aku tidak membutuhkan selain-Mu.”</Text><Text style={[styles.prayerHope, { color: colors.primary }]}>Semoga Allah SWT mudahkan ikhtiar, melapangkan rezeki, dan membantu melunasi seluruh utang dengan cara yang baik.</Text></View>}
      <Pressable onPress={() => setPrayerVisible((current) => !current)} style={styles.fab} accessibilityRole="button"><Ionicons name="sparkles" size={20} color="#FFF" /><Text style={styles.fabText}>Siap Lunas Utang...!</Text></Pressable>
    </View>
  );
}

function Section({ title, icon, colors, children }: { title: string; icon: ComponentProps<typeof Ionicons>['name']; colors: typeof Colors.light; children: ReactNode }) {
  return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.sectionTitleRow}><Ionicons name={icon} size={21} color={colors.primary} /><Text style={[styles.sectionHeading, { color: colors.text }]}>{title}</Text></View>{children}</View>;
}

function Bullet({ text, colors }: { text: string; colors: typeof Colors.light }) { return <View style={styles.bullet}><Ionicons name="checkmark" size={17} color={colors.success} /><Text style={[styles.body, { color: colors.textSecondary }]}>{text}</Text></View>; }

export default memo(DebtRepaymentScreen);

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: Spacing.lg },
  hero: { borderRadius: BorderRadius.xl, padding: Spacing.lg, minHeight: 210, justifyContent: 'center', overflow: 'hidden' }, heroIcon: { marginTop: 24 }, heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 10 }, heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: FontSize.md, lineHeight: 21, marginTop: 5 },
  notice: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginTop: Spacing.md }, noticeText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  azzamCard: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, marginTop: Spacing.lg }, azzamHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, azzamIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, azzamHeaderText: { flex: 1 }, azzamTitle: { fontSize: FontSize.lg, fontWeight: '900' }, azzamSubtitle: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 3 }, azzamIntro: { fontSize: FontSize.sm, lineHeight: 21, marginTop: Spacing.md }, azzamClosing: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginTop: Spacing.md }, azzamClosingText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20, fontWeight: '600' },
  section: { padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginTop: Spacing.md }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 0 }, sectionHeading: { fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.lg, marginBottom: Spacing.sm }, body: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 }, formula: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginVertical: Spacing.sm }, formulaText: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center', lineHeight: 20 }, bullet: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', marginBottom: 8 }, methodCard: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm }, methodIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, methodMain: { flex: 1 }, methodTitle: { fontSize: FontSize.md, fontWeight: '800' }, methodSubtitle: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 2, marginBottom: 4 }, guideRow: { paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth }, guideName: { fontSize: FontSize.sm, fontWeight: '800' }, guideText: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 2 }, checkRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 8, alignItems: 'flex-start' }, disclaimer: { padding: Spacing.md, borderRadius: BorderRadius.lg, marginTop: Spacing.md }, disclaimerText: { fontSize: FontSize.sm, lineHeight: 20 }, prayerCard: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: 86, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5, ...Shadows.md }, prayerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, prayerTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800' }, arabic: { fontSize: 22, lineHeight: 38, textAlign: 'right', marginTop: Spacing.md }, translation: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm }, prayerHope: { fontSize: FontSize.sm, lineHeight: 20, fontWeight: '800', marginTop: Spacing.sm }, fab: { position: 'absolute', right: Spacing.lg, bottom: 22, minHeight: 54, paddingHorizontal: 18, borderRadius: 28, backgroundColor: '#0D638E', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#F6D77A', ...Shadows.md }, fabText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '900' },
});
