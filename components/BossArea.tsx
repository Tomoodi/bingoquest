'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

type BossState = {
  id: string;
  class_id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  total_damage: number; // 総ダメージ
  created_at: string;
  updated_at: string;
};

export default function BossArea({ classId }: { classId: string }) {
  const [boss, setBoss] = useState<BossState | null>(null);
  const [isHit, setIsHit] = useState(false);

  useEffect(() => {
    // 1. 初期のボスデータを取得
    async function fetchInitialBoss() {
      const { data } = await supabase
        .from('boss_states')
        .select('*')
        .eq('class_id', classId)
        .single();
      if (data) setBoss(data);
    }
    fetchInitialBoss();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;

    // 2. Supabase RealtimeでDBの更新を監視
    const channel = supabase
      .channel(`boss-updates-${classId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boss_states', filter: `class_id=eq.${classId}` },
        (payload) => {
          const nextBoss = payload.new as BossState;
          const previousBoss = payload.old as BossState;

          setBoss(nextBoss);
          
          // HPの減少ではなく「総ダメージが増えた時」にダメージ演出を出す
          if (nextBoss.total_damage > previousBoss.total_damage) {
            setIsHit(true);
            setTimeout(() => setIsHit(false), 300);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  if (!boss) return <div className="text-center p-4 text-white">ボス出現中...</div>;

  // オーバーキルモード（第2形態）の判定
  const isOverkill = boss.current_hp <= 0;

  // HPの割合を計算（0未満にならないようにMath.maxを使用）
  const hpPercentage = Math.max(0, (boss.current_hp / boss.max_hp) * 100);

  return (
    <div className={`w-full max-w-lg mx-auto p-6 rounded-xl shadow-2xl text-white transition-colors duration-1000 ${
      isOverkill ? 'bg-purple-950 border border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-slate-800'
    }`}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">
          {isOverkill ? `${boss.name} (第2形態)` : boss.name}
        </h2>
        
        {/* 状態に応じたテキスト表示の切り替え */}
        {isOverkill ? (
          <div className="text-2xl font-mono text-fuchsia-400 font-bold drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]">
            💥 総ダメージ: {boss.total_damage}
            <span className="block text-xs mt-1 text-purple-300 animate-pulse tracking-widest">
              OVERKILL BONUS TIME!
            </span>
          </div>
        ) : (
          <p className="text-xl font-mono">
            HP: {boss.current_hp} / {boss.max_hp}
          </p>
        )}
      </div>

      {/* ボスのキャラクター（今回は絵文字を配置） */}
      <motion.div
        // ダメージを受けた時(isHit=true)だけ、左右に揺れて明るくなるアニメーション
        animate={isHit ? { x: [-10, 10, -10, 10, 0], filter: "brightness(1.5)" } : {}}
        transition={{ duration: 0.3 }}
        className={`w-32 h-32 mx-auto rounded-lg shadow-lg mb-8 flex items-center justify-center text-6xl transition-colors duration-1000 ${
          isOverkill ? 'bg-fuchsia-900 shadow-[0_0_20px_rgba(232,121,249,0.5)]' : 'bg-purple-600'
        }`}
      >
        {isOverkill ? '👿' : '👾'}
      </motion.div>

      {/* HPバーの外枠 (オーバーキル時は非表示にする) */}
      {!isOverkill && (
        <div className="w-full h-8 bg-slate-700 rounded-full overflow-hidden border-2 border-slate-600 relative">
          {/* Framer Motionを使った滑らかなHPバー */}
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 to-red-400"
            initial={{ width: `${hpPercentage}%` }} // 初期状態
            animate={{ width: `${hpPercentage}%` }} // 更新後の状態
            transition={{ type: "spring", bounce: 0.2, duration: 0.8 }} // バネのような滑らかな動き
          />
        </div>
      )}
    </div>
  );
}
