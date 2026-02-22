import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.LOCAL_MODEL || 'llama3.2'

interface Agent {
  id: string
  name: string
  type: 'business' | 'automation' | 'research' | 'creative'
  status: 'idle' | 'running' | 'paused' | 'completed'
  prompt: string
  createdAt: string
  lastRun?: string
  earnings?: number
  tasks?: number
  logs?: string[]
}

const AGENTS_FILE = path.join(process.cwd(), 'data/agents/agents.json')

function loadAgents(): Agent[] {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'))
    }
  } catch {}
  return []
}

function saveAgents(agents: Agent[]) {
  fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true })
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
}

// GET - List all agents
export async function GET() {
  const agents = loadAgents()
  const totalEarnings = agents.reduce((sum, a) => sum + (a.earnings || 0), 0)
  const activeAgents = agents.filter(a => a.status === 'running').length
  
  return NextResponse.json({
    agents,
    stats: {
      total: agents.length,
      active: activeAgents,
      totalEarnings,
      tasksCompleted: agents.reduce((sum, a) => sum + (a.tasks || 0), 0)
    }
  })
}

// POST - Create or run agent
export async function POST(request: NextRequest) {
  const { action, agentId, prompt, type, name } = await request.json()
  const agents = loadAgents()

  if (action === 'create') {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: name || `Agent-${agents.length + 1}`,
      type: type || 'business',
      status: 'idle',
      prompt: prompt || '',
      createdAt: new Date().toISOString(),
      earnings: 0,
      tasks: 0,
      logs: []
    }
    agents.push(newAgent)
    saveAgents(agents)
    return NextResponse.json({ success: true, agent: newAgent })
  }

  if (action === 'run' && agentId) {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Call Ollama to execute agent task
    const systemPrompt = getAgentSystemPrompt(agent.type)
    
    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: agent.prompt }
          ],
          stream: false
        })
      })

      const data = await response.json()
      const result = data.message?.content || 'No response'

      agent.status = 'completed'
      agent.lastRun = new Date().toISOString()
      agent.tasks = (agent.tasks || 0) + 1
      agent.logs = agent.logs || []
      agent.logs.push(`[${new Date().toISOString()}] ${result.slice(0, 200)}...`)

      saveAgents(agents)
      
      return NextResponse.json({ 
        success: true, 
        result,
        agent 
      })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to run agent' }, { status: 500 })
    }
  }

  if (action === 'delete' && agentId) {
    const filtered = agents.filter(a => a.id !== agentId)
    saveAgents(filtered)
    return NextResponse.json({ success: true })
  }

  if (action === 'update' && agentId) {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    Object.assign(agent, { prompt, type, name, status: type?.status || agent.status })
    saveAgents(agents)
    return NextResponse.json({ success: true, agent })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

function getAgentSystemPrompt(type: string): string {
  const prompts: Record<string, string> = {
    business: `You are a Business Agent AI. Given a prompt, generate:
1. A business name and tagline
2. Target market analysis
3. Revenue model
4. First 3 action steps
5. Estimated startup cost and potential earnings
Be specific and actionable. Think like an entrepreneur.`,
    
    automation: `You are an Automation Agent AI. Given a task:
1. Break it into steps
2. Identify automation opportunities
3. Suggest tools/APIs to use
4. Create a workflow outline
5. Estimate time saved
Be practical and technical.`,
    
    research: `You are a Research Agent AI. Given a topic:
1. Find key information
2. Summarize findings
3. Identify opportunities/gaps
4. Provide actionable insights
Be thorough and analytical.`,
    
    creative: `You are a Creative Agent AI. Given a brief:
1. Generate creative concepts
2. Provide content ideas
3. Suggest formats/platforms
4. Create sample content
Be innovative and engaging.`
  }
  return prompts[type] || prompts.business
}
