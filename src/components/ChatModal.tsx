import React, { useState, useEffect, useRef } from 'react';
import { api, getSupabaseClient } from '../supabaseClient';
import { Icons } from './Icons';

interface ChatModalProps {
  roomId: string;
  itemTitle: string;
  currentUserId: string;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ roomId, itemTitle, currentUserId, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. 초기 메시지 데이터 로드
    api.getMessages(roomId).then((data) => {
      setMessages(data);
      scrollToBottom();
    });

    // 2. Supabase Realtime 실시간 메시지 구독 (소켓 연동)
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const textToSend = inputMessage;
    setInputMessage('');

    await api.sendMessage(roomId, currentUserId, textToSend);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md h-[550px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* 상단 타이틀 헤더 */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.MessageSquare size={18} className="text-teal-400" />
            <div>
              <h3 className="text-xs font-bold truncate max-w-[200px]">{itemTitle}</h3>
              <p className="text-[10px] text-teal-300 font-medium">1:1 실시간 대여 문의</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 메시지 대화방 스크롤 박스 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10">
              <p>대화가 시작되었습니다.</p>
              <p className="text-[10px] text-slate-300 mt-1">대여 장소나 물품 상태에 대해 자유롭게 문의해 보세요!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs font-medium ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
                    }`}
                  >
                    {msg.message_text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 하단 입력창 */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
          >
            <Icons.Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};
