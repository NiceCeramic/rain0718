import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Item, Rental, User } from './types';

export interface Station {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  itemCount?: number;
}

const SUPABASE_URL_KEY = 'ecolink_supabase_url';
const SUPABASE_ANON_KEY_KEY = 'ecolink_supabase_anon_key';
const KAKAO_KEY_KEY = 'ecolink_kakao_app_key';

export function getSupabaseConfig() {
  const url = localStorage.getItem(SUPABASE_URL_KEY) || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    url,
    anonKey,
    isEnabled: Boolean(url && anonKey)
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY_KEY, anonKey.trim());
  cachedClient = null;
}

export function getKakaoAppKey(): string {
  return localStorage.getItem(KAKAO_KEY_KEY) || import.meta.env.VITE_KAKAO_APP_KEY || '';
}

export function saveKakaoAppKey(key: string) {
  localStorage.setItem(KAKAO_KEY_KEY, key.trim());
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config.isEnabled) {
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey);
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// 📦 API Service Wrapper
export const api = {
  get supabase() {
    return getSupabaseClient();
  },

  // 1. Users
  async getUser(userId: string): Promise<User | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('getUser error:', error.message);
      return null;
    }
    return data;
  },

  async upsertUser(user: User): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('users').upsert(user);
    if (error) {
      console.warn('upsertUser error:', error.message);
    }
  },

  // 2. Stations (거점)
  async getStations(): Promise<Station[]> {
    const client = getSupabaseClient();
    if (!client) {
      return [
        { id: 1, name: '동탄이마트', lat: 37.201, lng: 127.075, address: '경기도 화성시 동탄중앙로 376' },
        { id: 2, name: '서울대 시흥캠퍼스 정문', lat: 37.342, lng: 126.733, address: '경기도 시흥시 서울대학로 173' },
        { id: 3, name: '오산이마트', lat: 37.149, lng: 127.077, address: '경기도 오산시 경기대로 211' },
        { id: 4, name: '이마트', lat: 37.350, lng: 127.105, address: '경기도 성남시 분당구' },
      ];
    }

    const { data, error } = await client.from('stations').select('*');
    if (error || !data || data.length === 0) {
      return [
        { id: 1, name: '동탄이마트', lat: 37.201, lng: 127.075, address: '경기도 화성시 동탄중앙로 376' },
        { id: 2, name: '서울대 시흥캠퍼스 정문', lat: 37.342, lng: 126.733, address: '경기도 시흥시 서울대학로 173' },
        { id: 3, name: '오산이마트', lat: 37.149, lng: 127.077, address: '경기도 오산시 경기대로 211' },
        { id: 4, name: '이마트', lat: 37.350, lng: 127.105, address: '경기도 성남시 분당구' },
      ];
    }
    return data;
  },

  // 3. Items (공급 물품)
  async getItems(): Promise<Item[]> {
    const client = getSupabaseClient();
    if (!client) {
      const cached = localStorage.getItem('ecolink_mock_items');
      if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
      }
      return [
        { id: 101, title: '이불', category: 'etc', price: 1000, color: '#0f766e', location: '동탄이마트', status: 'available', description: '깨끗하게 세탁된 차렵이불입니다.' },
        { id: 102, title: '캠핑용타프', category: 'tools', price: 3000, color: '#d97706', location: '오산이마트', status: 'available', description: '주말 캠핑용 타프 및 폴대 세트입니다.' },
        { id: 103, title: '우산', category: 'umbrella', price: 1000, color: '#0f766e', location: '서울대 시흥캠퍼스 정문', status: 'available', description: '튼튼한 3단 자동 우산입니다.' }
      ];
    }

    const { data, error } = await client.from('items').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      return [];
    }
    return data;
  },

  async insertItem(item: Omit<Item, 'id' | 'created_at'>): Promise<Item | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client.from('items').insert([item]).select().single();
    if (error) {
      console.error('insertItem error:', error);
      throw error;
    }
    return data;
  },

  async updateItemStatus(itemId: string | number, status: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('items')
      .update({ status })
      .eq('id', itemId);

    if (error) {
      console.warn('updateItemStatus error:', error.message);
    }
  },

  // 4. Rentals (대여 및 위탁 거래 내역 양방향 조회)
  async getRentals(userId: string): Promise<Rental[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data: myRentals } = await client
      .from('rentals')
      .select('*')
      .eq('user_id', userId);

    const { data: myItems } = await client
      .from('items')
      .select('id')
      .eq('owner_id', userId);

    let sharedRentals: any[] = [];
    if (myItems && myItems.length > 0) {
      const myItemIds = myItems.map(item => item.id);
      const { data: itemRentals } = await client
        .from('rentals')
        .select('*')
        .in('item_id', myItemIds);

      if (itemRentals) {
        sharedRentals = itemRentals;
      }
    }

    const allRentalsMap = new Map();
    [...(myRentals || []), ...sharedRentals].forEach(r => {
      allRentalsMap.set(r.id, r);
    });

    const combined = Array.from(allRentalsMap.values());
    combined.sort((a, b) => new Date(b.rented_at).getTime() - new Date(a.rented_at).getTime());

    return combined;
  },

  async insertRental(rental: Omit<Rental, 'id' | 'rented_at'>): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('rentals').insert([rental]);
    if (error) {
      console.error('insertRental error:', error);
      throw error;
    }
  },

  async updateRentalStatus(rentalId: string | number, status: string, depositStatus?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error: err1 } = await client
      .from('rentals')
      .update({ status })
      .eq('id', rentalId);

    if (err1) throw err1;

    try {
      const extraData: any = {};
      if (depositStatus) extraData.deposit_status = depositStatus;
      if (status === 'returned') extraData.returned_at = new Date().toISOString();

      if (Object.keys(extraData).length > 0) {
        await client.from('rentals').update(extraData).eq('id', rentalId);
      }
    } catch (e) {
      console.warn('Optional rental column update skipped:', e);
    }
  },

  async getActiveRentalCounts(): Promise<Record<string, number>> {
    const client = getSupabaseClient();
    if (!client) return {};

    const { data, error } = await client
      .from('rentals')
      .select('item_id')
      .in('status', ['pending_deposit', 'active', 'pending_return']);

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    data.forEach((r: any) => {
      const idStr = String(r.item_id);
      counts[idStr] = (counts[idStr] || 0) + 1;
    });
    return counts;
  },

  // 5. '빌려주세요' (Item Requests) 수요 요청 API
  async createItemRequest(request: {
    title: string;
    category: string;
    description: string;
    location: string;
    requester_id: string;
    requester_name: string;
  }) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not initialized');

    const { data, error } = await client.from('item_requests').insert([request]).select();
    if (error) {
      console.error('createItemRequest error:', error);
      throw error;
    }
    return data;
  },

  async getItemRequests() {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('item_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getItemRequests error:', error);
      return [];
    }
    return data || [];
  },

  // 6. Chat Rooms & Messages (1:1 채팅 관련 API)
  async getMyChatRooms(userId: string) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data: rooms, error } = await client
      .from('chat_rooms')
      .select('*, items(*)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !rooms) {
      console.warn('getMyChatRooms error:', error);
      return [];
    }

    const enrichedRooms = await Promise.all(
      rooms.map(async (room: any) => {
        const otherUserId = String(room.buyer_id) === String(userId) ? room.seller_id : room.buyer_id;
        
        let otherUserName = '상대방';
        if (otherUserId) {
          const { data: userData } = await client
            .from('users')
            .select('name')
            .eq('id', otherUserId)
            .maybeSingle();
          if (userData && userData.name) {
            otherUserName = userData.name;
          }
        }

        const { data: msgData } = await client
          .from('messages')
          .select('message, created_at')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: room.id,
          item_id: room.item_id,
          buyer_id: room.buyer_id,
          seller_id: room.seller_id,
          item_title: room.items?.title || '공유 자원',
          item_category: room.items?.category || 'etc',
          item_color: room.items?.color || '#0f766e',
          other_user_name: otherUserName,
          last_message: msgData?.message || '대화 내용이 없습니다.',
          last_time: msgData?.created_at || room.created_at,
        };
      })
    );

    return enrichedRooms;
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

  async getMessages(roomId: string | number) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('getMessages error:', error);
      return [];
    }
    return data || [];
  },

  async sendMessage(roomId: string | number, senderId: string, message: string) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('messages')
      .insert([{ room_id: roomId, sender_id: senderId, message }])
      .select()
      .single();

    if (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
    return data;
  },

  async markMessagesAsRead(roomId: string | number, userId: string) {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', userId);

    if (error) {
      console.warn('markMessagesAsRead error:', error);
    }
  }
};
