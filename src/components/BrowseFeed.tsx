import React, { useState } from 'react';
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
}

type FilterType =
  | 'all'
  | 'umbrella'
  | 'sunshade'
  | 'battery'
  | 'tools'
  | 'electronics'
  | 'etc'
  | 'available'
  | '우산'
  | '양산'
  | '보조배터리';

export const BrowseFeed: React.FC<BrowseFeedProps> = ({
  items = [], // 🛡️ undefined 방지 기본값
  currentUser,
  selectedHubId,
  onRent,
  onShowAuthModal,
  hubNamesMap = {}, // 🛡️ undefined 방지 기본값
  rentalCounts = {}, // 🛡️ undefined 방지 기본값
}) => {
  // 안전하게 배열 검증
  const safeItems = Array.isArray(items) ? items : [];

  const getRemainingStock = (item: Item): number => {
    const total = (item as any).quantity ?? 1;
    const rented = rentalCounts[String(item.id)] || 0;
    return Math.max(0, total - rented);
  };

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [activeChatRoom, setActiveChatRoom] = useState<{
    roomId: string;
    itemTitle: string;
  } | null>(null);

  const filteredItems = safeItems.filter((item) => {
    if (selectedHubId) {
      const selectedHubName = hubNamesMap[selectedHubId];
      if (
        selectedHubName &&
        item.location !== selectedHubName &&
        item.hub_name !== selectedHubName
      ) {
        return false;
      }
    }

    if (filter === 'umbrella' || filter === '우산') {
      if (item.category !== 'umbrella' && item.category !== '우산') return false;
    } else if (filter === 'sunshade' || filter === '양산') {
      if (item.category !== 'sunshade' && item.category !== '양산') return false;
    } else if (filter === 'battery' || filter === '보조배터리') {
      if (item.category !== 'battery' && item.category !== '보조배터리') return false;
    } else if (filter === 'tools') {
      if (item.category !== 'tools') return false;
    } else if (filter === 'electronics') {
      if (item.category !== 'electronics') return false;
    } else if (filter === 'etc') {
      if (item.category !== 'etc') return false;
    } else if (filter === 'available') {
      if (item.status !== 'available' || getRemainingStock(item) <= 0) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchLoc = (item.location || item.hub_name || '').toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query) || false;
      return matchTitle || matchLoc || matchDesc;
    }

    return true;
  });

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
        {isUmbrella && (
          <Icons.Umbrella size={52} style={{ color }} className="drop-shadow-sm animate-pulse" />
        )}
        {isSunshade && <Icons.Sun size={52} style={{ color }} className="drop-shadow-sm" />}
        {isBattery && <Icons.Battery size={52} style={{ color }} className="drop-shadow-sm" />}
        {!isUmbrella && !isSunshade && !isBattery && (
          <Icons.Store size={52} style={{ color }} className="drop-shadow-sm" />
        )}
      </div>
    );
  };

  const handleRequestRent = (item: Item) => {
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }
    onRent(item);
    setSelectedItem(null);
  };

  const handleOpenChat = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();

    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }

    const sellerId = (item as any).owner_id || (item as any).user_id || 'seller-dummy-id';

    if (sellerId === currentUser.id) {
      alert('본인이 위탁 등록한 물품입니다.');
      return;
    }

    try {
      const room = await (api as any).getOrCreateChatRoom(
        item.id,
        currentUser.id,
        sellerId
      );

      if (room) {
        setSelectedItem(null);
        setActiveChatRoom({
          roomId: room.id,
          itemTitle: item.title,
        });
      } else {
        alert('채팅방을 생성하지 못했습니다. Supabase 연동 상태를 확인해 주세요.');
      }
    } catch (err) {
      console.error('Chat room open error:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
          <Icons.Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="거점명, 대여 자원명 또는 모델명을 검색해보세요..."
          className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 shadow-xs transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition text-xs font-bold cursor-pointer"
          >
            지우기
          </button>
        )}
      </div>

      {/* Filter Chip Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: 'all', label: '전체' },
            { id: 'umbrella', label: '☔ 우산' },
            { id: 'sunshade', label: '☀️ 양산' },
            { id: 'battery', label: '🔋 보조배터리' },
            { id: 'tools', label: '🛠 공구/생활' },
            { id: 'electronics', label: '💻 전자제품' },
            { id: 'etc', label: '📦 기타' },
            { id: 'available', label: '🟢 즉시 대여가능' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id as FilterType)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filter === chip.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-500 hover:text-[#0f766e]'
            }`}
          >
            {chip.label}
          </button>
        ))}

        {safeItems.filter((i) => i.status === 'rented').length > 0 && (
          <div className="ml-auto hidden md:flex items-center gap-1.5 text-xs font-bold text-[#0f766e] bg-teal-50/60 px-4 py-2 rounded-full border border-teal-200 animate-pulse">
            <Icons.Eye size={12} />
            <span>{safeItems.filter((i) => i.status === 'rented').length}명이 대여 중</span>
          </div>
        )}
      </div>

      {/* Product Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-xs font-bold">일치하는 공유 자원이 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              검색어를 수정하거나 다른 카테고리 필터를 선택해보세요.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const remainingStock = getRemainingStock(item);
            const isSoldOut = remainingStock <= 0;
            const isAvailable = item.status === 'available' && !isSoldOut;
            const isRented = item.status === 'rented' || isSoldOut;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-3xl p-5 border border-slate-200 flex flex-col shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative ${
                  !isAvailable ? 'opacity-60 grayscale-[0.5]' : ''
                }`}
              >
                {!isAvailable && (
                  <div className="absolute top-4 right-4 z-10 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-widest">
                    {isSoldOut ? '품절' : isRented ? 'Rented Out' : 'Checking'}
                  </div>
                )}

                {item.viewers > 0 && isAvailable && (
                  <div className="absolute top-4 left-4 z-10 bg-[#0f766e] text-white font-bold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs pointer-events-none animate-pulse">
                    <Icons.Eye size={10} />
                    <span>조회 {item.viewers}명</span>
                  </div>
                )}

                <div className="w-full aspect-video bg-teal-50/40 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-95 transition-transform overflow-hidden">
                  {renderItemThumbnail(item.category, item.color)}
                </div>

                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-teal-700 transition">
                    {item.title}
                  </h3>
                  {isAvailable && (
                    <span className="text-[10px] font-bold text-[#0f766e] bg-teal-50 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                      대여가능 · {remainingStock}개 남음
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                  <Icons.MapPin size={12} className="text-slate-400" />
                  <span className="truncate">
                    {item.location || item.hub_name} (
                    {item.distance || '거리 확인'})
                  </span>
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <span className="text-sm font-black text-slate-800">
                      ₩{(item.price || 1000).toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-400 uppercase">
                        / 건
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleOpenChat(e, item)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0f766e] border border-teal-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="1:1 실시간 문의"
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

      {/* Detail Modal */}
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
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-40"></div>
                <div className="p-4 rounded-full bg-white/40 backdrop-blur-xs shadow-inner">
                  {renderItemThumbnail(selectedItem.category, selectedItem.color)}
                </div>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/40 text-white hover:bg-slate-900/60 transition cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="p-6 text-xs space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        backgroundColor: `${selectedItem.color}15`,
                        color: selectedItem.color,
                      }}
                    >
                      {selectedItem.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      📍 {selectedItem.location || selectedItem.hub_name} (
                      {selectedItem.distance || '거리 확인'})
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedItem.title}
                  </h2>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-1">상세 설명</h4>
                  <p className="text-slate-500 leading-relaxed text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="bg-teal-50/20 border border-teal-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                    <span>대여료</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {(selectedItem.price || 1000).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-600 border-t border-teal-100/40 pt-2">
                    <div className="flex items-center gap-1">
                      <span>파손 예방용 반환 보증금</span>
                      <span
                        className="inline-flex p-0.5 rounded-full bg-teal-100/60 text-[#0f766e] text-[8px] cursor-help font-bold"
                        title="반납 시 즉시 100% 환불됩니다."
                      >
                        ?
                      </span>
                    </div>
                    <span className="font-bold text-slate-800">10,000원</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center leading-normal">
                  ⚠️ 보증금은 미납 및 고의 유실, 파손을 예방하기 위한 조치이며 반납 즉시 자동 환급됩니다.
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-600 -mt-2">
                  <span>남은 수량</span>
                  <span
                    className={`font-bold ${
                      getRemainingStock(selectedItem) > 0 ? 'text-teal-700' : 'text-rose-600'
                    }`}
                  >
                    {getRemainingStock(selectedItem)}개 / 총{' '}
                    {(selectedItem as any).quantity ?? 1}개
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  {selectedItem.status !== 'available' ||
                  getRemainingStock(selectedItem) <= 0 ? (
                    <button
                      disabled
                      className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-2xl text-xs cursor-not-allowed"
                    >
                      😢 모두 대여 중인 물건입니다 (품절)
                    </button>
                  ) : currentUser?.role === 'guest' ? (
                    <button
                      onClick={onShowAuthModal}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition cursor-pointer text-center"
                    >
                      🔒 일반 에코멤버로 회원 가입 후 대여 가능
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRequestRent(selectedItem)}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition shadow-md cursor-pointer"
                      >
                        🚀 소급 대여 신청하기 (보증금 이체 단계로 이동)
                      </button>

                      <button
                        onClick={(e) => handleOpenChat(e, selectedItem)}
                        className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-[#0f766e] border border-teal-200 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Icons.MessageSquare size={16} />
                        <span>💬 1:1 대여 문의하기</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
