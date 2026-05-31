"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import BossArea from "@/components/BossArea";
import { motion, AnimatePresence } from "framer-motion";
import { RealtimeChannel } from "@supabase/supabase-js"

type BingoQuestSession = {
  student: {
    id: string;
  };
  class: {
    id: string;
    code: string;
    name: string;
    lessonTheme?: string;
    lessonDescription?: string;
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
  accumulatedPoints: number;
};

type OpenCellResponse = {
  accumulatedPoints: number;
  newBingoLineCount: number;
  newReachCount: number;
  totalBingoLineCount: number;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

// バトルログの型定義
type BattleLog = {
  id: string;
  message: string;
  timestamp: number;
};

export default function BingoPlayPage() {
  const [openedCells, setOpenedCells] = useState<{ [key: number]: boolean }>({});
  const [showAnimation, setShowAnimation] = useState(false);
  // 演出表示用：今回の開放で「新しく」揃ったビンゴライン数（同時 2 本なら Double 等）
  const [bingoLinesCount, setBingoLinesCount] = useState(0);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("読み込み中...");
  const [roomCode, setRoomCode] = useState<string>("");
  const [bingoCells, setBingoCells] = useState<{ [key: number]: BingoCell }>({});
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [cardErrorMessage, setCardErrorMessage] = useState("");

  // 蓄積された攻撃ポイント（DB 由来。GET / open / attack のレスポンスで同期）
  const [accumulatedPoints, setAccumulatedPoints] = useState<number>(0);
  const [isAttacking, setIsAttacking] = useState(false); // 連打防止用

  // 開放確認モーダルの対象マス（grid id 1-25）。null のとき非表示。
  const [pendingCellId, setPendingCellId] = useState<number | null>(null);
  const [isOpeningCell, setIsOpeningCell] = useState(false); // open API 実行中

  // ボス撃破時のアニメーション管理用State
  const [showDefeatAnimation, setShowDefeatAnimation] = useState(false);
  const [hasDefeated, setHasDefeated] = useState(false);

  // バトルログ、自分の名前、通信チャンネルの管理
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([]);
  const [studentName, setStudentName] = useState<string>("勇者");
  const roomChannelRef = useRef<RealtimeChannel | null>(null);

  // ボスに渡す用の「直近で受けたダメージ」
  const [attackEvent, setAttackEvent] = useState<{ amount: number; time: number } | null>(null);

  // クイズ機能
  const [lessonTheme, setLessonTheme] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [quizCellIds, setQuizCellIds] = useState<Set<number>>(new Set());
  const [quizCellId, setQuizCellId] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{ question: string; options: string[]; answerIndex: number } | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [cooldowns, setCooldowns] = useState<{ [key: number]: number }>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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
        setLessonTheme(sessionData.class.lessonTheme ?? "");
        setLessonDescription(sessionData.class.lessonDescription ?? "");

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

  // 自分の名前を取得する
  useEffect(() => {
    if (!studentId) return;
    supabase.from('students').select('name').eq('id', studentId).single().then(({ data }) => {
      if (data) setStudentName(data.name);
    });
  }, [studentId]);

  // クラス全員と繋がるリアルタイム通信のセットアップ
  useEffect(() => {
    if (!classId) return;
    
    // Broadcast機能を使って、クラス用の部屋（チャンネル）を作る
    const channel = supabase.channel(`room-${classId}`, {
      config: { broadcast: { self: true } } // 自分の送信も受信する
    });

    channel.on('broadcast', { event: 'attack' }, ({ payload }: { payload: { name: string; damage: number } }) => {
      // 誰かが攻撃したというメッセージを受信したらログに追加
      const newLog = {
        id: Date.now().toString() + Math.random(),
        message: `${payload.name} が ${payload.damage} ダメージを与えた！💥`,
        timestamp: Date.now()
      };
      setBattleLogs(prev => [...prev, newLog]);

      // 他人が攻撃したダメージもボスエリアに伝える
      setAttackEvent({ amount: payload.damage, time: Date.now() });

      // 4秒後に自動で消す
      setTimeout(() => {
        setBattleLogs(prev => prev.filter(log => log.id !== newLog.id));
      }, 4000);
    }).subscribe();

    roomChannelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [classId]);

  // ボスの撃破（HPが0になった瞬間）を監視する処理
  useEffect(() => {
    if (!classId || hasDefeated) return;

    // Supabase Realtimeでboss_statesテーブルを監視
    const channel = supabase
      .channel("boss-defeat-watch")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "boss_states",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          // 前回はHPが0より大きく、今回0以下になったら発動
          if (
            payload.new.current_hp <= 0 &&
            payload.old.current_hp > 0 &&
            !hasDefeated
          ) {
            setHasDefeated(true);
            setShowDefeatAnimation(true);

            // 4秒後にアニメーションを閉じてオーバーキル状態へ
            setTimeout(() => {
              setShowDefeatAnimation(false);
            }, 4000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          | ApiErrorResponse;

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

        setBingoCells(cellsById);
        setOpenedCells(nextOpenedCells);
        setAccumulatedPoints(successData.accumulatedPoints);

        // 全ビンゴラインに必ず1問入るようにクイズマスを選ぶ
        const ROWS = [[1,2,3,4,5],[6,7,8,9,10],[11,12,14,15],[16,17,18,19,20],[21,22,23,24,25]]; // 行（13=FREE除く）
        const COLS = [[1,6,11,16,21],[2,7,12,17,22],[3,8,14,19,24],[4,9,15,20,25],[5,10,12,18,23]]; // 列（13除く）
        const DIAG1 = [1,7,19,25];   // 左上→右下（13はFREEなので除く）
        const DIAG2 = [5,9,17,21];   // 右上→左下（13はFREEなので除く）

        const pick = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
        const quizSet = new Set<number>();

        // ① 各行から1マス → 全横ラインをカバー
        ROWS.forEach((row) => quizSet.add(pick(row)));

        // ② 各列を確認 → その列のどれも選ばれていなければ1マス追加
        COLS.forEach((col) => {
          if (!col.some((id) => quizSet.has(id))) quizSet.add(pick(col));
        });

        // ③ 斜めを確認 → カバーされていなければ1マス追加
        if (!DIAG1.some((id) => quizSet.has(id))) quizSet.add(pick(DIAG1));
        if (!DIAG2.some((id) => quizSet.has(id))) quizSet.add(pick(DIAG2));

        // ④ 10〜12マスになるまでランダムで追加
        const remaining = [1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25]
          .filter((id) => !quizSet.has(id))
          .sort(() => Math.random() - 0.5);
        const target = Math.floor(Math.random() * 3) + 10; // 10〜12
        for (const id of remaining) {
          if (quizSet.size >= target) break;
          quizSet.add(id);
        }

        setQuizCellIds(quizSet);
      } catch (error) {
        console.error("ビンゴカードの取得に失敗しました:", error);
        setCardErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
      } finally {
        setIsLoadingCard(false);
      }
    };

    fetchBingoCard();
  }, [cardId, classId, studentId]);

  // マスをタップ：クイズマスならクイズ、それ以外は確認モーダル
  const requestOpenCell = (id: number) => {
    if (id === 13) return;
    if (!classId || !studentId || !cardId || isLoadingCard || cardErrorMessage) return;
    if (!bingoCells[id]) return;
    if (openedCells[id]) return;

    // クールダウン中はスキップ
    if (Date.now() < (cooldowns[id] ?? 0)) return;

    if (quizCellIds.has(id)) {
      // クイズマス → クイズモーダルへ
      setQuizCellId(id);
      setQuiz(null);
      setSelectedOption(null);
      setQuizResult(null);
      setIsLoadingQuiz(true);
      fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_theme: lessonTheme, lesson_description: lessonDescription }),
      }).then((res) => res.json()).then((data) => {
        setIsLoadingQuiz(false);
        setQuiz(data);
      }).catch(() => {
        setIsLoadingQuiz(false);
        setQuizCellId(null);
      });
    } else {
      // 通常マス → 確認モーダルへ
      setPendingCellId(id);
    }
  };

  const cancelOpenCell = () => {
    if (isOpeningCell) return;
    setPendingCellId(null);
  };

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null || !quiz || quizCellId === null) return;
    setSelectedOption(index);
    if (index === quiz.answerIndex) {
      setQuizResult("correct");
      setTimeout(() => {
        setQuizCellId(null);
        setQuiz(null);
        setPendingCellId(quizCellId);
      }, 800);
    } else {
      setQuizResult("wrong");
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [quizCellId]: Date.now() + 30_000 }));
        setQuizCellId(null);
        setQuiz(null);
      }, 1000);
    }
  };

  // 確認モーダルで「はい」：open API を呼び、DB にマス開放とポイントイベントを記録する
  const confirmOpenCell = async () => {
    if (pendingCellId === null || isOpeningCell) return;
    const id = pendingCellId;
    const cell = bingoCells[id];
    if (!cell || !classId || !studentId || !cardId) {
      setPendingCellId(null);
      return;
    }

    setIsOpeningCell(true);
    try {
      const response = await fetch("/api/bingo-cells/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          studentId,
          cardId,
          position: cell.position,
        }),
      });
      const data = (await response.json()) as
        | OpenCellResponse
        | ApiErrorResponse;

      if (!response.ok) {
        const message =
          "error" in data && data.error?.message
            ? data.error.message
            : "マスを開けませんでした。";
        alert(message);
        return;
      }

      const result = data as OpenCellResponse;
      setOpenedCells((prev) => ({ ...prev, [id]: true }));
      // 貯蓄ポイントはサーバ確定値で同期
      setAccumulatedPoints(result.accumulatedPoints);
      // 新しくビンゴが揃ったら演出を出す（今回揃った本数で Single/Double を表示）
      if (result.newBingoLineCount > 0) {
        setBingoLinesCount(result.newBingoLineCount);
        setShowAnimation(true);
      }
    } catch (error) {
      console.error("マスの開放に失敗しました:", error);
      alert("通信に失敗しました。もう一度お試しください。");
    } finally {
      setIsOpeningCell(false);
      setPendingCellId(null);
    }
  };

  // 蓄積したポイントを一気に送信する攻撃関数（消費型）
  const handleAttack = async () => {
    if (accumulatedPoints <= 0 || !classId || !studentId || isAttacking) return;

    setIsAttacking(true); // 連打防止
    // 先にポイント数を記録しておく（0にリセットされる前に）
    const damageToDealt = accumulatedPoints;

    try {
      const response = await fetch("/api/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, studentId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiErrorResponse;
        const message = data.error?.message ?? "攻撃に失敗しました。";
        alert(message);
        return;
      }

      // 攻撃成功時に、クラス全員に「自分が攻撃したぞ！」とブロードキャスト送信する
      if (roomChannelRef.current) {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'attack',
          payload: { name: studentName, damage: damageToDealt }
        });
      }

      // 消費済みなので貯蓄ポイントは 0。ボス HP は BossArea が Realtime で反映する。
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

  const pendingCell = pendingCellId !== null ? bingoCells[pendingCellId] : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      {/* リアルタイム・バトルログ（右下からフワッと出てくる） */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        <AnimatePresence>
          {battleLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-900/90 border-l-4 border-emerald-500 text-white text-xs md:text-sm px-4 py-2 rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-sm font-bold tracking-wide"
            >
              {log.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ボス撃破時の全画面アニメーションレイヤー */}
      {showDefeatAnimation && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center animate-fadeIn">
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 animate-scaleUp text-center leading-tight">
            BOSS DEFEATED!!
          </h2>
          <p className="text-lg md:text-xl text-yellow-200 mt-6 tracking-[0.2em] animate-pulse">
            クラス全員で討伐成功！
          </p>
          <div className="mt-10 px-6 py-2 bg-purple-900/50 border border-purple-500 rounded-full animate-scaleUp" style={{ animationDelay: "0.5s" }}>
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
          <BossArea classId={classId} attackEvent={attackEvent} />
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
            const cooldownRemaining = Math.max(0, Math.ceil(((cooldowns[id] ?? 0) - Date.now()) / 1000));
            const isCoolingDown = cooldownRemaining > 0;
            const isQuizCell = quizCellIds.has(id);

            return (
              <button
                key={id}
                type="button"
                onClick={() => requestOpenCell(id)}
                disabled={isOpened || isCoolingDown}
                className={`
                  relative rounded-xl border p-1 text-center flex flex-col items-center justify-center aspect-square transition-all duration-150 select-none outline-none active:scale-95
                  ${isOpened
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-950/40 to-slate-900 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold cursor-default"
                    : isCoolingDown
                      ? "border-red-900/50 bg-red-950/20 text-red-400/60 cursor-not-allowed"
                      : isQuizCell
                        ? "border-purple-700/60 bg-purple-950/10 text-slate-400 hover:border-purple-600"
                        : "border-slate-800/80 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                  }
                `}
              >
                <span className={`absolute top-1 left-1.5 font-mono text-[8px] ${isOpened ? "text-emerald-500/60" : "text-slate-700"}`}>{id > 13 ? id - 1 : id}</span>
                {!isOpened && isQuizCell && !isCoolingDown && (
                  <span className="absolute top-1 right-1 text-[8px] text-purple-500">❓</span>
                )}
                {isCoolingDown ? (
                  <span className="text-lg font-black text-red-400/80">{cooldownRemaining}</span>
                ) : (
                  <span className="text-[9px] leading-tight font-bold break-all px-0.5">
                    {isLoadingCard ? "読み込み中..." : cell?.text ?? ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* マス開放の確認モーダル（開けたら閉じられないので事前確認） */}
      {pendingCell && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-40 flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">Open Cell</p>
              <p className="text-base font-black text-slate-100 break-all">「{pendingCell.text}」</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                このマスを開けますか？<br />一度開けると閉じられません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelOpenCell}
                disabled={isOpeningCell}
                className="flex-1 py-2.5 rounded-full font-bold text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={confirmOpenCell}
                disabled={isOpeningCell}
                className="flex-1 py-2.5 rounded-full font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 active:scale-95 disabled:opacity-60 transition-all"
              >
                {isOpeningCell ? "開放中..." : "はい"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* クイズモーダル */}
      {quizCellId !== null && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Quiz — マスを開けるには正解しよう！</p>
            {isLoadingQuiz ? (
              <p className="text-sm text-slate-500 text-center animate-pulse">クイズを生成中...</p>
            ) : quiz ? (
              <>
                <p className="text-sm font-bold text-slate-100 leading-relaxed">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((option, i) => {
                    const isSelected = selectedOption === i;
                    const isCorrect = i === quiz.answerIndex;
                    let style = "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600";
                    if (selectedOption !== null) {
                      if (isCorrect) style = "border-emerald-500 bg-emerald-950/40 text-emerald-300";
                      else if (isSelected) style = "border-red-500 bg-red-950/40 text-red-300";
                      else style = "border-slate-800 bg-slate-900 text-slate-600";
                    }
                    return (
                      <button key={i} type="button" onClick={() => handleSelectOption(i)} disabled={selectedOption !== null}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all ${style}`}>
                        {option}
                      </button>
                    );
                  })}
                </div>
                {quizResult === "correct" && <p className="text-center text-emerald-400 font-black tracking-wider">正解！マスが開く！</p>}
                {quizResult === "wrong" && <p className="text-center text-red-400 font-black tracking-wider">不正解… 30秒後に再挑戦できます</p>}
              </>
            ) : null}
            {!quizResult && (
              <button type="button" onClick={() => setQuizCellId(null)}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors">
                キャンセル
              </button>
            )}
          </div>
        </div>
      )}

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
