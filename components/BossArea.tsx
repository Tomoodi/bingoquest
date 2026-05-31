'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

type BossState = {
  id: string;
  class_id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  total_damage: number; // 総ダメージ
  image_url: string | null; // ボス通常画像
  overkill_image_url: string | null; // ボス第2形態画像（オーバーキルモード用）
  created_at: string;
  updated_at: string;
};

// ダメージのポップアップ文字を管理するための型
type DamagePopup = {
  id: string;
  amount: number;
  xOffset: number; // 左右に少しバラけさせるための値
};

export default function BossArea({
  classId,
  attackEvent
}: {
  classId: string,
  attackEvent: { amount: number; time: number } | null
}) {
  const [boss, setBoss] = useState<BossState | null>(null);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);

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
          setBoss(payload.new as BossState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  // 親から「ダメージを受けたよ！」と教えられたら、即座にアニメーションを発動する
  useEffect(() => {
    if (attackEvent && attackEvent.amount > 0) {
      setTimeout(() => {
        // ダメージポップアップの生成
        const newPopup = {
          id: `${Date.now()}-${Math.random()}`,
          amount: attackEvent.amount,
          xOffset: (Math.random() - 0.5) * 80,
        };
        
        setDamagePopups((prev) => [...prev, newPopup]);

        setTimeout(() => {
          setDamagePopups((prev) => prev.filter(popup => popup.id !== newPopup.id));
        }, 1000);
      }, 0);
    }
  }, [attackEvent]);

  if (!boss) return <div className="text-center p-4 text-white">ボス出現中...</div>;

  // オーバーキルモード（第2形態）の判定
  const isOverkill = boss.current_hp <= 0;

  // HPの割合を計算（0未満にならないようにMath.maxを使用）
  const hpPercentage = Math.max(0, (boss.current_hp / boss.max_hp) * 100);

  // 現在の状態に応じて表示する画像URLを決定
  const currentImageUrl = isOverkill ? boss.overkill_image_url : boss.image_url;

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

      {/* ボスアイコンとポップアップの親コンテナ */}
      <div className="relative flex justify-center mb-8">
        {/* ボスの画像（点滅アニメーション） */}
        <motion.div
          // attackEventの時間をKeyにする（時間が変わるたびに発動）
          key={attackEvent?.time || 0} 
          // 揺れ(x,y)は無し。filterを使って「通常 → 真っ白 → 通常 → 真っ白 → 通常」を表現
          animate={attackEvent && attackEvent.amount > 0 ? {
            filter: [
              "brightness(1) contrast(1)",
              "brightness(20) contrast(0)", // 真っ白（白塗り）
              "brightness(1) contrast(1)",
              "brightness(20) contrast(0)", // 真っ白（白塗り）
              "brightness(1) contrast(1)",
            ]
          } : {}}
          transition={{ duration: 0.4, ease: "easeInOut"}}
          className={`w-32 h-32 rounded-lg flex items-center justify-center text-6xl transition-colors duration-1000 relative z-0 ${
            currentImageUrl 
              ? 'drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]' 
              : (isOverkill ? 'bg-fuchsia-900 shadow-[0_0_30px_rgba(232,121,249,0.8)]' : 'bg-purple-600 shadow-lg')
          }`}
        >
          {/* URLがあれば<Image>で画像を表示し、無ければ絵文字を表示 */}
          {currentImageUrl ? (
            <Image 
              src={currentImageUrl} 
              alt={boss.name} 
              fill
              className="object-contain drop-shadow-2xl" 
            />
          ) : (
            isOverkill ? '👿' : '👾'
          )}
        </motion.div>

        {/* フワッと浮かび上がって消えるダメージ数値 */}
        <AnimatePresence>
          {damagePopups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, x: p.xOffset, scale: 0.5 }}
              animate={{ opacity: 0, y: -60, scale: 1.5 }} // 真上に60px飛びながら消える
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              // z-10をつけてボスの画像より前面に出す。フォントスタイルをRPG風に強化。
              className="absolute top-0 text-red-500 font-black text-5xl drop-shadow-[0_4px_4px_rgba(0,0,0,1)] z-10 pointer-events-none"
              style={{
                WebkitTextStroke: '1px white', // 文字の縁取り（RPGのダメージっぽい表現）
              }}
            >
              -{p.amount}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
