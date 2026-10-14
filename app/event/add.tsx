import React from 'react';
import { useAppStore } from '../../store/appStore';
import { AccessDenied, EventForm } from '../../components/EventForm';

export default function EventAddScreen() {
  const isStaff = useAppStore((s) => s.isStaff);
  useAppStore((s) => s.user);
  if (!isStaff()) return <AccessDenied />;
  return <EventForm />;
}
