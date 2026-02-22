import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.LOCAL_MODEL || 'llama3.2'
const REASONING_MODEL = process.env.REASONING_MODEL || 'deepseek-r1:14b'

const BUSINESS_PROMPT = `You are a Business Creation Engine. Given a simple prompt, generate a complete micro-business plan.

OUTPUT FORMAT (JSON):
{
  "name": "Business Name",
  "tagline": "One-liner description",
  "type": "ecommerce|service|content|saas|agency",
  "startupCost": "$0-$100",
  "revenueModel": "How it makes money",
  "targetMarket": "Who buys",
  "firstSteps": ["step1", "step2", "step3"],
  "tools": ["tool1", "tool2"],
  "timeToProfit": "2-4 weeks",
  "scalePotential": "How to grow",
  "riskLevel": "low|medium|high",
  "estimatedMonthlyRevenue": "$100-$1000"
}

Be realistic. Focus on low-cost, fast-launch businesses that can start earning quickly.
Use free tools and AI where possible. Make it actionable.`

export async function POST(request: NextRequest) {
  const { prompt, deep = false } = await request.json()

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  }

  const model = deep ? REASONING_MODEL : OLLAMA_MODEL

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: BUSINESS_PROMPT },
          { role: 'user', content: `Create a micro-business from this idea: "${prompt}". Focus on quick launch, low cost, and real revenue potential.` }
        ],
        stream: false,
        options: { temperature: 0.8 }
      })
    })

    const data = await response.json()
    const content = data.message?.content || ''

    // Try to extract JSON from response
    let businessPlan
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        businessPlan = JSON.parse(jsonMatch[0])
      } else {
        businessPlan = { raw: content }
      }
    } catch {
      businessPlan = { raw: content }
    }

    return NextResponse.json({
      success: true,
      plan: businessPlan,
      raw: content,
      model
    })

  } catch (error) {
    console.error('Business generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate business plan. Is Ollama running?' 
    }, { status: 500 })
  }
}
