"use client";

import React, { useState } from "react";

export default function BingoTeacherManagementPage() {
  // 🟢 フォームの入力状態
  const [teacherName, setTeacherName] = useState("");
  const [gradeSection, setGradeSection] = useState("");
  const [lessonTheme, setLessonTheme] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  
  // クラスコードと画面状態の管理
  const [classCode, setClassCode] = useState("");
  const [isCreated, setIsCreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // エラー表示用

  // すべての入力項目が埋まっているかチェック
  const isFormValid = 
    teacherName.trim() !== "" && 
    gradeSection.trim() !== "" && 
    lessonTheme.trim() !== "" && 
    lessonDescription.trim() !== "";

  // 🚀 ボタンを押したときにAPIを叩いてSupabaseに保存する関数
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    setErrorMessage(""); // エラーをリセット

    // 🎲 6桁のランダムな数字を生成
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // 📡 作成した API (/api/classes) にデータを送信！
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherName,
          gradeSection,
          lessonTheme,
          lessonDescription,
          classCode: generatedCode, // 生成したコードも一緒に送る
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "ルームの作成に失敗しました。");
      }

      // 🏁 データベースへの保存が成功したら、画面をコード表示フェーズに切り替える
      setClassCode(generatedCode);
      setIsCreated(true);

    } catch (error: any) {
      setErrorMessage(error.message || "通信エラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      
      {/* 🔮 サイバー風ヘッダー */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST SETUP</h1>
            <p className="text-xs text-slate-400 mt-0.5">情報を入力してクエストを発行しよう！</p>
          </div>
          <div className="text-right">
            <span className={`font-mono text-sm font-black transition-colors duration-300 ${isFormValid ? "text-emerald-400" : "text-amber-500"}`}>
              {isFormValid ? "READY" : "INCOMPLETE"}
            </span>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">ステータス</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-between space-y-6">
        
        {/* ルーム生成情報ボード */}
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-slate-900/40 p-4 relative shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">ROOM CREATOR</p>
          <h2 className="mt-1 text-base font-black leading-tight text-indigo-100">新規クエスト（ルーム）の生成</h2>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-400 border-t border-slate-800/60 pt-2">
            必要事項を入力して最下部のボタンを押すと、生徒がログインするための「6桁のクラスコード」が自動生成され、Supabaseに保存されます。
          </p>
        </div>

        {!isCreated ? (
          /* 📝 入力フォーム */
          <form onSubmit={handleCreateClass} className="space-y-4 flex-1 flex flex-col justify-center">
            
            {/* 1. 先生の名前 */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 transition-all duration-200 min-h-[56px]
              ${teacherName ? "border-purple-500/60 bg-purple-950/10 shadow-[0_0_8px_rgba(168,85,247,0.1)]" : "border-slate-800"}`}
            >
              <span className={`absolute top-1 left-2.5 font-mono text-[8px] ${teacherName ? "text-purple-500/60" : "text-slate-700"}`}>
                01 : 先生のお名前 (name)
              </span>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="w-full pt-3 px-1 bg-transparent text-left text-xs font-bold text-slate-200 placeholder-slate-700/40 outline-none border-none focus:ring-0"
                placeholder="例: 山田 太郎"
              />
            </div>

            {/* 2. 何年何組 */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 transition-all duration-200 min-h-[56px]
              ${gradeSection ? "border-purple-500/60 bg-purple-950/10 shadow-[0_0_8px_rgba(168,85,247,0.1)]" : "border-slate-800"}`}
            >
              <span className={`absolute top-1 left-2.5 font-mono text-[8px] ${gradeSection ? "text-purple-500/60" : "text-slate-700"}`}>
                02 : 対象クラス (grade_section)
              </span>
              <input
                type="text"
                value={gradeSection}
                onChange={(e) => setGradeSection(e.target.value)}
                required
                className="w-full pt-3 px-1 bg-transparent text-left text-xs font-bold text-slate-200 placeholder-slate-700/40 outline-none border-none focus:ring-0"
                placeholder="例: 2年3組"
              />
            </div>

            {/* 3. 授業テーマ */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 transition-all duration-200 min-h-[56px]
              ${lessonTheme ? "border-purple-500/60 bg-purple-950/10 shadow-[0_0_8px_rgba(168,85,247,0.1)]" : "border-slate-800"}`}
            >
              <span className={`absolute top-1 left-2.5 font-mono text-[8px] ${lessonTheme ? "text-purple-500/60" : "text-slate-700"}`}>
                03 : 授業テーマ (lesson_theme)
              </span>
              <input
                type="text"
                value={lessonTheme}
                onChange={(e) => setLessonTheme(e.target.value)}
                required
                className="w-full pt-3 px-1 bg-transparent text-left text-xs font-bold text-slate-200 placeholder-slate-700/40 outline-none border-none focus:ring-0"
                placeholder="例: 英語：不定詞と動名詞"
              />
            </div>

            {/* 4. 授業内容 */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 transition-all duration-200 min-h-[90px]
              ${lessonDescription ? "border-purple-500/60 bg-purple-950/10 shadow-[0_0_8px_rgba(168,85,247,0.1)]" : "border-slate-800"}`}
            >
              <span className={`absolute top-1 left-2.5 font-mono text-[8px] ${lessonDescription ? "text-purple-500/60" : "text-slate-700"}`}>
                04 : 授業内容の詳細 (lesson_description)
              </span>
              <textarea
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                required
                rows={3}
                className="w-full pt-4 px-1 bg-transparent text-left text-xs font-bold text-slate-200 placeholder-slate-700/40 outline-none border-none focus:ring-0 resize-none leading-relaxed"
                placeholder="例: to不定詞の使い方の確認。教科書P.34を見ながら重要な文法をピックアップしてください。"
              />
            </div>

            {/* エラー・生成ボタン */}
            <div className="pt-4">
              {errorMessage && (
                <p className="mb-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-xs text-red-300 font-mono font-bold">
                  ⚠️ エラー: {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!isFormValid || isSaving}
                className={`
                  w-full font-black py-4 rounded-xl shadow-lg transition-all duration-150 tracking-widest text-sm uppercase active:scale-[0.98]
                  ${isFormValid && !isSaving
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/20 cursor-pointer"
                    : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none"
                  }
                `}
              >
                {isSaving 
                  ? "データベースに接続中..." 
                  : isFormValid 
                    ? "ルームを初期化してコードを発行！" 
                    : "すべての項目を入力してね (4/4)"}
              </button>
            </div>

          </form>
        ) : (
          /* 🏁 クラス作成完了フェーズ（コード共有画面） */
          <div className="space-y-6 text-center py-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest animate-pulse">ルームの作成に成功しました！</div>
              <h2 className="text-xl font-black text-slate-100">生徒にコードを共有してください</h2>
            </div>

            {/* 🎲 6桁コード */}
            <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-6 shadow-[0_0_20px_rgba(245,158,11,0.15)] inline-block mx-auto min-w-[240px]">
              <span className="text-[9px] font-mono text-amber-500 font-black uppercase tracking-widest block mb-1">発行されたクラスコード</span>
              <span className="text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-50 via-amber-200 to-amber-400 tracking-widest pl-3">
                {classCode}
              </span>
            </div>

            {/* サマリー */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-left space-y-2.5 font-mono text-xs text-slate-400 shadow-md">
              <div><span className="text-purple-400 font-bold">担当教師:</span> {teacherName}</div>
              <div><span className="text-purple-400 font-bold">対象クラス:</span> {gradeSection}</div>
              <div><span className="text-purple-400 font-bold">授業テーマ:</span> {lessonTheme}</div>
              <div className="border-t border-slate-800/60 pt-2 text-slate-500 leading-relaxed">
                <span className="text-purple-400 font-bold block mb-0.5">授業内容の概要:</span> 
                {lessonDescription}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreated(false)}
                className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                ← 新しくルームを作り直す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}