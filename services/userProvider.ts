import type { User } from '../types';

export type UserMembershipType = NonNullable<User['membershipType']>;

export interface ProviderUserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  backendToken?: string;
  membershipType: UserMembershipType;
  membershipFeatures?: Record<string, boolean>;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');

export function isUserProviderConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export function normalizeMembershipType(value: unknown): UserMembershipType {
  if (value === 'membership' || value === 'sahabat') return value;
  return 'free';
}

export async function syncGoogleProfile(
  accessToken: string,
  googleProfile: { id: string; email: string; name: string; avatar?: string },
): Promise<ProviderUserProfile | null> {
  if (!API_BASE_URL) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        googleId: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        avatar: googleProfile.avatar,
      }),
    });

    if (!response.ok) throw new Error(`User provider error: ${response.status}`);
    const payload = await response.json();
    const data = payload.user ?? payload.data ?? payload;

    if (!data?.id || !data?.email) return null;
    return {
      id: String(data.id),
      email: String(data.email).trim().toLowerCase(),
      name: String(data.name || googleProfile.name),
      avatar: data.avatar || googleProfile.avatar,
      backendToken: typeof payload.token === 'string' ? payload.token : undefined,
      membershipType: normalizeMembershipType(data.membershipType),
      membershipFeatures: data.membershipFeatures,
    };
  } catch (error) {
    console.warn('[UserProvider] Profile sync failed; using local profile.', error);
    return null;
  }
}
