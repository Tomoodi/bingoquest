"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TeacherClassForm, {
  TeacherClassFormValues,
} from "@/components/TeacherClassForm";
import { getAccessToken, useTeacherGuard } from "@/lib/useTeacherGuard";

type ClassRow = {
  id: string;
  code: string;
  name: string;
  grade: string | null;
  class_section: string | null;
  lesson_theme: string | null;
  lesson_description: string | null;
  teacher_words: string[] | null;
};

export default function TeacherEditClassPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const { ready } = useTeacherGuard();

  const [initial, setInitial] = useState<TeacherClassFormValues | null>(null);
  const [code, setCode] = useState("");
  const [loadError, setLoadError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ガード通過後にクラスを取得してフォーム初期値にする。
  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/teacher/login");
        return;
      }

      const res = await fetch(`/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!active) return;

      if (!res.ok) {
        setLoadError("クラスが見つかりませんでした。");
        return;
      }

      const { class: row } = (await res.json()) as { class: ClassRow };
      setCode(row.code);
      setInitial({
        subject: row.name ?? "",
        grade: row.grade ?? "",
        classSection: row.class_section ?? "",
        lessonTheme: row.lesson_theme ?? "",
        lessonDescription: row.lesson_description ?? "",
        teacherWords: (row.teacher_words ?? []).join(", "),
      });
    })();
    return () => {
      active = false;
    };
  }, [ready, classId, router]);

  const handleSubmit = async (values: TeacherClassFormValues) => {
    setErrorMessage("");

    const token = await getAccessToken();
    if (!token) {
      router.replace("/teacher/login");
      return;
    }

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setErrorMessage(json.error?.message ?? "クラスの更新に失敗しました。");
        return;
      }

      router.push("/teacher");
    } catch {
      setErrorMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
    }
  };

  if (!ready || (!initial && !loadError)) {
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
            <h1 className="text-xl font-bold tracking-wide text-amber-400">QUEST EDIT</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              CODE <span className="font-mono text-amber-300">{code}</span>（変更不可）
            </p>
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
        {loadError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {loadError}
          </p>
        ) : initial ? (
          <TeacherClassForm
            initialValues={initial}
            submitLabel="変更を保存"
            submittingLabel="保存中..."
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </div>
  );
}
