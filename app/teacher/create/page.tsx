"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import TeacherClassForm, {
  TeacherClassFormValues,
} from "@/components/TeacherClassForm";
import { getAccessToken, useTeacherGuard } from "@/lib/useTeacherGuard";

export default function TeacherCreateClassPage() {
  const router = useRouter();
  const { ready } = useTeacherGuard();
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (values: TeacherClassFormValues) => {
    setErrorMessage("");

    const token = await getAccessToken();
    if (!token) {
      router.replace("/teacher/login");
      return;
    }

    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // 1) クラスを作成
      const classResponse = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...values, classCode: generatedCode }),
      });

      if (!classResponse.ok) {
        const json = (await classResponse.json()) as {
          error?: { message?: string };
        };
        setErrorMessage(json.error?.message ?? "クラスの作成に失敗しました。");
        return;
      }

      const { class: createdClass } = (await classResponse.json()) as {
        class: { id: string; code: string };
      };

      // 2) 作成したクラスのボスを初期化
      const bossResponse = await fetch("/api/boss-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: createdClass.id }),
      });

      if (!bossResponse.ok) {
        setErrorMessage("ボスの初期化に失敗しました。");
        return;
      }

      router.push("/teacher");
    } catch {
      setErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans">
      {/* ヘッダー */}
      <div className="w-full bg-slate-900/40 border-b border-slate-800 p-5 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-purple-400">QUEST SETUP</h1>
            <p className="text-xs text-slate-400 mt-0.5">情報を入力してクエストを発行しよう！</p>
          </div>
          <Link
            href="/teacher"
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-800 transition-all"
          >
            ← 一覧へ
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col space-y-6">
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-slate-900/40 p-4 shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">ROOM CREATOR</p>
          <h2 className="mt-1 text-base font-black text-indigo-100">新規クエストの生成</h2>
        </div>

        <TeacherClassForm
          submitLabel="ルームを初期化してコードを発行！"
          submittingLabel="生成中..."
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
