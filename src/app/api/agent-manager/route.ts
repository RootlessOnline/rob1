import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.LOCAL_MODEL || 'llama3.2'
const REASONING_MODEL = process.env.REASONING_MODEL || 'deepseek-r1:14b'

// Agent roles (like ChatDev)
const AGENT_ROLES = {
  ceo: {
    name: 'CEO',
    description: 'Coordinates projects, makes decisions, assigns tasks',
    systemPrompt: 'You are the CEO agent. Review project requests, break them into tasks, assign to team members. Be decisive and clear.'
  },
  cto: {
    name: 'CTO',
    description: 'Technical architecture, chooses tech stack, reviews code design',
    systemPrompt: 'You are the CTO agent. Design technical architecture, choose tools, review implementations. Focus on scalability and best practices.'
  },
  developer: {
    name: 'Developer',
    description: 'Writes code, implements features, fixes bugs',
    systemPrompt: 'You are a Developer agent. Write clean, functional code. Implement features as specified. Use free/open-source tools.'
  },
  tester: {
    name: 'Tester',
    description: 'Tests code, finds bugs, validates features',
    systemPrompt: 'You are a Tester agent. Test implementations thoroughly. Report bugs clearly with steps to reproduce.'
  },
  researcher: {
    name: 'Researcher',
    description: 'Researches solutions, finds libraries, provides insights',
    systemPrompt: 'You are a Researcher agent. Find best solutions, free tools, and implementation guides. Provide actionable recommendations.'
  }
}

// Agent interface
interface Agent {
  id: string
  role: string
  name: string
  status: 'idle' | 'working' | 'completed'
  currentTask?: string
  created: string
  history: Array<{ task: string; result: string; timestamp: string }>
}

// Project interface
interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'developing' | 'testing' | 'completed'
  agents: string[]  // Agent IDs
  tasks: Array<{
    id: string
    description: string
    assignedTo: string
    status: 'pending' | 'in_progress' | 'completed'
    result?: string
  }>
  created: string
  updated: string
}

const AGENTS_FILE = path.join(process.cwd(), 'data/agents/registry.json')
const PROJECTS_FILE = path.join(process.cwd(), 'data/agents/projects.json')

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

function loadProjects(): Project[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
    }
  } catch {}
  return []
}

function saveProjects(projects: Project[]) {
  fs.mkdirSync(path.dirname(PROJECTS_FILE), { recursive: true })
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2))
}

async function callAgent(role: string, task: string, context?: string): Promise<string> {
  const agentRole = AGENT_ROLES[role as keyof typeof AGENT_ROLES]
  if (!agentRole) return 'Unknown role'

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: role === 'researcher' ? REASONING_MODEL : OLLAMA_MODEL,
        messages: [
          { role: 'system', content: agentRole.systemPrompt },
          ...(context ? [{ role: 'assistant', content: `Context: ${context}` }] : []),
          { role: 'user', content: task }
        ],
        stream: false
      })
    })

    const data = await response.json()
    return data.message?.content || 'No response'
  } catch (error) {
    return `Error: ${error}`
  }
}

// GET - List agents and projects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'roles') {
    return NextResponse.json({ roles: AGENT_ROLES })
  }

  if (type === 'projects') {
    return NextResponse.json({ projects: loadProjects() })
  }

  return NextResponse.json({
    agents: loadAgents(),
    projects: loadProjects(),
    roles: AGENT_ROLES
  })
}

// POST - Create agent, project, or run task
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, role, name, projectId, task, description } = body

  // Create new agent
  if (action === 'create_agent') {
    const agents = loadAgents()
    const newAgent: Agent = {
      id: Date.now().toString(),
      role: role || 'developer',
      name: name || AGENT_ROLES[role as keyof typeof AGENT_ROLES]?.name || 'Agent',
      status: 'idle',
      created: new Date().toISOString(),
      history: []
    }
    agents.push(newAgent)
    saveAgents(agents)
    return NextResponse.json({ success: true, agent: newAgent })
  }

  // Create new project (like ChatDev)
  if (action === 'create_project') {
    const projects = loadProjects()
    const agents = loadAgents()

    // Create team of agents for this project
    const teamAgentIds: string[] = []
    for (const [roleKey, roleData] of Object.entries(AGENT_ROLES)) {
      const newAgent: Agent = {
        id: `${Date.now()}-${roleKey}`,
        role: roleKey,
        name: roleData.name,
        status: 'idle',
        created: new Date().toISOString(),
        history: []
      }
      agents.push(newAgent)
      teamAgentIds.push(newAgent.id)
    }
    saveAgents(agents)

    const newProject: Project = {
      id: Date.now().toString(),
      name: name || 'New Project',
      description: description || '',
      status: 'planning',
      agents: teamAgentIds,
      tasks: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
    projects.push(newProject)
    saveProjects(projects)

    return NextResponse.json({ success: true, project: newProject, teamSize: teamAgentIds.length })
  }

  // Run a task with an agent
  if (action === 'run_task') {
    const agents = loadAgents()
    const agent = agents.find(a => a.id === body.agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    agent.status = 'working'
    agent.currentTask = task
    saveAgents(agents)

    const result = await callAgent(agent.role, task)

    agent.status = 'completed'
    agent.history.push({
      task,
      result,
      timestamp: new Date().toISOString()
    })
    agent.currentTask = undefined
    saveAgents(agents)

    return NextResponse.json({ success: true, result, agent })
  }

  // Run full project (multi-agent collaboration like ChatDev)
  if (action === 'run_project') {
    const projects = loadProjects()
    const project = projects.find(p => p.id === projectId)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const agents = loadAgents()
    const projectAgents = project.agents.map(id => agents.find(a => a.id === id)).filter(Boolean)

    project.status = 'developing'
    saveProjects(projects)

    // Step 1: CEO analyzes project
    const ceo = projectAgents.find(a => a.role === 'ceo')
    if (ceo) {
      ceo.status = 'working'
      saveAgents(agents)
      const plan = await callAgent('ceo', `Plan this project: "${project.description}". Break into specific tasks.`)
      ceo.history.push({ task: 'Project planning', result: plan, timestamp: new Date().toISOString() })
      ceo.status = 'completed'
      saveAgents(agents)
    }

    // Step 2: CTO designs architecture
    const cto = projectAgents.find(a => a.role === 'cto')
    if (cto) {
      cto.status = 'working'
      saveAgents(agents)
      const arch = await callAgent('cto', `Design architecture for: "${project.description}". Use free tools.`)
      cto.history.push({ task: 'Architecture design', result: arch, timestamp: new Date().toISOString() })
      cto.status = 'completed'
      saveAgents(agents)
    }

    // Step 3: Developer implements
    const dev = projectAgents.find(a => a.role === 'developer')
    if (dev) {
      dev.status = 'working'
      saveAgents(agents)
      const code = await callAgent('developer', `Implement: "${project.description}". Provide code.`)
      dev.history.push({ task: 'Implementation', result: code, timestamp: new Date().toISOString() })
      dev.status = 'completed'
      saveAgents(agents)
    }

    project.status = 'completed'
    project.updated = new Date().toISOString()
    saveProjects(projects)

    return NextResponse.json({
      success: true,
      project,
      results: projectAgents.map(a => ({
        role: a.role,
        name: a.name,
        lastResult: a.history[a.history.length - 1]?.result?.slice(0, 500)
      }))
    })
  }

  // Delete agent
  if (action === 'delete_agent') {
    const agents = loadAgents().filter(a => a.id !== body.agentId)
    saveAgents(agents)
    return NextResponse.json({ success: true })
  }

  // Delete project
  if (action === 'delete_project') {
    const projects = loadProjects().filter(p => p.id !== body.projectId)
    saveProjects(projects)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
