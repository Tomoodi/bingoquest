import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const COOLDOWN_MS = 30_000

export async function POST(req: NextRequest) {
  try {
    const { word, lesson_theme, lesson_description } = await req.json()

    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `授業テーマ「${lesson_theme}」（${lesson_description}）の授業に登場する「${word}」について、生徒向けの簡単な4択クイズを1問作ってください。
「${word}」の意味や使い方を問う問題にしてください。
JSON形式のみで返してください:
{"question": "問題文", "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"], "answerIndex": 0}
answerIndexは正解の選択肢のインデックス（0〜3）です。`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    })

    const json = JSON.parse(completion.choices[0].message.content ?? "{}")

    if (!json.question || !Array.isArray(json.options) || json.options.length !== 4 || json.answerIndex === undefined) {
      return NextResponse.json({ error: "クイズの生成に失敗しました。もう一度お試しください。" }, { status: 500 })
    }

    return NextResponse.json({
      question: json.question,
      options: json.options,
      answerIndex: json.answerIndex,
      cooldownMs: COOLDOWN_MS,
    })
  } catch (e) {
    console.error("[generate-quiz] error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
