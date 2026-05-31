"use client";

import { useRouter } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";

type BingoQuestSession = {
  student: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    code: string;
    name: string;
    teacherName: string | null;
    grade: string | null;
    classSection: string | null;
    lessonTheme: string | null;
    lessonDescription: string | null;
    teacherWords: string[];
  };
  bingoCard?: {
    id: string;
  };
};

const SESSION_STORAGE_KEY = "bingoQuestSession";

type BingoCardErrorResponse = {
  error?: {
    message?: string;
  };
};

type BingoCardSuccessResponse = {
  card: {
    id: string;
  };
};

export default function BingoCreatePage() {
  const router = useRouter();
  const [session, setSession] = useState<BingoQuestSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [inputs, setInputs] = useState<{ [key: number]: string }>({});
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAiSection, setShowAiSection] = useState(false)
  const [aiStudentWords, setAiStudentWords] = useState(["", "", "", ""])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      router.replace("/");
      return;
    }

    try {
      const parsedSession = JSON.parse(storedSession) as BingoQuestSession;
      startTransition(() => {
        setSession(parsedSession);
        setIsCheckingSession(false);
      });
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      router.replace("/");
      return;
    }
  }, [router]);

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

  // デモ/AI未完成時のフォールバック: プレースホルダー（例: ...）を流用して
  // 24マスをまとめて埋める。FREE（13番）は対象外。
  const handleAutoFill = () => {
    const filled: { [key: number]: string } = {};
    for (let id = 1; id <= 25; id++) {
      if (id === 13) continue;
      const sample = placeholders[id]?.replace(/^例:\s*/, "") ?? `予想ワード${id}`;
      filled[id] = sample;
    }
    setInputs(filled);
  };

  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);

  const filledCount = gridCells.filter(
    (id) => id !== 13 && inputs[id] && inputs[id].trim() !== ""
  ).length;

  const canSave = filledCount === 24 && !!session && !isSaving;

  const handleAiGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentWords: aiStudentWords.filter(w => w.trim() !== ""),
          teacherWords: session?.class.teacherWords ?? [],
          lesson_theme: session?.class.lessonTheme ?? "",
          lesson_description: session?.class.lessonDescription ?? "",
          class_id: session?.class.id,
          student_id: session?.student.id,
        }),
      })
      const data = await res.json()
      if (data.card_id) {
        const nextSession = { ...session, bingoCard: { id: data.card_id } }
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
        router.push("/bingo-play")
      } else {
        setSaveErrorMessage(data.error ?? "AI生成に失敗しました。")
      }
    } catch {
      setSaveErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveCard = async () => {
    if (!session || !canSave) {
      return;
    }

    setSaveErrorMessage("");
    setIsSaving(true);

    const cells = gridCells.map((id) => ({
      position: id - 1,
      text: id === 13 ? "FREE" : inputs[id].trim(),
      isFree: id === 13,
    }));

    try {
      const response = await fetch("/api/bingo-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: session.class.id,
          studentId: session.student.id,
          cells,
        }),
      });

      const data = (await response.json()) as
        | BingoCardSuccessResponse
        | BingoCardErrorResponse;

      if (!response.ok) {
        const message =
          "error" in data && data.error?.message
            ? data.error.message
            : "ビンゴカードの保存に失敗しました。";
        setSaveErrorMessage(message);
        return;
      }

      const successData = data as BingoCardSuccessResponse;
      const nextSession = {
        ...session,
        bingoCard: {
          id: successData.card.id,
        },
      };

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      router.push("/bingo-play");
    } catch {
      setSaveErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans">
      
      {/* 🔮 ヘッダーエリア */}
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

      {/* 📝 メインコンテンツ */}
      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-between space-y-6">
        {session ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Lesson
                </p>
                <h2 className="mt-1 text-base font-black leading-tight text-amber-100">
                  {session.class.lessonTheme || "授業テーマ未設定"}
                </h2>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold tracking-widest text-slate-500">
                  CODE {session.class.code}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-300">
                  {session.student.name}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide text-slate-300">
              {(session.class.grade || session.class.classSection) ? (
                <span className="rounded-md border border-amber-500/20 bg-slate-950/30 px-2 py-1">
                  {[session.class.grade, session.class.classSection]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              ) : null}
              {session.class.teacherName ? (
                <span className="rounded-md border border-amber-500/20 bg-slate-950/30 px-2 py-1">
                  {session.class.teacherName}
                </span>
              ) : null}
              <span className="rounded-md border border-amber-500/20 bg-slate-950/30 px-2 py-1">
                {session.class.name}
              </span>
            </div>
            {session.class.lessonDescription ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {session.class.lessonDescription}
              </p>
            ) : null}
          </section>
        ) : null}
        
        {/* ヒントメッセージ（教科書推しに文言も変更！） */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed">
          <span className="text-purple-400 font-bold">🎯 予習のコツ：</span>
          次の時間の教科書やノートをパラパラとめくって、新しく出てくる単語や大事そうな文法を見つけてマスを埋めよう！授業中に起きそうな出来事などお楽しみ要素を混ぜてもOK！
        </div>

        {/* デモ用: サンプル自動入力 */}
        <button
          type="button"
          onClick={handleAutoFill}
          className="w-full rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 py-2.5 text-xs font-bold tracking-wide text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.99] transition-all"
        >
          🎲 サンプルを自動入力（デモ用）
        </button>

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
          {saveErrorMessage ? (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {saveErrorMessage}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!canSave}
            className={`
              w-full font-black py-4 rounded-xl shadow-lg transition-all duration-150 tracking-widest text-sm uppercase active:scale-[0.98]
              ${canSave
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/20"
                : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none"
              }
            `}
            onClick={handleSaveCard}
          >
            {isSaving
              ? "保存中..."
              : filledCount === 24
                ? "ビンゴカードを完成させる！"
                : "すべてのマスを入力してね"}
          </button>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAiSection(!showAiSection)}
              className="w-full font-black py-4 rounded-xl border border-purple-500/40 text-purple-400 text-sm uppercase tracking-widest hover:bg-purple-950/20 transition-all"
            >
              AIでビンゴカードを作成する
            </button>
            {showAiSection && (
              <div className="mt-4 space-y-2">
                {aiStudentWords.map((word, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`キーワード ${i + 1}`}
                    value={word}
                    onChange={(e) => {
                      const next = [...aiStudentWords];
                      next[i] = e.target.value;
                      setAiStudentWords(next);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500"
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="w-full font-black py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm uppercase tracking-widest mt-2 disabled:opacity-50"
                >
                  {isGenerating ? "生成中..." : "生成する"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
