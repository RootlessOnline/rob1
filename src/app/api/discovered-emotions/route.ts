import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ═══════════════════════════════════════════════════════════════════════════════
// ✨ DISCOVERED EMOTIONS API - V3 Local File Storage
// ═══════════════════════════════════════════════════════════════════════════════
// Anubis doesn't know these files exist - they're his emotional memory
// stored externally, separate from his conscious soul state

const EMOTIONS_DIR = path.join(process.cwd(), 'data', 'discovered_emotions')

interface DiscoveredEmotion {
  id: string
  word: string
  color: string
  faceDescription: string
  discoveredAt: string
  fromMemory: string
}

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(EMOTIONS_DIR)) {
    fs.mkdirSync(EMOTIONS_DIR, { recursive: true })
  }
}

// GET - List all discovered emotions
export async function GET() {
  try {
    ensureDir()
    
    const files = fs.readdirSync(EMOTIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = fs.readFileSync(path.join(EMOTIONS_DIR, f), 'utf-8')
        return JSON.parse(content) as DiscoveredEmotion
      })
      .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
    
    return NextResponse.json({
      success: true,
      emotions: files,
      count: files.length
    })
  } catch (error) {
    console.error('[Discovered Emotions] Read error:', error)
    return NextResponse.json({
      success: true,
      emotions: [],
      count: 0
    })
  }
}

// POST - Save a new discovered emotion
export async function POST(request: NextRequest) {
  try {
    ensureDir()
    
    const body = await request.json()
    const { emotion } = body as { emotion: DiscoveredEmotion }
    
    if (!emotion || !emotion.word) {
      return NextResponse.json({
        success: false,
        message: 'Invalid emotion data'
      })
    }
    
    const filename = `emotion_${emotion.id}.json`
    const filepath = path.join(EMOTIONS_DIR, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(emotion, null, 2))
    
    console.log(`[Discovered Emotions] Saved: ${emotion.word}`)
    
    return NextResponse.json({
      success: true,
      message: 'Emotion discovered and stored',
      filename
    })
  } catch (error) {
    console.error('[Discovered Emotions] Save error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save emotion'
    })
  }
}

// DELETE - Remove an emotion (rare, for cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'No emotion ID provided'
      })
    }
    
    const filepath = path.join(EMOTIONS_DIR, `emotion_${id}.json`)
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
      return NextResponse.json({
        success: true,
        message: 'Emotion removed'
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Emotion not found'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to delete emotion'
    })
  }
}
