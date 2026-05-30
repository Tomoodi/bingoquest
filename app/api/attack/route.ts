import { supabaseServer } from "@/lib/supabase/server";

type AttackRequestBody = {
  classId?: unknown;
  studentId?: unknown;
};

type AttackErrorCode = "INVALID_JSON" | "INVALID_SESSION" | "ATTACK_FAILED";

type BossStateRow = {
  id: string;
  class_id: string;
  name: string;
  max_hp: number;
  current_hp: number;
};

function jsonError(
  status: number,
  code: AttackErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request) {
  let body: AttackRequestBody;

  try {
    body = (await request.json()) as AttackRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const classId = typeof body.classId === "string" ? body.classId : "";
  const studentId = typeof body.studentId === "string" ? body.studentId : "";

  if (!isUuid(classId) || !isUuid(studentId)) {
    return jsonError(400, "INVALID_SESSION", "ログイン情報が正しくありません。");
  }

  // 集計→消費→ボス HP 減少を原子的に行う RPC に委譲する。
  const { data, error } = await supabaseServer.rpc("attack_with_points", {
    p_class_id: classId,
    p_student_id: studentId,
  });

  if (error) {
    console.error("Failed to attack with points:", error);
    return jsonError(500, "ATTACK_FAILED", "攻撃に失敗しました。");
  }

  const boss = data as BossStateRow;

  return Response.json({
    boss: {
      id: boss.id,
      name: boss.name,
      maxHp: boss.max_hp,
      currentHp: boss.current_hp,
    },
    // 消費後なので貯蓄ポイントは 0 になる。
    accumulatedPoints: 0,
  });
}
