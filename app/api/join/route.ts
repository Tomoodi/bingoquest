import { supabaseServer } from "@/lib/supabase/server";

type JoinRequestBody = {
  name?: unknown;
  classCode?: unknown;
};

type JoinErrorCode =
  | "INVALID_JSON"
  | "INVALID_NAME"
  | "INVALID_CLASS_CODE"
  | "CLASS_NOT_FOUND"
  | "JOIN_FAILED";

function jsonError(
  status: number,
  code: JoinErrorCode,
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
  let body: JoinRequestBody;

  try {
    body = (await request.json()) as JoinRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const classCode =
    typeof body.classCode === "string" ? body.classCode.trim() : "";

  if (name.length === 0 || name.length > 50) {
    return jsonError(
      400,
      "INVALID_NAME",
      "氏名は1文字以上50文字以内で入力してください。"
    );
  }

  if (!/^[0-9]{6}$/.test(classCode)) {
    return jsonError(
      400,
      "INVALID_CLASS_CODE",
      "クラスコードは6桁の数字で入力してください。"
    );
  }

  const { data: classData, error: classError } = await supabaseServer
    .from("classes")
    .select(
      "id, code, name, teacher_name, grade, class_section, lesson_theme, lesson_description"
    )
    .eq("code", classCode)
    .maybeSingle();

  if (classError) {
    console.error("Failed to find class:", classError);
    return jsonError(500, "JOIN_FAILED", "クラスの確認に失敗しました。");
  }

  if (!classData) {
    return jsonError(404, "CLASS_NOT_FOUND", "クラスコードが見つかりません。");
  }

  const { data: studentData, error: studentError } = await supabaseServer
    .from("students")
    .insert({
      class_id: classData.id,
      name,
    })
    .select("id, class_id, name")
    .single();

  if (studentError) {
    console.error("Failed to create student:", studentError);
    return jsonError(500, "JOIN_FAILED", "クラスへの参加に失敗しました。");
  }

  return Response.json(
    {
      student: {
        id: studentData.id,
        name: studentData.name,
      },
      class: {
        id: classData.id,
        code: classData.code,
        name: classData.name,
        teacherName: classData.teacher_name,
        grade: classData.grade,
        classSection: classData.class_section,
        lessonTheme: classData.lesson_theme,
        lessonDescription: classData.lesson_description,
      },
    },
    { status: 201 }
  );
}
