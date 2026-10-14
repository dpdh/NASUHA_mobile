import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { contentApi } from '../../services/nasjakApi';
import type { Korda } from '../../types';

const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'] as const;

// Backend menyimpan YYYY-MM-DD; form memakai DD/MM/YYYY.
function toDisplayDate(value?: string | null) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function EditProfileScreen() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const uploadAvatar = useAppStore((s) => s.uploadAvatar);
  const removeAvatar = useAppStore((s) => s.removeAvatar);
  const references = useAppStore((s) => s.references);
  const colors = Colors[theme];

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [gender, setGender] = useState<'laki-laki' | 'perempuan' | undefined>(user?.gender || undefined);
  const [birthDate, setBirthDate] = useState(toDisplayDate(user?.birthDate));
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [nasuhaRegion, setNasuhaRegion] = useState(user?.nasuhaRegion || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [kordas, setKordas] = useState<Korda[]>(references?.kordas || []);

  useEffect(() => {
    if (kordas.length) return;
    contentApi.kordas().then(setKordas).catch(() => {});
  }, [kordas.length]);

  const selectedKorda = kordas.find((korda) => korda.id === nasuhaRegion);

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    const permMethod = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { granted } = await permMethod();
    if (!granted) {
      Alert.alert('Izin Diperlukan', `Izinkan akses ${source === 'camera' ? 'kamera' : 'galeri'} untuk mengambil foto profil.`);
      return;
    }

    const launchMethod = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await launchMethod({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatar('');
  }, []);

  const handlePickAvatar = useCallback(() => {
    const hasPhoto = !!avatar;
    if (Platform.OS === 'ios') {
      const options = hasPhoto
        ? ['Batal', 'Ambil Foto', 'Pilih dari Galeri', 'Hapus Foto']
        : ['Batal', 'Ambil Foto', 'Pilih dari Galeri'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, destructiveButtonIndex: hasPhoto ? 3 : undefined },
        (idx) => {
          if (idx === 1) pickImage('camera');
          else if (idx === 2) pickImage('gallery');
          else if (idx === 3 && hasPhoto) handleRemoveAvatar();
        },
      );
    } else {
      const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
        { text: 'Kamera', onPress: () => pickImage('camera') },
        { text: 'Galeri', onPress: () => pickImage('gallery') },
      ];
      if (hasPhoto) buttons.push({ text: 'Hapus Foto', onPress: handleRemoveAvatar, style: 'destructive' });
      buttons.push({ text: 'Batal', style: 'cancel' });
      Alert.alert('Foto Profil', 'Pilih sumber foto', buttons);
    }
  }, [pickImage, handleRemoveAvatar, avatar]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        gender: gender || null,
        birthDate: birthDate.trim() || null,
        occupation: occupation.trim() || null,
        nasuhaRegion: nasuhaRegion || null,
      });
      if (!result.success) {
        Alert.alert('Gagal Menyimpan', result.error || 'Profil gagal diperbarui');
        return;
      }

      const currentAvatar = user?.avatar || '';
      if (avatar && avatar !== currentAvatar) {
        const upload = await uploadAvatar(avatar);
        if (!upload.success) {
          Alert.alert('Foto Gagal Diunggah', upload.error || 'Data profil tersimpan, tetapi foto gagal diunggah.');
          return;
        }
      } else if (!avatar && currentAvatar) {
        const removal = await removeAvatar();
        if (!removal.success) {
          Alert.alert('Foto Gagal Dihapus', removal.error || 'Data profil tersimpan, tetapi foto gagal dihapus.');
          return;
        }
      }

      Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  }, [name, phone, bio, city, address, gender, birthDate, occupation, nasuhaRegion, avatar, user?.avatar, updateProfile, uploadAvatar, removeAvatar]);

  const [showRegionPicker, setShowRegionPicker] = useState(false);

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profil</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={[styles.saveBtn, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={[colors.primary, '#0077B6']} style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#FFF" />
              </LinearGradient>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: colors.gold }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </Pressable>
          <Pressable onPress={handlePickAvatar}>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Ubah Foto Profil</Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>INFORMASI DASAR</Text>

          <FieldInput label="Nama Lengkap" value={name} onChangeText={setName} icon="person-outline" colors={colors} required />
          <FieldInput label="Email" value={user.email} icon="mail-outline" colors={colors} editable={false} />
          <FieldInput label="No. HP" value={phone} onChangeText={setPhone} icon="call-outline" colors={colors} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" />
          <FieldInput label="Tanggal Lahir" value={birthDate} onChangeText={setBirthDate} icon="calendar-outline" colors={colors} placeholder="DD/MM/YYYY" />

          {/* Gender Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Jenis Kelamin</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => {
                const val = opt.toLowerCase() as 'laki-laki' | 'perempuan';
                const isSelected = gender === val;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setGender(val)}
                    style={[
                      styles.genderChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons name={val === 'laki-laki' ? 'male' : 'female'} size={16} color={isSelected ? '#FFF' : colors.textSecondary} />
                    <Text style={[styles.genderText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FieldInput label="Pekerjaan" value={occupation} onChangeText={setOccupation} icon="briefcase-outline" colors={colors} placeholder="Contoh: Wiraswasta" />
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>ALAMAT & WILAYAH</Text>

          <FieldInput label="Kota" value={city} onChangeText={setCity} icon="business-outline" colors={colors} placeholder="Contoh: Jakarta Timur" />
          <FieldInput label="Alamat Lengkap" value={address} onChangeText={setAddress} icon="location-outline" colors={colors} placeholder="Jl. ..." multiline />

          {/* Region Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Korda NASUHA</Text>
            <Pressable
              onPress={() => setShowRegionPicker(!showRegionPicker)}
              style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="map-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.pickerText, { color: nasuhaRegion ? colors.text : colors.textMuted }]}>
                {selectedKorda?.label || nasuhaRegion || 'Pilih korda NASUHA'}
              </Text>
              <Ionicons name={showRegionPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </Pressable>
            {showRegionPicker && (
              <View style={[styles.regionList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {kordas.length === 0 && (
                  <Text style={[styles.regionText, { color: colors.textMuted, padding: Spacing.md }]}>Memuat daftar korda...</Text>
                )}
                {nasuhaRegion ? (
                  <Pressable
                    onPress={() => { setNasuhaRegion(''); setShowRegionPicker(false); }}
                    style={styles.regionItem}
                  >
                    <Text style={[styles.regionText, { color: colors.textMuted }]}>Kosongkan pilihan</Text>
                  </Pressable>
                ) : null}
                {kordas.map((korda) => (
                  <Pressable
                    key={korda.id}
                    onPress={() => { setNasuhaRegion(korda.id); setShowRegionPicker(false); }}
                    style={[styles.regionItem, nasuhaRegion === korda.id && { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[styles.regionText, { color: nasuhaRegion === korda.id ? colors.primary : colors.text }]}>{korda.label}</Text>
                    {nasuhaRegion === korda.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>TENTANG SAYA</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.bioInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Ceritakan tentang diri Anda..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{bio.length}/200</Text>
          </View>
        </View>

        {/* User Database Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Data Aman</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Data profil tersimpan di server NASUHA dan tersinkron di semua perangkat Anda.{user.memberNumber ? ` No. anggota: ${user.memberNumber}` : ''}
            </Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Bergabung sejak: {new Date(user.joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Reusable input field
const FieldInput = memo(({
  label, value, onChangeText, icon, colors, editable = true, keyboardType, placeholder, multiline, required,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: typeof Colors.light;
  editable?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}) => (
  <View style={styles.fieldGroup}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
      {label}{required ? ' *' : ''}
    </Text>
    <View style={[styles.fieldBox, { backgroundColor: editable ? colors.surface : colors.border + '40', borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.fieldInput, { color: editable ? colors.text : colors.textMuted }]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        autoCorrect={false}
      />
    </View>
  </View>
));

FieldInput.displayName = 'FieldInput';

export default memo(EditProfileScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  saveBtn: { fontSize: FontSize.md, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: 100 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarWrap: { position: 'relative', marginBottom: Spacing.sm },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  changePhotoText: { fontSize: FontSize.md, fontWeight: '600' },

  // Form
  formCard: {
    borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.md },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, minHeight: 48, borderWidth: 1, gap: 10,
  },
  fieldInput: { flex: 1, fontSize: FontSize.md, minHeight: 48 },

  // Gender
  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  genderText: { fontSize: FontSize.md, fontWeight: '600' },

  // Bio
  bioInput: {
    borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md,
    fontSize: FontSize.md, minHeight: 100, lineHeight: 22,
  },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: 4 },

  // Region Picker
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, gap: 10,
  },
  pickerText: { flex: 1, fontSize: FontSize.md },
  regionList: {
    marginTop: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden',
  },
  regionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  regionText: { fontSize: FontSize.md },

  // Info
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md,
    borderRadius: BorderRadius.lg, gap: Spacing.sm, marginTop: Spacing.sm,
  },
  infoTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  infoText: { fontSize: FontSize.xs, lineHeight: 16, marginTop: 2 },
});
