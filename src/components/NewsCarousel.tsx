import { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PublishRequestModal } from '@/components/PublishRequestModal';
import { useAdClicks } from '@/hooks/useAdClicks';
import { useAuth } from '@/contexts/AuthContext';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  image: string;
  isAd?: boolean;
  adId?: string;
}

interface TrendingAd {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  owner_id?: string;
}

interface NewsCarouselProps {
  theme: 'light' | 'dark';
}

const RSS_URL = 'https://news.google.com/rss/search?q=AI+OR+artificial+intelligence&hl=pt-BR&gl=BR&ceid=BR:pt';
const RSS2JSON_URL = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=250&fit=crop',
];

function getFallbackImage(index: number): string {
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

// ============================================================
// FETCH ADS ATIVAS via Supabase client (autenticado, com JWT)
// Filtra apenas ads nao expiradas: expires_at IS NULL OR > now()
// ============================================================
async function fetchActiveAds(): Promise<TrendingAd[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('trending_ads')
      .select('*')
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[NewsCarousel] [Ads] Erro Supabase:', error.message);
      return [];
    }

    // Auto-delete ads que expiraram (status ainda active mas expirou)
    // Isso limpa ads antigas que o admin nao removeu manualmente
    const expiredAds = (data || []).filter((ad: any) => ad.expires_at && new Date(ad.expires_at) <= new Date(now));
    if (expiredAds.length > 0) {
      console.log('[NewsCarousel] [Ads] 🧹 Auto-delete ads expiradas:', expiredAds.length);
      for (const ad of expiredAds) {
        supabase.from('trending_ads').delete().eq('id', ad.id).then(() => {});
      }
    }

    const validAds = (data || []).filter((ad: any) => !ad.expires_at || new Date(ad.expires_at) > new Date(now));
    console.log('[NewsCarousel] [Ads] ✅ Ativas (nao expiradas):', validAds.length);
    return validAds as TrendingAd[];
  } catch (e) {
    console.error('[NewsCarousel] [Ads] Excecao:', e);
    return [];
  }
}

// ============================================================
// MESCLAR ADS + NOTICIAS (distribui ads aleatoriamente)
// ============================================================
function mergeNewsAndAds(newsItems: NewsItem[], ads: TrendingAd[]): NewsItem[] {
  if (!ads || ads.length === 0) return newsItems;

  const adItems: NewsItem[] = ads.map((ad) => ({
    title: ad.title,
    link: ad.target_url,
    source: 'Trending',
    pubDate: ad.created_at,
    image: ad.image_url || getFallbackImage(0),
    isAd: true,
    adId: ad.id,
  }));

  // Mesclar: coloca 1 ad a cada ~4 noticias
  const merged: NewsItem[] = [];
  let adIndex = 0;
  const interval = 4;

  for (let i = 0; i < newsItems.length; i++) {
    merged.push(newsItems[i]);
    if ((i + 1) % interval === 0 && adIndex < adItems.length) {
      merged.push(adItems[adIndex++]);
    }
  }

  // Se sobraram ads, coloca no final
  while (adIndex < adItems.length) {
    merged.push(adItems[adIndex++]);
  }

  return merged;
}

export function NewsCarousel({ theme }: NewsCarouselProps) {
  console.log('[NewsCarousel] RENDER');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const { recordClick } = useAdClicks();
  const { currentUser } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const swiperRef = useRef<any>(null);

  // Fetch news - memoizado para nao recriar
  const fetchNews = useCallback(async () => {
    console.log('[NewsCarousel] Fetching news via rss2json...');

    try {
      // ============================================================
      // CACHE BUSTING: timestamp na URL para evitar cache
      // ============================================================
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`${RSS2JSON_URL}${encodeURIComponent(RSS_URL)}${cacheBuster}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[NewsCarousel] DADOS RECEBIDOS:', data.status, data.items?.length || 0, 'items');

      if (data.status !== 'ok' || !data.items) {
        throw new Error('Invalid rss2json response');
      }

      const parsedNews: NewsItem[] = data.items.slice(0, 12).map((item: any, index: number) => {
        const cleanTitle = (item.title || 'Sem titulo').replace(/\s-\s[^-]+$/, '').trim();

        return {
          title: cleanTitle,
          link: item.link || '#',
          source: item.author || cleanTitle.match(/\s-\s([^-]+)$/)?.[1] || 'Google News',
          pubDate: item.pubDate || '',
          image: getFallbackImage(index),
        };
      });

      console.log(`[NewsCarousel] Parsed ${parsedNews.length} news items`);

      // ============================================================
      // BUSCAR ADS ATIVAS E MESCLAR
      // ============================================================
      const activeAds = await fetchActiveAds();
      const merged = mergeNewsAndAds(parsedNews, activeAds);
      console.log(`[NewsCarousel] Mesclado: ${merged.length} itens (${parsedNews.length} news + ${activeAds.length} ads)`);

      if (isMounted.current) {
        setNews((prev) => {
          if (prev.length === 0) {
            return merged;
          }
          return merged;
        });
        setHasError(false);
      }
    } catch (err: any) {
      console.error('[NewsCarousel] Error:', err.message);
      if (isMounted.current) {
        setHasError(true);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // useEffect com array VAZIO - roda apenas no mount
  useEffect(() => {
    isMounted.current = true;

    // Fetch inicial
    fetchNews();

    // Auto-refresh a cada 5 minutos
    intervalRef.current = setInterval(() => {
      console.log('[NewsCarousel] Auto-refresh triggered (5min)');
      fetchNews();
    }, 300000);

    // ============================================================
    // SUPABASE REALTIME: detecta mudanças na tabela trending_ads
    // Fallback: se o Realtime falhar, o polling de 30s cobre
    // ============================================================
    const realtimeChannel = supabase
      .channel('trending_ads_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trending_ads' },
        (payload: any) => {
          console.log('[NewsCarousel] [Realtime] 🔔 Mudança detectada:', payload.eventType, payload.new?.id || payload.old?.id);
          if (isMounted.current) {
            fetchNews();
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[NewsCarousel] [Realtime] Status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[NewsCarousel] [Realtime] ❌ Erro no canal Realtime');
        } else if (status === 'CLOSED') {
          console.warn('[NewsCarousel] [Realtime] ⚠️ Canal fechado');
        } else if (status === 'SUBSCRIBED') {
          console.log('[NewsCarousel] [Realtime] ✅ Conectado ao Realtime');
        }
      });

    // ============================================================
    // POLLING: atualiza ads a cada 30s (fallback do Realtime)
    // ============================================================
    const adsPollRef = setInterval(() => {
      console.log('[NewsCarousel] [polling] Verificando ads (30s)...');
      if (isMounted.current) {
        fetchNews();
      }
    }, 30000);

    // ============================================================
    // CUSTOM EVENT: notificação instantânea do mesmo browser
    // ============================================================
    const handleAdsChanged = () => {
      console.log('[NewsCarousel] [event] trending-ads-changed recebido, refazendo fetch...');
      fetchNews();
    };
    window.addEventListener('trending-ads-changed', handleAdsChanged);

    // ============================================================
    // RECARREGAR QUANDO A ABA VOLTA AO FOCO
    // ============================================================
    const handleVisibility = () => {
      if (!document.hidden) {
        console.log('[NewsCarousel] [visibility] Aba voltou ao foco, refazendo fetch...');
        fetchNews();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(adsPollRef);
      supabase.removeChannel(realtimeChannel);
      window.removeEventListener('trending-ads-changed', handleAdsChanged);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchNews]);

  // Fallback silencioso
  if (hasError || (!isLoading && news.length === 0)) {
    return null;
  }

  return (
    <div
      className={`w-full relative ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 border-b border-slate-800/50'
          : 'bg-gradient-to-r from-gray-50/80 via-gray-50/60 to-gray-50/80 border-b border-gray-200/50'
      }`}
      style={{ zIndex: 40 }}
    >
      <div className="px-6 py-4">
        {/* Titulo fixo elegante */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔥</span>
          <h3
            className={`text-sm font-semibold tracking-wide uppercase ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            Trending News
          </h3>
          {/* Botão circular PUB (20% menor que perfil h-10 = h-8) */}
          <button
            onClick={() => setPublishOpen(true)}
            className={`ml-1 h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold tracking-wider transition-all hover:scale-110 active:scale-95 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
                : 'bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-400/30 hover:shadow-amber-400/50'
            }`}
            title="Publique no Trending News"
          >
            PUB
          </button>
          <div
            className={`flex-1 h-px ml-2 ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'
            }`}
          />
        </div>

        {isLoading ? (
          /* Skeleton loading */
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 h-32 rounded-xl animate-pulse ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-200/50'
                }`}
              />
            ))}
          </div>
        ) : (
          /* Swiper Carousel */
          <Swiper
            ref={swiperRef}
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={16}
            slidesPerView={1}
            autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            loop={news.length > 4}
            navigation={true}
            pagination={{ clickable: true, dynamicBullets: true }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
              1280: { slidesPerView: 4 },
            }}
            className="news-swiper !pb-8"
          >
            {news.map((item, index) => (
              <SwiperSlide key={`${item.link}-${index}`}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={async (e) => {
                    if (item.adId) {
                      e.preventDefault();
                      await recordClick(item.adId);
                      window.open(item.link, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`group block h-full rounded-xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    theme === 'dark'
                      ? 'bg-slate-800/60 border-slate-700/50 hover:border-violet-500/50'
                      : 'bg-white/80 border-gray-200/50 hover:border-violet-300'
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-28 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${
                        theme === 'dark'
                          ? 'from-slate-900/80 to-transparent'
                          : 'from-white/80 to-transparent'
                      }`}
                    />
                    {/* External link icon */}
                    <div
                      className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        theme === 'dark' ? 'bg-slate-900/60' : 'bg-white/60'
                      }`}
                    >
                      <ExternalLink
                        className={`w-3 h-3 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h4
                      className={`text-sm font-medium line-clamp-2 leading-snug ${
                        theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <div
                      className={`flex items-center gap-2 mt-2 text-xs ${
                        theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{item.source}</span>
                      <span>•</span>
                      <span>
                        {item.pubDate
                          ? new Date(item.pubDate).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      <style>{`
        .news-swiper .swiper-button-next,
        .news-swiper .swiper-button-prev {
          width: 28px;
          height: 28px;
          background: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
          border-radius: 50%;
          color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
          backdrop-filter: blur(8px);
          z-index: 50;
        }
        .news-swiper .swiper-button-next:after,
        .news-swiper .swiper-button-prev:after {
          font-size: 12px;
          font-weight: bold;
        }
        .news-swiper .swiper-button-next:hover,
        .news-swiper .swiper-button-prev:hover {
          background: ${theme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.15)'};
          color: ${theme === 'dark' ? '#c4b5fd' : '#7c3aed'};
        }
        .news-swiper .swiper-pagination {
          bottom: 0 !important;
        }
        .news-swiper .swiper-pagination-bullet {
          width: 6px;
          height: 6px;
          background: ${theme === 'dark' ? '#475569' : '#cbd5e1'};
          opacity: 1;
        }
        .news-swiper .swiper-pagination-bullet-active {
          background: ${theme === 'dark' ? '#8b5cf6' : '#7c3aed'};
          width: 16px;
          border-radius: 3px;
        }
      `}</style>

      {/* Modal Publique seu Projeto */}
      <PublishRequestModal open={publishOpen} onClose={() => setPublishOpen(false)} userEmail={currentUser?.email} />
    </div>
  );
}
