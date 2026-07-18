import React, { useState, useEffect } from 'react';
import { SupabaseConfig } from '../types';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseClient, getKakaoAppKey, saveKakaoAppKey } from '../supabaseClient';
import { Icons } from './Icons';

interface SettingsModalProps {
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onConfigChanged }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [kakaoKey, setKakaoKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const config = getSupabaseConfig();
    setUrl(config.url || '');
    setAnonKey(config.anonKey || '');
    setIsEnabled(config.isEnabled || false);
    setKakaoKey(getKakaoAppKey());
  }, []);

  const handleSave = () => {
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isEnabled
    };
    saveSupabaseConfig(newConfig);
    saveKakaoAppKey(kakaoKey.trim());
    onConfigChanged();
    onClose();
  };

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestStatus('error');
      setErrorMessage('Supabase URL과 Anon Key를 모두 입력해주세요.');
      return;
    }

    setTestStatus('testing');
    setErrorMessage('');

    // Temporary config for testing
    const tempConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isEnabled: true
    };
    
    // Backup current and save temporarily
    const backup = getSupabaseConfig();
    saveSupabaseConfig(tempConfig);
    
    // Clear instance to force recreation with test keys
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const client = getSupabaseClient();
    
    if (!client) {
      setTestStatus('error');
      setErrorMessage('클라이언트 생성에 실패했습니다. 올바른 URL 형식인지 확인해주세요.');
      saveSupabaseConfig(backup);
      return;
    }

    try {
      // Test select items
      const { error } = await client.from('items').select('id').limit(1);
      
      if (error) {
        throw error;
      }
      
      setTestStatus('success');
    } catch (err: any) {
      console.error('Supabase test connection failed', err);
      setTestStatus('error');
      setErrorMessage(err.message || '인증 오류가 발생했습니다. 키값을 다시 확인해주세요.');
    } finally {
      // Restore previous config unless saved later
      saveSupabaseConfig(backup);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Icons.Settings size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">에코링크 개발자 및 Supabase 설정</h2>
              <p className="text-[11px] text-slate-500">실시간 클라우드 DB 연동 및 하이브리드 모드 제어</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Indicator */}
          <div className="p-4 rounded-2xl border flex items-start gap-3 bg-teal-50/40 border-teal-200">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0f766e] mt-0.5">
              <Icons.Info size={16} />
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-bold text-teal-900 flex items-center gap-1.5">
                <span>하이브리드 어댑터 작동 방식</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#0f766e] text-[10px] text-white font-bold">오프라인 우선</span>
              </div>
              <p className="leading-relaxed">
                Supabase URL 및 API Key를 입력하고 연동을 활성화하면 데이터베이스에 실시간으로 동기화됩니다. 키가 제공되지 않거나 비활성화 시 브라우저 내 <strong>LocalStorage</strong> 기반 로컬 시뮬레이션으로 중단 없이 정상 작동합니다.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Supabase 클라우드 연동 활성화</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">실시간 DB 데이터 업로드를 지원합니다.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isEnabled} 
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0f766e]"></div>
            </label>
          </div>

          {/* Form Fields */}
          <div className={`space-y-4 transition ${isEnabled ? 'opacity-100' : 'opacity-60 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Supabase Project URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Supabase Anon Key (API Key)</label>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:border-teal-500 hover:border-slate-300 transition resize-none"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Icons.RefreshCw size={13} className={testStatus === 'testing' ? 'animate-spin' : ''} />
                연동 상태 테스트하기
              </button>

              {testStatus === 'testing' && (
                <span className="text-[11px] text-slate-500 font-medium animate-pulse">연동 유효성을 검증 중...</span>
              )}
              {testStatus === 'success' && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  🟢 연결 성공! (items 테이블 감지 완료)
                </span>
              )}
              {testStatus === 'error' && (
                <span className="text-[11px] text-rose-500 font-bold">🔴 테스트 실패: 확인 필요</span>
              )}
            </div>

            {testStatus === 'error' && errorMessage && (
              <p className="text-[11px] text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Kakao Maps Settings Area */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Icons.MapPin size={14} className="text-teal-700" />
                카카오맵 API 설정
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                지도에 실시간으로 내 위치와 대여소 위치를 정확하게 로드합니다.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">카카오맵 Javascript APP KEY</label>
              <input
                type="text"
                value={kakaoKey}
                onChange={(e) => setKakaoKey(e.target.value)}
                placeholder="카카오 개발자 콘솔에서 발급받은 Javascript 키"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-500 hover:border-slate-300 transition"
              />
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                * 키가 없거나 입력되지 않은 경우, 햇살동 맞춤형 <strong>가상 시뮬레이션 지도</strong>로 대체되어 중단 없이 완벽하게 작동합니다.
              </p>
            </div>
          </div>

          {/* Setup Instructions Helper */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800">💡 초스피드 테이블 빌드용 SQL 쿼리</h4>
            <p className="leading-normal">
              Supabase SQL Editor에 PRD Part 2의 테이블 스크립트(<code className="font-mono bg-slate-200 px-1 rounded">users</code>, <code className="font-mono bg-slate-200 px-1 rounded">items</code>, <code className="font-mono bg-slate-200 px-1 rounded">rentals</code>)를 복사해 붙여넣어 실행하신 후 연결해주세요.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-md cursor-pointer"
          >
            저장 및 활성화
          </button>
        </div>
      </div>
    </div>
  );
};
