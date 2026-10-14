import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { goToHome } from '../../utils/navigation';
import { memo, useCallback, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { ShimmerGold } from '../../components/ui/ShimmerGold';
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';

const LOGO_SPLASH = require('../../assets/images/logo-splash.png');

function LoginScreen() {
  const theme = useAppStore((s) => s.theme);
  const login = useAppStore((s) => s.login);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const colors = Colors[theme];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleForgotPassword = useCallback(() => {
    Alert.alert(
      'Lupa Password',
      'Hubungi admin NASUHA atau koordinator korda Anda untuk mereset password. Admin akan memberikan password sementara yang wajib diganti setelah login.',
      [
        { text: 'Kontak Korda', onPress: () => router.push('/korda' as any) },
        { text: 'OK' },
      ],
    );
  }, []);

  const handleLogin = useCallback(async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Error', 'Email/no. HP dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setLoading(false);
        Alert.alert('Error', result.error || 'Login gagal');
        return;
      }

      const user = useAppStore.getState().user;
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        Alert.alert('Selamat Datang Admin!', `Login sebagai ${user.email}\nRole: ${user.role === 'super_admin' ? 'Super Admin' : 'Admin'} NASUHA`);
      }
      setOnboarded(true);
      // Jangan reset `loading` di jalur sukses: re-render tombol saat layar sedang animasi keluar memicu
      // crash Fabric Android "addViewAt: child already has a parent". Layar ini toh di-unmount.
      goToHome();
      return;
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan saat login. Silakan coba lagi.');
    }
    setLoading(false);
  }, [identifier, password, login, setOnboarded]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={theme === 'dark' ? ['#0A1628', '#112240'] : ['#F0FAFF', '#CAF0F8']}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo & Branding */}
          <View style={styles.logoSection}>
            <Image source={LOGO_SPLASH} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.primary }]}>NASUHA App</Text>
            <Text style={[styles.tagline, { color: colors.gold }]}>Hijrah Bersama, Tumbuh Bersama</Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
            <ShimmerGold style={styles.shimmerTop} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Masuk</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Assalamu&apos;alaikum, silakan login</Text>

            {/* Email or phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email atau No. HP</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="nama@email.com atau 08xxxxxxxxx"
                  placeholderTextColor={colors.textMuted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
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
                  placeholder="Masukkan password"
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

            {/* Forgot Password */}
            <Pressable style={styles.forgotRow} onPress={handleForgotPassword}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Lupa password?</Text>
            </Pressable>

            {/* Login Button */}
            <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <LinearGradient
                colors={[colors.primary, '#0077B6']}
                style={[styles.loginBtn, loading && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {/* Struktur anak dibuat tetap (tidak ditukar) agar aman di Android Fabric. */}
                <Ionicons name={loading ? 'hourglass-outline' : 'log-in-outline'} size={20} color="#FFF" />
                <Text style={styles.loginText}>{loading ? 'Memuat...' : 'Masuk'}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerLabel, { color: colors.textSecondary }]}>Belum punya akun? </Text>
            <Pressable onPress={() => router.push('/(auth)/register' as any)}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Daftar Sekarang</Text>
            </Pressable>
          </View>

          {/* Guest */}
          <Pressable
            onPress={() => goToHome()}
            style={styles.guestRow}
          >
            <Text style={[styles.guestText, { color: colors.textMuted }]}>Masuk sebagai Tamu</Text>
          </Pressable>

          {/* Lihat Onboarding */}
          <Pressable
            onPress={() => router.push('/about' as any)}
            style={styles.onboardingRow}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.onboardingText, { color: colors.primary }]}>Lihat Tentang NASUHA App</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

export default memo(LoginScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { width: 88, height: 88, marginBottom: Spacing.md },
  appName: { fontSize: FontSize.xxxl, fontWeight: '900', letterSpacing: 2 },
  tagline: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  shimmerTop: { height: 3 },
  cardTitle: { fontSize: FontSize.xxl, fontWeight: '800', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  cardSub: { fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginTop: 4, marginBottom: Spacing.lg },

  inputGroup: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, gap: 10 },
  input: { flex: 1, fontSize: FontSize.md, height: 48 },
  forgotRow: { alignItems: 'flex-end', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  forgotText: { fontSize: FontSize.sm, fontWeight: '600' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.xl, gap: Spacing.sm },
  loginText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  registerLabel: { fontSize: FontSize.md },
  registerLink: { fontSize: FontSize.md, fontWeight: '700' },
  guestRow: { alignItems: 'center', marginTop: Spacing.md },
  guestText: { fontSize: FontSize.sm, fontWeight: '600' },
  onboardingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md, paddingBottom: Spacing.lg },
  onboardingText: { fontSize: FontSize.sm, fontWeight: '600' },
});
