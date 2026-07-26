import React, { useEffect, useRef, useState } from 'react';
import { Item } from '../types';
import { Station } from '../supabaseClient';
import { Icons } from './Icons';

interface MapSectionProps {
  stations: Station[];
  items: Item[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  stations,
  items,
  selectedHubId,
  onSelectHub,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 37.373,
    lng: 126.804,
  });

  // 내 GPS 위치 조회
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // 기본 위치 유지
        }
      );
    }
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
            <Icons.MapPin size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">내 주변 자원 공유 거점 목록</h3>
            <p className="text-[10px] text-slate-400">
              위탁 거점을 선택하여 인근 물품을 둘러보세요.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer"
          >
            전체 거점 보기
          </button>
        )}
      </div>

      {/* 📍 공유 거점 카드 및 핀 목록 (API Key 없이 완벽 작동) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
        {stations.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            등록된 공유 거점이 없습니다.
          </div>
        ) : (
          stations.map((station) => {
            const hubItems = items.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );
            const isSelected = selectedHubId === String(station.id);

            return (
              <div
                key={station.id}
                onClick={() => onSelectHub(isSelected ? null : String(station.id))}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-teal-50/80 border-teal-500 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:border-teal-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <span className="font-bold text-xs text-slate-800 truncate max-w-[130px]">
                      {station.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold shrink-0">
                    물품 {hubItems.length}개
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {hubItems.length > 0
                    ? `• ${hubItems.map((i) => i.title).join(', ')}`
                    : '현재 위탁 대기 중'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
