"use client";

import React, { useState } from "react";

export default function BingoCreatePage() {
  // 24マス分の入力テキストを管理するステート（初期値は空っぽ）
  const [inputs, setInputs] = useState<{ [key: number]: string }>({});

  // 入力が変わったときにステートを更新する関数
  const handleInputChange = (id: number, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  // 1〜25のマスを生成（13番はFREE）
  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);

  // すべて入力されたかチェック（13番のFREEを除いた24マス分）
  const filledCount = gridCells.filter(
    (id) => id !== 13 && inputs[id] && inputs[id].trim() !== ""
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans">
      
      {/* 🔮 ヘッダーエリア */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST PREPARATION</h1>
            <p className="text-xs text-slate-400 mt-0.5">授業の出来事を24個、予想して入力しよう！</p>
          </div>
          {/* 進捗インジケーター */}
          <div className="text-right">
            <span className="font-mono text-sm font-black text-amber-400">{filledCount}</span>
            <span className="font-mono text-xs text-slate-600"> / 24</span>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">READY</div>
          </div>
        </div>
      </div>

      {/* 📝 メインコンテンツ：入力グリッド */}
      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-between space-y-6">
        
        {/* ヒントメッセージ */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed">
          <span className="text-amber-400 font-bold">💡 予想のコツ：</span>
          「先生が口にする言葉（例: 徳川家康）」や「起きそうな行動（例: 黒板に図を書く）」など、授業に集中していれば気づけるお題がオススメ！
        </div>

        {/* 5x5 入力グリッド */}
        <div className="grid grid-cols-5 gap-2 w-full aspect-square">
          {gridCells.map((id) => {
            // 真ん中の13番マスは「FREE」として固定表示
            if (id === 13) {
              return (
                <div
                  key={id}
                  className="rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 flex items-center justify-center text-center aspect-square select-none"
                >
                  <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase">
                    FREE
                  </span>
                </div>
              );
            }

            // 通常の入力マス
            return (
              <div
                key={id}
                className={`
                  relative rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-900/20 aspect-square transition-all duration-200
                  ${inputs[id] && inputs[id].trim() !== "" 
                    ? "border-purple-500/60 bg-purple-950/10 shadow-[0_0_8px_rgba(168,85,247,0.1)]" 
                    : "border-slate-800 focus-within:border-slate-700"
                  }
                `}
              >
                {/* マス目番号のラベル */}
                <span className="absolute top-1 left-1.5 font-mono text-[9px] text-slate-600 select-none">
                  {id > 13 ? id - 1 : id}
                </span>

                {/* テキスト入力フォーム */}
                <textarea
                  maxLength={30}
                  placeholder="予想を入力"
                  value={inputs[id] || ""}
                  onChange={(e) => handleInputChange(id, e.target.value)}
                  className="w-full h-full pt-3 px-0.5 bg-transparent text-center text-[10px] font-bold text-slate-200 placeholder-slate-700 resize-none border-none outline-none focus:ring-0 leading-tight"
                />
              </div>
            );
          })}
        </div>

        {/* 🚀 カード生成・クエスト開始ボタン */}
        <div className="pt-2">
          <button
            disabled={filledCount < 24}
            className={`
              w-full font-black py-4 rounded-xl shadow-lg transition-all duration-150 tracking-widest text-sm uppercase active:scale-[0.98]
              ${filledCount === 24
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/20"
                : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none"
              }
            `}
            onClick={() => alert("ビンゴカードを生成しました！DBに保存して本番画面に遷移します。")}
          >
            {filledCount === 24 ? "ビンゴカードを完成させる！" : "すべてのマスを入力してね"}
          </button>
        </div>

      </div>
    </div>
  );
}