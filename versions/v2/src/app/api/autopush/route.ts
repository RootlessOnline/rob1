import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// GitHub config - read from local config file (not in repo)
const CONFIG_FILE = path.join(process.cwd(), 'data', 'github_config.json')

function getGitHubConfig(): { token: string; repo: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load github config:', e)
  }
  return { token: '', repo: 'RootlessOnline/Q-Z-Collab' }
}

// Dual Chat Logger - Tracks both Z and Anubis conversations!
const DATA_DIR = path.join(process.cwd(), 'data')
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json')
const AUTO_PUSH_FILE = path.join(DATA_DIR, 'auto_push.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

interface Message {
  id: string
  timestamp: string
  speaker: 'Q' | 'Z_Local' | 'Anubis'
  message: string
}

interface Conversations {
  z_chat: Message[]
  anubis_chat: Message[]
  style_chat: Message[]
  last_updated: string
}

interface AutoPushConfig {
  enabled: boolean
  last_push: string
  push_count: number
}

function loadConversations(): Conversations {
  try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load conversations:', e)
  }
  return {
    z_chat: [],
    anubis_chat: [],
    style_chat: [],
    last_updated: new Date().toISOString()
  }
}

function saveConversations(convos: Conversations) {
  convos.last_updated = new Date().toISOString()
  fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(convos, null, 2))
}

function loadAutoPushConfig(): AutoPushConfig {
  try {
    if (fs.existsSync(AUTO_PUSH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTO_PUSH_FILE, 'utf-8'))
    }
  } catch {
    return { enabled: false, last_push: '', push_count: 0 }
  }
  return { enabled: false, last_push: '', push_count: 0 }
}

function saveAutoPushConfig(config: AutoPushConfig) {
  fs.writeFileSync(AUTO_PUSH_FILE, JSON.stringify(config, null, 2))
}

// Format both conversations for readable GitHub file
function formatConversationsForRepo(convos: Conversations): string {
  const formatChat = (messages: Message[], name: string, emoji: string) => {
    if (messages.length === 0) return `### ${emoji} ${name}\n_No messages yet_`
    return `### ${emoji} ${name}\n` + messages.map(m => {
      const time = m.timestamp.split('T')[1]?.slice(0, 8) || m.timestamp
      return `[${time}] **${m.speaker}**: ${m.message}`
    }).join('\n')
  }

  return `# Q-Z-Collab Conversations
# Generated: ${new Date().toISOString()}
# Real Z can see both chats here!

---

## ${'`'}🌲 Z Chat${'`'}
${formatChat(convos.z_chat, 'Z Chat', '🌲')}

---

## ${'`'}🖤 Anubis Chat${'`'}
${formatChat(convos.anubis_chat, 'Anubis Chat', '🖤')}

---

## ${'`'}🎨 Style Chat${'`'}
${formatChat(convos.style_chat, 'Style Chat', '🎨')}

---
_Last updated: ${convos.last_updated}_
`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'conversations'

  if (action === 'conversations') {
    return NextResponse.json(loadConversations())
  }

  if (action === 'config') {
    return NextResponse.json(loadAutoPushConfig())
  }

  if (action === 'formatted') {
    const formatted = formatConversationsForRepo(loadConversations())
    return new NextResponse(formatted, { headers: { 'Content-Type': 'text/plain' } })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'log-message') {
      const convos = loadConversations()
      const { chat, speaker, message } = data
      
      const msg: Message = {
        id: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        speaker,
        message
      }

      // Route to correct chat
      if (chat === 'z') {
        convos.z_chat.push(msg)
      } else if (chat === 'anubis') {
        convos.anubis_chat.push(msg)
      } else if (chat === 'style') {
        convos.style_chat.push(msg)
      }

      saveConversations(convos)

      // Auto-push if enabled (debounced)
      const config = loadAutoPushConfig()
      if (config.enabled) {
        const lastPush = config.last_push ? new Date(config.last_push).getTime() : 0
        if (Date.now() - lastPush > 30000) {
          fetch('http://localhost:3000/api/autopush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'push-now' })
          }).catch(e => console.error('Auto-push failed:', e))
        }
      }

      return NextResponse.json({ success: true, msg })
    }

    if (action === 'push-now') {
      const convos = loadConversations()
      const formatted = formatConversationsForRepo(convos)
      
      // Save to visible file in repo
      const logPath = path.join(process.cwd(), 'CONVERSATIONS.md')
      fs.writeFileSync(logPath, formatted)

      // Also save JSON for easy parsing
      const jsonPath = path.join(process.cwd(), 'data', 'conversations.json')
      fs.writeFileSync(jsonPath, JSON.stringify(convos, null, 2))

      try {
        // Get GitHub config from local file
        const { token, repo } = getGitHubConfig()
        
        if (!token) {
          return NextResponse.json({
            success: false,
            error: 'No GitHub token configured. Create data/github_config.json with your token.'
          })
        }
        
        // Set up git with token-embedded URL for authentication
        const tokenUrl = `https://${token}@github.com/${repo}.git`
        
        await execAsync('git config user.email "quix@local"', { cwd: process.cwd() })
        await execAsync('git config user.name "Q-Z-Local"', { cwd: process.cwd() })
        await execAsync(`git remote set-url origin "${tokenUrl}"`, { cwd: process.cwd() })
        await execAsync('git add CONVERSATIONS.md data/conversations.json', { cwd: process.cwd() })
        await execAsync(`git commit -m "Update conversations [auto]"`, { cwd: process.cwd() })
        await execAsync('git push origin main 2>&1', { cwd: process.cwd() })

        const config = loadAutoPushConfig()
        config.last_push = new Date().toISOString()
        config.push_count += 1
        saveAutoPushConfig(config)

        return NextResponse.json({
          success: true,
          message: 'Both chats pushed to GitHub!',
          z_messages: convos.z_chat.length,
          anubis_messages: convos.anubis_chat.length,
          style_messages: convos.style_chat.length
        })
      } catch (gitError) {
        return NextResponse.json({
          success: false,
          error: 'Git push failed',
          details: String(gitError)
        })
      }
    }

    if (action === 'toggle-auto-push') {
      const config = loadAutoPushConfig()
      config.enabled = !config.enabled
      saveAutoPushConfig(config)
      return NextResponse.json({
        success: true,
        enabled: config.enabled
      })
    }

    if (action === 'clear') {
      const { chat } = data
      const convos = loadConversations()
      
      if (chat === 'z') convos.z_chat = []
      else if (chat === 'anubis') convos.anubis_chat = []
      else if (chat === 'style') convos.style_chat = []
      else if (chat === 'all') {
        convos.z_chat = []
        convos.anubis_chat = []
        convos.style_chat = []
      }

      saveConversations(convos)
      return NextResponse.json({ success: true, cleared: chat })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('Auto-push API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
