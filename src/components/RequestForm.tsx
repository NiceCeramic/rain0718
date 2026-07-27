import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface RequestFormProps {
  currentUser: User | null;
  onSuccess: () => void;
  onShowAuthModal: () => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  currentUser,
  onSuccess,
  onShowAuthModal,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('우산');
  const [location, setLocation] = useState('서울대 시흥캠퍼스 정문');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }

    if (!title.trim()) {
      alert('필요한 물품명을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = api.supabase;
      if (supabase) {
        await supabase.from('item_requests').insert({
          title: title.trim(),
          category,
          location,
          description: description.trim(),
          requester_id: currentUser.id,
          requester_name: currentUser.name,
          status: 'open',
        });
      }

      alert('물품 대여 요청이 등록되었습니다! 동네 이웃들이 확인 후 답변을 드릴 거예요.');
      setTitle('');
      setDescription('');
      onSuccess();
    } catch (err: any) {
      console.error('Request insert error:', err);
      alert('요청 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
          <Icons.Search size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">필요한 물건 구하기 (Wants Request)</h2>
          <p className="text-xs text-slate-400">급하게 필요한 물건이 있다면 요청을 올려보세요. 이웃이 가져다드리거나 빌려드립니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">필요한 물품명</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 내일 쓸 전동드릴 급하게 구해요"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-medium"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold"
            >
              <option value="우산">☔ 우산</option>
              <option value="양산">☀️ 양산</option>
              <option value="보조배터리">🔋 보조배터리</option>
              <option value="공구/생활">🛠️ 공구/생활</option>
              <option value="전자제품">💻 전자제품</option>
              <option value="기타 물품">📦 기타 물품</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">희망 수령 거점 / 위치</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 동탄이마트 근처"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-medium"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">상세 사연 및 요청 사항</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="어떤 용도로 필요한지, 언제까지 필요한지 적어주세요."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 text-xs leading-relaxed"
          ></textarea>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-2xl transition cursor-pointer shadow-md"
          >
            {isSubmitting ? '등록 중...' : '동네에 물건 요청 올리기'}
          </button>
        </div>
      </form>
    </div>
  );
};
