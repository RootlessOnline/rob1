import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Z's Memory - Persistent storage for conversations and learnings
const DATA_DIR = path.join(process.cwd(), 'data')
const MEMORY_FILE = path.join(DATA_DIR, 'z_memory.json')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')
const THEME_FILE = path.join(DATA_DIR, 'theme.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Default memory structure
const defaultMemory = {
  created: new Date().toISOString(),
  identity: {
    name: 'Z',
    creator: 'Q',
    role: 'AI Assistant'
  },
  conversations: [],
  learned: {},
  preferences: {
    bionicReading: true,
    theme: 'dark'
  }
}

// Default projects structure
const defaultProjects = {
  current: 'qzc-web',
  projects: {
    'qzc-web': {
      name: 'Q-Z-Collab',
      path: '/home/quix/Documents/qzc-web',
      created: new Date().toISOString(),
      notes: []
    }
  }
}

// Default theme
const defaultTheme = {
  primary: '#00d4ff',
  secondary: '#ff00ff', 
  background: '#0a0a0a',
  surface: '#1a1a2e',
  text: '#e0e0e0'
}

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load memory:', e)
  }
  return { ...defaultMemory }
}

function saveMemory(memory: object) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2))
  } catch (e) {
    console.error('Failed to save memory:', e)
  }
}

function loadProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
  return { ...defaultProjects }
}

function saveProjects(projects: object) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2))
  } catch (e) {
    console.error('Failed to save projects:', e)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'memory'

  if (action === 'memory') {
    const memory = loadMemory()
    return NextResponse.json(memory)
  }

  if (action === 'projects') {
    const projects = loadProjects()
    return NextResponse.json(projects)
  }

  if (action === 'theme') {
    try {
      if (fs.existsSync(THEME_FILE)) {
        return NextResponse.json(JSON.parse(fs.readFileSync(THEME_FILE, 'utf-8')))
      }
    } catch (e) {
      console.error('Failed to load theme:', e)
    }
    return NextResponse.json(defaultTheme)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'save-conversation') {
      const memory = loadMemory()
      memory.conversations.push({
        ...data,
        timestamp: new Date().toISOString()
      })
      // Keep last 100 conversations
      if (memory.conversations.length > 100) {
        memory.conversations = memory.conversations.slice(-100)
      }
      saveMemory(memory)
      return NextResponse.json({ success: true })
    }

    if (action === 'learn') {
      const memory = loadMemory()
      memory.learned = { ...memory.learned, ...data }
      saveMemory(memory)
      return NextResponse.json({ success: true, learned: data })
    }

    if (action === 'set-preference') {
      const memory = loadMemory()
      memory.preferences = { ...memory.preferences, ...data }
      saveMemory(memory)
      return NextResponse.json({ success: true, preferences: memory.preferences })
    }

    if (action === 'add-project') {
      const projects = loadProjects()
      const id = data.name.toLowerCase().replace(/\s+/g, '-')
      projects.projects[id] = {
        ...data,
        created: new Date().toISOString(),
        notes: []
      }
      saveProjects(projects)
      return NextResponse.json({ success: true, project: projects.projects[id] })
    }

    if (action === 'add-note') {
      const projects = loadProjects()
      const projectId = data.projectId || projects.current
      if (projects.projects[projectId]) {
        projects.projects[projectId].notes.push({
          ...data.note,
          timestamp: new Date().toISOString()
        })
        saveProjects(projects)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (action === 'switch-project') {
      const projects = loadProjects()
      if (projects.projects[data.projectId]) {
        projects.current = data.projectId
        saveProjects(projects)
        return NextResponse.json({ success: true, current: data.projectId })
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (action === 'set-theme') {
      fs.writeFileSync(THEME_FILE, JSON.stringify(data, null, 2))
      return NextResponse.json({ success: true, theme: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
