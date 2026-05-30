import { supabaseServer } from "@/lib/supabase/server";

// リクエストで受け取るデータの型定義
type CreateClassRequestBody = {
  classCode?: unknown;
  teacherName?: unknown;
  grade?: unknown;
  classSection?: unknown;
  lessonTheme?: unknown;
  lessonDescription?: unknown;
};

// 先生画面用のエラーコード一覧
type CreateClassErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "CREATE_FAILED";

// 統一されたエラーレスポンスを返す関数
function jsonError(
  status: number,
  code: CreateClassErrorCode,
  message: string
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export async function POST(request: Request) {
  let body: CreateClassRequestBody;

  // 1. JSONの形式チェック
  try {
    body = (await request.json()) as CreateClassRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  // 2. データの安全な取り出しとトリミング
  const classCode = typeof body.classCode === "string" ? body.classCode.trim() : "";
  const teacherName = typeof body.teacherName === "string" ? body.teacherName.trim() : "";
  const grade = typeof body.grade === "string" ? body.grade.trim() : "";
  const classSection = typeof body.classSection === "string" ? body.classSection.trim() : "";
  const lessonTheme = typeof body.lessonTheme === "string" ? body.lessonTheme.trim() : "";
  const lessonDescription = typeof body.lessonDescription === "string" ? body.lessonDescription.trim() : "";

  // 3. バリデーション（入力チェック）
  if (!/^[0-9]{6}$/.test(classCode)) {
    return jsonError(400, "INVALID_INPUT", "クラスコードは6桁の数字である必要があります。");
  }
  if (!teacherName || !grade || !classSection || !lessonTheme || !lessonDescription) {
    return jsonError(400, "INVALID_INPUT", "必須入力項目が不足しています。");
  }

  // 4. チーム共通の supabaseServer を使って classes テーブルに保存！
  const { data: classData, error: classError } = await supabaseServer
    .from("classes")
    .insert({
      code: classCode,
      name: teacherName,            // スクショより、nameカラムに先生の名前を格納
      grade: grade,
      class_section: classSection,
      lesson_theme: lessonTheme,
      lesson_description: lessonDescription,
      teacher_words: [],            // _text型(配列)の初期化
    })
    .select("id, code, name, grade, class_section, lesson_theme, lesson_description")
    .single();

  // 5. データベース保存エラーのハンドリング
  if (classError) {
    console.error("Failed to create class in Supabase:", classError);
    return jsonError(500, "CREATE_FAILED", "データベースへの保存に失敗しました。");
  }

  // 6. 成功レスポンス（ステータス201: Created）
  return Response.json(
    {
      success: true,
      class: {
        id: classData.id,
        code: classData.code,
        name: classData.name,
        grade: classData.grade,
        classSection: classData.class_section,
        lessonTheme: classData.lesson_theme,
        lessonDescription: classData.lesson_description,
      },
    },
    { status: 201 }
  );
}