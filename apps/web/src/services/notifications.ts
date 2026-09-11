import { apiGet, apiPatch, apiDelete, extractPage } from './api/client';
import { authHeaders } from './auth';

export interface NotificationDevice {
  id: string;
  userId: string | null;
  fcmToken: string;
  platform: string;
  preferences: Record<string, boolean>;
  createdAt: string;
}

export interface NotificationLogItem {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export async function fetchNotificationHistory(
  params: { page?: number; limit?: number } = {}
): Promise<{ items: NotificationLogItem[]; total: number; totalPages: number }> {
  const res = await apiGet('/notifications/history', { page: 1, limit: 20, ...params }, { headers: authHeaders() });
  const { items, meta } = extractPage<NotificationLogItem>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchDevices(): Promise<NotificationDevice[]> {
  const res = await apiGet<NotificationDevice[]>('/devices', undefined, { headers: authHeaders() });
  return Array.isArray(res) ? res : [];
}

export function updateDevicePreferences(
  id: string,
  preferences: Record<string, boolean>
): Promise<NotificationDevice> {
  return apiPatch<NotificationDevice>(`/devices/${id}/preferences`, { preferences }, { headers: authHeaders() });
}

export async function unregisterDevice(id: string): Promise<void> {
  await apiDelete(`/devices/${id}`, { headers: authHeaders() });
}
