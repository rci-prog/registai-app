import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { sendNotificationToProfile } from '@/hooks/useNotifications';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

export interface DailyClick {
  date: string;
  count: number;
}

const LS_CLICKS_KEY = 'ad_clicks_fallback';

function getLocalClicks(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_CLICKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveLocalClick(adId: string) {
  try {
    const clicks = getLocalClicks();
    clicks[adId] = (clicks[adId] || 0) + 1;
    localStorage.setItem(LS_CLICKS_KEY, JSON.stringify(clicks));
  } catch { /* ignore */ }
}

function getLocalClickCount(adId: string): number {
  return getLocalClicks()[adId] || 0;
}

async function fetchFromTable(path: string): Promise<any[]> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
      },
    });
    if (!resp.ok) return [];
    return await resp.json() || [];
  } catch {
    return [];
  }
}

export function useAdClicks() {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchClickCount = useCallback(async (adId: string): Promise<number> => {
    try {
      const data = await fetchFromTable(`ad_clicks?select=id&ad_id=eq.${adId}`);
      const dbCount = data?.length || 0;
      const localCount = getLocalClickCount(adId);
      return dbCount + localCount;
    } catch {
      return getLocalClickCount(adId);
    }
  }, []);

  const fetchMultipleClickCounts = useCallback(async (adIds: string[]) => {
    if (adIds.length === 0) return;
    setLoading(true);
    const counts: Record<string, number> = {};
    await Promise.all(
      adIds.map(async (id) => {
        counts[id] = await fetchClickCount(id);
      })
    );
    setClickCounts(counts);
    setLoading(false);
  }, [fetchClickCount]);

  const fetchDailyClicks = useCallback(async (adId: string): Promise<DailyClick[]> => {
    try {
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
      const since = fortyDaysAgo.toISOString();

      const data = await fetchFromTable(
        `ad_clicks?select=clicked_at&ad_id=eq.${adId}&clicked_at=gte.${since}&order=clicked_at.asc`
      );

      const dayMap: Record<string, number> = {};
      (data || []).forEach((row: { clicked_at: string }) => {
        const date = new Date(row.clicked_at).toISOString().split('T')[0];
        dayMap[date] = (dayMap[date] || 0) + 1;
      });

      const localTotal = getLocalClickCount(adId);
      if (localTotal > 0) {
        const today = new Date().toISOString().split('T')[0];
        dayMap[today] = (dayMap[today] || 0) + localTotal;
      }

      return Object.entries(dayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      const localTotal = getLocalClickCount(adId);
      if (localTotal > 0) {
        const today = new Date().toISOString().split('T')[0];
        return [{ date: today, count: localTotal }];
      }
      return [];
    }
  }, []);

  const recordClick = useCallback(async (adId: string, _userId?: string) => {
    try {
      const { error } = await supabase.from('ad_clicks').insert({
        ad_id: adId,
        clicked_at: new Date().toISOString(),
      });
      if (error) {
        saveLocalClick(adId);
      }
    } catch {
      saveLocalClick(adId);
    }
  }, []);

  const sendReport = useCallback(async (adId: string, ownerEmail: string): Promise<boolean> => {
    try {
      const daily = await fetchDailyClicks(adId);
      const total = daily.reduce((sum, d) => sum + d.count, 0);

      const ok = await sendNotificationToProfile({
        ownerEmail,
        title: 'Relatorio de Acessos — Publicacao Trending News',
        message: `Sua publicacao teve ${total} clique(s) nos ultimos 40 dias.`,
        data: {
          ad_id: adId,
          clicks_data: daily,
          total_clicks: total,
        },
        type: 'ad_report',
      });

      if (!ok) {
        saveLocalClick(adId);
      }
      return ok;
    } catch {
      return false;
    }
  }, [fetchDailyClicks]);

  return {
    clickCounts,
    loading,
    fetchClickCount,
    fetchMultipleClickCounts,
    fetchDailyClicks,
    recordClick,
    sendReport,
  };
}
