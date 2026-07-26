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

  useEffect(() => {
    let channel: any = null;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      try {
        const initialMessages = await api.getMessages(roomId);
        setMessages(initialMessages || []);
      } catch (err) {
        console.error('Error loading chat messages:', err);
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }

      // 🔔 실시간 메시지 구독 (상대방 메시지 수신)
      const supabase = getSupabaseClient();
      if (supabase) {
        channel = supabase
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
              const newMsg = payload.new as ChatMessage;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              setTimeout(scrollToBottom, 100);
            }
          )
          .subscribe();
      }
    };

    fetchAndSubscribe();

    return () => {
      if (channel && getSupabaseClient()) {
        getSupabaseClient()?.removeChannel(channel);
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 💬 메시지 전송 (즉시 화면 표시 + DB 보관)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // 1. 임시 아이디로 즉시 화면에 노출 (속도감 향상)
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      message: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      // 2. Supabase DB 전송
      const sent = await api.sendMessage(roomId, currentUserId, text);
      if (sent) {
        // 실제 DB 저장 완료 아이디로 대체
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? sent : m))
        );
      } else {
        alert('메시지 전송에 실패했습니다. (SQL Editor 권한 구문을 실행해 보세요.)');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('메시지 전송 실패');
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
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
              <h3 className="text-sm font-bold truncate max-w-[200px]">{itemTitle}</h3>
              <p className="text-[10px] text-teal-400 font-medium">🥕 1:1 실시간 대여 문의</p>
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
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              대화 내역을 불러오는 중...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                <Icons.MessageSquare size={24} />
              </div>
              <p className="text-xs font-bold text-slate-700">작성자와의 대화가 시작되었습니다!</p>
              <p className="text-[11px] mt-1 text-slate-400 max-w-[220px]">
                대여 장소, 시간, 물품 상태에 대해 부담 없이 질문해 보세요.
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
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-[#0f766e] text-white rounded-br-none font-medium'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none font-medium'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '방금 전'}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
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
            className="p-3 bg-[#0f766e] hover:bg-teal-700 disabled:opacity-40 text-white rounded-2xl transition cursor-pointer shrink-0"
          >
            <Icons.Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};
