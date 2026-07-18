import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

interface MapSectionProps {
  selectedHubId: string | null;
  onSelectHub: (hubId: string | null) => void;
  kakaoAppKey?: string; // kept for prop compatibility with App.tsx; no longer used
}

type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall, used only if GPS truly fails

export const MapSection: React.FC<MapSectionProps> = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

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
              ) : (
                /* ----------------- OPENSTREETMAP, CENTERED ON REAL GPS ----------------- */
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
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
