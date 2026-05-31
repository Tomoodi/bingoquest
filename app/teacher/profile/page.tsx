"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

type ProfileResponse = {
  teacher: {
    id: string;
    name: string;
    school: string | null;
    email: string | null;
  } | null;
};

type ProfileErrorResponse = {
  error?: { code?: string; message?: string };
};

export default function TeacherProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 未ログインなら login へ。既にプロフィール済みなら管理画面へ。
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

      if (res.ok) {
        const json = (await res.json()) as ProfileResponse;
        if (json.teacher) {
          router.replace("/teacher");
          return;
        }
      }
      setIsReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (name.trim().length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/teacher/login");
        return;
      }

      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, school }),
      });

      if (!res.ok) {
        const json = (await res.json()) as ProfileErrorResponse;
        setErrorMessage(json.error?.message ?? "プロフィールの保存に失敗しました。");
        return;
      }

      router.replace("/teacher");
    } catch {
      setErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-widest text-purple-400">
          プロフィール設定
        </h1>
        <p className="mt-2 text-xs font-medium tracking-wide text-slate-400">
          はじめに先生の情報を登録してください
        </p>
      </div>

      <div className="w-full max-w-md border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              先生のお名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="山田 太郎"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              学校名（任意）
            </label>
            <input
              type="text"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="〇〇中学校"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={name.trim().length === 0 || isSaving}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-purple-900/20 transition-all duration-150 tracking-wider text-sm"
          >
            {isSaving ? "保存中..." : "登録して進む"}
          </button>
        </form>
      </div>
    </div>
  );
}
