import React, { useState, useEffect, useRef } from 'react';
import { Item, ItemCategory } from '../types';
import { Station, api } from '../supabaseClient';
import { Icons } from './Icons';

interface ConsignmentFormProps {
  currentUser?: any;
  stations?: Station[];
  onSuccess?: (newItem: Item) => void;
}

const DEFAULT_STATIONS: Station[] = [
  { id: 1, name: '서울대 시흥캠퍼스 정문', latitude: 37.373, longitude: 126.804, created_at: '' },
  { id: 2, name: '동탄이마트', latitude: 37.200, longitude: 127.080, created_at: '' },
  { id: 3, name: '평택역 공유센터', latitude: 36.990, longitude: 127.085, created_at: '' },
];

export const ConsignmentForm: React.FC<ConsignmentFormProps> = ({
  currentUser = null,
  stations = [],
  onSuccess,
}) => {
  const availableStations = Array.isArray(stations) && stations.length > 0 ? stations : DEFAULT_STATIONS;

  const [category, setCategory] = useState<ItemCategory>('우산');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('1000');
  const [selectedStationName, setSelectedStationName] = useState<string>(availableStations[0].name);

  // 📍 신규 거점 정보 (초기값: 기본 좌표)
  const [customLocation, setCustomLocation] = useState('');
  const [latitude, setLatitude] = useState('37.200');
  const [longitude, setLongitude] = useState('127.080');

  const [quantity, setQuantity] = useState('1');
  const [color, setColor] = useState('#0f766e');
  const [description, setDescription] = useState('');

  // 🛰️ GPS 기기 현재 위치 자동 조회 (최초 렌더링 시 실행)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(5));
          setLongitude(position.coords.longitude.toFixed(5));
        },
        (error) => {
          console.warn('GPS 권한 미허용 또는 오류:', error.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (availableStations.length > 0 && (!selectedStationName || selectedStationName === '지정 거점')) {
      setSelectedStationName(availableStations[0].name);
    }
  }, [stations]);

  // 📸 이미지 관련 State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🗺️ 지도 클릭 시 위도/경도 자동 계산 및 마커 이동
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const baseLat = parseFloat(latitude) || 37.200;
    const baseLng = parseFloat(longitude) || 127.080;

    const latDelta = ((rect.height / 2 - clickY) / rect.height) * 0.012;
    const lngDelta = ((clickX - rect.width / 2) / rect.width) * 0.016;

    const newLat = (baseLat + latDelta).toFixed(5);
    const newLng = (baseLng + lngDelta).toFixed(5);

    setLatitude(newLat);
    setLongitude(newLng);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrl(compressedBase64);
        }
        setIsCompressing(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('제품명을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    let targetLocation = selectedStationName;

    try {
      if (customLocation.trim()) {
        targetLocation = customLocation.trim();
        const latVal = parseFloat(latitude) || null;
        const lngVal = parseFloat(longitude) || null;

        await api.insertStation(targetLocation, latVal, lngVal);
      }

      const newItemData: Omit<Item, 'id' | 'created_at'> = {
        title: title.trim(),
        category,
        price: parseInt(price) || 1000,
        location: targetLocation,
        hub_name: targetLocation,
        status: 'available',
        color,
        description: description.trim(),
        viewers: 1,
        image_url: imageUrl,
        owner_id: currentUser?.id || null,
        quantity: parseInt(quantity) || 1,
      } as any;

      const created = await api.insertItem(newItemData);
      alert('공유 물품 및 거점 위치 정보가 성공적으로 등록되었습니다!');
      if (onSuccess) onSuccess(created);
    } catch (err: any) {
      console.error('Consignment insert error:', err);
      alert(`등록 실패: ${err?.message || '입력값을 확인해 주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = ['#0f766e', '#f59e0b', '#3b82f6', '#1e3a8a', '#a855f7', '#22c55e'];

  const mapPreviewUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    parseFloat(longitude) - 0.008
  }%2C${parseFloat(latitude) - 0.005}%2C${parseFloat(longitude) + 0.008}%2C${
    parseFloat(latitude) + 0.005
  }&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
          <Icons.Plus size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">공유 자원 위탁 등록 (Consignment)</h2>
          <p className="text-xs text-slate-400">동네의 남는 유휴 장비를 거점에 위탁하고 소소한 자원 공유 수익을 시작해보세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* 카테고리 선택 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">카테고리</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: '우산', label: '☔ 우산' },
              { id: '양산', label: '☀️ 양산' },
              { id: '보조배터리', label: '🔋 보조배터리' },
              { id: '공구/생활', label: '🛠️ 공구/생활' },
              { id: '전자제품', label: '💻 전자제품' },
              { id: '기타 물품', label: '📦 기타 물품' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as ItemCategory)}
                className={`py-2.5 px-2 rounded-2xl border font-bold transition text-center truncate cursor-pointer ${
                  category === cat.id
                    ? 'bg-teal-50 border-teal-500 text-teal-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📸 카메라 촬영 및 앨범 사진 선택 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">
            물품 실물 사진 (카메라 촬영 / 앨범 첨부)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-64 h-36 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex flex-col items-center justify-center p-3 relative overflow-hidden group"
          >
            {isCompressing ? (
              <div className="text-slate-400 font-bold flex flex-col items-center gap-1">
                <span className="animate-spin text-lg">⏳</span>
                <span>사진 처리 중...</span>
              </div>
            ) : imageUrl ? (
              <>
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover rounded-2xl" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                  📸 사진 변경하기
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="p-3 bg-white rounded-full shadow-xs text-teal-600">
                  <Icons.Camera size={22} />
                </div>
                <span className="font-bold text-[11px] text-slate-500">📷 카메라로 촬영 / 사진 선택</span>
              </div>
            )}
          </div>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="text-[10px] text-rose-500 hover:underline font-bold"
            >
              사진 삭제하기
            </button>
          )}
        </div>

        {/* 제품명 및 대여료 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">제품명 (모델명)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 초경량 3단 미니 우산, 충전식 전동드라이버"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">대여료 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold"
              required
            />
          </div>
        </div>

        {/* 📍 위탁 거점 선택 & 직접 지도 선택 폼 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">위탁 거점 선택 / 신규 거점 지정</label>
            <select
              value={selectedStationName}
              onChange={(e) => {
                setSelectedStationName(e.target.value);
                const matched = availableStations.find((s) => s.name === e.target.value);
                if (matched && matched.latitude && matched.longitude) {
                  setLatitude(String(matched.latitude));
                  setLongitude(String(matched.longitude));
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold text-slate-800 cursor-pointer"
            >
              {availableStations.map((s) => (
                <option key={s.id || s.name} value={s.name}>
                  📍 {s.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="신규 거점 생성 시 거점명 입력"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 text-[11px]"
            />

            {/* 🗺️ 신규 거점 지정 시 지도 클릭으로 좌표 찍기 (GPS 자동 위치 바인딩) */}
            {customLocation.trim() && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800">
                    📡 현재 GPS 위치 기준 지도 (클릭 시 위치 변경)
                  </span>
                </div>

                <div
                  onClick={handleMapClick}
                  className="w-full h-44 rounded-2xl overflow-hidden border-2 border-teal-500/40 relative cursor-crosshair shadow-inner"
                >
                  <iframe
                    title="신규 거점 위치 선택"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={mapPreviewUrl}
                    className="w-full h-full pointer-events-none"
                  ></iframe>

                  <div className="absolute top-2 right-2 bg-slate-900/80 text-white px-2.5 py-1 rounded-xl text-[10px] font-mono pointer-events-none">
                    🎯 지도 클릭하여 위치 지정
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">위도(Latitude)</label>
                    <input
                      type="text"
                      readOnly
                      value={latitude}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-mono font-bold text-teal-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">경도(Longitude)</label>
                    <input
                      type="text"
                      readOnly
                      value={longitude}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-mono font-bold text-teal-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">대여 가능 수량 (개)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold"
              required
            />
          </div>
        </div>

        {/* 대표 색상 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">제품 식별용 대표 색상</label>
          <div className="flex items-center gap-3">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition flex items-center justify-center cursor-pointer ${
                  color === c ? 'ring-4 ring-teal-500/30 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">제품 상태 및 상세 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="상세한 제품 상태나 대여 시 유의사항을 입력해주세요."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 text-xs leading-relaxed"
          ></textarea>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-2xl transition cursor-pointer shadow-md"
          >
            {isSubmitting ? '위탁 등록 중...' : '공유 거점에 물품 위탁 신청하기'}
          </button>
        </div>
      </form>
    </div>
  );
};
