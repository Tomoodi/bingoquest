"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { getAccessToken, useTeacherGuard } from "@/lib/useTeacherGuard";

type ClassRoom = {
  id: string;
  code: string;
  name: string;
  grade: string | null;
  class_section: string | null;
  lesson_theme: string | null;
  teacher_words: string[] | null;
  created_at: string;
};

export default function BingoTeacherDashboardPage() {
  const router = useRouter();
  const { ready, teacherName } = useTeacherGuard();

  const [rooms, setRooms] = useState<ClassRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ClassRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/teacher/login");
        return;
      }
      try {
        const res = await fetch("/api/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (res.ok) {
          const json = (await res.json()) as { classes: ClassRoom[] };
          setRooms(json.classes ?? []);
        }
      } catch (error) {
        console.error("クラス一覧の取得に失敗しました:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    const token = await getAccessToken();
    if (!token) {
      router.replace("/teacher/login");
      return;
    }
    try {
      const res = await fetch(`/api/classes/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error("クラスの削除に失敗しました:", error);
    } finally {
      setIsDeleting(false);
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
            <h1 className="text-xl font-bold tracking-wide text-amber-400">CODE CENTER</h1>
            <p className="text-xs text-slate-400 mt-0.5">{teacherName} 先生の管理パネル</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 space-y-5">
        {/* 新規作成 */}
        <Link
          href="/teacher/create"
          className="block w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black py-4 rounded-xl shadow-lg shadow-purple-900/20 transition-all"
        >
          ＋ 新しいクラスを作成
        </Link>

        <h3 className="text-xs font-mono font-bold text-slate-500 tracking-wider uppercase px-1">
          MY CLASSES ({rooms.length})
        </h3>

        {isLoading ? (
          <div className="text-center py-10 font-mono text-xs text-slate-600 animate-pulse">
            LOADING...
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-600">
            まだクラスがありません。上のボタンから作成しましょう。
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">
                      <span className="text-purple-400">{room.name}</span>
                      {room.lesson_theme ? (
                        <span className="text-amber-300"> ｜ {room.lesson_theme}</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {room.grade}
                      {room.class_section}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-black text-base text-white bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 tracking-widest">
                    {room.code}
                  </span>
                </div>

                {room.teacher_words && room.teacher_words.length > 0 ? (
                  <p className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                    🎯 {room.teacher_words.join(", ")}
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/teacher/edit/${room.id}`}
                    className="flex-1 text-center text-xs font-bold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg py-2 transition-colors"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(room)}
                    className="flex-1 text-center text-xs font-bold text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-500/30 rounded-lg py-2 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-base font-bold text-white">クラスを削除しますか？</h2>
            <p className="mt-2 text-xs text-slate-400">
              <span className="text-purple-300 font-bold">{deleteTarget.name}</span>（コード{" "}
              <span className="font-mono text-amber-300">{deleteTarget.code}</span>）を削除します。
              生徒・カード・ポイント・ボスの記録もすべて消えます。この操作は取り消せません。
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-slate-700 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
