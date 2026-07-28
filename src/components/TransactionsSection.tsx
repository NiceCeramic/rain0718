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

  if (!currentUser || currentUser.role === 'guest') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="inline-flex p-3 rounded-xl bg-slate-50 text-slate-400 mb-3">
          <Icons.CreditCard size={32} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">로그인 후 거래 내역을 조회하세요</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          보증금 입금 확인, 대여/나눔 상태 확인, 그리고 기기 반납 프로세스를 진행하려면 에코멤버로 로그인해야 합니다.
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

  // ⚡ 입금 확인 버튼 처리
  const handleApproveDeposit = async (rentalId: string | number, itemId: string | number) => {
    setLoadingId(rentalId);
    try {
      await api.updateRentalStatus(rentalId, 'active', 'holding');
      if (itemId) {
        await api.updateItemStatus(itemId, 'rented');
      }
      await onRefresh();
    } catch (err) {
      console.error('Failed to approve deposit:', err);
      alert('입금 확인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  // 📥 반납하기 버튼 처리
  const handleReturnItem = async (rentalId: string | number, itemId: string | number) => {
    setLoadingId(rentalId);
    try {
      await api.updateRentalStatus(rentalId, 'returned', 'refunded');
      if (itemId) {
        await api.updateItemStatus(itemId, 'available');
      }
      await onRefresh();
    } catch (err) {
      console.error('Failed to return item:', err);
      alert('반납 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  const getAssociatedItem = (itemId: string | number): Item | undefined => {
    return items.find(item => String(item.id) === String(itemId));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '신청 일시 기록 중';
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return '방금 전';
    }
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">나의 대여 및 나눔 거래 내역</h2>
          <p className="text-xs text-slate-500">내가 빌려 쓰는 '대여증'과 내 물건을 공유하는 '나눔증' 내역을 관리합니다.</p>
        </div>
      </div>

      {rentals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
          <div className="inline-flex p-3 rounded-full bg-slate-50 text-slate-300 mb-3">
            <Icons.History size={28} />
          </div>
          <p className="text-xs font-bold text-slate-700">진행 중이거나 완료된 거래 내역이 없습니다.</p>
          <p className="text-[11px] text-slate-400 mt-1">둘러보기에서 자원을 대여하거나 내 물건을 위탁해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rentals.map((rental) => {
            const item = getAssociatedItem(rental.item_id);
            const itemId = item?.id || rental.item_id;

            // 현재 사용자가 물건의 소유주(위탁자)인지 판별
            const isOwner = item && item.owner_id && currentUser.id 
              ? String(item.owner_id) === String(currentUser.id) 
              : false;

            const isPending = rental.status === 'pending_deposit';
            const isActive = rental.status === 'active';
            const isReturned = rental.status === 'returned';

            // 가격 정책: 총 금액은 보증금 기준, 대여료 및 수수료는 보증금에서 차감 후 반환
            const depositPrice = rental.deposit || 10000; // 보증금 (총 입금액)
            const itemPrice = item?.price || rental.price_paid || 2000; // 대여료
            const platformFee = Math.round(itemPrice * 0.2); // 플랫폼 수수료 (20%)
            const totalTransferAmount = depositPrice; // 총 결제금액은 보증금과 동일

            const consignorAmount = itemPrice - platformFee; // 위탁자 정산금

            return (
              <div 
                key={rental.id} 
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition duration-200 ${
                  isPending ? 'border-amber-200 ring-4 ring-amber-500/5' : 'border-slate-200'
                }`}
              >
                {/* Header Badge Row */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
                  isOwner ? 'bg-teal-50/60 border-teal-100' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: item?.color || '#0f766e' }}
                    ></span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      {isOwner ? '🤝 나눔증 (위탁 공유)' : '📦 대여증 (자원 대여)'} #{String(rental.id).split('-')[1] || rental.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {isOwner ? '상대방 입금 대기 중' : '입금 확인 대기'}
                      </span>
                    )}
                    {isActive && (
                      <span className="px-2.5 py-0.5 bg-teal-50 text-[#0f766e] border border-teal-100 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]"></span>
                        {isOwner ? '공유/이용 중' : '대여 이용 중'}
                      </span>
                    )}
                    {isReturned && (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                        {isOwner ? '나눔 및 정산 완료' : '반납 및 정산 완료'}
                      </span>
                    )}

                    {rental.deposit_status === 'holding' && (
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-800 text-[9px] font-bold rounded-sm border border-sky-100">
                        보증금 보관 중
                      </span>
                    )}
                    {rental.deposit_status === 'refunded' && (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[9px] font-bold rounded-sm border border-teal-100">
                        정산 완료
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Block */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                      {item?.category || '공유 자원'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{item?.title || '등록된 공유 자원'}</h3>
                    <div className="text-slate-500 text-[11px] space-y-0.5">
                      <p>📍 거점 장소: <strong className="text-slate-700">{item?.location || item?.hub_name || '지정 거점'}</strong></p>
                      <p>⏰ 신청 일시: {formatDate(rental.rented_at)}</p>
                      {rental.returned_at && (
                        <p className="text-teal-700 font-bold">🎉 완료 일시: {formatDate(rental.returned_at)}</p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 min-w-[230px] space-y-1.5 text-slate-600">
                    <div className="flex justify-between text-[11px]">
                      <span>반환형 보증금</span>
                      <span className="font-bold text-slate-800">₩{depositPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                      <span>└ 대여료 (₩{itemPrice.toLocaleString()} + 수수료 ₩{platformFee.toLocaleString()})</span>
                      <span className="text-amber-700">-₩{itemPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-2 pb-1">
                      (추후 대여료 차감 후 반환 예정)
                    </div>
                    <div className="border-t border-slate-200/80 my-1 pt-1.5 flex justify-between font-bold text-teal-900 text-xs">
                      <span>{isOwner ? '예상 정산/보증금 합계' : '총 결제(입금) 금액'}</span>
                      <span>₩{totalTransferAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Status-specific Action Cards */}
                {isPending && !isOwner && (
                  <div className="px-5 py-4 bg-amber-50/30 border-t border-amber-200 text-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200">
                      <div className="space-y-1">
                        <p className="font-bold text-amber-900 flex items-center gap-1">
                          🏦 신한은행 110-5678-1234 (예금주: 에코링크)
                        </p>
                        <p className="text-slate-600 text-[11px]">
                          보증금 포함 총 <strong className="text-teal-800">₩{totalTransferAmount.toLocaleString()}</strong>을 위 계좌로 송금해주세요.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApproveDeposit(rental.id, itemId)}
                          disabled={loadingId === rental.id}
                          className="px-4 py-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-bold rounded-xl text-[11px] transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {loadingId === rental.id ? '확인 처리 중...' : '⚡ 입금 즉시 확인하기 (체험용)'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isPending && isOwner && (
                  <div className="px-5 py-3.5 bg-amber-50/20 border-t border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <span>⏳ 대여자가 계좌 송금 및 입금을 진행 중입니다. 입금이 확인되면 대여가 시작됩니다.</span>
                    <button
                      onClick={() => handleApproveDeposit(rental.id, itemId)}
                      disabled={loadingId === rental.id}
                      className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-[10px]"
                    >
                      강제 입금 확인
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="px-5 py-4 bg-teal-50/20 border-t border-slate-200 text-xs flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                      <p className="text-[11px] font-semibold">
                        {isOwner 
                          ? '내 물건이 안전하게 공유 대여 중입니다.' 
                          : '자원을 대여 중입니다. 이용을 마치신 후 사진 인증 및 반납을 진행해 주세요.'}
                      </p>
                    </div>

                    {!isOwner && (
                      <button
                        onClick={() => handleReturnItem(rental.id, itemId)}
                        disabled={loadingId === rental.id}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {loadingId === rental.id ? '반납 처리 중...' : '📸 사진 촬영 인증 및 반납 접수'}
                      </button>
                    )}
                  </div>
                )}

                {isReturned && (
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#0f766e]">
                      <Icons.Check size={14} />
                      <span>{isOwner ? '나눔(위탁) 정산 완료 내역' : '반납 및 보증금 환급 완료 내역'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">위탁자 정산금</span>
                        <strong className="text-slate-800">₩{consignorAmount.toLocaleString()}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">대여자 (보증금 환급)</span>
                        <strong className="text-teal-700">₩{(depositPrice - itemPrice).toLocaleString()}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">에코링크 수수료</span>
                        <strong className="text-slate-800">₩{platformFee.toLocaleString()}</strong>
                      </div>
                    </div>
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
