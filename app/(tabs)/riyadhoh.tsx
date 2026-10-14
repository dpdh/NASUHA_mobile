import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { RIYADHOH_ITEMS } from '../../constants/data';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';

interface RiyadhohRow { id: string; name: string; icon: string; done: boolean; rakaat?: number; prayer: string; }
interface ProgressSummary { done: number; target: number; pct: number; activeDays: number; }

const PRAYER_MESSAGES = [
  'Semoga sahabatku selalu istiqamah beribadah.', 'Semoga Allah menjaga hatimu dalam ketaatan.', 'Semoga ibadahmu selalu diterima Allah SWT.',
  'Semoga Allah menambah keikhlasan dalam setiap amalmu.', 'Semoga salatmu menjadi cahaya dalam hidupmu.', 'Semoga hatimu selalu dekat dengan Allah.',
  'Semoga Allah memudahkan langkahmu menuju kebaikan.', 'Semoga sahabatku senantiasa rajin beribadah.', 'Semoga Allah menguatkan imanmu setiap hari.',
  'Semoga Allah menjaga istiqamahmu hingga akhir hayat.', 'Semoga setiap sujudmu membawa ketenangan.', 'Semoga doamu selalu didengar dan dikabulkan Allah.',
  'Semoga Allah melapangkan dadamu dalam beribadah.', 'Semoga hari-harimu dipenuhi keberkahan.', 'Semoga Allah menjadikanmu hamba yang dicintai-Nya.',
  'Semoga Al-Qur’an selalu menjadi penuntun hidupmu.', 'Semoga Allah menjauhkanmu dari rasa malas beribadah.', 'Semoga imanmu selalu tumbuh dan menguat.',
  'Semoga Allah memberi keteguhan pada hatimu.', 'Semoga amal baikmu menjadi bekal akhirat.', 'Semoga Allah menerima setiap kebaikanmu.',
  'Semoga Allah memberi nikmat khusyuk dalam salat.', 'Semoga sahabatku selalu mencintai ketaatan.', 'Semoga Allah menjaga lisan dan perilakumu.',
  'Semoga Allah memberimu hati yang lembut.', 'Semoga Allah menerangi jalan hidupmu.', 'Semoga ibadahmu membawa damai bagi jiwamu.',
  'Semoga Allah memberkahi setiap waktumu.', 'Semoga Allah mengampuni segala khilafmu.', 'Semoga Allah menjadikanmu pribadi yang sabar.',
  'Semoga Allah membimbingmu dalam setiap pilihan.', 'Semoga kebaikan selalu mengiringi langkahmu.', 'Semoga Allah melindungimu dari godaan yang melemahkan iman.',
  'Semoga engkau selalu diberi kesempatan untuk bertaubat.', 'Semoga Allah menguatkanmu saat menghadapi ujian.', 'Semoga hatimu selalu dipenuhi rasa syukur.',
  'Semoga Allah menjadikanmu teladan dalam kebaikan.', 'Semoga setiap dzikirmu menenangkan hati.', 'Semoga Allah memberimu rezeki yang halal dan berkah.',
  'Semoga sedekahmu menjadi pemberat amal baikmu.', 'Semoga Allah menjadikanmu hamba yang rendah hati.', 'Semoga Allah mencukupkan segala kebutuhanmu.',
  'Semoga Allah memperindah akhlakmu.', 'Semoga Allah menjaga keluargamu dalam kebaikan.', 'Semoga Allah mempertemukanmu dengan sahabat-sahabat saleh.',
  'Semoga Allah memberkahi ilmu yang kamu pelajari.', 'Semoga Allah memudahkanmu mengamalkan ilmu.', 'Semoga hidupmu selalu berada dalam lindungan Allah.',
  'Semoga Allah mengangkat derajatmu melalui ibadah.', 'Semoga Allah memberi kelapangan dalam setiap urusanmu.', 'Semoga sahabatku menjadi semakin dekat kepada Allah.',
  'Semoga Allah memberi kekuatan untuk bangun di sepertiga malam.', 'Semoga puasa dan ibadahmu diterima dengan sempurna.', 'Semoga Allah menjadikanmu pribadi yang penuh kasih.',
  'Semoga Allah memberikanmu hati yang damai.', 'Semoga setiap langkahmu bernilai ibadah.', 'Semoga Allah menjagamu dalam kesendirian maupun keramaian.',
  'Semoga Allah memudahkanmu untuk selalu berbuat baik.', 'Semoga Allah menjadikanmu pembawa manfaat bagi sesama.', 'Semoga Allah memberi kesabaran dalam setiap proses.',
  'Semoga Allah mengganti lelahmu dengan pahala yang berlipat.', 'Semoga Allah memberi kemudahan setelah setiap kesulitan.', 'Semoga Allah menjaga niat baikmu.',
  'Semoga Allah menerima taubatmu dengan penuh kasih sayang.', 'Semoga Allah menuntunmu menuju jalan yang lurus.', 'Semoga Allah melindungimu dari hati yang lalai.',
  'Semoga Allah memenuhi hidupmu dengan rahmat-Nya.', 'Semoga Allah menjadikanmu ahli dzikir dan ahli syukur.', 'Semoga Allah membalas ketulusanmu dengan kebaikan.',
  'Semoga Allah memberimu akhir hidup yang husnul khatimah.', 'Semoga Allah menyatukan kita dalam persahabatan karena-Nya.', 'Semoga persahabatan kita selalu membawa kebaikan.',
  'Semoga Allah menjadikan kita saling menguatkan dalam iman.', 'Semoga Allah menjaga kita dari perbuatan dosa.', 'Semoga Allah memperbanyak amal salehmu.',
  'Semoga Allah menjadikan ibadahmu sumber kebahagiaan.', 'Semoga Allah melimpahkan kesehatan untuk terus beribadah.', 'Semoga Allah memberi umur yang penuh manfaat.',
  'Semoga Allah menjadikanmu orang yang dicintai banyak kebaikan.', 'Semoga Allah meluaskan rezeki dan keberkahanmu.', 'Semoga Allah mengisi hatimu dengan cinta kepada-Nya.',
  'Semoga Allah menjadikanmu kuat dalam menjaga prinsip.', 'Semoga Allah menguatkanmu untuk meninggalkan keburukan.', 'Semoga Allah menenangkanmu saat hati sedang gelisah.',
  'Semoga Allah membukakan pintu kebaikan untukmu.', 'Semoga Allah mengangkat segala kesedihanmu.', 'Semoga Allah memberimu kebahagiaan dunia dan akhirat.',
  'Semoga Allah menempatkanmu di antara hamba pilihan-Nya.', 'Semoga Allah mempertemukanmu dengan rahmat dan ampunan-Nya.', 'Semoga Allah menjadikan rumahmu penuh keberkahan.',
  'Semoga Allah mengabulkan cita-cita baikmu.', 'Semoga Allah membalas semua kebaikanmu.', 'Semoga Allah memberi keteguhan hingga akhir perjalanan.',
  'Semoga Allah menjadikanmu penghuni surga-Nya.', 'Semoga Allah mempertemukan kita kembali di surga.', 'Semoga Allah menerima setiap niat baikmu.',
  'Semoga Allah menjaga senyummu dalam ketaatan.', 'Semoga Allah memberimu kehidupan yang penuh ridha-Nya.', 'Semoga Allah selalu membersamai setiap langkahmu.',
  'Semoga sahabatku bahagia, taat, dan dicintai Allah selamanya.',
];

const PRAYER_BY_ITEM = Object.fromEntries(
  RIYADHOH_ITEMS.map((item) => [item.id, PRAYER_MESSAGES[Math.floor(Math.random() * PRAYER_MESSAGES.length)] || PRAYER_MESSAGES[0]]),
);

const RIYADHOH_DOCS = {
  azzam: {
    title: 'Azzam Riyadhoh',
    body: `Dengan penuh kesadaran, kerendahan hati, dan harapan kepada Allah SWT, saya berazam untuk bersungguh-sungguh menapaki jalan ketaatan. Saya berjanji kepada diri sendiri untuk menjaga niat, memperbaiki langkah, serta menjadikan setiap hari sebagai kesempatan untuk semakin dekat kepada Allah SWT.

Saya berkomitmen untuk istiqamah menjalankan kegiatan riyadhoh dengan hati yang ikhlas, sabar, dan penuh rasa syukur. Saya akan menjaga ibadah fardu tepat pada waktunya, meningkatkan kualitas kekhusyukan dalam setiap salat, serta berusaha memahami bahwa ibadah bukan sekadar kewajiban, melainkan kebutuhan jiwa dan bentuk cinta kepada Allah SWT.

Saya juga akan membiasakan ibadah sunah, dzikir, doa, membaca Al-Qur’an, bersedekah, menjaga lisan, menghormati sesama, dan melakukan amalan-amalan baik lainnya. Ketika lelah, saya akan mengingat tujuan. Ketika lalai, saya akan kembali. Ketika diuji, saya akan bersabar. Saya percaya bahwa setiap langkah kecil yang dilakukan dengan istiqamah akan menjadi jalan menuju kebaikan yang besar.

Saya memohon agar Allah SWT senantiasa membimbing hati, menguatkan iman, melapangkan rezeki, menenangkan jiwa, serta menjauhkan diri ini dari kesombongan, kemalasan, dan segala hal yang menjauhkan dari ridha-Nya. Semoga riyadhoh ini menjadi ikhtiar untuk membentuk pribadi yang lebih baik, bermanfaat, berakhlak mulia, dan senantiasa membawa kebaikan bagi keluarga, sahabat, serta lingkungan.`,
  },
  affirmation: {
    title: 'Afirmasi Positif',
    body: `Saya adalah hamba Allah yang sedang bertumbuh dalam ketaatan.
Saya mampu menjaga ibadah dengan cinta dan kesadaran.
Saya memilih istiqamah, meskipun dimulai dari langkah-langkah kecil.
Saya pantas menerima keberkahan hidup, ketenangan hati, dan rezeki yang halal serta melimpah.
Saya diberi kekuatan untuk berusaha, bersyukur, berbagi, dan menjadi pribadi yang bermanfaat.
Dengan izin Allah, hidup saya dipenuhi kebahagiaan di dunia dan keselamatan di akhirat.
Saya senantiasa memohon dan mengejar ridha Allah SWT dalam setiap niat, ucapan, dan perbuatan.

“Bersahabat di Dunia Bertetangga di Surga.”`,
  },
} as const;

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const DocOptionButton = memo(
  ({ label, active, colors, onPress }: { label: string; active: boolean; colors: typeof Colors.light; onPress: () => void }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(active ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(glow, {
        toValue: active ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, [active, glow]);

    const handlePressIn = () => {
      Animated.spring(scale, {
        toValue: 0.96,
        friction: 7,
        tension: 220,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 220,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[styles.ribbonButtonWrap, { transform: [{ scale }] }]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.ribbonChip,
            {
              backgroundColor: active ? colors.primary + 'E6' : 'rgba(255,255,255,0.08)',
              borderColor: active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.14)',
              shadowColor: active ? colors.primary : '#000',
              shadowOpacity: active ? 0.28 : 0.08,
              shadowRadius: active ? 12 : 6,
              shadowOffset: { width: 0, height: 6 },
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ribbonGlow,
              {
                opacity: glow,
                backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              },
            ]}
          />
          <Text style={[styles.ribbonChipText, { color: active ? '#FFF' : colors.textSecondary }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  },
);

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getMonthDates(): string[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return Array.from({ length: today.getDate() }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().split('T')[0];
  });
}

function summarizeProgress(dateKeys: string[], logs: Record<string, boolean>): ProgressSummary {
  let done = 0;
  let activeDays = 0;
  for (const dateKey of dateKeys) {
    let dayDone = 0;
    for (const item of RIYADHOH_ITEMS) {
      if (logs[`${item.id}_${dateKey}`]) dayDone++;
    }
    done += dayDone;
    if (dayDone > 0) activeDays++;
  }
  const target = dateKeys.length * RIYADHOH_ITEMS.length;
  return { done, target, pct: target > 0 ? Math.round((done / target) * 100) : 0, activeDays };
}

function getReward(pct: number): { stars: number; label: string; icon: 'star' | 'star-outline' | 'diamond-outline'; color: string } {
  if (pct >= 100) return { stars: 0, label: 'Diamond Emas', icon: 'diamond-outline', color: '#D4A853' };
  if (pct >= 90) return { stars: 5, label: 'Bintang 5', icon: 'star', color: '#F5B700' };
  if (pct >= 80) return { stars: 4, label: 'Bintang 4', icon: 'star', color: '#F5B700' };
  if (pct >= 70) return { stars: 3, label: 'Bintang 3', icon: 'star', color: '#F5B700' };
  if (pct >= 60) return { stars: 2, label: 'Bintang 2', icon: 'star', color: '#F5B700' };
  if (pct >= 50) return { stars: 1, label: 'Bintang 1', icon: 'star', color: '#F5B700' };
  return { stars: 0, label: 'Terus Bertumbuh', icon: 'star-outline', color: '#A9B6BC' };
}

const CheckItem = memo(
  ({ item, colors, onToggle }: { item: RiyadhohRow; colors: typeof Colors.light; onToggle: (id: string) => void }) => {
    const prayerGlow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!item.done) {
        prayerGlow.stopAnimation();
        prayerGlow.setValue(0);
        return;
      }

      const animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(prayerGlow, { toValue: 1, duration: 650, useNativeDriver: true }),
            Animated.timing(prayerGlow, { toValue: 1, duration: 650, useNativeDriver: true }),
          ]),
          Animated.timing(prayerGlow, { toValue: 0, duration: 650, useNativeDriver: true }),
          Animated.delay(500),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }, [item.done, prayerGlow]);

    const prayerOpacity = prayerGlow.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
    const prayerScale = prayerGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

    return (
      <Pressable
        onPress={() => onToggle(item.id)}
        style={[
          styles.checkCard,
          { backgroundColor: item.done ? colors.primary + '18' : colors.card, borderColor: item.done ? colors.primary : colors.border },
          Shadows.sm,
        ]}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={item.done ? colors.primary : colors.textMuted}
        />
        <Ionicons name={item.icon as any} size={20} color={item.done ? colors.primary : colors.textSecondary} />
        <View style={styles.checkNameContainer}>
          <Text style={[styles.checkName, { color: item.done ? colors.primary : colors.text, textDecorationLine: item.done ? 'line-through' : 'none' }]}>
            {item.name}
          </Text>
          {item.done && (
            <Animated.View style={[styles.prayerRow, { opacity: prayerOpacity, transform: [{ scale: prayerScale }] }]}>
              <Ionicons name="sparkles" size={14} color={colors.gold} />
              <Animated.Text style={[styles.prayerText, { color: '#111827', textShadowColor: colors.gold }]}>{item.prayer}</Animated.Text>
              <Ionicons name="sparkles" size={14} color={colors.gold} />
            </Animated.View>
          )}
        </View>
        {item.rakaat && <Text style={[styles.rakaatLabel, { color: item.done ? colors.primary : colors.gold }]}>{item.rakaat} rakaat</Text>}
        {item.done && <Text style={[styles.doneLabel, { color: colors.success }]}>Alhamdulillah</Text>}
      </Pressable>
    );
  },
);

function RiyadhohScreen() {
  const theme = useAppStore((s) => s.theme);
  const riyadhohLogs = useAppStore((s) => s.riyadhohLogs);
  const toggleRiyadhoh = useAppStore((s) => s.toggleRiyadhoh);
  const colors = Colors[theme];

  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weekDates = useMemo(() => getWeekDates(), []);
  const [selectedDoc, setSelectedDoc] = useState<keyof typeof RIYADHOH_DOCS>('azzam');
  const [ribbonVisible, setRibbonVisible] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const docFade = useRef(new Animated.Value(1)).current;
  const docSlide = useRef(new Animated.Value(0)).current;
  const fabFloat = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabFloat, { toValue: -8, duration: 900, useNativeDriver: true }),
        Animated.timing(fabFloat, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.delay(900),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(bubbleOpacity, { toValue: 0.25, duration: 520, useNativeDriver: true }),
      ]),
    ).start();
  }, [bubbleOpacity, fabFloat, fabPulse]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(docFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(docSlide, {
        toValue: 0,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [docFade, docSlide, selectedDoc]);

  const sections = useMemo(() => {
    const grouped: Record<string, RiyadhohRow[]> = {};
    for (const item of RIYADHOH_ITEMS) {
      const key = `${item.id}_${todayKey}`;
      const row: RiyadhohRow = { id: item.id, name: item.name, icon: item.icon, done: !!riyadhohLogs[key], rakaat: 'rakaat' in item ? item.rakaat : undefined, prayer: PRAYER_BY_ITEM[item.id] || PRAYER_MESSAGES[0] };
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(row);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [riyadhohLogs, todayKey]);

  const progress = useMemo(() => {
    const total = RIYADHOH_ITEMS.length;
    let done = 0;
    for (const item of RIYADHOH_ITEMS) {
      if (riyadhohLogs[`${item.id}_${todayKey}`]) done++;
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [riyadhohLogs, todayKey]);

  // Calculate streak
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      let anyDone = false;
      for (const item of RIYADHOH_ITEMS) {
        if (riyadhohLogs[`${item.id}_${dateKey}`]) { anyDone = true; break; }
      }
      if (anyDone) count++;
      else if (i > 0) break; // Allow today to be incomplete
    }
    return count;
  }, [riyadhohLogs]);

  // Weekly chart data
  const weeklyData = useMemo(() => {
    return weekDates.map((dateKey) => {
      let done = 0;
      for (const item of RIYADHOH_ITEMS) {
        if (riyadhohLogs[`${item.id}_${dateKey}`]) done++;
      }
      return { date: dateKey, done, pct: Math.round((done / RIYADHOH_ITEMS.length) * 100), isToday: dateKey === todayKey };
    });
  }, [weekDates, riyadhohLogs, todayKey]);

  const weeklySummary = useMemo(() => summarizeProgress(weekDates.filter((date) => date <= todayKey), riyadhohLogs), [weekDates, riyadhohLogs, todayKey]);
  const monthlySummary = useMemo(() => summarizeProgress(getMonthDates(), riyadhohLogs), [riyadhohLogs]);
  const reward = useMemo(() => getReward(monthlySummary.pct), [monthlySummary.pct]);

  const handleToggle = useCallback(
    (id: string) => {
      toggleRiyadhoh(`${id}_${todayKey}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [toggleRiyadhoh, todayKey],
  );

  const allDone = progress.pct === 100;

  const handleListScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y;

      if (offsetY > 90 && summaryExpanded) {
        setSummaryExpanded(false);
        setRibbonVisible(false);
      }

      if (offsetY < 28 && !summaryExpanded) {
        setSummaryExpanded(true);
        setRibbonVisible(true);
      }
    },
    [summaryExpanded],
  );

  const renderItem = useCallback(
    ({ item }: { item: RiyadhohRow }) => <CheckItem item={item} colors={colors} onToggle={handleToggle} />,
    [colors, handleToggle],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSticky}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Riyadhoh Saya</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Catat dan pantau perjalanan ibadah harian</Text>
        </View>

        {!summaryExpanded ? (
          <Pressable
            onPress={() => { setSummaryExpanded(true); setRibbonVisible(true); }}
            style={[styles.compactRibbon, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.compactRibbonItem, { backgroundColor: colors.primary + '16' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.compactRibbonText, { color: colors.primary }]}>Ayo cek</Text>
            </View>
            <View style={[styles.compactRibbonItem, { backgroundColor: colors.gold + '18' }]}>
              <Ionicons name="trending-up-outline" size={16} color={colors.gold} />
              <Text style={[styles.compactRibbonText, { color: colors.gold }]}>{monthlySummary.pct}% Bertumbuh</Text>
            </View>
            <View style={[styles.compactRibbonItem, { backgroundColor: colors.success + '16' }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.success} />
              <Text style={[styles.compactRibbonText, { color: colors.success }]}>Rekap Bulan</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        ) : (
          <>
            <View style={[styles.scrollHintRow, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}>
              <Ionicons name="chevron-down-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.scrollHintText, { color: colors.textSecondary }]}>Ayo cek daftar Riyadhoh-mu di bawah</Text>
              <Ionicons name="arrow-down" size={16} color={colors.primary} />
            </View>

            <View style={[styles.ribbonWrapper, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          {ribbonVisible ? (
            <View style={styles.ribbonMenu}>
              {(Object.keys(RIYADHOH_DOCS) as Array<keyof typeof RIYADHOH_DOCS>).map((key) => {
                const active = selectedDoc === key;
                const label = key === 'azzam' ? 'Azzam Riyadhoh' : 'Afirmasi Positif';
                return (
                  <DocOptionButton
                    key={key}
                    label={label}
                    active={active}
                    colors={colors}
                    onPress={() => setSelectedDoc(key)}
                  />
                );
              })}
              <Pressable onPress={() => setRibbonVisible(false)} style={styles.hideRibbonButton}>
                <Ionicons name="chevron-up" size={16} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setRibbonVisible(true)} style={[styles.peekButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="chevron-down" size={16} color="#FFF" />
            </Pressable>
          )}
          </View>

        {ribbonVisible && (
          <Animated.View
            style={[
              styles.docCard,
              {
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                opacity: docFade,
                transform: [{ translateY: docSlide }],
              },
              Shadows.sm,
            ]}
          >
            <Text style={[styles.docTitle, { color: colors.text }]}>{RIYADHOH_DOCS[selectedDoc].title}</Text>
            <ScrollView
              style={styles.docScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.docContent}
            >
              <Text style={[styles.docBody, { color: colors.textSecondary }]}>{RIYADHOH_DOCS[selectedDoc].body}</Text>
            </ScrollView>
          </Animated.View>
        )}

        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          <ShimmerGold style={styles.shimmer} />
          <View style={styles.progressRow}>
            <View style={styles.ringContainer}>
              <View style={[styles.ringOuter, { borderColor: colors.surface }]}>
                <View style={[styles.ringFill, { borderColor: colors.primary, borderTopColor: progress.pct > 25 ? colors.primary : 'transparent', borderRightColor: progress.pct > 50 ? colors.primary : 'transparent', borderBottomColor: progress.pct > 75 ? colors.primary : 'transparent' }]} />
                <View style={styles.ringInner}>
                  <Text style={[styles.ringPct, { color: colors.primary }]}>{progress.pct}%</Text>
                </View>
              </View>
              <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>Progress Hari Ini</Text>
            </View>
            <View style={styles.statsCol}>
              <View style={styles.statRow}>
                <Ionicons name="flame" size={20} color={colors.gold} />
                <Text style={[styles.statVal, { color: colors.gold }]}>{streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hari Istiqamah</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="checkmark-done" size={20} color={colors.success} />
                <Text style={[styles.statVal, { color: colors.success }]}>{progress.done}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>dari {progress.total}</Text>
              </View>
            </View>
            <View style={styles.rewardCol}>
              <Ionicons name={reward.icon} size={24} color={reward.color} />
              <View style={styles.starRow}>
                {[0, 1, 2, 3, 4].map((star) => (
                  <Ionicons key={star} name={star < reward.stars ? 'star' : 'star-outline'} size={10} color={reward.color} />
                ))}
              </View>
              <Text style={[styles.rewardLabel, { color: reward.color }]}>{reward.label}</Text>
            </View>
          </View>

          {allDone && (
            <View style={[styles.completeBanner, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.completeText, { color: colors.success }]}>
                MasyaAllah! Hari ini kamu telah menyelesaikan Riyadhoh. Semoga Allah menerima amal kita.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.periodTitleRow}>
            <Text style={[styles.weekTitle, { color: colors.text }]}>Rekap Mingguan</Text>
            <Text style={[styles.periodPct, { color: colors.primary }]}>{weeklySummary.pct}%</Text>
          </View>
          <Text style={[styles.periodMeta, { color: colors.textMuted }]}>Persentase pencapaian: {weeklySummary.done} dari {weeklySummary.target} target • {weeklySummary.activeDays} hari aktif</Text>
          <View style={styles.chartRow}>
            {weeklyData.map((day, i) => (
              <View key={day.date} style={styles.chartCol}>
                <View style={[styles.chartBarBg, { backgroundColor: colors.surface }]}>
                  <View style={[styles.chartBarFill, { height: `${Math.max(day.pct, 4)}%`, backgroundColor: day.isToday ? colors.primary : colors.primaryLight }]} />
                </View>
                <Text style={[styles.chartDay, { color: day.isToday ? colors.primary : colors.textMuted, fontWeight: day.isToday ? '700' : '400' }]}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
          {streak >= 3 && (
            <Text style={[styles.streakMsg, { color: colors.gold }]}>
              🔥 {streak} Hari Istiqamah — MasyaAllah! Pertahankan istiqamahmu.
            </Text>
          )}
        </View>

        <View style={[styles.monthCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.periodTitleRow}>
            <View><Text style={[styles.weekTitle, { color: colors.text }]}>Rekap Bulanan</Text><Text style={[styles.periodMeta, { color: colors.textMuted }]}>Persentase pencapaian bulan berjalan</Text></View>
            <Text style={[styles.monthPct, { color: colors.gold }]}>{monthlySummary.pct}%</Text>
          </View>
          <View style={[styles.monthProgressTrack, { backgroundColor: colors.surface }]}><View style={[styles.monthProgressFill, { width: `${monthlySummary.pct}%`, backgroundColor: colors.gold }]} /></View>
          <View style={styles.monthStatsRow}>
            <Text style={[styles.monthStat, { color: colors.textSecondary }]}>{monthlySummary.done} selesai</Text>
            <Text style={[styles.monthStat, { color: colors.textSecondary }]}>{monthlySummary.activeDays} hari aktif</Text>
            <Text style={[styles.monthStat, { color: reward.color }]}>{reward.label}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/grup-ibadah/' as any)} style={[styles.groupCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
          <View style={[styles.groupIcon, { backgroundColor: colors.primary }]}><Ionicons name="people" size={22} color="#FFF" /></View>
          <View style={{ flex: 1 }}><Text style={[styles.groupTitle, { color: colors.text }]}>Grup Ibadah</Text><Text style={[styles.groupDescription, { color: colors.textSecondary }]}>Masuk Tahajud Call, Dhuha Call, atau Taubat Call.</Text></View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
          </>
        )}
      </View>

      {checklistVisible && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              <Text style={[styles.checklistLabel, { color: colors.text }]}>Checklist Ibadah Hari Ini</Text>
              <Text style={[styles.rawatibHint, { color: colors.textSecondary }]}>Rawatib Muakkadah: 12 rakaat dalam 5 waktu sunnah</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <View pointerEvents="box-none" style={styles.fabContainer}>
        <Animated.View
          style={[
            styles.fabBubbleWrap,
            { opacity: bubbleOpacity, transform: [{ translateY: fabFloat }] },
          ]}
        >
          <Text style={styles.fabBubbleText}>Semangat</Text>
        </Animated.View>

        <Pressable
          onPress={() => {
            setChecklistVisible(true);
            setSummaryExpanded(false);
            setRibbonVisible(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
          onPressIn={() => {
            Animated.spring(fabScale, {
              toValue: 0.92,
              friction: 6,
              tension: 220,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabScale, {
              toValue: 1,
              friction: 6,
              tension: 220,
              useNativeDriver: true,
            }).start();
          }}
          style={styles.fabButton}
        >
          <BlurView
            pointerEvents="none"
            intensity={70}
            tint="light"
            style={styles.fabBlur}
          />
          <Animated.View
            style={{
              transform: [{ translateY: fabFloat }, { scale: fabScale }, { scale: fabPulse }],
            }}
          >
            <Ionicons name="warning" size={22} color="#FFF" />
          </Animated.View>
          <Text style={styles.fabButtonText}>Ayo Mulai</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(RiyadhohScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSticky: { paddingBottom: Spacing.sm },
  header: {
    marginHorizontal: Spacing.lg,
    marginTop: 10,
    paddingTop: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center', transform: [{ translateY: 20 }] },
  subtitle: { fontSize: FontSize.sm, marginTop: 2, textAlign: 'center', transform: [{ translateY: 20 }] },
  scrollHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  scrollHintText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.2 },
  compactRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  compactRibbonItem: { flex: 1, minHeight: 32, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 },
  compactRibbonText: { fontSize: 9, fontWeight: '800' },
  ribbonWrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  ribbonMenu: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm, flexWrap: 'wrap' },
  ribbonButtonWrap: { overflow: 'visible' },
  ribbonChip: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  ribbonGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: BorderRadius.md,
  },
  ribbonChipText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.2 },
  hideRibbonButton: { marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  peekButton: { alignSelf: 'center', width: 42, height: 32, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  docCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  docTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm },
  docScroll: { maxHeight: 180 },
  docContent: { paddingBottom: Spacing.sm },
  docBody: { fontSize: FontSize.sm, lineHeight: 22, textAlign: 'left' },
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  shimmer: { height: 3 },
  progressRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 10, gap: Spacing.sm, alignItems: 'center' },
  ringContainer: { alignItems: 'center', width: 70 },
  ringOuter: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringFill: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 4, top: -4, left: -4 },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 14, fontWeight: '800' },
  ringLabel: { fontSize: 9, marginTop: 3 },
  statsCol: { flex: 1, justifyContent: 'center', gap: 5 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs },
  rewardCol: { minWidth: 62, alignItems: 'center', justifyContent: 'center', gap: 2 },
  starRow: { flexDirection: 'row', gap: 1 },
  rewardLabel: { fontSize: 9, fontWeight: '800', textAlign: 'center' },
  completeBanner: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md },
  completeText: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  weekCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  periodTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekTitle: { fontSize: FontSize.md, fontWeight: '800' },
  periodPct: { fontSize: FontSize.xl, fontWeight: '900' },
  periodMeta: { fontSize: FontSize.xs, marginTop: 3 },
  chartRow: { flexDirection: 'row', height: 62, gap: 4, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBarBg: { width: '78%', height: 44, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.08)' },
  chartBarFill: { width: '100%', borderRadius: 8, minHeight: 12 },
  chartDay: { fontSize: FontSize.xs, marginTop: 4 },
  streakMsg: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center', marginTop: Spacing.sm },
  monthCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  monthPct: { fontSize: FontSize.xxl, fontWeight: '900' },
  monthProgressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: Spacing.md },
  monthProgressFill: { height: 7, borderRadius: 4 },
  monthStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, gap: Spacing.sm },
  monthStat: { fontSize: FontSize.xs, fontWeight: '700' },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  groupIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: FontSize.md, fontWeight: '800' },
  groupDescription: { fontSize: FontSize.xs, lineHeight: 17, marginTop: 2 },
  checklistLabel: { fontSize: FontSize.lg, fontWeight: '700', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  listContent: { paddingTop: Spacing.md, paddingBottom: 120 },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
    alignItems: 'flex-end',
    transform: [{ translateY: -26 }],
  },
  fabBubbleWrap: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: '#B45309',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    shadowColor: '#78350F',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabBubbleText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  fabButton: {
    position: 'relative',
    minWidth: 164,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 118, 110, 0.62)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    shadowColor: '#075E59',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    overflow: 'hidden',
  },
  fabBlur: { ...StyleSheet.absoluteFill, borderRadius: 26 },
  fabButtonText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '900', letterSpacing: 0.1 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.sm, marginBottom: Spacing.sm, marginHorizontal: Spacing.lg },
  checkCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm, marginHorizontal: Spacing.lg, gap: 10 },
  checkNameContainer: { flex: 1 },
  checkName: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  prayerText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  rakaatLabel: { fontSize: 10, fontWeight: '800', marginLeft: 2 },
  rawatibHint: { fontSize: FontSize.xs, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  doneLabel: { fontSize: FontSize.xs, fontWeight: '600' },
});
