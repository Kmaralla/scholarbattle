import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

async function callAI(prompt: string): Promise<string> {
  // Default to OpenAI; fall back to Anthropic
  if (openai) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.choices[0].message.content?.trim() ?? ''
  }

  if (anthropic) {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    return ((res.content[0] as any).text ?? '').trim()
  }

  throw new Error('No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.')
}

export async function POST(req: NextRequest) {
  try {
    const { subject, grade, myScore, totalQuestions, results } = await req.json()

    const wrongQuestions = results
      .filter((r: any) => !r.isCorrect)
      .map((r: any) => `- "${r.question.question_text}" (you answered: "${r.userAnswer || 'no answer'}", correct: "${r.question.correct_answer}")`)
      .join('\n')

    const pct = Math.round((myScore / totalQuestions) * 100)

    const prompt = `You are a friendly, encouraging tutor giving a student their battle report card on ScholarBattle, an educational game for kids.

Subject: ${subject} | Grade: ${grade} | Score: ${myScore}/${totalQuestions} (${pct}%)

${wrongQuestions.length > 0 ? `Questions they got wrong:\n${wrongQuestions}` : 'They got every question right!'}

Write a short, fun, kid-friendly report card with EXACTLY this JSON format (no markdown, just JSON):
{
  "grade": "<letter grade: A+, A, B+, B, C+, C, D, or F>",
  "headline": "<one exciting sentence about their performance, max 10 words>",
  "crushed": ["<specific thing they did well>", "<another strength>"],
  "awesome": "<one standout thing that was impressive>",
  "workOn": ["<specific topic/concept from their wrong answers to practice>", "<another if applicable>"],
  "tip": "<one concrete, actionable study tip based on what they got wrong, max 2 sentences>"
}

Rules:
- Be enthusiastic and encouraging even for low scores
- Reference the actual subject and specific topics from their wrong answers
- Keep language simple for kids (grades 1-12)
- If they got 100%, make workOn an empty array and tip something like "Keep challenging yourself!"
- Max 2 items in crushed and workOn arrays`

    let text = await callAI(prompt)
    // Strip markdown code fences if model wrapped the JSON
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const json = JSON.parse(text)
    return NextResponse.json(json)
  } catch (err: any) {
    console.error('[report-card] Error:', err?.message ?? err)
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
