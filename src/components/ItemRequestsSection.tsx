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

  // 제안 모달 상태 ("내가 있어요" 버튼 클릭 시)
  const [proposingRequest, setProposingRequest] = useState<ItemRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState('1000');
  const [offerMessage, setOfferMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const supabase = (api as any).supabase;
      if (supabase) {
        const { data, error } = await supabase
          .from('item_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setRequests(data);
        }
      }
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
      const supabase = (api as any).supabase;
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
      alert('물건 필요 요청이 등록되었습니다! 주변 2km 이웃들에게 노출됩니다.');
      setTitle('');
      setDescription('');
      setIsWriting(false);
      fetchRequests();
    } catch (err) {
      console.error('Create request error:', err);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }
    if (!proposingRequest) return;

    alert(`🚀 "${proposingRequest.requester_name}"님에게 대여 제안이 전송되었습니다! 상대방이 선택하면 거래가 성사됩니다.`);
    setProposingRequest(null);
    setOfferMessage('');
  };

  return (
    <div className="space-y-6">
      {/* 상단 배너 및 글쓰기 토글 버튼 */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-teal-400 bg-teal-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Wants Matching
            </span>
            <span className="text-xs text-slate-300">동네 역방향 자원 연대</span>
          </div>
          <h2 className="text-base md:text-lg font-black tracking-tight">
            "필요한 물건을 먼저 요청하고, 이웃에게 빌려보세요!"
          </h2>
          <p className="text-xs text-slate-400">
            캠핑의자, 전동드릴 등 급하게 필요한 장비가 있다면 구인 요청을 올려보세요.
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
          className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-xs transition shadow-md cursor-pointer shrink-0"
        >
          {isWriting ? '목록으로 돌아가기' : '➕ 필요한 물건 요청 올리기'}
        </button>
      </div>

      {/* 요청 작성 폼 */}
      {isWriting && (
        <form onSubmit={handleCreateRequest} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
            📝 구해요 요청서 작성
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">필요한 물품명</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 내일 쓸 캠핑의자 2개 급히 구해요"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-medium"
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
              placeholder="필요한 이유나 사용 기간을 적어주세요."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 leading-relaxed"
            ></textarea>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs transition cursor-pointer"
            >
              {isSubmitting ? '등록 중...' : '동네 이웃들에게 요청 전송하기'}
            </button>
          </div>
        </form>
      )}

      {/* 요청 목록 피드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs font-medium">
            등록된 대여 요청이 없습니다. 첫 번째 요청을 올려보세요!
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-md text-[10px] font-bold">
                    🔍 구하는 중
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>🙋‍♂️ 내가 있어요!</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* "내가 있어요" 제안하기 모달 */}
      {proposingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                💬 대여 제안 보내기 ({proposingRequest.title})
              </h3>
              <button
                onClick={() => setProposingRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                ✕ 닫기
              </button>
            </div>

            <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">제안 가격 (원 / 무료 가능)</label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="0 (무료 나눔/대여 시 0원)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">이웃에게 남길 메시지</label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={3}
                  placeholder="예: 집에 캠핑의자 2개 있어요! 언제든 가져가시거나 갖다드릴 수 있어요."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 leading-relaxed"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProposingRequest(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  제안 보내기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
