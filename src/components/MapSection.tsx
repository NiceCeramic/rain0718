import React, { useState, useEffect } from 'react';
import { Item } from '../types';
import { Station } from '../supabaseClient';
import { Icons } from './Icons';

interface MapSectionProps {
  stations?: Station[];
  items?: Item[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
  kakaoAppKey?: string;
}

export const MapSection: React.FC<MapSectionProps> = ({
  stations = [], // 🛡️ undefined 방지 기본값 세팅
  items = [],    // 🛡️ undefined 방지 기본값 세팅
  selectedHubId,
  onSelectHub,
}) => {
  const [currentLocationText, setCurrentLocationText] = useState<string>('경기도 평택시 / 주변 거점');

  // 안전하게 배열 검증
  const safeStations = Array.isArray(stations) ? stations : [];
  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setCurrentLocationText('현재 위치 기준 주변 공유 거점');
          },
          () => {
            setCurrentLocationText('기본 지역 공유 거점');
          },
          { timeout: 5000 }
        );
      }
    } catch (e) {
      console.warn('Geolocation error ignored:', e);
    }
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
      {/* 상단 타이틀 및 상태 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도 및 목록</h3>
            <p className="text-xs text-slate-400 font-medium">
              {currentLocationText} • 거점을 클릭하면 해당 위치의 물품만 모아볼 수 있습니다.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            🔄 전체 거점 보기
          </button>
        )}
      </div>

      {/* 거점 목록 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {safeStations.length === 0 ? (
          <div className="col-span-full py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            등록된 공유 거점을 불러오는 중이거나 거점이 없습니다.
          </div>
        ) : (
          safeStations.map((station) => {
            const hubItems = safeItems.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );
            const isSelected = selectedHubId === String(station.id);

            return (
              <div
                key={station.id}
                onClick={() => onSelectHub(isSelected ? null : String(station.id))}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 shadow-xs ${
                  isSelected
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {station.name}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    hubItems.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    물품 {hubItems.length}개
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 line-clamp-2 font-medium">
                  {hubItems.length > 0
                    ? `• ${hubItems.map((i) => i.title).join(', ')}`
                    : '현재 위탁 대기 중인 물품이 없습니다.'}
                </div>

                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>위도: {station.latitude ? station.latitude.toFixed(3) : '37.373'}</span>
                  <span className="text-teal-600 font-bold">{isSelected ? '필터링 적용중 ✓' : '클릭하여 선택'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
