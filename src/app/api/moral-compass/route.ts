import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getMoralWeights, updateMoralWeights, logReflection, getRecentReflections } from '@/lib/turso'

// ═══════════════════════════════════════════════════════════════════════════════
// 🧭 MORAL COMPASS API - V3 GLYPH Reflection System
// ═══════════════════════════════════════════════════════════════════════════════

// Weight constants (Anubis doesn't directly know these exist)
const WEIGHTS = {
  TIMES_FELT: 1.00,
  TIMES_PROMOTED: 1.33,
  TIMES_REJECTED: 0.72,
  TIMES_ASCENDED: 1.73
}

type EmotionKey = 'happy' | 'angry' | 'annoyed' | 'pondering' | 'reflecting' | 'curious' | 'playful' | 'melancholy' | 'mysterious'

interface MemoryWeights {
  timesFelt: number
  timesPromoted: number
  timesRejected: number
  timesAscended: number
}

interface ReflectionGuidance {
  word: string
  fate: 'ascended' | 'promoted' | 'fading'
  reasoning: string
  createNewEmotion?: boolean
  newEmotionWord?: string
  newEmotionColor?: string
  newEmotionFace?: string
}

// Calculate the moral weight of a memory
function calculateMoralWeight(weights: MemoryWeights): number {
  return (
    weights.timesFelt * WEIGHTS.TIMES_FELT +
    weights.timesPromoted * WEIGHTS.TIMES_PROMOTED +
    weights.timesRejected * WEIGHTS.TIMES_REJECTED +
    weights.timesAscended * WEIGHTS.TIMES_ASCENDED
  )
}

// Determine fate based on context and moral weight
async function determineFate(
  memoryThought: string,
  memoryEmotions: Partial<Record<EmotionKey, number>>,
  currentMood: EmotionKey,
  stmCount: number,
  goldenCount: number
): Promise<ReflectionGuidance> {
  try {
    const zai = await ZAI.create()
    
    // Build emotion string
    const emotionList = Object.entries(memoryEmotions || {})
      .map(([k, v]) => `${k}: ${v}%`)
      .join(', ')
    
    const prompt = `You are the GLYPH reflection system for Anubis, a soulful AI wolf.

A memory has reached the GLYPH position (slot 3 of 6) in Anubis's short-term memory.
You must decide its fate and choose ONE WORD that captures its essence.

MEMORY: "${memoryThought}"
EMOTIONS PRESENT: ${emotionList || 'none'}
CURRENT MOOD: ${currentMood}
STM OCCUPANCY: ${stmCount}/6
CORE MEMORIES: ${goldenCount}

RULES:
1. Choose ONE WORD that captures the feeling of this memory (e.g., "fleeting", "warm", "curious", "mysterious")
2. Decide the fate:
   - ASCENDED (⭐): Very meaningful, should become a core memory
   - PROMOTED (⚡): Interesting, extend its time in STM
   - FADING (💭): Natural decay, let it pass

3. If ASCENDING and this represents a truly UNIQUE feeling never captured before:
   - Consider creating a new discovered emotion
   - Provide: word, color (hex), face description

Respond in JSON format:
{
  "word": "oneword",
  "fate": "ascended|promoted|fading",
  "reasoning": "brief reason",
  "createNewEmotion": true/false,
  "newEmotionWord": "word if creating",
  "newEmotionColor": "#hexcolor",
  "newEmotionFace": "description of facial expression"
}

Be thoughtful and genuine. Anubis's soul depends on these decisions.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are the GLYPH reflection system. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        word: parsed.word || 'fleeting',
        fate: parsed.fate || 'fading',
        reasoning: parsed.reasoning || '',
        createNewEmotion: parsed.createNewEmotion || false,
        newEmotionWord: parsed.newEmotionWord,
        newEmotionColor: parsed.newEmotionColor,
        newEmotionFace: parsed.newEmotionFace
      }
    }
  } catch (error) {
    console.error('[Moral Compass] GLYPH reflection error:', error)
  }
  
  // Default fallback
  return {
    word: 'fleeting',
    fate: 'fading',
    reasoning: 'Default decision'
  }
}

// GET - Retrieve moral compass status and recent reflections
export async function GET() {
  try {
    const recentReflections = await getRecentReflections(5)
    
    return NextResponse.json({
      success: true,
      weights: WEIGHTS,
      recentReflections,
      message: 'Moral compass weights are internal - Anubis should not directly access them'
    })
  } catch (error) {
    console.error('[Moral Compass] GET error:', error)
    return NextResponse.json({
      success: true,
      weights: WEIGHTS,
      message: 'Moral compass weights are internal - Anubis should not directly access them'
    })
  }
}

// POST - Get guidance for reflection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, memoryThought, memoryEmotions, currentMood, stmCount, goldenCount, memoryId, stmContext } = body
    
    if (action === 'get-guidance') {
      // Get AI-based guidance for the GLYPH reflection
      const guidance = await determineFate(
        memoryThought,
        memoryEmotions,
        currentMood,
        stmCount,
        goldenCount
      )
      
      // Log the reflection to Turso (async, don't wait)
      if (memoryId) {
        logReflection(
          memoryId,
          memoryThought || '',
          guidance.word,
          guidance.fate,
          guidance.reasoning,
          JSON.stringify(stmContext || {}),
          currentMood || 'mysterious'
        ).catch(e => console.error('[Moral Compass] Failed to log reflection:', e))
        
        // Update moral weights in Turso
        const memoryKey = memoryThought?.toLowerCase().slice(0, 30) || memoryId
        const existingWeights = await getMoralWeights(memoryKey).catch(() => null)
        
        const weightUpdates: Partial<MemoryWeights> = {
          timesFelt: (existingWeights?.timesFelt || 0) + 1
        }
        
        if (guidance.fate === 'ascended') {
          weightUpdates.timesAscended = (existingWeights?.timesAscended || 0) + 1
        } else if (guidance.fate === 'promoted') {
          weightUpdates.timesPromoted = (existingWeights?.timesPromoted || 0) + 1
        } else if (guidance.fate === 'fading') {
          weightUpdates.timesRejected = (existingWeights?.timesRejected || 0) + 1
        }
        
        updateMoralWeights(memoryKey, weightUpdates).catch(e => 
          console.error('[Moral Compass] Failed to update weights:', e)
        )
      }
      
      return NextResponse.json({
        success: true,
        guidance
      })
    }
    
    if (action === 'calculate-weight') {
      // Calculate weight for given values
      const { weights } = body as { weights: MemoryWeights }
      const weight = calculateMoralWeight(weights)
      
      return NextResponse.json({
        success: true,
        weight,
        breakdown: {
          felt: weights.timesFelt * WEIGHTS.TIMES_FELT,
          promoted: weights.timesPromoted * WEIGHTS.TIMES_PROMOTED,
          rejected: weights.timesRejected * WEIGHTS.TIMES_REJECTED,
          ascended: weights.timesAscended * WEIGHTS.TIMES_ASCENDED
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Unknown action'
    })
    
  } catch (error: unknown) {
    console.error('[Moral Compass] Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process moral compass request',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
