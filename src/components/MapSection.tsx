import React, { useState, useEffect, useRef, useCallback } from 'react';
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

type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall, used only if GPS truly fails

export const MapSection: React.FC<MapSectionProps> = ({ kakaoAppKey }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // GPS location state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  // Kakao Maps specific states
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // 1. Get the user's real GPS location
  const requestLocation = useCallback(() => {
    setLocationStatus('loading');

    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setUserCoords(DEFAULT_COORDS);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationAccuracy(position.coords.accuracy ?? null);
        setLocationStatus('granted');
      },
      (error) => {
        console.warn('Geolocation failed:', error);
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
        setUserCoords(DEFAULT_COORDS);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // 2. Dynamically load Kakao Maps SDK when a key is provided
  useEffect(() => {
    if (!kakaoAppKey) {
      setIsSdkLoaded(false);
      return;
    }

    const existingScript = document.getElementById('kakao-maps-sdk');
    if (existingScript) {
      existingScript.remove();
    }

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

  // 3. Render Kakao Map centered on the user's real GPS coordinates (user marker only)
  useEffect(() => {
    if (!isSdkLoaded || !userCoords || !mapContainerRef.current) return;

    try {
      const container = mapContainerRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(userCoords.lat, userCoords.lng),
        level: 4
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      const mapTypeControl = new window.kakao.maps.MapTypeControl();
      map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

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
    } catch (err) {
      console.error('Kakao Map rendering error:', err);
    }
  }, [isSdkLoaded, userCoords, kakaoAppKey]);

  const isKakaoActive = !!kakaoAppKey && isSdkLoaded && !mapError && userCoords && locationStatus !== 'loading';

  // Build an OpenStreetMap embed URL (no API key required) centered on the user's real coordinates
  const buildOsmEmbedUrl = (lat: number, lng: number) => {
    const delta = 0.006; // small bbox for a close-in view
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
            <Icons.MapPin size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">📍 내 현재 위치</h2>
            <p className="text-xs text-slate-500">
              {locationStatus === 'loading' && 'GPS로 위치를 확인하는 중입니다...'}
              {locationStatus === 'granted' && `실시간 GPS 위치를 지도 중심에 표시합니다.${locationAccuracy ? ` (정확도 약 ${Math.round(locationAccuracy)}m)` : ''}`}
              {locationStatus === 'denied' && '위치 권한이 거부되어 기본 위치로 표시 중입니다.'}
              {locationStatus === 'unavailable' && '이 기기에서 위치 정보를 사용할 수 없어 기본 위치로 표시 중입니다.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-teal-500 text-xs text-teal-700 font-semibold transition"
            >
              <Icons.RefreshCw size={12} />
              위치 다시 시도
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-teal-500 text-xs text-slate-600 font-semibold transition"
          >
            {isCollapsed ? (
              <>지도 펼치기 <Icons.ChevronDown size={14} /></>
            ) : (
              <>지도 접기 <Icons.ChevronUp size={14} /></>
            )}
          </button>
        </div>
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
              {locationStatus === 'loading' || !userCoords ? (
                /* ----------------- LOADING STATE ----------------- */
                <div className="w-full h-[280px] rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-semibold">GPS 위치를 가져오는 중...</p>
                </div>
              ) : isKakaoActive ? (
                /* ----------------- REAL KAKAO MAP, CENTERED ON GPS ----------------- */
                <div className="relative">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[280px] rounded-2xl border border-slate-200 shadow-inner overflow-hidden relative"
                  />
                  <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>실시간 GPS 위치 기반 지도</span>
                  </div>
                </div>
              ) : (
                /* ----------------- OPENSTREETMAP FALLBACK, ALSO CENTERED ON GPS ----------------- */
                <div className="relative w-full h-[280px] rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                  <iframe
                    key={`${userCoords.lat}-${userCoords.lng}`}
                    title="내 현재 위치 지도"
                    className="w-full h-full border-0"
                    src={buildOsmEmbedUrl(userCoords.lat, userCoords.lng)}
                  />
                  <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>실시간 GPS 위치 기반 지도</span>
                  </div>
                  {kakaoAppKey && mapError && (
                    <div className="absolute top-3 left-3 right-3 bg-red-500/90 text-white p-2 rounded-xl text-[10px] font-bold text-center z-10 backdrop-blur-xs">
                      ⚠️ 카카오맵 로드 에러: {mapError} (기본 지도로 대체 표시 중)
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
