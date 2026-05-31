import { getAuthedUser } from "@/lib/supabase/auth";
import { supabaseServer } from "@/lib/supabase/server";

type CreateClassRequestBody = {
  teacherName?: unknown;
  grade?: unknown;
  classSection?: unknown;
  lessonTheme?: unknown;
  lessonDescription?: unknown;
  classCode?: unknown;
};

type CreateClassErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_REQUIRED"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "INVALID_CLASS_CODE"
  | "CLASS_CODE_TAKEN"
  | "CREATE_FAILED";

function jsonError(
  status: number,
  code: CreateClassErrorCode,
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

export async function POST(request: Request) {
  // クラス作成はログイン必須。本人を確定してから処理する。
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  // 先生プロフィール（teachers 行）が未登録なら作成させる。
  const { data: teacher, error: teacherError } = await supabaseServer
    .from("teachers")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (teacherError) {
    console.error("Failed to fetch teacher:", teacherError);
    return jsonError(500, "CREATE_FAILED", "クラスの作成に失敗しました。");
  }

  if (!teacher) {
    return jsonError(
      403,
      "PROFILE_REQUIRED",
      "先生プロフィールの登録が必要です。"
    );
  }

  let body: CreateClassRequestBody;

  try {
    body = (await request.json()) as CreateClassRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  // 表示用の先生名はプロフィールを正とし、body は後方互換のフォールバック。
  const teacherName = teacher.name ?? requiredText(body.teacherName);
  const grade = requiredText(body.grade);
  const classSection = requiredText(body.classSection);
  const lessonTheme = requiredText(body.lessonTheme);
  const lessonDescription = requiredText(body.lessonDescription);

  if (
    !teacherName ||
    !grade ||
    !classSection ||
    !lessonTheme ||
    !lessonDescription
  ) {
    return jsonError(400, "INVALID_INPUT", "入力内容が正しくありません。");
  }

  const classCode =
    typeof body.classCode === "string" ? body.classCode.trim() : "";

  if (!/^[0-9]{6}$/.test(classCode)) {
    return jsonError(
      400,
      "INVALID_CLASS_CODE",
      "クラスコードは6桁の数字で生成してください。"
    );
  }

  // 学年と組をクラス名として保存する（例: "2年3組"）。
  const name = `${grade}${classSection}`;

  // クラスを作成する。各クラスのボスは classes への insert トリガーで自動生成される
  // （20260530020000_boss_per_class.sql）。
  const { data: classData, error: classError } = await supabaseServer
    .from("classes")
    .insert({
      code: classCode,
      name,
      teacher_id: user.id,
      teacher_name: teacherName,
      grade,
      class_section: classSection,
      lesson_theme: lessonTheme,
      lesson_description: lessonDescription,
    })
    .select("id, code")
    .single();

  if (classError) {
    // コード重複（unique 違反）は専用エラーで返す。
    if (classError.code === "23505") {
      return jsonError(
        409,
        "CLASS_CODE_TAKEN",
        "クラスコードが重複しました。もう一度お試しください。"
      );
    }
    console.error("Failed to create class:", classError);
    return jsonError(500, "CREATE_FAILED", "クラスの作成に失敗しました。");
  }

  return Response.json(
    {
      class: {
        id: classData.id,
        code: classData.code,
      },
    },
    { status: 201 }
  );
}
