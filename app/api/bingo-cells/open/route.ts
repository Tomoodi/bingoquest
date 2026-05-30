import { supabaseServer } from "@/lib/supabase/server";
import {
  CELL_OPEN_POINTS,
  bingoBonus,
  completedLines,
  reachBonus,
  reachLines,
} from "@/lib/bingo";

type OpenCellRequestBody = {
  classId?: unknown;
  studentId?: unknown;
  cardId?: unknown;
  position?: unknown;
};

type OpenCellErrorCode =
  | "INVALID_JSON"
  | "INVALID_SESSION"
  | "INVALID_POSITION"
  | "CARD_NOT_FOUND"
  | "CELL_NOT_FOUND"
  | "FETCH_FAILED"
  | "SAVE_FAILED";

type DbCellState = {
  position: number;
  is_free: boolean;
  is_opened: boolean;
};

function jsonError(
  status: number,
  code: OpenCellErrorCode,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// 開いているマス（is_opened もしくは FREE）の position 集合を作る。
function openedPositionSet(cells: DbCellState[]): Set<number> {
  const set = new Set<number>();
  for (const cell of cells) {
    if (cell.is_opened || cell.is_free) {
      set.add(cell.position);
    }
  }
  return set;
}

// 当該生徒の未使用ポイント合計を集計する。
async function fetchAccumulatedPoints(
  studentId: string
): Promise<number | null> {
  const { data, error } = await supabaseServer
    .from("point_events")
    .select("points")
    .eq("student_id", studentId)
    .is("consumed_at", null);

  if (error) {
    console.error("Failed to sum accumulated points:", error);
    return null;
  }

  return (data ?? []).reduce(
    (total, row) => total + (row.points as number),
    0
  );
}

export async function POST(request: Request) {
  let body: OpenCellRequestBody;

  try {
    body = (await request.json()) as OpenCellRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const classId = typeof body.classId === "string" ? body.classId : "";
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const cardId = typeof body.cardId === "string" ? body.cardId : "";
  const position = body.position;

  if (!isUuid(classId) || !isUuid(studentId) || !isUuid(cardId)) {
    return jsonError(400, "INVALID_SESSION", "ログイン情報が正しくありません。");
  }

  if (
    typeof position !== "number" ||
    !Number.isInteger(position) ||
    position < 0 ||
    position > 24
  ) {
    return jsonError(400, "INVALID_POSITION", "マスの位置が正しくありません。");
  }

  // カードが当該クラス・生徒のものか検証する。
  const { data: cardData, error: cardError } = await supabaseServer
    .from("bingo_cards")
    .select("id")
    .eq("id", cardId)
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (cardError) {
    console.error("Failed to verify bingo card:", cardError);
    return jsonError(500, "FETCH_FAILED", "ビンゴカードの確認に失敗しました。");
  }

  if (!cardData) {
    return jsonError(404, "CARD_NOT_FOUND", "ビンゴカードが見つかりません。");
  }

  // 開放前の全マス状態を取得する。
  const { data: cellsBefore, error: cellsError } = await supabaseServer
    .from("bingo_cells")
    .select("position, is_free, is_opened")
    .eq("card_id", cardId);

  if (cellsError) {
    console.error("Failed to fetch bingo cells:", cellsError);
    return jsonError(500, "FETCH_FAILED", "ビンゴカードのマス取得に失敗しました。");
  }

  const cells = (cellsBefore ?? []) as DbCellState[];
  const targetCell = cells.find((cell) => cell.position === position);

  if (!targetCell) {
    return jsonError(404, "CELL_NOT_FOUND", "対象のマスが見つかりません。");
  }

  // FREE もしくは既に開いている場合は二重加点せず、現在値を返す（冪等）。
  if (targetCell.is_free || targetCell.is_opened) {
    const accumulatedPoints = await fetchAccumulatedPoints(studentId);
    if (accumulatedPoints === null) {
      return jsonError(500, "FETCH_FAILED", "ポイントの集計に失敗しました。");
    }
    const openedBefore = openedPositionSet(cells);
    return Response.json({
      accumulatedPoints,
      newBingoLineCount: 0,
      newReachCount: 0,
      totalBingoLineCount: completedLines(openedBefore).length,
    });
  }

  // 開放前後のライン状態を計算する。
  const openedBefore = openedPositionSet(cells);
  const completedBefore = new Set(completedLines(openedBefore));
  const reachBefore = new Set(reachLines(openedBefore));

  const openedAfter = new Set(openedBefore);
  openedAfter.add(position);
  const completedAfter = completedLines(openedAfter);
  const reachAfter = reachLines(openedAfter);

  const newBingoLineCount = completedAfter.filter(
    (index) => !completedBefore.has(index)
  ).length;
  const newReachCount = reachAfter.filter(
    (index) => !reachBefore.has(index)
  ).length;

  // マスを開放する（未開放の場合のみ）。
  const { error: updateError } = await supabaseServer
    .from("bingo_cells")
    .update({ is_opened: true, opened_at: new Date().toISOString() })
    .eq("card_id", cardId)
    .eq("position", position)
    .eq("is_opened", false);

  if (updateError) {
    console.error("Failed to open bingo cell:", updateError);
    return jsonError(500, "SAVE_FAILED", "マスの開放に失敗しました。");
  }

  // 獲得イベントを未使用（consumed_at = null）で挿入する。
  const events: {
    class_id: string;
    student_id: string;
    card_id: string;
    event_type: string;
    points: number;
  }[] = [
    {
      class_id: classId,
      student_id: studentId,
      card_id: cardId,
      event_type: "cell_opened",
      points: CELL_OPEN_POINTS,
    },
  ];

  if (newReachCount > 0) {
    events.push({
      class_id: classId,
      student_id: studentId,
      card_id: cardId,
      event_type: "reach",
      points: reachBonus(newReachCount),
    });
  }

  if (newBingoLineCount > 0) {
    events.push({
      class_id: classId,
      student_id: studentId,
      card_id: cardId,
      event_type: "bingo",
      points: bingoBonus(newBingoLineCount),
    });
  }

  const { error: insertError } = await supabaseServer
    .from("point_events")
    .insert(events);

  if (insertError) {
    console.error("Failed to insert point events:", insertError);
    return jsonError(500, "SAVE_FAILED", "ポイントの記録に失敗しました。");
  }

  const accumulatedPoints = await fetchAccumulatedPoints(studentId);
  if (accumulatedPoints === null) {
    return jsonError(500, "FETCH_FAILED", "ポイントの集計に失敗しました。");
  }

  return Response.json({
    accumulatedPoints,
    newBingoLineCount,
    newReachCount,
    totalBingoLineCount: completedAfter.length,
  });
}
