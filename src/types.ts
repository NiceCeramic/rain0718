export type UserRole = 'user' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  phone?: string;
  role: UserRole;
  created_at?: string;
}

export type ItemCategory = '우산' | '양산' | '보조배터리';
export type ItemStatus = 'available' | 'rented' | 'broken';

export interface Item {
  id: string | number;
  owner_id: string;
  title: string;
  category: ItemCategory;
  location: string;
  distance: string;
  price: number;
  color: string; // Hex color code
  status: ItemStatus;
  description: string;
  rating: number;
  reviews: number;
  viewers: number;
  created_at?: string;
}

export type RentalStatus = 'pending_deposit' | 'active' | 'returned';
export type DepositStatus = 'holding' | 'refunded' | 'none';

export interface Rental {
  id: string | number;
  user_id: string;
  item_id: string | number;
  rented_at: string;
  returned_at?: string;
  deposit: number;
  price_paid: number;
  status: RentalStatus;
  deposit_status: DepositStatus;
}

export interface HubPin {
  id: string;
  name: string;
  type: 'store' | 'cafe' | 'laundry';
  count: number;
  lat: number; // For plotting on our custom box map (0-100)
  lng: number; // For plotting on our custom box map (0-100)
  address: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
}
