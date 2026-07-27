import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../supabaseClient';
import { Icons } from './Icons';

interface AttendanceSectionProps {
  currentUser: User | null;
  onShowAuthModal: () => void;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  currentUser,
  onShowAuthModal,
}) => {
  const [isCheckedToday, setIsCheckedToday] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'guest') {
      fetchAttendanceStatus();
    }
  }, [currentUser]);

  const fetchAttendanceStatus = async () => {
    try {
      const supabase = (api as any).supabase;
      if (!supabase || !currentUser) return;

      const { data, error } = await supabase
        .from('user_attendances')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (data) {
        setStreakCount(data.streak_count || 0);
        setTotalCount(data.total_check_count || 0);

        const todayStr = new Date().toISOString().split('T')[0];
        if (data.last_check_date === todayStr) {
          setIsCheckedToday(true);
        }
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser || currentUser.role === 'guest') {
      onShowAuthModal();
      return;
    }

    if (isCheckedToday) {
      alert('오늘 이미 출석체크를 완료하셨습니다!');
      return;
    }

    setLoading(true);
    try {
      const supabase = (api as any).supabase;
      if (!supabase) {
        alert('Supabase 클라이언트가 연결되지 않았습니다. 환경설정을 확인해주세요.');
        setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 기존 출석 정보 조회
      const { data: existing } = await supabase
        .from('user_attendances')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      let newStreak = 1;
      if (existing && existing.last_check_date) {
        if (existing.last_check_date === yesterdayStr) {
          newStreak = (existing.streak_count || 0) + 1;
        } else if (existing.last_check_date === todayStr) {
          setIsCheckedToday(true);
          alert('오늘 이미 출석체크를 완료하셨습니다!');
          setLoading(false);
          return;
        }
      }

      const newTotal = (existing?.total_check_count || 0) + 1;

      // 1. 출석 테이블 저장
      const { error: attError } = await supabase.from('user_attendances').upsert({
        user_id: currentUser.id,
        last_check_date: todayStr,
        streak_count: newStreak,
        total_check_count: newTotal,
        updated_at: new Date().toISOString(),
      });

      if (attError) throw attError;

      // 2. ECO 점수 지급 (기본 +10점)
      let earnedEco = 10;
      if (newStreak > 0 && newStreak % 7 === 0) {
        earnedEco += 20; // 7일 연속 보너스
      }

      const { data: ecoData } = await supabase
        .from('user_ecos')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const currentScore = ecoData?.eco_score || 120;
      const updatedScore = currentScore + earnedEco;

      await supabase.from('user_ecos').upsert({
        user_id: currentUser.id,
        eco_score: updatedScore,
        updated_at: new Date().toISOString(),
      });

      setIsCheckedToday(true);
      setStreakCount(newStreak);
      setTotalCount(newTotal);

      alert(`🎉 출석체크 완료! ECO +${earnedEco}점이 적립되었습니다. (연속 ${newStreak}일째)`);
    } catch (err: any) {
      console.error('Check-in execution error:', err);
      alert(`출석체크 중 오류가 발생했습니다: ${err?.message || '테이블 생성 여부를 확인해주세요.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-teal-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-300 rounded-2xl">
            <Icons.Check size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold">🌿 에코 출석체크 & 연속 기여</h2>
            <p className="text-xs text-slate-300">매일 출석하고 ECO 점수를 모아 다양한 혜택을 받아보세요.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-teal-400 font-bold block">연속 출석</span>
          <span className="text-lg font-black font-mono text-white">{streakCount}일째</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 pt-2">
        {['월', '화', '수', '목', '금', '토', '일'].map((day, idx) => {
          const isDone = idx < (streakCount % 7 || (streakCount > 0 ? 7 : 0));
          return (
            <div
              key={day}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                isDone
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <span>{day}</span>
              <span className="text-sm mt-1">{isDone ? '🌿' : '○'}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-300">
          <p>누적 출석: <strong className="text-white">{totalCount}회</strong></p>
          <p className="text-[10px] text-teal-300 mt-0.5">✨ 7일 연속 출석 시 보너스 ECO +20점 지급!</p>
        </div>

        <button
          onClick={handleCheckIn}
          disabled={loading || isCheckedToday}
          className={`px-6 py-3.5 rounded-2xl font-bold text-xs transition cursor-pointer shadow-lg ${
            isCheckedToday
              ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/30 cursor-not-allowed'
              : 'bg-teal-400 hover:bg-teal-300 text-slate-950 font-black'
          }`}
        >
          {loading ? '처리 중...' : isCheckedToday ? '✔ 오늘의 출석 완료!' : '🎁 오늘 출석하고 ECO 받기'}
        </button>
      </div>
    </div>
  );
};
