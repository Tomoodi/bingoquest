// ビンゴ盤の共有ロジック。クライアント（演出判定）とサーバ（API のポイント計算）の
// 双方から使い、ビンゴ判定・リーチ判定・ポイント計算の実装を 1 か所に集約する。
//
// マスの位置は DB の bingo_cells.position に合わせて position 0-24 で統一する。
// 中央の FREE マスは position 12。

export const FREE_POSITION = 12;

// 全 12 パターンのビンゴライン（position 0-24）。横 5・縦 5・斜め 2。
export const BINGO_LINES: number[][] = [
  // 横
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // 縦
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // 斜め
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

// ポイント定義（調整可）。
export const CELL_OPEN_POINTS = 10; // 1 マス開放の基本ポイント
export const REACH_POINTS = 50; // 1 ラインがリーチになったときのポイント

// ライン内で開いているマス数を数える。FREE マスは常に開いている扱い。
function openCountInLine(line: number[], openedPositions: Set<number>): number {
  return line.reduce(
    (count, position) =>
      position === FREE_POSITION || openedPositions.has(position)
        ? count + 1
        : count,
    0
  );
}

// 揃っている（5/5）ラインの index 配列を返す。
export function completedLines(openedPositions: Set<number>): number[] {
  return BINGO_LINES.reduce<number[]>((indexes, line, index) => {
    if (openCountInLine(line, openedPositions) === BINGO_LINES[index].length) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

// リーチ（あと 1 マスでビンゴ = 4/5）のラインの index 配列を返す。
// ビンゴ済み（5/5）のラインはリーチには含めない。
export function reachLines(openedPositions: Set<number>): number[] {
  return BINGO_LINES.reduce<number[]>((indexes, line, index) => {
    if (openCountInLine(line, openedPositions) === line.length - 1) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

// 今回新たに揃ったライン数に応じたビンゴボーナス。
// 1 ライン: 150、複数同時: 250 × ライン数。
export function bingoBonus(newLineCount: number): number {
  if (newLineCount <= 0) {
    return 0;
  }
  return newLineCount === 1 ? 150 : newLineCount * 250;
}

// 今回新たにリーチになったライン数に応じたリーチボーナス。
export function reachBonus(newReachCount: number): number {
  return newReachCount > 0 ? newReachCount * REACH_POINTS : 0;
}
