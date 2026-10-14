import type { User } from '../types';

export const SUPER_ADMIN_EMAILS = ['dp.danihamdani@gmail.com', 'nasjak@gmail.com'];
export const ADMIN_EMAILS = ['admin@nasuha.id', 'admin@nasjak.id', 'wimba@nasjak.id', 'ashadi@nasjak.id'];
export const SAHABAT_EMAILS = ['david@nasjak.id'];

export function getRoleForEmail(email: string): User['role'] {
  if (SUPER_ADMIN_EMAILS.includes(email)) return 'super_admin';
  if (ADMIN_EMAILS.includes(email)) return 'admin';
  if (SAHABAT_EMAILS.includes(email)) return 'sahabat';
  return 'calon_sahabat';
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+62')) return `0${digits.slice(3)}`;
  if (digits.startsWith('62')) return `0${digits.slice(2)}`;
  return digits;
}
