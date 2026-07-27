import { useState, useEffect } from 'react';
import { User, Item, Rental } from './types';
import { api, getSupabaseConfig, getKakaoAppKey, getSupabaseClient, Station } from './supabaseClient';
import { Icons } from './components/Icons';
import { AuthGate } from './components/AuthGate';
import { MapSection } from './components/MapSection';
import { BrowseFeed } from './components/BrowseFeed';
import { ConsignmentForm } from './components/ConsignmentForm';
import { ItemRequestsSection } from './components/ItemRequestsSection';
import { AttendanceSection } from './components/AttendanceSection';
import { TransactionsSection } from './components/TransactionsSection';
import { SettingsModal } from './components/SettingsModal';
import { ChatModal } from './components/ChatModal';
import { ChatListModal } from './components/ChatListModal';

type ActiveTab = 'browse' | 'consignment' | 'requests' | 'attendance' | 'transactions';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [rentalCounts, setRentalCounts] = useState<Record<string, number>>({});
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('browse');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfiguredSupabase, setIsConfiguredSupabase] = useState(false);
  const [kakaoAppKey, setKakaoAppKey] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // 💬 채팅 목록 모달 열림 상태 관리
  const [isChatListOpen, setIsChatListOpen] = useState(false);

  // 💬 글로벌 개별 1:1 대화 모달 상태 관리
  const [activeChatRoom, setActiveChatRoom] = useState<{
    roomId: string;
    itemTitle: string;
  } | null>(null);

  // Initialize: 캐시된 사용자 정보 및 Supabase 설정 확인
  useEffect(() => {
    const cachedUser = localStorage.getItem('ecolink_cached_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      } catch {
        // ignore
      }
    }

    const checkSupabase = () => {
      const client = getSupabaseClient();
      const hasEnvConfig = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      const config = getSupabaseConfig();
      return client !== null || hasEnvConfig || (config.isEnabled && !!config.url);
    };

    setIsConfiguredSupabase(checkSupabase());
    setKakaoAppKey(getKakaoAppKey());
  }, []);

  // Supabase 세션 감지 및 자동 로그인 로직
  useEffect(() => {
    if (!isConfiguredSupabase) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        api.getUser(session.user.id).then(async (profile) => {
          if (profile) {
            handleLogin(profile, true);
          } else {
            const defaultName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '에코멤버';
            const defaultUser: User = {
              id: session.user.id,
              name: defaultName,
              role: 'user',
              created_at: new Date().toISOString()
            };
            await api.upsertUser(defaultUser);
            handleLogin(defaultUser, false);
          }
        }).catch((err) => {
          console.warn("Profile fetch error, fallback to session user:", err);
          const fallbackUser: User = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || '에코멤버',
            role: 'user',
            created_at: new Date().toISOString()
          };
          handleLogin(fallbackUser, true);
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        try {
          const profile = await api.getUser(session.user.id);
          if (profile) {
            handleLogin(profile, false);
          } else {
            const defaultName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '에코멤버';
            const newUser: User = {
              id: session.user.id,
              name: defaultName,
              role: 'user',
              created_at: new Date().toISOString()
            };
            await api.upsertUser(newUser);
            handleLogin(newUser, false);
          }
        } catch (err) {
          console.warn("Auth change user handle fallback:", err);
          const newUser: User = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || '에코멤버',
            role: 'user',
            created_at: new Date().toISOString()
          };
          handleLogin(newUser, false);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('ecolink_cached_user');
        setIsAuthModalOpen(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfiguredSupabase]);

  useEffect(() => {
    loadData();
  }, [currentUser, isConfiguredSupabase]);

  const loadData = async () => {
    try {
      const fetchedItems = await api.getItems();
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);

      const fetchedStations = await api.getStations();
      setStations(Array.isArray(fetchedStations) ? fetchedStations : []);

      const fetchedRentalCounts = await api.getActiveRentalCounts();
      setRentalCounts(fetchedRentalCounts || {});

      if (currentUser && currentUser.role !== 'guest') {
        const fetchedRentals = await api.getRentals(currentUser.id);
        setRentals(Array.isArray(fetchedRentals) ? fetchedRentals : []);
      } else {
        setRentals([]);
      }
    } catch (err) {
      console.error('Error fetching data from API:', err);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogin = (user: User, silent: boolean = false) => {
    setIsAuthModalOpen(false);
    setCurrentUser(user);
    localStorage.setItem('ecolink_cached_user', JSON.stringify(user));
    
    if (!silent) {
      showToast(`🌱 ${user.name}님, 반갑습니다! 에코링크에 오신 것을 환영합니다.`);
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: User = {
      id: 'guest-uuid',
      name: '방문객 게스트',
      role: 'guest',
      created_at: new Date().toISOString()
    };
    setIsAuthModalOpen(false);
    setCurrentUser(guestUser);
    showToast('👁 게스트 모드로 둘러봅니다. 대여나 등록 시 로그인이 안내됩니다.', 'info');
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('ecolink_cached_user');
    setActiveTab('browse');
    setIsAuthModalOpen(true);
    showToast('안전하게 로그아웃되었습니다.');
  };

  const handleOpenGeneralChat = () => {
    if (!currentUser || currentUser.role === 'guest') {
      setIsAuthModalOpen(true);
      return;
    }
    setIsChatListOpen(true);
  };

  const handleRentItem = async (item: Item) => {
    if (!currentUser || currentUser.role === 'guest') {
      setIsAuthModalOpen(true);
      return;
    }

    const totalQuantity = (item as any).quantity ?? 1;
    const currentlyRented = rentalCounts[String(item.id)] || 0;
    if (currentlyRented >= totalQuantity) {
      showToast('😢 죄송해요, 방금 재고가 모두 소진되었습니다.', 'info');
      loadData();
      return;
    }

    try {
      const newRental: Omit<Rental, 'id' | 'rented_at'> = {
        user_id: currentUser.id,
        item_id: item.id,
        deposit: 10000,
        price_paid: item.price,
        status: 'pending_deposit',
        deposit_status: 'holding'
      };

      await api.insertRental(newRental);
      setActiveTab('transactions');
      loadData();
      showToast('🚀 대여가 정상 신청되었습니다. 이체 정보 확인 단계를 진행해주세요.');
    } catch (err: any) {
      console.error('Failed to rent item', err);
      showToast('대여 신청 중 오류가 발생했습니다.', 'info');
      loadData();
    }
  };

  const handleConfigChange = () => {
    const client = getSupabaseClient();
    const hasEnvConfig = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    const config = getSupabaseConfig();
    setIsConfiguredSupabase(client !== null || hasEnvConfig || (config.isEnabled && !!config.url));
    setKakaoAppKey(getKakaoAppKey());
    loadData();
    showToast('⚡ 환경설정이 업데이트되었습니다.');
  };

  const hubNamesMap = (stations || []).reduce((acc, station) => {
    acc[String(station.id)] = station.name;
    return acc;
  }, {} as Record<string, string>);

  const co2Reduced = items.filter(i => i.status === 'rented').length * 1.8 + (rentals.filter(r => r.status === 'returned').length * 2.4);
  const totalRentCount = rentals.length;
  const shouldShowAuthGate = !currentUser || isAuthModalOpen;

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* 1. Left Fixed Sidebar Layout (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-6 h-full justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Icons.EcolinkLogo size={38} className="shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900">에코링크</span>
                <span className="text-[9px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-sm">MVP</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">친환경 자원 공유 플랫폼</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('browse')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'browse' ? 'bg-teal-50 text-[#0f766e]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icons.Search size={16} />
                둘러보기
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'browse' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {items.length}
              </span>
            </button>

            {/* 내 물건 위탁 (공급) */}
            <button
              onClick={() => {
                if (!currentUser || currentUser.role === 'guest') {
                  setIsAuthModalOpen(true);
                } else {
                  setActiveTab('consignment');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'consignment' ? 'bg-teal-50 text-[#0f766e]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                내 물건 위탁
              </span>
              <span className="text-[9px] font-mono text-teal-600 bg-teal-50 px-1 py-0.5 rounded">공급</span>
            </button>

            {/* 빌려주세요 (수요) */}
            <button
              onClick={() => {
                if (!currentUser || currentUser.role === 'guest') {
                  setIsAuthModalOpen(true);
                } else {
                  setActiveTab('requests');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'requests' ? 'bg-teal-50 text-[#0f766e]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icons.Search size={16} />
                빌려주세요
              </span>
              <span className="text-[9px] font-mono text-amber-600 bg-amber-50 px-1 py-0.5 rounded">수요</span>
            </button>

            {/* 🎁 출석체크 탭 */}
            <button
              onClick={() => {
                if (!currentUser || currentUser.role === 'guest') {
                  setIsAuthModalOpen(true);
                } else {
                  setActiveTab('attendance');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'bg-teal-50 text-[#0f766e]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icons.Check size={16} />
                출석체크
              </span>
              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                ECO+
              </span>
            </button>

            <button
              onClick={() => {
                if (!currentUser || currentUser.role === 'guest') {
                  setIsAuthModalOpen(true);
                } else {
                  setActiveTab('transactions');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'transactions' ? 'bg-teal-50 text-[#0f766e]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icons.History size={16} />
                거래내역
              </span>
              {rentals.length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-bold">
                  {rentals.filter(r => r.status === 'pending_deposit' || r.status === 'active').length}
                </span>
              )}
            </button>

            <button
              onClick={handleOpenGeneralChat}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Icons.MessageSquare size={16} className="text-teal-600" />
                1:1 대여 문의
              </span>
              <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full">
                LIVE
              </span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100">
          {currentUser && currentUser.role !== 'guest' ? (
            <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] opacity-60 font-semibold">에코멤버</p>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full">
                  🌿 새싹 (ECO 120)
                </span>
              </div>
              <p className="font-bold text-xs truncate">{currentUser.name} 님</p>
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
                <span className="text-teal-400 font-bold">공유 기여도 120점</span>
                <span className="opacity-60 text-amber-300">보증금 10% 할인</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl text-center">
              <p className="text-[10px] text-slate-500 mb-2 font-semibold">자원 순환에 기여해보세요</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                멤버 로그인 / 시작
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Work Stream Content Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 lg:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <Icons.EcolinkLogo size={28} />
            <span className="text-sm font-black text-slate-900">에코링크</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">내 주변 생활 밀착형 자원 연대</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1.5 bg-emerald-50 border-emerald-100 text-emerald-800 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>환경설정</span>
            </button>

            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.slice(0, 1)}
                </div>
                <button
                  onClick={handleLogout}
                  title="로그아웃"
                  className="p-1.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <Icons.LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Contents Section Frame */}
        <section className="p-6 md:p-8 flex flex-col gap-6 flex-1 overflow-y-auto">
          
          {activeTab === 'browse' && (
            <div className="space-y-6">
              <MapSection 
                stations={stations}
                items={items}
                selectedHubId={selectedHubId} 
                onSelectHub={setSelectedHubId} 
              />

              <BrowseFeed 
                items={items} 
                currentUser={currentUser} 
                selectedHubId={selectedHubId} 
                onRent={handleRentItem} 
                onShowAuthModal={() => setIsAuthModalOpen(true)}
                hubNamesMap={hubNamesMap}
                rentalCounts={rentalCounts}
                onRefresh={loadData}
              />
            </div>
          )}

          {activeTab === 'consignment' && (
            <ConsignmentForm 
              currentUser={currentUser} 
              stations={stations}
              onSuccess={() => {
                loadData();
                setActiveTab('browse');
              }} 
            />
          )}

          {activeTab === 'requests' && (
            <ItemRequestsSection 
              currentUser={currentUser} 
              onShowAuthModal={() => setIsAuthModalOpen(true)} 
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceSection 
              currentUser={currentUser} 
              onShowAuthModal={() => setIsAuthModalOpen(true)} 
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsSection 
              rentals={rentals} 
              items={items} 
              currentUser={currentUser} 
              onRefresh={loadData} 
              onShowAuthModal={() => setIsAuthModalOpen(true)} 
            />
          )}

          <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-200/50 mt-12 shrink-0">
            <p className="font-semibold text-slate-500">🌿 에코링크 (EcoLink) 친환경 동네 연대</p>
            <p className="mt-1 leading-relaxed max-w-md mx-auto text-[11px]">
              "필요한 시간만큼 빌려 쓰는 합리적인 소비 생활, 내 동네에서 시작됩니다."
            </p>
          </footer>
        </section>
      </main>

      {/* 3. Mobile Navigation Bottom Bar */}
      <nav className="lg:hidden bg-white border-t border-slate-200 h-16 fixed bottom-0 left-0 right-0 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'browse' ? 'text-teal-700 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icons.Search size={18} />
          <span className="text-[10px]">둘러보기</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser || currentUser.role === 'guest') {
              setIsAuthModalOpen(true);
            } else {
              setActiveTab('consignment');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'consignment' ? 'text-teal-700 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <span className="text-[10px]">내 물건 위탁</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser || currentUser.role === 'guest') {
              setIsAuthModalOpen(true);
            } else {
              setActiveTab('attendance');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'attendance' ? 'text-teal-700 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icons.Check size={18} />
          <span className="text-[10px]">출석체크</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser || currentUser.role === 'guest') {
              setIsAuthModalOpen(true);
            } else {
              setActiveTab('transactions');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition relative ${
            activeTab === 'transactions' ? 'text-teal-700 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icons.History size={18} />
          <span className="text-[10px]">거래내역</span>
        </button>
      </nav>

      {/* Modals */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onConfigChanged={handleConfigChange} />}
      {shouldShowAuthGate && <AuthGate onLogin={handleLogin} onContinueAsGuest={handleContinueAsGuest} />}
      {isChatListOpen && currentUser && (
        <ChatListModal currentUserId={currentUser.id} onClose={() => setIsChatListOpen(false)} onSelectRoom={(room) => { setIsChatListOpen(false); setActiveChatRoom({ roomId: room.id, itemTitle: room.itemTitle }); }} />
      )}
      {activeChatRoom && currentUser && (
        <ChatModal roomId={activeChatRoom.roomId} itemTitle={activeChatRoom.itemTitle} currentUserId={currentUser.id} onClose={() => setActiveChatRoom(null)} />
      )}
    </div>
  );
}
