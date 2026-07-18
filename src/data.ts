import { Item, HubPin, Rental } from './types';

export const INITIAL_HUBS: HubPin[] = [
  { id: 'hub-1', name: '편의점 - 햇살점', type: 'store', count: 4, lat: 25, lng: 30, address: '햇살동 123-4 (도보 3분)' },
  { id: 'hub-2', name: '편의점 - 에코그린점', type: 'store', count: 2, lat: 70, lng: 20, address: '햇살동 55-12 (도보 5분)' },
  { id: 'hub-3', name: '편의점 - 단비점', type: 'store', count: 3, lat: 40, lng: 85, address: '햇살동 90-1 (도보 8분)' },
  { id: 'hub-4', name: '편의점 - 골목점', type: 'store', count: 1, lat: 85, lng: 75, address: '햇살동 14-8 (도보 10분)' },
  { id: 'hub-5', name: '카페 온도', type: 'cafe', count: 3, lat: 45, lng: 50, address: '햇살동 45-2 (도보 4분)' },
  { id: 'hub-6', name: '카페 - 그린 브루', type: 'cafe', count: 2, lat: 15, lng: 70, address: '햇살동 78-3 (도보 7분)' },
  { id: 'hub-7', name: '세탁소 - 깨끗 세탁소', type: 'laundry', count: 2, lat: 60, lng: 55, address: '햇살동 22-9 (도보 60m)' },
  { id: 'hub-8', name: '세탁소 - 햇살 드라이', type: 'laundry', count: 1, lat: 80, lng: 40, address: '햇살동 101-5 (도보 9분)' }
];

export const INITIAL_ITEMS: Item[] = [];

export const INITIAL_RENTALS: Rental[] = [];
