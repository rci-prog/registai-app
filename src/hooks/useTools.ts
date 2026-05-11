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
    const { data, error } = await supabase.from('tools').select('*');
    if (!error && data) setTools(data);
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error && data) setCategories(data);
  }, []);

  const fetchUserTools = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('user_tools')
      .select('*, tool:tools(*)')
      .eq('user_id', uid);
    if (!error && data) setUserTools(data);
  }, []);

  const addTool = useCallback(async (tool: Omit<Tool, 'id'>) => {
    const { data, error } = await supabase.from('tools').insert(tool).select().single();
    return { data, error };
  }, []);

  const addUserTool = useCallback(async (userId: string, toolId: string) => {
    const { data, error } = await supabase
      .from('user_tools')
      .insert({ user_id: userId, tool_id: toolId })
      .select()
      .single();
    return { data, error };
  }, []);

  const removeUserTool = useCallback(async (userToolId: string) => {
    const { error } = await supabase.from('user_tools').delete().eq('id', userToolId);
    return !error;
  }, []);

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
