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

// デフォルトのボス画像（Supabase Storage の game-assets バケット）。
// seed と同じスライム画像を使う。AI 生成に置き換わるまでの既定値。
const bossAssetUrl = (file: string): string =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${file}`;

const DEFAULT_BOSS_IMAGE_URL = bossAssetUrl("slime.png");
const DEFAULT_BOSS_OVERKILL_IMAGE_URL = bossAssetUrl("slime-overkill.png");

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

  // boss_states.class_id は unique。既存があれば更新して冪等にする。
  // ボス生成時に既定のスライム画像URLを設定する（AI生成に置き換わるまでの既定値）。
  const { data: bossData, error: bossError } = await supabaseServer
    .from("boss_states")
    .upsert(
      {
        class_id: classId,
        image_url: DEFAULT_BOSS_IMAGE_URL,
        overkill_image_url: DEFAULT_BOSS_OVERKILL_IMAGE_URL,
      },
      { onConflict: "class_id" }
    )
    .select("id, class_id, name, max_hp, current_hp, image_url, overkill_image_url")
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
        imageUrl: bossData.image_url,
        overkillImageUrl: bossData.overkill_image_url,
      },
    },
    { status: 201 }
  );
}
