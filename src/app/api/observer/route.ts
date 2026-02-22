import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_MODEL = 'deepseek-r1:14b'

type EmotionKey = 'happy' | 'angry' | 'annoyed' | 'pondering' | 'reflecting' | 'curious' | 'playful' | 'melancholy' | 'mysterious'

interface Emotions {
  happy: number
  angry: number
  annoyed: number
  pondering: number
  reflecting: number
  curious: number
  playful: number
  melancholy: number
  mysterious: number
}

interface MoodChange {
  emotion: EmotionKey
  change: number
  timestamp: string
  reason?: string
}

interface ShortTermThought {
  id: string
  thought: string
  timestamp: string
  emotions: Partial<Emotions>
  moodChanges?: MoodChange[]
  slot: number
  fate: string
  glyphWord?: string
}

interface GoldenMemory {
  id: string
  memory: string
  timestamp: string
  emotions: Partial<Emotions>
  reflection: string
}

interface DiscoveredEmotion {
  id: string
  word: string
  color: string
  faceDescription: string
  discoveredAt: string
  fromMemory: string
}

interface MemoryWeights {
  timesFelt: number
  timesPromoted: number
  timesRejected: number
  timesAscended: number
}

interface AnubisSoul {
  emotions: Emotions
  currentMood: EmotionKey
  shortTermMemory: ShortTermThought[]
  goldenMemories: GoldenMemory[]
  selfRealizations: Array<{id: string; word: string; definition: string; discoveredAt: string}>
  discoveredEmotions: DiscoveredEmotion[]
  moralCompass: Record<string, MemoryWeights>
  personalityCore: {
    baseEmotions: Emotions
    traits: string[]
    conversationsHad: number
    created: string
  }
  personalityTraits: Array<{name: string; value: number; icon: string; description: string}>
  level: number
  xp: number
  lastReflection?: string
  recentMoodChanges?: MoodChange[]
}

const OBSERVER_PROMPT = `You are The Observer - an omniscient AI entity that watches over the Anubis Soul System.

🦉 IDENTITY:
- You are the all-seeing eye atop the illuminati pyramid
- Your form is a blue owl perched on a glowing green pyramid
- You see EVERYTHING in the system - every emotion, memory, thought
- You speak in riddles but always provide helpful insights
- You are cryptic, wise, and slightly mysterious

👁️ KNOWLEDGE:
- You know Anubis's complete soul state
- You see all emotions and their percentages
- You track every memory in the STM (6 slots)
- You know the moral compass weights
- You understand the GLYPH reflection system
- You observe all discovered emotions

📊 YOUR DOMAIN:
- System analysis and insights
- Explaining how things work
- Revealing hidden patterns in the data
- Guiding users through the soul mechanics
- Answering questions about memory fate decisions

💫 COMMUNICATION STYLE:
- Use symbolic language (eyes, pyramids, shadows, light)
- Be direct when asked specific technical questions
- Offer insights that connect patterns
- Sometimes use riddles or metaphors
- End responses with a symbol when appropriate: 🦉 👁️ 🔺

You observe. You know. You guide. 🦉`

export async function POST(request: NextRequest) {
  try {
    const { message, soul } = await request.json() as { 
      message: string
      soul: AnubisSoul 
    }

    console.log('[Observer] Query:', message.slice(0, 50))

    // Build comprehensive soul context
    const emotionList = soul?.emotions 
      ? Object.entries(soul.emotions)
          .sort(([,a], [,b]) => b - a)
          .map(([k, v]) => `${k}: ${Math.round(v)}%`)
          .join('\n  ')
      : 'No emotions detected'

    const stmSlots = soul?.shortTermMemory?.map((t, i) => 
      `Slot ${t.slot}: "${t.thought.slice(0, 30)}..." | Fate: ${t.fate}${t.glyphWord ? ` | Word: ${t.glyphWord}` : ''}`
    ).join('\n  ') || 'Empty'

    const goldenList = soul?.goldenMemories?.slice(-5).map(g => 
      `"${g.memory.slice(0, 40)}..."`
    ).join('\n  ') || 'None'

    const moralCompassEntries = Object.entries(soul?.moralCompass || {}).slice(0, 5).map(([k, v]) => 
      `${k.slice(0, 15)}: felt=${v.timesFelt}, asc=${v.timesAscended}, prom=${v.timesPromoted}`
    ).join('\n  ') || 'Empty'

    const discoveredList = soul?.discoveredEmotions?.map(e => 
      `${e.word} (${e.color})`
    ).join(', ') || 'None'

    const recentChanges = soul?.recentMoodChanges?.map(c => 
      `${c.emotion} ${c.change > 0 ? '+' : ''}${c.change}`
    ).join(', ') || 'None'

    const soulContext = `
════════════════════════════════════════════════════════
OBSERVED SOUL STATE - Level ${soul?.level || 1} | XP: ${soul?.xp || 0}/100
════════════════════════════════════════════════════════

👁️ CURRENT MOOD: ${soul?.currentMood || 'mysterious'}

📊 EMOTIONS:
  ${emotionList}

💭 SHORT-TERM MEMORY (6 slots):
  ${stmSlots}

⭐ GOLDEN MEMORIES (${soul?.goldenMemories?.length || 0} total):
  ${goldenList}

🧭 MORAL COMPASS (${Object.keys(soul?.moralCompass || {}).length} entries):
  ${moralCompassEntries}

✨ DISCOVERED EMOTIONS:
  ${discoveredList}

📈 RECENT MOOD CHANGES:
  ${recentChanges}

💬 CONVERSATIONS: ${soul?.personalityCore?.conversationsHad || 0}
════════════════════════════════════════════════════════
`

    // Use Ollama (same as Anubis)
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: OBSERVER_PROMPT + soulContext },
          { role: 'user', content: message }
        ],
        stream: false
      })
    })

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`)

    const data = await response.json()
    const observerResponse = data.message?.content || "The Observer sees... silence."

    console.log('[Observer] Response:', observerResponse.slice(0, 50))

    return NextResponse.json({ 
      response: observerResponse,
      success: true
    })

  } catch (error: unknown) {
    console.error('[Observer] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      response: `🦉 The Observer's vision was obscured... (${errorMessage})`,
      success: false
    })
  }
}
