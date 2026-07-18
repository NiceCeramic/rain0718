import React, { useState } from 'react';
import { Rental, Item, User } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface TransactionsSectionProps {
  rentals: Rental[];
  items: Item[];
  currentUser: User | null;
  onRefresh: () => void;
  onShowAuthModal: () => void;
}

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  rentals,
  items,
  currentUser,
  onRefresh,
  onShowAuthModal
}) => {
  const [loadingId, setLoadingId] = useState<string | number | null>(null);

  // Guard: Guest check
  if (!currentUser || currentUser.role === 'guest') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="inline-flex p-3 rounded-xl bg-slate-50 text-slate-400 mb-3">
          <Icons.CreditCard size={32} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">로그인 후 거래 내역을 조회하세요</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          보증금 입금 확인, 대여 상태 확인, 그리고 기기 반납 프로세스를 시작하려면 에코멤버로 로그인해야 합니다.
        </p>
        <button
          onClick={onShowAuthModal}
          className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  const handleApproveDeposit = async (rentalId: string | number, itemId: string | number) => {
    setLoadingId(rentalId);
    try {
      // 1. Update rental status to active
      await api.updateRentalStatus(rentalId, 'active', 'holding');
      // 2. Update item status to rented
      await api.updateItemStatus(itemId, 'rented');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReturnItem = async (rentalId: string | number, itemId: string | number) => {
    setLoadingId(rentalId);
    try {
      // 1. Update rental status to returned and refund deposit
      await api.updateRentalStatus(rentalId, 'returned', 'refunded');
      // 2. Update item status to available
      await api.updateItemStatus(itemId, 'available');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const getAssociatedItem = (itemId: string | number): Item | undefined => {
    return items.find(item => String(item.id) === String(itemId));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">나의 대여 및 위탁 거래 대여증</h2>
          <p className="text-xs text-slate-500">대여 상태 확인, 송금 인증 및 반납 프로세스를 진행합니다.</p>
        </div>
      </div>

      {rentals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
          <div className="inline-flex p-3 rounded-full bg-slate-50 text-slate-300 mb-3">
            <Icons.History size={28} />
          </div>
          <p className="text-xs font-bold text-slate-700">진행 중이거나 완료된 대여 거래 내역이 없습니다.</p>
          <p className="text-[11px] text-slate-400 mt-1">둘러보기 탭에서 필요한 자원을 선택해 대여를 신청해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rentals.map((rental) => {
            const item = getAssociatedItem(rental.item_id);
            if (!item) return null;

            const isPending = rental.status === 'pending_deposit';
            const isActive = rental.status === 'active';
            const isReturned = rental.status === 'returned';

            const totalTransferAmount = item.price + rental.deposit;

            return (
              <div 
                key={rental.id} 
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition duration-200 ${
                  isPending ? 'border-amber-200 ring-4 ring-amber-500/5' : 'border-slate-200'
                }`}
              >
                {/* Header Badge Row */}
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">대여증 #{String(rental.id).split('-')[1] || rental.id}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status Badge */}
                    {isPending && (
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        입금 확인 대기
                      </span>
                    )}
                    {isActive && (
                      <span className="px-2.5 py-0.5 bg-teal-50 text-[#0f766e] border border-teal-100 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]"></span>
                        이용 중 (정상 대여)
                      </span>
                    )}
                    {isReturned && (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                        반납 및 보증금 정산 완료
                      </span>
                    )}

                    {/* Deposit Badge */}
                    {rental.deposit_status === 'holding' && (
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-800 text-[9px] font-bold rounded-sm border border-sky-100">
                        보증금 보관 중
                      </span>
                    )}
                    {rental.deposit_status === 'refunded' && (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[9px] font-bold rounded-sm border border-teal-100">
                        보증금 반환 완료
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Block */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{item.title}</h3>
                    <div className="text-slate-500 text-[11px] space-y-0.5">
                      <p>📍 대여/반납 장소: <strong className="text-slate-700">{item.location}</strong></p>
                      <p>⏰ 신청 일시: {new Date(rental.rented_at).toLocaleString('ko-KR')}</p>
                      {rental.returned_at && (
                        <p>✅ 반납 일시: {new Date(rental.returned_at).toLocaleString('ko-KR')}</p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 min-w-[180px] space-y-1 text-slate-600">
                    <div className="flex justify-between text-[11px]">
                      <span>시간당 대여 가격</span>
                      <span className="font-bold text-slate-800">{item.price.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>반환형 보증금</span>
                      <span className="font-bold text-slate-800">{rental.deposit.toLocaleString()}원</span>
                    </div>
                    <div className="border-t border-slate-200/60 my-1 pt-1 flex justify-between font-bold text-teal-900 text-xs">
                      <span>총 금액</span>
                      <span>{totalTransferAmount.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>

                {/* Pending deposit action or other states */}
                {isPending && (
                  <div className="px-5 py-4 bg-amber-50/30 border-t border-amber-200 text-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200">
                      <div className="space-y-1">
                        <p className="font-bold text-amber-900 flex items-center gap-1">
                          🏦 신한은행 110-5678-1234 (예금주: 에코링크)
                        </p>
                        <p className="text-slate-600 text-[11px]">
                          대여료 포함 총 <strong className="text-teal-800">{totalTransferAmount.toLocaleString()}원</strong>을 위 계좌로 송금해주세요.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {/* Simulation feature (Instant approval bypass for testing) */}
                        <button
                          onClick={() => handleApproveDeposit(rental.id, item.id)}
                          disabled={loadingId === rental.id}
                          className="px-4 py-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-bold rounded-xl text-[11px] transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {loadingId === rental.id ? (
                            '확인 처리 중...'
                          ) : (
                            <>
                              ⚡ 입금 즉시 확인하기 (체험용)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-2 font-semibold flex items-center gap-1 pl-1">
                      <Icons.Info size={11} /> 
                      본 기능은 PG 결제 모듈 도입 전 수동 무통장 입금 확인을 가상으로 시뮬레이션하기 위한 장치입니다.
                    </p>
                  </div>
                )}

                {isActive && (
                  <div className="px-5 py-4 bg-teal-50/20 border-t border-slate-200 text-xs flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                      <p className="text-[11px] font-semibold">자원을 정상 사용 중입니다. 이용을 마치신 후 거점 수거함에 반환해주세요.</p>
                    </div>

                    <button
                      onClick={() => handleReturnItem(rental.id, item.id)}
                      disabled={loadingId === rental.id}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loadingId === rental.id ? '반납 처리 중...' : '📥 거점 수거함에 반납 접수하기'}
                    </button>
                  </div>
                )}

                {isReturned && (
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Icons.Check size={14} className="text-[#0f766e] font-bold" />
                    반납 완료되어 예방용 파손 보증금 <strong>{rental.deposit.toLocaleString()}원</strong>이 정상 환불 송금되었습니다. 깨끗한 동네 자원 공유를 실천해주셔서 감사합니다!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
