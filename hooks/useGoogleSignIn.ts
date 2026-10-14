// Alur "Masuk/Daftar dengan Google" bersama untuk layar login & register.
// Token Google dikirim ke server (POST /auth/google) yang memverifikasi dan membuat/menautkan akun.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getGoogleAuthError, getGoogleCredential, getGoogleSetupHint, isGoogleConfigured, useGoogleAuth } from '../services/googleAuth';
import { useAppStore } from '../store/appStore';
import { goToHome } from '../utils/navigation';

export function useGoogleSignIn() {
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const [googleLoading, setGoogleLoading] = useState(false);
  const handledResponseRef = useRef(false);
  const { request, response, promptAsync } = useGoogleAuth();
  const configured = isGoogleConfigured();

  useEffect(() => {
    if (!response || handledResponseRef.current) return;
    if (response.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Login Google gagal', getGoogleAuthError(response));
      return;
    }
    if (response.type !== 'success') {
      // cancel / dismiss
      setGoogleLoading(false);
      return;
    }
    const credential = getGoogleCredential(response);
    if (!credential) {
      setGoogleLoading(false);
      Alert.alert('Login Google gagal', 'Google tidak mengirim token login. Silakan coba lagi.');
      return;
    }
    handledResponseRef.current = true;
    void (async () => {
      const result = await loginWithGoogle(credential);
      if (!result.success) {
        handledResponseRef.current = false;
        setGoogleLoading(false);
        Alert.alert('Login Google gagal', result.error || 'Terjadi kesalahan saat login Google. Silakan coba lagi.');
        return;
      }
      const user = useAppStore.getState().user;
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        Alert.alert('Selamat Datang Admin!', `Login Google sebagai ${user.email}\nRole: ${user.role === 'super_admin' ? 'Super Admin' : 'Admin'} NASUHA`);
      } else if (result.isNewUser) {
        Alert.alert('Alhamdulillah!', 'Akun NASUHA Anda sudah dibuat dari akun Google. Lengkapi profil di menu Profil.');
      }
      setOnboarded(true);
      // Sama seperti login password: `googleLoading` tidak di-reset di jalur sukses karena re-render saat layar
      // sedang animasi keluar memicu crash Fabric Android "addViewAt: child already has a parent".
      goToHome();
    })();
  }, [response, loginWithGoogle, setOnboarded]);

  const signInWithGoogle = useCallback(async () => {
    if (!configured || !request) {
      Alert.alert('Google Sign-In Belum Aktif', getGoogleSetupHint());
      return;
    }
    handledResponseRef.current = false;
    setGoogleLoading(true);
    try {
      await promptAsync({ showInRecents: true });
    } catch {
      setGoogleLoading(false);
      Alert.alert('Login Google gagal', 'Tidak dapat membuka halaman login Google. Pastikan Chrome/Safari tersedia dan coba lagi.');
    }
  }, [configured, request, promptAsync]);

  return { googleLoading, signInWithGoogle };
}
