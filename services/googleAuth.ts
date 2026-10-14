import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { GoogleCredential } from '../types';

WebBrowser.maybeCompleteAuthSession();

// ============================================================
// Google OAuth Client IDs — NASUHA App
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Buka https://console.cloud.google.com/
// 2. Buat project baru "NASUHA App" (atau pilih existing)
// 3. Aktifkan "Google People API" di Library
// 4. Buka APIs & Services → OAuth consent screen → External
//    - App name: NASUHA App
//    - Support email: dp.danihamdani@gmail.com
// 5. Buka Credentials → Create Credentials → OAuth client ID:
//    a) Web application:
//       - Name: NASUHA Web
//       - Tambahkan URL web production sebagai Authorized redirect URI
//       → Copy Client ID ke webClientId
//    b) Android:
//       - Name: NASUHA Android
//       - Package name: com.nasuha.nasjak
//       - SHA-1 debug/release saat ini: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
//       → Copy Client ID ke androidClientId
//    c) iOS:
//       - Name: NASUHA iOS
//       - Bundle ID: com.nasuha.nasjak
//       → Copy Client ID ke iosClientId
// ============================================================

// GANTI dengan Client ID dari Google Cloud Console:
export const GOOGLE_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '568981655947-igemuc5t057rhvsl1stb61t4jtvsue9g.apps.googleusercontent.com',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '568981655947-m7p0ij5p47pmdufv81lenipeg49hjpvh.apps.googleusercontent.com',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '568981655947-3h2qd6o7oboadupift9setm756spatd1.apps.googleusercontent.com',
};

export const GOOGLE_REDIRECT_URI = (() => {
  const nativeRedirect = 'nasjak://redirect';

  return AuthSession.makeRedirectUri({
    scheme: 'nasjak',
    path: 'redirect',
    native: nativeRedirect,
  });
})();

const isValidClientId = (clientId: string) => {
  const normalized = clientId.trim().toLowerCase();
  return normalized.includes('.apps.googleusercontent.com')
    && !normalized.startsWith('your_')
    && !normalized.startsWith('your-');
};
const hasValidConfig = Platform.select({
  android: isValidClientId(GOOGLE_CONFIG.androidClientId),
  ios: isValidClientId(GOOGLE_CONFIG.iosClientId),
  default: isValidClientId(GOOGLE_CONFIG.webClientId),
}) ?? false;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    language: 'id',
    selectAccount: true,
    scopes: ['openid', 'profile', 'email'],
    shouldAutoExchangeCode: true,
    redirectUri: GOOGLE_REDIRECT_URI,
    webClientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });

  return { request: hasValidConfig ? request : null, response, promptAsync, isConfigured: hasValidConfig };
}

/** Token dari respons Google untuk diverifikasi server (`POST /auth/google`). idToken diutamakan. */
export function getGoogleCredential(response: any): GoogleCredential | null {
  const idToken = response?.authentication?.idToken || response?.params?.id_token;
  const accessToken = response?.authentication?.accessToken || response?.params?.access_token;
  const credential: GoogleCredential = {
    idToken: typeof idToken === 'string' && idToken ? idToken : undefined,
    accessToken: typeof accessToken === 'string' && accessToken ? accessToken : undefined,
  };
  return credential.idToken || credential.accessToken ? credential : null;
}

export function getGoogleAuthError(response: any): string {
  const code = response?.error?.code
    || response?.errorCode
    || response?.params?.error;
  const descriptions: Record<string, string> = {
    access_denied:
      'Google menolak akses aplikasi. Buka Google Cloud Console > OAuth consent screen, ' +
      'ubah Publishing status menjadi In production atau tambahkan email ini ke Test users.',
    disallowed_useragent:
      'Google menolak browser yang digunakan. Jalankan aplikasi pada development build atau aplikasi produksi, bukan WebView/preview lama.',
    redirect_uri_mismatch:
      'Redirect URI tidak cocok. Pastikan callback nasjak://redirect dan scheme nasjak sudah ada di build terbaru.',
  };
  if (code && descriptions[code]) return descriptions[code];

  const fallbackMessage =
    'Login Google gagal. Biasanya ini karena redirect URI Google Cloud Console tidak cocok dengan app. ' +
    `Pastikan URI berikut sudah terdaftar: ${GOOGLE_REDIRECT_URI}`;

  return response?.error?.message
    || response?.params?.error_description
    || response?.params?.error
    || fallbackMessage;
}

export function getGoogleSetupHint(): string {
  return `Google OAuth perlu konfigurasi yang cocok dengan build ini.\n\n` +
    `Callback aplikasi: ${GOOGLE_REDIRECT_URI}\n\n` +
    'Jika OAuth consent screen masih Testing, tambahkan email Google ke Test users atau ubah status ke In production.';
}

export function isGoogleConfigured(): boolean {
  return hasValidConfig;
}
