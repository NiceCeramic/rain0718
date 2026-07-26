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

// 기본 거점 목록 (Supabase DB 연결 전 또는 데이터 로딩 중 기본 노출용)
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
  // stations가 비어있을 경우 기본 거점 목록 사용
  const displayStations = Array.isArray(stations) && stations.length > 0 ? stations : DEFAULT_STATIONS;
  const safeItems = Array.isArray(items) ? items : [];

  // 선택된 거점 객체 찾기
  const selectedStation = displayStations.find((s) => String(s.id) === selectedHubId);

  // 지도 중심 좌표 설정 (선택된 거점이 없으면 첫 번째 거점 위치 사용)
  const currentLat = selectedStation?.latitude || displayStations[0]?.latitude || 37.200;
  const currentLng = selectedStation?.longitude || displayStations[0]?.longitude || 127.080;

  // OpenStreetMap 확대 및 위치 연동 URL (0.006 배율로 동네 크기에 맞춰 줌인)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.006
  }%2C${currentLat - 0.004}%2C${currentLng + 0.006}%2C${
    currentLat + 0.004
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
      {/* 1. 상단 타이틀 및 전체 보기 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도 및 목록</h3>
            <p className="text-xs text-slate-400 font-medium">
              아래 거점 버튼을 클릭하면 지도 위치가 해당 거점으로 이동하며 물품이 필터링됩니다.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            🔄 전체 거점 보기
          </button>
        )}
      </div>

      {/* 2. 🗺️ 동네 지도 박스 */}
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

        {/* 지도 좌측 상단 선택 거점 표시 태그 */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md pointer-events-none z-10">
          <span className="text-[10px] font-bold text-teal-700 block">📍 현재 위치 마커</span>
          <span className="text-xs font-bold text-slate-900">
            {selectedStation ? selectedStation.name : '전체 공유 거점'}
          </span>
        </div>
      </div>

      {/* 3. 📍 하단 거점 선택 버튼 칩 바 (강제 노출 디자인) */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            📍 등록된 공유 거점 ({displayStations.length}개)
          </span>
          <span className="text-[10px] text-slate-400">버튼을 눌러 위치와 물품을 확인하세요</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          {displayStations.map((station) => {
            const isSelected = selectedHubId === String(station.id);
            const hubItems = safeItems.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );

            return (
              <button
                key={station.id}
                onClick={() => onSelectHub(isSelected ? null : String(station.id))}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-teal-500/40 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-white'
                }`}
              >
                <span>📍 {station.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
