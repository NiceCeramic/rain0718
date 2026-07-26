import React, { useState, useEffect, useRef } from 'react';
import { api, getSupabaseClient } from '../supabaseClient';
import { Icons } from './Icons';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface ChatModalProps {
  roomId: string;
  itemTitle: string;
  currentUserId: string;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  roomId,
  itemTitle,
  currentUserId,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. 기존 메시지 불러오기 & Supabase Realtime 구독
  useEffect(() => {
    let subscription: any = null;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      try {
        // 기존 대화 내역 조회
        const initialMessages = await api.getMessages(roomId);
        setMessages(initialMessages || []);
      } catch (err) {
        console.error('Error loading chat messages:', err);
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }

      // Supabase Realtime으로 실시간 메시지 수신
      const supabase = getSupabaseClient();
      if (supabase) {
        subscription = supabase
          .channel(`room-${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              const newMessage = payload.new as ChatMessage;
              setMessages((prev) => {
                // 중복 추가 방지
                if (prev.some((m) => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              setTimeout(scrollToBottom, 100);
            }
          )
          .subscribe();
      }
    };

    fetchAndSubscribe();

    return () => {
      if (subscription && getSupabaseClient()) {
        getSupabaseClient()?.removeChannel(subscription);
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. 메시지 전송 핸들러
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const sentMsg = await api.sendMessage(roomId, currentUserId, textToSend);
      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[560px]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Icons.MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold truncate max-w-[220px]">{itemTitle}</h3>
              <p className="text-[10px] text-teal-400 font-medium">1:1 실시간 대여 문의</p>
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

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
              대화 내역을 불러오는 중...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Icons.MessageSquare size={36} className="text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">대화가 시작되었습니다.</p>
              <p className="text-[11px] mt-1 text-slate-400">
                대여 장소나 물품 상태에 대해 자유롭게 문의해 보세요!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-teal-700 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Footer */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 text-xs px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="p-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-2xl transition cursor-pointer shrink-0"
          >
            <Icons.Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
