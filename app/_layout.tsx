import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import AlertHost from '../components/AlertHost';
import { getColors } from '../constants/theme';
import { getNotifications } from '../services/nativeModules';
import { useAppStore } from '../store/appStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Notifications = getNotifications();

// Catatan: jangan set initialRouteName = 'onboarding'. Itu membuat layar onboarding (dengan banyak
// animasi loop native) selalu tertinggal di bawah stack dan membuat UI thread Android tersendat (ANR).
// Redirect ke onboarding untuk user baru sudah ditangani effect di bawah.

function FloatingBackButton({ visible, color }: { visible: boolean; color: string }) {
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.floatingLayer}>
      <Pressable
        accessibilityLabel="Kembali"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
        style={({ pressed }) => [styles.floatingBack, { backgroundColor: color, opacity: pressed ? 0.78 : 1 }]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </Pressable>
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

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
  const user = useAppStore((s) => s.user);
  const hydrate = useAppStore((s) => s.hydrate);
  const segments = useSegments();
  const colors = getColors(colorScheme)[theme];
  const [ready, setReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Lateef-Regular': require('../assets/fonts/Lateef-Regular.ttf'),
    'Lateef-Bold': require('../assets/fonts/Lateef-Bold.ttf'),
  });
  const appReady = ready && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    // Ready setelah hydrate supaya redirect onboarding tidak memakai state default.
    hydrate()
      .catch(() => {
        // Data hydration is best effort; startup should not be blocked by persistence issues.
      })
      .finally(() => setReady(true));
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS !== 'web' && ready && (fontsLoaded || Boolean(fontError))) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded, fontError]);

  useEffect(() => {
    if (!appReady) return;

    const segmentList = Array.isArray(segments) ? (segments as string[]) : [];
    const currentGroup = segmentList[0] ?? '';
    const currentPath = '/' + segmentList.join('/');
    const isOnboardingRoute = currentGroup === 'onboarding';
    const isAdminRoute = currentGroup === 'admin' || currentPath.startsWith('/admin');
    const isAdminWebRoute = currentGroup === 'admin-web' || currentPath.startsWith('/admin-web');
    const canAccessCms = user?.role === 'super_admin' || user?.role === 'admin';

    if (!isOnboarded) {
      if (!isOnboardingRoute) router.replace('/onboarding' as any);
      return;
    }

    // Tamu boleh menjelajah (fitur yang butuh akun meminta login sendiri). Layar login/daftar menavigasi
    // sendiri setelah sukses (goToHome); redirect ganda di sini memicu crash Fabric Android.
    if (isAdminWebRoute && user?.role !== 'super_admin') {
      router.replace('/(tabs)' as any);
      return;
    }
    if (isAdminRoute && !canAccessCms) {
      router.replace('/(tabs)' as any);
    }
  }, [appReady, isOnboarded, user, segments]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications?.addNotificationResponseReceivedListener) return undefined;
    const openNotificationTarget = (response: any) => {
      const kind = response?.notification?.request?.content?.data?.kind;
      const targets: Record<string, string> = {
        adhan: '/sholat/',
        riyadhoh: '/riyadhoh/',
        motivasi: '/motivasi/',
        istighfar: '/doa/',
        dzikir: '/doa/',
        shalawat: '/doa/',
        spiritual: '/riyadhoh/',
        debt: '/debt-repayment/',
        taubat: '/doa/',
        dhuha: '/sholat/',
        tahajud: '/sholat/',
      };
      const target = typeof kind === 'string' ? targets[kind] : undefined;
      if (target) router.push(target as any);
    };

    Notifications.getLastNotificationResponseAsync?.().then((response: any) => {
      if (response) openNotificationTarget(response);
    }).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationTarget);
    return () => subscription.remove();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
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
        <Stack.Screen name="admin-web" />
        <Stack.Screen name="social/index" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="sholat/index" />
        <Stack.Screen name="debt-repayment/index" />
        <Stack.Screen name="grup-ibadah/index" />
        <Stack.Screen name="search/index" />
        <Stack.Screen name="artikel/index" />
        <Stack.Screen name="buku/index" />
        <Stack.Screen name="buku/putih" />
        <Stack.Screen name="kisah/index" />
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
      <FloatingBackButton
        visible={Boolean(segments[0] && segments[0] !== '(tabs)' && segments[0] !== '(auth)' && segments[0] !== 'onboarding')}
        color={colors.primary}
      />
      <AlertHost />
    </>
  );
}

const styles = StyleSheet.create({
  floatingLayer: { position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'flex-start', paddingLeft: 18, zIndex: 100 },
  floatingBack: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 5px 14px rgba(0,0,0,0.22)', elevation: 8 },
});
