import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Item, Rental, User, SupabaseConfig, RentalStatus, DepositStatus, ItemStatus } from './types';
import { INITIAL_ITEMS, INITIAL_RENTALS } from './data';

const STORAGE_KEYS = {
  CONFIG: 'ecolink_supabase_config',
  ITEMS: 'ecolink_local_items_v4',
  RENTALS: 'ecolink_local_rentals_v4',
  USERS: 'ecolink_local_users_v4'
};

// Local storage helpers for mock mode
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

// Config Manager
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

// Singleton Supabase instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  // Prefer env vars (set on Vercel etc.) so the app works on any device/browser
  // without needing localStorage to be manually configured first.
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

// Real station/hub row shape, matches public.stations columns exactly
export interface Station {
  id: number;
  created_at: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

// ---------------------------------------------------------------------------
// NOTE ON MAPPING:
// The DB schema (public.rentals) uses `renter_id` as the column name, while
// the frontend (App.tsx / types.ts) uses `user_id`. The DB also does not have
// `deposit` / `price_paid` columns on rentals, nor a `phone` column on
// `public.users`. Rather than touching App.tsx or re-running SQL, we translate
// between DB shape and frontend shape right here in the adapter layer.
// ---------------------------------------------------------------------------

const mapDbRentalToRental = (row: any): Rental => ({
  ...row,
  user_id: row.renter_id,
  deposit: row.deposit ?? 0,
  price_paid: row.price_paid ?? 0
});

// Adapter APIs
export const api = {
  // Check if we are active on Supabase or local
  isSupabaseActive: (): boolean => {
    return getSupabaseClient() !== null;
  },

  // 1. ITEMS
  getItems: async (): Promise<Item[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          // Map to match frontend types if column names are direct
          return data as Item[];
        }
      } catch (err) {
        console.warn('Supabase getItems failed, falling back to local storage:', err);
      }
    }
    return getLocalItems();
  },

  // Counts currently-active (not yet returned/canceled) rentals per item, across all users.
  // Used to compute "재고 - 대여중 = 남은 수량" for the browse feed.
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

  insertItem: async (newItem: Omit<Item, 'id' | 'created_at'>): Promise<Item> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert([{
            ...newItem,
            // public.items has a NOT NULL price_per_hour column separate from `price`;
            // keep both in sync so inserts don't fail even before the SQL migration runs.
            price_per_hour: (newItem as any).price ?? 0
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) return data as Item;
      } catch (err) {
        console.warn('Supabase insertItem failed, falling back to local storage:', err);
      }
    }

    // Local Fallback
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

    // Local Fallback
    const localItems = getLocalItems();
    const updated = localItems.map(item =>
      item.id === itemId || String(item.id) === String(itemId)
        ? { ...item, status }
        : item
    );
    saveLocalItems(updated);
    return true;
  },

  // 1b. STATIONS (real hubs/보관함, from public.stations — replaces the old hardcoded INITIAL_HUBS)
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
  // No local/mock fallback on purpose — an empty list is the honest answer
    // when Supabase isn't configured or no stations have been registered yet.
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

          // If we are admin, return all, otherwise filter for user_id
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
          // NOTE: `deposit` / `price_paid` are not columns on public.rentals.
          // If you want them persisted, run in Supabase SQL editor:
          //   alter table public.rentals add column if not exists deposit integer default 0;
          //   alter table public.rentals add column if not exists price_paid integer default 0;
          // then uncomment the two lines below.
          // deposit: newRental.deposit,
          // price_paid: newRental.price_paid,
        }])
        .select()
        .single();

      if (error) {
        // Real rejections (e.g. the stock-exhausted trigger, RLS denial) must
        // reach the caller as a real failure — silently falling back to
        // localStorage here would tell the user "성공" when the item was
        // actually sold out.
        throw error;
      }
      if (data) {
        return {
          ...mapDbRentalToRental(data),
          // preserve values the DB doesn't store yet, so the UI still shows them
          deposit: newRental.deposit,
          price_paid: newRental.price_paid
        };
      }
    }

    // Local Fallback — only used when Supabase isn't configured at all
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

    // Local Fallback
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
          .maybeSingle(); // returns null instead of a 406 error when 0 rows exist

        if (error) throw error;
        if (data) {
          return data as User;
        }
        // No row found for this user yet (e.g. first login after a schema reset) —
        // fall through to local storage / let the caller create a new profile.
      } catch (err) {
        console.warn('Supabase getUser failed:', err);
      }
    }
    const localUsers = getLocalUsers();
    return localUsers.find(u => u.id === userId) || null;
  },

  upsertUser: async (user: User): Promise<void> => {
    // Keep local registry updated for permissions mapping
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
        // First try to select
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(); // returns null instead of a 406 error when 0 rows exist

        if (data) {
          await supabase
            .from('users')
            // NOTE: public.users has no `phone` column (that lives on public.profiles).
            // Sending it here would cause a "column not found" error, so it's omitted.
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
  }
};
