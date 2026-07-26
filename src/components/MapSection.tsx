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

// 기본 거점 데이터 (DB에 거점이 비어있을 때 표시용)
const DEFAULT_STATIONS: Station[] = [
  { id: 1, name: '서울대 시흥캠퍼스 정문', latitude: 37.373, longitude: 126.804, created_at: '' },
  { id: 2, name: '동탄이마트', latitude: 37.200, longitude: 127.080, created_at: '' },
  { id: 3, name: '평택역 공유센터', latitude: 36.990, longitude: 127.085, created_at: '' },
];

export const MapSection: React.FC<MapSectionProps> = ({
  stations = [],
  items = [],
  selectedHubId,
  onSelectHub,
}) => {
  // DB에서 불러온 stations가 없으면 기본 거점 목록 활용
  const safeStations = Array.isArray(stations) && stations.length > 0 ? stations : DEFAULT_STATIONS;
  const safeItems = Array.isArray(items) ? items : [];

  // 선택된 거점 찾기
  const selectedStation = safeStations.find((s) => String(s.id) === selectedHubId);

  // 현재 기준 지도 좌표 (선택된 거점이 있으면 해당 좌표, 없으면 첫번째 거점 좌표)
  const currentLat = selectedStation?.latitude || safeStations[0]?.latitude || 36.990;
  const currentLng = selectedStation?.longitude || safeStations[0]?.longitude || 127.085;

  // OpenStreetMap 임베드 URL (선택된 거점 위치로 마커 및 지도 이동)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.012
  }%2C${currentLat - 0.008}%2C${currentLng + 0.012}%2C${
    currentLat + 0.008
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
      {/* 1. 상단 타이틀 영역 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도 및 목록</h3>
            <p className="text-xs text-slate-400 font-medium">
              거점을 클릭하면 지도 위치가 이동하며, 해당 거점의 물품만 모아볼 수 있습니다.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            🔄 전체 거점 보기
          </button>
        )}
      </div>

      {/* 2. 🗺️ 특정 박스 안쪽에 표시되는 OpenStreetMap */}
      <div className="w-full h-60 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-50 shadow-inner">
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

        {/* 지도 좌측 상단 선택 거점 표시 오버레이 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs pointer-events-none">
          <span className="text-[10px] font-bold text-teal-700 block">📍 현재 선택 거점</span>
          <span className="text-xs font-bold text-slate-900">
            {selectedStation ? selectedStation.name : '전체 거점 위치'}
          </span>
        </div>
      </div>

      {/* 3. 📍 지도 하단 등록된 거점 목록 버튼 칩 (클릭 시 지도가 이동하고 물품 필터링) */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-bold text-slate-500 block">등록된 공유 거점 목록 (클릭하여 선택)</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {safeStations.map((station) => {
            const isSelected = selectedHubId === String(station.id);
            // 해당 거점에 등록되어 있는 물품 수 계산
            const hubItems = safeItems.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );

            return (
              <button
                key={station.id}
                onClick={() => onSelectHub(isSelected ? null : String(station.id))}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-teal-500/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-white'
                }`}
              >
                <span>📍 {station.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    isSelected ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {hubItems.length}개 물품
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
