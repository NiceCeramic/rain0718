import React, { useState } from 'react';
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
  const safeItems = Array.isArray(items) ? items : [];

  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

  // 선택된 거점 좌표
  const selectedStation = safeStations.find((s) => String(s.id) === selectedHubId);
  const currentLat = selectedStation?.latitude || 37.0006;
  const currentLng = selectedStation?.longitude || 127.0894;

  // OpenStreetMap 타일 기반 지적도/위치 미리보기 URL 생성 (API 키 없이 작동)
  const mapIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.02
  }%2C${currentLat - 0.015}%2C${currentLng + 0.02}%2C${
    currentLat + 0.015
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도 및 위치</h3>
            <p className="text-xs text-slate-400 font-medium">
              OpenStreetMap 기반 거점 지도 • 클릭 시 거점별 필터링이 가능합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🗺️ 지도 보기
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📍 거점 목록 ({safeStations.length})
          </button>

          {selectedHubId && (
            <button
              onClick={() => onSelectHub(null)}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              🔄 전체 보기
            </button>
          )}
        </div>
      </div>

      {/* 🗺️ OpenStreetMap 지도 및 거점 마커 카드 */}
      {activeTab === 'map' ? (
        <div className="space-y-3">
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
            <iframe
              title="OpenStreetMap"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={mapIframeUrl}
              className="w-full h-full"
            ></iframe>

            {/* 지도 상단 거점 정보 오버레이 반사판 */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-md max-w-[220px]">
              <p className="text-[10px] font-bold text-teal-700">📍 현재 선택 거점</p>
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {selectedStation ? selectedStation.name : '전체 공유 거점 선택됨'}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {selectedStation
                  ? `위탁 물품 ${
                      safeItems.filter((i) => i.location === selectedStation.name).length
                    }개 보유`
                  : '하단 거점 카드를 누르면 지도 위치가 이동합니다.'}
              </p>
            </div>
          </div>

          {/* 거점 빠르게 바로가기 필터 칩 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {safeStations.map((station) => {
              const isSelected = selectedHubId === String(station.id);
              const hubItems = safeItems.filter(
                (i) => i.location === station.name || (i as any).hub_name === station.name
              );

              return (
                <button
                  key={station.id}
                  onClick={() => onSelectHub(isSelected ? null : String(station.id))}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition shrink-0 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
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
      ) : (
        /* 📍 거점 상세 카드 목록 */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeStations.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              등록된 공유 거점이 없습니다.
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
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
                      : 'bg-white border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">📍 {station.name}</span>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                      {hubItems.length}개 물품
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {hubItems.length > 0
                      ? hubItems.map((i) => i.title).join(', ')
                      : '위탁 대기 중'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
