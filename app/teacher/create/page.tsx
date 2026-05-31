"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function BingoTeacherManagementPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("");
  const [grade, setGrade] = useState("");
  const [classSection, setClassSection] = useState("");
  const [subjectName, setSubjectName] = useState("");   
  const [lessonTheme, setLessonTheme] = useState("");   
  const [lessonDescription, setLessonDescription] = useState("");
  const [teacherWords, setTeacherWords] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = 
    teacherName.trim() !== "" && 
    grade.trim() !== "" && 
    classSection.trim() !== "" &&
    subjectName.trim() !== "" && 
    lessonTheme.trim() !== "" && 
    lessonDescription.trim() !== "" &&
    teacherWords.trim() !== ""; 

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_name: teacherName,
          grade: grade,
          class_section: classSection,
          name: subjectName,      
          lesson_theme: lessonTheme, 
          lesson_description: lessonDescription,
          teacher_words: teacherWords, 
          code: generatedCode,
        }),
      });

      if (!response.ok) throw new Error("作成に失敗しました。");
      router.push("/teacher/codes");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST SETUP</h1>
            <p className="text-xs text-slate-400 mt-0.5">情報を入力してクエストを発行しよう！</p>
          </div>
          <div className="text-right">
            <span className={`font-mono text-sm font-black ${isFormValid ? "text-emerald-400" : "text-amber-500"}`}>
              {isFormValid ? "READY" : "INCOMPLETE"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col space-y-6">
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-slate-900/40 p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">ROOM CREATOR</p>
          <h2 className="mt-1 text-base font-black text-indigo-100">新規クエストの生成</h2>
        </div>

        <form onSubmit={handleCreateClass} className="space-y-4">
          {/* 1. 先生の名前 */}
          <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${teacherName ? "border-purple-500/60" : "border-slate-800"}`}>
            <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">01 : 名前 </span>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="山田 太郎" />
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

          {/* 3. 教科名 */}
          <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${subjectName ? "border-purple-500/60" : "border-slate-800"}`}>
            <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">03 : 教科名</span>
            <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="例: 英語、国語" />
          </div>

          {/* 4. 授業テーマ */}
          <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${lessonTheme ? "border-purple-500/60" : "border-slate-800"}`}>
            <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">04 : 授業テーマ・単元名</span>
            <input type="text" value={lessonTheme} onChange={(e) => setLessonTheme(e.target.value)} required className="w-full pt-3 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-700" placeholder="例: 不定詞、走れメロス" />
          </div>

          {/* 5. 詳細 */}
          <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${lessonDescription ? "border-purple-500/60" : "border-slate-800"}`}>
            <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">05 : 授業内容の詳細</span>
            <textarea value={lessonDescription} onChange={(e) => setLessonDescription(e.target.value)} required rows={2} className="w-full pt-4 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none resize-none placeholder:text-slate-700" placeholder="ここに詳細を入力..." />
          </div>

          {/* 6. ビンゴ用の問題ワード 💡 他と同じパープル系（border-purple-500/60、文字は通常）に修正 */}
          <div className={`relative rounded-xl border p-2 bg-slate-900/20 ${teacherWords ? "border-purple-500/60" : "border-slate-800"}`}>
            <span className="absolute top-1 left-2.5 font-mono text-[8px] text-slate-600">06 : 自動ai生成用の単語入力</span>
            <textarea value={teacherWords} onChange={(e) => setTeacherWords(e.target.value)} required rows={3} className="w-full pt-4 px-1 bg-transparent text-xs font-bold text-slate-200 outline-none resize-none placeholder:text-slate-700" placeholder="例: 名詞的用法, 形容適用法, 副詞的用法, 原型不定詞, too ~to, enough to ~" />
          </div>

          <button type="submit" disabled={!isFormValid || isSaving} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-4 rounded-xl transition-all">
            {isSaving ? "生成中..." : "ルームを初期化してコードを発行！"}
          </button>
        </form>
      </div>
    </div>
  );
}