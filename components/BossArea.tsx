'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

export default function BossArea({ classId }: { classId: string }) {
  const [boss, setBoss] = useState<any>(null);
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
          setBoss(payload.new);
          
          // ダメージ演出（シェイク）のトリガーをONにして、少し経ったらOFFにする
          if (payload.new.current_hp < payload.old.current_hp) {
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

  // HPの割合を計算（0未満にならないようにMath.maxを使用）
  const hpPercentage = Math.max(0, (boss.current_hp / boss.max_hp) * 100);

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-slate-800 rounded-xl shadow-2xl text-white">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">{boss.name}</h2>
        <p className="text-xl font-mono">
          HP: {boss.current_hp} / {boss.max_hp}
        </p>
      </div>

      {/* ボスのキャラクター（今回は絵文字を配置） */}
      <motion.div
        // ダメージを受けた時(isHit=true)だけ、左右に揺れて明るくなるアニメーション
        animate={isHit ? { x: [-10, 10, -10, 10, 0], filter: "brightness(1.5)" } : {}}
        transition={{ duration: 0.3 }}
        className="w-32 h-32 mx-auto bg-purple-600 rounded-lg shadow-lg mb-8 flex items-center justify-center text-6xl"
      >
        👾
      </motion.div>

      {/* HPバーの外枠 */}
      <div className="w-full h-8 bg-slate-700 rounded-full overflow-hidden border-2 border-slate-600 relative">
        {/* Framer Motionを使った滑らかなHPバー */}
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 to-red-400"
          initial={{ width: `${hpPercentage}%` }} // 初期状態
          animate={{ width: `${hpPercentage}%` }} // 更新後の状態
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }} // バネのような滑らかな動き
        />
      </div>
    </div>
  );
}
