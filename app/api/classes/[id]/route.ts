import { getAuthedUser } from "@/lib/supabase/auth";
import { normalizeWords } from "@/lib/classes";
import { supabaseServer } from "@/lib/supabase/server";

type UpdateClassRequestBody = {
  subject?: unknown;
  grade?: unknown;
  classSection?: unknown;
  lessonTheme?: unknown;
  lessonDescription?: unknown;
  teacherWords?: unknown;
};

type ClassItemErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_ID"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FETCH_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";

function jsonError(
  status: number,
  code: ClassItemErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function requiredText(value: unknown, maxLength = 100): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

// 対象クラスが本人（teacher_id）のものか確認する。
async function ownClassOrError(
  id: string,
  teacherId: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const { data, error } = await supabaseServer
    .from("classes")
    .select("id, teacher_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch class:", error);
    return {
      ok: false,
      response: jsonError(500, "FETCH_FAILED", "クラスの取得に失敗しました。"),
    };
  }

  if (!data || data.teacher_id !== teacherId) {
    return {
      ok: false,
      response: jsonError(404, "NOT_FOUND", "クラスが見つかりません。"),
    };
  }

  return { ok: true };
}

// 自分のクラス1件を取得する（編集画面の初期表示用）。
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/classes/[id]">
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError(400, "INVALID_ID", "クラスIDが正しくありません。");
  }

  const { data, error } = await supabaseServer
    .from("classes")
    .select(
      "id, code, name, grade, class_section, lesson_theme, lesson_description, teacher_words, teacher_name, created_at"
    )
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch class:", error);
    return jsonError(500, "FETCH_FAILED", "クラスの取得に失敗しました。");
  }

  if (!data) {
    return jsonError(404, "NOT_FOUND", "クラスが見つかりません。");
  }

  return Response.json({ class: data });
}

// 自分のクラスを編集する（クラスコードは変更不可）。
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/classes/[id]">
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError(400, "INVALID_ID", "クラスIDが正しくありません。");
  }

  const owned = await ownClassOrError(id, user.id);
  if (!owned.ok) return owned.response;

  let body: UpdateClassRequestBody;
  try {
    body = (await request.json()) as UpdateClassRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const subject = requiredText(body.subject);
  const grade = requiredText(body.grade);
  const classSection = requiredText(body.classSection);
  const lessonTheme = requiredText(body.lessonTheme);
  const lessonDescription = requiredText(body.lessonDescription, 1000);
  const teacherWords = normalizeWords(body.teacherWords);

  if (!subject || !grade || !classSection || !lessonTheme || !lessonDescription || !teacherWords) {
    return jsonError(400, "INVALID_INPUT", "入力内容が正しくありません。");
  }

  const { data, error } = await supabaseServer
    .from("classes")
    .update({
      name: subject,
      grade: grade,
      class_section: classSection,
      lesson_theme: lessonTheme,
      lesson_description: lessonDescription,
      teacher_words: teacherWords,
    })
    .eq("id", id)
    .eq("teacher_id", user.id)
    .select("id, code")
    .single();

  if (error) {
    console.error("Failed to update class:", error);
    return jsonError(500, "UPDATE_FAILED", "クラスの更新に失敗しました。");
  }

  return Response.json({ class: { id: data.id, code: data.code } });
}

// 自分のクラスを削除する（生徒・カード・ボス等は on delete cascade で連鎖削除）。
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/classes/[id]">
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "ログインが必要です。");
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError(400, "INVALID_ID", "クラスIDが正しくありません。");
  }

  const owned = await ownClassOrError(id, user.id);
  if (!owned.ok) return owned.response;

  const { error } = await supabaseServer
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    console.error("Failed to delete class:", error);
    return jsonError(500, "DELETE_FAILED", "クラスの削除に失敗しました。");
  }

  return Response.json({ ok: true });
}
