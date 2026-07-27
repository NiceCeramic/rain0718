import React, { useState, useEffect } from 'react';
import { Item, ItemCategory, User } from '../types';
import { Icons } from './Icons';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../supabaseClient';
import { ChatModal } from './ChatModal';

interface BrowseFeedProps {
  items?: Item[];
  currentUser: User | null;
  selectedHubId: string | null;
  onRent: (item: Item) => void;
  onShowAuthModal: () => void;
  hubNamesMap?: Record<string, string>;
  rentalCounts?: Record<string, number>;
  onRefresh?: () => void;
}

type MainFeedMode = 'give' | 'want'; // '빌려줄게요' vs '빌려주세요' 모드

export const BrowseFeed: React.FC<BrowseFeedProps> = ({
  items = [],
  currentUser,
  selectedHubId,
  onRent,
  onShowAuthModal,
  hubNamesMap = {},
  rentalCounts = {},
  onRefresh,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const [feedMode, setFeedMode] = useState<MainFeedMode>('give'); // 탭 상태
  const [requests, setRequests] = useState<any[]>([]); // '빌려주세요' 요청 목록
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [proposingRequest, setProposingRequest] = useState<any | null>(null); // "내가 있어요" 제안 모달용
  const [offerPrice, setOfferPrice] = useState('1000');
  const [offerMessage, setOfferMessage] = useState('');
  const [activeChatRoom, setActiveChatRoom] = useState<{
    roomId: string;
    itemTitle: string;
  } | null>(null);

  // '빌려주세요' 데이터 불러오기
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

  const getRemainingStock = (item: Item): number => {
    const total = (item as any).quantity ?? 1;
    const rented = rentalCounts[String(item.id)] || 0;
    return Math.max(0, total - rented);
  };

  const handleUpdateAvailability = async (itemId: number | string, newStatus: 'green' | 'yellow' | 'red', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const supabase = (api as any).supabase;
      if (supabase) {
        await supabase.from('items').update({ availability_status: newStatus }).eq('id', itemId);
        alert('물품의 대여 상태가 실시간으로 변경되었습니다!');
        if (onRefresh) onRefresh();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }
    if (!proposingRequest) return;

    alert(`🚀 "${proposingRequest.requester_name}"님에게 대여 제안이 전송되었습니다!`);
    setProposingRequest(null);
    setOfferMessage('');
  };

  // 🎯 필터링된 공급 물품
  const filteredItems = safeItems.filter((item) => {
    if (selectedHubId) {
      const targetName = (hubNamesMap[selectedHubId] || selectedHubId || '').trim().toLowerCase();
      const itemLoc = (item.location || '').trim().toLowerCase();
      const itemHub = ((item as any).hub_name || '').trim().toLowerCase();
      const isMatched = itemLoc === targetName || itemHub === targetName || itemLoc.includes(targetName) || targetName.includes(itemLoc);
      if (!isMatched) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(query) || (item.location || '').toLowerCase().includes(query);
    }
    return true;
  });

  // 🎯 필터링된 수요 요청 물품
  const filteredRequests = requests.filter((req) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return req.title.toLowerCase().includes(query) || (req.location || '').toLowerCase().includes(query);
    }
    return true;
  });

  const renderStatusBadge = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">🟢 지금 빌려줄 수 있음</span>;
      case 'yellow':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">🟡 오늘 저녁 가능</span>;
      case 'red':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold flex items-center gap-1">🔴 현재 이용 불가</span>;
      default:
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">🟢 지금 빌려줄 수 있음</span>;
    }
  };

  const renderItemThumbnail = (category: ItemCategory, color: string) => {
    const isUmbrella = category === 'umbrella' || category === '우산';
    const isSunshade = category === 'sunshade' || category === '양산';
    const isBattery = category === 'battery' || category === '보조배터리';

    return (
      <div
        className="w-full h-full rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-30"></div>
        {isUmbrella && <Icons.Umbrella size={52} style={{ color }} className="drop-shadow-sm animate-pulse" />}
        {isSunshade && <Icons.Sun size={52} style={{ color }} className="drop-shadow-sm" />}
        {isBattery && <Icons.Battery size={52} style={{ color }} className="drop-shadow-sm" />}
        {!isUmbrella && !isSunshade && !isBattery && <Icons.Store size={52} style={{ color }} className="drop-shadow-sm" />}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 🔄 [빌려줄게요] vs [빌려주세요] 메인 전환 탭 버튼 */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setFeedMode('give')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              feedMode === 'give'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📦 빌려줄게요 (공급 물품)</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{filteredItems.length}</span>
          </button>

          <button
            onClick={() => setFeedMode('want')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              feedMode === 'want'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🔍 빌려주세요 (이웃의 수요 요청)</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{filteredRequests.length}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
          <Icons.Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={feedMode === 'give' ? "등록된 공유 자원이나 거점명을 검색해보세요..." : "이웃이 찾는 물품명을 검색해보세요..."}
          className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-teal-500 shadow-xs transition"
        />
      </div>

      {/* 📦 1. 빌려줄게요 (공급 물품 피드) */}
      {feedMode === 'give' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
              <p className="text-xs font-bold">조건에 일치하는 공급 자원이 없습니다.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const avStatus = (item as any).availability_status || 'green';
              const remainingStock = getRemainingStock(item);
              const isRed = avStatus === 'red' || remainingStock <= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white rounded-3xl p-5 border border-slate-200 flex flex-col shadow-xs hover:shadow-md transition-all cursor-pointer group relative ${
                    isRed ? 'opacity-70' : ''
                  }`}
                >
                  <div className="absolute top-4 right-4 z-10">
                    {renderStatusBadge(avStatus)}
                  </div>

                  <div className="w-full aspect-video bg-teal-50/40 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-95 transition-transform overflow-hidden">
                    {renderItemThumbnail(item.category, item.color)}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-teal-700 transition mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                    <Icons.MapPin size={12} className="text-slate-400" />
                    <span className="truncate">{item.location || (item as any).hub_name}</span>
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-sm font-black text-slate-800">
                      ₩{(item.price || 1000).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ 건</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser || currentUser.role === 'guest') {
                          onShowAuthModal();
                        } else {
                          api.getOrCreateChatRoom(item.id, currentUser.id, (item as any).owner_id || 'dummy').then(room => {
                            if (room) setActiveChatRoom({ roomId: room.id, itemTitle: item.title });
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0f766e] border border-teal-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <Icons.MessageSquare size={13} />
                      <span>문의</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 🔍 2. 빌려주세요 (이웃의 수요 요청 피드) */}
      {feedMode === 'want' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
              <p className="text-xs font-bold">등록된 '빌려주세요' 수요 요청이 없습니다.</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
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
                    {req.description || '상세 사연이 없습니다.'}
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
      )}

      {/* 공급 물품 상세 모달 */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
            >
              <div
                className="h-44 relative flex items-center justify-center"
                style={{ backgroundColor: `${selectedItem.color}15` }}
              >
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/40 text-white hover:bg-slate-900/60 transition cursor-pointer"
                >
                  ✕
                </button>
                {renderItemThumbnail(selectedItem.category, selectedItem.color)}
              </div>

              <div className="p-6 text-xs space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 font-bold">📍 {selectedItem.location}</span>
                    {renderStatusBadge((selectedItem as any).availability_status || 'green')}
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedItem.title}</h2>
                </div>

                {currentUser && currentUser.id === ((selectedItem as any).owner_id || (selectedItem as any).user_id) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <span className="font-bold text-slate-800 block">🎛️ 실시간 상태 변경 제어</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={(e) => handleUpdateAvailability(selectedItem.id, 'green', e)} className="py-2 bg-emerald-100 text-emerald-800 font-bold rounded-xl">🟢 지금 가능</button>
                      <button onClick={(e) => handleUpdateAvailability(selectedItem.id, 'yellow', e)} className="py-2 bg-amber-100 text-amber-800 font-bold rounded-xl">🟡 오늘 저녁</button>
                      <button onClick={(e) => handleUpdateAvailability(selectedItem.id, 'red', e)} className="py-2 bg-rose-100 text-rose-800 font-bold rounded-xl">🔴 이용 불가</button>
                    </div>
                  </div>
                )}

                <p className="text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {selectedItem.description}
                </p>

                <button
                  onClick={() => {
                    if (!currentUser || currentUser.role === 'guest') {
                      onShowAuthModal();
                    } else {
                      onRent(selectedItem);
                      setSelectedItem(null);
                    }
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  🚀 대여 신청하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* "내가 있어요" 제안 모달 */}
      {proposingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">💬 대여 제안 보내기 ({proposingRequest.title})</h3>
              <button onClick={() => setProposingRequest(null)} className="text-slate-400 font-bold text-xs cursor-pointer">✕ 닫기</button>
            </div>

            <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">제안 가격 (원)</label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">전달할 메시지</label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={3}
                  placeholder="예: 집에 물건이 있어요. 언제든 빌려드릴게요!"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl leading-relaxed"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setProposingRequest(null)} className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl">취소</button>
                <button type="submit" className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md cursor-pointer">제안 보내기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeChatRoom && currentUser && (
        <ChatModal
          roomId={activeChatRoom.roomId}
          itemTitle={activeChatRoom.itemTitle}
          currentUserId={currentUser.id}
          onClose={() => setActiveChatRoom(null)}
        />
      )}
    </div>
  );
};
