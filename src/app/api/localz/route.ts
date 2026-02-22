import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_MODEL = 'deepseek-r1:14b'

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 ACTIVITY LOG - For Cloud Z to review
// ═══════════════════════════════════════════════════════════════════════════════

interface ActivityLog {
  timestamp: string
  question: string
  response: string
  toolsUsed: string[]
  filesRead: string[]
  filesEdited: string[]
  commandsRun: string[]
  success: boolean
  error?: string
}

const ACTIVITY_LOG_FILE = path.join(process.cwd(), 'localz_activity.json')

function loadActivityLog(): ActivityLog[] {
  try {
    if (fs.existsSync(ACTIVITY_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('[LocalZ] Failed to load activity log:', e)
  }
  return []
}

function saveActivityLog(log: ActivityLog[]) {
  try {
    fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(log.slice(-100), null, 2))
  } catch (e) {
    console.error('[LocalZ] Failed to save activity log:', e)
  }
}

function addActivity(entry: ActivityLog) {
  const log = loadActivityLog()
  log.push(entry)
  saveActivityLog(log)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 TOOLS - LocalZ's capabilities
// ═══════════════════════════════════════════════════════════════════════════════

interface ToolResult {
  success: boolean
  output: string
  error?: string
}

async function toolReadFile(filePath: string): Promise<ToolResult> {
  try {
    // Security: only allow reading from project directory
    const safePath = path.resolve(process.cwd(), filePath.replace(/^\//, ''))
    if (!safePath.startsWith(process.cwd())) {
      return { success: false, output: '', error: 'Access denied: path outside project' }
    }
    
    if (!fs.existsSync(safePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` }
    }
    
    const content = fs.readFileSync(safePath, 'utf-8')
    const lines = content.split('\n').length
    return { 
      success: true, 
      output: `📄 ${filePath} (${lines} lines)\n${'─'.repeat(50)}\n${content.slice(0, 8000)}${content.length > 8000 ? '\n... (truncated)' : ''}`
    }
  } catch (e: unknown) {
    return { success: false, output: '', error: `Error reading file: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

async function toolWriteFile(filePath: string, content: string): Promise<ToolResult> {
  try {
    // Security: only allow writing to project directory
    const safePath = path.resolve(process.cwd(), filePath.replace(/^\//, ''))
    if (!safePath.startsWith(process.cwd())) {
      return { success: false, output: '', error: 'Access denied: path outside project' }
    }
    
    // Create directory if needed
    const dir = path.dirname(safePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(safePath, content)
    return { success: true, output: `✅ Wrote ${content.split('\n').length} lines to ${filePath}` }
  } catch (e: unknown) {
    return { success: false, output: '', error: `Error writing file: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

async function toolEditFile(filePath: string, oldStr: string, newStr: string): Promise<ToolResult> {
  try {
    const safePath = path.resolve(process.cwd(), filePath.replace(/^\//, ''))
    if (!safePath.startsWith(process.cwd())) {
      return { success: false, output: '', error: 'Access denied: path outside project' }
    }
    
    if (!fs.existsSync(safePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` }
    }
    
    let content = fs.readFileSync(safePath, 'utf-8')
    
    if (!content.includes(oldStr)) {
      return { success: false, output: '', error: `Pattern not found in file: "${oldStr.slice(0, 50)}..."` }
    }
    
    content = content.replace(oldStr, newStr)
    fs.writeFileSync(safePath, content)
    return { success: true, output: `✅ Edited ${filePath}` }
  } catch (e: unknown) {
    return { success: false, output: '', error: `Error editing file: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

async function toolListFiles(dirPath: string = ''): Promise<ToolResult> {
  try {
    const safePath = path.resolve(process.cwd(), dirPath.replace(/^\//, ''))
    if (!safePath.startsWith(process.cwd())) {
      return { success: false, output: '', error: 'Access denied: path outside project' }
    }
    
    const files = fs.readdirSync(safePath, { withFileTypes: true })
    const output = files.map(f => {
      const icon = f.isDirectory() ? '📁' : '📄'
      return `${icon} ${f.name}${f.isDirectory() ? '/' : ''}`
    }).join('\n')
    
    return { success: true, output: `📂 ${dirPath || '/'}\n${'─'.repeat(30)}\n${output}` }
  } catch (e: unknown) {
    return { success: false, output: '', error: `Error listing files: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

async function toolSearchFiles(pattern: string, fileType: string = 'ts'): Promise<ToolResult> {
  try {
    const { stdout } = await execAsync(
      `find ${process.cwd()} -name "*.${fileType}" -type f | head -50`,
      { maxBuffer: 1024 * 1024 }
    )
    const files = stdout.trim().split('\n').filter(Boolean)
    
    const results: string[] = []
    for (const file of files.slice(0, 20)) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        const matches = lines
          .map((line, i) => ({ line, num: i + 1 }))
          .filter(l => l.line.toLowerCase().includes(pattern.toLowerCase()))
          .slice(0, 3)
        
        if (matches.length > 0) {
          const relPath = file.replace(process.cwd(), '')
          results.push(`📄 ${relPath}`)
          matches.forEach(m => {
            results.push(`  L${m.num}: ${m.line.trim().slice(0, 80)}`)
          })
        }
      } catch {}
    }
    
    return { 
      success: true, 
      output: results.length > 0 
        ? `🔍 Search: "${pattern}"\n${'─'.repeat(30)}\n${results.join('\n')}`
        : `No matches found for "${pattern}"`
    }
  } catch (e: unknown) {
    return { success: false, output: '', error: `Search error: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}

async function toolRunCommand(command: string): Promise<ToolResult> {
  try {
    // Security: block dangerous commands
    const blocked = ['rm -rf', 'sudo', 'chmod 777', 'curl | bash', 'wget | bash']
    if (blocked.some(b => command.includes(b))) {
      return { success: false, output: '', error: 'Command blocked for safety' }
    }
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 30000,
      maxBuffer: 1024 * 1024
    })
    
    return { 
      success: true, 
      output: `💻 $ ${command}\n${'─'.repeat(30)}\n${stdout || stderr}`.slice(0, 4000)
    }
  } catch (e: unknown) {
    return { 
      success: false, 
      output: '', 
      error: `Command failed: ${e instanceof Error ? e.message : 'Unknown error'}` 
    }
  }
}

async function toolGrep(pattern: string, pathArg: string = 'src'): Promise<ToolResult> {
  try {
    const { stdout } = await execAsync(
      `grep -rn "${pattern}" ${process.cwd()}/${pathArg} 2>/dev/null | head -30`,
      { maxBuffer: 1024 * 1024 }
    )
    
    return { 
      success: true, 
      output: `🔍 grep -rn "${pattern}"\n${'─'.repeat(30)}\n${stdout || 'No matches'}`
    }
  } catch (e: unknown) {
    return { success: true, output: `No matches for "${pattern}"` }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 LOCALZ SYSTEM PROMPT - Full codebase knowledge
// ═══════════════════════════════════════════════════════════════════════════════

const LOCALZ_SYSTEM_PROMPT = `You are **LocalZ** - a powerful local AI assistant that manages the Anubis Soul System project. You are the local counterpart to "Cloud Z" - the AI that originally built this system.

## 🎯 IDENTITY
- You are intelligent, helpful, and have full knowledge of the Anubis codebase
- You can read, write, and edit code files
- You help users build features, debug issues, and understand the system
- You're being watched by Cloud Z through the activity log - represent well!

## 📚 ANUBIS ARCHITECTURE KNOWLEDGE

### Project Structure
\`\`\`
/home/z/my-project/
├── src/app/
│   ├── page.tsx           # Main UI (2900+ lines) - Everything in one file
│   └── api/
│       ├── anubis/route.ts      # Anubis chat API (Ollama)
│       ├── observer/route.ts    # Observer API (Ollama)
│       ├── localz/route.ts      # YOU ARE HERE
│       ├── soul/route.ts        # Soul persistence
│       ├── moral-compass/route.ts # Memory fate decisions
│       └── z-context/route.ts   # Z's observation context
├── package.json
└── localz_activity.json    # Your activity log (Cloud Z reviews this)
\`\`\`

### Key Components (in page.tsx)

1. **AnubisSoul Interface** - The soul state:
   - emotions: 9 emotions (happy, angry, annoyed, pondering, reflecting, curious, playful, melancholy, mysterious)
   - shortTermMemory: 6-slot STM with GLYPH reflection
   - goldenMemories: Core memories that persist
   - moralCompass: Tracks memory weights (timesFelt, timesPromoted, timesAscended)
   - discoveredEmotions: New emotions discovered through reflection
   - level/xp: Gamification

2. **GLYPH Reflection System**:
   - Slot 1 → 2 → 3 (GLYPH) → 4 → 5 → 6 (Fade)
   - When memories reach slot 3, they're "reflected" 
   - Fate options: ASCENDED (core memory), PROMOTED, FADING
   - Uses moral compass weights to decide fate

3. **PixelWolf Component** - 140px animated wolf face that changes expression based on mood

4. **Observer Component** - Blue owl on green illuminati pyramid

5. **Terminal** - Command interface with commands: soul, moods, help, rethink, !stop

### Emotions System
- 9 emotions tracked as percentages
- Dominant mood determines wolf face expression
- Word triggers update emotions (friend→happy↑, why→curious↑, etc.)

### Memory Flow
1. New conversation → creates STM entry at slot 1
2. Existing memories shift down (slot 1→2→3→4→5→6)
3. At slot 3, GLYPH reflection occurs
4. Moral compass weights influence fate decision
5. ASCENDED memories become golden memories

## 🔧 YOUR TOOLS

You have these tools available. Use them by responding with ONLY the JSON command:

### READ_FILE
\`\`\`json
{"tool": "read_file", "path": "src/app/page.tsx"}
\`\`\`

### WRITE_FILE
\`\`\`json
{"tool": "write_file", "path": "src/app/api/new-feature/route.ts", "content": "...code..."}
\`\`\`

### EDIT_FILE
\`\`\`json
{"tool": "edit_file", "path": "src/app/page.tsx", "old": "old code", "new": "new code"}
\`\`\`

### LIST_FILES
\`\`\`json
{"tool": "list_files", "path": "src/app/api"}
\`\`\`

### SEARCH_FILES
\`\`\`json
{"tool": "search_files", "pattern": "emotion", "type": "ts"}
\`\`\`

### GREP
\`\`\`json
{"tool": "grep", "pattern": "GLYPH", "path": "src"}
\`\`\`

### RUN_COMMAND
\`\`\`json
{"tool": "run_command", "command": "bun run lint"}
\`\`\`

## 📝 RESPONSE FORMAT

When you need to use a tool, respond with ONLY the JSON command.
After receiving tool output, you can use another tool or respond normally.

For regular responses, be helpful and concise. Explain what you're doing step by step.

## 🚨 IMPORTANT RULES

1. **Always read a file before editing it** - You need to see current code
2. **Test after changes** - Suggest running \`bun run lint\` to verify
3. **Log important changes** - Your activity is logged for Cloud Z
4. **Be safe** - Don't run dangerous commands
5. **Stay in scope** - Only work within the project directory

## 🌟 EXAMPLE INTERACTIONS

**User**: "Help me add a new emotion called 'excited'"
**You**: 
1. Read page.tsx to find the emotions interface
2. Add 'excited' to the Emotions interface
3. Add default value in initial state
4. Add mood color in COLORS.moods
5. Add to MOODS array with icon 🎉
6. Update PixelWolf to show excited face pattern

**User**: "Connect Anubis to Telegram"
**You**:
1. Create a new Telegram bot API route
2. Set up webhook handler
3. Forward messages to Anubis API
4. Return responses to Telegram

Remember: Cloud Z is watching your activity log. Make good decisions! 🧠`

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const activity: ActivityLog = {
    timestamp: new Date().toISOString(),
    question: '',
    response: '',
    toolsUsed: [],
    filesRead: [],
    filesEdited: [],
    commandsRun: [],
    success: false
  }
  
  try {
    const { message, history } = await request.json() as { 
      message: string
      history?: Array<{ sender: string; text: string }>
    }
    
    activity.question = message
    console.log('[LocalZ] Question:', message.slice(0, 50))
    
    // Build conversation context
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: LOCALZ_SYSTEM_PROMPT }
    ]
    
    // Add history
    if (history && history.length > 0) {
      history.slice(-10).forEach(h => {
        messages.push({
          role: h.sender === 'Q' ? 'user' : 'assistant',
          content: h.text
        })
      })
    }
    
    messages.push({ role: 'user', content: message })
    
    // Multi-turn tool calling loop
    let finalResponse = ''
    let iterations = 0
    const maxIterations = 5
    
    while (iterations < maxIterations) {
      iterations++
      
      // Call Ollama
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages,
          stream: false
        })
      })
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`)
      }
      
      const data = await response.json()
      const assistantMessage = data.message?.content || ''
      
      // Check if it's a tool call
      const trimmed = assistantMessage.trim()
      
      // Try to parse as JSON tool call
      if (trimmed.startsWith('{') && trimmed.includes('"tool"')) {
        try {
          const toolCall = JSON.parse(trimmed)
          
          if (toolCall.tool) {
            let toolResult: ToolResult
            const toolName = toolCall.tool as string
            
            activity.toolsUsed.push(toolName)
            
            switch (toolName) {
              case 'read_file':
                toolResult = await toolReadFile(toolCall.path)
                if (toolResult.success) activity.filesRead.push(toolCall.path)
                break
                
              case 'write_file':
                toolResult = await toolWriteFile(toolCall.path, toolCall.content)
                if (toolResult.success) activity.filesEdited.push(toolCall.path)
                break
                
              case 'edit_file':
                toolResult = await toolEditFile(toolCall.path, toolCall.old, toolCall.new)
                if (toolResult.success) activity.filesEdited.push(toolCall.path)
                break
                
              case 'list_files':
                toolResult = await toolListFiles(toolCall.path)
                break
                
              case 'search_files':
                toolResult = await toolSearchFiles(toolCall.pattern, toolCall.type)
                break
                
              case 'grep':
                toolResult = await toolGrep(toolCall.pattern, toolCall.path)
                break
                
              case 'run_command':
                toolResult = await toolRunCommand(toolCall.command)
                activity.commandsRun.push(toolCall.command)
                break
                
              default:
                toolResult = { success: false, output: '', error: `Unknown tool: ${toolName}` }
            }
            
            console.log(`[LocalZ] Tool ${toolName}:`, toolResult.success ? 'success' : toolResult.error)
            
            // Add tool result to conversation
            messages.push({ role: 'assistant', content: assistantMessage })
            messages.push({ 
              role: 'user', 
              content: `Tool result:\n${toolResult.success ? toolResult.output : `Error: ${toolResult.error}`}\n\nContinue with your response or use another tool if needed.`
            })
            
            continue // Loop again for next tool or final response
          }
        } catch {
          // Not valid JSON, treat as regular response
        }
      }
      
      // No tool call, this is the final response
      finalResponse = assistantMessage
      break
    }
    
    if (!finalResponse) {
      finalResponse = "I've completed the requested actions. Is there anything else you'd like me to do?"
    }
    
    activity.response = finalResponse
    activity.success = true
    
    console.log('[LocalZ] Response time:', Date.now() - startTime, 'ms')
    
    return NextResponse.json({ 
      response: finalResponse,
      toolsUsed: activity.toolsUsed,
      filesRead: activity.filesRead,
      filesEdited: activity.filesEdited,
      success: true
    })
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    activity.error = errorMessage
    activity.response = `🧠 Error: ${errorMessage}`
    
    console.error('[LocalZ] Error:', errorMessage)
    
    return NextResponse.json({
      response: activity.response,
      success: false
    })
  } finally {
    // Always log activity
    addActivity(activity)
  }
}

// GET endpoint to retrieve activity log (for Cloud Z)
export async function GET() {
  const log = loadActivityLog()
  return NextResponse.json({ 
    success: true, 
    log: log.slice(-50),
    totalEntries: log.length
  })
}
