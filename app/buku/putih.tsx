import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Buku bawaan; buku lain dikelola admin (CMS Buku) dan dikirim lewat parameter `url`.
const DEFAULT_FLIPBOOK_URL = 'https://online.fliphtml5.com/NASUHA_DIGITAL/eulx/#p=';
const NASUHA_LOGO = require('../../assets/images/logo-icon.png');

const buildAdBlockScript = (bookUrl: string) => `
(function () {
  const selectors = [
    '[id*="ad"]', '[class*="ad"]', '[id*="banner"]', '[class*="banner"]',
    '[id*="popup"]', '[class*="popup"]', '[id*="advert"]', '[class*="advert"]',
    '.sharebox', '.float-ad', '.adsbygoogle', 'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]', '[aria-label*="advertisement"]'
  ];
  const hideAds = () => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
      });
    });
    document.querySelectorAll('body > div').forEach((element) => {
      const style = window.getComputedStyle(element);
      if (style.position === 'fixed' && (Number.parseInt(style.zIndex, 10) > 10 || element.offsetHeight < 180)) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  };
  hideAds();
  new MutationObserver(hideAds).observe(document.documentElement, { childList: true, subtree: true });

  const blockCookiebot = () => {
    if (window.location.href.toLowerCase().includes('cookiebot.com')) {
      window.stop();
      window.location.replace(${JSON.stringify(bookUrl)});
      return;
    }
    document.querySelectorAll('iframe, script, link').forEach((element) => {
      const source = element.src || element.href || '';
      if (source.toLowerCase().includes('cookiebot.com') || source.toLowerCase().includes('cookiebot.eu')) {
        element.remove();
      }
    });
  };
  blockCookiebot();
  new MutationObserver(blockCookiebot).observe(document.documentElement, { childList: true, subtree: true });
})();
true;
`;

function allowBookRequest(request: { url: string }) {
  const blockedHosts = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adservice.google.com',
    'adsrvr.org',
    'cookiebot.com',
    'cookiebot.eu',
  ];
  const url = request.url.toLowerCase();
  return !url.startsWith('about:') && !blockedHosts.some((host) => url.includes(host));
}

function handleBookNavigation(request: { url: string }) {
  const url = request.url.toLowerCase();
  if (url.startsWith('about:') || url.includes('cookiebot.com') || url.includes('cookiebot.eu')) return false;
  return allowBookRequest(request);
}

function handleBookNavigationStateChange(navigation: { url: string }, webView: WebView | null, bookUrl: string) {
  const url = navigation.url.toLowerCase();
  if (url.startsWith('about:')) {
    webView?.stopLoading();
    return;
  }
  if (url.includes('cookiebot.com') || url.includes('cookiebot.eu')) {
    webView?.stopLoading();
    webView?.injectJavaScript(`window.location.replace(${JSON.stringify(bookUrl)}); true;`);
  }
}

function WhiteBookScreen() {
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const bookUrl = typeof params.url === 'string' && /^https:\/\//.test(params.url) ? params.url : DEFAULT_FLIPBOOK_URL;
  const bookTitle = typeof params.title === 'string' && params.title ? params.title : 'Buku Putih';
  const adBlockScript = useMemo(() => buildAdBlockScript(bookUrl), [bookUrl]);
  const allowedOrigins = useMemo(() => [new URL(bookUrl).origin, 'https://online.fliphtml5.com', 'https://*.fliphtml5.com'], [bookUrl]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DDF6FF', '#B9E5F7', '#8FD0EC']} style={styles.topFrame}>
        <View style={styles.topGlow} />
        <View style={styles.brandCluster}>
          <Image source={NASUHA_LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.eyebrow}>NASUHA DIGITAL</Text>
            <Text style={styles.topTitle} numberOfLines={1}>{bookTitle}</Text>
          </View>
        </View>
      </LinearGradient>
      <WebView
        ref={webViewRef}
        source={{ uri: bookUrl }}
        style={styles.webView}
        originWhitelist={allowedOrigins}
        injectedJavaScript={adBlockScript}
        injectedJavaScriptBeforeContentLoaded={adBlockScript}
        onShouldStartLoadWithRequest={handleBookNavigation}
        onNavigationStateChange={(navigation) => handleBookNavigationStateChange(navigation, webViewRef.current, bookUrl)}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState={false}
        setSupportMultipleWindows={false}
      />
      <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={10} accessibilityLabel="Keluar dari Buku Putih">
        <Ionicons name="close" size={20} color="#123B59" />
        <Text style={styles.closeButtonText}>Keluar</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/(tabs)' as any)} style={styles.homeButton} hitSlop={10} accessibilityLabel="Kembali ke menu utama">
        <Ionicons name="home" size={20} color="#FFFFFF" />
        <Text style={styles.homeButtonText}>Menu utama</Text>
      </Pressable>
      <LinearGradient colors={['#A9E2F5', '#6DBBDD', '#3D91C3']} style={styles.bottomFrame}>
        <View style={styles.goldLine} />
        <Text style={styles.bottomTitle}>Ayo jadi Manusia Pembelajar</Text>
        <Text style={styles.bottomSubtitle}>Baca, pahami, dan tumbuh bersama NASUHA</Text>
      </LinearGradient>
    </View>
  );
}

export default memo(WhiteBookScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topFrame: {
    height: 112,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#4CA8D4',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 2,
  },
  topGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: 22, top: -110, backgroundColor: 'rgba(255,255,255,0.35)' },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 44, height: 44 },
  eyebrow: { color: '#2B6687', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  topTitle: { color: '#123B59', fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
  webView: { flex: 1, backgroundColor: '#FFFFFF' },
  bottomFrame: {
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#D7A52C',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  goldLine: { position: 'absolute', top: 0, left: '18%', right: '18%', height: 2, backgroundColor: '#F8D77A', shadowColor: '#FFD65A', shadowOpacity: 0.95, shadowRadius: 8, elevation: 5 },
  bottomTitle: { color: '#073A5C', fontSize: 20, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,220,117,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  bottomSubtitle: { color: '#185A7C', fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.3 },
  closeButton: {
    position: 'absolute',
    left: 18,
    bottom: 98,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    zIndex: 5,
  },
  closeButtonText: { color: '#123B59', fontSize: 13, fontWeight: '800' },
  homeButton: {
    position: 'absolute',
    right: 18,
    bottom: 98,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976A8',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#0B4D70',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 5,
  },
  homeButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
