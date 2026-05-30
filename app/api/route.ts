import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabase } from "@/lib/supabase/client"

const genAI = new
  GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model:
  "gemini-1.5-flash" })

export async function POST(req: NextRequest) {
    const { studentWords, teacherWords, lesson_theme,
    lesson_description, class_id, student_id } = await
      req.json()
    
    const TotalNeeded = 24 - teacherWords.length - studentWords.length
    const prompt = `あなたは教育支援AIです。テーマが${lesson_theme}、概要が${lesson_description}の授業のビンゴカード用キーワードをあと${TotalNeeded}個生成してください。すでにあるキーワード:${[...studentWords, ...teacherWords].join(", ")} 条件：重複なし、授業で使われる専門用語中心、JOIN形式で {"words": ["単語1,...]}で返すこと`
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]
  ?? "{}")
    const allWords = [...studentWords, ...teacherWords,
    ...json.words]
    .sort(() => Math.random() - 0.5)
    .slice(0, 24)

    const { data: card } = await supabase
    .from("bingo_cards")
    .insert({ class_id, student_id, student_words:
    studentWords })
    .select()
    .single()

    const cells = Array.from({ length: 25 }, (_, i) => ({
    card_id: card.id,
    position: i,
    text: i === 12 ? "FREE" : allWords[i < 12 ? i : i - 1],
    is_free: i === 12,
  }))

  await supabase.from("bingo_cells").insert(cells)

  return NextResponse.json({card_id: card.id})
}

