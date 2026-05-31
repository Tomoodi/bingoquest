"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 既にログイン済みなら管理画面へ送る（OAuthリダイレクト後もここで吸収する）。
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace("/teacher");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/teacher`,
      },
    });
    if (error) {
      console.error(error);
      setErrorMessage("ログインを開始できませんでした。時間をおいてお試しください。");
      setIsLoading(false);
    }
    // 成功時は Google へリダイレクトされるため、ここでは何もしない。
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-white">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-widest text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          BINGO QUEST
        </h1>
        <p className="mt-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
          先生用ログイン
        </p>
      </div>

      <div className="w-full max-w-md border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-8 tracking-wider text-indigo-300">
          先生としてログイン
        </h2>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? "リダイレクト中..." : "Googleでログイン"}
        </button>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-12 text-[10px] font-mono tracking-widest text-slate-600 uppercase">
        BINGO QUEST - Teacher Mode
      </div>
    </div>
  );
}
