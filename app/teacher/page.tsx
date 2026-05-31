"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ClassRoom = {
  id: string;
  code: string;
  grade: string;
  class_section: string;
  name: string;          
  lesson_theme: string;  
  teacher_name: string;  
  teacher_words: string; // 💡 取得用に型を追加
  created_at: string;
};

export default function TeacherCodePage() {
  const [myRooms, setMyRooms] = useState<ClassRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentTeacherName = "山田 太郎"; 

  useEffect(() => {
    async function fetchMyCodes() {
      try {
        const response = await fetch(`/api/classes?teacherName=${encodeURIComponent(currentTeacherName)}`);
        const data = await response.json();
        if (response.ok && data.classes) {
          setMyRooms(data.classes);
        }
      } catch (error) {
        console.error("コードの取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyCodes();
  }, []);

  const latestRoom = myRooms[0];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      {/* ヘッダー */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-400">CODE CENTER</h1>
            <p className="text-xs text-slate-400 mt-0.5">{currentTeacherName} 先生の管理パネル</p>
          </div>
          <Link href="/teacher/create">
            <button className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-800 transition-all">
              ← 新規作成
            </button>
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 space-y-6 flex flex-col justify-center">
        
        {/* 最新のコード */}
        {latestRoom && (
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/60 p-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="bg-amber-950 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-1 rounded-md font-black tracking-widest uppercase">
              LATEST ISSUED CODE
            </span>
            <p className="text-xs text-slate-400 mt-3">
              {latestRoom.grade}{latestRoom.class_section} ｜ <span className="text-purple-400 font-bold">{latestRoom.name}</span> ｜ <span className="text-amber-300">{latestRoom.lesson_theme}</span>
            </p>
            
            <h2 className="text-5xl font-mono font-black text-white tracking-widest my-4">
              {latestRoom.code}
            </h2>

            {/* 💡 登録されたAI用ビンゴワードのプレビュー表示エリアを追加 */}
            <div className="mt-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-left">
              <span className="text-[9px] font-mono text-emerald-400 font-black tracking-wider block mb-1">🎯 BINGO WORDS (PREVIEW)</span>
              <p className="text-[11px] text-slate-400 truncate font-mono">{latestRoom.teacher_words || "未登録"}</p>
            </div>

            <p className="text-[10px] text-amber-500 font-bold tracking-wider mt-4">生徒にこの6桁の数字を伝えてください</p>
          </div>
        )}

        {/* 過去の発行履歴 */}
        <div className="space-y-3 flex-1">
          <h3 className="text-xs font-mono font-bold text-slate-500 tracking-wider uppercase px-1">
            HISTORY ({myRooms.length})
          </h3>

          {isLoading ? (
            <div className="text-center py-6 font-mono text-xs text-slate-600 animate-pulse">LOADING HISTORY...</div>
          ) : myRooms.length <= 1 ? (
            <div className="text-center py-6 text-xs text-slate-600">過去の発行履歴はありません</div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {myRooms.slice(1).map((room) => (
                <div key={room.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-900 bg-slate-900/20 text-xs">
                  <div className="truncate flex-1 mr-2">
                    <p className="font-bold text-slate-300 truncate">
                      <span className="text-purple-400 font-medium">[{room.name}]</span> {room.lesson_theme}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{room.grade} {room.class_section}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      {room.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}