import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'blocked' | 'unknown';

/*
 * Only notifications are requested: alerts are a core feature. The app
 * asks for nothing it doesn't use (Play policy), so no location, contacts
 * or storage.
 */

const needsRuntimeNotifications = Platform.OS === 'android' && Number(Platform.Version) >= 33;

export async function notificationStatus(): Promise<PermissionState> {
  if (!needsRuntimeNotifications) return 'granted';
  const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return ok ? 'granted' : 'unknown';
}

export async function requestNotifications(): Promise<PermissionState> {
  if (!needsRuntimeNotifications) return 'granted';
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if (r === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}
