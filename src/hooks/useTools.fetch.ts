import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

const defaultCategories: any[] = [];

export interface FilterState {
  category: string | null;
  subcategory: string | null;
  search: string;
  favoritesOnly: boolean;
}

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

// ============================================================
// TIPOS
// ============================================================
interface Tool {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  url: string;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UserToolData {
  id: string;
  tool_id: string;
  is_favorite: boolean;
  personal_notes: string | null;
  rating: number | null;
}

export interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string; categoryId: string }[];
}

// ============================================================
// FETCH COM TIMEOUT
// ============================================================
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// ============================================================
// SUPABASE CRUD DIRECT
// ============================================================
async function supabaseInsert(table: string, data: any) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  console.log('[supabaseInsert] URL:', url, 'Data:', data);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  }, 15000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return await response.json();
}

async function supabaseUpdate(table: string, id: string, data: any) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  console.log('[supabaseUpdate] URL:', url, 'Data:', data);

  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  }, 15000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return await response.json();
}

async function supabaseDelete(table: string, id: string) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  console.log('[supabaseDelete] URL:', url);

  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers,
  }, 15000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return true;
}

// ============================================================
// SUPABASE UPSERT (incrementa click_count)
// ============================================================
async function supabaseUpsertClicks(userId: string, toolId: string) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };

  const url = `${SUPABASE_URL}/rest/v1/tool_clicks`;

  const findUrl = `${SUPABASE_URL}/rest/v1/tool_clicks?select=id,click_count&user_id=eq.${encodeURIComponent(userId)}&tool_id=eq.${encodeURIComponent(toolId)}`;

  console.log('[supabaseUpsertClicks] Finding:', findUrl);

  const findRes = await fetchWithTimeout(findUrl, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }
  }, 10000);

  let existingId: string | null = null;
  let currentCount = 0;

  if (findRes.ok) {
    const existing = await findRes.json();
    console.log('[supabaseUpsertClicks] Existing:', existing);
    if (existing && existing.length > 0) {
      existingId = existing[0].id;
      currentCount = existing[0].click_count || 0;
    }
  }

  if (existingId) {
    const updateUrl = `${SUPABASE_URL}/rest/v1/tool_clicks?id=eq.${existingId}`;
    console.log('[supabaseUpsertClicks] Updating count to:', currentCount + 1);

    const updateRes = await fetchWithTimeout(updateUrl, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ click_count: currentCount + 1 }),
    }, 10000);

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`HTTP ${updateRes.status}: ${text}`);
    }
    return await updateRes.json();
  } else {
    console.log('[supabaseUpsertClicks] Inserting new record');

    const insertRes = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        tool_id: toolId,
        click_count: 1,
      }),
    }, 10000);

    if (!insertRes.ok) {
      const text = await insertRes.text();
      throw new Error(`HTTP ${insertRes.status}: ${text}`);
    }
    return await insertRes.json();
  }
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [userToolsData, setUserToolsData] = useState<Map<string, UserToolData>>(new Map());
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [clickData, setClickData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    category: null,
    subcategory: null,
    search: '',
    favoritesOnly: false,
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [budget, setBudget] = useState<{ monthly_limit: number; yearly_limit: number } | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // ============================================================
  // FETCH BUDGET
  // ============================================================
  const fetchBudget = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/user_budgets?select=*&user_id=eq.${currentUser.id}`;
      console.log('[useTools] fetchBudget URL:', url);
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);
      if (res.ok) {
        const data = await res.json();
        console.log('[useTools] Budget received:', data);
        if (data?.[0]) {
          setBudget({ monthly_limit: data[0].monthly_limit, yearly_limit: data[0].yearly_limit });
        } else {
          setBudget(null);
        }
      } else {
        const text = await res.text();
        console.error('[useTools] Budget fetch failed:', res.status, text);
      }
    } catch (e: any) {
      console.error('[useTools] Budget fetch error:', e.message);
    }
  }, [currentUser?.id]);

  // ============================================================
  // FETCH SUBSCRIPTIONS
  // ============================================================
  const fetchSubscriptions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/user_subscriptions?select=*&user_id=eq.${currentUser.id}`;
      console.log('[useTools] fetchSubscriptions URL:', url);
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);
      if (res.ok) {
        const data = await res.json();
        console.log('[useTools] Subscriptions received:', data?.length || 0);
        setSubscriptions(data || []);
       } else {
        const text = await res.text();
        console.error('[useTools] Subscriptions fetch failed:', res.status, text);
      }
    } catch (e: any) {
      console.error('[useTools] Subscriptions fetch error:', e.message);
    }
  }, [currentUser?.id]);

  // ============================================================
  // FETCH PROJECTS
  // ============================================================
  const fetchProjects = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/user_projects?select=*&user_id=eq.${currentUser.id}`;
      console.log('[useTools] fetchProjects URL:', url);
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);
      if (res.ok) {
        const data = await res.json();
        console.log('[useTools] Projects received:', data?.length || 0);
        setProjects(data || []);
      } else {
        console.error('[useTools] Projects fetch failed:', res.status);
      }
    } catch (e: any) {
      console.error('[useTools] Projects fetch error:', e.message);
    }
  }, [currentUser?.id]);

  // ============================================================
  // FETCH INICIAL
  // ============================================================
  const fetchAllData = useCallback(async () => {
    console.log('[useTools] ===== FETCH ALL DATA =====');
    console.log('[useTools] User:', currentUser?.email, 'ID:', currentUser?.id);

    if (!currentUser?.id) {
      console.log('[useTools] No user logged in - setting empty state');
      setTools([]);
      setUserToolsData(new Map());
      setCategories(defaultCategories);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useTools] [STEP 1/4] Fetching all tools...');
      const toolsUrl = `${SUPABASE_URL}/rest/v1/tools?select=*&order=name.asc`;
      const toolsResponse = await fetchWithTimeout(toolsUrl, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 15000);
      if (!toolsResponse.ok) {
        const text = await toolsResponse.text();
        console.log('[useTools] tools fetch error:', toolsResponse.status, text);
        setTools([]);
      } else {
        const toolsData = await toolsResponse.json();
        console.log('[useTools] Tools received:', toolsData?.length || 0);
        setTools(toolsData || []);
      }

      console.log('[useTools] [STEP 2/4] Fetching user_tools for user:', currentUser.id);
      const userToolsUrl = `${SUPABASE_URL}/rest/v1/user_tools?select=id,tool_id,is_favorite,personal_notes,rating&user_id=eq.${currentUser.id}`;

      const headers: Record<string, string> = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      };

      const userResponse = await fetchWithTimeout(userToolsUrl, { method: 'GET', headers }, 15000);

      if (!userResponse.ok) {
        const text = await userResponse.text();
        console.log('[useTools] user_tools error (continuing without):', userResponse.status, text);
        setUserToolsData(new Map());
      } else {
        const userData = await userResponse.json();
        console.log('[useTools] UserTools received:', userData?.length || 0);

        const userDataMap = new Map<string, UserToolData>();
        userData?.forEach((ut: any) => {
          userDataMap.set(ut.tool_id, {
            id: ut.id,
            tool_id: ut.tool_id,
            is_favorite: ut.is_favorite || false,
            personal_notes: ut.personal_notes || null,
            rating: ut.rating || null,
          });
        });
        setUserToolsData(userDataMap);
      }

      console.log('[useTools] [STEP 3/4] Fetching categories...');
      try {
        const catsUrl = `${SUPABASE_URL}/rest/v1/categories?select=*&or=(user_id.eq.${currentUser.id},user_id.is.null)&order=name.asc`;
        const catsResponse = await fetchWithTimeout(catsUrl, { method: 'GET', headers }, 15000);

        if (catsResponse.ok) {
          const catsData = await catsResponse.json();
          console.log('[useTools] Categories received:', catsData?.length || 0);
          if (catsData && catsData.length > 0) {
            setCategories(catsData.map((c: any) => ({
              id: c.id,
              name: c.name,
              subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
            })));
          }
        } else {
          console.log('[useTools] categories table not accessible, using defaults');
        }
      } catch (e: any) {
        console.log('[useTools] categories fetch error:', e.message);
      }

      console.log('[useTools] [STEP 4/4] Fetching tool_clicks for user:', currentUser.id);
      try {
        const clicksUrl = `${SUPABASE_URL}/rest/v1/tool_clicks?select=tool_id,click_count&user_id=eq.${currentUser.id}`;
        const clicksResponse = await fetchWithTimeout(clicksUrl, { method: 'GET', headers }, 15000);

        if (clicksResponse.ok) {
          const clicksData = await clicksResponse.json();
          console.log('[useTools] ToolClicks received:', clicksData?.length || 0);

          const clicksMap = new Map<string, number>();
          clicksData?.forEach((c: any) => {
            clicksMap.set(c.tool_id, c.click_count || 0);
          });
          setClickData(clicksMap);
        } else {
          console.log('[useTools] tool_clicks table not accessible');
        }
      } catch (e: any) {
        console.log('[useTools] tool_clicks fetch error:', e.message);
      }

      console.log('[useTools] [STEP 5/5] Fetching budget, subscriptions & projects...');
      await fetchBudget();
      await fetchSubscriptions();
      await fetchProjects();
      console.log('[useTools] ===== FETCH COMPLETE =====');
    } catch (err: any) {
      console.error('[useTools] FATAL ERROR:', err.message);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, fetchBudget, fetchSubscriptions, fetchProjects]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ============================================================
  // TOGGLE FAVORITE
  // ============================================================
  const toggleFavorite = useCallback(async (toolId: string) => {
    console.log('[useTools] ===== TOGGLE FAVORITE =====');

    if (!currentUser?.id) {
      setError('Voce precisa estar logado');
      return;
    }

    const userData = userToolsData.get(toolId);
    const newState = !userData?.is_favorite;

    try {
      if (userData?.id) {
        await supabaseUpdate('user_tools', userData.id, {
          is_favorite: newState,
          updated_at: new Date().toISOString()
        });
        console.log('[useTools] SALVO - Favorito atualizado');

        setUserToolsData(prev => {
          const newMap = new Map(prev);
          if (newMap.has(toolId)) {
            newMap.set(toolId, { ...newMap.get(toolId)!, is_favorite: newState });
          }
          return newMap;
        });
      } else {
        const result = await supabaseInsert('user_tools', {
          user_id: currentUser.id,
          tool_id: toolId,
          is_favorite: newState,
          personal_notes: null,
          rating: null,
          access_count: 0,
        });
        console.log('[useTools] SALVO - Favorito criado');

        if (result?.[0]) {
          setUserToolsData(prev => {
            const newMap = new Map(prev);
            newMap.set(toolId, {
              id: result[0].id,
              tool_id: toolId,
              is_favorite: newState,
              personal_notes: null,
              rating: null,
            });
            return newMap;
          });
        }
      }
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      setError(`Erro ao salvar favorito: ${err.message}`);
    }
  }, [currentUser?.id, userToolsData]);

  // ============================================================
  // SAVE NOTES
  // ============================================================
  const saveNotes = useCallback(async (toolId: string, notes: string) => {
    console.log('[useTools] ===== SAVE NOTES =====');

    if (!currentUser?.id) {
      setError('Voce precisa estar logado');
      return;
    }

    const userData = userToolsData.get(toolId);

    try {
      if (userData?.id) {
        await supabaseUpdate('user_tools', userData.id, {
          personal_notes: notes,
          updated_at: new Date().toISOString()
        });
        console.log('[useTools] SALVO - Notas atualizadas');

        setUserToolsData(prev => {
          const newMap = new Map(prev);
          if (newMap.has(toolId)) {
            newMap.set(toolId, { ...newMap.get(toolId)!, personal_notes: notes });
          }
          return newMap;
        });
      } else {
        const result = await supabaseInsert('user_tools', {
          user_id: currentUser.id,
          tool_id: toolId,
          is_favorite: false,
          personal_notes: notes,
          rating: null,
          access_count: 0,
        });
        console.log('[useTools] SALVO - Notas criadas');

        if (result?.[0]) {
          setUserToolsData(prev => {
            const newMap = new Map(prev);
            newMap.set(toolId, {
              id: result[0].id,
              tool_id: toolId,
              is_favorite: false,
              personal_notes: notes,
              rating: null,
            });
            return newMap;
          });
        }
      }
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      setError(`Erro ao salvar notas: ${err.message}`);
    }
  }, [currentUser?.id, userToolsData]);

  // ============================================================
  // SAVE RATING
  // ============================================================
  const saveRating = useCallback(async (toolId: string, rating: number) => {
    console.log('[useTools] ===== SAVE RATING =====');

    if (!currentUser?.id) {
      setError('Voce precisa estar logado');
      return;
    }

    const userData = userToolsData.get(toolId);

    try {
      if (userData?.id) {
        await supabaseUpdate('user_tools', userData.id, {
          rating,
          updated_at: new Date().toISOString()
        });
        console.log('[useTools] SALVO - Rating atualizado');

        setUserToolsData(prev => {
          const newMap = new Map(prev);
          if (newMap.has(toolId)) {
            newMap.set(toolId, { ...newMap.get(toolId)!, rating });
          }
          return newMap;
        });
      } else {
        const result = await supabaseInsert('user_tools', {
          user_id: currentUser.id,
          tool_id: toolId,
          is_favorite: false,
          personal_notes: null,
          rating,
          access_count: 0,
        });
        console.log('[useTools] SALVO - Rating criado');

        if (result?.[0]) {
          setUserToolsData(prev => {
            const newMap = new Map(prev);
            newMap.set(toolId, {
              id: result[0].id,
              tool_id: toolId,
              is_favorite: false,
              personal_notes: null,
              rating,
            });
            return newMap;
          });
        }
      }
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      setError(`Erro ao salvar rating: ${err.message}`);
    }
  }, [currentUser?.id, userToolsData]);

  // ============================================================
  // ADD TOOL
  // ============================================================
  const addTool = useCallback(async (toolData: any) => {
    console.log('[useTools] ===== ADD TOOL =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    try {
      const newTool = {
        name: toolData.name,
        description: toolData.description || null,
        url: toolData.url,
        category: toolData.category,
        subcategory: toolData.subcategory || null,
        image_url: toolData.image_url || null,
        created_by: currentUser.id,
        admin_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await supabaseInsert('tools', newTool);
      console.log('[useTools] SALVO - Ferramenta criada');

      if (result?.[0]) {
        setTools(prev => {
          const next = [...prev, result[0]];
          next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          return next;
        });
      }

      return { success: true, message: 'Ferramenta criada!', tool: result?.[0] };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // EDIT TOOL
  // ============================================================
  const editTool = useCallback(async (toolData: any) => {
    console.log('[useTools] ===== EDIT TOOL =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    try {
      await supabaseUpdate('tools', toolData.id, {
        name: toolData.name,
        description: toolData.description || null,
        url: toolData.url,
        category: toolData.category,
        image_url: toolData.image_url || null,
        updated_at: new Date().toISOString(),
      });
      console.log('[useTools] SALVO - Ferramenta atualizada');

      setTools(prev => prev.map(t => t.id === toolData.id ? { ...t, ...toolData } : t));

      return { success: true, message: 'Ferramenta atualizada!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // DELETE TOOL
  // ============================================================
  const deleteTool = useCallback(async (toolId: string) => {
    console.log('[useTools] ===== DELETE TOOL =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    const tool = tools.find(t => t.id === toolId);
    const isOwner = tool?.created_by === currentUser.id;

    try {
      if (isOwner) {
        await supabaseDelete('tools', toolId);
        console.log('[useTools] Ferramenta deletada do catalogo (dono)');
      } else {
        const url = `${SUPABASE_URL}/rest/v1/user_tools?user_id=eq.${encodeURIComponent(currentUser.id)}&tool_id=eq.${encodeURIComponent(toolId)}`;
        const resp = await fetchWithTimeout(url, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        }, 10000);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        console.log('[useTools] Vinculo removido de user_tools (compartilhada)');
      }

      setTools(prev => prev.filter(t => t.id !== toolId));

      return { success: true, message: 'Ferramenta removida!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id, tools]);

  // ============================================================
  // CATEGORY CRUD
  // ============================================================
  const addCategory = useCallback(async (name: string) => {
    console.log('[useTools] ===== ADD CATEGORY =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    try {
      const id = name.toLowerCase().replace(/\s+/g, '-');
      const payload = {
        id,
        name,
        subcategories: [],
        user_id: currentUser.id,
      };

      const result = await supabaseInsert('categories', payload);
      console.log('[useTools] SALVO - Categoria criada');

      if (result?.[0]) {
        setCategories(prev => {
          const next = [...prev, {
            id: result[0].id,
            name: result[0].name,
            subcategories: [],
          }];
          next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          return next;
        });
      }

      return { success: true, message: 'Categoria criada!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  const editCategory = useCallback(async (id: string, newName: string) => {
    console.log('[useTools] ===== EDIT CATEGORY =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    try {
      const url = `${SUPABASE_URL}/rest/v1/categories?id=eq.${id}&user_id=eq.${currentUser.id}`;
      const res = await fetchWithTimeout(url, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ name: newName }),
      }, 10000);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      console.log('[useTools] Categoria atualizada (somente propria)');
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
      return { success: true, message: 'Categoria atualizada!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  const deleteCategory = useCallback(async (id: string) => {
    console.log('[useTools] ===== DELETE CATEGORY =====');

    if (!currentUser?.id) {
      return { success: false, message: 'Voce precisa estar logado' };
    }

    try {
      const url = `${SUPABASE_URL}/rest/v1/categories?id=eq.${id}&user_id=eq.${currentUser.id}`;
      const res = await fetchWithTimeout(url, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      console.log('[useTools] Categoria deletada (somente propria)');
      setCategories(prev => prev.filter(c => c.id !== id));
      return { success: true, message: 'Categoria deletada!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // RECORD ACCESS (clique no botao Acessar)
  // ============================================================
  const recordAccess = useCallback(async (toolId: string) => {
    console.log('[useTools] ===== RECORD ACCESS ===== toolId:', toolId);

    if (!currentUser?.id) {
      console.log('[useTools] No user logged in - skipping click record');
      return;
    }

    try {
      const result = await supabaseUpsertClicks(currentUser.id, toolId);

      console.log('[useTools] ACESSO REGISTRADO NO SUPABASE');

      if (result?.[0]) {
        const newCount = result[0].click_count || 1;
        console.log('[useTools] Novo click_count:', newCount);

        setClickData(prev => {
          const newMap = new Map(prev);
          newMap.set(toolId, newCount);
          return newMap;
        });
      }
    } catch (err: any) {
      console.error('[useTools] ERRO AO REGISTRAR ACESSO:', err.message);
    }
  }, [currentUser?.id]);

  // ============================================================
  // BUDGET CRUD
  // ============================================================
  const setUserBudget = useCallback(async (monthly: number, yearly: number) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    try {
      const findUrl = `${SUPABASE_URL}/rest/v1/user_budgets?select=id&user_id=eq.${currentUser.id}`;
      const findRes = await fetchWithTimeout(findUrl, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);

      const headers: Record<string, string> = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      if (findRes.ok) {
        const existing = await findRes.json();
        if (existing?.[0]) {
          const updateUrl = `${SUPABASE_URL}/rest/v1/user_budgets?id=eq.${existing[0].id}`;
          const updateRes = await fetchWithTimeout(updateUrl, {
            method: 'PATCH', headers,
            body: JSON.stringify({ monthly_limit: monthly, yearly_limit: yearly }),
          }, 10000);
          if (!updateRes.ok) throw new Error(await updateRes.text());
        } else {
          const insertUrl = `${SUPABASE_URL}/rest/v1/user_budgets`;
          const insertRes = await fetchWithTimeout(insertUrl, {
            method: 'POST', headers,
            body: JSON.stringify({ user_id: currentUser.id, monthly_limit: monthly, yearly_limit: yearly }),
          }, 10000);
          if (!insertRes.ok) throw new Error(await insertRes.text());
        }
      }

      setBudget({ monthly_limit: monthly, yearly_limit: yearly });
      console.log('[useTools] ORCAMENTO SALVO NO SUPABASE');
      return { success: true, message: 'Orcamento definido!' };
    } catch (err: any) {
      console.error('[useTools] ERRO ORCAMENTO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // SUBSCRIPTIONS CRUD
  // ============================================================
  const addSubscription = useCallback(async (sub: any) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    try {
      const result = await supabaseInsert('user_subscriptions', {
        user_id: currentUser.id,
        name: sub.name,
        url: sub.url,
        price: sub.price,
        type: sub.type,
        start_date: sub.start_date,
        expiry_date: sub.expiry_date,
        payments_made: 1,
        total_spent: sub.price,
      });
      console.log('[useTools] ASSINATURA SALVA NO SUPABASE');
      if (result?.[0]) {
        setSubscriptions(prev => [result[0], ...prev]);
      }
      return { success: true, message: 'Assinatura criada!' };
    } catch (err: any) {
      console.error('[useTools] ERRO ASSINATURA:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  const deleteSubscription = useCallback(async (id: string) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    try {
      await supabaseDelete('user_subscriptions', id);
      console.log('[useTools] ASSINATURA DELETADA');
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      return { success: true, message: 'Assinatura removida!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // CONFIRMAR PAGAMENTO DE ASSINATURA
  // ============================================================
  const confirmSubscriptionPayment = useCallback(async (id: string, type: string, price: number) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    console.log('[useTools] ===== CONFIRMAR PAGAMENTO ===== id:', id, 'type:', type, 'price:', price);
    try {
      const findUrl = `${SUPABASE_URL}/rest/v1/user_subscriptions?select=*&id=eq.${id}`;
      const findRes = await fetchWithTimeout(findUrl, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);

      if (!findRes.ok) throw new Error('Erro ao buscar assinatura');
      const existing = await findRes.json();
      if (!existing?.[0]) throw new Error('Assinatura nao encontrada');

      const sub = existing[0];
      const currentPayments = (sub.payments_made || 1);
      const newPayments = currentPayments + 1;

      let newExpiry = sub.expiry_date;
      if (type === 'monthly') {
        const d = new Date(sub.expiry_date || new Date());
        d.setMonth(d.getMonth() + 1);
        newExpiry = d.toISOString().split('T')[0];
      } else if (type === 'yearly') {
        const d = new Date(sub.expiry_date || new Date());
        d.setFullYear(d.getFullYear() + 1);
        newExpiry = d.toISOString().split('T')[0];
      }

      const totalSpent = price * newPayments;

      const headers: Record<string, string> = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      const updateUrl = `${SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${id}`;
      const updateRes = await fetchWithTimeout(updateUrl, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          payments_made: newPayments,
          total_spent: totalSpent,
          expiry_date: newExpiry,
        }),
      }, 10000);

      if (!updateRes.ok) {
        const text = await updateRes.text();
        throw new Error(`HTTP ${updateRes.status}: ${text}`);
      }

      const updated = await updateRes.json();
      console.log('[useTools] PAGAMENTO CONFIRMADO. Parcelas:', newPayments, '| Total gasto:', totalSpent);

      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updated[0] } : s));

      return { success: true, message: `Pagamento confirmado! Parcelas: ${newPayments}`, payments: newPayments, totalSpent };
    } catch (err: any) {
      console.error('[useTools] ERRO PAGAMENTO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  // ============================================================
  // PROJECTS CRUD
  // ============================================================
  const addProject = useCallback(async (project: any) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    try {
      const result = await supabaseInsert('user_projects', {
        user_id: currentUser.id,
        name: project.name,
        type: project.type,
        file_url: project.file_url,
        external_url: project.external_url,
        tool_id: project.tool_id,
      });
      console.log('[useTools] PROJETO SALVO NO SUPABASE');
      if (result?.[0]) {
        setProjects(prev => [result[0], ...prev]);
      }
      return { success: true, message: 'Projeto criado!' };
    } catch (err: any) {
      console.error('[useTools] ERRO PROJETO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  const deleteProject = useCallback(async (id: string) => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    try {
      await supabaseDelete('user_projects', id);
      console.log('[useTools] PROJETO DELETADO');
      setProjects(prev => prev.filter(p => p.id !== id));
      return { success: true, message: 'Projeto removido!' };
    } catch (err: any) {
      console.error('[useTools] ERRO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

  const clearError = useCallback(() => setError(null), []);

  // ============================================================
  // FILTRAR FERRAMENTAS
  // ============================================================
  const filteredTools = useMemo(() => {
    console.log('[useTools] filteredTools recalculando. filters:', JSON.stringify(filters), '| total tools:', tools.length);
    
    let result = [...tools];

    // 1. Filtro por Categoria
    if (filters.category) {
      result = result.filter(tool => 
        tool.category?.toLowerCase() === filters.category?.toLowerCase()
      );
    }

    // 2. Filtro por Busca (Search)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(tool => 
        tool.name?.toLowerCase().includes(query) || 
        tool.description?.toLowerCase().includes(query)
      );
    }

    // 3. Filtro por Favoritos
    if (filters.favoritesOnly) {
      result = result.filter(tool => {
        const userData = userToolsData.get(tool.id);
        return userData?.is_favorite === true;
      });
    }

    // Mapear dados do usuário (Favoritos, Notas, etc.)
    const mapped = result.map((tool: any) => {
      const userData = userToolsData.get(tool.id);
      return {
        ...tool,
        isFavorite: userData?.is_favorite || false,
        notes: userData?.personal_notes || null,
        rating: userData?.rating || null,
      };
    });

    console.log('[useTools] filteredTools resultado:', mapped.length, 'ferramentas');
    return mapped;
  }, [tools, filters, userToolsData, currentUser?.id]);
  // ============================================================
  // LIMPAR HISTORICO DE ACESSOS
  // ============================================================
  const resetClicks = useCallback(async () => {
    if (!currentUser?.id) return { success: false, message: 'Login necessario' };
    console.log('[useTools] ===== LIMPAR HISTORICO DE ACESSOS ===== userId:', currentUser.id);
    try {
      const url = `${SUPABASE_URL}/rest/v1/tool_clicks?user_id=eq.${currentUser.id}`;
      const res = await fetchWithTimeout(url, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      }, 10000);

      if (!res.ok) {
        const text = await res.text();
        console.error('[useTools] Erro ao limpar historico:', res.status, text);
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      setClickData(new Map());
      console.log('[useTools] HISTORICO DE ACESSOS LIMPO. Grafico zerado.');
      return { success: true, message: 'Historico de acessos limpo!' };
    } catch (err: any) {
      console.error('[useTools] ERRO AO LIMPAR HISTORICO:', err.message);
      return { success: false, message: `Erro: ${err.message}` };
    }
  }, [currentUser?.id]);

// ============================================================
  // SETTERS DE FILTROS (Garantindo que existam no escopo)
  // ============================================================
  const setCategory = useCallback((c: string | null) => {
    console.log('[useTools] setCategory chamado:', c);
    setFilters(p => ({ ...p, category: c, subcategory: null }));
  }, []);

  const setSearch = useCallback((s: string) => {
    console.log('[useTools] setSearch chamado:', s);
    setFilters(p => ({ ...p, search: s }));
  }, []);

  const setFavoritesOnly = useCallback((f: boolean) => {
    console.log('[useTools] setFavoritesOnly chamado:', f);
    setFilters(p => ({ ...p, favoritesOnly: f }));
  }, []);

  const clearFilters = useCallback(() => {
    console.log('[useTools] clearFilters chamado');
    setFilters({ category: null, subcategory: null, search: '', favoritesOnly: false });
  }, []);

  // ============================================================
  // RETURN FINAL (Sincronizado com todas as funções do arquivo)
  // ============================================================
  return {
    // Dados e Estados
    tools: filteredTools,
    allTools: tools,
    categories,
    clickData,
    userProjects: projects,
    userBudget: budget,
    userSubscriptions: subscriptions,
    loading: isLoading,
    error,
    
    // Filtros e Busca
    setCategory,
    setSearch,
    setFavoritesOnly,
    clearFilters,
    clearError,

    // Gerenciamento de Ferramentas (Resolve erros TS6133)
    saveNotes,
    saveRating,
    toggleFavorite,
    addTool,
    editTool,
    deleteTool,
    
    // Categorias e Acessos (Resolve erros TS6133)
    addCategory,
    editCategory,
    deleteCategory,
    recordAccess,
    resetClicks,
    
    // Financeiro e Projetos
    setUserBudget,
    addSubscription,
    updateSubscription: (id: string, data: any) => supabaseUpdate('user_subscriptions', id, data),
    deleteSubscription,
    confirmSubscriptionPayment,
    addProject,
    deleteProject,
    
    refreshTools: () => fetchAllData(),
  } as any;
}
