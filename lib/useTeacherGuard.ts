"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

type TeacherGuardState = {
  ready: boolean;
  teacherName: string;
};

// 先生用画面の共通ガード。
// 未ログイン→/teacher/login、プロフィール未登録→/teacher/profile に飛ばす。
// ready=true になったら描画してよい。
export function useTeacherGuard(): TeacherGuardState {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [teacherName, setTeacherName] = useState("");

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

      const json = (await res.json()) as { teacher: { name: string } | null };
      if (!json.teacher) {
        router.replace("/teacher/profile");
        return;
      }

      setTeacherName(json.teacher.name);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return { ready, teacherName };
}

// 現在のアクセストークンを取得する（API呼び出し時の Bearer 用）。
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
