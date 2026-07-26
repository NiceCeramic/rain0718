import React, { useState } from 'react';
import { User, ItemCategory, Item } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface ConsignmentFormProps {
  currentUser: User | null;
  onSuccess: () => void;
  onShowAuthModal: () => void;
}

export const ConsignmentForm: React.FC<ConsignmentFormProps> = ({
  currentUser,
  onSuccess,
  onShowAuthModal,
}) => {
  const [category, setCategory] = useState<ItemCategory>('우산');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(1000);
  const [hubName, setHubName] = useState('서울대 시흥캠퍼스 정문');
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState('#0f766e');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📷 카메라 촬영 / 사진 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }

    if (!title.trim()) {
      alert('제품명을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newItemPayload: Omit<Item, 'id' | 'created_at'> = {
        title: title.trim(),
        category,
        price: Number(price),
        location: hubName.trim(),
        hub_name: hubName.trim(),
        status: 'available',
        color,
        description: description.trim() || '상세 설명이 없습니다.',
        viewers: 1,
        image_url: imagePreview || undefined,
        owner_id: currentUser.id,
        quantity: Number(quantity),
      } as any;

      await api.insertItem(newItemPayload);
      alert('공유 거점에 물품 위탁 등록이 완료되었습니다!');
      onSuccess();
    } catch (err) {
      console.error('위탁 등록 실패:', err);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = ['#0f766e', '#f59e0b', '#3b82f6', '#1e3a8a', '#a855f7', '#22c55e'];

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
        <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
          <Icons.Plus size={22} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">공유 자원 위탁 등록 (Consignment)</h2>
          <p className="text-xs text-slate-400">
            동네의 남는 유휴 장비를 거점에 위탁하고 소소한 자원 공유 수익을 시작해보세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* 카테고리 선택 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: '우산', label: '☔ 우산' },
              { id: '양산', label: '☀️ 양산' },
              { id: '보조배터리', label: '🔋 보조배터리' },
              { id: 'tools', label: '🛠 공구/생활' },
              { id: 'electronics', label: '💻 전자제품' },
              { id: 'etc', label: '📦 기타 물품' },
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id as ItemCategory)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  category === cat.id
                    ? 'bg-teal-50 border-teal-500 text-[#0f766e]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📸 카메라 촬영 및 사진 첨부 영역 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">
            물품 실물 사진 (카메라 촬영 또는 앨범 첨부)
          </label>
          
          {imagePreview ? (
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-slate-200 group">
              <img src={imagePreview} alt="물품 미리보기" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 bg-slate-900/80 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold hover:bg-slate-900 transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="w-full sm:w-52 h-32 border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-teal-50/30 transition text-slate-400 hover:text-teal-700">
              <div className="p-2.5 bg-white rounded-full shadow-xs">
                <Icons.Camera size={22} className="text-teal-600" />
              </div>
              <span className="text-[11px] font-bold">📷 카메라로 촬영 / 사진 선택</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* 제품명 및 대여료 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">제품명 (모델명)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 초경량 3단 미니 우산, 충전식 전동드라이버"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">시간당 대여료 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono font-bold"
            />
          </div>
        </div>

        {/* 위탁 거점 및 대여 가능 수량 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">위탁 거점 이름</label>
            <input
              type="text"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            />
            <p className="text-[10px] text-teal-600 font-medium">
              ✅ 기존에 등록된 거점입니다. 저장된 좌표를 그대로 사용합니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">대여 가능 수량 (개)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono font-bold"
            />
          </div>
        </div>

        {/* 대표 색상 */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">제품 식별용 대표 색상</label>
          <div className="flex items-center gap-3">
            {colors.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: c }}
              >
                {color === c && <Icons.Check size={14} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">제품 상태 및 상세 설명</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상세한 제품 상태나 대여 시 유의사항을 입력해주세요. (예: 손잡이가 실리콘 재질이라 그립감이 좋습니다.)"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition shadow-md cursor-pointer"
          >
            {isSubmitting ? '위탁 등록 중...' : '공유 거점에 물품 위탁 신청하기'}
          </button>
        </div>
      </form>
    </div>
  );
};
