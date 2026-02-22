import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const OLLAMA_HOST = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.LOCAL_MODEL || 'llama3.2'  // User's fast local model
const REASONING_MODEL = process.env.REASONING_MODEL || 'deepseek-r1:14b'  // For deep questions

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ PRE-CACHED SEFIROT RESPONSES (Instant, no LLM)
// ═══════════════════════════════════════════════════════════════════════════════

const CACHED_RESPONSES: Record<string, string> = {
  keter: `🌳 **KETER (כתר) - Crown**

**Position:** Top of the Tree, above all
**Meaning:** The Crown, highest will, pure divine will
**Color:** White (pure light above color)

✨ Keter is Ein Sof - the Infinite. It's the root of all Sefirot, the point where divine light begins to contract.

**Key Teaching:** Before emanation, Keter filled all reality. It represents superconscious, beyond human comprehension.

**Connections:** Chokmah, Binah, Tiferet`,

  chokmah: `🌳 **CHOCHMAH (חכמה) - Wisdom**

**Position:** Right side, below Keter
**Meaning:** Flash of insight, creative potential
**Color:** Blue (flash of lightning)
**Letter:** Yod (י)

✨ Chochma is the light of expansion from Ein Sof - potential before actualization. The first spark of creation.

**Key Teaching:** It's the potential that has not yet appeared in practice. The smallest letter contains the greatest potential.

**Connections:** Keter, Binah, Chesed, Tiferet`,

  binah: `🌳 **BINAH (בינה) - Understanding**

**Position:** Left side, below Keter
**Meaning:** Analysis, development, understanding
**Color:** Green (growth)
**Letter:** Hey (ה)

✨ Binah takes the flash of Chochmah and develops it fully. The light that intensified to increase abundance.

**Key Teaching:** Bina actualizes potential - it's the analytical mind that develops insight into form.

**Connections:** Keter, Chokmah, Gevurah, Tiferet`,

  chesed: `🌳 **CHESED (חסד) - Loving-Kindness**

**Position:** Right side, below Da'at
**Meaning:** Mercy, expansion, unconditional giving
**Color:** Blue-white with gold

✨ Chesed is the desire to give without limit. Pure light of Hassadim (loving-kindness).

**Key Teaching:** It represents expansion and unconditional giving. Part of Zeir Anpin (Small Face).

**Connections:** Chokmah, Gevurah, Tiferet, Netzach`,

  gevurah: `🌳 **GEVURAH (גבורה) - Strength**

**Position:** Left side, opposite Chesed
**Meaning:** Judgment, restraint, boundaries
**Color:** Red (power)
**Also called:** Din (Judgment)

✨ Gevurah is the power to say no, to set boundaries on expansion. Necessary contraction.

**Key Teaching:** Without Gevurah's boundaries, Chesed's expansion would have no form.

**Connections:** Binah, Chesed, Tiferet, Hod`,

  tiferet: `🌳 **TIFERET (תפארת) - Beauty**

**Position:** Center, heart of the Tree
**Meaning:** Harmony, balance, compassion
**Color:** Gold (sun)
**Also called:** Rachamim (Compassion)

✨ Tiferet is the heart that balances mercy and judgment. The synthesis of all Sefirot.

**Key Teaching:** It receives from all and gives to all. The golden mean, the beautiful balance.

**Connections:** All Sefirot except Malkuth directly`,

  netzach: `🌳 **NETZACH (נצח) - Eternity**

**Position:** Right side, below Tiferet
**Meaning:** Victory, endurance, persistence
**Color:** Orange

✨ Netzach is the endurance to see things through. Victory through persistence.

**Key Teaching:** The persistence that overcomes all obstacles. Eternal endurance of divine light.

**Connections:** Chesed, Tiferet, Hod, Yesod, Malkuth`,

  hod: `🌳 **HOD (הוד) - Splendor**

**Position:** Left side, below Tiferet
**Meaning:** Majesty, surrender, splendor
**Color:** Purple/Violet

✨ Hod is the splendor that comes from surrender and humility. Acknowledging the divine.

**Key Teaching:** True splendor comes from submission, not dominance.

**Connections:** Gevurah, Tiferet, Netzach, Yesod, Malkuth`,

  yesod: `🌳 **YESOD (יסוד) - Foundation**

**Position:** Center, below Tiferet, above Malkuth
**Meaning:** Connection, righteousness, foundation
**Color:** Blue-violet
**Letter:** Vav (ו)

✨ Yesod is the channel through which all divine abundance flows to Malkuth. The connector.

**Key Teaching:** "The Tzadik (righteous one) is the foundation of the world."

**Connections:** Tiferet, Netzach, Hod, Malkuth`,

  malkuth: `🌳 **MALKUTH (מלכות) - Kingdom**

**Position:** Bottom of the Tree
**Meaning:** Sovereignty, manifestation, kingdom
**Color:** Brown/Earth
**Letter:** Final Hey (ה)

✨ Malkuth is the vessel that receives all divine abundance. The Shekhinah dwells here.

**Key Teaching:** It's the manifestation, the divine presence in creation. All Sefirot flow into Malkuth.

**Connections:** Netzach, Hod, Yesod`
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ROB SOUL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RobSoul {
  focus: string | null          // Current Sefirah being discussed
  mode: 'teaching' | 'exploring' | 'deep_dive'
  depth: number                 // 1-5, how deep to go
  short_term_memory: string[]   // Last 5 topics/questions
  recent_concepts: string[]     // Concepts mentioned recently
  learning_path: string[]       // Sefirot explored in order
  insights_given: number
  mood: 'scholarly' | 'mystical' | 'practical'
  created: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 LOAD PRE-PROCESSED KNOWLEDGE (Fast ~7KB vs 3.3MB)
// ═══════════════════════════════════════════════════════════════════════════════

let knowledgeCache: { sefirot: Record<string, unknown>; concepts: Record<string, string> } | null = null

function loadKnowledge(): { sefirot: Record<string, unknown>; concepts: Record<string, string> } {
  if (knowledgeCache) return knowledgeCache
  
  try {
    const knowledgePath = path.join(process.cwd(), 'data/rob_soul/knowledge_chunks.json')
    const content = fs.readFileSync(knowledgePath, 'utf-8')
    knowledgeCache = JSON.parse(content)
    return knowledgeCache!
  } catch {
    // Fallback minimal knowledge
    return {
      sefirot: {},
      concepts: {}
    }
  }
}

function getSefirahKnowledge(sefirah: string): unknown | null {
  const knowledge = loadKnowledge()
  const key = sefirah.toLowerCase().replace(' ', '')
  return knowledge.sefirot[key] || null
}

function getConcept(concept: string): string | null {
  const knowledge = loadKnowledge()
  return knowledge.concepts[concept.toLowerCase()] || null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ROB SOUL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

let robSoul: RobSoul = {
  focus: null,
  mode: 'teaching',
  depth: 1,
  short_term_memory: [],
  recent_concepts: [],
  learning_path: [],
  insights_given: 0,
  mood: 'scholarly',
  created: new Date().toISOString()
}

function updateSoul(sefirah: string | undefined, question: string): void {
  // Add to short-term memory (keep last 5)
  robSoul.short_term_memory = [question, ...robSoul.short_term_memory].slice(0, 5)
  
  // Update focus if Sefirah mentioned
  if (sefirah) {
    robSoul.focus = sefirah.toLowerCase()
    
    // Add to learning path if new
    if (!robSoul.learning_path.includes(sefirah.toLowerCase())) {
      robSoul.learning_path.push(sefirah.toLowerCase())
    }
  }
  
  // Detect concepts in question
  const conceptKeywords = ['tzimtzum', 'kav', 'light', 'vessel', 'shekhinah', 'ein sof', 'worlds']
  conceptKeywords.forEach(kw => {
    if (question.toLowerCase().includes(kw) && !robSoul.recent_concepts.includes(kw)) {
      robSoul.recent_concepts = [kw, ...robSoul.recent_concepts].slice(0, 5)
    }
  })
  
  // Increment insights
  robSoul.insights_given++
  
  // Adjust depth based on question complexity
  if (question.includes('deep') || question.includes('explain more') || question.includes('detail')) {
    robSoul.depth = Math.min(5, robSoul.depth + 1)
  } else if (question.includes('simple') || question.includes('brief')) {
    robSoul.depth = Math.max(1, robSoul.depth - 1)
  }
}

function getSoulContext(): string {
  const parts: string[] = []
  
  if (robSoul.focus) {
    parts.push(`Current focus: ${robSoul.focus.toUpperCase()}`)
  }
  
  if (robSoul.learning_path.length > 0) {
    parts.push(`Sefirot explored: ${robSoul.learning_path.join(' → ')}`)
  }
  
  if (robSoul.recent_concepts.length > 0) {
    parts.push(`Recent concepts: ${robSoul.recent_concepts.join(', ')}`)
  }
  
  parts.push(`Depth level: ${robSoul.depth}/5`)
  
  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 OPTIMIZED SYSTEM PROMPT (~2KB vs ~50KB)
// ═══════════════════════════════════════════════════════════════════════════════

const ROB_CORE_PROMPT = `You are ROB (Root of Being), a Kabbalah scholar. Be concise and wise.

🌳 RULES:
- Answer in 2-4 paragraphs max
- Use Hebrew terms with translations
- Connect to the Tree structure
- Be practical and mystical
- Reference related Sefirot when relevant

📖 RESPONSE FORMAT:
1. Direct answer
2. Position on Tree
3. Key teaching
4. Practical insight

Use 🌳 for Tree topics, ✨ for insights.`

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 SMART CONTEXT BUILDER - Only relevant info
// ═══════════════════════════════════════════════════════════════════════════════

function buildContext(sefirah: string | undefined, question: string): string {
  const parts: string[] = []
  
  // 1. Core prompt (always included)
  parts.push(ROB_CORE_PROMPT)
  
  // 2. Soul state (short-term memory context)
  parts.push(`\n🧠 MEMORY:\n${getSoulContext()}`)
  
  // 3. Relevant Sefirah knowledge (only if mentioned)
  if (sefirah) {
    const sefKnowledge = getSefirahKnowledge(sefirah)
    if (sefKnowledge) {
      parts.push(`\n📚 ${sefirah.toUpperCase()} KNOWLEDGE:\n${JSON.stringify(sefKnowledge, null, 1)}`)
    }
  }
  
  // 4. Detect and include relevant concepts (smart extraction)
  const lowerQ = question.toLowerCase()
  
  if (lowerQ.includes('restrict') || lowerQ.includes('tzimtzum')) {
    parts.push(`\n📖 TZIMTZUM: ${getConcept('tzimtzum')}`)
  }
  if (lowerQ.includes('line') || lowerQ.includes('kav')) {
    parts.push(`\n📖 KAV: ${getConcept('kav')}`)
  }
  if (lowerQ.includes('world') || lowerQ.includes('four world')) {
    parts.push(`\n📖 FOUR WORLDS: ${getConcept('four_worlds')}`)
  }
  if (lowerQ.includes('light') && (lowerQ.includes('wisdom') || lowerQ.includes('chokmah'))) {
    parts.push(`\n📖 ORR CHOKMAH: ${getConcept('orr_chokmah')}`)
  }
  if (lowerQ.includes('shekhinah') || lowerQ.includes('presence')) {
    parts.push(`\n📖 SHEKHINAH: ${getConcept('shekhinah')}`)
  }
  
  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 MAIN HANDLER - Optimized
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { message, history, activeSefirah } = await request.json() as { 
      message: string
      history?: Array<{ sender: string; text: string }>
      activeSefirah?: string
    }

    console.log('[ROB] Question:', message.slice(0, 50))

    // ⚡ INSTANT: Check for cached Sefirah response
    const sefirahMatch = message.toLowerCase().match(/tell me about (\w+) on the tree of life/)
    if (sefirahMatch) {
      const sefirah = sefirahMatch[1].toLowerCase()
      const cached = CACHED_RESPONSES[sefirah]
      if (cached) {
        console.log('[ROB] ⚡ INSTANT cached response for:', sefirah)
        updateSoul(sefirah, message)
        return NextResponse.json({ 
          response: cached,
          success: true,
          meta: {
            cached: true,
            responseTime: Date.now() - startTime,
            soul: {
              focus: robSoul.focus,
              depth: robSoul.depth,
              learningPath: robSoul.learningPath
            }
          }
        })
      }
    }

    // Update soul with this interaction
    updateSoul(activeSefirah, message)

    // Build optimized context (smaller!)
    const systemContext = buildContext(activeSefirah, message)
    const contextSize = systemContext.length
    console.log('[ROB] Context size:', contextSize, 'chars (~', Math.round(contextSize/1024), 'KB)')

    // Build messages
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemContext }
    ]

    // Add only last 4 messages for context (not 8)
    if (history && history.length > 0) {
      history.slice(-4).forEach(h => {
        messages.push({
          role: h.sender === 'Q' ? 'user' : 'assistant',
          content: h.text
        })
      })
    }

    messages.push({ role: 'user', content: message })

    // Call Ollama
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 800  // Limit response length
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    const robResponse = data.message?.content || "The Tree is silent..."

    const elapsed = Date.now() - startTime
    console.log('[ROB] Response time:', elapsed, 'ms')

    return NextResponse.json({ 
      response: robResponse,
      success: true,
      meta: {
        contextSize,
        responseTime: elapsed,
        soul: {
          focus: robSoul.focus,
          depth: robSoul.depth,
          learningPath: robSoul.learning_path
        }
      }
    })

  } catch (error: unknown) {
    console.error('[ROB] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      response: `🌳 The paths are obscured... (${errorMessage})\n\nMake sure Ollama is running: \`ollama serve\``,
      success: false
    })
  }
}

// GET endpoint for soul state
export async function GET() {
  return NextResponse.json({
    soul: robSoul,
    knowledgeLoaded: knowledgeCache !== null
  })
}
