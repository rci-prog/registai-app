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
    const { data, error } = await supabase.from('tools').select('*').order('name');
    
    if (!error && data) {
      // 2ª CORREÇÃO: NORMALIZAÇÃO AGRESSIVA
      // Garante que 'category' seja sempre uma STRING, mesmo que venha objeto do banco
      const normalizedTools = data.map((t: any) => {
        let finalCategory = 'Geral';
        
        if (typeof t.category === 'string' && t.category.length > 0) {
          finalCategory = t.category;
        } else if (t.category_id && typeof t.category_id === 'string') {
          finalCategory = t.category_id;
        } else if (t.category && typeof t.category === 'object') {
          finalCategory = t.category.name || 'Geral';
        }

        return {
          ...t,
          category: finalCategory,
        };
      });
      setTools(normalizedTools);
    }
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) setCategories(data);
  }, []);

  const fetchUserTools = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('user_tools')
      .select('*, tool:tools(*)')
      .eq('user_id', uid);
    
    if (!error && data) {
      const validUserTools = data
        .filter(ut => ut.tool !== null)
        .map((ut: any) => {
          // Repete a blindagem para as ferramentas do usuário
          let toolCat = 'Geral';
          const t = ut.tool;

          if (typeof t.category === 'string' && t.category.length > 0) {
            toolCat = t.category;
          } else if (t.category_id && typeof t.category_id === 'string') {
            toolCat = t.category_id;
          } else if (t.category && typeof t.category === 'object') {
            toolCat = t.category.name || 'Geral';
          }

          return {
            ...ut,
            tool: {
              ...t,
              category: toolCat
            }
          };
        });
      setUserTools(validUserTools);
    }
  }, []);

  // Ajuste no addTool para garantir que não enviamos objetos
  const addTool = useCallback(async (tool: Omit<Tool, 'id'>) => {
    const { data, error } = await supabase.from('tools').insert(tool).select().single();
    if (!error) fetchTools(); 
    return { data, error };
  }, [fetchTools]);

  const addUserTool = useCallback(async (uid: string, toolId: string) => {
    const { data, error } = await supabase
      .from('user_tools')
      .insert({ user_id: uid, tool_id: toolId })
      .select()
      .single();
    if (!error) fetchUserTools(uid);
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
