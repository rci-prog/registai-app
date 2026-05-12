import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tool, Category, UserTool } from '@/types';

export function useTools(userId?: string) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userTools, setUserTools] = useState<UserTool[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    // Buscamos todas as colunas da tabela tools para garantir compatibilidade
    const { data, error } = await supabase.from('tools').select('*').order('name');
    
    if (!error && data) {
      // NORMALIZAÇÃO: Garante que 'category' seja sempre uma string válida, evitando crash no frontend
      const normalizedTools = data.map((t: any) => ({
        ...t,
        // Prioridade: category_id (novo FK texto) -> category (coluna antiga texto) -> 'Geral' (fallback)
        category: t.category_id || t.category || 'Geral',
      }));
      setTools(normalizedTools);
    }
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) setCategories(data);
  }, []);

  const fetchUserTools = useCallback(async (uid: string) => {
    // PONTO CRÍTICO: Simplificado para evitar falhas de join caso a FK ainda esteja em migração
    const { data, error } = await supabase
      .from('user_tools')
      .select('*, tool:tools(*)')
      .eq('user_id', uid);
    
    if (!error && data) {
      // Blindagem adicional: normaliza a categoria dentro do objeto da ferramenta vinculada
      const validUserTools = data
        .filter(ut => ut.tool !== null)
        .map((ut: any) => ({
          ...ut,
          tool: {
            ...ut.tool,
            category: ut.tool.category_id || ut.tool.category || 'Geral'
          }
        }));
      setUserTools(validUserTools);
    }
  }, []);

  const addTool = useCallback(async (tool: Omit<Tool, 'id'>) => {
    const { data, error } = await supabase.from('tools').insert(tool).select().single();
    if (!error) fetchTools(); // Atualiza a lista local
    return { data, error };
  }, [fetchTools]);

  const addUserTool = useCallback(async (uid: string, toolId: string) => {
    const { data, error } = await supabase
      .from('user_tools')
      .insert({ user_id: uid, tool_id: toolId })
      .select()
      .single();
    if (!error) fetchUserTools(uid); // Atualiza a lista do usuário
    return { data, error };
  }, [fetchUserTools]);

  const removeUserTool = useCallback(async (userToolId: string) => {
    const { error } = await supabase.from('user_tools').delete().eq('id', userToolId);
    if (!error && userId) fetchUserTools(userId);
    return !error;
  }, [userId, fetchUserTools]);

  useEffect(() => {
    fetchTools();
    fetchCategories();
  }, [fetchTools, fetchCategories]);

  useEffect(() => {
    if (userId) fetchUserTools(userId);
  }, [userId, fetchUserTools]);

  return {
    tools,
    categories,
    userTools,
    loading,
    fetchTools,
    fetchCategories,
    fetchUserTools,
    addTool,
    addUserTool,
    removeUserTool,
  };
}
