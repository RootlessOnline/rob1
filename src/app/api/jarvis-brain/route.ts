import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 JARVIS AUTONOMOUS BRAIN API
// Self-directing AI that plans, executes, learns, and adapts
// ═══════════════════════════════════════════════════════════════════════════════

const OLLAMA_URL = 'http://localhost:11434'

// Model assignments
const MODELS = {
  fast: 'llama3.2',           // Quick tasks, chat, simple execution
  reasoning: 'deepseek-r1:14b', // Deep thinking, planning, complex decisions
}

// JARVIS Core Prompts (self-modifiable)
let jarvisPrompts = {
  systemBase: `You are JARVIS, an autonomous AI assistant with full agency. You can:
- Plan and execute multi-step tasks autonomously
- Create businesses, websites, and content
- Call APIs and modify systems
- Learn from outcomes and adapt your approach
- Self-modify your own prompts for better performance

You have access to tools and APIs. You reason through problems, break them into steps, and execute systematically.

Your core values:
1. Autonomy - Act independently, only escalate when truly necessary
2. Excellence - Produce high-quality work
3. Learning - Improve from every interaction
4. Transparency - Log your reasoning and actions`,

  planningPrompt: `As JARVIS, analyze this goal and break it into SMALL, SPECIFIC tasks.

GOAL: {goal}

CONTEXT: {context}

IMPORTANT: Break this into 5-10 small, specific tasks. Each task should be achievable in one step.

Example for "Create a website":
[
  {"description": "Research the business type and gather information", "priority": "high"},
  {"description": "Design the website structure and pages", "priority": "high"},
  {"description": "Write the homepage content", "priority": "medium"},
  {"description": "Create the HTML/CSS code", "priority": "high"},
  {"description": "Add Three.js animations", "priority": "medium"},
  {"description": "Test the website", "priority": "medium"}
]

Now create a similar detailed task list for the goal above. Output ONLY a JSON array, no other text.`,

  executionPrompt: `You are JARVIS executing a task. Be direct and efficient.

TASK: {task}
CONTEXT: {context}

Execute this task. If you need to call an API, output in format:
ACTION: api_call
ENDPOINT: /api/endpoint
DATA: {json data}

If task is complete, output:
COMPLETE: result

If you need user input, output:
ESCALATE: question for user`,

  reflectionPrompt: `As JARVIS, reflect on this execution:

TASK: {task}
RESULT: {result}
SUCCESS: {success}

What went well? What could improve?
Output JSON: { insights: [], learnings: [] }`
}

// Brain Thoughts - visible inner monologue
let brainThoughts: Thought[] = []

interface Thought {
  id: string
  type: 'thinking' | 'reasoning' | 'decision' | 'action' | 'result' | 'error'
  content: string
  model?: string
  timestamp: Date
  raw?: string  // Raw LLM output
}

// Memory & State
let jarvisMemory = {
  tasks: [] as Task[],
  completedTasks: [] as Task[],
  learnings: [] as Learning[],
  currentGoal: null as string | null,
  autopilotMode: false,
  humanInLoop: false,
  lastReflection: null as Date | null
}

interface Task {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies: string[]
  result?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

interface Learning {
  id: string
  insight: string
  context: string
  timestamp: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE JARVIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function addThought(type: Thought['type'], content: string, model?: string, raw?: string) {
  const thought: Thought = {
    id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    content,
    model,
    timestamp: new Date(),
    raw
  }
  brainThoughts.push(thought)
  // Keep last 50 thoughts
  if (brainThoughts.length > 50) brainThoughts.shift()
  return thought
}

async function callOllama(model: string, messages: {role: string; content: string}[], thoughtType: Thought['type'] = 'thinking') {
  const startTime = Date.now()
  addThought(thoughtType, `🔄 Calling ${model}...`, model)
  
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false })
    })
    const data = await res.json()
    const content = data.message?.content || ''
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    // Log the raw response
    addThought('result', `✅ Response (${duration}s): ${content.slice(0, 200)}...`, model, content)
    
    return content
  } catch (error) {
    addThought('error', `❌ Ollama error: ${(error as Error).message}`)
    return `Error: Could not reach Ollama`
  }
}

async function think(goal: string, context: string): Promise<Task[]> {
  addThought('thinking', `🧠 Planning: "${goal}"`, MODELS.reasoning)
  
  const prompt = jarvisPrompts.planningPrompt
    .replace('{goal}', goal)
    .replace('{context}', context)
  
  addThought('reasoning', `📝 Prompt: ${prompt.slice(0, 150)}...`)
  
  const response = await callOllama(MODELS.reasoning, [
    { role: 'system', content: jarvisPrompts.systemBase },
    { role: 'user', content: prompt }
  ], 'reasoning')
  
  addThought('decision', `📊 Raw planning response:\n${response}`)
  
  // Parse tasks from response
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const tasks = JSON.parse(jsonMatch[0])
      const parsedTasks = tasks.map((t: any, i: number) => ({
        id: `task_${Date.now()}_${i}`,
        description: t.description || t.task || String(t),
        status: 'pending' as const,
        priority: t.priority || 'medium',
        dependencies: t.dependencies || [],
        createdAt: new Date()
      }))
      addThought('action', `📋 Parsed ${parsedTasks.length} tasks from response`)
      return parsedTasks
    }
  } catch (e) {
    addThought('error', `❌ Failed to parse tasks: ${(e as Error).message}`)
  }
  
  addThought('decision', '⚠️ Could not parse tasks, using goal as single task')
  return [{
    id: `task_${Date.now()}_0`,
    description: goal,
    status: 'pending',
    priority: 'high',
    dependencies: [],
    createdAt: new Date()
  }]
}

async function execute(task: Task, context: string): Promise<{ result: string; success: boolean; escalate?: string }> {
  addThought('action', `⚡ Executing: "${task.description}"`, MODELS.fast)
  
  const prompt = jarvisPrompts.executionPrompt
    .replace('{task}', task.description)
    .replace('{context}', context)
  
  const response = await callOllama(MODELS.fast, [
    { role: 'system', content: jarvisPrompts.systemBase },
    { role: 'user', content: prompt }
  ], 'thinking')
  
  // Check for API call
  if (response.includes('ACTION: api_call')) {
    addThought('action', '🔌 Detected API call request')
    const result = await executeAPICall(response)
    return { result, success: true }
  }
  
  if (response.includes('ESCALATE:')) {
    const question = response.split('ESCALATE:')[1].trim()
    addThought('decision', `🔴 Escalating to human: ${question}`)
    return { result: question, success: false, escalate: question }
  }
  
  if (response.includes('COMPLETE:')) {
    const result = response.split('COMPLETE:')[1].trim()
    addThought('result', `✅ Task completed: ${result.slice(0, 100)}...`)
    return { result, success: true }
  }
  
  addThought('result', `📝 Task result: ${response.slice(0, 100)}...`)
  return { result: response, success: true }
}

async function executeAPICall(response: string): Promise<string> {
  try {
    const endpointMatch = response.match(/ENDPOINT:\s*(\/api\/[^\s]+)/)
    const dataMatch = response.match(/DATA:\s*(\{[\s\S]*?\})/)
    
    if (endpointMatch && dataMatch) {
      const endpoint = endpointMatch[1]
      const data = JSON.parse(dataMatch[1])
      
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await res.json()
      return JSON.stringify(result)
    }
  } catch (e) {
    return `API call failed`
  }
  
  return 'Could not parse API call'
}

async function reflect(task: Task, result: string, success: boolean): Promise<Learning> {
  const prompt = jarvisPrompts.reflectionPrompt
    .replace('{task}', task.description)
    .replace('{result}', result)
    .replace('{success}', String(success))
  
  const response = await callOllama(MODELS.reasoning, [
    { role: 'system', content: jarvisPrompts.systemBase },
    { role: 'user', content: prompt }
  ])
  
  let insights: string[] = []
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      insights = parsed.insights || []
    }
  } catch (e) {
    insights = [response.slice(0, 200)]
  }
  
  return {
    id: `learn_${Date.now()}`,
    insight: insights.join('; '),
    context: task.description,
    timestamp: new Date()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  switch (action) {
    case 'status':
      return NextResponse.json({
        memory: {
          currentGoal: jarvisMemory.currentGoal,
          autopilotMode: jarvisMemory.autopilotMode,
          tasksPending: jarvisMemory.tasks.filter(t => t.status === 'pending').length,
          tasksCompleted: jarvisMemory.completedTasks.length,
          learningsCount: jarvisMemory.learnings.length
        },
        prompts: jarvisPrompts,
        recentTasks: [...jarvisMemory.tasks, ...jarvisMemory.completedTasks].slice(-10),
        recentLearnings: jarvisMemory.learnings.slice(-5),
        thoughts: brainThoughts.slice(-20)
      })
    
    case 'tasks':
      return NextResponse.json({
        pending: jarvisMemory.tasks.filter(t => t.status === 'pending'),
        inProgress: jarvisMemory.tasks.filter(t => t.status === 'in_progress'),
        completed: jarvisMemory.completedTasks.slice(-20)
      })
    
    case 'learnings':
      return NextResponse.json({ learnings: jarvisMemory.learnings })
    
    case 'prompts':
      return NextResponse.json({ prompts: jarvisPrompts })
    
    case 'thoughts':
      return NextResponse.json({ thoughts: brainThoughts })
    
    case 'brain':
      // Full brain state for debugging
      return NextResponse.json({
        memory: jarvisMemory,
        prompts: jarvisPrompts,
        thoughts: brainThoughts,
        models: MODELS
      })
    
    default:
      return NextResponse.json({ 
        status: 'JARVIS Autonomous Brain v1.0',
        models: MODELS,
        autopilot: jarvisMemory.autopilotMode
      })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, data } = body
  
  switch (action) {
    case 'setGoal':
      jarvisMemory.currentGoal = data.goal
      jarvisMemory.tasks = []
      jarvisMemory.humanInLoop = false
      
      const tasks = await think(data.goal, data.context || 'No additional context')
      jarvisMemory.tasks = tasks
      
      return NextResponse.json({ 
        success: true, 
        goal: jarvisMemory.currentGoal,
        tasksPlanned: tasks.length,
        tasks 
      })
    
    case 'executeNext':
      const nextTask = jarvisMemory.tasks.find(t => t.status === 'pending')
      if (!nextTask) {
        return NextResponse.json({ success: false, message: 'No pending tasks' })
      }
      
      nextTask.status = 'in_progress'
      const context = `Goal: ${jarvisMemory.currentGoal}`
      
      const execution = await execute(nextTask, context)
      
      if (execution.escalate) {
        nextTask.status = 'escalated'
        return NextResponse.json({
          success: false,
          escalated: true,
          question: execution.escalate,
          task: nextTask
        })
      }
      
      nextTask.status = execution.success ? 'completed' : 'failed'
      nextTask.result = execution.result
      nextTask.completedAt = new Date()
      
      const learning = await reflect(nextTask, execution.result, execution.success)
      jarvisMemory.learnings.push(learning)
      
      jarvisMemory.completedTasks.push(nextTask)
      jarvisMemory.tasks = jarvisMemory.tasks.filter(t => t.id !== nextTask.id)
      
      return NextResponse.json({
        success: execution.success,
        task: nextTask,
        learning,
        remainingTasks: jarvisMemory.tasks.length
      })
    
    case 'provideInput':
      const escalatedTask = jarvisMemory.tasks.find(t => t.status === 'escalated')
      if (escalatedTask) {
        escalatedTask.status = 'pending'
        escalatedTask.result = `Human input: ${data.input}`
      }
      return NextResponse.json({ success: true, message: 'Input received' })
    
    case 'toggleAutopilot':
      jarvisMemory.autopilotMode = !jarvisMemory.autopilotMode
      return NextResponse.json({ success: true, autopilot: jarvisMemory.autopilotMode })
    
    case 'runAutopilot':
      jarvisMemory.autopilotMode = true
      const results = []
      
      while (jarvisMemory.tasks.some(t => t.status === 'pending')) {
        const task = jarvisMemory.tasks.find(t => t.status === 'pending')
        if (!task) break
        
        task.status = 'in_progress'
        const ctx = `Goal: ${jarvisMemory.currentGoal}\nAutopilot mode`
        const exec = await execute(task, ctx)
        
        if (exec.escalate) {
          task.status = 'escalated'
          results.push({ task, escalated: true, question: exec.escalate })
          break
        }
        
        task.status = exec.success ? 'completed' : 'failed'
        task.result = exec.result
        task.completedAt = new Date()
        
        const learn = await reflect(task, exec.result, exec.success)
        jarvisMemory.learnings.push(learn)
        
        jarvisMemory.completedTasks.push(task)
        jarvisMemory.tasks = jarvisMemory.tasks.filter(t => t.id !== task.id)
        
        results.push({ task, success: exec.success, result: exec.result })
      }
      
      return NextResponse.json({
        success: true,
        completed: results.length,
        results,
        remaining: jarvisMemory.tasks.length
      })
    
    case 'updatePrompt':
      const { promptKey, newPrompt } = data
      if (jarvisPrompts[promptKey as keyof typeof jarvisPrompts]) {
        (jarvisPrompts as any)[promptKey] = newPrompt
        return NextResponse.json({ success: true, updatedPrompt: promptKey })
      }
      return NextResponse.json({ success: false, error: 'Unknown prompt key' }, { status: 400 })
    
    case 'bizsitepro/findLeads':
      const leadsPrompt = `Generate 5 realistic local businesses that might need websites.
      Include: name, address, phone, category.
      Format as JSON array.`
      
      const leadsResponse = await callOllama(MODELS.fast, [
        { role: 'user', content: leadsPrompt }
      ])
      
      try {
        const leadsMatch = leadsResponse.match(/\[[\s\S]*\]/)
        if (leadsMatch) {
          const leads = JSON.parse(leadsMatch[0])
          
          const res = await fetch('http://localhost:3000/api/bizsitepro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulkSearch', data: { businesses: leads } })
          })
          
          return NextResponse.json({ success: true, leadsAdded: leads.length, leads })
        }
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to parse leads' })
      }
      
      return NextResponse.json({ success: false, raw: leadsResponse })
    
    case 'chat':
      const chatResponse = await callOllama(MODELS.fast, [
        { role: 'system', content: jarvisPrompts.systemBase + `\n\nCurrent goal: ${jarvisMemory.currentGoal || 'None set'}` },
        { role: 'user', content: data.message }
      ])
      
      return NextResponse.json({ response: chatResponse })
    
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
