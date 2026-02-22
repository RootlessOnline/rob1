'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'escalated'
  priority: string
  result?: string
  createdAt: string
}

interface Learning {
  id: string
  insight: string
  context: string
  timestamp: string
}

interface Thought {
  id: string
  type: 'thinking' | 'reasoning' | 'decision' | 'action' | 'result' | 'error'
  content: string
  model?: string
  timestamp: string
  raw?: string
}

interface JarvisStatus {
  memory: {
    currentGoal: string | null
    autopilotMode: boolean
    tasksPending: number
    tasksCompleted: number
    learningsCount: number
  }
  prompts: {
    systemBase: string
    planningPrompt: string
    executionPrompt: string
    reflectionPrompt: string
  }
  recentTasks: Task[]
  recentLearnings: Learning[]
  thoughts: Thought[]
}

export default function JarvisAutopilot() {
  const [status, setStatus] = useState<JarvisStatus | null>(null)
  const [goal, setGoal] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [showPrompts, setShowPrompts] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string } | null>(null)
  const [showBrain, setShowBrain] = useState(true)
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/jarvis-brain?action=status')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      console.error('Failed to fetch status')
    }
  }

  const setGoalAndPlan = async () => {
    if (!goal.trim()) return
    setLoading(true)
    addLog(`🎯 Setting goal: ${goal}`)
    
    try {
      const res = await fetch('/api/jarvis-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setGoal', data: { goal, context } })
      })
      const data = await res.json()
      
      if (data.success) {
        addLog(`📋 Planned ${data.tasksPlanned} tasks`)
        data.tasks.forEach((t: Task) => addLog(`  → ${t.description}`))
      }
    } catch (e) {
      addLog('❌ Failed to set goal')
    }
    
    setLoading(false)
    fetchStatus()
  }

  const executeNext = async () => {
    setLoading(true)
    addLog('⚡ Executing next task...')
    
    try {
      const res = await fetch('/api/jarvis-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'executeNext', data: {} })
      })
      const data = await res.json()
      
      if (data.escalated) {
        addLog(`🔴 ESCALATED: ${data.question}`)
      } else if (data.success) {
        addLog(`✅ Task completed: ${data.task?.description}`)
        if (data.learning?.insight) {
          addLog(`💡 Learned: ${data.learning.insight.slice(0, 100)}...`)
        }
      } else {
        addLog(`❌ Task failed`)
      }
    } catch (e) {
      addLog('❌ Execution failed')
    }
    
    setLoading(false)
    fetchStatus()
  }

  const runAutopilot = async () => {
    setLoading(true)
    addLog('🤖 AUTOPILOT ENGAGED')
    
    try {
      const res = await fetch('/api/jarvis-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'runAutopilot', data: {} })
      })
      const data = await res.json()
      
      addLog(`🏁 Autopilot completed ${data.completed} tasks`)
      
      if (data.results) {
        data.results.forEach((r: any, i: number) => {
          if (r.escalated) {
            addLog(`🔴 [${i + 1}] ESCALATED: ${r.question}`)
          } else {
            addLog(`${r.success ? '✅' : '❌'} [${i + 1}] ${r.task?.description}`)
          }
        })
      }
    } catch (e) {
      addLog('❌ Autopilot failed')
    }
    
    setLoading(false)
    fetchStatus()
  }

  const provideInput = async (input: string) => {
    await fetch('/api/jarvis-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'provideInput', data: { input } })
    })
    addLog(`👤 Human input: ${input}`)
    fetchStatus()
  }

  const chat = async () => {
    if (!chatMessage.trim()) return
    setLoading(true)
    
    const res = await fetch('/api/jarvis-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', data: { message: chatMessage } })
    })
    const data = await res.json()
    
    setChatResponse(data.response)
    setChatMessage('')
    setLoading(false)
  }

  const updatePrompt = async (key: string, value: string) => {
    await fetch('/api/jarvis-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updatePrompt', data: { promptKey: key, newPrompt: value } })
    })
    setEditingPrompt(null)
    addLog(`📝 Updated prompt: ${key}`)
    fetchStatus()
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-50))
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'pending': return '#4a9eff'
      case 'in_progress': return '#f5a623'
      case 'completed': return '#00ff88'
      case 'failed': return '#e74c3c'
      case 'escalated': return '#ff6b6b'
      default: return '#888'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/jarvis"><button style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← JARVIS</button></Link>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#9b59b6' }}>🧠 JARVIS Autopilot</h1>
            <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>Self-directing AI • Plans, executes, learns, adapts</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {status?.memory.autopilotMode && (
            <div style={{ padding: '8px 16px', background: '#00ff88', borderRadius: '20px', color: '#000', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
              🤖 AUTOPILOT ACTIVE
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88' }}>{status?.memory.tasksCompleted || 0}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a9eff' }}>{status?.memory.tasksPending || 0}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>Pending</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr 350px', gap: '20px', padding: '20px', height: 'calc(100vh - 100px)' }}>
        
        {/* Left Panel - Goal & Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Goal Setting */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#9b59b6' }}>🎯 Set Goal</h3>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What should JARVIS accomplish?"
              style={{ width: '100%', height: '80px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', resize: 'none', marginBottom: '10px' }}
            />
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Additional context (optional)"
              style={{ width: '100%', height: '50px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', resize: 'none', marginBottom: '10px', fontSize: '13px' }}
            />
            <button
              onClick={setGoalAndPlan}
              disabled={loading || !goal.trim()}
              style={{ width: '100%', padding: '12px', background: '#9b59b6', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? '⏳ Planning...' : '🎯 Plan & Execute'}
            </button>
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#4a9eff' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={executeNext} disabled={loading} style={{ padding: '10px', background: '#4a9eff', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer' }}>▶ Execute Next Task</button>
              <button onClick={runAutopilot} disabled={loading} style={{ padding: '10px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>🤖 Run Full Autopilot</button>
              <button onClick={fetchStatus} style={{ padding: '10px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>🔄 Refresh Status</button>
            </div>
          </div>

          {/* Tasks */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px', flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#f5a623' }}>📋 Tasks</h3>
            {status?.recentTasks?.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No tasks yet. Set a goal!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {status?.recentTasks?.map(task => (
                  <div key={task.id} style={{ background: '#0a0a0a', borderRadius: '6px', padding: '12px', borderLeft: `3px solid ${getStatusColor(task.status)}` }}>
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>{task.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: getStatusColor(task.status) }}>{task.status}</span>
                      <span style={{ color: '#888' }}>{task.priority}</span>
                    </div>
                    {task.result && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', maxHeight: '60px', overflow: 'hidden' }}>{task.result.slice(0, 100)}...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Logs & Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Activity Log */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px', flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#00ff88' }}>📊 Activity Log</h3>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.8 }}>
              {logs.length === 0 ? (
                <div style={{ color: '#666' }}>Waiting for activity...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #222' }}>{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Chat */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#4a9eff' }}>💬 Direct Chat</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && chat()}
                placeholder="Talk to JARVIS..."
                style={{ flex: 1, padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
              />
              <button onClick={chat} disabled={loading} style={{ padding: '12px 20px', background: '#4a9eff', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer' }}>Send</button>
            </div>
            {chatResponse && (
              <div style={{ background: '#0a0a0a', borderRadius: '6px', padding: '12px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                <div style={{ color: '#9b59b6', marginBottom: '8px' }}>🤖 JARVIS:</div>
                {chatResponse}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Memory & Prompts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Current Goal */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#9b59b6' }}>🎯 Current Goal</h3>
            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {status?.memory.currentGoal || <span style={{ color: '#666' }}>No goal set</span>}
            </div>
          </div>

          {/* Learnings */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px', flex: 1, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#f5a623' }}>💡 Learnings ({status?.memory.learningsCount || 0})</h3>
            {status?.recentLearnings?.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No learnings yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {status?.recentLearnings?.map(learning => (
                  <div key={learning.id} style={{ background: '#0a0a0a', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                    <div style={{ color: '#888', marginBottom: '4px' }}>{learning.context}</div>
                    <div>{learning.insight.slice(0, 150)}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompts */}
          <div style={{ background: '#12121a', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#e74c3c' }}>📝 Self-Modifying Prompts</h3>
              <button onClick={() => setShowPrompts(!showPrompts)} style={{ padding: '4px 12px', background: '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
                {showPrompts ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPrompts && status?.prompts && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(status.prompts).map(([key, value]) => (
                  <div key={key} style={{ background: '#0a0a0a', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ color: '#4a9eff', fontSize: '12px' }}>{key}</span>
                      <button onClick={() => setEditingPrompt({ key, value: value as string })} style={{ padding: '2px 8px', background: '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '10px' }}>Edit</button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', maxHeight: '40px', overflow: 'hidden' }}>
                      {(value as string).slice(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Editor Modal */}
      {editingPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '25px', width: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#e74c3c' }}>Edit: {editingPrompt.key}</h3>
            <textarea
              value={editingPrompt.value}
              onChange={e => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
              style={{ width: '100%', height: '300px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', resize: 'none', fontFamily: 'monospace', fontSize: '13px' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={() => updatePrompt(editingPrompt.key, editingPrompt.value)} style={{ flex: 1, padding: '12px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
              <button onClick={() => setEditingPrompt(null)} style={{ padding: '12px 20px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
