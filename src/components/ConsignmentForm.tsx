import React, { useState, useRef } from 'react';
import { Item, ItemCategory } from '../types';
import { Station, api } from '../supabaseClient';
import { Icons } from './Icons';

interface ConsignmentFormProps {
  currentUser: any;
  stations: Station[];
  onSuccess: (newItem: Item) => void;
}

export const ConsignmentForm: React.FC<ConsignmentFormProps> = ({
  currentUser,
  stations,
  onSuccess,
}) => {
  const [category, setCategory] = useState<ItemCategory>('우산');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('1000');
  const [selectedStationName, setSelectedStationName] = useState<string>(
    stations.length > 0 ? stations[0].name : '동탄이마트'
  );
  const [customLocation, setCustomLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [color, setColor] = useState('#0f766e');
  const [description, setDescription] = useState('');
  
  // 📸 이미지 및 상태 관리
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // file input 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📷 사진 선택 및 이미지 압축 처리 (모바일 완벽 대응)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // 모바일 웹 용량 조절을 위한 Canvas 압축 (최대 너비 800px)
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
          // JPEG 포맷으로 압축
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrl(compressedBase64);
        }
        setIsCompressing(false);
      };
    };
    reader.readAsDataURL(file);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    const targetLocation = customLocation.trim() || selectedStationName;

    try {
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
      alert('공유 물품이 성공적으로 등록되었습니다!');
      onSuccess(created);
    } catch (err: any) {
      console.error('Consignment insert error:', err);
      alert(`등록 실패: ${err?.message || '입력값을 확인해 주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = ['#0f766e', '#f59e0b', '#3b82f6', '#1e3a8a', '#a855f7', '#22c55e'];

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
                className={`py-2.5 px-2 rounded-2xl border font-bold transition text-center truncate ${
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

        {/* 📸 모바일 대응 물품 실물 사진 등록 영역 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">
            물품 실물 사진 (카메라 촬영 / 앨범 첨부)
          </label>

          {/* 숨겨진 File Input (모바일 카메라/갤러리 연동 핵심) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-64 h-36 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer flex flex-col items-center justify-center p-3 relative overflow-hidden group"
          >
            {isCompressing ? (
              <div className="text-slate-400 font-bold flex flex-col items-center gap-1">
                <span className="animate-spin text-lg">⏳</span>
                <span>사진 최적화 중...</span>
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

        {/* 제품명 & 대여료 */}
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

        {/* 위탁 거점 선택 & 대여 가능 수량 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">위탁 거점 선택 / 직접 위치 지정</label>
            <select
              value={selectedStationName}
              onChange={(e) => setSelectedStationName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold text-slate-800"
            >
              {stations.length === 0 ? (
                <option value="동탄이마트">📍 동탄이마트</option>
              ) : (
                stations.map((s) => (
                  <option key={s.id} value={s.name}>
                    📍 {s.name}
                  </option>
                ))
              )}
            </select>

            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="목록에 없는 경우 직접 거점명 입력"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 text-[11px]"
            />
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
                className={`w-8 h-8 rounded-full transition flex items-center justify-center ${
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
