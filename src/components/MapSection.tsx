import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Item } from '../types';
import { Station } from '../supabaseClient';
import { Icons } from './Icons';

// Leaflet 기본 마커 아이콘 깨짐 방지 설정
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// 커스텀 핀 마커 아이콘
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-teal.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapSectionProps {
  stations?: Station[];
  items?: Item[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
}

// 선택된 거점으로 지도 중심 이동시키는 컴포넌트
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
};

export const MapSection: React.FC<MapSectionProps> = ({
  stations = [],
  items = [],
  selectedHubId,
  onSelectHub,
}) => {
  const safeStations = Array.isArray(stations) ? stations : [];
  const safeItems = Array.isArray(items) ? items : [];

  // 기본 지도 중심점 (평택 / 시흥 인근)
  const defaultCenter = { lat: 37.0006, lng: 127.0894 };

  // 선택된 거점 좌표
  const selectedStation = safeStations.find((s) => String(s.id) === selectedHubId);
  const mapCenter = selectedStation && selectedStation.latitude && selectedStation.longitude
    ? { lat: selectedStation.latitude, lng: selectedStation.longitude }
    : safeStations.length > 0 && safeStations[0].latitude
    ? { lat: safeStations[0].latitude!, lng: safeStations[0].longitude! }
    : defaultCenter;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl shrink-0">
            <Icons.MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">내 주변 자원 공유 거점 지도</h3>
            <p className="text-xs text-slate-400">
              마커를 클릭하면 해당 거점의 위탁 물품을 확인하실 수 있습니다.
            </p>
          </div>
        </div>

        {selectedHubId && (
          <button
            onClick={() => onSelectHub(null)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            🔄 전체 거점 보기
          </button>
        )}
      </div>

      {/* 🗺️ OpenStreetMap 지도 렌더링 영역 */}
      <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 z-0 relative shadow-inner">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* OpenStreetMap 타일 레이어 */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap lat={mapCenter.lat} lng={mapCenter.lng} />

          {/* 거점 핀 마커 생성 */}
          {safeStations.map((station) => {
            const lat = station.latitude || 37.0006;
            const lng = station.longitude || 127.0894;
            const hubItems = safeItems.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );

            return (
              <Marker
                key={station.id}
                position={[lat, lng]}
                icon={customIcon}
                eventHandlers={{
                  click: () => onSelectHub(String(station.id)),
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 font-sans">
                    <h4 className="font-bold text-xs text-slate-900">📍 {station.name}</h4>
                    <p className="text-[11px] text-teal-700 font-bold">
                      위탁 물품 {hubItems.length}개
                    </p>
                    <button
                      onClick={() => onSelectHub(String(station.id))}
                      className="w-full mt-1 py-1 bg-slate-900 text-white rounded text-[10px] font-bold"
                    >
                      이 거점 물품만 보기
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
