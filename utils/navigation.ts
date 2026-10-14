import { router } from 'expo-router';

// Kembali ke tab utama setelah login/daftar.
// - (tabs) sudah ada di bawah stack (mis. login dibuka dari Profil): cukup pop semua layar di atasnya.
//   dismissTo('/(tabs)') maupun replace ke (tabs) yang masih ter-mount mengirim ulang state ke tab navigator,
//   dan di Android Fabric itu crash "addViewAt: The specified child already has a parent".
// - (tabs) belum ada (alur onboarding → login): ganti layar ini dengan (tabs).
export function goToHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/(tabs)' as any);
}
