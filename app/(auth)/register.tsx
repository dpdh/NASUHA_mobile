import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { useGoogleAuth, fetchGoogleUserInfo, getGoogleAccessToken, getGoogleAuthError, getGoogleSetupHint } from '../../services/googleAuth';
import { syncGoogleProfile } from '../../services/userProvider';

const LOGO_SPLASH = require('../../assets/images/logo-splash.png');

function RegisterScreen() {
  const theme = useAppStore((s) => s.theme);
  const register = useAppStore((s) => s.register);
  const setUser = useAppStore((s) => s.setUser);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const colors = Colors[theme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { request, response, promptAsync, isConfigured } = useGoogleAuth();

  const handleGoogleSuccess = useCallback(async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      const userInfo = await fetchGoogleUserInfo(accessToken);
      if (!userInfo || !userInfo.email) {
        Alert.alert('Error', 'Tidak dapat mengambil informasi akun Google');
        setGoogleLoading(false);
        return;
      }

      const providerProfile = await syncGoogleProfile(accessToken, { id: userInfo.id, email: userInfo.email, name: userInfo.name || userInfo.email.split('@')[0], avatar: userInfo.picture });
      loginWithGoogle({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        avatar: userInfo.picture,
        backendToken: providerProfile?.backendToken,
        membershipType: providerProfile?.membershipType,
        membershipFeatures: providerProfile?.membershipFeatures,
      });

      router.replace('/(tabs)' as any);
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan saat mendaftar dengan Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle]);

  useEffect(() => {
    const accessToken = getGoogleAccessToken(response);
    if (response?.type === 'success' && accessToken) {
      handleGoogleSuccess(accessToken);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Pendaftaran Google gagal', getGoogleAuthError(response));
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [handleGoogleSuccess, response]);

  const handleGoogleRegister = useCallback(async () => {
    if (!isConfigured || !request) {
      Alert.alert(
        'Google Sign-Up Belum Aktif',
        `${getGoogleSetupHint()}\n\n` +
        'Pastikan juga file .env sudah berisi Client ID platform yang sesuai dan build ulang aplikasi.',
        [{ text: 'OK' }]
      );
      return;
    }
    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch {
      setGoogleLoading(false);
      Alert.alert('Pendaftaran Google gagal', 'Tidak dapat membuka halaman Google. Pastikan Chrome/Safari tersedia dan coba lagi.');
    }
  }, [promptAsync, isConfigured, request]);

  const handleRegister = useCallback(async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const result = await register(name, email, password, phone);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Pendaftaran gagal');
      return;
    }

    router.replace('/(tabs)' as any);
  }, [name, email, phone, password, confirmPassword, register]);

  const handleGuestAccess = useCallback(() => {
    setUser(null);
    router.replace('/(tabs)' as any);
  }, [setUser]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={theme === 'dark' ? ['#0A1628', '#112240'] : ['#F0FAFF', '#CAF0F8']}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image source={LOGO_SPLASH} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.primary }]}>NASJAK</Text>
          </View>

          {/* Register Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
            <ShimmerGold style={styles.shimmerTop} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daftar</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Bergabung dengan komunitas NASUHA Jakarta</Text>

            {/* Google Sign-Up Button */}
            <Pressable
              onPress={handleGoogleRegister}
              disabled={!request || googleLoading}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }, googleLoading && { opacity: 0.6 }]}>
                {googleLoading ? (
                  <Text style={[styles.googleBtnText, { color: colors.text }]}>Menghubungkan...</Text>
                ) : (
                  <>
                    <View style={styles.googleIconWrap}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                    <Text style={[styles.googleBtnText, { color: colors.text }]}>Daftar dengan Google</Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>atau daftar manual</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Lengkap</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>No. HP (untuk login dengan nomor)</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="08xxxxxxxxxx"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Konfirmasi Password</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ulangi password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Register Button */}
            <Pressable onPress={handleRegister} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <LinearGradient
                colors={[colors.gold, '#B8860B']}
                style={[styles.registerBtn, loading && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <Text style={styles.registerText}>Mendaftar...</Text>
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color="#FFF" />
                    <Text style={styles.registerText}>Daftar Sekarang</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleGuestAccess}
              style={({ pressed }) => [styles.guestBtn, { borderColor: colors.primary, backgroundColor: colors.overlay, opacity: pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Masuk sebagai tamu"
            >
              <Ionicons name="arrow-forward-circle-outline" size={21} color={colors.primary} />
              <Text style={[styles.guestText, { color: colors.primary }]}>Masuk sebagai Tamu</Text>
            </Pressable>
          </View>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={[styles.loginLabel, { color: colors.textSecondary }]}>Sudah punya akun? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Masuk</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

export default memo(RegisterScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  logoSection: { alignItems: 'center', marginBottom: Spacing.lg },
  logo: { width: 72, height: 72, marginBottom: Spacing.sm },
  appName: { fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: 2 },
  card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmerTop: { height: 3 },
  cardTitle: { fontSize: FontSize.xxl, fontWeight: '800', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  cardSub: { fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginTop: 4, marginBottom: Spacing.lg },

  // Google Button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleG: { fontSize: 15, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: FontSize.md, fontWeight: '600' },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: FontSize.sm },

  inputGroup: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, gap: 10 },
  input: { flex: 1, fontSize: FontSize.md, height: 48 },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.xl, gap: Spacing.sm },
  registerText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, paddingVertical: 13, borderRadius: BorderRadius.xl, borderWidth: 1.5, gap: Spacing.sm },
  guestText: { fontSize: FontSize.lg, fontWeight: '800' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg, paddingBottom: Spacing.lg },
  loginLabel: { fontSize: FontSize.md },
  loginLink: { fontSize: FontSize.md, fontWeight: '700' },
});
