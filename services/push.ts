import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken } from './api';
import { meApi } from './nasjakApi';
import { getNotifications } from './nativeModules';

let registeredToken: string | null = null;

/**
 * Daftarkan Expo push token perangkat ini ke akun yang sedang login agar broadcast/notifikasi server sampai.
 * Tidak meminta izin di sini (izin diminta dari Pengaturan); bila izin belum ada atau token tidak bisa
 * didapat (mis. build tanpa kredensial FCM), dilewati diam-diam.
 */
export async function registerPushDevice(): Promise<void> {
  if (Platform.OS === 'web' || !getToken() || registeredToken) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!data) return;
    await meApi.registerDevice(data, Platform.OS);
    registeredToken = data;
  } catch (error) {
    console.log('[push] registrasi perangkat dilewati:', error instanceof Error ? error.message : error);
  }
}

/** Lepas push token dari akun sebelum logout supaya notifikasi akun lama tidak masuk ke perangkat ini. */
export async function unregisterPushDevice(): Promise<void> {
  if (!registeredToken || !getToken()) return;
  const token = registeredToken;
  registeredToken = null;
  await meApi.unregisterDevice(token).catch(() => {});
}
