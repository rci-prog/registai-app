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
    // Adicionamos um select que garante que a estrutura venha correta
    const { data, error } = await supabase.from('tools').select('*').order('name');
    if (!error && data) setTools(data);
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) setCategories(data);
  }, []);

  const fetchUserTools = useCallback(async (uid: string) => {
    // AQUI ESTÁ O PONTO CRÍTICO: 
    // Garantimos que ele tente buscar a tool e a categoria vinculada
    const { data, error } = await supabase
      .from('user_tools')
      .select('*, tool:tools(*, category:categories(*))')
      .eq('user_id', uid);
    
    if (!error && data) {
      // Filtramos entradas onde a 'tool' pode ter vindo nula por erro de integridade no banco
      const validUserTools = data.filter(ut => ut.tool !== null);
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
