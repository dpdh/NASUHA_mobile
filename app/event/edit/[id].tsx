import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../../store/appStore';
import { Colors } from '../../../constants/theme';
import { useApiQuery } from '../../../hooks/useApiQuery';
import { adminApi } from '../../../services/nasjakApi';
import { AccessDenied, EventForm } from '../../../components/EventForm';

export default function EventEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppStore((s) => s.theme);
  const isStaff = useAppStore((s) => s.isStaff);
  const user = useAppStore((s) => s.user);
  const colors = Colors[theme];
  const staff = isStaff();
  const { data: event, loading } = useApiQuery(() => adminApi.event(String(id)), [id, user?.id], { enabled: staff });

  if (!staff) return <AccessDenied />;
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!event) return <AccessDenied message="Event Tidak Ditemukan" icon="calendar-outline" />;
  return <EventForm key={event.id} existing={event} />;
}
