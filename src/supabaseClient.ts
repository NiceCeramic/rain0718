import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase 환경변수가 설정되지 않았습니다.');
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

export const supabaseApi = {
  // 6. Chat Rooms (1:1 채팅 관련)
  async getMyChatRooms(userId: string) {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('chat_rooms')
      .select('*, items(*)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('getMyChatRooms error:', error);
      return [];
    }
    return data || [];
  },

  async getOrCreateChatRoom(itemId: string | number, buyerId: string, sellerId: string) {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data: existing } = await client
      .from('chat_rooms')
      .select('*')
      .eq('item_id', itemId)
      .eq('buyer_id', buyerId)
      .maybeSingle();
    if (existing) return existing;
    const { data: newRoom, error } = await client
      .from('chat_rooms')
      .insert([{ item_id: itemId, buyer_id: buyerId, seller_id: sellerId }])
      .select()
      .single();
    if (error) {
      console.warn('getOrCreateChatRoom error:', error);
      return null;
    }
    return newRoom;
  },
};
