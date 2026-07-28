// 가격 및 수수료 정책 계산 (총 금액은 보증금 기준, 대여료 및 수수료는 보증금에서 차감 후 반환)
            const depositPrice = rental.deposit || 10000; // 보증금 (총 결제/입금 금액)
            const itemPrice = item?.price || rental.price_paid || 2000; // 대여료
            const platformFee = Math.round(itemPrice * 0.2); // 플랫폼 수수료 (예: 20%)
            const totalTransferAmount = depositPrice; // 총 입금액은 보증금(10,000원)과 일치시킴

            // 반납 시 실제 환급금 = 보증금 - 대여료 (또는 정산 방식에 맞춤)
            const actualRefund = depositPrice - itemPrice; 
            const consignorAmount = itemPrice - platformFee; // 위탁자 정산금

            return (
              <div 
                key={rental.id} 
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition duration-200 ${
                  isPending ? 'border-amber-200 ring-4 ring-amber-500/5' : 'border-slate-200'
                }`}
              >
                {/* Header 부분 생략 (기존과 동일) */}

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
                    </div>
                  </div>

                  {/* Pricing Info (요청하신 구조 반영) */}
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
                      <span>총 결제(입금) 금액</span>
                      <span>₩{totalTransferAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
