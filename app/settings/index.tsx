import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorScheme } from '../../constants/theme';
import { BorderRadius, COLOR_SCHEMES, FontSize, getColors, Spacing } from '../../constants/theme';
import { fetchPrayerTimes, requestNotificationPermission, rescheduleNotifications, type PrayerTimes } from '../../services/prayer';
import { errorMessage } from '../../services/api';
import { contentApi } from '../../services/nasjakApi';
import { useAppStore } from '../../store/appStore';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const CACHE_PREFIXES = ['@nasjak_cache_', '@nasjak_quran_', '@nasjak_hadis_'];

// Bandingkan versi semver sederhana: >0 bila a lebih baru dari b.
function compareVersions(a: string, b: string) {
  const left = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface SettingItem {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  type: 'toggle' | 'value' | 'link' | 'slider';
  value?: any;
  onChange?: (val: any) => void;
  onPress?: () => void;
  color?: string;
}

const SettingsGroup = memo(({ title, items, colors }: {
  title: string;
  items: SettingItem[];
  colors: ReturnType<typeof getColors>[keyof ReturnType<typeof getColors>];
}) => (
  <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{title}</Text>
    {items.map((item, idx) => (
      <Pressable
        key={item.id}
        onPress={item.onPress}
        style={({ pressed }) => [
          styles.settingRow,
          idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
          { opacity: pressed && item.onPress ? 0.7 : 1 },
        ]}
        disabled={!item.onPress && item.type !== 'toggle' && item.type !== 'slider'}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconBox, { backgroundColor: (item.color || colors.primary) + '15' }]}>
            <Ionicons name={item.icon} size={20} color={item.color || colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
            {item.description && (
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{item.description}</Text>
            )}
          </View>
        </View>

        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={item.onChange}
            trackColor={{ false: colors.textMuted + '30', true: (item.color || colors.primary) + '60' }}
            thumbColor={item.value ? (item.color || colors.primary) : colors.textMuted}
          />
        )}
        {item.type === 'value' && (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{item.value}</Text>
        )}
        {item.type === 'link' && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
        {item.type === 'slider' && (
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderValue, { color: colors.primary }]}>{item.value}px</Text>
          </View>
        )}
      </Pressable>
    ))}
  </View>
));

SettingsGroup.displayName = 'SettingsGroup';

function SettingsScreen() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);
  const quranFontSize = useAppStore((s) => s.quranFontSize);
  const hadithFontSize = useAppStore((s) => s.hadithFontSize);
  const setQuranFontSize = useAppStore((s) => s.setQuranFontSize);
  const setHadithFontSize = useAppStore((s) => s.setHadithFontSize);
  const notificationSettings = useAppStore((s) => s.notificationSettings);
  const updateNotificationSettings = useAppStore((s) => s.updateNotificationSettings);
  const prayerLocation = useAppStore((s) => s.prayerLocation);
  const colors = getColors(colorScheme)[theme];
  const insets = useSafeAreaInsets();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleClearCache = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)));
      if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
      Alert.alert('Cache Dibersihkan', `${cacheKeys.length} data cache dihapus. Data akan dimuat ulang dari server.`);
    } catch {
      Alert.alert('Gagal', 'Cache tidak dapat dibersihkan. Coba lagi.');
    }
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const config = await contentApi.config();
      const latest = config.app.latestVersion;
      const storeUrl = Platform.OS === 'ios' ? config.app.storeUrl.ios : config.app.storeUrl.android;
      if (compareVersions(latest, APP_VERSION) > 0) {
        const mustUpdate = compareVersions(config.app.minSupportedVersion, APP_VERSION) > 0;
        setUpdateStatus(`Versi ${latest} tersedia`);
        Alert.alert(
          mustUpdate ? 'Update Wajib' : 'Update Tersedia',
          `Versi ${latest} sudah tersedia (versi Anda ${APP_VERSION}).`,
          storeUrl
            ? [{ text: 'Nanti', style: 'cancel' }, { text: 'Update', onPress: () => Linking.openURL(storeUrl).catch(() => {}) }]
            : [{ text: 'OK' }],
        );
      } else {
        setUpdateStatus('Sudah versi terbaru');
        Alert.alert('Sudah Terbaru', `Aplikasi Anda (v${APP_VERSION}) sudah versi terbaru.`);
      }
    } catch (error) {
      Alert.alert('Gagal Cek Update', errorMessage(error));
    } finally {
      setCheckingUpdate(false);
    }
  }, []);
  const [showQuranSizeModal, setShowQuranSizeModal] = useState(false);
  const [showHadithSizeModal, setShowHadithSizeModal] = useState(false);

  const syncNotifications = async (updates: Parameters<typeof updateNotificationSettings>[0]) => {
    const nextSettings = { ...notificationSettings, ...updates };
    updateNotificationSettings(updates);
    try {
      const times = prayerLocation
        ? await fetchPrayerTimes(prayerLocation)
        : ({ Fajr: '', Dhuhr: '', Asr: '', Maghrib: '', Isha: '' } as PrayerTimes);
      await rescheduleNotifications(times, nextSettings);
    } catch {
      // The prayer screen will retry scheduling after location or network recovery.
    }
  };

  const displaySettings: SettingItem[] = [
    {
      id: 'dark-mode',
      icon: theme === 'dark' ? 'moon' : 'moon-outline',
      label: 'Mode Gelap',
      description: theme === 'dark' ? 'Aktif' : 'Nonaktif',
      type: 'toggle',
      value: theme === 'dark',
      onChange: toggleTheme,
      color: '#FFD700',
    },
    {
      id: 'color-scheme',
      icon: 'color-palette-outline',
      label: 'Tema Warna',
      description: COLOR_SCHEMES[colorScheme as ColorScheme]?.label || 'Ocean',
      type: 'link',
      onPress: () => setShowColorPicker(true),
      color: colors.primary,
    },
  ];

  const readingSettings: SettingItem[] = [
    {
      id: 'quran-font',
      icon: 'book-outline',
      label: 'Ukuran Huruf Al-Quran',
      description: `Saat ini ${quranFontSize}px`,
      type: 'slider',
      value: quranFontSize,
      onPress: () => setShowQuranSizeModal(true),
      color: colors.primary,
    },
    {
      id: 'hadith-font',
      icon: 'document-text-outline',
      label: 'Ukuran Huruf Hadis',
      description: `Saat ini ${hadithFontSize}px`,
      type: 'slider',
      value: hadithFontSize,
      onPress: () => setShowHadithSizeModal(true),
      color: colors.gold,
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      label: 'Notifikasi',
      description: 'Atur adzan, motivasi, dan Riyadhoh',
      type: 'link',
      onPress: () => router.push('/sholat/' as any),
      color: '#FF6B6B',
    },
    {
      id: 'adhan',
      icon: 'volume-high-outline',
      label: 'Notifikasi Adzan',
      description: notificationSettings.adhanEnabled ? 'Aktif sesuai lokasi Anda' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.adhanEnabled,
      onChange: (value) => syncNotifications({ adhanEnabled: value }),
      color: colors.primary,
    },
    {
      id: 'language',
      icon: 'language-outline',
      label: 'Bahasa',
      description: 'Indonesia',
      type: 'value',
      color: '#2EC4B6',
    },
    {
      id: 'cache',
      icon: 'trash-outline',
      label: 'Hapus Cache',
      description: 'Bersihkan cache Al-Quran, Hadis & konten server',
      type: 'link',
      onPress: handleClearCache,
      color: '#FF8C42',
    },
  ];

  const reminderSettings: SettingItem[] = [
    {
      id: 'motivational-reminder',
      icon: 'bulb-outline',
      label: 'Motivasi Setiap Jam',
      description: notificationSettings.motivationalEnabled ? 'Aktif • pengingat setiap 1 jam' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.motivationalEnabled,
      onChange: (value) => syncNotifications({ motivationalEnabled: value }),
      color: colors.gold,
    },
    {
      id: 'riyadhoh-reminder',
      icon: 'checkmark-circle-outline',
      label: 'Riyadhoh Reminder',
      description: notificationSettings.riyadhohEnabled ? `Aktif • ${String(notificationSettings.riyadhohHour).padStart(2, '0')}:${String(notificationSettings.riyadhohMinute).padStart(2, '0')}` : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.riyadhohEnabled,
      onChange: (value) => syncNotifications({ riyadhohEnabled: value }),
      color: colors.success,
    },
    {
      id: 'istighfar-hourly',
      icon: 'sparkles-outline',
      label: 'Istighfar setiap 10 menit',
      description: notificationSettings.istighfarHourlyEnabled ? 'Aktif • pengingat otomatis' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.istighfarHourlyEnabled,
      onChange: (value) => syncNotifications({ istighfarHourlyEnabled: value }),
      color: colors.gold,
    },
    {
      id: 'dzikir-reminder',
      icon: 'alarm-outline',
      label: 'Reminder Dzikir 5 Menit',
      description: notificationSettings.dzikirReminderEnabled ? 'Aktif • setiap 5 menit' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.dzikirReminderEnabled,
      onChange: (value) => syncNotifications({ dzikirReminderEnabled: value }),
      color: colors.primary,
    },
    {
      id: 'shalawat-reminder',
      icon: 'star-outline',
      label: 'Membaca Shalawat',
      description: notificationSettings.shalawatReminderEnabled ? 'Aktif • pengingat harian' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.shalawatReminderEnabled,
      onChange: (value) => syncNotifications({ shalawatReminderEnabled: value }),
      color: colors.primary,
    },
    {
      id: 'spiritual-reminders',
      icon: 'heart-outline',
      label: 'Pengingat Menjaga Diri',
      description: notificationSettings.spiritualReminderEnabled ? 'Aktif • terjadwal lembut' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.spiritualReminderEnabled,
      onChange: (value) => syncNotifications({ spiritualReminderEnabled: value }),
      color: colors.primary,
    },
    {
      id: 'debt-reminder',
      icon: 'wallet-outline',
      label: 'Ingat Bayar Utang',
      description: notificationSettings.debtReminderEnabled ? 'Aktif • setiap pagi' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.debtReminderEnabled,
      onChange: (value) => syncNotifications({ debtReminderEnabled: value }),
      color: colors.gold,
    },
    {
      id: 'taubat-reminder',
      icon: 'heart-outline',
      label: 'Shalat Taubat 3 Kali Sehari',
      description: notificationSettings.taubatReminderEnabled ? 'Aktif • pagi, siang, malam' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.taubatReminderEnabled,
      onChange: (value) => syncNotifications({ taubatReminderEnabled: value }),
      color: colors.primary,
    },
    {
      id: 'dhuha-reminder',
      icon: 'sunny-outline',
      label: 'Pengingat Shalat Dhuha',
      description: notificationSettings.dhuhaReminderEnabled ? 'Aktif • pukul 07.00 - 11.30' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.dhuhaReminderEnabled,
      onChange: (value) => syncNotifications({ dhuhaReminderEnabled: value }),
      color: colors.gold,
    },
    {
      id: 'tahajud-call',
      icon: 'moon-outline',
      label: 'Tahajud Call & Alarm',
      description: notificationSettings.tahajudCallEnabled ? 'Aktif • setiap pukul 02.30' : 'Nonaktif',
      type: 'toggle',
      value: notificationSettings.tahajudCallEnabled,
      onChange: (value) => syncNotifications({ tahajudCallEnabled: value }),
      color: colors.primary,
    },
  ];

  const aboutSettings: SettingItem[] = [
    {
      id: 'version',
      icon: 'information-circle-outline',
      label: 'Versi Aplikasi',
      description: `v${APP_VERSION}`,
      type: 'value',
      color: colors.primary,
    },
    {
      id: 'update',
      icon: 'cloud-download-outline',
      label: 'Cek Update',
      description: checkingUpdate ? 'Memeriksa...' : updateStatus || 'Periksa versi terbaru aplikasi',
      type: 'link',
      onPress: checkingUpdate ? undefined : handleCheckUpdate,
      color: colors.success,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Kembali">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pengaturan</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Settings Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Display Settings */}
        <SettingsGroup title="TAMPILAN" items={displaySettings} colors={colors} />

        {/* Reading Settings */}
        <SettingsGroup title="BACAAN" items={readingSettings} colors={colors} />

        <SettingsGroup title="SHALAT & LOKASI" items={[{
          id: 'prayer-dashboard',
          icon: 'compass-outline',
          label: 'Waktu Shalat, Kiblat & Masjid',
          description: prayerLocation?.city || 'Gunakan lokasi perangkat',
          type: 'link' as const,
          onPress: () => router.push('/sholat/' as any),
          color: colors.primary,
        }]} colors={colors} />

        {/* App Settings */}
        <SettingsGroup title="APLIKASI" items={appSettings} colors={colors} />

        <SettingsGroup title="REMINDER HARIAN" items={reminderSettings} colors={colors} />

        {/* About */}
        <SettingsGroup title="TENTANG" items={aboutSettings} colors={colors} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => setShowColorPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowColorPicker(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Tema Warna</Text>
            <View style={styles.colorGrid}>
              {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((key) => {
                const scheme = COLOR_SCHEMES[key];
                const isActive = colorScheme === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setColorScheme(key);
                      setShowColorPicker(false);
                    }}
                    style={[
                      styles.colorItem,
                      isActive && { borderColor: scheme.primary, borderWidth: 3 },
                    ]}
                  >
                    <View style={[styles.colorPreview, { backgroundColor: scheme.primary }]}>
                      <Ionicons name={scheme.icon as any} size={24} color="#FFF" />
                    </View>
                    <Text style={[styles.colorName, { color: isActive ? scheme.primary : colors.textSecondary }]}>
                      {scheme.label.split(' ')[0]}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={16} color={scheme.primary} style={{ position: 'absolute', top: 0, right: 0 }} />}
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setShowColorPicker(false)} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalBtnText}>Selesai</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quran Font Size Modal */}
      <Modal visible={showQuranSizeModal} transparent animationType="fade" onRequestClose={() => setShowQuranSizeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowQuranSizeModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ukuran Huruf Al-Quran</Text>
            <View style={[styles.sizePreview, { backgroundColor: colors.surface }]}>
              <Text style={[styles.previewText, { fontSize: quranFontSize, color: colors.text }]}>
                وَقُرْآنًا فَرَقْنَاهُ لِتَقْرَأَهُ عَلَى النَّاسِ
              </Text>
            </View>
            <View style={styles.sizeControl}>
              <Pressable onPress={() => setQuranFontSize(quranFontSize - 2)} style={[styles.sizeBtn, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="remove" size={22} color={colors.text} />
              </Pressable>
              <Text style={[styles.sizeValue, { color: colors.text }]}>{quranFontSize}px</Text>
              <Pressable onPress={() => setQuranFontSize(quranFontSize + 2)} style={[styles.sizeBtn, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="add" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.sizeSlider}>
              {Array.from({ length: 9 }, (_, i) => 12 + i * 2).map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setQuranFontSize(size)}
                  style={[
                    styles.sizePreset,
                    { backgroundColor: quranFontSize === size ? colors.primary : colors.surface },
                  ]}
                >
                  <Text style={[styles.sizePresetText, { color: quranFontSize === size ? '#FFF' : colors.textSecondary, fontSize: size * 0.7 }]}>
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowQuranSizeModal(false)} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalBtnText}>Selesai</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Hadith Font Size Modal */}
      <Modal visible={showHadithSizeModal} transparent animationType="fade" onRequestClose={() => setShowHadithSizeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowHadithSizeModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ukuran Huruf Hadis</Text>
            <View style={[styles.sizePreview, { backgroundColor: colors.surface }]}>
              <Text style={[styles.previewText, { fontSize: hadithFontSize, color: colors.text }]}>
                عن أبي هريرة رضي الله عنه قال: قال رسول الله
              </Text>
            </View>
            <View style={styles.sizeControl}>
              <Pressable onPress={() => setHadithFontSize(hadithFontSize - 2)} style={[styles.sizeBtn, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="remove" size={22} color={colors.text} />
              </Pressable>
              <Text style={[styles.sizeValue, { color: colors.text }]}>{hadithFontSize}px</Text>
              <Pressable onPress={() => setHadithFontSize(hadithFontSize + 2)} style={[styles.sizeBtn, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="add" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.sizeSlider}>
              {Array.from({ length: 9 }, (_, i) => 12 + i * 2).map((size) => (
                <Pressable
                  key={size}
                  onPress={() => setHadithFontSize(size)}
                  style={[
                    styles.sizePreset,
                    { backgroundColor: hadithFontSize === size ? colors.gold : colors.surface },
                  ]}
                >
                  <Text style={[styles.sizePresetText, { color: hadithFontSize === size ? '#FFF' : colors.textSecondary, fontSize: size * 0.7 }]}>
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowHadithSizeModal(false)} style={[styles.modalBtn, { backgroundColor: colors.gold }]}>
              <Text style={styles.modalBtnText}>Selesai</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default memo(SettingsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 2, elevation: 2 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700' },

  content: { flex: 1, paddingTop: Spacing.md, paddingHorizontal: Spacing.lg },

  group: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  groupTitle: { fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, gap: Spacing.md },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingTextContainer: { flex: 1 },
  settingLabel: { fontSize: FontSize.md, fontWeight: '600' },
  settingDesc: { fontSize: FontSize.sm, marginTop: 2 },
  settingValue: { fontSize: FontSize.sm, fontWeight: '500' },
  sliderContainer: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  sliderValue: { fontSize: FontSize.sm, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.md },
  modalBtn: { paddingVertical: 12, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.md },
  modalBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },

  // Color Grid
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  colorItem: { flex: 1, minWidth: '30%', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: 'transparent' },
  colorPreview: { width: 50, height: 50, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  colorName: { fontSize: FontSize.xs, fontWeight: '600' },

  // Size Control
  sizePreview: { borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, minHeight: 100, justifyContent: 'center', alignItems: 'center' },
  previewText: { fontStyle: 'italic', textAlign: 'center', lineHeight: 28 },
  sizeControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  sizeBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sizeValue: { fontSize: FontSize.lg, fontWeight: '700', minWidth: 70, textAlign: 'center' },
  // Lebar tetap per tile: flex:1 di dalam flexWrap membuat tinggi baris salah hitung di Android.
  sizeSlider: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.sm, marginBottom: Spacing.lg },
  sizePreset: { width: '31%', height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  sizePresetText: { fontWeight: '600' },
});
