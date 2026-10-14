import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { BorderRadius, FontSize, Shadows, Spacing, getColors } from '../../constants/theme';
import { fetchNearbyMosques, fetchPrayerTimes, formatDistance, getCurrentPrayerLocation, getPrayerEntries, getQiblaBearing, NEARBY_MOSQUE_RADIUS_METERS, requestNotificationPermission, rescheduleNotifications, type NearbyMosque, type PrayerTimes } from '../../services/prayer';
import type { PrayerLocation } from '../../types';
import { getMaps } from '../../services/nativeModules';

const ADHAN_AUDIO_URL = 'https://www.islamcan.com/audio/adhan/azan1.mp3';
const mapsModule = getMaps();

const NearbyMosqueMap = memo(function NearbyMosqueMap({ location, mosques }: { location: PrayerLocation; mosques: NearbyMosque[] }) {
  // Titik "lokasi saya" hanya boleh aktif bila izin lokasi sudah diberikan; tanpa izin Google Maps Android
  // melempar SecurityException dan app tertutup.
  const [locationPermission] = Location.useForegroundPermissions();
  const showMyLocation = Boolean(locationPermission?.granted);
  const markers = useMemo(() => mosques.map((mosque) => ({
    id: mosque.id,
    coordinates: { latitude: mosque.latitude, longitude: mosque.longitude },
    title: mosque.name,
    snippet: mosque.address || 'Masjid terdekat',
    showCallout: true,
    zIndex: 2,
  })), [mosques]);
  const circle = useMemo(() => ({
    id: 'mosque-search-radius',
    center: { latitude: location.latitude, longitude: location.longitude },
    radius: NEARBY_MOSQUE_RADIUS_METERS,
    color: 'rgba(0, 119, 182, 0.12)',
    lineColor: 'rgba(0, 119, 182, 0.72)',
    lineWidth: 2,
  }), [location.latitude, location.longitude]);

  if (!mapsModule) {
    return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta aktif pada development build</Text></View>;
  }

  if (Platform.OS === 'android') {
    const GoogleMaps = mapsModule.GoogleMaps;
    if (!GoogleMaps?.View) {
      return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta tidak tersedia pada perangkat ini</Text></View>;
    }
    return <GoogleMaps.View style={styles.inlineMap} cameraPosition={{ coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 15 }} markers={markers} circles={[circle]} properties={{ isMyLocationEnabled: showMyLocation, mapType: 'NORMAL', selectionEnabled: true }} uiSettings={{ compassEnabled: false, zoomControlsEnabled: false, scaleBarEnabled: true, scrollGesturesEnabled: true, zoomGesturesEnabled: true, rotationGesturesEnabled: false, tiltGesturesEnabled: false }} />;
  }

  const AppleMaps = mapsModule.AppleMaps;
  if (!AppleMaps?.View) {
    return <View style={[styles.inlineMapFallback, { backgroundColor: '#E8F0F0' }]}><Ionicons name="map-outline" size={28} color="#739AA6" /><Text style={styles.mapFallbackText}>Peta tidak tersedia pada perangkat ini</Text></View>;
  }
  return <AppleMaps.View style={styles.inlineMap} cameraPosition={{ coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 15 }} markers={markers.map((marker) => ({ ...marker, systemImage: 'building.columns', tintColor: '#0077B6' }))} circles={[circle]} properties={{ isMyLocationEnabled: showMyLocation, mapType: 'STANDARD', selectionEnabled: true }} uiSettings={{ compassEnabled: false, scaleBarEnabled: true }} />;
});

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
  const [heading, setHeading] = useState<number | null>(null);
  const [headingError, setHeadingError] = useState(false);
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

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let subscription: Location.LocationSubscription | undefined;
    Location.watchHeadingAsync((nextHeading) => {
      const nextValue = nextHeading.trueHeading >= 0 ? nextHeading.trueHeading : nextHeading.magHeading;
      setHeading(Number.isFinite(nextValue) ? nextValue : null);
      setHeadingError(nextHeading.accuracy === 0);
    }, () => setHeadingError(true)).then((nextSubscription) => {
      subscription = nextSubscription;
    }).catch(() => setHeadingError(true));
    return () => subscription?.remove();
  }, []);

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
  const qiblaRelativeBearing = qiblaBearing === null || heading === null ? qiblaBearing : (qiblaBearing - heading + 360) % 360;

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
        <Pressable onPress={() => router.back()} hitSlop={14} style={styles.headerButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Waktu Shalat</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{location?.city || 'Lokasi belum diatur'}</Text>
        </View>
        <Pressable onPress={() => loadPrayerData(true)} hitSlop={14} style={styles.headerButton}><Ionicons name="refresh" size={22} color={colors.primary} /></Pressable>
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

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Jadwal Hari Ini</Text><Pressable onPress={enableAdhan} hitSlop={8} style={styles.sectionAction}><Ionicons name="notifications-outline" size={15} color={colors.primary} /><Text style={[styles.linkText, { color: colors.primary }]}>Aktifkan Adzan</Text></Pressable></View>
        <View style={[styles.prayerGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} /> : getPrayerEntries(times || ({} as PrayerTimes)).map((entry) => (
            <View key={entry.key} style={[styles.prayerRow, entry.key === nextPrayer?.key && { backgroundColor: colors.primary + '12' }]}> 
              <View style={styles.prayerLabel}><Ionicons name={entry.key === nextPrayer?.key ? 'radio-button-on' : 'radio-button-off'} size={16} color={entry.key === nextPrayer?.key ? colors.primary : colors.textMuted} /><Text style={[styles.prayerName, { color: colors.text }]}>{entry.label}</Text></View><Text style={[styles.prayerTime, { color: entry.key === nextPrayer?.key ? colors.primary : colors.textSecondary }]}>{entry.time}</Text><Pressable onPress={() => toggleAdhanPreview(String(entry.key))} hitSlop={8} style={[styles.audioButton, { backgroundColor: colors.primary + '15' }]}><Ionicons name={playingPrayer === String(entry.key) && adhanStatus.playing ? 'pause' : 'volume-high-outline'} size={18} color={colors.primary} /></Pressable>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Arah Kiblat</Text><Text style={[styles.degrees, { color: colors.gold }]}>{qiblaBearing !== null ? `${qiblaBearing}° dari Utara` : '--'}</Text></View>
        <View style={[styles.qiblaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.compass, { borderColor: colors.gold }]}>
            <View style={styles.compassTicks}><Text style={[styles.compassNorth, { color: colors.textMuted }]}>U</Text><Text style={[styles.compassEast, { color: colors.textMuted }]}>T</Text><Text style={[styles.compassSouth, { color: colors.textMuted }]}>S</Text><Text style={[styles.compassWest, { color: colors.textMuted }]}>B</Text></View>
            <View style={[styles.compassNeedle, { transform: [{ rotate: `${qiblaRelativeBearing || 0}deg` }] }]}><Ionicons name="navigate" size={58} color={colors.gold} /></View>
            <View style={[styles.compassCenter, { backgroundColor: colors.primary }]} />
          </View>
          <View style={{ flex: 1 }}><Text style={[styles.qiblaTitle, { color: colors.text }]}>Arah menuju Ka'bah</Text><Text style={[styles.qiblaDesc, { color: colors.textSecondary }]}>{headingError ? 'Kompas perlu dikalibrasi. Gerakkan perangkat membentuk angka delapan.' : heading === null ? 'Mengaktifkan sensor kompas...' : `Hadap panah ke atas. Arah perangkat ${Math.round(heading)}° dari Utara.`}</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Masjid Terdekat</Text><Pressable onPress={loadMosques}><Ionicons name="refresh-outline" size={20} color={colors.primary} /></Pressable></View>
        <View style={[styles.mosqueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {location && mosques.length > 0 ? <>
            <View style={styles.mapCaption}>
              <View style={styles.mapCaptionTitle}><Ionicons name="map-outline" size={16} color={colors.primary} /><Text style={[styles.mapCaptionText, { color: colors.text }]}>Peta masjid dalam radius 1 km</Text></View>
              <Text style={[styles.mapCaptionMeta, { color: colors.textSecondary }]}>{mosques.length} lokasi ditemukan</Text>
            </View>
            <NearbyMosqueMap location={location} mosques={mosques} />
          </> : null}
          {mosqueLoading ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} /> : mosques.length === 0 ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada data masjid dalam radius 1 km.</Text> : mosques.map((mosque) => (
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
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, gap: Spacing.sm },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.xs },
  nextCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  nextCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nextName: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  nextTime: { color: '#FFF', fontSize: 46, fontWeight: '800', marginTop: Spacing.sm },
  locationText: { color: 'rgba(255,255,255,0.82)', fontSize: FontSize.sm, marginTop: Spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.sm, minHeight: 28 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
  prayerGrid: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  prayerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: Spacing.md, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  prayerLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prayerName: { fontSize: FontSize.md, fontWeight: '600' },
  prayerTime: { width: 62, textAlign: 'right', fontSize: FontSize.md, fontWeight: '800' },
  audioButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  degrees: { fontSize: FontSize.sm, fontWeight: '700' },
  qiblaCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md },
  compass: { width: 124, height: 124, borderRadius: 62, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,168,83,0.06)' },
  compassTicks: { ...StyleSheet.absoluteFill },
  compassNorth: { position: 'absolute', top: 8, left: 57, fontSize: 11, fontWeight: '900' },
  compassEast: { position: 'absolute', right: 9, top: 55, fontSize: 11, fontWeight: '900' },
  compassSouth: { position: 'absolute', bottom: 8, left: 57, fontSize: 11, fontWeight: '900' },
  compassWest: { position: 'absolute', left: 9, top: 55, fontSize: 11, fontWeight: '900' },
  compassNeedle: { alignItems: 'center', justifyContent: 'center', width: 76, height: 76 },
  compassCenter: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  qiblaTitle: { fontSize: FontSize.md, fontWeight: '800' },
  qiblaDesc: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 },
  mosqueCard: { borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, overflow: 'hidden' },
  mapCaption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  mapCaptionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapCaptionText: { fontSize: FontSize.sm, fontWeight: '800' },
  mapCaptionMeta: { fontSize: FontSize.xs },
  inlineMap: { alignSelf: 'stretch', aspectRatio: 1.35, marginHorizontal: -Spacing.md, marginBottom: Spacing.sm },
  inlineMapFallback: { alignSelf: 'stretch', aspectRatio: 1.35, marginHorizontal: -Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 8 },
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
