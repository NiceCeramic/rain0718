import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface ItemRequest {
  id: number | string;
  title: string;
  category: string;
  description: string;
  requester_id: string;
  requester_name: string;
  location: string;
  status: 'open' | 'matched';
  created_at: string;
}

interface ItemRequestsSectionProps {
  currentUser: User | null;
  onShowAuthModal: () => void;
}

export const ItemRequestsSection: React.FC<ItemRequestsSectionProps> = ({
  currentUser,
  onShowAuthModal,
}) => {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('우산');
  const [location, setLocation] = useState('동탄이마트 인근');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [proposingRequest, setProposingRequest] = useState<ItemRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState('1000');
  const [offerMessage, setOfferMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await api.getItemRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
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
      // 🚀 api 객체를 통해 DB로 데이터 저장 요청 보냄!
      await api.createItemRequest({
        title: title.trim(),
        category,
        location,
        description: description.trim(),
        requester_id: currentUser.id,
        requester_name: currentUser.name || '에코멤버',
      });

      alert('물건 필요 요청이 성공적으로 DB에 등록되었습니다!');
      setTitle('');
      setDescription('');
      setIsWriting(false);
      fetchRequests();
    } catch (err: any) {
      console.error('Create request error:', err);
      alert(`저장 실패: ${err?.message || '네트워크 상태를 확인해주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Wants Demand
            </span>
            <span className="text-xs text-slate-300">필요한 물품 수요 요청 공간</span>
          </div>
          <h2 className="text-base md:text-lg font-black tracking-tight">
            "급하게 필요한 물건이 있다면 여기에 요청을 올려보세요!"
          </h2>
          <p className="text-xs text-slate-400">
            이웃들이 보유한 물건을 확인하고 맞춤 대여를 제안해 드립니다.
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser || currentUser.role === 'guest') {
              onShowAuthModal();
            } else {
              setIsWriting(!isWriting);
            }
          }}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs transition shadow-md cursor-pointer shrink-0"
        >
          {isWriting ? '목록으로 돌아가기' : '➕ 필요한 물건 신청하기'}
        </button>
      </div>

      {isWriting && (
        <form onSubmit={handleCreateRequest} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
            📝 빌려주세요 요청서 작성
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">필요한 물품명</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 캠핑용 타프 및 폴대 급히 구해요"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">희망 수령 위치 / 동네</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 동탄이마트 인근"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-700">상세 사연 및 대여 희망 기간</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="어떤 용도로 필요한지 적어주세요."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 leading-relaxed"
            ></textarea>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs transition cursor-pointer"
            >
              {isSubmitting ? '등록 중...' : '빌려주세요 요청 올리기'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs font-medium">
            등록된 '빌려주세요' 요청이 없습니다. 첫 번째 요청을 올려보세요!
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold">
                    🔍 구하는 중 (수요)
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Icons.MapPin size={11} /> {req.location}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{req.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {req.description || '상세 설명이 없습니다.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">
                  요청자: {req.requester_name}
                </span>

                <button
                  onClick={() => {
                    if (!currentUser || currentUser.role === 'guest') {
                      onShowAuthModal();
                    } else {
                      setProposingRequest(req);
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🙋‍♂️ 내가 있어요!</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
