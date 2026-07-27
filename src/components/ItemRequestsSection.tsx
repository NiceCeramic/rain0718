import React, { useState, useEffect } from 'react';
import { Rental, Item, User } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface TransactionsSectionProps {
  rentals?: Rental[];
  items?: Item[];
  currentUser: User | null;
  onRefresh: () => void;
  onShowAuthModal: () => void;
}

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  rentals = [],
  items = [],
  currentUser,
  onRefresh,
  onShowAuthModal,
}) => {
  const [subTab, setSubTab] = useState<'rentals' | 'requests'>('rentals');
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'guest') {
      fetchMyRequests();
    }
  }, [currentUser]);

  const fetchMyRequests = async () => {
    try {
      const supabase = (api as any).supabase;
      if (supabase && currentUser) {
        const { data, error } = await supabase
          .from('item_requests')
          .select('*')
          .eq('requester_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setMyRequests(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch my requests:', err);
    }
  };

  const safeRentals = Array.isArray(rentals) ? rentals : [];
  const safeItems = Array.isArray(items) ? items : [];

  const handleSimulateDeposit = async (rentalId: string | number) => {
    try {
      const supabase = (api as any).supabase;
      if (supabase) {
        await supabase
          .from('rentals')
          .update({ status: 'active', deposit_status: 'verified' })
          .eq('id', rentalId);
        onRefresh();
        alert('보증금 입금이 확인되어 대여가 활성화되었습니다!');
      }
    } catch (err) {
      console.error(err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleReturnItem = async (rentalId: string | number, itemId: string | number) => {
    try {
      const supabase = (api as any).supabase;
      if (supabase) {
        await supabase
          .from('rentals')
          .update({ status: 'returned', deposit_status: 'refunded' })
          .eq('id', rentalId);

        await supabase
          .from('items')
          .update({ status: 'available' })
          .eq('id', itemId);

        onRefresh();
        alert('반납이 완료되어 보증금이 100% 정상 환급되었습니다!');
      }
    } catch (err) {
      console.error(err);
      alert('반납 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 상단 헤더 및 서브 탭 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">나의 거래 및 요청 내역</h2>
          <p className="text-xs text-slate-400">대여 현황과 내가 등록한 '빌려주세요' 수요 요청을 관리하세요.</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setSubTab('rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'rentals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📦 물품 대여 내역 ({safeRentals.length})
          </button>
          <button
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'requests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🔍 빌려주세요 요청 내역 ({myRequests.length})
          </button>
        </div>
      </div>

      {/* 1. 📦 물품 대여 내역 탭 */}
      {subTab === 'rentals' && (
        <div className="space-y-4">
          {safeRentals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              진행 중인 대여 거래 내역이 없습니다.
            </div>
          ) : (
            safeRentals.map((rental, idx) => {
              const targetItem = safeItems.find((i) => String(i.id) === String(rental.item_id));
              const isPending = rental.status === 'pending_deposit';
              const isActive = rental.status === 'active';
              const isReturned = rental.status === 'returned';

              return (
                <div key={rental.id || idx} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-teal-700">대여증 #{rental.id}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isReturned ? 'bg-emerald-50 text-emerald-700' : isActive ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {isReturned ? '반납 완료' : isActive ? '대여 중' : '입금 확인 대기'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{targetItem?.title || '공유 물품'}</h4>
                      <p className="text-slate-500 mt-0.5">📍 대여/반납 장소: {targetItem?.location || '공유 거점'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">₩{(rental.price_paid || 1000).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 block">보증금 ₩{(rental.deposit || 10000).toLocaleString()}</span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center text-xs">
                      <span className="text-amber-900 font-medium">신한은행 110-5678-1234 (예금주: 에코링크)로 송금해주세요.</span>
                      <button
                        onClick={() => handleSimulateDeposit(rental.id)}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        입금 즉시 확인하기
                      </button>
                    </div>
                  )}

                  {isActive && (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex justify-between items-center text-xs">
                      <span className="text-teal-900 font-bold">🚀 정상 대여 중입니다. 사용 후 반납 버튼을 눌러주세요.</span>
                      <button
                        onClick={() => handleReturnItem(rental.id, rental.item_id)}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        반납 및 보증금 환급 신청
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. 🔍 빌려주세요 요청 내역 탭 */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              내가 등록한 '빌려주세요' 수요 요청 내역이 없습니다.
            </div>
          ) : (
            myRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold">
                    🔍 내가 올린 수요 요청
                  </span>
                  <span className="text-[10px] text-slate-400">📍 {req.location}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{req.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{req.description || '상세 내용 없음'}</p>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                  <span>등록일시: {new Date(req.created_at).toLocaleString()}</span>
                  <span className="text-teal-700 font-bold">이웃들의 제안 대기 중</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
