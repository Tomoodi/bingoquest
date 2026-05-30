"use client";

import React, { useState } from "react";

export default function BingoPlayPage() {
  // 🗺️ 各マスの「開いている（true） / 閉じている（false）」だけを管理するシンプルな状態
  const [openedCells, setOpenedCells] = useState<{ [key: number]: boolean }>({});
  
  // 課目名（モックデータ）
  const className = "";

  // 📝 事前にユーザーが入力した24マスの単語データ
  const myBingoData: { [key: number]: string } = {
    1: "三平方の定理 (a²+b²=c²)",
    2: "因数分解の公式",
    3: "解の公式のルートの中身",
    4: "教科書45ページの例題1",
    5: "二次関数のグラフの頂点",
    6: "相似比（1:2など）の計算",
    7: "三角比（sin/cos/tan）",
    8: "計算ミスしやすい符号の罠",
    9: "証明問題の「よって〜」",
    10: "平行線と錯角の性質",
    11: "連立方程式の文章題",
    12: "判別式 D > 0 の条件",
    14: "前回の宿題の答え合わせ",
    15: "新単語「分散・標準偏差」",
    16: "教科書のチャレンジ問題",
    17: "授業最後の振り返り問題",
    18: "先生の「ここテストに出る」",
    19: "黒板に赤チョークで二重線",
    20: "黒板の右端に小さく計算メモ",
    21: "先生が「えーっと」と言う",
    22: "先生の「ここまで大丈夫？」",
    23: "デカい木製三角定規が登場",
    24: "出席番号の下1桁で当てられる",
    25: "チャイムと同時に板書終了",
  };

  // 🖱️ タップでフラグを反転させるだけの純粋なトグル関数
  const handleCellClick = (id: number) => {
    if (id === 13) return; // FREEマスは操作無効
    
    setOpenedCells((prev) => ({
      ...prev,
      [id]: !prev[id], // true ⇄ false を切り替える
    }));
  };

  // 1〜25のインデックス配列
  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);

  // 📈 開いたマスの合計数（FREEを除く）
  const openedCount = gridCells.filter(
    (id) => id !== 13 && openedCells[id] === true
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans selection:bg-emerald-500/20">
      
      {/* 📋 上部ヘッダー：現在の開いた数だけをスタイリッシュに表示 */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800 p-4 sticky top-0 z-10 backdrop-blur flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-base font-black text-slate-100 tracking-wide">
            {className} ビンゴカード
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5">
            授業中にキーワードが出たらタップ！
          </p>
        </div>
        
        {/* 開封カウンター */}
        <div className="text-right font-mono">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-widest">Opened</span>
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {openedCount}
            </span>
            <span className="text-xs text-slate-600"> / 24</span>
          </div>
        </div>
      </div>

      {/* 🎮 メイン：ビンゴグリッドエリア */}
      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-center space-y-4">
        
        {/* 5x5 グリッド（スマホ画面いっぱいに広がるので非常に押しやすい） */}
        <div className="grid grid-cols-5 gap-2 w-full aspect-square">
          {gridCells.map((id) => {
            // 中央は固定のFREEマス
            if (id === 13) {
              return (
                <div
                  key={id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center text-center aspect-square select-none"
                >
                  <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase">
                    FREE
                  </span>
                </div>
              );
            }

            const isOpened = !!openedCells[id];

            return (
              <button
                key={id}
                onClick={() => handleCellClick(id)}
                className={`
                  relative rounded-xl border p-1 text-center flex flex-col items-center justify-center aspect-square transition-all duration-150 select-none outline-none active:scale-95 group
                  ${isOpened 
                    // 🟢 開封済み：勉強への集中を邪魔しない、かつ視認性の高いエメラルド
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-950/40 to-slate-900 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold" 
                    // ⚪ 未開封：背景に馴染むダークグレー
                    : "border-slate-800/80 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }
                `}
              >
                {/* マス目のインデックス番号 */}
                <span className={`absolute top-1 left-1.5 font-mono text-[8px] ${isOpened ? "text-emerald-500/60" : "text-slate-700"}`}>
                  {id > 13 ? id - 1 : id}
                </span>

                {/* 登録されたテキスト */}
                <span className="text-[9px] leading-tight font-bold tracking-tight break-all px-0.5">
                  {myBingoData[id]}
                </span>

                {/* 右下の達成チェックマーク */}
                {isOpened && (
                  <span className="absolute bottom-1 right-1.5 text-[8px] text-emerald-400 font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* 🔢 フッター：シンプルにシステム情報を出すだけ */}
      <div className="w-full bg-slate-900/40 border-t border-slate-900/80 p-3 text-center text-[9px] font-mono text-slate-600">
        BINGO MODE // NO REFRESH REQUIRED
      </div>

    </div>
  );
}