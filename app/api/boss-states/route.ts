import { supabaseServer } from "@/lib/supabase/server";

type CreateBossRequestBody = {
  classId?: unknown;
};

type CreateBossErrorCode =
  | "INVALID_JSON"
  | "INVALID_CLASS_ID"
  | "CREATE_FAILED";

function jsonError(
  status: number,
  code: CreateBossErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// 指定クラスのボスを作成する。クラス作成後にフロントから続けて呼ぶ想定。
export async function POST(request: Request) {
  let body: CreateBossRequestBody;

  try {
    body = (await request.json()) as CreateBossRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const classId = typeof body.classId === "string" ? body.classId : "";

  if (!isUuid(classId)) {
    return jsonError(400, "INVALID_CLASS_ID", "クラスIDが正しくありません。");
  }

  // boss_states.class_id は unique。既に存在する場合は競合を無視して冪等にする。
  const { data: bossData, error: bossError } = await supabaseServer
    .from("boss_states")
    .upsert({ class_id: classId }, { onConflict: "class_id" })
    .select("id, class_id, name, max_hp, current_hp")
    .single();

  if (bossError) {
    console.error("Failed to create boss state:", bossError);
    return jsonError(500, "CREATE_FAILED", "ボスの初期化に失敗しました。");
  }

  return Response.json(
    {
      boss: {
        id: bossData.id,
        classId: bossData.class_id,
        name: bossData.name,
        maxHp: bossData.max_hp,
        currentHp: bossData.current_hp,
      },
    },
    { status: 201 }
  );
}
