// Pengganti Alert berbasis Modal untuk kasus yang tidak didukung platform:
// - Web: react-native-web tidak mengimplementasikan Alert.alert / Alert.prompt (no-op).
// - Android: dialog bawaan hanya menampilkan maksimal 3 tombol (sisanya, sering kali "Batal", hilang dan
//   dialog tidak bisa ditutup), dan Alert.prompt tidak ada.
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type AlertButton } from 'react-native';
import { useColors } from '../store/appStore';

interface PendingAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  prompt?: { defaultValue: string; secure: boolean; onSubmit?: (value: string) => void };
}

let queue: PendingAlert[] = [];
let listener: ((items: PendingAlert[]) => void) | null = null;
let nextId = 1;

function push(item: Omit<PendingAlert, 'id'>) {
  queue = [...queue, { ...item, id: nextId++ }];
  listener?.(queue);
}

function shift() {
  queue = queue.slice(1);
  listener?.(queue);
}

const MAX_NATIVE_ANDROID_BUTTONS = 3;
const USE_HOST = Platform.OS === 'web' || Platform.OS === 'android';

if (USE_HOST) {
  const nativeAlert = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) => {
    if (Platform.OS === 'android' && (buttons?.length || 0) <= MAX_NATIVE_ANDROID_BUTTONS) {
      nativeAlert(title, message, buttons, options);
      return;
    }
    push({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
  };
  Alert.prompt = (title, message, callbackOrButtons, type, defaultValue) => {
    const onSubmit = typeof callbackOrButtons === 'function' ? callbackOrButtons : undefined;
    const buttons = Array.isArray(callbackOrButtons) && callbackOrButtons.length
      ? callbackOrButtons
      : [{ text: 'Batal', style: 'cancel' as const }, { text: 'OK' }];
    push({ title, message, buttons, prompt: { defaultValue: defaultValue || '', secure: type === 'secure-text', onSubmit } });
  };
}

export default function WebAlertHost() {
  const colors = useColors();
  const [items, setItems] = useState<PendingAlert[]>(queue);
  const [value, setValue] = useState(() => queue[0]?.prompt?.defaultValue || '');
  const current = items[0];

  useEffect(() => {
    listener = (next) => {
      setItems((previous) => {
        if (previous[0]?.id !== next[0]?.id) setValue(next[0]?.prompt?.defaultValue || '');
        return next;
      });
    };
    return () => {
      listener = null;
    };
  }, []);

  if (!USE_HOST || !current) return null;

  // Banyak pilihan (mis. alasan penolakan) lebih mudah dibaca bila tombol disusun ke bawah.
  const stacked = !current.prompt && current.buttons.length > 2;

  const press = (button: AlertButton) => {
    shift();
    if (current.prompt && button.style !== 'cancel') {
      if (current.prompt.onSubmit) current.prompt.onSubmit(value);
      else (button.onPress as ((text?: string) => void) | undefined)?.(value);
      return;
    }
    button.onPress?.();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => press(current.buttons.find((button) => button.style === 'cancel') || current.buttons[0])}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]} accessibilityRole="alert">
          <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
          {current.message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{current.message}</Text> : null}
          {current.prompt ? (
            <TextInput
              autoFocus
              value={value}
              onChangeText={setValue}
              secureTextEntry={current.prompt.secure}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          ) : null}
          <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
            {(stacked ? [...current.buttons].sort((a, b) => Number(a.style === 'cancel') - Number(b.style === 'cancel')) : current.buttons).map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                onPress={() => press(button)}
                style={[styles.button, stacked && styles.buttonStacked, button.style === 'cancel' ? { borderColor: colors.border, borderWidth: 1 } : { backgroundColor: button.style === 'destructive' ? '#E5484D' : colors.primary }]}
              >
                <Text style={[styles.buttonText, { color: button.style === 'cancel' ? colors.text : '#FFF' }]}>{button.text || 'OK'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 18, padding: 20 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  message: { fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, marginTop: 12, fontSize: 15 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  buttonsStacked: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonStacked: { alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
