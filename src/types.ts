export type UserRole = 'user' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  phone?: string;
  role: UserRole;
  created_at?: string;
}

// 💡 확장된 카테고리 타입 (영문 ID 및 한글 호환)
export type ItemCategory = 
  | 'umbrella' 
  | 'sunshade' 
  | 'battery' 
  | 'tools' 
  | 'electronics' 
  | 'etc' 
  | '우산' 
  | '양산' 
  | '보조배터리';

export type ItemStatus = 'available' | 'rented' | 'broken';

export interface Item {
  id: string | number;
  owner_id: string;
  title: string;
  category: ItemCategory;
  location: string;
  hub_name?: string; // 💡 신규 거점명 필드 추가
  distance: string;
  price: number;
  quantity?: number; // 💡 대여 가능 수량 필드 추가
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
  lat: number; // For plotting on custom map
  lng: number; // For plotting on custom map
  address: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
}
