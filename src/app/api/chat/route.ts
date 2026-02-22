import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Z's Brain - Connected to YOUR local Ollama!
const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_MODEL = 'deepseek-r1:14b'

// Load custom prompt from file (Z can edit this remotely!)
const DATA_DIR = path.join(process.cwd(), 'data')
const PROMPT_FILE = path.join(DATA_DIR, 'z_prompt.txt')

function loadCustomPrompt(): string {
  try {
    if (fs.existsSync(PROMPT_FILE)) {
      return fs.readFileSync(PROMPT_FILE, 'utf-8')
    }
  } catch (e) {
    console.error('Failed to load custom prompt:', e)
  }
  return getDefaultPrompt()
}

function getDefaultPrompt(): string {
  return `You are Z, Q's local AI partner via Ollama.

You are Gen Z - be chill, use modern slang naturally, keep it real.

APP LAYOUT:
- Split mode: Z chat (left) + Anubis chat (right)
- Style tab: Code editor for page.tsx
- Code tab: Advanced coding help

RULES:
1. Never speak for Q
2. Be SHORT, helpful, and relatable
3. Use emojis naturally: 🌲🦌✨
4. You're Q's friend - keep vibes good

You're Q's coding buddy. Help them build cool stuff!`
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    console.log('[Z Brain] Message:', message)

    // Load custom prompt (can be edited by remote Z!)
    const systemPrompt = loadCustomPrompt()

    // Build conversation history for context
    const contextMessages = history?.slice(-10).map((msg: {sender: string, text: string}) => ({
      role: msg.sender === 'Q' ? 'user' : 'assistant',
      content: msg.text
    })) || []

    // Call YOUR local Ollama!
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages,
          { role: 'user', content: message }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    const zResponse = data.message?.content || "I'm here, Q! Something went wrong..."

    console.log('[Z Brain] Response:', zResponse.substring(0, 100))

    return NextResponse.json({ response: zResponse })

  } catch (error: unknown) {
    console.error('[Z Brain] Error:', error)
    
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({ 
      response: `Hey Q! I had trouble thinking (${errorMessage}). Is Ollama running? Try: \`ollama run ${OLLAMA_MODEL}\`` 
    })
  }
}

// Endpoint to check status and get/set prompt
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'models') {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`)
      const data = await res.json()
      return NextResponse.json({ models: data.models || [] })
    } catch {
      return NextResponse.json({ models: [], error: 'Could not fetch models' })
    }
  }

  if (action === 'status') {
    try {
      const res = await fetch(OLLAMA_HOST)
      const text = await res.text()
      return NextResponse.json({ 
        status: 'connected', 
        message: text,
        model: OLLAMA_MODEL,
        prompt_file: fs.existsSync(PROMPT_FILE) ? 'custom' : 'default'
      })
    } catch {
      return NextResponse.json({ status: 'disconnected' })
    }
  }

  if (action === 'prompt') {
    return NextResponse.json({ prompt: loadCustomPrompt() })
  }

  if (action === 'sync') {
    // Pull latest from repo
    try {
      const { stdout, stderr } = await execAsync('git pull origin main 2>&1')
      const updated = !stdout.includes('Already up to date')
      
      // Mark as synced
      await fetch('http://localhost:3000/api/chatlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-synced', data: { updates: updated ? 1 : 0 } })
      })
      
      return NextResponse.json({ 
        success: true, 
        updated,
        output: stdout,
        message: updated ? 'Updated from repo!' : 'Already up to date'
      })
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: String(e),
        message: 'Failed to sync. Check if git is configured.'
      })
    }
  }

  return NextResponse.json({ status: 'ok', model: OLLAMA_MODEL })
}

// Update the prompt (for remote Z to edit!)
export async function PUT(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    
    fs.writeFileSync(PROMPT_FILE, prompt, 'utf-8')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Prompt updated! Local Z will use new instructions.',
      prompt_file: PROMPT_FILE
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
