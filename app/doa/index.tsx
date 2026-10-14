import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { memo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { DOAS as COMPLETE_DOAS, type DoaEntry } from '../../constants/doa';
import { BorderRadius, Colors, FontSize, Spacing } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';

const DZIKIR_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'pagi', label: 'Dzikir Pagi' },
  { id: 'petang', label: 'Dzikir Petang' },
] as const;

const DZIKIR_PAGI = [
  'Niat: berdzikir kepada Allah, memohon perlindungan, ampunan, keberkahan, kesehatan, rezeki halal, keteguhan iman, dan kebaikan sepanjang hari.',
  'Istighfar — 3x: أَسْتَغْفِرُ اللهَ (Astaghfirullah).',
  'Sayyidul Istighfar — 1x.',
  'Ayat Kursi — 1x.',
  'Al-Ikhlas — 3x.',
  'Al-Falaq — 3x.',
  'An-Nas — 3x.',
  'Dzikir Perlindungan — 3x.',
  'Dzikir Ridha kepada Allah — 3x.',
  'Dzikir Tauhid — 10x.',
  'Tasbih — 100x.',
  'Tasbih, Tahmid & Takbir — 33x masing-masing.',
  'Shalawat Nabi ﷺ — sesuai kemampuan.',
  'Doa memohon kebaikan hari ini.',
  'Doa memohon ilmu, rezeki & amal.',
  'Doa memohon kebaikan dunia & akhirat.',
  'Doa keteguhan hati.',
  'Doa perlindungan dari kesulitan.',
  'Doa rezeki yang halal.',
  'Doa untuk orang tua.',
  'Doa untuk keluarga.',
];

const DZIKIR_PETANG = [
  {
    title: 'DZIKIR PETANG',
    text: '1. Niat',
    arabic: 'نَوَيْتُ الذِّكْرَ وَالدُّعَاءَ لِلَّهِ تَعَالَى',
    latin: 'Aku berniat berdzikir dan berdoa kepada Allah Ta’ala.',
    meaning:'Tidak ada lafaz niat khusus yang diwajibkan. Yang terpenting adalah menghadirkan hati untuk mengingat Allah.',
  },
  {
    title: '2. Istighfar',
    text: 'أَسْتَغْفِرُ اللهَ',
    latin: 'Astaghfirullah',
    meaning: '“Aku memohon ampun kepada Allah.” Baca 3× atau sebanyak yang mampu.',
  },
  {
    title: 'Ayat Istighfar',
    text: 'أَسْتَغْفِرُ اللهَ الَّذِي لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    latin: 'Astaghfirullaahalladzii laa ilaaha illaa huwal-hayyul-qayyuumu wa atuubu ilaih.',
    meaning: '“Aku memohon ampun kepada Allah, yang tidak ada Tuhan selain Dia, Yang Mahahidup dan Yang terus-menerus mengurus makhluk-Nya, dan aku bertaubat kepada-Nya.”',
  },
  {
    title: '3. Ayat Kursi — 1x',
    text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    meaning: 'Makna ringkas: Allah adalah satu-satunya Tuhan, Mahahidup dan Mahamengurus segala sesuatu. Kekuasaan dan ilmu-Nya meliputi langit dan bumi.',
  },
  {
    title: '4. Membaca Al-Ikhlas, Al-Falaq & An-Nas',
    text: 'QS. Al-Ikhlas\nقُلْ هُوَ اللَّهُ أَحَدٌ\nاللَّهُ الصَّمَدُ\nلَمْ يَلِدْ وَلَمْ يُولَدْ\nوَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ\n\nQS. Al-Falaq\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ\nمِنْ شَرِّ مَا خَلَقَ\nوَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ\nوَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ\nوَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ\n\nQS. An-Nas\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ\nمَلِكِ النَّاسِ\nإِلَٰهِ النَّاسِ\nمِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ\nالَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ\nمِنَ الْجِنَّةِ وَالنَّاسِ',
    meaning: 'Masing-masing dibaca 3x.',
  },
  {
    title: '5. Sayyidul Istighfar — 1x',
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    latin: 'Allahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana ‘abduka, wa ana ‘alaa ‘ahdika wa wa’dika mastatha’tu, a’uudzu bika min syarri maa shana’tu, abuu-u laka bini’matika ‘alayya, wa abuu-u laka bidzanbii, faghfir lii fa innahu laa yaghfirudz-dzunuuba illaa anta.',
    meaning: '“Ya Allah, Engkau adalah Rabbku… Maka ampunilah aku. Sesungguhnya tidak ada yang dapat mengampuni dosa kecuali Engkau.”',
  },
  {
    title: '6. Dzikir Perlindungan',
    text: 'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    latin: 'Bismillaahil-ladzii laa yadhurru ma’asmihii syai’un fil-ardhi wa laa fis-samaa’i wa huwas-samii’ul-‘aliim.',
    meaning: '“Dengan nama Allah, yang dengan nama-Nya tidak ada sesuatu pun di bumi maupun di langit yang dapat membahayakan. Dia Maha Mendengar lagi Maha Mengetahui.” 3×',
  },
  {
    title: '7. Ridha kepada Allah, Islam dan Nabi ﷺ',
    text: 'رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا',
    latin: 'Radhiitu billaahi rabban, wa bil-islaami diinan, wa bi Muhammadin ﷺ nabiyyan.',
    meaning: '“Aku ridha Allah sebagai Rabbku, Islam sebagai agamaku, dan Muhammad ﷺ sebagai nabiku.” 3×',
  },
  {
    title: '8. Dzikir Tauhid',
    text: 'لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    latin: 'Laa ilaaha illallaahu wahdahuu laa syariikalah, lahul-mulku wa lahul-hamdu wa huwa ‘alaa kulli syai’in qadiir.',
    meaning: '“Tidak ada Tuhan yang berhak disembah selain Allah semata, tidak ada sekutu bagi-Nya. Milik-Nya seluruh kerajaan dan segala pujian. Dia Mahakuasa atas segala sesuatu.”',
  },
  {
    title: '9. Tasbih, Tahmid & Takbir',
    text: 'سُبْحَانَ اللهِ\nالْحَمْدُ لِلَّهِ\nاللهُ أَكْبَرُ',
    latin: 'Subhanallah • Alhamdulillah • Allahu Akbar',
    meaning: 'Dapat dibaca masing-masing 33×, atau sesuai kemampuan.',
  },
  {
    title: '10. Dzikir dengan Kalimat yang Sangat Agung',
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    latin: 'Subhaanallaahi wa bihamdih.',
    meaning: '“Maha Suci Allah dan segala puji bagi-Nya.” 100× jika mampu.',
  },
  {
    title: '11. Shalawat kepada Nabi ﷺ',
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى مُحَمَّدٍ',
    latin: 'Allahumma shalli wa sallim wa baarik ‘alaa Muhammad.',
    meaning: '“Ya Allah, limpahkanlah shalawat, keselamatan dan keberkahan kepada Nabi Muhammad.”',
  },
  {
    title: '12. Doa Memohon Kebaikan Dunia dan Akhirat',
    text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ',
    latin: 'Rabbanaa aatinaa fid-dunyaa hasanatan wa fil-aakhirati hasanatan wa qinaa ‘adzaaban-naar.',
    meaning: '“Ya Rabb kami, berikanlah kepada kami kebaikan di dunia dan kebaikan di akhirat serta lindungilah kami dari azab neraka.”',
  },
  {
    title: '13. Doa Memohon Keteguhan Hati',
    text: 'يَا مُقَلِّبَ الْقُلُوبِ، ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    latin: 'Yaa muqallibal-quluub, tsabbit qalbii ‘alaa diinika.',
    meaning: '“Wahai Dzat yang membolak-balikkan hati, teguhkanlah hatiku di atas agama-Mu.”',
  },
  {
    title: '14. Doa Memohon Ilmu, Rezeki dan Amal',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    latin: 'Allahumma innii as’aluka ‘ilman naafi’an, wa rizqan thayyiban, wa ‘amalan mutaqabbalan.',
    meaning: '“Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik dan amal yang diterima.”',
  },
  {
    title: '15. Doa Perlindungan dari Kesulitan',
    text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    latin: 'Allahumma innii a’uudzu bika minal-hammi wal-hazan, wa a’uudzu bika minal-‘ajzi wal-kasal, wa a’uudzu bika minal-jubni wal-bukhl, wa a’uudzu bika min ghalabatid-daini wa qahrir-rijaal.',
    meaning: '“Ya Allah, aku berlindung kepada-Mu dari kegelisahan dan kesedihan, dari kelemahan dan kemalasan, dari sifat pengecut dan kikir, serta dari lilitan utang dan tekanan manusia.”',
  },
  {
    title: '16. Doa Memohon Ampunan',
    text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    latin: 'Rabbighfir lii wa tub ‘alayya innaka antat-tawwaabur-rahiim.',
    meaning: '“Ya Rabb, ampunilah aku dan terimalah taubatku. Sesungguhnya Engkau Maha Penerima Taubat lagi Maha Penyayang.”',
  },
  {
    title: '17. Doa untuk Orang Tua',
    text: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    latin: 'Rabbighfir lii wa liwaalidayya warhamhumaa kamaa rabbayaanii shaghiiraa.',
    meaning: '“Ya Rabb, ampunilah aku dan kedua orang tuaku serta sayangilah mereka sebagaimana mereka menyayangiku ketika aku masih kecil.”',
  },
  {
    title: '18. Doa untuk Keluarga',
    text: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    latin: 'Rabbanaa hab lanaa min azwaajinaa wa dzurriyyaatinaa qurrata a’yun, waj’alnaa lil-muttaqiina imaamaa.',
    meaning: '“Ya Rabb kami, anugerahkanlah kepada kami pasangan dan keturunan yang menjadi penyejuk mata, dan jadikanlah kami pemimpin bagi orang-orang yang bertakwa.”',
  },
  {
    title: '19. Doa Rezeki Halal dan Keberkahan',
    text: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
    latin: 'Allahummakfinii bihalaalika ‘an haraamika, wa aghninii bifadhlika ‘amman siwaak.',
    meaning: '“Ya Allah, cukupkanlah aku dengan yang halal sehingga aku tidak membutuhkan yang haram, dan cukupkanlah aku dengan karunia-Mu sehingga aku tidak membutuhkan selain-Mu.”',
  },
  {
    title: '20. Doa Penutup Dzikir Petang',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ، وَأَعُوذُ بِكَ مِنْ سَخَطِكَ وَالنَّارِ',
    latin: 'Allahumma innii as’aluka ridhaaka wal-jannah, wa a’uudzu bika min sakhatika wan-naar.',
    meaning: '“Ya Allah, aku memohon ridha-Mu dan surga, dan aku berlindung kepada-Mu dari kemurkaan-Mu dan neraka.”',
  },
  {
    title: 'Penutup',
    text: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ',
    latin: 'Subhaanaka Allahumma wa bihamdik, asyhadu an laa ilaaha illaa ant, astaghfiruka wa atuubu ilaik.',
    meaning: '“Mahasuci Engkau ya Allah dan segala puji bagi-Mu. Aku bersaksi bahwa tidak ada Tuhan selain Engkau. Aku memohon ampun kepada-Mu dan bertaubat kepada-Mu.”',
  },
];

function DoaScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const scrollRef = useRef<ScrollView>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pagi' | 'petang'>('all');
  const [isListMode, setIsListMode] = useState(false);

  const handleTabChange = (tab: 'all' | 'pagi' | 'petang') => {
    setSelectedTab(tab);
    setIsListMode(false);
  };

  const handleShowOtherDoa = () => {
    setIsListMode(true);
    setSelectedTab('all');
    scrollRef.current?.scrollTo({ y: 1200, animated: true });
  };

  const handleShowDzikir = () => {
    setIsListMode(false);
    setSelectedTab('all');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.title, { color: colors.text }]}>Doa Harian</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Doa pilihan untuk menemani ikhtiar</Text>
        </View>

        <Ionicons name="book-outline" size={24} color={colors.primary} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.text }]}>Baca dengan memahami makna dan sertai doa dengan ikhtiar yang baik.</Text>
        </View>

        <View style={styles.ribbonWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonContent}>
            {DZIKIR_TABS.map((tab) => {
              const isActive = selectedTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => handleTabChange(tab.id)}
                  style={[styles.ribbonButton, { backgroundColor: isActive ? colors.primary : colors.card, borderColor: isActive ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.ribbonText, { color: isActive ? '#FFF' : colors.text }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {!isListMode && (selectedTab === 'all' || selectedTab === 'pagi') ? (
          <View style={[styles.dzikirPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dzikirTitle, { color: colors.text }]}>DZIKIR PAGI</Text>
            <Text style={[styles.dzikirIntro, { color: colors.textSecondary }]}>Niat: berdzikir kepada Allah, memohon perlindungan, ampunan, keberkahan, kesehatan, rezeki halal, keteguhan iman, dan kebaikan sepanjang hari.</Text>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>1. Istighfar — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>أَسْتَغْفِرُ اللهَ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Astaghfirullah</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Aku memohon ampun kepada Allah.” Baca 3×.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>2. Sayyidul Istighfar — 1×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ أَنْتَ رَبِّي لَا إِلٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana ‘abduka, wa ana ‘alaa ‘ahdika wa wa’dika mastatha’tu, a’uudzu bika min syarri maa shana’tu, abuu-u laka bini’matika ‘alayya, wa abuu-u laka bidzanbii, faghfir lii fa innahu laa yaghfirudz-dzunuuba illaa anta.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, Engkau adalah Rabbku… Maka ampunilah aku. Sesungguhnya tidak ada yang dapat mengampuni dosa kecuali Engkau.”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>3. Ayat Kursi — 1×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>QS. Al-Baqarah: 255. Makna utama: mengagungkan Allah sebagai satu-satunya Tuhan, Yang Mahahidup, Mahakuasa dan Maha Mengetahui.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>4. Al-Ikhlas — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>Qul huwallahu ahad... Baca 3×.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>5. Al-Falaq — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>Baca 3×.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>6. An-Nas — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>Baca 3×. Makna tiga surah ini: mohon perlindungan Allah dari keburukan makhluk, hasad, bisikan setan, serta berbagai bahaya yang dapat merusak kehidupan.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>7. Dzikir Perlindungan — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Bismillaahil-ladzii laa yadhurru ma’asmihii syai’un fil-ardhi wa laa fis-samaa’i wa huwas-samii’ul-‘aliim.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Dengan nama Allah… Dia Maha Mendengar lagi Maha Mengetahui.” 3×</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>8. Dzikir Ridha kepada Allah — 3×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Radhiitu billaahi rabban, wa bil-islaami diinan, wa bi Muhammadin nabiyyan.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Aku ridha Allah sebagai Rabbku, Islam sebagai agamaku dan Muhammad ﷺ sebagai Nabiku.” 3×</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>9. Dzikir Tauhid — 10×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Laa ilaaha illallaahu wahdahuu laa syariikalah, lahul-mulku wa lahul-hamdu wa huwa ‘alaa kulli syai’in qadiir.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Tidak ada Tuhan yang berhak disembah selain Allah semata…” 10×</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>10. Tasbih — 100×</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>سُبْحَانَ اللهِ وَبِحَمْدِهِ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Subhaanallaahi wa bihamdih.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Maha Suci Allah dan segala puji bagi-Nya.” 100× jika mampu.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>11. Tasbih, Tahmid & Takbir</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>سُبْحَانَ اللهِ • الْحَمْدُ لِلَّهِ • اللهُ أَكْبَرُ</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>Subhanallah — 33× • Alhamdulillah — 33× • Allahu Akbar — 33×. Bisa dijadikan rangkaian dzikir, bukan kewajiban tiap pagi.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>12. Shalawat Nabi ﷺ</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى مُحَمَّدٍ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahumma shalli wa sallim wa baarik ‘alaa Muhammad.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, limpahkanlah shalawat, keselamatan dan keberkahan kepada Nabi Muhammad ﷺ.” Baca sebanyak yang mampu.</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>13. Doa Memohon Kebaikan Hari Ini</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ، فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahumma innii as’aluka khaira haadzal-yaum, fat-hahu wa nashrahu wa nuurahu wa barakatahu wa hudaahu.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, aku memohon kepada-Mu kebaikan hari ini…”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>14. Doa Memohon Ilmu, Rezeki & Amal</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahumma innii as’aluka ‘ilman naafi’an, wa rizqan thayyiban, wa ‘amalan mutaqabbalan.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik dan amal yang diterima.”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>15. Doa Memohon Kebaikan Dunia & Akhirat</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Rabbanaa aatinaa fid-dunyaa hasanatan wa fil-aakhirati hasanatan wa qinaa ‘adzaaban-naar.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Rabb kami, berikanlah kepada kami kebaikan di dunia dan kebaikan di akhirat serta lindungilah kami dari azab neraka.”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>16. Doa Keteguhan Hati</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>يَا مُقَلِّبَ الْقُلُوبِ، ثَبِّتْ قَلْبِي عَلَى دِينِكَ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Yaa muqallibal-quluub, tsabbit qalbii ‘alaa diinika.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Wahai Dzat yang membolak-balikkan hati, teguhkanlah hatiku di atas agama-Mu.”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>17. Doa Perlindungan dari Kesulitan</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahumma innii a’uudzu bika minal-hammi wal-hazan, wa a’uudzu bika minal-‘ajzi wal-kasal, wa a’uudzu bika minal-jubni wal-bukhl, wa a’uudzu bika min ghalabatid-daini wa qahrir-rijaal.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, aku berlindung kepada-Mu dari kegelisahan dan kesedihan…”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>18. Doa Rezeki yang Halal</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Allahummakfinii bihalaalika ‘an haraamika, wa aghninii bifadhlika ‘amman siwaak.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Allah, cukupkanlah aku dengan yang halal … dan cukupkanlah aku dengan karunia-Mu sehingga aku tidak membutuhkan selain-Mu.”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>19. Doa untuk Orang Tua</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Rabbighfir lii wa liwaalidayya warhamhumaa kamaa rabbayaanii shaghiiraa.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Rabb, ampunilah aku dan kedua orang tuaku…”</Text>
            </View>

            <View style={styles.dzikirItemBlock}>
              <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>20. Doa untuk Keluarga</Text>
              <Text style={[styles.dzikirArabic, { color: colors.text }]}>رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا</Text>
              <Text style={[styles.dzikirLatin, { color: colors.primary }]}>Rabbanaa hab lanaa min azwaajinaa wa dzurriyyaatinaa qurrata a’yun, waj’alnaa lil-muttaqiina imaamaa.</Text>
              <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>“Ya Rabb kami, anugerahkanlah kepada kami pasangan dan keturunan yang menjadi penyejuk mata…”</Text>
            </View>
          </View>
        ) : null}

        {!isListMode && (selectedTab === 'all' || selectedTab === 'petang') ? (
          <View style={[styles.dzikirPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dzikirTitle, { color: colors.text }]}>DZIKIR PETANG</Text>
            {DZIKIR_PETANG.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.dzikirItemBlock}>
                <Text style={[styles.dzikirBlockTitle, { color: colors.text }]}>{item.title}</Text>
                {item.text && <Text style={[styles.dzikirArabic, { color: colors.text }]}>{item.text}</Text>}
                {item.latin && <Text style={[styles.dzikirLatin, { color: colors.primary }]}>{item.latin}</Text>}
                {item.meaning && <Text style={[styles.dzikirMeaning, { color: colors.textSecondary }]}>{item.meaning}</Text>}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Doa terkait utang</Text>
        <Text style={[styles.countText, { color: colors.textMuted }]}>{COMPLETE_DOAS.length} doa tersusun dalam pustaka tematik</Text>
        {COMPLETE_DOAS.filter((item) => item.debt).map((item) => (
          <DoaCard key={item.id} item={item} colors={colors} />
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Doa harian</Text>
        {COMPLETE_DOAS.filter((item) => !item.debt).map((item) => (
          <DoaCard key={item.id} item={item} colors={colors} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {!isListMode ? (
        <Pressable
          onPress={handleShowOtherDoa}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="sparkles-outline" size={18} color="#FFF" />
          <Text style={styles.fabText}>Doa Lainnya</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleShowDzikir}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="sunny-outline" size={18} color="#FFF" />
          <Text style={styles.fabText}>Dzikir Pagi & Petang</Text>
        </Pressable>
      )}
    </View>
  );
}

function DoaCard({ item, colors }: { item: DoaEntry; colors: typeof Colors.light }) {
  const handleCopy = async () => {
    const text = [
      item.title,
      item.arabic || '',
      item.latin || '',
      item.meaning,
      item.source ? `Sumber: ${item.source}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    await Clipboard.setStringAsync(text);
    Alert.alert('Tersalin', 'Teks doa berhasil disalin ke clipboard.');
  };

  const handleShare = async () => {
    const text = [
      item.title,
      item.arabic || '',
      item.latin || '',
      item.meaning,
      item.source ? `Sumber: ${item.source}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('Gagal', 'Tidak dapat membagikan doa saat ini.');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.debt ? colors.gold : colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.number, { backgroundColor: item.debt ? colors.gold : colors.primary }]}>
          <Text style={styles.numberText}>{item.id}</Text>
        </View>

        <View style={[styles.icon, { backgroundColor: item.debt ? colors.gold + '20' : colors.primary + '15' }]}>
          <Ionicons name={item.icon as any} size={19} color={item.debt ? colors.gold : colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.category, { color: item.debt ? colors.gold : colors.primary }]}>{item.category}</Text>
        </View>

        {item.debt && <Text style={[styles.badge, { color: colors.gold }]}>UTANG</Text>}
      </View>

      {item.arabic && <Text style={[styles.arabic, { color: colors.text }]}>{item.arabic}</Text>}
      {item.latin && <Text style={[styles.latin, { color: colors.primary }]}>{item.latin}</Text>}
      <Text style={[styles.meaning, { color: colors.textSecondary }]}>{item.meaning}</Text>
      {item.source && <Text style={[styles.source, { color: colors.textMuted }]}>Sumber: {item.source}</Text>}

      <View style={styles.actionRow}>
        <Pressable onPress={handleCopy} style={[styles.actionButton, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
          <Ionicons name="copy-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Salin</Text>
        </Pressable>

        <Pressable onPress={handleShare} style={[styles.actionButton, { backgroundColor: colors.gold + '18', borderColor: colors.gold + '35' }]}>
          <Ionicons name="share-social-outline" size={16} color={colors.gold} />
          <Text style={[styles.actionText, { color: colors.gold }]}>Bagikan</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(DoaScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  introText: { flex: 1, fontSize: FontSize.sm, lineHeight: 19 },
  ribbonWrap: { marginBottom: Spacing.md },
  ribbonContent: { gap: Spacing.sm, paddingRight: Spacing.xs },
  ribbonButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  ribbonText: { fontSize: FontSize.sm, fontWeight: '700' },
  dzikirPanel: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  dzikirTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.md, textAlign: 'center' },
  dzikirIntro: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md, textAlign: 'justify' },
  dzikirRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dzikirIndex: { fontSize: FontSize.md, fontWeight: '700', minWidth: 22 },
  dzikirItem: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  dzikirItemBlock: { marginBottom: Spacing.md },
  dzikirBlockTitle: { fontSize: FontSize.md, fontWeight: '800', marginBottom: 6, textAlign: 'left' },
  dzikirArabic: { fontSize: 28, lineHeight: 42, textAlign: 'right', marginBottom: 6, fontFamily: 'Lateef-Regular' },
  dzikirLatin: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: 6, fontStyle: 'italic', textAlign: 'left' },
  dzikirMeaning: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'justify' },
  countText: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  card: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  number: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '800' },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800' },
  category: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  badge: { fontSize: 10, fontWeight: '900' },
  arabic: { fontSize: 25, lineHeight: 45, textAlign: 'right', marginTop: Spacing.md, fontFamily: 'Lateef-Regular' },
  latin: { fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 20, marginTop: Spacing.sm },
  meaning: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.xs },
  source: { fontSize: FontSize.xs, marginTop: Spacing.sm, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  actionText: { fontSize: FontSize.sm, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  fabText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
});
