import { getAuthedUser } from "@/lib/supabase/auth";
import { supabaseServer } from "@/lib/supabase/server";

type UpsertTeacherRequestBody = {
  name?: unknown;
  school?: unknown;
};

type TeacherErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "FETCH_FAILED"
  | "SAVE_FAILED";

function jsonError(
  status: number,
  code: TeacherErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

// 1〜100文字に収まる必須テキストとして検証する。
function requiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return null;
  return trimmed;
}

// 任意テキスト（未指定なら null）。100文字上限。
function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 100) return null;
  return trimmed;
}

// 自分の先生プロフィールを取得する。未登録なら teacher: null を返す。
export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  const { data, error } = await supabaseServer
    .from("teachers")
    .select("id, name, school, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch teacher:", error);
    return jsonError(500, "FETCH_FAILED", "プロフィールの取得に失敗しました。");
  }

  if (!data) {
    return Response.json({ teacher: null });
  }

  return Response.json({
    teacher: {
      id: data.id,
      name: data.name,
      school: data.school,
      email: data.email,
    },
  });
}

// 先生プロフィールを作成／更新する。id はトークン由来で確定（なりすまし防止）。
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  let body: UpsertTeacherRequestBody;
  try {
    body = (await request.json()) as UpsertTeacherRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const name = requiredText(body.name);
  if (!name) {
    return jsonError(400, "INVALID_INPUT", "先生のお名前を入力してください。");
  }

  const school = optionalText(body.school);

  const { data, error } = await supabaseServer
    .from("teachers")
    .upsert(
      {
        id: user.id,
        email: user.email,
        name,
        school,
      },
      { onConflict: "id" }
    )
    .select("id, name, school, email")
    .single();

  if (error) {
    console.error("Failed to upsert teacher:", error);
    return jsonError(500, "SAVE_FAILED", "プロフィールの保存に失敗しました。");
  }

  return Response.json(
    {
      teacher: {
        id: data.id,
        name: data.name,
        school: data.school,
        email: data.email,
      },
    },
    { status: 200 }
  );
}
