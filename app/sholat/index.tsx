import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useForegroundPermissions } from 'expo-location';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { BorderRadius, FontSize, Shadows, Spacing, getColors } from '../../constants/theme';
import { fetchNearbyMosques, fetchPrayerTimes, formatDistance, getCurrentPrayerLocation, getPrayerEntries, getQiblaBearing, requestNotificationPermission, rescheduleNotifications, type NearbyMosque, type PrayerTimes } from '../../services/prayer';
import type { PrayerLocation } from '../../types';
import { getMaps } from '../../services/nativeModules';

const ADHAN_AUDIO_URL = 'https://www.islamcan.com/audio/adhan/azan1.mp3';
const mapsModule = getMaps();

function NearbyMosqueMap({ location, mosques }: { location: PrayerLocation; mosques: NearbyMosque[] }) {
  // Titik "lokasi saya" hanya boleh aktif bila izin lokasi sudah diberikan; tanpa izin Google Maps Android
  // melempar SecurityException dan app tertutup.
  const [locationPermission] = useForegroundPermissions();
  const showMyLocation = Boolean(locationPermission?.granted);
  const markers = mosques.map((mosque) => ({
    id: mosque.id,
    coordinates: { latitude: mosque.latitude, longitude: mosque.longitude },
    title: mosque.name,
    snippet: mosque.address || 'Masjid terdekat',
    showCallout: true,
  }));

  if (!mapsModule) {
    return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta aktif pada development build</Text></View>;
  }

  if (Platform.OS === 'android') {
    const GoogleMaps = mapsModule.GoogleMaps;
    if (!GoogleMaps?.View) {
      return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta tidak tersedia pada perangkat ini</Text></View>;
    }
    return <GoogleMaps.View style={styles.inlineMap} cameraPosition={{ coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 13 }} markers={markers} properties={{ isMyLocationEnabled: showMyLocation }} uiSettings={{ compassEnabled: true, zoomControlsEnabled: true }} />;
  }

  const AppleMaps = mapsModule.AppleMaps;
  if (!AppleMaps?.View) {
    return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta tidak tersedia pada perangkat ini</Text></View>;
  }
  return <AppleMaps.View style={styles.inlineMap} cameraPosition={{ coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 13 }} annotations={markers.map((marker) => ({ ...marker, systemImage: 'building.2' }))} properties={{ isMyLocationEnabled: showMyLocation }} />;
}

function getNextPrayer(times: PrayerTimes | null) {
  if (!times) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const entries = getPrayerEntries(times);
  const upcoming = entries.find((entry) => {
    const [hour, minute] = entry.time.split(':').map(Number);
    return hour * 60 + minute > currentMinutes;
  });
  return upcoming || entries[0];
}

function SholatScreen() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const storedLocation = useAppStore((s) => s.prayerLocation);
  const setPrayerLocation = useAppStore((s) => s.setPrayerLocation);
  const notificationSettings = useAppStore((s) => s.notificationSettings);
  const colors = getColors(colorScheme)[theme];
  const [location, setLocation] = useState<PrayerLocation | null>(storedLocation);
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [mosques, setMosques] = useState<NearbyMosque[]>([]);
  const [loading, setLoading] = useState(!storedLocation);
  const [mosqueLoading, setMosqueLoading] = useState(false);
  const [error, setError] = useState('');
  const [playingPrayer, setPlayingPrayer] = useState<string | null>(null);
  const adhanPlayer = useAudioPlayer(null);
  const adhanStatus = useAudioPlayerStatus(adhanPlayer);

  const loadPrayerData = useCallback(async (refreshLocation = false) => {
    setLoading(true);
    setError('');
    try {
      const nextLocation = refreshLocation || !location ? await getCurrentPrayerLocation() : location;
      setLocation(nextLocation);
      setPrayerLocation(nextLocation);
      const nextTimes = await fetchPrayerTimes(nextLocation);
      setTimes(nextTimes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data shalat belum tersedia.');
    } finally {
      setLoading(false);
    }
  }, [location, setPrayerLocation]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!adhanStatus.playing) setPlayingPrayer(null);
  }, [adhanStatus.playing]);

  const loadMosques = useCallback(async () => {
    if (!location) return;
    setMosqueLoading(true);
    try {
      setMosques(await fetchNearbyMosques(location));
    } catch {
      Alert.alert('Masjid terdekat', 'Daftar masjid belum dapat dimuat. Periksa koneksi internet Anda.');
    } finally {
      setMosqueLoading(false);
    }
  }, [location]);

  useEffect(() => {
    void loadPrayerData();
  }, [loadPrayerData]);

  useEffect(() => {
    if (location) loadMosques();
  }, [location, loadMosques]);

  const nextPrayer = useMemo(() => getNextPrayer(times), [times]);
  const qiblaBearing = location ? getQiblaBearing(location) : null;

  const openMosqueDirections = (mosque?: NearbyMosque) => {
    if (!location) return;
    const destination = mosque ? `${mosque.latitude},${mosque.longitude}` : 'masjid terdekat';
    const url = mosque
      ? `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${destination}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}&query_place_id=`;
    Linking.openURL(url).catch(() => Alert.alert('Maps tidak tersedia', 'Silakan buka Google Maps secara manual.'));
  };

  const enableAdhan = async () => {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifikasi belum tersedia', 'Notifikasi adzan memerlukan development build Android/iOS. Di Expo Go, Anda tetap dapat mendengarkan preview adzan pada tombol audio.');
      } else if (times) {
        await rescheduleNotifications(times, notificationSettings);
        Alert.alert('Berhasil', 'Notifikasi adzan dan pengingat telah diaktifkan.');
      }
    } catch {
      Alert.alert('Notifikasi belum tersedia', 'Pengaturan notifikasi tidak dapat digunakan pada perangkat ini.');
    }
  };

  const toggleAdhanPreview = async (prayerKey: string) => {
    try {
      if (playingPrayer === prayerKey && adhanStatus.playing) {
        adhanPlayer.pause();
        setPlayingPrayer(null);
        return;
      }
      adhanPlayer.replace(ADHAN_AUDIO_URL);
      adhanPlayer.play();
      setPlayingPrayer(prayerKey);
    } catch {
      setPlayingPrayer(null);
      Alert.alert('Audio tidak tersedia', 'Preview adzan tidak dapat diputar. Periksa koneksi internet Anda.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Waktu Shalat</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{location?.city || 'Lokasi belum diatur'}</Text>
        </View>
        <Pressable onPress={() => loadPrayerData(true)} hitSlop={10}><Ionicons name="refresh" size={22} color={colors.primary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.error }]}>
            <Ionicons name="location-outline" size={24} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            <Pressable onPress={() => loadPrayerData(true)} style={[styles.smallButton, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>Coba Lagi</Text></Pressable>
          </View>
        ) : null}

        <View style={[styles.nextCard, { backgroundColor: colors.primary }, Shadows.md]}>
          <View style={styles.nextCardTop}><View><Text style={styles.eyebrow}>SHALAT BERIKUTNYA</Text><Text style={styles.nextName}>{nextPrayer?.label || 'Memuat...'}</Text></View><Ionicons name="time-outline" size={38} color="rgba(255,255,255,0.85)" /></View>
          <Text style={styles.nextTime}>{nextPrayer?.time || '--:--'}</Text>
          <Text style={styles.locationText}><Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" /> {location?.city || 'Mengambil lokasi...'}</Text>
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Jadwal Hari Ini</Text><Pressable onPress={enableAdhan}><Text style={[styles.linkText, { color: colors.primary }]}>Aktifkan Adzan</Text></Pressable></View>
        <View style={[styles.prayerGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} /> : getPrayerEntries(times || ({} as PrayerTimes)).map((entry) => (
            <View key={entry.key} style={[styles.prayerRow, entry.key === nextPrayer?.key && { backgroundColor: colors.primary + '12' }]}>
              <View style={styles.prayerLabel}><Ionicons name={entry.key === nextPrayer?.key ? 'radio-button-on' : 'radio-button-off'} size={16} color={entry.key === nextPrayer?.key ? colors.primary : colors.textMuted} /><Text style={[styles.prayerName, { color: colors.text }]}>{entry.label}</Text></View><Text style={[styles.prayerTime, { color: entry.key === nextPrayer?.key ? colors.primary : colors.textSecondary }]}>{entry.time}</Text><Pressable onPress={() => toggleAdhanPreview(String(entry.key))} hitSlop={8} style={[styles.audioButton, { backgroundColor: colors.primary + '15' }]}><Ionicons name={playingPrayer === String(entry.key) && adhanStatus.playing ? 'pause' : 'volume-high-outline'} size={18} color={colors.primary} /></Pressable>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Arah Kiblat</Text><Text style={[styles.degrees, { color: colors.gold }]}>{qiblaBearing !== null ? `${qiblaBearing}° dari Utara` : '--'}</Text></View>
        <View style={[styles.qiblaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.compass, { borderColor: colors.gold }]}><Ionicons name="navigate" size={58} color={colors.gold} style={{ transform: [{ rotate: `${qiblaBearing || 0}deg` }] }} /><Text style={[styles.compassNorth, { color: colors.textMuted }]}>U</Text></View>
          <View style={{ flex: 1 }}><Text style={[styles.qiblaTitle, { color: colors.text }]}>Arah menuju Ka'bah</Text><Text style={[styles.qiblaDesc, { color: colors.textSecondary }]}>Putar perangkat mengikuti panah untuk menemukan arah kiblat dari lokasi Anda.</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Masjid Terdekat</Text><Pressable onPress={loadMosques}><Ionicons name="refresh-outline" size={20} color={colors.primary} /></Pressable></View>
        <View style={[styles.mosqueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {location && mosques.length > 0 ? <NearbyMosqueMap location={location} mosques={mosques.slice(0, 5)} /> : null}
          {mosqueLoading ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} /> : mosques.length === 0 ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada data masjid di sekitar lokasi.</Text> : mosques.slice(0, 5).map((mosque) => (
            <Pressable key={mosque.id} onPress={() => openMosqueDirections(mosque)} style={[styles.mosqueRow, { borderBottomColor: colors.border }]}><View style={[styles.mosqueIcon, { backgroundColor: colors.success + '18' }]}><Ionicons name="location" size={21} color={colors.success} /></View><View style={{ flex: 1 }}><Text style={[styles.mosqueName, { color: colors.text }]} numberOfLines={1}>{mosque.name}</Text><Text style={[styles.mosqueMeta, { color: colors.textSecondary }]}><Ionicons name="navigate-outline" size={12} color={colors.primary} /> {formatDistance(mosque.distanceKm)}{mosque.address ? `  ·  ${mosque.address}` : ''}</Text></View><Ionicons name="map-outline" size={20} color={colors.primary} /></Pressable>
          ))}
          <Pressable onPress={() => openMosqueDirections()} style={[styles.mapsButton, { backgroundColor: colors.primary }]}><Ionicons name="map-outline" size={18} color="#FFF" /><Text style={styles.buttonText}>Buka Maps untuk Masjid Terdekat</Text></Pressable>
        </View>

        <Pressable onPress={() => router.push('/settings/' as any)} style={[styles.settingsLink, { backgroundColor: colors.surface }]}><Ionicons name="notifications-outline" size={20} color={colors.primary} /><Text style={[styles.settingsLinkText, { color: colors.primary }]}>Atur notifikasi adzan, motivasi, dan Riyadhoh</Text><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable>
      </ScrollView>
    </View>
  );
}

export default memo(SholatScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  nextCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  nextCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nextName: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  nextTime: { color: '#FFF', fontSize: 46, fontWeight: '800', marginTop: Spacing.sm },
  locationText: { color: 'rgba(255,255,255,0.82)', fontSize: FontSize.sm, marginTop: Spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
  prayerGrid: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  prayerLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prayerName: { fontSize: FontSize.md, fontWeight: '600' },
  prayerTime: { fontSize: FontSize.md, fontWeight: '800' },
  audioButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  degrees: { fontSize: FontSize.sm, fontWeight: '700' },
  qiblaCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md },
  compass: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  compassNorth: { position: 'absolute', top: 8, fontSize: 11, fontWeight: '800' },
  qiblaTitle: { fontSize: FontSize.md, fontWeight: '800' },
  qiblaDesc: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 },
  mosqueCard: { borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, overflow: 'hidden' },
  inlineMap: { height: 220, marginHorizontal: -Spacing.md, marginBottom: Spacing.sm },
  inlineMapFallback: { height: 220, marginHorizontal: -Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapFallbackText: { color: '#557984', fontSize: FontSize.sm, fontWeight: '700' },
  mosqueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  mosqueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mosqueName: { fontSize: FontSize.md, fontWeight: '700' },
  mosqueMeta: { fontSize: FontSize.xs, marginTop: 3 },
  mapsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 12, borderRadius: BorderRadius.md, marginVertical: Spacing.md },
  buttonText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '800' },
  settingsLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  settingsLinkText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  errorCard: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.sm, lineHeight: 19 },
  smallButton: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  emptyText: { padding: Spacing.lg, textAlign: 'center', fontSize: FontSize.sm },
});
