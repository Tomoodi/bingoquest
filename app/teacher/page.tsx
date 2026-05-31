"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export default function BingoTeacherManagementPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("");
  const [grade, setGrade] = useState("");
  const [classSection, setClassSection] = useState("");
  const [lessonTheme, setLessonTheme] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");

  const [classCode, setClassCode] = useState("");
  const [isCreated, setIsCreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // マウント時ガード: 未ログイン→login、プロフィール未登録→profile。
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/teacher/login");
        return;
      }

      const res = await fetch("/api/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!active) return;

      if (!res.ok) {
        router.replace("/teacher/login");
        return;
      }

      const json = (await res.json()) as {
        teacher: { name: string } | null;
      };
      if (!json.teacher) {
        router.replace("/teacher/profile");
        return;
      }

      setTeacherName(json.teacher.name);
      setIsReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  const isFormValid =
    grade.trim() !== "" &&
    classSection.trim() !== "" &&
    lessonTheme.trim() !== "" &&
    lessonDescription.trim() !== "";

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/teacher/login");
        return;
      }

      // 1) クラスを作成
      const classResponse = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherName,
          grade,
          classSection,
          lessonTheme,
          lessonDescription,
          classCode: generatedCode,
        }),
      });

      if (!classResponse.ok) throw new Error("クラスの作成に失敗しました。");

      const { class: createdClass } = (await classResponse.json()) as {
        class: { id: string; code: string };
      };

      // 2) 作成したクラスのボスを初期化
      const bossResponse = await fetch("/api/boss-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: createdClass.id }),
      });

      if (!bossResponse.ok) throw new Error("ボスの初期化に失敗しました。");

      // サーバが確定したコードを表示する
      setClassCode(createdClass.code);
      setIsCreated(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      {/* ヘッダー */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST SETUP</h1>
            <p className="text-xs text-slate-400 mt-0.5">{teacherName} 先生</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-sm font-black ${isFormValid ? "text-emerald-400" : "text-amber-500"}`}>
              {isFormValid ? "READY" : "INCOMPLETE"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col space-y-6">
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-slate-900/40 p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">ROOM CREATOR</p>
          <h2 className="mt-1 text-base font-black text-indigo-100">新規クエストの生成</h2>
        </div>

        {!isCreated ? (
          <form onSubmit={handleCreateClass} className="space-y-4">
            {/* 1. 名前（プロフィール由来・読み取り専用） */}
            <div className="relative rounded-xl border border-slate-800 p-2 bg-slate-900/40">
              <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">01 : 先生のお名前</span>
              <p className="w-full pt-3 px-1 text-xs font-bold text-slate-300">{teacherName}</p>
            </div>

            {/* 2. 学年と組 */}
            <div className="flex gap-2">
              <div className={`relative flex-1 rounded-xl border p-2 bg-slate-900/20 ${grade ? "border-purple-500/60" : "border-slate-800"}`}>
                <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">02A : 学年</span>
                <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="2年" />
              </div>
              <div className={`relative flex-1 rounded-xl border p-2 bg-slate-900/20 ${classSection ? "border-purple-500/60" : "border-slate-800"}`}>
                <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">02B : 組</span>
                <input type="text" value={classSection} onChange={(e) => setClassSection(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="3組" />
              </div>
            </div>

            {/* 3. テーマ */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${lessonTheme ? "border-purple-500/60" : "border-slate-800"}`}>
              <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">03 : 授業テーマ</span>
              <input type="text" value={lessonTheme} onChange={(e) => setLessonTheme(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="英語：不定詞" />
            </div>

            {/* 4. 詳細 */}
            <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${lessonDescription ? "border-purple-500/60" : "border-slate-800"}`}>
              <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">04 : 授業内容の詳細</span>
              <textarea value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)} required rows={3} className="w-full pt-4 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none resize-none placeholder:text-slate-700" placeholder="ここに詳細を入力..." />
            </div>

            <button type="submit" disabled={!isFormValid || isSaving} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-4 rounded-xl">
              {isSaving ? "送信中..." : "ルームを初期化してコードを発行！"}
            </button>
          </form>
        ) : (
          <div className="text-center py-10">
             <h2 className="text-2xl font-black text-indigo-400">QUEST ISSUED</h2>
             <p className="mt-4 text-slate-400">ROOM CODE:</p>
             <p className="text-4xl font-mono font-black text-white">{classCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}