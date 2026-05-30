import { supabaseServer } from "@/lib/supabase/server";

type BingoCellInput = {
  position?: unknown;
  text?: unknown;
  isFree?: unknown;
};

type CreateBingoCardRequestBody = {
  classId?: unknown;
  studentId?: unknown;
  cells?: unknown;
};

type CreateBingoCardErrorCode =
  | "INVALID_JSON"
  | "INVALID_SESSION"
  | "INVALID_CELLS"
  | "STUDENT_NOT_FOUND"
  | "SAVE_FAILED";

function jsonError(
  status: number,
  code: CreateBingoCardErrorCode,
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseCells(cells: unknown) {
  if (!Array.isArray(cells) || cells.length !== 25) {
    return null;
  }

  const parsedCells = cells.map((cell) => {
    const input = cell as BingoCellInput;
    const position = input.position;
    const text = typeof input.text === "string" ? input.text.trim() : "";
    const isFree = input.isFree === true;

    if (
      typeof position !== "number" ||
      !Number.isInteger(position) ||
      position < 0 ||
      position > 24
    ) {
      return null;
    }

    if (!isFree && (text.length === 0 || text.length > 30)) {
      return null;
    }

    return {
      position,
      text: isFree ? "FREE" : text,
      is_free: isFree,
      is_opened: isFree,
      opened_at: isFree ? new Date().toISOString() : null,
    };
  });

  if (parsedCells.some((cell) => cell === null)) {
    return null;
  }

  const positions = new Set(parsedCells.map((cell) => cell?.position));

  if (positions.size !== 25) {
    return null;
  }

  const freeCell = parsedCells.find((cell) => cell?.is_free);

  if (!freeCell || freeCell.position !== 12) {
    return null;
  }

  return parsedCells;
}

export async function POST(request: Request) {
  let body: CreateBingoCardRequestBody;

  try {
    body = (await request.json()) as CreateBingoCardRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "リクエストの形式が正しくありません。");
  }

  const classId = typeof body.classId === "string" ? body.classId : "";
  const studentId = typeof body.studentId === "string" ? body.studentId : "";

  if (!isUuid(classId) || !isUuid(studentId)) {
    return jsonError(400, "INVALID_SESSION", "ログイン情報が正しくありません。");
  }

  const cells = parseCells(body.cells);

  if (!cells) {
    return jsonError(400, "INVALID_CELLS", "ビンゴカードの入力内容が正しくありません。");
  }

  const { data: studentData, error: studentError } = await supabaseServer
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("class_id", classId)
    .maybeSingle();

  if (studentError) {
    console.error("Failed to verify student:", studentError);
    return jsonError(500, "SAVE_FAILED", "生徒情報の確認に失敗しました。");
  }

  if (!studentData) {
    return jsonError(404, "STUDENT_NOT_FOUND", "生徒情報が見つかりません。");
  }

  const { data: cardData, error: cardError } = await supabaseServer
    .from("bingo_cards")
    .upsert(
      {
        class_id: classId,
        student_id: studentId,
      },
      { onConflict: "student_id,class_id" }
    )
    .select("id")
    .single();

  if (cardError) {
    console.error("Failed to upsert bingo card:", cardError);
    return jsonError(500, "SAVE_FAILED", "ビンゴカードの保存に失敗しました。");
  }

  const cellsToSave = cells.map((cell) => ({
    ...cell,
    card_id: cardData.id,
  }));

  const { error: cellsError } = await supabaseServer
    .from("bingo_cells")
    .upsert(cellsToSave, { onConflict: "card_id,position" });

  if (cellsError) {
    console.error("Failed to upsert bingo cells:", cellsError);
    return jsonError(500, "SAVE_FAILED", "ビンゴカードのマス保存に失敗しました。");
  }

  return Response.json(
    {
      card: {
        id: cardData.id,
      },
    },
    { status: 201 }
  );
}
