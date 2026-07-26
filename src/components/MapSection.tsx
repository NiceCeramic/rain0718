import React, { useEffect, useRef, useState } from 'react';
import { Item } from '../types';
import { Station } from '../supabaseClient';
import { Icons } from './Icons';

interface MapSectionProps {
  stations: Station[];
  items: Item[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
  kakaoAppKey?: string;
}

export const MapSection: React.FC<MapSectionProps> = ({
  stations,
  items,
  selectedHubId,
  onSelectHub,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 1. 내 위치(GPS) 취득
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
          // 기본 위치: 평택/시흥 주변 기본 좌표
          setUserLocation({ lat: 37.373, lng: 126.804 });
        }
      );
    } else {
      setUserLocation({ lat: 37.373, lng: 126.804 });
    }
  }, []);

  // 2. 카카오 지도 및 등록 거점/물품 마커 렌더링
  useEffect(() => {
    if (!mapContainerRef.current || !userLocation) return;

    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          // 기존 마커 제거
          markersRef.current.forEach((m) => m.setMap(null));
          markersRef.current = [];

          const mapCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
          const map = new window.kakao.maps.Map(mapContainerRef.current, {
            center: mapCenter,
            level: 5,
          });
          mapInstanceRef.current = map;

          // 사용자 위치 마커
          const userMarker = new window.kakao.maps.Marker({
            position: mapCenter,
          });
          userMarker.setMap(map);
          markersRef.current.push(userMarker);

          // 등록된 거점(Stations) 마커 표시
          stations.forEach((station) => {
            if (!station.latitude || !station.longitude) return;

            const stationPos = new window.kakao.maps.LatLng(
              station.latitude,
              station.longitude
            );

            // 해당 거점에 속한 물품 추출
            const hubItems = items.filter(
              (i) => i.location === station.name || (i as any).hub_name === station.name
            );

            const marker = new window.kakao.maps.Marker({
              position: stationPos,
              clickable: true,
            });

            marker.setMap(map);
            markersRef.current.push(marker);

            // 거점 클릭 시 인포윈도우(물품 정보) 표시
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `
                <div style="padding:10px;font-size:12px;min-width:160px;line-height:1.4;">
                  <strong style="color:#0f766e;font-size:13px;">📍 ${station.name}</strong><br/>
                  <span style="color:#64748b;">보유 등록 물품: <strong>${hubItems.length}개</strong></span>
                  ${
                    hubItems.length > 0
                      ? `<div style="margin-top:4px;font-size:11px;color:#334155;">• ${hubItems
                          .slice(0, 2)
                          .map((i) => i.title)
                          .join('<br/>• ')} ${
                          hubItems.length > 2 ? ` 외 ${hubItems.length - 2}개` : ''
                        }</div>`
                      : '<div style="margin-top:4px;color:#94a3b8;">등록된 물품 대기중</div>'
                  }
                </div>
              `,
              removable: true,
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
              infowindow.open(map, marker);
              onSelectHub(String(station.id));
            });
          });
        });
      }
    };

    setTimeout(initMap, 200);
  }, [userLocation, stations, items]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
            <Icons.MapPin size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">내 주변 자원 공유 거점 지도</h3>
            <p className="text-[10px] text-slate-400">
              마커를 클릭하면 해당 거점에 위탁된 물품을 확인 및 필터링할 수 있습니다.
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

      {/* 카카오 지도 박스 */}
      <div
        ref={mapContainerRef}
        className="w-full h-52 rounded-2xl border border-slate-200 shadow-inner overflow-hidden relative"
      ></div>
    </div>
  );
};
