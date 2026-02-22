'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  role: string
  name: string
  status: string
  currentTask?: string
  history: Array<{ task: string; result: string; timestamp: string }>
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  agents: string[]
  tasks: Array<{ id: string; description: string; assignedTo: string; status: string }>
  created: string
}

const ROLE_ICONS: Record<string, string> = {
  ceo: '👔',
  cto: '🔧',
  developer: '💻',
  tester: '🧪',
  researcher: '🔍'
}

const ROLE_COLORS: Record<string, string> = {
  ceo: '#ffd700',
  cto: '#4a9eff',
  developer: '#4aff8a',
  tester: '#ff8a4a',
  researcher: '#b84aff'
}

export default function AgentManagerPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [activeTab, setActiveTab] = useState<'projects' | 'agents'>('projects')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/agent-manager')
      const data = await res.json()
      setAgents(data.agents || [])
      setProjects(data.projects || [])
    } catch (e) {
      console.error('Failed to fetch:', e)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim() || !newProjectDesc.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/agent-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_project',
          name: newProjectName,
          description: newProjectDesc
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewProjectName('')
        setNewProjectDesc('')
        fetchData()
      }
    } catch (e) {
      console.error('Failed:', e)
    }
    setLoading(false)
  }

  const runProject = async (projectId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_project',
          projectId
        })
      })
      const data = await res.json()
      if (data.success) {
        fetchData()
        setSelectedProject(data.project)
      }
    } catch (e) {
      console.error('Failed:', e)
    }
    setLoading(false)
  }

  const runAgentTask = async (agentId: string, task: string) => {
    if (!task.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/agent-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_task',
          agentId,
          task
        })
      })
      const data = await res.json()
      if (data.success) {
        fetchData()
      }
    } catch (e) {
      console.error('Failed:', e)
    }
    setLoading(false)
    setTaskInput('')
  }

  const deleteProject = async (projectId: string) => {
    try {
      await fetch('/api/agent-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_project', projectId })
      })
      fetchData()
      setSelectedProject(null)
    } catch (e) {
      console.error('Failed:', e)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#e0e0e0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '20px'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #333',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0, color: '#b84aff' }}>
            🤖 AI Agent Manager
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '14px' }}>
            ChatDev-style multi-agent collaboration
          </p>
        </div>
        
        <nav style={{ display: 'flex', gap: '10px' }}>
          {['projects', 'agents'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t as typeof activeTab)}
              style={{
                padding: '10px 20px',
                background: activeTab === t ? '#b84aff' : 'transparent',
                border: '1px solid #b84aff',
                color: activeTab === t ? '#000' : '#b84aff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>📁</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#b84aff' }}>{projects.length}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Projects</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>🤖</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4aff8a' }}>{agents.length}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Agents</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>⚡</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4a9eff' }}>{agents.filter(a => a.status === 'working').length}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Active</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>✅</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffd700' }}>{agents.filter(a => a.status === 'completed').length}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Tasks Done</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Panel */}
        <div style={{ background: '#12121a', border: '1px solid #333', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#b84aff' }}>
            {activeTab === 'projects' ? '📁 Create New Project' : '🤖 Create Agent'}
          </h2>

          {activeTab === 'projects' ? (
            <>
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  marginBottom: '10px'
                }}
              />
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Describe what you want to build... (e.g., 'Build a todo app with React and SQLite')"
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  resize: 'none'
                }}
              />
              <button
                onClick={createProject}
                disabled={loading || !newProjectName.trim() || !newProjectDesc.trim()}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '12px',
                  background: loading ? '#333' : '#b84aff',
                  border: 'none',
                  borderRadius: '8px',
                  color: loading ? '#666' : '#000',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer'
                }}
              >
                {loading ? '⏳ Creating...' : '🚀 Create Project + Team'}
              </button>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                Creates a team of 5 agents: CEO, CTO, Developer, Tester, Researcher
              </p>
            </>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              Agents are created automatically when you create a project.
            </div>
          )}
        </div>

        {/* Right Panel - List */}
        <div style={{ background: '#12121a', border: '1px solid #333', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#b84aff' }}>
            {activeTab === 'projects' ? `📁 Projects (${projects.length})` : `🤖 Agents (${agents.length})`}
          </h2>

          {activeTab === 'projects' ? (
            projects.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                No projects yet. Create one to get started!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {projects.map(project => (
                  <div key={project.id} style={{
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '15px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#b84aff' }}>{project.name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                          {project.description.slice(0, 80)}...
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                          {project.agents.length} agents • {project.status}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => runProject(project.id)}
                          disabled={loading}
                          style={{
                            padding: '8px 16px',
                            background: '#4aff8a',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#000',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ▶ Run
                        </button>
                        <button
                          onClick={() => setSelectedProject(project)}
                          style={{
                            padding: '8px 12px',
                            background: '#333',
                            border: '1px solid #555',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          👁 View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agents.map(agent => (
                <div key={agent.id} style={{
                  background: '#0a0a0a',
                  border: `1px solid ${ROLE_COLORS[agent.role] || '#333'}`,
                  borderRadius: '8px',
                  padding: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{ROLE_ICONS[agent.role] || '🤖'}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: ROLE_COLORS[agent.role] || '#fff' }}>
                        {agent.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {agent.role.toUpperCase()} • {agent.status}
                      </div>
                    </div>
                  </div>
                  {agent.history.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#888', background: '#111', padding: '8px', borderRadius: '4px' }}>
                      Last: {agent.history[agent.history.length - 1].result.slice(0, 100)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #b84aff',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#b84aff' }}>{selectedProject.name}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <p style={{ color: '#888' }}>{selectedProject.description}</p>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>
              Status: {selectedProject.status} • Agents: {selectedProject.agents.length}
            </div>
            
            <h3 style={{ color: '#b84aff', marginBottom: '10px' }}>Team Output:</h3>
            {agents.filter(a => selectedProject.agents.includes(a.id)).map(agent => (
              <div key={agent.id} style={{
                background: '#0a0a0a',
                border: `1px solid ${ROLE_COLORS[agent.role] || '#333'}`,
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{ROLE_ICONS[agent.role]}</span>
                  <span style={{ color: ROLE_COLORS[agent.role], fontWeight: 'bold' }}>{agent.name}</span>
                </div>
                {agent.history.length > 0 && (
                  <pre style={{
                    fontSize: '12px',
                    color: '#ccc',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                    background: '#111',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {agent.history[agent.history.length - 1].result}
                  </pre>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => runProject(selectedProject.id)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4aff8a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {loading ? '⏳ Running...' : '▶ Run Again'}
              </button>
              <button
                onClick={() => deleteProject(selectedProject.id)}
                style={{
                  padding: '12px 20px',
                  background: '#ff4a4a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
        Agent Manager v1.0 • ChatDev-style • Powered by Ollama
      </footer>
    </div>
  )
}
