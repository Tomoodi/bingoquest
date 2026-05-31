import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { supabase } from "@/lib/supabase/client"

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const body = await req.json()
    console.log("[generate-card] body:", JSON.stringify(body))
    const { studentWords, teacherWords, lesson_theme, lesson_description, class_id, student_id } = body

    const totalNeeded = 24 - (teacherWords?.length ?? 0) - (studentWords?.length ?? 0)
    const existingWords = [...(studentWords ?? []), ...(teacherWords ?? [])]

    const requestCount = totalNeeded + 10
    const prompt = `あなたは教育支援AIです。テーマが${lesson_theme}、概要が${lesson_description}の授業のビンゴカード用キーワードをちょうど${requestCount}個生成してください。必ず${requestCount}個生成すること。すでにあるキーワード:${existingWords.join(", ")} 条件：重複なし、授業で使われる専門用語中心、JSON形式で {"words": ["単語1","単語2",...]}のみ返すこと`

    console.log("[generate-card] calling Groq...")
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    })
    const text = completion.choices[0].message.content ?? "{}"
    console.log("[generate-card] Groq response:", text)

    const json = JSON.parse(text)

    const allWords = [...existingWords, ...(json.words ?? [])]
      .filter((w) => typeof w === "string" && w.trim() !== "")
      .sort(() => Math.random() - 0.5)
      .slice(0, 24)

    if (allWords.length < 24) {
      console.error("[generate-card] not enough words:", allWords.length)
      return NextResponse.json({ error: `AIが十分な単語を生成できませんでした（${allWords.length}/24）。もう一度お試しください。` }, { status: 500 })
    }

    console.log("[generate-card] upserting card...")
    const { data: card, error: cardError } = await supabase
      .from("bingo_cards")
      .upsert(
        { class_id, student_id, student_words: studentWords ?? [] },
        { onConflict: "student_id,class_id" }
      )
      .select()
      .single()

    if (cardError || !card) {
      console.error("[generate-card] card upsert error:", cardError)
      return NextResponse.json({ error: cardError?.message ?? "card upsert failed" }, { status: 500 })
    }

    await supabase.from("bingo_cells").delete().eq("card_id", card.id)

    const cells = Array.from({ length: 25 }, (_, i) => ({
      card_id: card.id,
      position: i,
      text: i === 12 ? "FREE" : allWords[i < 12 ? i : i - 1],
      is_free: i === 12,
    }))

    const { error: cellsError } = await supabase.from("bingo_cells").insert(cells)

    if (cellsError) {
      console.error("[generate-card] cells insert error:", cellsError)
      return NextResponse.json({ error: cellsError.message }, { status: 500 })
    }

    return NextResponse.json({ card_id: card.id })
  } catch (e) {
    console.error("[generate-card] unexpected error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
