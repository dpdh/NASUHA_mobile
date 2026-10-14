import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getNotifications } from './nativeModules';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications || Platform.OS === 'web') return null;

  const current = await Notifications.getPermissionsAsync();
  const permissions = current.granted
    ? current
    : await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });

  if (!permissions.granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS projectId belum dikonfigurasi.');

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}