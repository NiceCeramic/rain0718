import React, { useState, useEffect, useRef } from 'react';
import { HubPin } from '../types';
import { INITIAL_HUBS } from '../data';
import { Icons } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

// Declare Kakao globally for TypeScript
declare global {
  interface Window {
    kakao: any;
  }
}

interface MapSectionProps {
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
  kakaoAppKey: string;
}

// Convert grid coordinates (0-100) to realistic geodesic lat/lng offsets around the user's location
const getRealCoords = (simLat: number, simLng: number, centerLat: number, centerLng: number) => {
  // Center is (50, 50). We shift slightly using coordinate ratios (approx 15-20m per unit)
  const latOffset = (simLat - 50) * 0.00015;
  const lngOffset = (simLng - 50) * 0.00018;
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset
  };
};

export const MapSection: React.FC<MapSectionProps> = ({ selectedHubId, onSelectHub, kakaoAppKey }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredHub, setHoveredHub] = useState<HubPin | null>(null);

  // Kakao Maps specific states
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Group counts by type for headers
  const storeCount = INITIAL_HUBS.filter(h => h.type === 'store').length;
  const cafeCount = INITIAL_HUBS.filter(h => h.type === 'cafe').length;
  const laundryCount = INITIAL_HUBS.filter(h => h.type === 'laundry').length;

  // 1. Get User Location (Geolocation API)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation failed, using default Seoul City Hall coordinates:', error);
          // Default: Seoul center area (Seoul City Hall)
          setUserCoords({ lat: 37.5665, lng: 126.9780 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserCoords({ lat: 37.5665, lng: 126.9780 });
    }
  }, []);

  // 2. Dynamically Load Kakao Maps SDK when Key is provided
  useEffect(() => {
    if (!kakaoAppKey) {
      setIsSdkLoaded(false);
      return;
    }

    // Clean up existing script tag if any
    const existingScript = document.getElementById('kakao-maps-sdk');
    if (existingScript) {
      existingScript.remove();
    }

    // Initialize map state
    setIsSdkLoaded(false);
    setMapError(null);

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.type = 'text/javascript';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      try {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            setIsSdkLoaded(true);
            setMapError(null);
          });
        } else {
          setMapError('카카오맵 SDK를 로드했으나 객체를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error(err);
        setMapError('카카오맵 라이브러리 적재 중 오류가 발생했습니다.');
      }
    };

    script.onerror = () => {
      setMapError('카카오맵 스크립트 로드에 실패했습니다. 키가 정확한지 확인해주세요.');
    };

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('kakao-maps-sdk');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [kakaoAppKey]);

  // 3. Render Kakao Map with User Coordinates and Hub Markers
  useEffect(() => {
    if (!isSdkLoaded || !userCoords || !mapContainerRef.current) return;

    try {
      const container = mapContainerRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(userCoords.lat, userCoords.lng),
        level: 4 // optimized zoom level to display all nearby hubs comfortably
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      // Add default controller overlays for better user control
      const mapTypeControl = new window.kakao.maps.MapTypeControl();
      map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      // Create Custom Pin for User Location
      const userMarkerPosition = new window.kakao.maps.LatLng(userCoords.lat, userCoords.lng);
      const userMarker = new window.kakao.maps.Marker({
        position: userMarkerPosition,
        map: map,
        title: '내 현재 위치'
      });

      const userInfowindow = new window.kakao.maps.InfoWindow({
        content: '<div style="padding:6px 10px; font-size:11px; font-weight:800; color:#0f766e; text-align:center; min-width:110px;">📍 내 현재 위치</div>'
      });
      userInfowindow.open(map, userMarker);

      // Plot Hub Pins
      INITIAL_HUBS.forEach((hub) => {
        const isSelected = selectedHubId === hub.id;
        const realHubCoords = getRealCoords(hub.lat, hub.lng, userCoords.lat, userCoords.lng);
        const markerPosition = new window.kakao.maps.LatLng(realHubCoords.lat, realHubCoords.lng);

        // Marker visual color differentiation based on hub type
        let markerImageUrl = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
        if (hub.type === 'cafe') {
          markerImageUrl = 'https://t1.daumcdn.net/mapjsapi/images/2x/marker_orange.png';
        } else if (hub.type === 'laundry') {
          markerImageUrl = 'https://t1.daumcdn.net/mapjsapi/images/2x/marker_blue.png';
        }

        // Selected marker size enhancement
        const markerSize = isSelected 
          ? new window.kakao.maps.Size(29, 42) 
          : new window.kakao.maps.Size(24, 35);

        const markerImage = new window.kakao.maps.MarkerImage(markerImageUrl, markerSize);

        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map: map,
          title: hub.name,
          image: markerImage
        });

        // Click Event listener to trigger parent callback
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onSelectHub(isSelected ? null : hub.id);
        });

        // Hover Tooltip logic
        const hoverContent = `
          <div style="padding:10px; font-size:11px; font-family:sans-serif; line-height:1.4; min-width:160px; background-color:#ffffff; color:#0f172a; border-radius:10px;">
            <div style="font-weight:800; color:#0f766e; font-size:11.5px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px;">
              ${hub.name}
            </div>
            <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${hub.address}</div>
            <div style="font-weight:700; color:#2563eb; font-size:10px; display:flex; justify-content:space-between;">
              <span>대여 가능 자원:</span>
              <span style="color:#0f766e;">${hub.count}개</span>
            </div>
          </div>
        `;

        const infowindow = new window.kakao.maps.InfoWindow({
          content: hoverContent
        });

        window.kakao.maps.event.addListener(marker, 'mouseover', () => {
          infowindow.open(map, marker);
        });

        window.kakao.maps.event.addListener(marker, 'mouseout', () => {
          infowindow.close();
        });

        // Close on general map click
        window.kakao.maps.event.addListener(map, 'click', () => {
          infowindow.close();
        });
      });

    } catch (err) {
      console.error('Kakao Map rendering error:', err);
    }
  }, [isSdkLoaded, userCoords, kakaoAppKey, selectedHubId]);

  const isKakaoActive = !!kakaoAppKey && isSdkLoaded && !mapError && userCoords;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
            <Icons.MapPin size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isKakaoActive ? '📍 내 주변 거점 대여소' : '햇살동 거점 지도 (Haessal Map)'}
            </h2>
            <p className="text-xs text-slate-500">
              {isKakaoActive 
                ? '내 주변 대여 기기 및 제휴 거점이 지도 상에 표시됩니다.'
                : `현재 ${storeCount + cafeCount + laundryCount}개의 제휴 대여 거점이 활성화 중입니다.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-teal-500 text-xs text-slate-600 font-semibold transition"
        >
          {isCollapsed ? (
            <>
              지도 펼치기 <Icons.ChevronDown size={14} />
            </>
          ) : (
            <>
              지도 접기 <Icons.ChevronUp size={14} />
            </>
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5">
              {isKakaoActive ? (
                /* ----------------- REAL KAKAO MAP COMPONENT ----------------- */
                <div className="relative">
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-[280px] rounded-2xl border border-slate-200 shadow-inner overflow-hidden relative"
                  />
                  {/* Real Map Floating Badge */}
                  <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>주변 거점 지도 서비스 제공 중</span>
                  </div>
                </div>
              ) : (
                /* ----------------- FALLBACK SIMULATED ROAD MAP ----------------- */
                <div className="relative w-full h-[260px] bg-[#f1f5f9] rounded-2xl border border-slate-200 overflow-hidden select-none">
                  {/* Simulated Grid Road Net */}
                  <div className="absolute inset-0 opacity-25 pointer-events-none">
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                  
                  {/* Horizontal main roads */}
                  <div className="absolute top-[35%] left-0 w-full h-8 bg-white border-y border-slate-200/60 flex items-center justify-center">
                    <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase font-mono">HAESSAL BOULEVARD</span>
                  </div>
                  <div className="absolute top-[75%] left-0 w-full h-6 bg-white border-y border-slate-200/60"></div>

                  {/* Vertical main roads */}
                  <div className="absolute left-[30%] top-0 h-full w-8 bg-white border-x border-slate-200/60 flex items-center justify-center">
                    <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase font-mono [writing-mode:vertical-lr]">GREEN STREET</span>
                  </div>
                  <div className="absolute left-[70%] top-0 h-full w-6 bg-white border-x border-slate-200/60"></div>

                  {/* Park / Greenery Areas */}
                  <div className="absolute top-4 left-4 w-24 h-16 bg-teal-50/50 rounded-xl border border-teal-100/40 flex items-center justify-center">
                    <span className="text-[10px] text-teal-800/80 font-bold">햇살쉼터</span>
                  </div>
                  <div className="absolute bottom-16 right-4 w-28 h-12 bg-teal-50/40 rounded-xl border border-teal-100/30 flex items-center justify-center">
                    <span className="text-[10px] text-teal-800/80 font-bold">에코공원</span>
                  </div>

                  {/* River / Blue Area */}
                  <div className="absolute left-0 bottom-0 w-[20%] h-8 bg-sky-50/60 rounded-tr-3xl border-t border-r border-sky-100/30 flex items-center justify-center">
                    <span className="text-[9px] text-sky-700/80 font-bold">도랑천</span>
                  </div>

                  {/* Compass Accent */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-200 bg-white/90 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm font-mono">
                    N
                  </div>

                  {/* Interactive Pins */}
                  {INITIAL_HUBS.map((hub) => {
                    const isSelected = selectedHubId === hub.id;
                    const typeColors = {
                      store: { bg: 'bg-teal-700', text: 'text-white', icon: <Icons.Store size={12} /> },
                      cafe: { bg: 'bg-amber-500', text: 'text-white', icon: <Icons.Coffee size={12} /> },
                      laundry: { bg: 'bg-blue-500', text: 'text-white', icon: <Icons.Laundry size={12} /> }
                    }[hub.type];

                    return (
                      <button
                        key={hub.id}
                        onClick={() => onSelectHub(isSelected ? null : hub.id)}
                        onMouseEnter={() => setHoveredHub(hub)}
                        onMouseLeave={() => setHoveredHub(null)}
                        style={{ top: `${hub.lat}%`, left: `${hub.lng}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 p-1.5 rounded-full flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-md ${
                          isSelected 
                            ? `${typeColors.bg} scale-125 ring-4 ring-white` 
                            : 'bg-white hover:scale-110 border border-slate-200'
                        }`}
                      >
                        <div className={`p-1 rounded-full ${isSelected ? 'bg-white/20' : `${typeColors.bg} text-white`}`}>
                          {typeColors.icon}
                        </div>

                        <span className={`text-[10px] font-semibold pr-1 hidden group-hover:inline-block ${
                          isSelected ? 'text-white' : 'text-slate-700'
                        }`}>
                          {hub.name.split(' - ').pop()}
                        </span>
                      </button>
                    );
                  })}

                  {/* Tooltip Overlay */}
                  {hoveredHub && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${hoveredHub.lat > 50 ? hoveredHub.lat - 18 : hoveredHub.lat + 10}%`,
                        left: `${hoveredHub.lng > 50 ? hoveredHub.lng - 22 : hoveredHub.lng + 22}%`
                      }}
                      className="absolute bg-slate-900/95 text-white text-xs rounded-xl p-3 shadow-xl z-30 max-w-[180px] pointer-events-none backdrop-blur-xs border border-white/10"
                    >
                      <div className="font-bold flex items-center gap-1">
                        {hoveredHub.type === 'store' && '🏪'}
                        {hoveredHub.type === 'cafe' && '☕'}
                        {hoveredHub.type === 'laundry' && '🧺'}
                        {hoveredHub.name}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1 leading-snug">{hoveredHub.address}</div>
                      <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-emerald-400 flex justify-between items-center">
                        <span>보관 중인 대여 물품</span>
                        <span className="font-bold">{hoveredHub.count}개</span>
                      </div>
                    </div>
                  )}

                  {/* Hint indicator if app key not filled */}
                  {kakaoAppKey && mapError && (
                    <div className="absolute top-3 left-3 right-3 bg-red-500/90 text-white p-2 rounded-xl text-[10px] font-bold text-center z-10 backdrop-blur-xs">
                      ⚠️ 카카오맵 로드 에러: {mapError} (가상 지도 사용)
                    </div>
                  )}
                  {!kakaoAppKey && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 text-teal-300 p-2 rounded-xl text-[10px] font-semibold text-center z-10 backdrop-blur-xs">
                      💡 환경설정을 통해 카카오맵 API 키를 연동하면, 실제 동네 지도가 활성화됩니다.
                    </div>
                  )}
                </div>
              )}

              {/* Reset Filter Button / Indicator */}
              {selectedHubId && (
                <div className="mt-3 flex items-center justify-between bg-teal-50/50 px-4 py-2.5 rounded-xl border border-teal-100 text-xs text-teal-800 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                    <span>
                      지금 <strong>{INITIAL_HUBS.find(h => h.id === selectedHubId)?.name}</strong> 보관함만 필터링해서 보고 있습니다.
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectHub(null)}
                    className="text-teal-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    전체 보기 <Icons.RefreshCw size={12} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
