import { getAuthedUser } from "@/lib/supabase/auth";
import { normalizeWords } from "@/lib/classes";
import { supabaseServer } from "@/lib/supabase/server";

type CreateClassRequestBody = {
  subject?: unknown;
  grade?: unknown;
  classSection?: unknown;
  lessonTheme?: unknown;
  lessonDescription?: unknown;
  teacherWords?: unknown;
  classCode?: unknown;
};

type ClassErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_REQUIRED"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "INVALID_CLASS_CODE"
  | "CLASS_CODE_TAKEN"
  | "FETCH_FAILED"
  | "CREATE_FAILED";

function jsonError(
  status: number,
  code: ClassErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function requiredText(value: unknown, maxLength = 100): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

// 自分（ログイン中の先生）が作成したクラス一覧を返す。
export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  const { data, error } = await supabaseServer
    .from("classes")
    .select(
      "id, code, name, grade, class_section, lesson_theme, lesson_description, teacher_words, teacher_name, created_at"
    )
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch classes:", error);
    return jsonError(500, "FETCH_FAILED", "クラス一覧の取得に失敗しました。");
  }

  return Response.json({ classes: data ?? [] });
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

  // name には教科名を入れる（seed と整合: name='英語' 等）。先生名はプロフィール由来。
  const subject = requiredText(body.subject);
  const grade = requiredText(body.grade);
  const classSection = requiredText(body.classSection);
  const lessonTheme = requiredText(body.lessonTheme);
  const lessonDescription = requiredText(body.lessonDescription, 1000);
  const teacherWords = normalizeWords(body.teacherWords);

  if (!subject || !grade || !classSection || !lessonTheme || !lessonDescription) {
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

  // クラスを作成する。ボスは作成後にフロントから POST /api/boss-states で初期化する。
  const { data: classData, error: classError } = await supabaseServer
    .from("classes")
    .insert({
      code: classCode,
      name: subject,
      teacher_id: user.id,
      teacher_name: teacher.name,
      grade,
      class_section: classSection,
      lesson_theme: lessonTheme,
      lesson_description: lessonDescription,
      teacher_words: teacherWords,
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
