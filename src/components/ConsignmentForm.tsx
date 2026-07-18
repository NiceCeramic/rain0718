import React, { useState } from 'react';
import { ItemCategory, User } from '../types';
import { INITIAL_HUBS } from '../data';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface ConsignmentFormProps {
  currentUser: User | null;
  onSuccess: () => void;
  onShowAuthModal: () => void;
}

const COLOR_PRESETS = [
  { name: '에코 민트', hex: '#0f766e' },
  { name: '햇살 오렌지', hex: '#f59e0b' },
  { name: '맑음 스카이', hex: '#3b82f6' },
  { name: '클래식 네이비', hex: '#1e3a8a' },
  { name: '라벤더 퍼플', hex: '#8b5cf6' },
  { name: '포레스트 그린', hex: '#16a34a' }
];

export const ConsignmentForm: React.FC<ConsignmentFormProps> = ({ 
  currentUser, 
  onSuccess, 
  onShowAuthModal 
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('우산');
  const [hubName, setHubName] = useState(INITIAL_HUBS[0].name);
  const [price, setPrice] = useState(1000);
  const [color, setColor] = useState(COLOR_PRESETS[0].hex);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Guard: Guest user
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }

    if (!title.trim()) {
      setMessage({ type: 'error', text: '제품명을 입력해주세요.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const newItem = {
        owner_id: currentUser.id,
        title: title.trim(),
        category,
        location: hubName,
        distance: INITIAL_HUBS.find(h => h.name === hubName)?.address.includes('도보')
          ? INITIAL_HUBS.find(h => h.name === hubName)?.address.match(/도보 \d+분/)?.[0] || '도보 5분'
          : '도보 5분',
        price: Number(price),
        color,
        status: 'available' as const,
        description: description.trim() || `${category} 위탁 보관 물품입니다.`,
        rating: 5.0,
        reviews: 0,
        viewers: Math.floor(Math.random() * 3) + 1
      };

      await api.insertItem(newItem);
      
      // Success feedback
      setMessage({ type: 'success', text: '🌱 성공적으로 위탁 대여 제품이 등록되었습니다! 둘러보기 탭에서 즉시 확인해보세요.' });
      
      // Reset form
      setTitle('');
      setPrice(1000);
      setDescription('');
      
      onSuccess();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '제품 위탁 등록 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-teal-50 text-[#0f766e]">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22v-5" />
            <path d="M9 17h6" />
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10H8a15.3 15.3 0 0 1 4-10Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">공유 자원 위탁 등록 (Consignment)</h2>
          <p className="text-xs text-slate-500">동네의 남는 유휴 장비를 거점에 위탁하고 소소한 자원 공유 수익을 시작해보세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Category & Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">카테고리</label>
            <div className="flex gap-2">
              {(['우산', '양산', '보조배터리'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-2.5 rounded-xl font-bold border transition cursor-pointer ${
                    category === cat
                      ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === '우산' && '☔ '}
                  {cat === '양산' && '⛱ '}
                  {cat === '보조배터리' && '🔋 '}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">제품명 (모델명)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 초경량 3단 미니 우산"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
            />
          </div>
        </div>

        {/* Location Hub & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">위탁 거점 보관함 선택</label>
            <select
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition appearance-none cursor-pointer"
            >
              {INITIAL_HUBS.map((hub) => (
                <option key={hub.id} value={hub.name}>
                  [{hub.type === 'store' ? '편의점' : hub.type === 'cafe' ? '카페' : '세탁소'}] {hub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">시간당 대여료 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={100}
              step={100}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
            />
          </div>
        </div>

        {/* Signature Color Presets */}
        <div>
          <label className="block text-slate-700 font-bold mb-1.5">제품 식별용 대표 색상</label>
          <div className="flex flex-wrap gap-2.5 items-center">
            {COLOR_PRESETS.map((item) => (
              <button
                type="button"
                key={item.hex}
                onClick={() => setColor(item.hex)}
                style={{ backgroundColor: item.hex }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  color === item.hex
                    ? 'ring-4 ring-offset-2 ring-slate-800 scale-110 shadow-md'
                    : 'hover:scale-105'
                }`}
                title={item.name}
              >
                {color === item.hex && (
                  <Icons.Check size={14} className="text-white drop-shadow-xs font-bold" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 font-bold mb-1.5">제품 상태 및 상세 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="상세한 제품 상태나 대여 시 유의사항을 입력해주세요. (예: 손잡이가 실리콘 재질이라 그립감이 좋습니다.)"
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition resize-none"
          />
        </div>

        {/* Message Feedback */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-[11px] leading-relaxed border font-medium flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            <div className="mt-0.5">
              {message.type === 'success' ? <Icons.Check size={14} /> : <Icons.AlertTriangle size={14} />}
            </div>
            <div>{message.text}</div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          {currentUser?.role === 'guest' ? (
            <button
              type="button"
              onClick={onShowAuthModal}
              className="w-full md:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl text-xs transition cursor-pointer text-center"
            >
              🔒 로그인 후 위탁 신청 가능
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '위탁 등록 승인 중...' : '공유 거점에 물품 위탁 신청하기'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
