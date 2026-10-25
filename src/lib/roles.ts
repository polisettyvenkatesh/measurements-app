import type { UserProfile } from './types';

export function roleTitle(profile: { role: UserProfile['role']; business_id: string | null }): string {
  if (profile.role === 'admin') {
    return profile.business_id ? 'Business Admin' : 'Super Admin';
  }
  return 'User';
}

export function isSuperAdmin(profile: { role: UserProfile['role']; business_id: string | null }): boolean {
  return profile.role === 'admin' && !profile.business_id;
}

export function isAdminRole(profile: { role: UserProfile['role'] }): boolean {
  return profile.role === 'admin';
}