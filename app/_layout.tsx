import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AlertHost from '../components/AlertHost';
import { getColors } from '../constants/theme';
import { getNotifications } from '../services/nativeModules';
import { useAppStore } from '../store/appStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Notifications = getNotifications();

// Catatan: jangan set initialRouteName = 'onboarding'. Itu membuat layar onboarding (dengan banyak
// animasi loop native) selalu tertinggal di bawah stack dan membuat UI thread Android tersendat (ANR).
// Redirect ke onboarding untuk user baru sudah ditangani effect di bawah.

try {
  Notifications?.setNotificationHandler?.({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
} catch {
  // Notification support is optional; startup must remain available without it.
}

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const hydrate = useAppStore((s) => s.hydrate);
  const segments = useSegments();
  const colors = getColors(colorScheme)[theme];
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'Lateef-Regular': require('../assets/fonts/Lateef-Regular.ttf'),
    'Lateef-Bold': require('../assets/fonts/Lateef-Bold.ttf'),
  });

  useEffect(() => {
    // Ready setelah hydrate supaya redirect onboarding tidak memakai state default.
    hydrate()
      .catch(() => {
        // Data hydration is best effort; startup should not be blocked by persistence issues.
      })
      .finally(() => setReady(true));
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS !== 'web' && ready && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded]);

  useEffect(() => {
    if (!ready) return;
    const currentGroup = segments[0] ?? '';
    const isOnboardingRoute = currentGroup === 'onboarding';
    const isAuthRoute = currentGroup === '(auth)';

    if (!isOnboarded) {
      if (!isOnboardingRoute) router.replace('/onboarding' as any);
      return;
    }

    if (isOnboardingRoute || isAuthRoute) {
      return;
    }
  }, [ready, isOnboarded, segments]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications?.addNotificationResponseReceivedListener) return undefined;
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const kind = response.notification.request.content.data?.kind;
      if (kind === 'adhan' || kind === 'riyadhoh') router.push('/sholat/' as any);
      if (kind === 'motivasi') router.push('/motivasi/' as any);
    });
    return () => subscription.remove();
  }, []);

  if (!ready || !fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="about" />
        <Stack.Screen name="quran/[id]" />
        <Stack.Screen name="doa/index" />
        <Stack.Screen name="bookmarks/index" />
        <Stack.Screen name="hadis/[id]" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/add" />
        <Stack.Screen name="event/edit/[id]" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="social/index" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="sholat/index" />
        <Stack.Screen name="search/index" />
        <Stack.Screen name="artikel/index" />
        <Stack.Screen name="motivasi/[categoryId]" />
        <Stack.Screen name="motivasi/article/[id]" />
        <Stack.Screen name="lapak/index" />
        <Stack.Screen name="lapak/[id]" />
        <Stack.Screen name="lapak/add" />
        <Stack.Screen name="lapak/edit/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="asisten/index" />
        <Stack.Screen name="testimoni/add" />
        <Stack.Screen name="tanya/index" />
        <Stack.Screen name="tanya/add" />
        <Stack.Screen name="tanya/[id]" />
        <Stack.Screen name="kegiatan/index" />
        <Stack.Screen name="korda/index" />
        <Stack.Screen name="kfm/index" />
        <Stack.Screen name="infaq/index" />
      </Stack>
      <AlertHost />
    </>
  );
}
