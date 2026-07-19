import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './Icons';

// Declare Leaflet globally for TypeScript
declare global {
  interface Window {
    L: any;
  }
}

interface StationMapPickerProps {
  onLocationConfirmed: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall fallback

let leafletLoadPromise: Promise<void> | null = null;

// Load Leaflet's CSS + JS from CDN exactly once, no npm install required
const loadLeaflet = (): Promise<void> => {
  if (window.L) return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Leaflet load failed')));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet load failed'));
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
};

export const StationMapPicker: React.FC<StationMapPickerProps> = ({
  onLocationConfirmed,
  initialLat,
  initialLng
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const [isLocating, setIsLocating] = useState(false);

  // Load Leaflet library
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (!cancelled) setIsLeafletReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError('지도 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const L = window.L;
    if (!mapInstanceRef.current || !L) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        setPickedCoords({ lat: pos.lat, lng: pos.lng });
      });
    }
    setPickedCoords({ lat, lng });
  }, []);

  // Initialize map once Leaflet is ready
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const start = pickedCoords || DEFAULT_COORDS;

    const map = L.map(mapContainerRef.current).setView([start.lat, start.lng], 17);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    placeMarker(start.lat, start.lng);

    map.on('click', (e: any) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    // If we didn't already have a saved position, try to center on the user's real GPS location
    if (!pickedCoords && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 17);
          placeMarker(latitude, longitude);
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeafletReady]);

  const handleRecenterToGps = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current.setView([latitude, longitude], 17);
        placeMarker(latitude, longitude);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[260px] rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
        {loadError ? (
          <div className="w-full h-full flex items-center justify-center text-center px-6">
            <p className="text-[11px] text-rose-600 font-semibold">{loadError}</p>
          </div>
        ) : (
          <>
            <div ref={mapContainerRef} className="w-full h-full" />
            {isLocating && (
              <div className="absolute top-3 left-3 z-[500] bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                내 위치로 이동 중...
              </div>
            )}
            <button
              type="button"
              onClick={handleRecenterToGps}
              className="absolute bottom-3 right-3 z-[500] bg-white border border-slate-200 shadow-md px-3 py-1.5 rounded-full text-[10px] font-bold text-teal-700 hover:border-teal-500 transition cursor-pointer flex items-center gap-1.5"
            >
              <Icons.MapPin size={12} />
              내 위치로
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <p className="text-slate-500">
          {pickedCoords
            ? `📍 선택된 좌표: ${pickedCoords.lat.toFixed(6)}, ${pickedCoords.lng.toFixed(6)}`
            : '지도를 클릭하거나 마커를 드래그해서 정확한 위치를 지정해주세요.'}
        </p>
        <button
          type="button"
          disabled={!pickedCoords}
          onClick={() => pickedCoords && onLocationConfirmed(pickedCoords.lat, pickedCoords.lng)}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-[11px] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          이 위치로 확정
        </button>
      </div>
    </div>
  );
};
