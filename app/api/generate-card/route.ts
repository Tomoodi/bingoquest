import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new
  GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model:
  "gemini-1.5-flash" })

export async function POST(req: NextRequest) {
    const { lesson_theme, lesson_description } = await
  req.json()
    const prompt = `あなたは教育支援AIです。テーマが${lesson_theme}、概要が${lesson_description}の授業の1問1答の問題を作成してください。`
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const json = JSON.parse(text?.[0])

  return NextResponse.json(json)
}