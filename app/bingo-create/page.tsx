"use client";

import React, { useState } from "react";

export default function BingoCreatePage() {
  const [inputs, setInputs] = useState<{ [key: number]: string }>({});

  // 教科書内容をメインに、遊び要素を数マスだけに絞ったプレースホルダー
  const placeholders: { [key: number]: string } = {
    // 【1〜12マス：完全ガチの教科書・文法予習】
    1: "例: 不定詞 (to + 動詞)",
    2: "例: 過去分詞 (takenなど)",
    3: "例: 関係代名詞のwho",
    4: "例: 熟語 look forward to",
    5: "例: 教科書25ページの長文",
    6: "例: 対話文の音読練習",
    7: "例: 新単語のアクセント",
    8: "例: 重要な英文の日本語訳",
    9: "例: 助動詞 (must / should)",
    10: "例: 比較級 (more ~ than)",
    11: "例: 接続詞 (because / if)",
    12: "例: 受動態 (be動詞 + 過去分詞)",

    // 【14〜20マス：さらに教科書内容を追い打ち】
    14: "例: 本文に出てくる重要名詞",
    15: "例: 不規則変化する動詞",
    16: "例: 熟語 be interested in",
    17: "例: 疑問詞で始まる質問",
    18: "例: 前置詞 (at / on / in)",
    19: "例: 教科書の太字の単語",
    20: "例: 授業のまとめの英作文",

    // 【21〜25マス：先生の行動・口癖（遊び枠）】
    21: "例: 先生の「ここテストに出る」",
    22: "例: 先生が「Repeat after me」",
    23: "例: 先生の「えーっと」が3回",
    24: "例: 黒板の黄色チョークの波線",
    25: "例: 出席番号で当てられる",
  };

  const handleInputChange = (id: number, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);

  const filledCount = gridCells.filter(
    (id) => id !== 13 && inputs[id] && inputs[id].trim() !== ""
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans">
      
      {/* ヘッダーエリア */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST PREPARATION</h1>
            <p className="text-xs text-slate-400 mt-0.5">次授業の予想を24個入力しよう！</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm font-black text-amber-400">{filledCount}</span>
            <span className="font-mono text-xs text-slate-600"> / 24</span>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">READY</div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-between space-y-6">
        
        {/* ヒントメッセージ（教科書推しに文言も変更！） */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed">
          <span className="text-purple-400 font-bold">🎯 予習のコツ：</span>
          次の時間の教科書やノートをパラパラとめくって、新しく出てくる単語や大事そうな文法を見つけてマスを埋めよう！授業中に起きそうな出来事などお楽しみ要素を混ぜてもOK！
        </div>

        {/* 5x5 入力グリッド */}
        <div className="grid grid-cols-5 gap-2 w-full aspect-square">
          {gridCells.map((id) => {
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
                <span className="absolute top-1 left-1.5 font-mono text-[9px] text-slate-600 select-none">
                  {id > 13 ? id - 1 : id}
                </span>

                <textarea
                  maxLength={30}
                  placeholder={placeholders[id]}
                  value={inputs[id] || ""}
                  onChange={(e) => handleInputChange(id, e.target.value)}
                  className="w-full h-full pt-3 px-0.5 bg-transparent text-center text-[9px] font-bold text-slate-200 placeholder-slate-700/60 resize-none border-none outline-none focus:ring-0 leading-tight"
                />
              </div>
            );
          })}
        </div>

        {/* ボタン */}
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
            onClick={() => alert("教科書ベースのビンゴカードが完成しました！")}
          >
            {filledCount === 24 ? "ビンゴカードを完成させる！" : "すべてのマスを入力してね"}
          </button>
        </div>

      </div>
    </div>
  );
}