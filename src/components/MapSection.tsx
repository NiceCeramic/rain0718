import React from 'react';
import { Item } from '../types';
import { Station } from '../supabaseClient';
import { Icons } from './Icons';

interface MapSectionProps {
  stations?: Station[];
  items?: Item[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  stations = [],
  items = [],
  selectedHubId,
  onSelectHub,
}) => {
  const safeStations = Array.isArray(stations) ? stations : [];

  // 선택된 거점 좌표 (없으면 기본 평택/동탄 좌표)
  const selectedStation = safeStations.find((s) => String(s.id) === selectedHubId);
  const currentLat = selectedStation?.latitude || 37.1000;
  const currentLng = selectedStation?.longitude || 127.0800;

  // 선택 영역 상자 안쪽에 들어갈 OpenStreetMap Embed URL
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.015
  }%2C${currentLat - 0.01}%2C${currentLng + 0.015}%2C${
    currentLat + 0.01
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
      {/* 1. 상단 타이틀 영역 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도 및 목록</h3>
            <p className="text-xs text-slate-400 font-medium">
              현재 위치 기준 주변 공유 거점 • 거점을 클릭하면 해당 위치의 물품만 모아볼 수 있습니다.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            🔄 전체 거점 보기
          </button>
        )}
      </div>

      {/* 2. 🗺️ 이미지 속 박스 위치에만 쏙 들어가는 지도 영역 */}
      <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-50 shadow-inner">
        <iframe
          title="공유 거점 지도"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          className="w-full h-full rounded-2xl"
        ></iframe>

        {/* 지도 좌측 상단 거점 정보 태그 오버레이 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs pointer-events-none">
          <span className="text-[10px] font-bold text-teal-700 block">📍 현재 거점</span>
          <span className="text-xs font-bold text-slate-900">
            {selectedStation ? selectedStation.name : '전체 거점 위치'}
          </span>
        </div>
      </div>

      {/* 3. 하단 거점 선택 칩 (클릭 시 지도 위치가 해당 거점으로 이동) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {safeStations.map((station) => {
          const isSelected = selectedHubId === String(station.id);
          const hubItems = (items || []).filter(
            (i) => i.location === station.name || (i as any).hub_name === station.name
          );

          return (
            <button
              key={station.id}
              onClick={() => onSelectHub(isSelected ? null : String(station.id))}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
              }`}
            >
              <span>📍 {station.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  isSelected ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700'
                }`}
              >
                {hubItems.length}개
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
