import { useState, useEffect } from 'react';
import { User, Item, Rental } from './types';
import { api, getSupabaseConfig, getKakaoAppKey, getSupabaseClient } from './supabaseClient';
import { INITIAL_HUBS } from './data';
import { Icons } from './components/Icons';
import { AuthGate } from './components/AuthGate';
import { MapSection } from './components/MapSection';
import { BrowseFeed } from './components/BrowseFeed';
import { ConsignmentForm } from './components/ConsignmentForm';
import { TransactionsSection } from './components/TransactionsSection';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'browse' | 'consignment' | 'transactions';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('browse');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfiguredSupabase, setIsConfiguredSupabase] = useState(false);
  const [kakaoAppKey, setKakaoAppKey] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Initialize: Load user from localStorage & Supabase settings
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

    const config = getSupabaseConfig();
    const hasEnvConfig = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    setIsConfiguredSupabase(hasEnvConfig || (config.isEnabled && !!config.url));
    setKakaoAppKey(getKakaoAppKey());
  }, []);

  // Listen to Supabase session changes whenever isConfiguredSupabase is enabled
  useEffect(() => {
    if (!isConfiguredSupabase) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Check existing session on mount/enable to handle Google OAuth redirect
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
          console.error("Profile fetch failed:", err);
          setIsAuthModalOpen(false);
        });
      }
    });

    // Listen to active auth session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const cachedUserStr = localStorage.getItem('ecolink_cached_user');
        let alreadyLoggedIn = false;
        if (cachedUserStr) {
          try {
            const cached = JSON.parse(cachedUserStr);
            if (cached && cached.id === session.user.id && cached.role === 'user') {
              alreadyLoggedIn = true;
            }
          } catch {
            // ignore
          }
        }

        try {
          const profile = await api.getUser(session.user.id);
          if (profile) {
            handleLogin(profile, alreadyLoggedIn);
          } else {
            const defaultName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '에코멤버';
            const newUser: User = {
              id: session.user.id,
              name: defaultName,
              role: 'user',
              created_at: new Date().toISOString()
            };
            await api.upsertUser(newUser);
            handleLogin(newUser, alreadyLoggedIn);
          }
        } catch (err) {
          console.error("Auth change handling failed:", err);
          setIsAuthModalOpen(false);
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

  // Fetch items & rentals whenever user context or configuration changes
  useEffect(() => {
    loadData();
  }, [currentUser, isConfiguredSupabase]);

  const loadData = async () => {
    try {
      const fetchedItems = await api.getItems();
      setItems(fetchedItems);

      if (currentUser && currentUser.role !== 'guest') {
        const fetchedRentals = await api.getRentals(currentUser.id);
        setRentals(fetchedRentals);
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

  const handleRentItem = async (item: Item) => {
    if (!currentUser || currentUser.role === 'guest') {
      setIsAuthModalOpen(true);
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
    } catch (err) {
      console.error('Failed to rent item', err);
      showToast('대여 신청 중 오류가 발생했습니다.', 'info');
    }
  };

  const handleConfigChange = () => {
    const config = getSupabaseConfig();
    const hasEnvConfig = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    setIsConfiguredSupabase(hasEnvConfig || (config.isEnabled && !!config.url));
    setKakaoAppKey(getKakaoAppKey());
    loadData();
    showToast(
      (hasEnvConfig || config.isEnabled)
        ? '⚡ Supabase 및 카카오맵 설정이 저장되었습니다.' 
        : '🏡 로컬 시뮬레이션 모드로 전환되었습니다.'
    );
  };

  const hubNamesMap = INITIAL_HUBS.reduce((acc, hub) => {
    acc[hub.id] = hub.name;
    return acc;
  }, {} as Record<string, string>);

  const co2Reduced = items.filter(i => i.status === 'rented').length * 1.8 + (rentals.filter(r => r.status === 'returned').length * 2.4);
  const totalRentCount = rentals.length + 14;

  // ⚡ 핵심 수정 분기: 구글 로그인이 완료되어 유저 역할이 'user'가 되면 로그인 화면 수막을 조건 없이 강제 철거합니다.
  const shouldShowAuthGate = !currentUser || (currentUser.role !== 'user' && currentUser.role !== 'admin' && isAuthModalOpen);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* 1. Left Fixed Sidebar Layout (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-6 h-full justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0f766e] rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
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
              <span className="text-[9px] font-mono text-teal-600 bg-teal-50 px-1 py-0.5 rounded">C2C</span>
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
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100">
          {currentUser && currentUser.role !== 'guest' ? (
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-[10px] opacity-60 mb-1 font-semibold">에코멤버</p>
              <p className="font-bold mb-3 text-xs truncate">{currentUser.name} 님</p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-teal-400 font-bold">매너 온도 42°C</span>
                <span className="opacity-60">LV.3</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2">
                <div className="w-[42%] bg-teal-400 h-full rounded-full"></div>
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
            <div className="w-8 h-8 bg-[#0f766e] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-black text-slate-900">에코링크</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">햇살동 생활 밀착형 자원 연대</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isConfiguredSupabase
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConfiguredSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="hidden sm:inline">환경설정</span>
              <span className="sm:hidden">설정</span>
            </button>

            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs" title={`${currentUser.name} 님`}>
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
          
          {/* Active Tab Router */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              <MapSection 
                selectedHubId={selectedHubId} 
                onSelectHub={setSelectedHubId} 
                kakaoAppKey={kakaoAppKey}
              />

              <BrowseFeed 
                items={items} 
                currentUser={currentUser} 
                selectedHubId={selectedHubId} 
                onRent={handleRentItem} 
                onShowAuthModal={() => setIsAuthModalOpen(true)}
                hubNamesMap={hubNamesMap}
              />
            </div>
          )}

          {activeTab === 'consignment' && (
            <ConsignmentForm 
              currentUser={currentUser} 
              onSuccess={() => {
                loadData();
                setActiveTab('browse');
              }} 
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

          {activeTab === 'browse' && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden mt-2">
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-teal-400 tracking-wider uppercase mb-1">햇살동 에코 시너지 리포트</h3>
                  <p className="text-xs text-slate-300">공유 자원을 함께 쓰는 동네 연대 행동이 지구를 살립니다.</p>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="text-left">
                    <p className="text-[10px] text-slate-400">CO2 절감 기여량</p>
                    <p className="text-lg font-black font-mono text-white">{co2Reduced.toFixed(1)} kg</p>
                  </div>
                  <div className="text-left border-l border-white/10 pl-6">
                    <p className="text-[10px] text-slate-400">누적 자원 순환</p>
                    <p className="text-lg font-black font-mono text-white">{totalRentCount}회</p>
                  </div>
                  <div className="text-left border-l border-white/10 pl-6">
                    <p className="text-[10px] text-slate-400">대여 가능 물건</p>
                    <p className="text-lg font-black font-mono text-white">{items.filter(i => i.status === 'available').length}개</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-200/50 mt-12 shrink-0">
            <p className="font-semibold text-slate-500">🌿 에코링크 (EcoLink) 친환경 동네 연대</p>
            <p className="mt-1 leading-relaxed max-w-md mx-auto text-[11px]">
              "필요한 시간만큼 빌려 쓰는 합리적인 소비 생활, 햇살동에서 시작됩니다."
            </p>
            <p className="mt-3 font-mono text-[9px]">
              © {new Date().getFullYear()} EcoLink. Built with React & Supabase.
            </p>
          </footer>
        </section>
      </main>

      {/* 3. Mobile Navigation Bottom Bar (Fixed) */}
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
              setActiveTab('transactions');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition relative ${
            activeTab === 'transactions' ? 'text-teal-700 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icons.History size={18} />
          <span className="text-[10px]">거래내역</span>
          {rentals.filter(r => r.status === 'pending_deposit' || r.status === 'active').length > 0 && (
            <span className="absolute -top-1 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
          )}
        </button>
      </nav>

      {/* Floating toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-fadeIn">
          <div className="px-5 py-3.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border bg-slate-900 border-slate-800 text-white">
            <Icons.Check size={14} className="text-teal-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Developer Settings Config Modal overlay */}
      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          onConfigChanged={handleConfigChange} 
        />
      )}

      {/* 🔐 수정된 차단벽: 정상 회원이 연동되면 무조건 문을 열어줍니다. */}
      {shouldShowAuthGate && (
        <AuthGate 
          onLogin={handleLogin} 
          onContinueAsGuest={handleContinueAsGuest} 
        />
      )}

    </div>
  );
}
