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
  const [otherUserName, setOtherUserName] = useState<string>('대화 상대');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let channel: any = null;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      try {
        // 0. 채팅방 정보(구매자, 판매자 ID)를 조회하여 상대방 이름 파악
        const client = getSupabaseClient();
        if (client) {
          const { data: roomData } = await client
            .from('chat_rooms')
            .select('*')
            .eq('id', roomId)
            .maybeSingle();

          if (roomData) {
            const otherId = String(roomData.buyer_id) === String(currentUserId) 
              ? roomData.seller_id 
              : roomData.buyer_id;

            if (otherId) {
              const otherUser = await api.getUser(otherId);
              if (otherUser && otherUser.name) {
                setOtherUserName(otherUser.name);
              }
            }
          }
        }

        // 1. 채팅방 입장 즉시 안읽은 메시지 읽음 처리 (is_read = true)
        await api.markMessagesAsRead(roomId, currentUserId);

        // 2. 대화 내역 불러오기
        const initialMessages = await api.getMessages(roomId);
        setMessages(initialMessages || []);
      } catch (err) {
        console.error('Error loading chat messages:', err);
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }

      // 3. 실시간 메시지 구독
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
            async (payload) => {
              const newMsg = payload.new as ChatMessage;
              
              if (newMsg.sender_id !== currentUserId) {
                await api.markMessagesAsRead(roomId, currentUserId);
              }

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
  }, [roomId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 💬 메시지 전송
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

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
      const sent = await api.sendMessage(roomId, currentUserId, text);
      if (sent) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? sent : m))
        );
      } else {
        alert('메시지 전송에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(`메시지 전송 실패: ${err?.message || '권한 오류'}`);
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[580px]">
        
        {/* Header (상대방 이름 및 물품명 표시) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Icons.MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold truncate max-w-[160px]">{otherUserName}</h3>
                <span className="text-[10px] text-slate-400 font-normal">님과 대화 중</span>
              </div>
              <p className="text-[10px] text-teal-400 font-medium truncate max-w-[200px]">📦 {itemTitle}</p>
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
              <p className="text-xs font-bold text-slate-700">{otherUserName}님과의 대화가 시작되었습니다!</p>
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
