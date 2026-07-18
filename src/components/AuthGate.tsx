import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Icons } from './Icons';
import { api, getSupabaseClient } from '../supabaseClient';

interface AuthGateProps {
  onLogin: (user: User) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = 'signin' | 'signup';

export const AuthGate: React.FC<AuthGateProps> = ({ onLogin, onContinueAsGuest }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<UserRole>('user');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Status states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      setIsSupabaseActive(true);
    } else {
      setIsSupabaseActive(false);
    }
  }, []);

  // Handle Supabase Email/Password Auth
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase 서비스가 활성화되지 않았습니다. 우측 상단의 개발자 설정을 통해 Supabase 설정을 완료해주세요.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!name.trim()) {
          setError('회원가입을 위해 이름을 입력해주세요.');
          setLoading(false);
          return;
        }

        // 1. Supabase Auth Sign Up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (signUpError) throw signUpError;
        if (!authData.user) {
          throw new Error('회원가입 처리 중 알 수 없는 오류가 발생했습니다.');
        }

        // 2. Create profile row in user database
        const newUser: User = {
          id: authData.user.id,
          name: name.trim(),
          phone: phone.trim() || undefined,
          role: role,
          created_at: new Date().toISOString()
        };

        await api.upsertUser(newUser);
        onLogin(newUser);
      } else {
        // Sign In Mode
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) throw signInError;
        if (!authData.user) {
          throw new Error('로그인 처리 중 사용자 정보를 찾을 수 없습니다.');
        }

        // Fetch custom user metadata/profile from DB
        const userProfile = await api.getUser(authData.user.id);
        
        if (userProfile) {
          onLogin(userProfile);
        } else {
          // Fallback if profile row doesn't exist yet, create one
          const fallbackUser: User = {
            id: authData.user.id,
            name: email.split('@')[0], // default to email prefix
            role: 'user',
            created_at: new Date().toISOString()
          };
          await api.upsertUser(fallbackUser);
          onLogin(fallbackUser);
        }
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setError(err.message || '인증 과정에서 오류가 발생했습니다. 입력을 다시 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login Action
  const handleGoogleLogin = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase 서비스가 활성화되어 있지 않습니다. 우측 상단의 개발자 설정을 완료해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error('Google Login Error:', err);
      setError(err.message || '구글 로그인 요청 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header Card */}
        <div className="bg-[#0f766e] text-white p-6 text-center relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="inline-flex p-2.5 bg-white/10 rounded-2xl mb-3 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-teal-200">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="text-lg font-bold tracking-tight">에코링크 (EcoLink)</h1>
          <p className="text-teal-100/90 text-xs mt-1 font-semibold">
            필요한 시간만큼 빌려 쓰는 친환경 동네 거점 대여 플랫폼
          </p>
        </div>

        {/* Dynamic Body Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {!isSupabaseActive && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-850 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <Icons.AlertTriangle size={14} className="shrink-0" />
                <span>동네 대여 거점 연동 필요</span>
              </div>
              <p className="text-[11px] text-amber-800">
                우측 상단의 <strong>환경설정</strong>을 눌러 필요한 대여 거점 및 연동 정보를 등록해주세요.
              </p>
            </div>
          )}

          {/* ================= EMAIL AUTH FORM ================= */}
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
            {/* Sign In vs Sign Up Toggle Tab */}
            <div className="flex justify-center gap-4 text-xs font-bold border-b border-slate-100 pb-2.5 mb-2">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setError(''); }}
                className={`pb-1 px-1 transition ${authMode === 'signin' ? 'text-[#0f766e] border-b-2 border-[#0f766e]' : 'text-slate-400'}`}
              >
                기존 회원 로그인
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); }}
                className={`pb-1 px-1 transition ${authMode === 'signup' ? 'text-[#0f766e] border-b-2 border-[#0f766e]' : 'text-slate-400'}`}
              >
                신규 회원가입
              </button>
            </div>

            {/* Inputs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">이메일 주소</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@ecolink.com"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자리 이상 비밀번호"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
              />
            </div>

            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">연락처 (선택)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-rose-500 text-[11px] leading-relaxed flex items-start gap-1.5 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
                <Icons.AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0f766e] hover:bg-[#0d645d] text-white font-bold rounded-xl text-xs transition shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icons.RefreshCw size={13} className="animate-spin" />
              ) : null}
              {authMode === 'signup' ? '에코멤버 무료 가입하기' : '로그인'}
            </button>

            {/* Google OAuth Login Option */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-wider">또는 간편인증</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {/* Simplified SVG Google Icon */}
              <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.41-.63-.71-1.34-.84-2.1c-.01-.13-.01-.26-.01-.39s0-.26.01-.39z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google 계정으로 로그인
            </button>
          </form>

          {/* Guest Action */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold hover:underline cursor-pointer transition"
            >
              👀 비회원 게스트로 먼저 둘러보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
