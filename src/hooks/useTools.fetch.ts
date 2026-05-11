import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  subcategory: string;
  image_url: string;
  isFavorite: boolean;
  notes: string;
  rating: number;
  user_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ClickData {
  tool_id: string;
  count: number;
}

interface Budget {
  monthly: number;
  yearly: number;
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  frequency: string;
  next_payment: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

interface Filters {
  category: string;
  subcategory: string;
  search: string;
  favoritesOnly: boolean;
}

interface UseToolsReturn {
  tools: Tool[];
  allTools: Tool[];
  categories: Category[];
  clickData: ClickData[];
  budget: Budget;
  subscriptions: Subscription[];
  projects: Project[];
  filters: Filters;
  isLoading: boolean;
  error: string | null;
  toggleFavorite: (toolId: string) => Promise<{ success: boolean }>;
  saveNotes: (toolId: string, notes: string) => Promise<{ success: boolean }>;
  saveRating: (toolId: string, rating: number) => Promise<{ success: boolean }>;
  addTool: (tool: any) => Promise<{ success: boolean; data?: any; error?: any }>;
  editTool: (tool: any) => Promise<{ success: boolean }>;
  deleteTool: (toolId: string) => Promise<{ success: boolean }>;
  addCategory: (name: string) => Promise<{ success: boolean; data?: any }>;
  editCategory: (id: string, name: string) => Promise<{ success: boolean }>;
  deleteCategory: (id: string) => Promise<{ success: boolean }>;
  recordAccess: (toolId: string) => Promise<void>;
  resetClicks: () => Promise<{ success: boolean }>;
  setUserBudget: (monthly: number, yearly: number) => Promise<{ success: boolean }>;
  addSubscription: (sub: any) => Promise<{ success: boolean }>;
  deleteSubscription: (id: string) => Promise<{ success: boolean }>;
  confirmSubscriptionPayment: (id: string) => Promise<{ success: boolean }>;
  addProject: (project: any) => Promise<{ success: boolean }>;
  deleteProject: (id: string) => Promise<{ success: boolean }>;
  setCategory: (cat: string) => void;
  setSearch: (q: string) => void;
  setFavoritesOnly: (v: boolean) => void;
  clearFilters: () => void;
  clearError: () => void;
  refreshTools: () => void;
}

export function useTools(): UseToolsReturn {
  const { currentUser } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [budget, setBudget] = useState<Budget>({ monthly: 0, yearly: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ category: '', subcategory: '', search: '', favoritesOnly: false });

  const fetchWithAuth = useCallback(async (path: string, options: RequestInit = {}) => {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return resp;
  }, []);

  const loadTools = useCallback(async () => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const [toolsResp, catsResp, clicksResp] = await Promise.all([
        fetchWithAuth(`tools?select=*,user_tools!inner(*)&user_tools.user_id=eq.${currentUser.id}&order=created_at.desc`),
        fetchWithAuth('categories?select=*&order=name.asc'),
        fetchWithAuth(`tool_clicks?select=tool_id,count=eq.1&user_id=eq.${currentUser.id}`),
      ]);
      const toolsData = toolsResp.ok ? await toolsResp.json() : [];
      const catsData = catsResp.ok ? await catsResp.json() : [];
      const clicksData = clicksResp.ok ? await clicksResp.json() : [];
      
      const mappedTools = (toolsData || []).map((t: any) => ({
        ...t,
        isFavorite: t.user_tools?.[0]?.is_favorite || false,
        notes: t.user_tools?.[0]?.notes || '',
        rating: t.user_tools?.[0]?.rating || 0,
      }));
      
      setTools(mappedTools);
      setAllTools(mappedTools);
      setCategories(catsData || []);
      setClickData(clicksData || []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar ferramentas');
    }
    setIsLoading(false);
  }, [currentUser?.id, fetchWithAuth]);

  useEffect(() => { loadTools(); }, [loadTools]);

  // Actions
  const toggleFavorite = async (toolId: string) => {
    try {
      const resp = await fetchWithAuth(`user_tools?tool_id=eq.${toolId}&user_id=eq.${currentUser?.id}`, { method: 'PATCH', body: JSON.stringify({ is_favorite: true }) });
      if (!resp.ok) await fetchWithAuth('user_tools', { method: 'POST', body: JSON.stringify({ tool_id: toolId, user_id: currentUser?.id, is_favorite: true }) });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const saveNotes = async (toolId: string, notes: string) => {
    try {
      const resp = await fetchWithAuth(`user_tools?tool_id=eq.${toolId}&user_id=eq.${currentUser?.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      if (!resp.ok) await fetchWithAuth('user_tools', { method: 'POST', body: JSON.stringify({ tool_id: toolId, user_id: currentUser?.id, notes }) });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const saveRating = async (toolId: string, rating: number) => {
    try {
      const resp = await fetchWithAuth(`user_tools?tool_id=eq.${toolId}&user_id=eq.${currentUser?.id}`, { method: 'PATCH', body: JSON.stringify({ rating }) });
      if (!resp.ok) await fetchWithAuth('user_tools', { method: 'POST', body: JSON.stringify({ tool_id: toolId, user_id: currentUser?.id, rating }) });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const addTool = async (tool: any) => {
    try {
      const resp = await fetchWithAuth('tools', { method: 'POST', body: JSON.stringify({ ...tool, user_id: currentUser?.id }) });
      const data = resp.ok ? await resp.json() : null;
      loadTools();
      return { success: resp.ok, data };
    } catch (e: any) { return { success: false, error: e }; }
  };

  const editTool = async (tool: any) => {
    try {
      await fetchWithAuth(`tools?id=eq.${tool.id}`, { method: 'PATCH', body: JSON.stringify(tool) });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const deleteTool = async (toolId: string) => {
    try {
      await fetchWithAuth(`tools?id=eq.${toolId}`, { method: 'DELETE' });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const addCategory = async (name: string) => {
    try {
      const resp = await fetchWithAuth('categories', { method: 'POST', body: JSON.stringify({ name, color: '#8b5cf6' }) });
      const data = resp.ok ? await resp.json() : null;
      loadTools();
      return { success: resp.ok, data };
    } catch { return { success: false }; }
  };

  const editCategory = async (id: string, name: string) => {
    try {
      await fetchWithAuth(`categories?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const deleteCategory = async (id: string) => {
    try {
      await fetchWithAuth(`categories?id=eq.${id}`, { method: 'DELETE' });
      loadTools();
      return { success: true };
    } catch { return { success: false }; }
  };

  const recordAccess = async (toolId: string) => {
    try {
      await fetchWithAuth('tool_clicks', { method: 'POST', body: JSON.stringify({ tool_id: toolId, user_id: currentUser?.id, count: 1 }) });
    } catch { /* ignore */ }
  };

  const resetClicks = async () => { return { success: true }; };
  const setUserBudget = async (monthly: number, yearly: number) => { setBudget({ monthly, yearly }); return { success: true }; };
  const addSubscription = async () => { return { success: true }; };
  const deleteSubscription = async () => { return { success: true }; };
  const confirmSubscriptionPayment = async () => { return { success: true }; };
  const addProject = async () => { return { success: true }; };
  const deleteProject = async () => { return { success: true }; };

  const setCategory = (cat: string) => setFilters(f => ({ ...f, category: cat }));
  const setSearch = (q: string) => setFilters(f => ({ ...f, search: q }));
  const setFavoritesOnly = (v: boolean) => setFilters(f => ({ ...f, favoritesOnly: v }));
  const clearFilters = () => setFilters({ category: '', subcategory: '', search: '', favoritesOnly: false });
  const clearError = () => setError(null);
  const refreshTools = () => loadTools();

  return {
    tools, allTools, categories, clickData, budget, subscriptions, projects,
    filters, isLoading, error,
    toggleFavorite, saveNotes, saveRating, addTool, editTool, deleteTool,
    addCategory, editCategory, deleteCategory, recordAccess, resetClicks,
    setUserBudget, addSubscription, deleteSubscription, confirmSubscriptionPayment,
    addProject, deleteProject,
    setCategory, setSearch, setFavoritesOnly, clearFilters, clearError, refreshTools,
  };
}
