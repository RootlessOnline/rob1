import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Chat Logger - Saves conversations for Z (the real one) to review
const DATA_DIR = path.join(process.cwd(), 'data')
const CHAT_LOG_FILE = path.join(DATA_DIR, 'chat_log.json')
const SYNC_FILE = path.join(DATA_DIR, 'sync_status.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

interface ChatEntry {
  id: string
  timestamp: string
  speaker: 'Q' | 'Z_Local'
  message: string
  context?: string
  rating?: 'good' | 'bad' | 'needs_improvement'
  feedback?: string
}

interface ChatLog {
  session_id: string
  started: string
  entries: ChatEntry[]
  last_sync: string
  pending_review: boolean
}

function loadChatLog(): ChatLog {
  try {
    if (fs.existsSync(CHAT_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load chat log:', e)
  }
  return {
    session_id: `session_${Date.now()}`,
    started: new Date().toISOString(),
    entries: [],
    last_sync: new Date().toISOString(),
    pending_review: false
  }
}

function saveChatLog(log: ChatLog) {
  try {
    fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(log, null, 2))
  } catch (e) {
    console.error('Failed to save chat log:', e)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'log'

  if (action === 'log') {
    const log = loadChatLog()
    return NextResponse.json(log)
  }

  if (action === 'sync-status') {
    try {
      if (fs.existsSync(SYNC_FILE)) {
        return NextResponse.json(JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8')))
      }
    } catch (e) {
      console.error('Failed to load sync status:', e)
    }
    return NextResponse.json({ 
      last_sync: new Date().toISOString(),
      updates_available: false,
      version: '1.0.0'
    })
  }

  if (action === 'pending-review') {
    const log = loadChatLog()
    const pending = log.entries.filter(e => !e.rating)
    return NextResponse.json({ 
      pending_count: pending.length,
      pending: pending 
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'log-message') {
      const log = loadChatLog()
      const entry: ChatEntry = {
        id: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        speaker: data.speaker,
        message: data.message,
        context: data.context
      }
      log.entries.push(entry)
      log.pending_review = true
      saveChatLog(log)
      return NextResponse.json({ success: true, entry })
    }

    if (action === 'rate-response') {
      const log = loadChatLog()
      const entry = log.entries.find(e => e.id === data.id)
      if (entry) {
        entry.rating = data.rating
        entry.feedback = data.feedback
        saveChatLog(log)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (action === 'mark-synced') {
      const log = loadChatLog()
      log.last_sync = new Date().toISOString()
      log.pending_review = false
      saveChatLog(log)
      
      fs.writeFileSync(SYNC_FILE, JSON.stringify({
        last_sync: new Date().toISOString(),
        updates_applied: data?.updates || 0,
        version: data?.version || '1.0.0'
      }, null, 2))
      
      return NextResponse.json({ success: true, last_sync: log.last_sync })
    }

    if (action === 'new-session') {
      const newLog: ChatLog = {
        session_id: `session_${Date.now()}`,
        started: new Date().toISOString(),
        entries: [],
        last_sync: new Date().toISOString(),
        pending_review: false
      }
      saveChatLog(newLog)
      return NextResponse.json({ success: true, session: newLog })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('Chat log API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
