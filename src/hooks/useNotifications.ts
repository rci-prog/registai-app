import { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

export interface AppNotification {
  id: string;
  type: 'ad_report' | 'system' | 'alert';
  title: string;
  message: string;
  data: any;
  status: 'unread' | 'read';
  created_at: string;
  read_at?: string;
  user_email?: string;
}

export interface SendNotificationParams {
  ownerEmail: string;
  title: string;
  message: string;
  data?: any;
  type?: 'ad_report' | 'system' | 'alert';
}

export async function sendNotificationToProfile(params: SendNotificationParams): Promise<boolean> {
  const { ownerEmail, title, message, data, type = 'ad_report' } = params;

  try {
    const url = `${SUPABASE_URL}/rest/v1/profiles?select=notifications,id&email=eq.${encodeURIComponent(ownerEmail)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) return false;
    const profiles = await resp.json();
    if (!profiles?.[0]?.id) return false;

    const existing: AppNotification[] = profiles[0].notifications || [];
    const profileId = profiles[0].id;

    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: cleanTitle,
      message: cleanMessage,
      data: data || {},
      status: 'unread',
      created_at: new Date().toISOString(),
    };

    const updated = [newNotif, ...existing].slice(0, 50);

    const patchUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`;
    const patchResp = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        notifications: updated,
        updated_at: new Date().toISOString(),
      }),
    });

    return patchResp.ok;
  } catch {
    return false;
  }
}

export function useNotifications(userEmail?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function patchProfile(email: string, notifs: AppNotification[]): Promise<boolean> {
    try {
      const searchUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`;
      const searchResp = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (!searchResp.ok) return false;
      const profiles = await searchResp.json();
      if (!profiles?.[0]?.id) return false;

      const patchUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profiles[0].id}`;
      const patchResp = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          notifications: notifs,
          updated_at: new Date().toISOString(),
        }),
      });
      return patchResp.ok;
    } catch {
      return false;
    }
  }

  async function fetchProfileNotifications(email: string): Promise<AppNotification[]> {
    try {
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=notifications&email=eq.${encodeURIComponent(email)}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const notifs = data?.[0]?.notifications || [];
      return Array.isArray(notifs) ? notifs : [];
    } catch {
      return [];
    }
  }

  const loadNotifications = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    const notifs = await fetchProfileNotifications(userEmail);
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n: AppNotification) => n.status === 'unread').length);
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) loadNotifications();
  }, [userEmail, loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userEmail) return;
    const updated = notifications.map((n) =>
      n.id === notificationId
        ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
        : n
    );
    await patchProfile(userEmail, updated);
    setNotifications(updated);
    setUnreadCount(updated.filter((n: AppNotification) => n.status === 'unread').length);
  }, [userEmail, notifications, patchProfile]);

  const markAllAsRead = useCallback(async () => {
    if (!userEmail) return;
    const updated = notifications.map((n) =>
      n.status === 'unread'
        ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
        : n
    );
    await patchProfile(userEmail, updated);
    setNotifications(updated);
    setUnreadCount(0);
  }, [userEmail, notifications, patchProfile]);

  const clearAllNotifications = useCallback(async () => {
    if (!userEmail) return;
    await patchProfile(userEmail, []);
    setNotifications([]);
    setUnreadCount(0);
  }, [userEmail, patchProfile]);

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  };
}
