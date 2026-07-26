import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Item, Rental, User, SupabaseConfig, RentalStatus, DepositStatus, ItemStatus } from './types';
import { INITIAL_ITEMS, INITIAL_RENTALS } from './data';

const STORAGE_KEYS = {
  CONFIG: 'ecolink_supabase_config',
  ITEMS: 'ecolink_local_items_v4',
  RENTALS: 'ecolink_local_rentals_v4',
  USERS: 'ecolink_local_users_v4'
};

const getLocalItems = (): Item[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
    return INITIAL_ITEMS;
  }
  return JSON.parse(data);
};

const saveLocalItems = (items: Item[]) => {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
};

const getLocalRentals = (): Rental[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RENTALS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.RENTALS, JSON.stringify(INITIAL_RENTALS));
    return INITIAL_RENTALS;
  }
  return JSON.parse(data);
};

const saveLocalRentals = (rentals: Rental[]) => {
  localStorage.setItem(STORAGE_KEYS.RENTALS, JSON.stringify(rentals));
};

const getLocalUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

const saveLocalUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return { url: '', anonKey: '', isEnabled: false };
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

export const getKakaoAppKey = (): string => {
  return localStorage.getItem('ecolink_kakao_appkey') || '831bd4a5b3258ea9dc1b78b9e3a9b2fb';
};

export const saveKakaoAppKey = (key: string) => {
  localStorage.setItem('ecolink_kakao_appkey', key);
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const config = getSupabaseConfig();

  const url = envUrl || (config.isEnabled ? config.url : '');
  const anonKey = envAnonKey || (config.isEnabled ? config.anonKey : '');

  if (!url || !anonKey) {
    supabaseInstance = null;
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (err) {
      console.error('Failed to create Supabase client', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
};

export interface Station {
  id: number;
  created_at: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

const mapDbRentalToRental = (row: any): Rental => ({
  ...row,
  user_id: row.renter_id,
  deposit: row.deposit ?? 0,
  price_paid: row.price_paid ?? 0
});

export const api = {
  isSupabaseActive: (): boolean => {
    return getSupabaseClient() !== null;
  },

  // 1. ITEMS (타인이 등록한 물품 포함 전체 안전 조회)
  getItems: async (): Promise<Item[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('getItems DB error:', error);
          throw error;
        }

        if (data) {
          return data.map((row: any) => ({
            ...row,
            price: row.price ?? row.price_per_hour ?? 1000,
            location: row.location || row.hub_name || '지정 거점',
            status: row.status || 'available',
            quantity: row.quantity ?? 1
          })) as Item[];
        }
      } catch (err) {
        console.warn('Supabase getItems failed, falling back to local storage:', err);
      }
    }
    return getLocalItems();
  },

  getActiveRentalCounts: async (): Promise<Record<string, number>> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('rentals')
          .select('item_id')
          .in('status', ['pending_deposit', 'active']);

        if (error) throw error;
        if (data) {
          return (data as { item_id: string | number }[]).reduce((acc, row) => {
            const key = String(row.item_id);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      } catch (err) {
        console.warn('Supabase getActiveRentalCounts failed:', err);
      }
    }
    return {};
  },

  // 📸 물품 위탁 등록 (컬럼 미존재 에러 방지용 가공 및 전송)
  insertItem: async (newItem: Omit<Item, 'id' | 'created_at'>): Promise<Item> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload: any = {
          title: newItem.title,
          category: newItem.category,
          price: (newItem as any).price ?? 1000,
          price_per_hour: (newItem as any).price ?? 1000,
          location: newItem.location || (newItem as any).hub_name || '지정 거점',
          hub_name: (newItem as any).hub_name || newItem.location || '지정 거점',
          status: newItem.status || 'available',
          color: newItem.color || '#0f766e',
          description: newItem.description || '',
          viewers: newItem.viewers || 1,
          image_url: (newItem as any).image_url || null,
          owner_id: (newItem as any).owner_id || null,
          quantity: (newItem as any).quantity ?? 1
        };

        const { data, error } = await supabase
          .from('items')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Supabase insertItem 상세 에러:', error);
          throw error;
        }
        if (data) return data as Item;
      } catch (err) {
        console.warn('Supabase insertItem failed:', err);
        throw err;
      }
    }

    const localItems = getLocalItems();
    const mockId = localItems.length > 0 ? Math.max(...localItems.map(i => typeof i.id === 'number' ? i.id : 0)) + 1 : 1;
    const itemWithId: Item = {
      ...newItem,
      id: mockId,
      created_at: new Date().toISOString()
    };
    saveLocalItems([itemWithId, ...localItems]);
    return itemWithId;
  },

  updateItemStatus: async (itemId: string | number, status: ItemStatus): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('items')
          .update({ status })
          .eq('id', itemId);

        if (!error) return true;
        throw error;
      } catch (err) {
        console.warn('Supabase updateItemStatus failed, falling back to local storage:', err);
      }
    }

    const localItems = getLocalItems();
    const updated = localItems.map(item =>
      item.id === itemId || String(item.id) === String(itemId)
        ? { ...item, status }
        : item
    );
    saveLocalItems(updated);
    return true;
  },

  // 1b. STATIONS
  getStations: async (): Promise<Station[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        if (data) return data as Station[];
      } catch (err) {
        console.warn('Supabase getStations failed:', err);
      }
    }
    return [];
  },

  insertStation: async (
    name: string,
    latitude: number | null = null,
    longitude: number | null = null
  ): Promise<Station | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('insertStation failed: Supabase is not configured.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('stations')
        .insert([{ name: name.trim(), latitude, longitude }])
        .select()
        .single();

      if (error) throw error;
      return data as Station;
    } catch (err) {
      console.warn('Supabase insertStation failed:', err);
      return null;
    }
  },

  // 2. RENTALS
  getRentals: async (userId: string): Promise<Rental[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('rentals')
          .select('*')
          .order('rented_at', { ascending: false });

        if (error) throw error;
        if (data) {
          const mapped = (data as any[]).map(mapDbRentalToRental);
          const userObj = getLocalUsers().find(u => u.id === userId) || { role: 'user' };
          if (userObj.role === 'admin') {
            return mapped;
          }
          return mapped.filter(r => r.user_id === userId);
        }
      } catch (err) {
        console.warn('Supabase getRentals failed, falling back to local storage:', err);
      }
    }

    const localRentals = getLocalRentals();
    const localUsers = getLocalUsers();
    const activeUser = localUsers.find(u => u.id === userId);

    if (activeUser?.role === 'admin') {
      return localRentals;
    }
    return localRentals.filter(r => r.user_id === userId);
  },

  insertRental: async (newRental: Omit<Rental, 'id' | 'rented_at'>): Promise<Rental> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('rentals')
        .insert([{
          renter_id: newRental.user_id,
          item_id: newRental.item_id,
          status: newRental.status,
          deposit_status: newRental.deposit_status
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (data) {
        return {
          ...mapDbRentalToRental(data),
          deposit: newRental.deposit,
          price_paid: newRental.price_paid
        };
      }
    }

    const localRentals = getLocalRentals();
    const mockId = 'rent-' + (localRentals.length + 1) + '-' + Math.floor(Math.random() * 1000);
    const rentalWithId: Rental = {
      ...newRental,
      id: mockId,
      rented_at: new Date().toISOString(),
      status: newRental.status || 'pending_deposit',
      deposit_status: newRental.deposit_status || 'holding'
    };
    saveLocalRentals([rentalWithId, ...localRentals]);
    return rentalWithId;
  },

  updateRentalStatus: async (
    rentalId: string | number,
    status: RentalStatus,
    depositStatus?: DepositStatus
  ): Promise<boolean> => {
    const supabase = getSupabaseClient();
    const updatePayload: any = { status };
    if (depositStatus) {
      updatePayload.deposit_status = depositStatus;
    }
    if (status === 'returned') {
      updatePayload.returned_at = new Date().toISOString();
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('rentals')
          .update(updatePayload)
          .eq('id', rentalId);

        if (!error) return true;
        throw error;
      } catch (err) {
        console.warn('Supabase updateRentalStatus failed, falling back to local storage:', err);
      }
    }

    const localRentals = getLocalRentals();
    const updated = localRentals.map(rental => {
      if (rental.id === rentalId || String(rental.id) === String(rentalId)) {
        return {
          ...rental,
          status,
          ...(depositStatus ? { deposit_status: depositStatus } : {}),
          ...(status === 'returned' ? { returned_at: new Date().toISOString() } : {})
        };
      }
      return rental;
    });
    saveLocalRentals(updated);
    return true;
  },

  // 3. USERS
  getUser: async (userId: string): Promise<User | null> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return data as User;
        }
      } catch (err) {
        console.warn('Supabase getUser failed:', err);
      }
    }
    const localUsers = getLocalUsers();
    return localUsers.find(u => u.id === userId) || null;
  },

  upsertUser: async (user: User): Promise<void> => {
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.id === user.id);
    if (index >= 0) {
      localUsers[index] = user;
    } else {
      localUsers.push(user);
    }
    saveLocalUsers(localUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          await supabase
            .from('users')
            .update({ name: user.name, role: user.role })
            .eq('id', user.id);
        } else {
          await supabase
            .from('users')
            .insert([{ id: user.id, name: user.name, role: user.role }]);
        }
      } catch (err) {
        console.warn('Supabase upsertUser failed:', err);
      }
    }
  },

  // 💬 4. CHAT (실시간 1:1 대여 문의 채팅 API)
  getOrCreateChatRoom: async (itemId: number | string, buyerId: string, sellerId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const stringItemId = String(itemId);
      const { data: existingList, error: searchErr } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('item_id', stringItemId)
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId);

      if (!searchErr && existingList && existingList.length > 0) {
        return existingList[0];
      }

      const { data: created, error: createErr } = await supabase
        .from('chat_rooms')
        .insert([{ item_id: stringItemId, buyer_id: buyerId, seller_id: sellerId }])
        .select()
        .single();

      if (createErr) throw createErr;
      return created;
    } catch (err) {
      console.error('getOrCreateChatRoom failed:', err);
      return null;
    }
  },

  // 🥕 당근마켓 스타일: 내가 참여한 모든 채팅방 목록 및 연관 정보(상대방 이름, 물품, 사진, 마지막 메시지) 조회
  getMyChatRooms: async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data: rooms, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (roomErr || !rooms) return [];

      const enrichedRooms = await Promise.all(
        rooms.map(async (room) => {
          // 물품 정보
          const { data: item } = await supabase
            .from('items')
            .select('title, category, color, location, image_url')
            .eq('id', room.item_id)
            .maybeSingle();

          // 상대방 정보
          const otherUserId = room.buyer_id === userId ? room.seller_id : room.buyer_id;
          const { data: otherUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', otherUserId)
            .maybeSingle();

          // 마지막 메시지 (message 또는 message_text 호환)
          const { data: lastMsgs } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsgText = lastMsgs && lastMsgs.length > 0
            ? (lastMsgs[0].message || lastMsgs[0].message_text || '메시지가 있습니다.')
            : '대화가 시작되었습니다.';

          return {
            ...room,
            item_title: item?.title || '공유 자원 물품',
            item_category: item?.category || '기타',
            item_color: item?.color || '#0f766e',
            item_image_url: item?.image_url || null,
            other_user_name: otherUser?.name || '에코멤버',
            last_message: lastMsgText,
            last_time: lastMsgs && lastMsgs.length > 0 ? lastMsgs[0].created_at : room.created_at,
          };
        })
      );

      return enrichedRooms;
    } catch (err) {
      console.error('getMyChatRooms failed:', err);
      return [];
    }
  },

  getMessages: async (roomId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // DB 컬럼이 message 또는 message_text 중 어떤 것이든 프론트엔드 message 속성으로 호환 매핑
      return (data || []).map((row: any) => ({
        ...row,
        message: row.message || row.message_text || ''
      }));
    } catch (err) {
      console.error('getMessages failed:', err);
      return [];
    }
  },

  sendMessage: async (roomId: string, senderId: string, text: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      // 🔑 DB 구조(message vs message_text)에 유연하게 대응하도록 보완
      const payload: any = {
        room_id: roomId,
        sender_id: senderId,
        message: text
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // message 컬럼이 없어 실패한 경우 message_text 컬럼으로 폴백 시도
        if (error.message?.includes('message') || error.code === 'PGRST204') {
          const fallbackPayload = {
            room_id: roomId,
            sender_id: senderId,
            message_text: text
          };
          const { data: fbData, error: fbError } = await supabase
            .from('messages')
            .insert([fallbackPayload])
            .select()
            .single();

          if (fbError) throw fbError;
          return { ...fbData, message: fbData.message_text };
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('sendMessage failed:', err);
      throw err;
    }
  }
};
