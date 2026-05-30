"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import BossArea from "@/components/BossArea";

// 全12パターンのビンゴライン定数（5x5のマスID配列）
const BINGO_LINES = [
  [1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25], // 横
  [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], [5, 10, 15, 20, 25], // 縦
  [1, 7, 13, 19, 25], [5, 9, 13, 17, 21] // 斜め
];

type BingoQuestSession = {
  student: {
    id: string;
  };
  class: {
    id: string;
    code: string;
    name: string;
  };
  bingoCard?: {
    id: string;
  };
};

type BingoCell = {
  id: string;
  position: number;
  text: string;
  isFree: boolean;
  isOpened: boolean;
  openedAt: string | null;
};

type BingoCardResponse = {
  card: {
    id: string;
    cells: BingoCell[];
  };
};

type BingoCardErrorResponse = {
  error?: {
    message?: string;
  };
};

export default function BingoPlayPage() {
  const [openedCells, setOpenedCells] = useState<{ [key: number]: boolean }>({});
  const [showAnimation, setShowAnimation] = useState(false);
  const [achievedLineIndexes, setAchievedLineIndexes] = useState<number[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("読み込み中...");
  const [roomCode, setRoomCode] = useState<string>("");
  const [bingoCells, setBingoCells] = useState<{ [key: number]: BingoCell }>({});
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [cardErrorMessage, setCardErrorMessage] = useState("");

  // 蓄積された攻撃ポイントを管理するState
  const [accumulatedPoints, setAccumulatedPoints] = useState<number>(0);
  const [isAttacking, setIsAttacking] = useState(false); // 連打防止用

  // ボス撃破時のアニメーション管理用State
  const [showDefeatAnimation, setShowDefeatAnimation] = useState(false);
  const [hasDefeated, setHasDefeated] = useState(false);

  // sessionStorage からコードを取得してクラス情報を読み込む処理 (setTimeoutで非同期化)
  useEffect(() => {
    const initSession = setTimeout(() => {
      const sessionStr = sessionStorage.getItem("bingoQuestSession");

      if (!sessionStr) {
        setClassName("エラー: ログイン情報がありません");
        setCardErrorMessage("ログイン情報がありません。もう一度ログインしてください。");
        setIsLoadingCard(false);
        return;
      }

      try {
        // JSON文字列をオブジェクトに変換
        const sessionData = JSON.parse(sessionStr) as BingoQuestSession;
        // sessionData.class.code に "123456" などのコードが入っている
        const storedCode = sessionData.class.code;
        const storedClassId = sessionData.class.id;
        const storedClassName = sessionData.class.name;
        const storedStudentId = sessionData.student.id;
        const storedCardId = sessionData.bingoCard?.id;

        if (!storedCode || !storedClassId || !storedStudentId) {
          setClassName("エラー: ログイン情報が不完全です");
          setCardErrorMessage("ログイン情報が不完全です。もう一度ログインしてください。");
          setIsLoadingCard(false);
          return;
        }

        setRoomCode(storedCode);
        setClassId(storedClassId);
        setClassName(storedClassName);
        setStudentId(storedStudentId);

        if (!storedCardId) {
          setCardErrorMessage("ビンゴカードがまだ作成されていません。");
          setIsLoadingCard(false);
          return;
        }

        setCardId(storedCardId);
      } catch (error) {
        console.error("セッションデータの解析に失敗しました:", error);
        setClassName("エラー: 不正なデータです");
        setCardErrorMessage("ログイン情報を読み込めませんでした。もう一度ログインしてください。");
        setIsLoadingCard(false);
      }
    }, 0); // 0ミリ秒遅延させることで同期的なsetState判定を回避

    return () => clearTimeout(initSession);
  }, []);

  // ボスの撃破（HPが0になった瞬間）を監視する処理
  useEffect(() => {
    if (!classId || hasDefeated) return;
    
    // Supabase Realtimeでboss_statesテーブルを監視
    const channel = supabase.channel('boss-defeat-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boss_states', filter: `class_id=eq.${classId}` }, (payload) => {
          // 前回はHPが0より大きく、今回0以下になったら発動
          if (payload.new.current_hp <= 0 && payload.old.current_hp > 0 && !hasDefeated) {
            setHasDefeated(true);
            setShowDefeatAnimation(true);
            
            // 4秒後にアニメーションを閉じてオーバーキル状態へ
            setTimeout(() => {
              setShowDefeatAnimation(false);
            }, 4000);
          }
      }).subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [classId, hasDefeated]);

  // ビンゴカードの読み込み
  useEffect(() => {
    if (!classId || !studentId || !cardId) return;

    const fetchBingoCard = async () => {
      setIsLoadingCard(true);
      setCardErrorMessage("");

      try {
        const params = new URLSearchParams({
          cardId,
          classId,
          studentId,
        });
        const response = await fetch(`/api/bingo-cards?${params.toString()}`);
        const data = (await response.json()) as
          | BingoCardResponse
          | BingoCardErrorResponse;

        if (!response.ok) {
          const message =
            "error" in data && data.error?.message
              ? data.error.message
              : "ビンゴカードを読み込めませんでした。";
          setCardErrorMessage(message);
          return;
        }

        const successData = data as BingoCardResponse;
        const cellsById = successData.card.cells.reduce<{
          [key: number]: BingoCell;
        }>((acc, cell) => {
          acc[cell.position + 1] = cell;
          return acc;
        }, {});
        const nextOpenedCells = successData.card.cells.reduce<{
          [key: number]: boolean;
        }>((acc, cell) => {
          acc[cell.position + 1] = cell.isOpened || cell.isFree;
          return acc;
        }, {});

        const currentAchieved = BINGO_LINES.reduce<number[]>((indexes, line, index) => {
          const isComplete = line.every(
            (cellId) => cellId === 13 || !!nextOpenedCells[cellId]
          );
          if (isComplete) {
            indexes.push(index);
          }
          return indexes;
        },
        []
      );

        setBingoCells(cellsById);
        setOpenedCells(nextOpenedCells);
        setAchievedLineIndexes(currentAchieved);
      } catch (error) {
        console.error("ビンゴカードの取得に失敗しました:", error);
        setCardErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
      } finally {
        setIsLoadingCard(false);
      }
    };

    fetchBingoCard();
  }, [cardId, classId, studentId]);

  // クリックイベント：マスを開け閉めし、ポイントを「蓄積」する
  const handleCellClick = (id: number) => {
    if (id === 13) return;
    if (!classId || !studentId || isLoadingCard || cardErrorMessage) return;
    if (!bingoCells[id]) return;

    const isOpening = !openedCells[id];
    // 1. 次のマス目の状態を作る
    const nextOpened = { ...openedCells, [id]: isOpening };

    // 2. その状態をもとに、ビンゴしているラインを計算する
    const currentAchieved: number[] = [];
    BINGO_LINES.forEach((line, index) => {
      const isComplete = line.every((cellId) => cellId === 13 || !!nextOpened[cellId]);
      if (isComplete) currentAchieved.push(index);
    });

    // 3. 過去のビンゴラインと比較して、新しくビンゴしたか確認する
    const newlyDiscoveredLines = currentAchieved.filter(
      (idx) => !achievedLineIndexes.includes(idx)
    );

    setOpenedCells(nextOpened);
    setAchievedLineIndexes(currentAchieved);
    // 新しいビンゴが見つかったら、アニメーションをONにする
    if (newlyDiscoveredLines.length > 0) {
      setShowAnimation(true);
    }

    // マスを開けた時だけポイントを「蓄積」する（まだ送信しない）
    if (isOpening) {
      let pointsToAdd = 10; // 1マス開けた基本ダメージ

      if (newlyDiscoveredLines.length > 0) {
        const linesCount = newlyDiscoveredLines.length;
        pointsToAdd += linesCount === 1 ? 150 : linesCount * 250;
      }

      setAccumulatedPoints((prev) => prev + pointsToAdd);
    }
  };

  // 蓄積したポイントを一気に送信する攻撃関数
  const handleAttack = async () => {
    if (accumulatedPoints <= 0 || !classId || !studentId || isAttacking) return;

    setIsAttacking(true); // 連打防止

    try {
      // 蓄積されたポイントを一撃で送信
      await supabase.rpc("apply_point_event", {
        p_class_id: classId,
        p_student_id: studentId,
        p_card_id: cardId,
        p_event_type: "bonus", // 一括攻撃は bonus イベントとして扱う
        p_points: accumulatedPoints,
      });

      // 送信成功したら蓄積ポイントをゼロにリセット
      setAccumulatedPoints(0);
    } catch (error) {
      console.error("攻撃の送信に失敗しました:", error);
      alert("攻撃に失敗しました。もう一度お試しください。");
    } finally {
      setIsAttacking(false);
    }
  };

  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);
  const openedCount = gridCells.filter((id) => id !== 13 && openedCells[id]).length;

  // 演出フラグが ON になったら、1.2秒後に閉じるタイマー
  useEffect(() => {
    if (!showAnimation) return;
    const timer = setTimeout(() => setShowAnimation(false), 1200);
    return () => clearTimeout(timer);
  }, [showAnimation]);

  const bingoLinesCount = achievedLineIndexes.length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      
      {/* ボス撃破時の全画面アニメーションレイヤー */}
      {showDefeatAnimation && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center animate-fadeIn">
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 animate-scaleUp text-center leading-tight">
            BOSS DEFEATED!!
          </h2>
          <p className="text-lg md:text-xl text-yellow-200 mt-6 tracking-[0.2em] animate-pulse">
            クラス全員で討伐成功！
          </p>
          <div className="mt-10 px-6 py-2 bg-purple-900/50 border border-purple-500 rounded-full animate-scaleUp" style={{ animationDelay: '0.5s' }}>
            <span className="text-purple-300 font-bold tracking-widest text-sm">
              OVERKILL BONUS 突入！
            </span>
          </div>
        </div>
      )}

      {/* 上部ヘッダー */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800 p-4 sticky top-0 z-10 backdrop-blur flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-base font-black text-slate-100 tracking-wide">{className} カード</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {roomCode ? `コード: ${roomCode} の授業中` : "条件達成で自動的に必殺技が発動！"}
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-widest">Hit Matrix</span>
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-2xl font-black text-emerald-400">{openedCount}</span>
            <span className="text-xs text-slate-600"> / 24</span>
          </div>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-start space-y-5">
        
        {/* リアルタイムボスエリア */}
        {classId ? (
          <BossArea classId={classId} />
        ) : (
          <div className="w-full p-6 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500 animate-pulse">
            {className === "読み込み中..." ? "ボスを召喚中..." : "クラス情報が取得できません"}
          </div>
        )}

        {/* 蓄積ポイントがある時だけ表示される攻撃ボタン */}
        <div className="h-14 flex items-center justify-center">
          {accumulatedPoints > 0 ? (
            <button
              onClick={handleAttack}
              disabled={isAttacking}
              className={`
                w-full py-3 px-6 rounded-full font-black tracking-wider text-white shadow-lg transition-all duration-200
                ${isAttacking 
                  ? "bg-slate-600 cursor-not-allowed scale-95" 
                  : "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 active:scale-95 shadow-[0_0_15px_rgba(225,29,72,0.5)] animate-pulse"
                }
              `}
            >
              {isAttacking ? "攻撃中..." : `💥 ${accumulatedPoints} PT 攻撃する！`}
            </button>
          ) : (
            <p className="text-xs text-slate-500 font-mono tracking-widest text-center w-full">
              - WAITING FOR ENERGY -
            </p>
          )}
        </div>

        {cardErrorMessage ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-bold leading-relaxed text-red-200">
            {cardErrorMessage}
          </div>
        ) : null}

        {/* ビンゴグリッドエリア */}
        <div className="grid grid-cols-5 gap-2 w-full aspect-square">
          {gridCells.map((id) => {
            if (id === 13) {
              return (
                <div key={id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-center aspect-square select-none">
                  <span className="text-[10px] font-black text-amber-500/80">FREE</span>
                </div>
              );
            }

            const cell = bingoCells[id];
            const isOpened = !!openedCells[id];

            return (
              <button
                key={id}
                type="button" //  これでボタン押下時のリロードをガード！
                onClick={() => handleCellClick(id)}
                className={`
                  relative rounded-xl border p-1 text-center flex flex-col items-center justify-center aspect-square transition-all duration-150 select-none outline-none active:scale-95
                  ${isOpened 
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-950/40 to-slate-900 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold" 
                    : "border-slate-800/80 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                  }
                `}
              >
                <span className={`absolute top-1 left-1.5 font-mono text-[8px] ${isOpened ? "text-emerald-500/60" : "text-slate-700"}`}>{id > 13 ? id - 1 : id}</span>
                <span className="text-[9px] leading-tight font-bold break-all px-0.5">
                  {isLoadingCard ? "読み込み中..." : cell?.text ?? ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1.2秒で消えるビンゴ時の小アニメーション */}
      {showAnimation && (
        /* pointer-events-none から z-50 にすることで、開いている時だけ最前面にし、消えたら跡形もなく消滅する */
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fadeIn transition-all duration-300">
          
          {bingoLinesCount >= 2 ? (
            <div className="text-center space-y-4 max-w-sm w-full p-2 animate-scaleUp">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-600 filter drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] uppercase italic">
                {bingoLinesCount === 2 ? "Double" : bingoLinesCount === 3 ? "Triple" : `${bingoLinesCount}Line`} <br />
                <span className="text-6xl md:text-7xl block mt-1 tracking-tight">BINGO!!</span>
              </h2>
              
              <div className="inline-block px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <span className="font-mono text-sm font-black text-amber-400 tracking-wider">CRITICAL ATTACK +{bingoLinesCount * 250}PT</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm w-full p-2 animate-scaleUp">
              <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-purple-300 via-fuchsia-500 to-indigo-700 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] uppercase italic">
                BINGO!
              </h2>
              
              <div className="inline-block px-4 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <span className="font-mono text-xs font-black text-purple-300 tracking-wider">BOSS DAMAGE +150PT</span>
              </div>
            </div>
          )}
          
        </div>
      )}

    </div>
  );
}
