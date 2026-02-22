import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const Z_CONTEXT_FILE = path.join(DATA_DIR, 'z_context.json')

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Default context structure
function getDefaultContext() {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    sessions: [],
    patterns: {
      favoriteTopics: [],
      anubisCommonMoods: [],
      relationshipHealth: 'unknown',
      totalConversations: 0
    },
    observations: [],
    currentSession: null
  }
}

// GET - Retrieve Z's context
export async function GET() {
  try {
    ensureDirs()
    
    if (!fs.existsSync(Z_CONTEXT_FILE)) {
      return NextResponse.json({ 
        success: true, 
        context: getDefaultContext() 
      })
    }
    
    const context = JSON.parse(fs.readFileSync(Z_CONTEXT_FILE, 'utf-8'))
    
    return NextResponse.json({ 
      success: true, 
      context 
    })
  } catch (error: unknown) {
    console.error('[Z Context] Read error:', error)
    return NextResponse.json({ 
      success: false, 
      context: getDefaultContext() 
    })
  }
}

// POST - Update Z's context
export async function POST(request: NextRequest) {
  try {
    ensureDirs()
    
    const body = await request.json()
    const { action, data } = body
    
    // Load existing context or create new
    let context = fs.existsSync(Z_CONTEXT_FILE) 
      ? JSON.parse(fs.readFileSync(Z_CONTEXT_FILE, 'utf-8'))
      : getDefaultContext()
    
    if (action === 'start-session') {
      // Start a new conversation session
      context.currentSession = {
        started: new Date().toISOString(),
        messages: [],
        anubisMoods: [],
        keyMoments: []
      }
    }
    
    if (action === 'record-message') {
      // Record a message in the current session
      if (context.currentSession) {
        context.currentSession.messages.push({
          ...data,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    if (action === 'record-mood') {
      // Record Anubis mood change
      if (context.currentSession) {
        context.currentSession.anubisMoods.push({
          mood: data.mood,
          emotions: data.emotions,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    if (action === 'add-observation') {
      // Add an observation about the conversation
      const observation = {
        id: Date.now().toString(),
        text: data.observation,
        timestamp: new Date().toISOString()
      }
      context.observations.unshift(observation)
      // Keep only last 50 observations
      context.observations = context.observations.slice(0, 50)
    }
    
    if (action === 'end-session') {
      // End and save the current session
      if (context.currentSession) {
        const session = {
          ...context.currentSession,
          ended: new Date().toISOString(),
          summary: data?.summary || 'Session ended'
        }
        context.sessions.unshift(session)
        // Keep only last 30 sessions
        context.sessions = context.sessions.slice(0, 30)
        context.currentSession = null
        
        // Update patterns
        context.patterns.totalConversations += 1
        if (data?.anubisMood) {
          const existingMood = context.patterns.anubisCommonMoods.find(
            (m: { mood: string; count: number }) => m.mood === data.anubisMood
          )
          if (existingMood) {
            existingMood.count += 1
          } else {
            context.patterns.anubisCommonMoods.push({ mood: data.anubisMood, count: 1 })
          }
        }
      }
    }
    
    if (action === 'update-patterns') {
      // Update pattern analysis
      context.patterns = { ...context.patterns, ...data }
    }
    
    // Update timestamp
    context.lastUpdated = new Date().toISOString()
    
    // Save context
    fs.writeFileSync(Z_CONTEXT_FILE, JSON.stringify(context, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      context 
    })
    
  } catch (error: unknown) {
    console.error('[Z Context] Save error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update context',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
