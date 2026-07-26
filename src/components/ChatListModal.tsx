import React, { useState, useEffect } from 'react';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface EnrichedChatRoom {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  item_title: string;
  item_category: string;
  item_color: string;
  other_user_name: string;
  last_message: string;
  last_time: string;
}

interface ChatListModalProps {
  currentUserId: string;
  onClose: () => void;
  onSelectRoom: (room: { id: string; itemTitle: string }) => void;
}

export const ChatListModal: React.FC<ChatListModalProps> = ({
  currentUserId,
  onClose,
  onSelectRoom,
}) => {
  const [chatRooms, setChatRooms] = useState<EnrichedChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      const rooms = await api.getMyChatRooms(currentUserId);
      setChatRooms(rooms);
      setIsLoading(false);
    };

    fetchRooms();
  }, [currentUserId]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[580px]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Icons.MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold">1:1 대여 채팅 목록</h3>
              <p className="text-[10px] text-teal-400 font-medium">진행 중인 모든 자원 공유 대화</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Room List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
              채팅 목록을 불러오는 중...
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Icons.MessageSquare size={36} className="text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-700">진행 중인 대화가 없습니다.</p>
              <p className="text-[11px] mt-1 text-slate-400 max-w-[220px]">
                [둘러보기] 탭에서 마음에 드는 물품의 [문의] 버튼을 눌러 대화를 시작해보세요!
              </p>
            </div>
          ) : (
            chatRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  onSelectRoom({ id: room.id, itemTitle: room.item_title });
                }}
                className="p-4 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3"
              >
                {/* 물품 컬러 썸네일 아이콘 */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{ backgroundColor: `${room.item_color}20` }}
                >
                  <Icons.Store size={22} style={{ color: room.item_color }} />
                </div>

                {/* 대화 정보 (상대방 이름 + 물품명 + 마지막 메시지) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {room.other_user_name}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded truncate">
                        {room.item_title}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                      {formatTime(room.last_time)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate">
                    {room.last_message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
