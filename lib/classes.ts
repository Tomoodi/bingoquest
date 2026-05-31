// クラス関連の共有ロジック（APIルート間で再利用）。

// カンマ/読点/改行区切りの文字列を単語配列に正規化する（空要素は除外）。
export function normalizeWords(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,、\n]/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && word.length <= 100)
    .slice(0, 50);
}
