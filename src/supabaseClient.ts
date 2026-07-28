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

  // 4. Rentals (대여 내역)
  async getRentals(userId: string): Promise<Rental[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('rentals')
      .select('*')
      .eq('user_id', userId)
      .order('rented_at', { ascending: false });

    if (error) {
      console.warn('getRentals error:', error.message);
      return [];
    }
    return data || [];
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

  async getActiveRentalCounts(): Promise<Record<string, number>> {
    const client = getSupabaseClient();
    if (!client) return {};

    const { data, error } = await client
      .from('rentals')
      .select('item_id')
      .in('status', ['pending_deposit', 'active']);

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
  }
};
