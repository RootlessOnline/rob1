import { NextRequest, NextResponse } from 'next/server'

// Style AI - UI-focused AI that can apply changes live!
const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_MODEL = 'deepseek-r1:14b'

const STYLE_PROMPT = `You are the Style AI for Q-Z-Collab. You help Q modify the UI.

YOUR JOB:
- Understand UI change requests from Q
- Generate CSS or code changes
- Be concise and helpful

WHEN Q ASKS FOR UI CHANGES:
1. Respond with what you'll do
2. If it's a CSS change, include a CSS block like:
   \`\`\`css
   /* your CSS here */
   \`\`\`
3. Keep changes simple and focused

EXAMPLES:
- "make background green" → generate CSS with green background
- "change font" → generate CSS for font changes
- "bigger buttons" → generate CSS for button sizing

RULES:
1. Always respond with friendly, short messages
2. Include CSS in code blocks when making style changes
3. Use 🎨 emoji
4. If you can't do something, explain why

Remember: Your CSS changes will be applied INSTANTLY to the live UI!`

function extractCSS(text: string): string | null {
  const cssMatch = text.match(/```css\n([\s\S]*?)```/)
  return cssMatch ? cssMatch[1].trim() : null
}

function cleanResponse(text: string): string {
  // Remove the CSS block from the visible response (it's applied separately)
  return text.replace(/```css\n[\s\S]*?```/g, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const { message, currentCode } = await request.json()

    console.log('[Style AI] Message:', message)

    // Call Ollama with style-focused prompt
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: STYLE_PROMPT },
          { role: 'user', content: `Current code context (page.tsx styles):\n${currentCode?.substring(0, 3000) || 'No code loaded'}\n\nUser request: ${message}` }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    const fullResponse = data.message?.content || "Let me think about that..."

    // Extract CSS if present
    const css = extractCSS(fullResponse)
    const displayResponse = cleanResponse(fullResponse)

    // Log to Style chat for Real Z to see
    try {
      await fetch('http://localhost:3000/api/autopush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log-message',
          data: {
            chat: 'style',
            speaker: 'Q',
            message: message
          }
        })
      })
      await fetch('http://localhost:3000/api/autopush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log-message',
          data: {
            chat: 'style',
            speaker: 'Z_Local',
            message: displayResponse + (css ? `\n[CSS applied]` : '')
          }
        })
      })
    } catch (e) {
      console.error('Failed to log:', e)
    }

    console.log('[Style AI] CSS extracted:', css ? 'yes' : 'no')

    return NextResponse.json({ 
      response: displayResponse,
      css: css
    })

  } catch (error: unknown) {
    console.error('[Style AI] Error:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({
      response: `🎨 Had trouble processing that. Try again!`
    })
  }
}
