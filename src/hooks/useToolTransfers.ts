import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ToolTransfer } from '@/types';

export function useToolTransfers() {
  const [transfers, setTransfers] = useState<ToolTransfer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingTransfers = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tool_transfers')
      .select('*')
      .eq('to_user_email', userId)
      .eq('status', 'pending');
    if (!error && data) setTransfers(data);
    setLoading(false);
  }, []);

  const createTransfer = useCallback(async (
    fromUserId: string,
    toUserEmail: string,
    toolIds: string[]
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('tool_transfers')
      .insert({
        from_user_id: fromUserId,
        to_user_email: toUserEmail,
        tool_ids: toolIds,
        status: 'pending',
      });
    return !error;
  }, []);

  const acceptTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tool_transfers')
      .update({ status: 'accepted' })
      .eq('id', transferId);
    return !error;
  }, []);

  const rejectTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tool_transfers')
      .update({ status: 'rejected' })
      .eq('id', transferId);
    return !error;
  }, []);

  return {
    transfers,
    loading,
    fetchPendingTransfers,
    createTransfer,
    acceptTransfer,
    rejectTransfer,
  };
}
